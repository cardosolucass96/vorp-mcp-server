# Vorp MCP Server

Servidor MCP (Model Context Protocol) para o Agente Comercial do Grupo Vorp.

Integra com **Kommo CRM** e **Google Sheets** para gerenciamento completo de leads nos funis SDR, BDR e Closers.

## 🎯 Funcionalidades

- **Gestão de Leads**: Criar, buscar, atualizar e mover leads entre etapas
- **Gestão de Contatos**: Listar e atualizar contatos (email, telefone)
- **Campos Nativos e Customizados**: Suporte completo a campos do Kommo
- **Planilha de Eventos**: Métricas pós-agendamento (reuniões, propostas, vendas)
- **Multi-tenant**: Suporte a múltiplas contas via token Bearer

## 🔧 Ferramentas Disponíveis

### Busca e Consulta
| Ferramenta | Descrição |
|------------|-----------|
| `vorp_buscar_lead` | Busca global por nome em todos os funis |
| `vorp_buscar_lead_por_id` | Detalhes completos de um lead com valores |
| `vorp_buscar_por_telefone` | Busca lead por telefone |
| `vorp_listar_leads_funil` | Lista leads de um funil específico |
| `vorp_listar_etapas_funil` | Lista etapas de um funil (para obter status_id) |
| `vorp_listar_campos_customizados` | Lista campos customizados (para obter field_id e enum_id) |
| `vorp_listar_vendedores` | Lista usuários/vendedores (para obter user_id) |
| `vorp_listar_contatos` | Lista contatos do CRM |
| `vorp_historico_lead` | Timeline de eventos de um lead |

### Ações
| Ferramenta | Descrição |
|------------|-----------|
| `vorp_criar_lead` | Cria novo lead com contato vinculado |
| `vorp_atualizar_lead` | Atualiza campos nativos e customizados |
| `vorp_atualizar_contato` | Atualiza email/telefone de um contato |
| `vorp_mover_lead` | Move lead entre etapas do funil |
| `vorp_adicionar_nota` | Adiciona nota/observação a um lead |
| `vorp_criar_tarefa` | Cria tarefa/lembrete para um lead |

### Planilha de Eventos (Métricas Pós-Agendamento)
| Ferramenta | Descrição |
|------------|-----------|
| `vorp_planilha_listar_eventos` | Lista eventos com filtros |
| `vorp_planilha_eventos_lead` | Eventos de um lead específico |
| `vorp_planilha_metricas` | Métricas consolidadas |
| `vorp_planilha_buscar_evento` | Busca evento por ID |

## 📊 Campos de Valor

O sistema trabalha com dois tipos de valor:

| Campo | Descrição | Origem |
|-------|-----------|--------|
| `valor_venda` | Valor pago no ato do fechamento | Campo nativo `price` |
| `valor_contrato` | Valor total do contrato (ARR) | Campo customizado `1024619` |

## 🚀 Instalação

```bash
npm install
npm run build
```

## ⚡ Execução

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

O servidor inicia na porta `3000` por padrão.

## 🐳 Docker

```bash
# Build
docker build -t vorp-mcp .

# Run
docker run -p 3000:3000 vorp-mcp

# Com docker-compose
docker-compose up -d
```

## 🔐 Autenticação

O servidor usa autenticação via Bearer Token no formato:

```
Authorization: Bearer {senha}|{subdomain}|{kommoToken}
```

- `senha`: Senha de acesso ao MCP
- `subdomain`: Subdomínio da conta Kommo (ex: "vorp")
- `kommoToken`: Token de acesso da API Kommo

## 📁 Estrutura do Projeto

```
├── src/
│   ├── server.ts           # Servidor principal + handlers MCP
│   ├── schemas.ts          # Schemas Zod de validação
│   ├── constants.ts        # Constantes (funis, etapas, config)
│   ├── kommo/
│   │   ├── client.ts       # Cliente HTTP para Kommo API
│   │   └── types.ts        # Tipos TypeScript
│   └── sheets/
│       ├── client.ts       # Cliente Google Sheets API
│       └── types.ts        # Tipos da planilha
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── prompt-system.md        # Prompt completo do agente
└── prompt-system-compact.md # Prompt compacto
```

## 📝 Prompt do Agente

O agente deve seguir estas regras principais:

1. **Usar ferramentas de descoberta**: Sempre consultar `vorp_listar_etapas_funil` e `vorp_listar_campos_customizados` antes de atualizar
2. **Executar comandos compostos**: Se o usuário fornecer informação suficiente, executar tudo de uma vez
3. **Confirmar ações em massa**: Pedir confirmação apenas para ações que afetam múltiplos leads

Veja os arquivos de prompt para configurar o agente:
- `prompt-system.md` - Versão completa com exemplos
- `prompt-system-compact.md` - Versão compacta para produção

## 📄 Licença

MIT - Grupo Vorp
