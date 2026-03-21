# Imagen base ligera
FROM node:18-alpine

# Instalar PM2 globalmente
RUN npm install pm2 -g

# Carpeta de trabajo
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción para ahorrar espacio
RUN npm install --only=production

# Copiar el código fuente
COPY . .

# Exponer el puerto definido en tu código (3001)
EXPOSE 3001

# Ejecutar la aplicación con PM2 en modo runtime
CMD ["pm2-runtime", "index.js"]