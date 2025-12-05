# Quick Start - Docker

## Test no Ubuntu

```bash
# Clone
git clone https://github.com/cardosolucass96/kommo-mcp-server.git
cd kommo-mcp-server

# Start com docker compose
docker compose up -d

# Ver logs
docker compose logs -f

# Testar health
curl http://localhost:3000/health

# Testar MCP endpoint
TOKEN="M0ra1s#3013|mpcamotestecom|SEU_KOMMO_TOKEN"
curl -X POST http://localhost:3000/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Build manual

```bash
# Build
docker build -t kommo-mcp-server .

# Run
docker run -d \
  --name kommo-mcp-server \
  -p 3000:3000 \
  -e MCP_PASSWORD=M0ra1s#3013 \
  --restart unless-stopped \
  kommo-mcp-server

# Logs
docker logs -f kommo-mcp-server

# Stop
docker stop kommo-mcp-server
docker rm kommo-mcp-server
```

## Configurar senha customizada

```bash
# Criar arquivo .env
echo "MCP_PASSWORD=MinhasenhA@123" > .env

# Start (vai ler do .env automaticamente)
docker compose up -d
```

## Nginx + SSL (Produção)

```bash
# Instalar nginx e certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Criar config nginx
sudo nano /etc/nginx/sites-available/kommo-mcp
```

Adicionar:
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/kommo-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL gratuito
sudo certbot --nginx -d seu-dominio.com
```

## Monitoramento

```bash
# Ver uso de CPU/RAM
docker stats kommo-mcp-server

# Ver processos
docker top kommo-mcp-server

# Inspecionar container
docker inspect kommo-mcp-server
```

## Atualizar versão

```bash
cd kommo-mcp-server
git pull
docker compose down
docker compose up -d --build
```

## Troubleshooting

### Container não inicia
```bash
docker compose logs
```

### Porta já em uso
```bash
# Ver o que está usando porta 3000
sudo lsof -i :3000

# Ou mudar a porta no docker-compose.yml
ports:
  - "8080:3000"  # Acessa em localhost:8080
```

### Health check falhando
```bash
# Testar manualmente dentro do container
docker exec -it kommo-mcp-server sh
wget -O- http://localhost:3000/health
```
