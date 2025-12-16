# Guia de Debug - MCP Inspector

## 🚀 Setup Rápido

### Comando único (recomendado)
```bash
npm run dev
```

Isso irá:
- ✅ Compilar o TypeScript
- ✅ Iniciar o servidor MCP na porta 3000
- ✅ Aguardar 2 segundos
- ✅ Abrir o MCP Inspector na porta 6274
- ✅ Abrir o navegador automaticamente

**⚠️ IMPORTANTE**: O MCP Inspector abre uma interface web para você CONFIGURAR a conexão manualmente. Ele NÃO conecta automaticamente ao seu servidor.

### 3. Configurar no MCP Inspector

Na interface do Inspector, configure:

**Connection Type:** HTTP (SSE)
**URL:** `http://localhost:3000/mcp`

**Headers:**
```
Authorization: Bearer M0ra1s#3013|grupogx|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImQ4M2JkNjQ2ZDdlYmFhNTk5NTAxNzZmNjc1OGU0OTliNDkwMDdiNTNmODI2M2E0MTQ2ODc2MTUwZjcwNTFiMmMxM2FmZGU4ZTFlNjViMjNmIn0.eyJhdWQiOiIzODQ4ZTJkYS0xMjY2LTQ1YjEtODk3ZS00NGMyZGQ0ZDU5YzUiLCJqdGkiOiJkODNiZDY0NmQ3ZWJhYTU5OTUwMTc2ZjY3NThlNDk5YjQ5MDA3YjUzZjgyNjNhNDE0Njg3NjE1MGY3MDUxYjJjMTNhZmRlOGUxZTY1YjIzZiIsImlhdCI6MTc2NTgyNjQyMCwibmJmIjoxNzY1ODI2NDIwLCJleHAiOjE3ODU0NTYwMDAsInN1YiI6Ijk2ODk3NDciLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MzEzNDcxMTksImJhc2VfZG9tYWluIjoia29tbW8uY29tIiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibm90aWZpY2F0aW9ucyIsInB1c2hfbm90aWZpY2F0aW9ucyJdLCJoYXNoX3V1aWQiOiIzMGUyYzY5NS1kZmFmLTRmNDMtODk5Yi03YTcxNzEzMDZhODQiLCJ1c2VyX2ZsYWdzIjoxLCJhcGlfZG9tYWluIjoiYXBpLWcua29tbW8uY29tIn0.ZNUiC3zHnfX8IWFpt3Op8q1PPQVzreDeFbWJK2dYN65rIAm62zqE71nBgjMNnVgrM0keKRTx82LAYSe-psUMb_uwmkrVuS-m6op6T33ZyQvZdZIsPRUZID0z6Keq2qSe1kiCZqUVwV7hFbUh435akperHkn1PaXaltlTPlhLeZaWMAT93XsNJwwbhivaARMnkJTV8bOvU_ictXXIMoqTHrYRAdBivXiLka6pfsld_u6EO-vSvmErmPpk03dPEFsS6r8Is_WoPlRb1qmhdmHAPD9_4VbHOY9WLNC8sKvtJE7CcjJD4Ub_8rsSo2hKqI-sctfcHCOZOl7Zahn0yMaDUw
Content-Type: application/json
```

> ⚠️ **Credenciais de DEV**: Use apenas em ambiente de desenvolvimento!

## 🔍 Como Usar o Inspector

### Passo a Passo Completo:

1. **Execute `npm run dev`** - Isso abre o navegador automaticamente

2. **Na interface do Inspector**, você verá um formulário. **IGNORE** a URL que aparecer pré-preenchida!

3. **Configure MANUALMENTE**:
   
   **Transport Options:**
   - Selecione: `HTTP (StreamableHttp)`
   
   **Server Configuration:**
   - **URL**: `http://localhost:3000/mcp`
   
   **Headers** (clique em "Add header"):
   - **Name**: `Authorization`
   - **Value**: `Bearer M0ra1s#3013|grupogx|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImQ4M2JkNjQ2ZDdlYmFhNTk5NTAxNzZmNjc1OGU0OTliNDkwMDdiNTNmODI2M2E0MTQ2ODc2MTUwZjcwNTFiMmMxM2FmZGU4ZTFlNjViMjNmIn0.eyJhdWQiOiIzODQ4ZTJkYS0xMjY2LTQ1YjEtODk3ZS00NGMyZGQ0ZDU5YzUiLCJqdGkiOiJkODNiZDY0NmQ3ZWJhYTU5OTUwMTc2ZjY3NThlNDk5YjQ5MDA3YjUzZjgyNjNhNDE0Njg3NjE1MGY3MDUxYjJjMTNhZmRlOGUxZTY1YjIzZiIsImlhdCI6MTc2NTgyNjQyMCwibmJmIjoxNzY1ODI2NDIwLCJleHAiOjE3ODU0NTYwMDAsInN1YiI6Ijk2ODk3NDciLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MzEzNDcxMTksImJhc2VfZG9tYWluIjoia29tbW8uY29tIiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibm90aWZpY2F0aW9ucyIsInB1c2hfbm90aWZpY2F0aW9ucyJdLCJoYXNoX3V1aWQiOiIzMGUyYzY5NS1kZmFmLTRmNDMtODk5Yi03YTcxNzEzMDZhODQiLCJ1c2VyX2ZsYWdzIjoxLCJhcGlfZG9tYWluIjoiYXBpLWcua29tbW8uY29tIn0.ZNUiC3zHnfX8IWFpt3Op8q1PPQVzreDeFbWJK2dYN65rIAm62zqE71nBgjMNnVgrM0keKRTx82LAYSe-psUMb_uwmkrVuS-m6op6T33ZyQvZdZIsPRUZID0z6Keq2qSe1kiCZqUVwV7hFbUh435akperHkn1PaXaltlTPlhLeZaWMAT93XsNJwwbhivaARMnkJTV8bOvU_ictXXIMoqTHrYRAdBivXiLka6pfsld_u6EO-vSvmErmPpk03dPEFsS6r8Is_WoPlRb1qmhdmHAPD9_4VbHOY9WLNC8sKvtJE7CcjJD4Ub_8rsSo2hKqI-sctfcHCOZOl7Zahn0yMaDUw`
   
   **Headers** (adicione outro):
   - **Name**: `Content-Type`
   - **Value**: `application/json`

4. **Clique em "Connect"**

⚠️ **IMPORTANTE**: 
- NÃO use `SSE` - está deprecated
- USE `HTTP (StreamableHttp)` ou `Stdio`
- Seu servidor já está configurado para HTTP

### Se aparecer "Connection Error":

✅ **Isso é NORMAL** se você ainda não configurou a conexão!

O erro significa que o Inspector está rodando, mas você precisa:
1. Preencher a URL do servidor: `http://localhost:3000/mcp`
2. Adicionar o header Authorization
3. Clicar em Connect

### 1. Initialize Connection
Após configurar corretamente, clique em "Connect" - isso enviará a requisição `initialize`

### 2. Listar Tools
Após conectar, você verá as 7 ferramentas disponíveis:
- `kommo_list_leads`
- `kommo_update_lead`
- `kommo_add_notes`
- `kommo_add_tasks`
- `kommo_list_pipelines`
- `kommo_list_pipeline_stages`
- `kommo_list_lead_custom_fields`

### 3. Testar Tools
Selecione uma tool e preencha os parâmetros. Exemplo:

**kommo_list_leads**
```json
{
  "query": "João",
  "limit": 10
}
```

**kommo_update_lead**
```json
{
  "lead_id": 12345,
  "name": "João Silva",
  "price": 5000
}
```

## 🔧 Troubleshooting

### ❌ "Connection Error - Check if your MCP server is running"

**Causa**: Você ainda não configurou a conexão no Inspector.

**Solução**:
1. Verifique se o servidor está rodando (deve aparecer no terminal: `🚀 Kommo MCP Server running`)
2. No Inspector, configure:
   - **URL**: `http://localhost:3000/mcp`
   - **Transport**: SSE (HTTP)
   - **Header Authorization**: `Bearer M0ra1s#3013|grupogx|eyJ0eXAi...`
3. Clique em "Connect"

### ❌ Erro 401 Unauthorized
- Verifique o formato do token: `MCP_PASSWORD|subdomain|kommoToken`
- Confirme que `MCP_PASSWORD` no `.env` está correto
- Verifique se o `kommoToken` está válido

### Erro de Conexão
- Confirme que o servidor está rodando na porta 3000
- Verifique se não há firewall bloqueando

### Token do Kommo
Para obter um token válido:
1. Acesse https://subdomain.kommo.com/settings/dev
2. Crie uma integração privada
3. Copie o Access Token

## 📊 Logs do Servidor

O servidor mostra logs estruturados com Fastify:
```json
{"level":30,"time":...,"msg":"Server listening at http://127.0.0.1:3000"}
```

Níveis de log:
- `30`: Info
- `40`: Warning
- `50`: Error

## 🧪 Testar sem Kommo Real

Se não tiver um token Kommo válido, você pode:

1. Testar apenas a conexão MCP:
   - `initialize`
   - `tools/list`

2. Testar ferramentas com IDs fictícios (receberá erro 401 do Kommo, mas valida o MCP)

## 📡 Endpoints Alternativos

### Health Check
```bash
curl http://localhost:3000/health
```

### Listar Tools (REST Legacy)
```bash
curl -H "Authorization: Bearer M0ra1s#3013|grupogx|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImQ4M2JkNjQ2ZDdlYmFhNTk5NTAxNzZmNjc1OGU0OTliNDkwMDdiNTNmODI2M2E0MTQ2ODc2MTUwZjcwNTFiMmMxM2FmZGU4ZTFlNjViMjNmIn0..." \
     http://localhost:3000/tools
```

### Executar Tool (REST Legacy)
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer M0ra1s#3013|grupogx|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImQ4M2JkNjQ2ZDdlYmFhNTk5NTAxNzZmNjc1OGU0OTliNDkwMDdiNTNmODI2M2E0MTQ2ODc2MTUwZjcwNTFiMmMxM2FmZGU4ZTFlNjViMjNmIn0..." \
  -d '{
    "tool": "kommo_list_leads",
    "params": {"limit": 5}
  }'
```

## 🎯 Dicas de Debug

1. **Use o Console do Browser**: F12 no Inspector para ver requisições
2. **Verifique Network Tab**: Veja as requisições JSON-RPC
3. **Logs do Terminal**: Acompanhe os logs do servidor
4. **Teste Incremental**: Comece com `initialize`, depois `tools/list`, depois `tools/call`

## 🔄 Reiniciar Tudo

```bash
# Parar servidor (Ctrl+C no terminal do npm run dev)

# Reiniciar
npm run dev
```

**Alternativa (se quiser parar tudo):**
```bash
pkill -f "inspector"
pkill -f "node dist/server.js"

# Depois reiniciar
npm run dev
```

## 📝 Formato do Token Bearer Completo

```
MCP_PASSWORD | subdomain | kommoAccessToken
     ↓             ↓              ↓
M0ra1s#3013|grupogx|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImQ4M2JkNjQ2ZDdlYmFhNTk5NTAxNzZmNjc1OGU0OTliNDkwMDdiNTNmODI2M2E0MTQ2ODc2MTUwZjcwNTFiMmMxM2FmZGU4ZTFlNjViMjNmIn0...
```

Componentes:
- **MCP_PASSWORD**: Definido no arquivo `.env` (dev: `M0ra1s#3013`)
- **subdomain**: Parte antes de `.kommo.com` na URL (dev: `grupogx`)
- **kommoAccessToken**: JWT token da API Kommo

### Credenciais de DEV (grupogx):
```
Senha: M0ra1s#3013
Subdomain: grupogx
URL Kommo: https://grupogx.kommo.com
Token: eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImQ4M2JkNjQ2ZDdlYmFhNTk5NTAxNzZmNjc1OGU0OTliNDkwMDdiNTNmODI2M2E0MTQ2ODc2MTUwZjcwNTFiMmMxM2FmZGU4ZTFlNjViMjNmIn0.eyJhdWQiOiIzODQ4ZTJkYS0xMjY2LTQ1YjEtODk3ZS00NGMyZGQ0ZDU5YzUiLCJqdGkiOiJkODNiZDY0NmQ3ZWJhYTU5OTUwMTc2ZjY3NThlNDk5YjQ5MDA3YjUzZjgyNjNhNDE0Njg3NjE1MGY3MDUxYjJjMTNhZmRlOGUxZTY1YjIzZiIsImlhdCI6MTc2NTgyNjQyMCwibmJmIjoxNzY1ODI2NDIwLCJleHAiOjE3ODU0NTYwMDAsInN1YiI6Ijk2ODk3NDciLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MzEzNDcxMTksImJhc2VfZG9tYWluIjoia29tbW8uY29tIiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibm90aWZpY2F0aW9ucyIsInB1c2hfbm90aWZpY2F0aW9ucyJdLCJoYXNoX3V1aWQiOiIzMGUyYzY5NS1kZmFmLTRmNDMtODk5Yi03YTcxNzEzMDZhODQiLCJ1c2VyX2ZsYWdzIjoxLCJhcGlfZG9tYWluIjoiYXBpLWcua29tbW8uY29tIn0.ZNUiC3zHnfX8IWFpt3Op8q1PPQVzreDeFbWJK2dYN65rIAm62zqE71nBgjMNnVgrM0keKRTx82LAYSe-psUMb_uwmkrVuS-m6op6T33ZyQvZdZIsPRUZID0z6Keq2qSe1kiCZqUVwV7hFbUh435akperHkn1PaXaltlTPlhLeZaWMAT93XsNJwwbhivaARMnkJTV8bOvU_ictXXIMoqTHrYRAdBivXiLka6pfsld_u6EO-vSvmErmPpk03dPEFsS6r8Is_WoPlRb1qmhdmHAPD9_4VbHOY9WLNC8sKvtJE7CcjJD4Ub_8rsSo2hKqI-sctfcHCOZOl7Zahn0yMaDUw

Bearer Token Completo:
M0ra1s#3013|grupogx|eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImQ4M2JkNjQ2ZDdlYmFhNTk5NTAxNzZmNjc1OGU0OTliNDkwMDdiNTNmODI2M2E0MTQ2ODc2MTUwZjcwNTFiMmMxM2FmZGU4ZTFlNjViMjNmIn0.eyJhdWQiOiIzODQ4ZTJkYS0xMjY2LTQ1YjEtODk3ZS00NGMyZGQ0ZDU5YzUiLCJqdGkiOiJkODNiZDY0NmQ3ZWJhYTU5OTUwMTc2ZjY3NThlNDk5YjQ5MDA3YjUzZjgyNjNhNDE0Njg3NjE1MGY3MDUxYjJjMTNhZmRlOGUxZTY1YjIzZiIsImlhdCI6MTc2NTgyNjQyMCwibmJmIjoxNzY1ODI2NDIwLCJleHAiOjE3ODU0NTYwMDAsInN1YiI6Ijk2ODk3NDciLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MzEzNDcxMTksImJhc2VfZG9tYWluIjoia29tbW8uY29tIiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibm90aWZpY2F0aW9ucyIsInB1c2hfbm90aWZpY2F0aW9ucyJdLCJoYXNoX3V1aWQiOiIzMGUyYzY5NS1kZmFmLTRmNDMtODk5Yi03YTcxNzEzMDZhODQiLCJ1c2VyX2ZsYWdzIjoxLCJhcGlfZG9tYWluIjoiYXBpLWcua29tbW8uY29tIn0.ZNUiC3zHnfX8IWFpt3Op8q1PPQVzreDeFbWJK2dYN65rIAm62zqE71nBgjMNnVgrM0keKRTx82LAYSe-psUMb_uwmkrVuS-m6op6T33ZyQvZdZIsPRUZID0z6Keq2qSe1kiCZqUVwV7hFbUh435akperHkn1PaXaltlTPlhLeZaWMAT93XsNJwwbhivaARMnkJTV8bOvU_ictXXIMoqTHrYRAdBivXiLka6pfsld_u6EO-vSvmErmPpk03dPEFsS6r8Is_WoPlRb1qmhdmHAPD9_4VbHOY9WLNC8sKvtJE7CcjJD4Ub_8rsSo2hKqI-sctfcHCOZOl7Zahn0yMaDUw
```

## ✅ Checklist de Debug

- [ ] `.env` criado com `MCP_PASSWORD`
- [ ] Servidor compilado (`npm run build`)
- [ ] Servidor rodando (`npm start`)
- [ ] MCP Inspector aberto
- [ ] Token Bearer formatado corretamente
- [ ] Subdomain e kommoToken válidos
- [ ] Headers configurados no Inspector
- [ ] Initialize bem-sucedido
- [ ] Tools listadas corretamente
