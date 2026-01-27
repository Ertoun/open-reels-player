# Utilise une image Node.js stable
FROM node:18

# Installe Python et les dépendances pour yt-dlp
RUN apt-get update && apt-get install -y python3 python3-pip curl
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

# Crée le dossier de l'app
WORKDIR /usr/src/app

# Copie les fichiers package.json et installe les libs Node
COPY package*.json ./
RUN npm install

# Copie le reste du code
COPY . .

# Expose le port (Render utilise souvent le port 10000 par défaut)
EXPOSE 10000

# Lance l'application
CMD [ "node", "server.js" ]