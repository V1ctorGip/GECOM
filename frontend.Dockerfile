# Usa uma imagem base do Node.js
FROM node:18

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos necessários e instala as dependências
COPY package.json package-lock.json ./
RUN npm install

# Copia o restante dos arquivos
COPY . .

# Expõe a porta do frontend
EXPOSE 5173

# Comando para rodar o frontend corretamente
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
