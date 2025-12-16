# Changelog

## [1.1.0] - 2025-12-15

### ✨ Melhorias Implementadas

#### 🔒 Segurança
- **Senha obrigatória**: `MCP_PASSWORD` agora é obrigatória via variável de ambiente (sem fallback hardcoded)
- **Validação de token**: Melhor validação do formato Bearer token com mensagens de erro claras
- **Error handling**: Códigos de erro JSON-RPC 2.0 padronizados

#### 🎯 Validação de Entrada
- **Schemas Zod**: Implementação de validação para todos os endpoints principais
  - `kommo_list_leads`: Validação de query, limit (1-250), page
  - `kommo_update_lead`: Validação de lead_id, campos opcionais
  - `kommo_add_notes`: Validação de lead_id e texto obrigatório
  - `kommo_add_tasks`: Validação de lead_id, texto, timestamp e tipo de tarefa
  - `kommo_list_pipeline_stages`: Validação de pipeline_id
- **Error messages**: Mensagens de erro estruturadas e descritivas

#### 🏗️ Arquitetura e Código Limpo
- **Constantes centralizadas**: Novo arquivo `src/constants.ts` com:
  - Versões e configurações do servidor
  - TTL de cache configurável
  - Códigos de erro padronizados
  - Mensagens de erro reutilizáveis
  - Limites da API
- **Schemas separados**: Novo arquivo `src/schemas.ts` com todas validações Zod
- **TypeScript strict**: Todas as tipagens explícitas (sem `any` implícito)
- **Tipagens Fastify**: `FastifyRequest` e `FastifyReply` em todos os handlers

#### ⚙️ Configuração
- **dotenv**: Configuração automática de variáveis de ambiente com `import 'dotenv/config'`
- **TypeScript**: Adicionado DOM às libs para suportar fetch, URLSearchParams, console
- **Types**: Configuração explícita de tipos do Node.js no tsconfig

#### 📚 Documentação
- **USAGE.md**: Guia completo de uso com exemplos curl
  - Exemplos de todos os endpoints MCP
  - Exemplos da API REST legacy
  - Formato do token de autenticação
  - Códigos de erro e status HTTP
  - Configuração de variáveis de ambiente
- **README.md atualizado**: 
  - Seção de boas práticas e segurança
  - Tabela de ferramentas com validação
  - Informações sobre cache
  - Alertas de segurança destacados
- **CHANGELOG.md**: Este arquivo documentando as mudanças

#### 🚀 Performance e Cache
- **Cache configurável**: TTL centralizado em constantes
  - Pipelines: 10 minutos
  - Estágios: 10 minutos
  - Campos customizados: 1 hora
- **Validação otimizada**: Zod safeParse para evitar exceptions desnecessárias

#### 🐛 Correções
- **Process types**: Adicionado suporte a `process.env` sem erros TypeScript
- **Fetch types**: Suporte correto para `fetch`, `URLSearchParams`, `RequestInit`
- **Console types**: Removidos erros de tipagem do `console.log`

### 🔧 Refatorações
- Mensagens de erro agora usam constantes do `ERROR_MESSAGES`
- Códigos de erro JSON-RPC usam constantes do `JSON_RPC_ERRORS`
- Limites da API usam constantes do `API_LIMITS`
- Cache TTL usa constantes do `CACHE_TTL`
- Validação de parâmetros extraída para função reutilizável

### 📦 Dependências
Nenhuma nova dependência adicionada - utilizadas as já existentes:
- `zod` (já estava no package.json, agora em uso)
- `dotenv` (já estava no package.json, agora configurado)
- `@types/node` (já estava no package.json, agora explícito no tsconfig)

---

## [1.0.0] - Data anterior

### Versão inicial
- Implementação básica do MCP Server
- Integração com Kommo CRM
- Suporte multi-tenant
- API REST legacy
- Sistema de cache simples
