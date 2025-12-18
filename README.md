# Vorp MCP Server

Servidor MCP (Model Context Protocol) para o Agente Comercial do Grupo Vorp.

Integra com **Kommo CRM** e **Google Sheets** para gerenciamento completo de leads nos funis SDR, BDR e Closers.

## Ferramentas Disponíveis

| Ferramenta | Descrição |
|------------|-----------|
| `vorp_listar_leads` | Lista leads de um funil específico com filtros |
| `vorp_buscar_lead` | Busca global por nome em todos os funis |
| `vorp_buscar_lead_por_id` | Detalhes completos de um lead |
| `vorp_atualizar_lead` | Atualiza campos de um lead |
| `vorp_mover_lead` | Move lead entre etapas do funil |
| `vorp_criar_lead` | Cria novo lead |
| `vorp_criar_nota` | Adiciona nota a um lead |
| `vorp_criar_tarefa` | Cria tarefa para um lead |
| `vorp_listar_tarefas` | Lista tarefas de um lead |
| `vorp_completar_tarefa` | Marca tarefa como concluída |
| `vorp_listar_etapas` | Lista etapas de um funil |
| `vorp_planilha_*` | Acesso à planilha de eventos pós-agendamento |

## Instalação

```bash
npm install
npm run build
```

## Execução

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

O servidor inicia na porta `3000` por padrão.

## Docker

```bash
# Build
docker build -t vorp-mcp .

# Run
docker run -p 3000:3000 vorp-mcp
```

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3000` | Porta do servidor |
| `HOST` | `0.0.0.0` | Host do servidor |

## Prompt do Agente

Veja os arquivos de prompt para configurar o agente:

- `prompt-system.md` - Versão completa com exemplos
- `prompt-system-compact.md` - Versão compacta para produção

## Estrutura

```
├── src/
│   ├── server.ts          # Servidor principal + handlers MCP
│   ├── schemas.ts          # Schemas Zod
│   ├── constants.ts        # Constantes (funis, etapas)
│   ├── kommo/              # Cliente Kommo API
│   │   ├── clientCF.ts
│   │   └── types.ts
│   └── sheets/             # Cliente Google Sheets
│       └── client.ts
├── Dockerfile
├── package.json
├── tsconfig.json
└── prompt-system.md
```

## Licença

MIT - Grupo Vorp



class Carro {
     String marca;
     int ano;

     def getMarcaCarro(){
          return self.marca;
     }

     def toString(){
          return f"self.marca + self.ano"
     }
}


Carro carro1;
carro1.marca = "tesla"

print(carro1.getMarcaCarro())
print(carro1)
