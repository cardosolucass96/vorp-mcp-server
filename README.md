# Kommo MCP Server

Servidor MCP (Model Context Protocol) para integração com o CRM Kommo via Fastify + Node.js.

## 🎯 Características

- **Multi-tenant**: Suporta múltiplas contas Kommo via token Bearer
- **MCP over HTTP**: Protocolo JSON-RPC 2.0 (Streamable)
- **Cache**: Pipelines cacheados por 10 minutos
- **Logging**: Sistema de logs com Fastify
- **REST API Legacy**: Endpoints compatíveis com versão anterior

## 📦 Instalação

```bash
npm install
npm run build
```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz (copie de `.env.example`):

```env
PORT=3000
HOST=0.0.0.0
MCP_PASSWORD=M0ra1s#3013
```

## 🚀 Executar localmente

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🐳 Deploy com Docker

### Opção 1: Docker Compose (Recomendado)

```bash
# Build e start
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

### Opção 2: Docker direto

```bash
# Build da imagem
docker build -t kommo-mcp-server .

# Executar container
docker run -d \
  --name kommo-mcp-server \
  -p 3000:3000 \
  -e MCP_PASSWORD=M0ra1s#3013 \
  --restart unless-stopped \
  kommo-mcp-server

# Ver logs
docker logs -f kommo-mcp-server
```

## ☁️ Deploy no Coolify

Coolify é uma plataforma self-hosted (alternativa ao Heroku/Vercel).

**Quick start:**

1. No Coolify: **+ New Resource** → **Public Repository**
2. Repository: `https://github.com/cardosolucass96/kommo-mcp-server`
3. Build Pack: **Dockerfile**
4. Environment Variables:
   ```
   PORT=3000
   MCP_PASSWORD=M0ra1s#3013
   ```
5. **Deploy**

📖 Veja guia completo em [COOLIFY.md](./COOLIFY.md)

## 🐧 Deploy no Ubuntu

Veja documentação completa em [DEPLOY.md](./DEPLOY.md)

Quick start:

```bash
# Instalar dependências
npm install
npm run build

## 🔐 Autenticação

Formato do token Bearer:
```
MCP_PASSWORD|subdomain|kommoAccessToken
```

Exemplo:
```bash
curl -H "Authorization: Bearer M0ra1s#3013|mpcamotestecom|eyJ0eXAi..." \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
     http://localhost:3000/mcp
```

## 📡 Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Health check |
| GET | `/health` | Health check |
| POST | `/mcp` | MCP Protocol (JSON-RPC 2.0) |
| DELETE | `/mcp` | Encerrar sessão |
| GET | `/tools` | Listar ferramentas (legacy) |
| POST | `/execute` | Executar ferramenta (legacy) |

## 🔧 Ferramentas Disponíveis

| Ferramenta | Descrição |
|------------|-----------|
| `kommo_list_leads` | Lista/busca leads |
| `kommo_update_lead` | Atualiza lead (nome, preço, status) |
| `kommo_add_notes` | Adiciona notas ao lead |
| `kommo_add_tasks` | Cria tarefas/lembretes |
| `kommo_list_pipelines` | Lista pipelines e estágios |
| `kommo_list_pipeline_stages` | Lista estágios de um pipeline |

## 🔄 Uso com n8n

```
1. kommo_start_session  → Inicia atendimento com lead
2. kommo_update_lead    → Modifica dados
3. kommo_add_notes      → Registra observações
4. kommo_add_tasks      → Cria follow-ups
5. kommo_end_session    → Encerra atendimento
```

## ⚠️ Filosofia de Prudência


Configure no n8n MCP Agent:
```
URL: http://seu-servidor:3000/mcp
Bearer Token: M0ra1s#3013|subdomain|kommoToken
```

## 📁 Estrutura

```
src/
├── server.ts             # Servidor Fastify
├── kommo/
│   ├── clientCF.ts       # HTTP client com fetch nativo
│   └── types.ts          # TypeScript interfaces
└── (worker.ts)           # Versão Cloudflare Workers (deprecada)
```

## 🛠️ Desenvolvimento

```bash
# Build
npm run build

# Dev mode
npm run dev

# Watch mode
npm run dev:watch
```

## 📄 Licença

MIT
