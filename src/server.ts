/**
 * Kommo MCP Server - Fastify + Node.js
 * Multi-tenant: Token Bearer = senha|subdomain|kommoToken
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createKommoClient, KommoClientInterface } from "./kommo/clientCF.js";
import {
  LeadsListResponse,
  Lead,
  LeadUpdateRequest,
  NotesCreateResponse,
  NoteCreateRequest,
  TasksCreateResponse,
  TaskCreateRequest,
  PipelinesListResponse,
  StagesListResponse,
} from "./kommo/types.js";

// ========== MCP Protocol Types ==========
interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Cache simples em memória
const pipelinesCache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = pipelinesCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    pipelinesCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttlSeconds: number = 600) {
  pipelinesCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// ========== Tool Definitions para MCP ==========
const toolDefinitions: MCPToolDefinition[] = [
  {
    name: "kommo_list_leads",
    description: "Lista leads do Kommo CRM. Use para buscar leads por nome, telefone ou listar todos. IMPORTANTE: Sempre use esta tool ANTES de atualizar um lead para obter o lead_id correto.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Texto para buscar no nome do lead ou telefone" },
        limit: { type: "number", description: "Quantidade de resultados (padrão: 10, máximo: 250)" },
        page: { type: "number", description: "Página para paginação (padrão: 1)" },
      },
    },
  },
  {
    name: "kommo_update_lead",
    description: "Atualiza um lead específico (nome, preço, status ou campos customizados). FLUXO OBRIGATÓRIO: 1) Use kommo_list_leads para encontrar o lead_id. 2) Se precisar mudar status, use kommo_list_pipelines para obter status_id. 3) Se precisar atualizar campos customizados, use kommo_list_lead_custom_fields para obter field_id e enums. IMPORTANTE: Cada CRM tem campos diferentes, sempre consulte os campos disponíveis antes de atualizar. EXEMPLO para campo customizado: custom_fields_values: [{field_id: 1093415, values: [{value: 'texto'}]}]",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "number", description: "ID do lead (obtenha com kommo_list_leads)" },
        name: { type: "string", description: "Novo nome do lead" },
        price: { type: "number", description: "Novo preço/valor do lead em número (ex: 1500.50)" },
        status_id: { type: "number", description: "ID do novo status (obtenha com kommo_list_pipelines)" },
        custom_fields_values: { 
          type: "array", 
          description: "Array de campos customizados. Cada item deve ter field_id (número) e values (array com objetos contendo value). Para campos select/multiselect, pode incluir enum_id também.",
          items: {
            type: "object",
            properties: {
              field_id: { type: "number", description: "ID do campo customizado (obtenha com kommo_list_lead_custom_fields)" },
              values: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    value: { type: ["string", "number", "boolean"], description: "Valor do campo" },
                    enum_id: { type: "number", description: "ID do enum (apenas para campos select/multiselect)" }
                  },
                  required: ["value"]
                }
              }
            },
            required: ["field_id", "values"]
          }
        },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "kommo_add_notes",
    description: "Adiciona nota/observação a um lead no Kommo CRM. WORKFLOW: 1) Use kommo_list_leads para obter o lead_id. 2) Passe o lead_id e texto da nota. A nota será registrada no histórico do lead, visível para toda a equipe. Use para documentar ligações, reuniões, acordos ou qualquer informação relevante sobre o lead.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "number", description: "ID do lead (obtenha com kommo_list_leads)" },
        text: { type: "string", description: "Texto da nota. Exemplo: 'Cliente confirmou interesse no produto X'" },
      },
      required: ["lead_id", "text"],
    },
  },
  {
    name: "kommo_add_tasks",
    description: "Cria tarefa/lembrete para um lead no Kommo CRM. WORKFLOW: 1) Use kommo_list_leads para obter lead_id. 2) Defina complete_till em Unix timestamp (exemplo: para amanhã use Date.now()/1000 + 86400). 3) Escolha task_type_id: 1=Ligar, 2=Reunião, 3=Escrever Email. A tarefa aparecerá no calendário do responsável pelo lead. IMPORTANTE: complete_till deve ser timestamp futuro em segundos (não milissegundos).",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "number", description: "ID do lead (obtenha com kommo_list_leads)" },
        text: { type: "string", description: "Descrição da tarefa. Exemplo: 'Ligar para confirmar proposta'" },
        complete_till: { type: "number", description: "Prazo Unix timestamp em segundos. Amanhã = Math.floor(Date.now()/1000) + 86400" },
        task_type_id: { type: "number", description: "Tipo da tarefa: 1=Ligar (padrão), 2=Reunião, 3=Escrever Email" },
      },
      required: ["lead_id", "text", "complete_till"],
    },
  },
  {
    name: "kommo_list_pipelines",
    description: "Lista TODOS os pipelines (funis de venda) do Kommo CRM com seus estágios. USE quando precisar descobrir quais status_id existem para mover leads entre etapas do funil. RETORNA para cada pipeline: pipeline_id, nome, e lista completa de estágios com (status_id, nome, cor, ordem, tipo). WORKFLOW: 1) Chame esta tool sem parâmetros. 2) Encontre o pipeline desejado (ex: 'Vendas', 'Cobrança'). 3) Anote o status_id do estágio destino. 4) Use esse status_id em kommo_update_lead. Resultados são cacheados por 10 minutos.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "kommo_list_pipeline_stages",
    description: "Lista estágios de UM pipeline específico (alternativa mais focada ao kommo_list_pipelines). USE quando já souber o pipeline_id e quiser apenas os estágios daquele funil. RETORNA: lista de estágios com status_id, nome, cor, ordem e tipo. QUANDO USAR: Se não souber o pipeline_id, use kommo_list_pipelines primeiro para ver todos os pipelines. Se já souber o ID, use esta tool para resultados mais diretos. Útil para descobrir status_id válidos antes de mover leads.",
    inputSchema: {
      type: "object",
      properties: {
        pipeline_id: { type: "number", description: "ID do pipeline (obtenha com kommo_list_pipelines se necessário)" },
      },
      required: ["pipeline_id"],
    },
  },
  {
    name: "kommo_list_lead_custom_fields",
    description: "Lista TODOS os campos customizados disponíveis para leads neste CRM específico. CRUCIAL: Cada CRM tem campos diferentes! Use esta tool para: 1) Descobrir quais campos existem (id, name, code, type). 2) Ver valores permitidos (enums) para campos de seleção. 3) Identificar campos obrigatórios (is_required). 4) Saber o tipo de dado esperado (text, numeric, select, multiselect, date, url, checkbox, etc). SEMPRE consulte esta tool antes de atualizar campos customizados, pois os IDs e estruturas variam entre CRMs diferentes.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// ========== Tool Handlers ==========
type ToolHandler = (
  params: Record<string, unknown>,
  client: KommoClientInterface
) => Promise<unknown>;

const toolHandlers: Record<string, ToolHandler> = {
  kommo_list_leads: async (params, client) => {
    const { query, limit = 10, page = 1 } = params as { query?: string; limit?: number; page?: number };
    
    const queryParams: Record<string, unknown> = { limit, page };
    if (query) queryParams.query = query;

    const response = await client.get<LeadsListResponse>("/leads", queryParams);
    const leads = response._embedded?.leads || [];

    return { total: leads.length, leads };
  },

  kommo_update_lead: async (params, client) => {
    const { lead_id, name, price, status_id, custom_fields_values } = params as { 
      lead_id: number;
      name?: string; 
      price?: number; 
      status_id?: number;
      custom_fields_values?: Array<{
        field_id: number;
        values: Array<{ value: string | number | boolean; enum_id?: number }>;
      }>;
    };

    if (!lead_id) throw new Error("lead_id é obrigatório");
    
    const body: LeadUpdateRequest = {};
    if (name) body.name = name;
    if (price !== undefined) body.price = price;
    if (status_id) body.status_id = status_id;
    if (custom_fields_values) body.custom_fields_values = custom_fields_values;

    return await client.patch<Lead>(`/leads/${lead_id}`, body);
  },

  kommo_add_notes: async (params, client) => {
    const { lead_id, text } = params as { lead_id: number; text: string };

    if (!lead_id) throw new Error("lead_id é obrigatório");
    if (!text) throw new Error("text é obrigatório");
    
    const payload: NoteCreateRequest[] = [{
      entity_id: lead_id,
      note_type: "common",
      params: { text },
    }];

    const response = await client.post<NotesCreateResponse>("/leads/notes", payload);
    return response._embedded?.notes || [];
  },

  kommo_add_tasks: async (params, client) => {
    const { lead_id, text, complete_till, task_type_id = 1 } = params as { 
      lead_id: number;
      text: string; 
      complete_till: number; 
      task_type_id?: number;
    };

    if (!lead_id) throw new Error("lead_id é obrigatório");
    if (!text) throw new Error("text é obrigatório");
    if (!complete_till) throw new Error("complete_till é obrigatório");
    
    const payload: TaskCreateRequest[] = [{
      task_type_id,
      text,
      complete_till,
      entity_id: lead_id,
      entity_type: "leads",
      request_id: `task_${Date.now()}`,
    }];

    const response = await client.post<TasksCreateResponse>("/tasks", payload);
    return response._embedded?.tasks || [];
  },

  kommo_list_pipelines: async (_params, client) => {
    const cached = getCached<unknown>("pipelines");
    if (cached) return cached;

    const response = await client.get<PipelinesListResponse>("/leads/pipelines");
    const pipelines = response._embedded?.pipelines || [];

    const formatted = pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      is_main: p.is_main,
      stages: p._embedded?.statuses?.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
      })) || [],
    }));

    setCache("pipelines", formatted, 600);
    return formatted;
  },

  kommo_list_pipeline_stages: async (params, client) => {
    const { pipeline_id } = params as { pipeline_id: number };

    if (!pipeline_id) throw new Error("pipeline_id é obrigatório");
    
    const cacheKey = `stages_${pipeline_id}`;
    const cached = getCached<unknown>(cacheKey);
    if (cached) return cached;

    const response = await client.get<StagesListResponse>(
      `/leads/pipelines/${pipeline_id}/statuses`
    );
    const stages = response._embedded?.statuses || [];

    const formatted = stages.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      sort: s.sort,
    }));

    setCache(cacheKey, formatted, 600);
    return formatted;
  },

  kommo_list_lead_custom_fields: async (_params, client) => {
    const cacheKey = "lead_custom_fields";
    const cached = getCached<unknown>(cacheKey);
    if (cached) return cached;

    const response = await client.get<any>("/leads/custom_fields");
    const fields = response._embedded?.custom_fields || [];

    const formatted = fields.map((f: any) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      code: f.code || null,
      sort: f.sort,
      entity_type: f.entity_type,
      is_required: f.is_required || false,
      is_predefined: f.is_predefined || false,
      is_deletable: f.is_deletable || false,
      is_api_only: f.is_api_only || false,
      group_id: f.group_id || null,
      remind: f.remind || null,
      enums: f.enums?.map((e: any) => ({
        id: e.id,
        value: e.value,
        sort: e.sort,
      })) || null,
      required_statuses: f.required_statuses?.map((rs: any) => ({
        status_id: rs.status_id,
        pipeline_id: rs.pipeline_id,
      })) || null,
    }));

    setCache(cacheKey, formatted, 3600); // Cache por 1 hora
    return formatted;
  },
};

// ========== MCP Protocol Handler ==========
async function handleMCPRequest(
  mcpRequest: MCPRequest,
  kommoBaseUrl: string,
  kommoAccessToken: string
): Promise<MCPResponse> {
  const { id, method, params } = mcpRequest;

  try {
    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "kommo-mcp-server",
              version: "1.0.0",
            },
          },
        };

      case "notifications/initialized":
        return { jsonrpc: "2.0", id, result: {} };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: toolDefinitions,
          },
        };

      case "tools/call": {
        const toolParams = params as { name: string; arguments?: Record<string, unknown> };
        const toolName = toolParams.name;
        const toolArgs = toolParams.arguments || {};

        const handler = toolHandlers[toolName];
        if (!handler) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32601,
              message: `Tool "${toolName}" não encontrada`,
            },
          };
        }

        const client = createKommoClient(kommoBaseUrl, kommoAccessToken);
        const result = await handler(toolArgs, client);

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Método "${method}" não suportado`,
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : "Erro interno",
      },
    };
  }
}

// Validar Bearer Token
const SECRET_PASSWORD = process.env.MCP_PASSWORD || "M0ra1s#3013";

interface AuthResult {
  valid: boolean;
  subdomain?: string;
  kommoBaseUrl?: string;
  kommoAccessToken?: string;
}

function validateAuth(authHeader: string | undefined): AuthResult {
  if (!authHeader) return { valid: false };
  
  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) return { valid: false };
  
  const parts = token.split("|");
  if (parts.length !== 3) return { valid: false };
  
  const [password, subdomain, kommoAccessToken] = parts;
  
  if (password !== SECRET_PASSWORD) return { valid: false };
  if (!subdomain || !kommoAccessToken) return { valid: false };
  
  const kommoBaseUrl = `https://${subdomain}.kommo.com`;
  
  return { valid: true, subdomain, kommoBaseUrl, kommoAccessToken };
}

// ========== Fastify Server ==========
async function startServer() {
  const fastify = Fastify({ logger: true });

  // CORS
  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id'],
  });

  // Health check
  fastify.get('/', async () => {
    return {
      status: 'ok',
      version: '1.0.0',
      name: 'kommo-mcp-server',
      transport: 'streamable-http',
      tools: toolDefinitions.map(t => t.name),
    };
  });

  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  // ========== MCP Endpoint ==========
  fastify.post('/mcp', async (request, reply) => {
    const auth = validateAuth(request.headers.authorization);
    
    if (!auth.valid || !auth.kommoBaseUrl || !auth.kommoAccessToken) {
      reply.code(401);
      return { error: 'Unauthorized' };
    }

    try {
      const parsed = request.body as MCPRequest | MCPRequest[];
      const messages: MCPRequest[] = Array.isArray(parsed) ? parsed : [parsed];
      
      const responses: MCPResponse[] = [];
      
      for (const msg of messages) {
        const response = await handleMCPRequest(msg, auth.kommoBaseUrl, auth.kommoAccessToken);
        if (msg.id !== undefined && msg.id !== null) {
          responses.push(response);
        }
      }

      return responses.length === 1 ? responses[0] : responses;
    } catch (error) {
      reply.code(400);
      return {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
        },
      };
    }
  });

  fastify.delete('/mcp', async (request, reply) => {
    reply.code(204);
    return;
  });

  // ========== Legacy REST API ==========
  fastify.get('/tools', async (request, reply) => {
    const auth = validateAuth(request.headers.authorization);
    
    if (!auth.valid) {
      reply.code(401);
      return { error: true, message: 'Unauthorized' };
    }

    return { tools: toolDefinitions };
  });

  fastify.post('/execute', async (request, reply) => {
    const auth = validateAuth(request.headers.authorization);
    
    if (!auth.valid || !auth.kommoBaseUrl || !auth.kommoAccessToken) {
      reply.code(401);
      return { error: true, message: 'Unauthorized' };
    }

    try {
      const { tool: toolName, params = {} } = request.body as { 
        tool: string; 
        params?: Record<string, unknown> 
      };

      const handler = toolHandlers[toolName];
      if (!handler) {
        reply.code(404);
        return { error: true, message: `Tool "${toolName}" não encontrada.` };
      }

      const client = createKommoClient(auth.kommoBaseUrl, auth.kommoAccessToken);
      const result = await handler(params, client);

      return { success: true, data: result };
    } catch (error) {
      reply.code(500);
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      return { error: true, message };
    }
  });

  // Start server
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Kommo MCP Server rodando em http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Iniciar servidor
startServer();
