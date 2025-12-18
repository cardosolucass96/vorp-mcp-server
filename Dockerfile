FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências e código fonte
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/

# Instalar dependências, compilar e remover devDependencies
RUN npm ci && \
    npm run build && \
    npm prune --production

# Expor porta
EXPOSE 3000

# Variáveis de ambiente padrão
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Comando de inicialização
CMD ["node", "dist/server.js"]
