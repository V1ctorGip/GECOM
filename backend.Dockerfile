# Usa uma imagem base do Node.js
FROM node:18

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos necessários para instalar as dependências
COPY package.json package-lock.json ./
RUN npm install

# Copia o restante dos arquivos
COPY . .

# Expõe a porta do backend
EXPOSE 5000

# Comando correto para rodar o backend com TypeScript
CMD ["node", "--loader", "ts-node/esm", "src/server.ts"]
