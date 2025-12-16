# Kommo MCP Server - Guia de Uso

## Exemplos de uso da API

### 1. Inicializar conexão MCP

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SuaSenha|seusubdominio|seuKommoToken" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

### 2. Listar ferramentas disponíveis

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SuaSenha|seusubdominio|seuKommoToken" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

### 3. Buscar leads

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SuaSenha|seusubdominio|seuKommoToken" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "kommo_list_leads",
      "arguments": {
        "query": "João",
        "limit": 10
      }
    }
  }'
```

### 4. Atualizar lead

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SuaSenha|seusubdominio|seuKommoToken" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "kommo_update_lead",
      "arguments": {
        "lead_id": 12345,
        "name": "João Silva",
        "price": 5000
      }
    }
  }'
```

### 5. Adicionar nota a um lead

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SuaSenha|seusubdominio|seuKommoToken" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "kommo_add_notes",
      "arguments": {
        "lead_id": 12345,
        "text": "Cliente demonstrou interesse em nosso produto premium"
      }
    }
  }'
```

### 6. Criar tarefa para um lead

```bash
# Timestamp para amanhã: date +%s (em bash) + 86400
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SuaSenha|seusubdominio|seuKommoToken" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "kommo_add_tasks",
      "arguments": {
        "lead_id": 12345,
        "text": "Ligar para cliente sobre proposta",
        "complete_till": 1734307200,
        "task_type_id": 1
      }
    }
  }'
```

### 7. Listar pipelines e estágios

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SuaSenha|seusubdominio|seuKommoToken" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "kommo_list_pipelines"
    }
  }'
```

### 8. Listar campos customizados

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SuaSenha|seusubdominio|seuKommoToken" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "kommo_list_lead_custom_fields"
    }
  }'
```

## API Legacy (REST)

### Listar ferramentas (REST)

```bash
curl -X GET http://localhost:3000/tools \
  -H "Authorization: Bearer SuaSenha|seusubdominio|seuKommoToken"
```

### Executar ferramenta (REST)

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SuaSenha|seusubdominio|seuKommoToken" \
  -d '{
    "tool": "kommo_list_leads",
    "params": {
      "query": "João",
      "limit": 5
    }
  }'
```

## Formato do Token de Autenticação

O token Bearer deve seguir o formato:
```
MCP_PASSWORD|subdomain|kommoAccessToken
```

Onde:
- `MCP_PASSWORD`: Senha configurada no arquivo .env
- `subdomain`: Subdomínio da sua conta Kommo (ex: "minhaempresa" de minhaempresa.kommo.com)
- `kommoAccessToken`: Token de acesso da API do Kommo

Exemplo:
```
Admin123|minhaempresa|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6...
```

## Códigos de Erro

### HTTP Status Codes
- `200`: Sucesso
- `204`: Sucesso sem conteúdo (DELETE)
- `400`: Requisição inválida
- `401`: Não autorizado
- `404`: Ferramenta não encontrada
- `500`: Erro interno do servidor

### JSON-RPC Error Codes
- `-32700`: Erro de parse
- `-32600`: Requisição inválida
- `-32601`: Método não encontrado
- `-32602`: Parâmetros inválidos
- `-32603`: Erro interno
- `-32000`: Erro do servidor

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Porta do servidor
PORT=3000

# Host para bind
HOST=0.0.0.0

# Senha para autenticação (OBRIGATÓRIO)
MCP_PASSWORD=SuaSenhaSegura123
```

⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env` com credenciais reais!
