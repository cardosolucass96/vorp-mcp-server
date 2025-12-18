/**
 * Schemas de validação Zod para o MCP Server Vorp
 * Validação de parâmetros das ferramentas do agente comercial
 */

import { z } from "zod";

// ========== Schemas das Ferramentas ==========

// Schema para listar leads dos funis Vorp
export const listLeadsFunnelSchema = z.object({
  funil: z.enum(["SDR", "BDR", "CLOSERS"]).describe("Funil do Grupo Vorp: SDR (leads da internet), BDR (prospecção ativa) ou CLOSERS (fechamento)"),
  query: z.string().optional().describe("Buscar por nome do lead, empresa ou telefone"),
  limit: z.number().optional().default(10).describe("Quantidade de resultados (máximo 250)"),
  page: z.number().optional().default(1).describe("Página para paginação"),
  created_at_from: z.number().optional().describe("Leads criados a partir desta data (Unix timestamp)"),
  created_at_to: z.number().optional().describe("Leads criados até esta data (Unix timestamp)"),
  status_id: z.number().optional().describe("ID da etapa específica do funil"),
});

// Schema para atualizar lead
export const updateLeadSchema = z.object({
  lead_id: z.number().describe("ID do lead a ser atualizado"),
  name: z.string().optional().describe("Novo nome do lead"),
  price: z.number().optional().describe("Novo valor do lead em reais"),
  status_id: z.number().optional().describe("ID da nova etapa do funil"),
  custom_fields_values: z.array(z.object({
    field_id: z.number(),
    values: z.array(z.object({
      value: z.union([z.string(), z.number(), z.boolean()]),
      enum_id: z.number().optional(),
    })),
  })).optional().describe("Campos customizados a atualizar"),
});

// Schema para mover lead entre etapas
export const moveLeadSchema = z.object({
  lead_id: z.number().describe("ID do lead a mover"),
  funil: z.enum(["SDR", "BDR", "CLOSERS"]).describe("Funil de destino"),
  status_id: z.number().describe("ID da etapa de destino"),
});

// Schema para adicionar nota
export const addNoteSchema = z.object({
  lead_id: z.number().describe("ID do lead"),
  text: z.string().describe("Conteúdo da nota (registro de interação, feedback, etc.)"),
});

// Schema para criar tarefa
export const addTaskSchema = z.object({
  lead_id: z.number().describe("ID do lead"),
  text: z.string().describe("Descrição da tarefa"),
  complete_till: z.number().describe("Prazo em Unix timestamp (segundos)"),
  task_type_id: z.number().optional().default(1).describe("Tipo: 1=Ligar, 2=Reunião, 3=Email"),
});

// Schema para listar etapas do funil
export const listFunnelStagesSchema = z.object({
  funil: z.enum(["SDR", "BDR", "CLOSERS"]).describe("Funil do Grupo Vorp"),
});

// Schema para criar lead
export const createLeadSchema = z.object({
  name: z.string().describe("Nome do lead/oportunidade"),
  funil: z.enum(["SDR", "BDR", "CLOSERS"]).describe("Funil onde o lead será criado"),
  status_id: z.number().optional().describe("Etapa inicial do funil"),
  price: z.number().optional().describe("Valor potencial em reais"),
  responsible_user_id: z.number().optional().describe("ID do vendedor responsável"),
  contact_first_name: z.string().optional().describe("Primeiro nome do contato"),
  contact_last_name: z.string().optional().describe("Sobrenome do contato"),
  contact_phone: z.string().optional().describe("Telefone do contato"),
  contact_email: z.string().optional().describe("Email do contato"),
  company_name: z.string().optional().describe("Nome da empresa"),
  company_phone: z.string().optional().describe("Telefone da empresa"),
});

// Schema para buscar lead por ID
export const getLeadByIdSchema = z.object({
  lead_id: z.number().describe("ID do lead"),
});

// Schema para buscar por telefone
export const searchByPhoneSchema = z.object({
  phone: z.string().describe("Número de telefone"),
});

// Schema para eventos do lead
export const getLeadEventsSchema = z.object({
  lead_id: z.number().describe("ID do lead"),
  limit: z.number().optional().default(20).describe("Quantidade de eventos"),
});

// Mapa de schemas por ferramenta
export const toolSchemas: Record<string, z.ZodSchema> = {
  vorp_listar_leads_funil: listLeadsFunnelSchema,
  vorp_atualizar_lead: updateLeadSchema,
  vorp_mover_lead: moveLeadSchema,
  vorp_adicionar_nota: addNoteSchema,
  vorp_criar_tarefa: addTaskSchema,
  vorp_listar_etapas_funil: listFunnelStagesSchema,
  vorp_criar_lead: createLeadSchema,
  vorp_buscar_lead_por_id: getLeadByIdSchema,
  vorp_buscar_por_telefone: searchByPhoneSchema,
  vorp_historico_lead: getLeadEventsSchema,
};

// Função de validação
export function validateToolParams<T>(toolName: string, params: unknown): { success: true; data: T } | { success: false; error: string } {
  const schema = toolSchemas[toolName];
  if (!schema) {
    return { success: false, error: `Schema não encontrado para: ${toolName}` };
  }
  
  const result = schema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data as T };
  }
  
  return { 
    success: false, 
    error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
  };
}

// ========== Schema de Request MCP ==========

export const mcpRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});

export function isMCPRequestArray(data: unknown): data is Array<{ jsonrpc: string; id: string | number; method: string; params?: Record<string, unknown> }> {
  return Array.isArray(data);
}

export const executeRequestSchema = z.object({
  tool: z.string(),
  params: z.record(z.unknown()).optional(),
});
