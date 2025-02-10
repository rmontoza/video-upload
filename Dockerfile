# Dockerfile para Serviço de Processamento com FFmpeg

# Imagem base oficial com Node.js
FROM node:20

# Criar e definir o diretório de trabalho
WORKDIR /usr/src/app

# Copiar os arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o restante do código
COPY . .

# Compile o TypeScript
RUN npm run build

# Expõe a porta usada pela aplicação
EXPOSE 3000

# Configurar comando de inicialização
CMD ["npm", "run", "start"]
