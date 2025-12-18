FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código compilado
COPY dist/ ./dist/

# Expor porta
EXPOSE 3000

# Variáveis de ambiente padrão
ENV PORT=3000
ENV HOST=0.0.0.0

# Comando de inicialização
CMD ["node", "dist/server.js"]
