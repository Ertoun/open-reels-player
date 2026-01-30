# Utilise une image Node.js stable
FROM node:18

# Installe Python et yt-dlp (dépendances système)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Installe yt-dlp via pip en ignorant la restriction système
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

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