/**
 * Constantes e configurações do servidor MCP Kommo
 */

// Versão do protocolo MCP
export const MCP_PROTOCOL_VERSION = "2024-11-05";

// Informações do servidor
export const SERVER_INFO = {
  name: "kommo-mcp-server",
  version: "1.0.0",
} as const;

// Configurações de cache (em segundos)
export const CACHE_TTL = {
  PIPELINES: 600,        // 10 minutos
  STAGES: 600,           // 10 minutos
  CUSTOM_FIELDS: 3600,   // 1 hora
} as const;

// Tipos de tarefa no Kommo
export const TASK_TYPES = {
  CALL: 1,
  MEETING: 2,
  EMAIL: 3,
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
  MAX_LEADS_DETAIL: 10, // Limite máximo de leads com detalhes completos para economizar tokens
} as const;

// Configurações do servidor HTTP
export const SERVER_CONFIG = {
  DEFAULT_PORT: 3000,
  DEFAULT_HOST: "0.0.0.0",
} as const;

// Mensagens de erro padrão
export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  INVALID_TOKEN_FORMAT: "Invalid token format. Expected: password|subdomain|kommoToken",
  MISSING_AUTHORIZATION: "Missing Authorization header",
  TOOL_NOT_FOUND: (toolName: string) => `Tool "${toolName}" not found`,
  METHOD_NOT_SUPPORTED: (method: string) => `Method "${method}" not supported`,
  MISSING_PARAM: (param: string) => `${param} is required`,
} as const;
