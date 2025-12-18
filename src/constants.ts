/**
 * Constantes e configurações do MCP Server Vorp
 * Especializado para agente comercial do Grupo Vorp
 * 
 * 🎯 Quatro empresas, um propósito: construir negócios fortes e escaláveis
 * - Vorp Tecnologia: BI, IA, Automações, Business Analytics
 * - Vorp Educação: Estruturação, capacitação e gestão de vendas
 * - Vorp Scale: Escala de negócios com metodologia PMV e tráfego digital
 * - Match Sales: Plataforma de Inside Sales
 */

// Versão do protocolo MCP
export const MCP_PROTOCOL_VERSION = "2024-11-05";

// Informações do servidor
export const SERVER_INFO = {
  name: "vorp-mcp-server",
  version: "1.0.0",
  description: "MCP Server especializado para agente comercial do Grupo Vorp",
} as const;

// ========== FUNIS GRUPO VORP ==========
// Os três funis principais do processo comercial Vorp

export const VORP_FUNNELS = {
  // Funil SDR - Sales Development Representative
  // Leads que chegam pela internet (inbound)
  SDR: {
    code: "SDR",
    name: "SDR - Leads da Internet",
    description: "Funil de leads que chegam através de canais digitais: site, redes sociais, anúncios, formulários. O SDR qualifica e agenda reuniões para os Closers.",
    objective: "Qualificar leads inbound e agendar reuniões com potencial de fechamento",
    metrics: ["Leads recebidos", "Taxa de qualificação", "Reuniões agendadas", "Tempo de resposta"],
  },
  
  // Funil BDR - Business Development Representative
  // Leads de prospecção ativa (outbound)
  BDR: {
    code: "BDR",
    name: "BDR - Prospecção Ativa",
    description: "Funil de leads prospectados ativamente pela equipe. O BDR identifica empresas-alvo, faz cold calling, cold email e social selling para gerar oportunidades.",
    objective: "Prospectar ativamente e qualificar empresas-alvo para geração de oportunidades",
    metrics: ["Contatos prospectados", "Taxa de resposta", "Reuniões agendadas", "Pipeline gerado"],
  },
  
  // Funil Closers - A partir de reunião acontecida
  // Negociação e fechamento
  CLOSERS: {
    code: "CLOSERS",
    name: "Closers - Fechamento",
    description: "Funil de oportunidades a partir de reunião realizada. Os Closers conduzem a negociação, apresentam propostas e fecham contratos.",
    objective: "Converter reuniões qualificadas em contratos fechados",
    metrics: ["Reuniões realizadas", "Propostas enviadas", "Taxa de conversão", "Ticket médio", "Faturamento"],
  },
} as const;

// Tipo para os códigos de funil
export type VorpFunnelCode = keyof typeof VORP_FUNNELS;

// Configurações de cache (em segundos)
export const CACHE_TTL = {
  PIPELINES: 600,        // 10 minutos - estrutura de funis
  STAGES: 600,           // 10 minutos - etapas dos funis
  CUSTOM_FIELDS: 3600,   // 1 hora - campos customizados
  USERS: 1800,           // 30 minutos - lista de vendedores
} as const;

// Tipos de tarefa no Kommo
export const TASK_TYPES = {
  LIGAR: 1,              // Tarefa de ligação
  REUNIAO: 2,            // Tarefa de reunião
  EMAIL: 3,              // Tarefa de enviar email
} as const;

// Códigos de erro JSON-RPC 2.0
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
} as const;

// Limites da API
export const API_LIMITS = {
  MAX_LEADS_PER_PAGE: 250,
  DEFAULT_LEADS_LIMIT: 10,
  DEFAULT_PAGE: 1,
  MAX_LEADS_DETAIL: 10,  // Limite de leads com detalhes completos
} as const;

// Configurações do servidor HTTP
export const SERVER_CONFIG = {
  DEFAULT_PORT: 3000,
  DEFAULT_HOST: "0.0.0.0",
} as const;

// Mensagens de erro padrão
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Não autorizado - verifique suas credenciais",
  INVALID_TOKEN_FORMAT: "Formato de token inválido. Esperado: password|subdomain|kommoToken",
  MISSING_AUTHORIZATION: "Header Authorization ausente",
  TOOL_NOT_FOUND: (toolName: string) => `Ferramenta "${toolName}" não encontrada`,
  METHOD_NOT_SUPPORTED: (method: string) => `Método "${method}" não suportado`,
  MISSING_PARAM: (param: string) => `Parâmetro "${param}" é obrigatório`,
  FUNNEL_NOT_FOUND: (funnel: string) => `Funil "${funnel}" não encontrado. Use: SDR, BDR ou CLOSERS`,
} as const;

// ========== CONFIGURAÇÃO GOOGLE SHEETS ==========
// Planilha de Eventos - Fonte de verdade para etapas pós-agendamento
export const SHEETS_CONFIG = {
  SPREADSHEET_ID: "1SYnbGSKa3M80VGSenzsAYERZrbBc43Icb5hbwX7PNWE",
  SHEET_NAME: "Eventos",
  API_KEY: process.env.GOOGLE_SHEETS_API_KEY || "AIzaSyCTRGhW0Zkuo2foqOsVsXWQhRXvBjvUSCI",
} as const;

// Status de eventos na planilha (fonte de verdade pós-agendamento)
export const EVENT_STATUS = {
  AGENDADO: "Agendado",
  REALIZADO: "Realizado",
  PROPOSTA: "Proposta enviada",
  CONTRATO: "Contrato enviado",
  VENDA: "Venda",
  PERDIDO: "Perdido",
} as const;

// Etapas que são gerenciadas pela PLANILHA (não Kommo)
// A partir de "Reunião Agendada", a planilha é a fonte de verdade
export const ETAPAS_PLANILHA = [
  "Agendado",
  "Reunião Agendada",
  "Reunião Realizada",
  "Realizado",
  "Proposta Enviada",
  "Proposta enviada",
  "Contrato Enviado",
  "Contrato enviado",
  "Negociação / Follow-up",
  "Venda",
  "Venda realizada",
  "Perdido",
] as const;

// Contexto comercial do Grupo Vorp para as descrições das ferramentas
export const VORP_CONTEXT = {
  company: "Grupo Vorp",
  mission: "Construir negócios fortes e escaláveis",
  methodology: "Metodologia PMV - Processos estruturados com estratégias de marketing e vendas",
  values: [
    "É proibido mediocridade",
    "Humildade no chão, ambição no céu",
    "Se prometeu, cumpra",
    "Troque reclamar por solucionar",
    "Nenhum de nós é melhor que todos nós juntos",
    "Nada é impossível para quem crê",
  ],
  metrics: {
    empresas_impactadas: 500,
    estados_atendidos: 20,
    faturamento_gerado: "200MM",
  },
} as const;
