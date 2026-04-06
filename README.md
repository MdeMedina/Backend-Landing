# AI Agent Chat Microservice (WebSocket to n8n Bridge)

### **Gateway de Comunicación en Tiempo Real para Orquestación de IA**

Este repositorio contiene el microservicio backend desarrollado en **Node.js** que actúa como puente de comunicación bidireccional entre la Landing Page corporativa de Deviaty (cliente) y los flujos de trabajo de Inteligencia Artificial orquestados en **n8n**. Desplegado mediante contenedores en un **VPS de OVH**, garantiza una comunicación persistente y asíncrona mediante WebSockets.

---

## 🚀 Retos de Ingeniería y Soluciones Aplicadas

La integración de asistentes de IA en interfaces web presenta el desafío de manejar tiempos de respuesta variables sin bloquear al cliente HTTP. Se aplicaron conceptos de **Arquitectura de Software** y **Bases de Innovación** para construir esta capa intermedia:

* **Desacoplamiento de Servicios:** En lugar de exponer la URL de n8n directamente al frontend, este microservicio actúa como un *API Gateway*, recibiendo eventos por **Socket.io** y retransmitiéndolos mediante HTTP POST hacia el webhook de n8n.
* **Gestión de Estados y Sesiones Asíncronas:** Dado que las respuestas de n8n pueden ser demoradas, se implementó un sistema de mapeo en memoria (`Map`) que asocia identificadores únicos de sesión (`uuidv4`) con el ID del socket del cliente activo.
* **Webhook de Retorno (Callback):** El sistema expone un endpoint REST (`/api/webhook/n8n-reply`) que permite a n8n enviar la respuesta procesada por la IA de vuelta al microservicio, el cual localiza la sesión y emite la respuesta al cliente correcto.
* **Alta Disponibilidad en VPS:** Contenerización del servicio utilizando `node:18-alpine` para minimizar la huella de recursos. Se integró **PM2** en modo *runtime* dentro del contenedor de Docker para asegurar el reinicio automático y la gestión de procesos ante fallos.

---

## 🛠️ Stack Tecnológico e Infraestructura

* **Core:** Node.js, Express.js.
* **Comunicación en Tiempo Real:** Socket.io para conexiones TCP bidireccionales de baja latencia.
* **Integraciones:** Axios para peticiones HTTP salientes hacia flujos de n8n.
* **Contenerización y Orquestación:** Docker y Docker Compose.
* **Infraestructura:** Despliegue independiente en un servidor **VPS de OVHcloud** sobre entorno Linux.

---

## ⚙️ Configuración y Despliegue en OVH (VPS)

### Requisitos Previos
* Servidor VPS con Linux (Ubuntu/Debian recomendado)
* Docker y Docker Compose instalados
* Instancia de n8n operativa

### Despliegue con Docker Compose

1. Clonar el repositorio en el servidor VPS:
```bash
git clone [https://github.com/mdemedina/backend-landing.git](https://github.com/mdemedina/backend-landing.git)
cd backend-landing
```

2. Configurar variables de entorno:
Crear un archivo `.env` en la raíz del proyecto basado en la configuración necesaria:
```env
PORT=3001
N8N_WEBHOOK_URL=[https://tu-instancia-n8n.com/webhook/chat-entrada](https://tu-instancia-n8n.com/webhook/chat-entrada)
```

3. Construir y levantar el contenedor:
El proyecto utiliza Docker Compose para mapear el puerto interno 3001 del contenedor al exterior.
```bash
docker-compose up -d --build
```

4. Monitoreo de Logs:
```bash
docker logs -f chat-backend
```

---

## 🏗️ Flujo de Arquitectura (Secuencia)

1. Cliente web establece conexión vía **Socket.io**.
2. Cliente emite evento `sendMessage` con su consulta.
3. El microservicio registra el `socket.id` con un `sessionId` generado y reenvía el texto a **n8n** vía HTTP POST.
4. **n8n** procesa la lógica de Inteligencia Artificial (LLMs, RAG, herramientas).
5. **n8n** hace un HTTP POST de vuelta al endpoint `/api/webhook/n8n-reply` del microservicio con la respuesta.
6. El microservicio busca el `socket.id` correspondiente a la sesión y emite el evento `receiveMessage` al cliente web.
