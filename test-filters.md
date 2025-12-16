# Testes dos Filtros Avançados - Kommo MCP Server

## 🎯 Filtros Implementados

### 1. **Filtro por Data de Criação**

**Buscar leads criados nos últimos 7 dias:**
```bash
# Calcular timestamps (em segundos, não milissegundos!)
# Data atual: 15/12/2024
# 7 dias atrás: 08/12/2024

# 08/12/2024 00:00:00 = 1733616000
# 15/12/2024 23:59:59 = 1734307199

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"kommo_list_leads",
      "arguments":{
        "created_at_from": 1733616000,
        "created_at_to": 1734307199,
        "limit": 50
      }
    }
  }'
```

**Buscar leads criados em Dezembro/2024:**
```bash
# 01/12/2024 00:00:00 = 1733011200
# 31/12/2024 23:59:59 = 1735689599

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"kommo_list_leads",
      "arguments":{
        "created_at_from": 1733011200,
        "created_at_to": 1735689599
      }
    }
  }'
```

### 2. **Filtro por Status (Etapa do Funil)**

Primeiro, busque os status_id disponíveis:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{"name":"kommo_list_pipelines"}
  }'
```

Depois filtre por status específico:
```bash
# Exemplo: status_id = 89336672 (Primeiro contato)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"kommo_list_leads",
      "arguments":{
        "status_id": 89336672,
        "limit": 100
      }
    }
  }'
```

### 3. **Filtro por Pipeline (Funil)**

```bash
# Exemplo: pipeline_id = 11631972
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"kommo_list_leads",
      "arguments":{
        "pipeline_id": 11631972,
        "limit": 100
      }
    }
  }'
```

### 4. **Combinando Múltiplos Filtros**

**Leads criados na última semana em um status específico:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"kommo_list_leads",
      "arguments":{
        "created_at_from": 1733616000,
        "created_at_to": 1734307199,
        "status_id": 89336672,
        "limit": 100
      }
    }
  }'
```

## 🤖 Exemplos para o Agente Grupo Vorp

### Pergunta: "Quantos leads foram gerados na semana passada?"

O agente deve:
1. Calcular os timestamps da semana passada
2. Chamar `kommo_list_leads` com `created_at_from` e `created_at_to`
3. Contar o `total` retornado

### Pergunta: "Quantos leads estão na etapa 'Primeiro contato'?"

O agente deve:
1. Chamar `kommo_list_pipelines` para encontrar o status_id da etapa
2. Chamar `kommo_list_leads` com o `status_id` encontrado
3. Retornar o `total`

### Pergunta: "Quantos leads foram criados entre 01/12 e 15/12?"

O agente deve:
1. Converter as datas para Unix timestamp
2. Chamar `kommo_list_leads` com os timestamps
3. Retornar o `total`

## 📊 Conversão de Datas para Unix Timestamp

**JavaScript/Node.js:**
```javascript
// Data para timestamp (em segundos)
const timestamp = Math.floor(new Date('2024-12-15').getTime() / 1000);

// Timestamp para data
const date = new Date(1734307199 * 1000);
```

**Python:**
```python
import datetime

# Data para timestamp
timestamp = int(datetime.datetime(2024, 12, 15).timestamp())

# Timestamp para data
date = datetime.datetime.fromtimestamp(1734307199)
```

**Bash (date command):**
```bash
# Data para timestamp
date -d "2024-12-15" +%s

# Timestamp para data
date -d @1734307199
```

## ✅ Resposta Esperada

Todos os leads retornados agora incluem:
- `id`, `name`, `price`
- `status_id`, `pipeline_id`
- `created_at`, `updated_at` (Unix timestamps)
- `contact_info`: { id, name, first_name, last_name, phone }
- `total`: número total de leads encontrados

## 🔥 Otimização

- Detalhes completos: primeiros 10 leads
- Resumo: demais leads (id, name, price, status_id, contact_info)
- Cache de pipelines: 10 minutos
- Limite máximo: 250 leads por requisição
