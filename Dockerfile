# Dockerfile para Express
FROM node:18
WORKDIR /app

# Configura la zona horaria de Israel/Jerusalén
RUN apt-get update && apt-get install -y tzdata && \
    cp /usr/share/zoneinfo/Asia/Jerusalem /etc/localtime && \
    echo "Asia/Jerusalem" > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata

# Copia el archivo de entorno
COPY .env .env

# Instala dependencias
COPY package*.json ./ 
RUN npm install

# Copia el código fuente
COPY . ./ 

# Exponer el puerto
EXPOSE 8000

# Iniciar el servidor
CMD ["node", "server.js"]
