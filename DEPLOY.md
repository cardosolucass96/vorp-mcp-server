# Kommo MCP Server - Deploy Ubuntu

Este guia mostra como fazer deploy do Kommo MCP Server em um servidor Ubuntu.

## 🐳 Opção 1: Deploy com Docker (Recomendado)

### Requisitos

- Ubuntu 20.04+ ou Debian 11+
- Docker instalado
- Docker Compose instalado

### 1. Instalar Docker

```bash
# Atualizar sistema
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Adicionar chave GPG do Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Adicionar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar instalação
docker --version
docker compose version
```

### 2. Configurar usuário (opcional, mas recomendado)

```bash
# Adicionar usuário ao grupo docker (evita usar sudo)
sudo usermod -aG docker $USER

# Reiniciar sessão para aplicar
newgrp docker
```

### 3. Clonar repositório e fazer deploy

```bash
cd /home/seu-usuario
git clone https://github.com/cardosolucass96/kommo-mcp-server.git
cd kommo-mcp-server

# (Opcional) Configurar senha customizada
echo "MCP_PASSWORD=SuaSenhaSecreta123" > .env

# Build e start com docker compose
docker compose up -d

# Ver logs
docker compose logs -f
```

### 4. Comandos úteis Docker

```bash
# Ver status
docker compose ps

# Ver logs
docker compose logs -f

# Parar
docker compose down

# Reiniciar
docker compose restart

# Atualizar (pull + rebuild + restart)
git pull
docker compose up -d --build

# Ver uso de recursos
docker stats kommo-mcp-server
```

### 5. Nginx como Proxy Reverso (Opcional)

```bash
sudo apt install nginx

# Criar configuração
sudo nano /etc/nginx/sites-available/kommo-mcp
```

Configuração nginx:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/kommo-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL com Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

---

## 🔧 Opção 2: Deploy com PM2 (sem Docker)

## Requisitos

- Ubuntu 20.04+ ou Debian 11+
- Node.js 18+ instalado
- PM2 instalado globalmente
- Git instalado

## 1. Instalar Node.js (se não tiver)

```bash
# Usando NodeSource para Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

## 2. Instalar PM2 globalmente

```bash
sudo npm install -g pm2
```

## 3. Clonar o repositório

```bash
cd /home/seu-usuario
git clone https://github.com/cardosolucass96/kommo-mcp-server.git
cd kommo-mcp-server
```

## 4. Instalar dependências

```bash
npm install
```

## 5. Configurar variáveis de ambiente

```bash
# Copiar exemplo
cp .env.example .env

# Editar configurações
nano .env
```

Configure:
```env
PORT=3000
HOST=0.0.0.0
MCP_PASSWORD=SuaSenhaSecreta123
```

## 6. Build do projeto

```bash
npm run build
```

## 7. Iniciar com PM2

```bash
# Modo básico
pm2 start dist/server.js --name kommo-mcp-server

# Ou usar arquivo de configuração ecosystem
pm2 start ecosystem.config.cjs
```

## 8. Configurar PM2 para iniciar no boot

```bash
# Salvar configuração atual
pm2 save

# Gerar script de startup
pm2 startup

# Execute o comando que o PM2 retornar (começa com sudo)
```

## 9. Comandos úteis do PM2

```bash
# Ver logs
pm2 logs kommo-mcp-server

# Ver status
pm2 status

# Reiniciar
pm2 restart kommo-mcp-server

# Parar
pm2 stop kommo-mcp-server

# Remover
pm2 delete kommo-mcp-server

# Monitoramento
pm2 monit
```

## 10. Nginx como Proxy Reverso (Opcional)

Se quiser expor na porta 80/443 com SSL:

```bash
sudo apt install nginx certbot python3-certbot-nginx
```

Configuração nginx (`/etc/nginx/sites-available/kommo-mcp`):

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/kommo-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL com Let's Encrypt
sudo certbot --nginx -d seu-dominio.com
```

## 11. Firewall

```bash
# Permitir porta 3000 (se não usar nginx)
sudo ufw allow 3000/tcp

# Ou permitir apenas nginx (portas 80 e 443)
sudo ufw allow 'Nginx Full'

# Habilitar firewall
sudo ufw enable
```

## 12. Atualizar aplicação

```bash
cd /home/seu-usuario/kommo-mcp-server
git pull
npm install
npm run build
pm2 restart kommo-mcp-server
```

## Troubleshooting

### Ver logs de erro
```bash
pm2 logs kommo-mcp-server --err
```

### Verificar se porta está em uso
```bash
sudo lsof -i :3000
```

### Reiniciar PM2 completamente
```bash
pm2 kill
pm2 resurrect
```

### Testar endpoint localmente
```bash
curl http://localhost:3000/health
```

## Formato do Token de Autenticação

```
Bearer M0ra1s#3013|subdomain|kommoAccessToken
```

Exemplo:
```bash
curl -H "Authorization: Bearer M0ra1s#3013|mpcamotestecom|eyJ0eXAi..." \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
     http://seu-servidor:3000/mcp
```

## Endpoints Disponíveis

- `GET /` - Health check
- `GET /health` - Health check
- `POST /mcp` - MCP Protocol (JSON-RPC 2.0)
- `DELETE /mcp` - Encerrar sessão
- `GET /tools` - Listar ferramentas (legacy)
- `POST /execute` - Executar ferramenta (legacy)
