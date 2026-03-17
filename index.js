require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3001;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// Middleware
app.use(cors()); // Open CORS for local development
app.use(express.json());

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust this in production
        methods: ["GET", "POST"]
    }
});

// Store session to socket mapping
const sessions = new Map();

// WebSocket Logic
io.on('connection', (socket) => {
    console.log(`[Socket] New client connected: ${socket.id}`);

    socket.on('sendMessage', async (data) => {
        try {
            const { message, userId } = data;
            let { sessionId } = data;

            // Generate sessionId if not provided
            if (!sessionId) {
                sessionId = uuidv4();
            }

            // Map sessionId to current socket for return messages
            sessions.set(sessionId, socket.id);
            console.log(`[Socket] Message received from ${socket.id} (Session: ${sessionId}): ${message}`);

            // Forward to n8n
            if (N8N_WEBHOOK_URL) {
                await axios.post(N8N_WEBHOOK_URL, {
                    sessionId,
                    message,
                    userId
                });
                console.log(`[n8n] Forwarded message to n8n for session: ${sessionId}`);
            } else {
                console.warn('[n8n] N8N_WEBHOOK_URL is not defined. Message not forwarded.');
                socket.emit('error', { message: 'Backend configuration error: n8n webhook missing.' });
            }

        } catch (error) {
            console.error(`[Error] Failed to process sendMessage:`, error.message);
            socket.emit('error', { message: 'Failed to process message.' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
        // Cleanup sessions mapping if necessary
        for (const [sessionId, socketId] of sessions.entries()) {
            if (socketId === socket.id) {
                sessions.delete(sessionId);
                break;
            }
        }
    });
});

// Webhook Endpoint for n8n-reply
app.post('/api/webhook/n8n-reply', (req, res) => {
    try {
        const { sessionId, replyText, intent } = req.body;

        if (!sessionId || !replyText) {
            return res.status(400).json({ error: 'sessionId and replyText are required' });
        }

        console.log(`[Webhook] Reply received from n8n for session ${sessionId}: ${replyText}`);

        const socketId = sessions.get(sessionId);

        if (socketId) {
            io.to(socketId).emit('receiveMessage', {
                sessionId,
                replyText,
                intent
            });
            console.log(`[Socket] Emitted receiveMessage to socket: ${socketId}`);
            return res.status(200).json({ status: 'sent' });
        } else {
            console.warn(`[Webhook] No active socket found for sessionId: ${sessionId}`);
            return res.status(404).json({ error: 'Session not found or inactive' });
        }

    } catch (error) {
        console.error(`[Error] Webhook processing failed:`, error.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

server.listen(PORT, () => {
    console.log(`[Server] Chat Microservice running on port ${PORT}`);
    console.log(`[Server] Webhook URL: http://localhost:${PORT}/api/webhook/n8n-reply`);
});
