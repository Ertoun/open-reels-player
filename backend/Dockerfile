# Utilise une image Node.js stable
FROM node:18

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