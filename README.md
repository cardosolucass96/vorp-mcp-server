# Kommo MCP Server

Servidor MCP (Model Context Protocol) para integração com o CRM Kommo, otimizado para agentes SDR.

## 🎯 Características

- **Controle de Sessão**: Agente só pode modificar o lead em atendimento
- **Prudência**: Descrições orientam o agente a avaliar antes de executar
- **Cache**: Pipelines cacheados por 10 minutos
- **Logging**: Sistema de logs estruturado para debug
- **Erros Amigáveis**: Mensagens de erro com sugestões de correção

## 📦 Instalação

```bash
npm install
npm run build
```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz:

```env
KOMMO_BASE_URL=https://suaempresa.kommo.com
KOMMO_ACCESS_TOKEN=seu_token_aqui
KOMMO_DEBUG=true
KOMMO_LOG_LEVEL=DEBUG
```

### VS Code (MCP)

Adicione ao `.vscode/mcp.json`:

```json
{
  "servers": {
    "kommo": {
      "command": "node",
      "args": ["caminho/para/dist/index.js"],
      "env": {
        "KOMMO_BASE_URL": "https://suaempresa.kommo.com",
        "KOMMO_ACCESS_TOKEN": "seu_token"
      }
    }
  }
}
```

### Claude Desktop

Adicione ao `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kommo": {
      "command": "node",
      "args": ["caminho/para/dist/index.js"],
      "env": {
        "KOMMO_BASE_URL": "https://suaempresa.kommo.com",
        "KOMMO_ACCESS_TOKEN": "seu_token"
      }
    }
  }
}
```

## 🔧 Ferramentas Disponíveis

### Controle de Sessão (SDR)

| Ferramenta | Descrição |
|------------|-----------|
| `kommo_start_session` | Inicia atendimento com um lead |
| `kommo_end_session` | Encerra o atendimento |
| `kommo_get_session` | Mostra lead em atendimento |

### Modificação (requer sessão)

| Ferramenta | Descrição |
|------------|-----------|
| `kommo_update_lead` | Atualiza dados do lead |
| `kommo_add_notes` | Adiciona notas ao lead |
| `kommo_add_tasks` | Cria tarefas/lembretes |

### Consulta (livre)

| Ferramenta | Descrição |
|------------|-----------|
| `kommo_list_leads` | Lista/busca leads |
| `kommo_list_pipelines` | Lista pipelines e estágios |
| `kommo_list_pipeline_stages` | Lista estágios de um pipeline |

## 🔄 Fluxo de Atendimento

```
1. kommo_start_session  → Inicia atendimento com lead
2. kommo_update_lead    → Modifica dados
3. kommo_add_notes      → Registra observações
4. kommo_add_tasks      → Cria follow-ups
5. kommo_end_session    → Encerra atendimento
```

## ⚠️ Filosofia de Prudência

As ferramentas são projetadas para que o **agente SDR decida** com prudência:

- ❌ NÃO execute apenas porque o cliente pediu
- ✅ Avalie se a ação faz sentido para o processo
- ✅ Valide informações antes de registrar
- ✅ Você é responsável pelas alterações

## 📁 Estrutura

```
src/
├── index.ts              # Entry point
├── kommo/
│   ├── client.ts         # HTTP client com lazy init
│   └── types.ts          # TypeScript interfaces
├── context/
│   └── sessionContext.ts # Gerenciador de sessão SDR
├── tools/
│   ├── sessionTools.ts   # start/end/get session
│   ├── listLeads.ts
│   ├── updateLead.ts
│   ├── addNotes.ts
│   ├── addTasks.ts
│   ├── listPipelines.ts
│   └── listPipelineStages.ts
└── utils/
    ├── errors.ts         # Tratamento de erros
    ├── cache.ts          # Cache em memória
    └── logger.ts         # Logging estruturado
```

## 🛠️ Desenvolvimento

```bash
# Build
npm run build

# Watch mode (se configurado)
npm run dev
```

## 📄 Licença

MIT
