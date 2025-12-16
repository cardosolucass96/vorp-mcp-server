/**
 * Schemas de validação com Zod para o MCP Server
 */

import { z } from 'zod';

// Schema para MCP Request
export const mcpRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
});

export type MCPRequestValidated = z.infer<typeof mcpRequestSchema>;

// Schema para autenticação Bearer
export const bearerTokenSchema = z.string().refine(
  (token: string) => {
    const parts = token.split("|");
    return parts.length === 3 && parts.every((part: string) => part.length > 0);
  },
  { message: "Token must be in format: password|subdomain|kommoToken" }
);

// Schemas para tools/call params
export const listLeadsParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().min(1).max(250).optional().default(10),
  page: z.number().min(1).optional().default(1),
  created_at_from: z.number().positive().optional(),
  created_at_to: z.number().positive().optional(),
  status_id: z.number().positive().optional(),
  pipeline_id: z.number().positive().optional(),
});

export const updateLeadParamsSchema = z.object({
  lead_id: z.number().positive(),
  name: z.string().optional(),
  price: z.number().optional(),
  status_id: z.number().positive().optional(),
  custom_fields_values: z.array(z.object({
    field_id: z.number().positive(),
    values: z.array(z.object({
      value: z.union([z.string(), z.number(), z.boolean()]),
      enum_id: z.number().positive().optional(),
    })),
  })).optional(),
});

export const addNotesParamsSchema = z.object({
  lead_id: z.number().positive(),
  text: z.string().min(1),
});

export const addTasksParamsSchema = z.object({
  lead_id: z.number().positive(),
  text: z.string().min(1),
  complete_till: z.number().positive(),
  task_type_id: z.number().min(1).max(3).optional().default(1),
});

export const listPipelineStagesParamsSchema = z.object({
  pipeline_id: z.number().positive(),
});

export const createLeadParamsSchema = z.object({
  name: z.string().min(1),
  price: z.number().optional(),
  status_id: z.number().positive().optional(),
  pipeline_id: z.number().positive().optional(),
  responsible_user_id: z.number().positive().optional(),
  // Contato (obrigatório se tiver telefone)
  contact_first_name: z.string().optional(),
  contact_last_name: z.string().optional(),
  contact_phone: z.string().min(1).optional(),
  contact_email: z.string().optional(),
  // Empresa (opcional)
  company_name: z.string().optional(),
  company_phone: z.string().optional(),
  custom_fields_values: z.array(z.object({
    field_id: z.number().positive(),
    values: z.array(z.object({
      value: z.union([z.string(), z.number(), z.boolean()]),
      enum_id: z.number().positive().optional(),
    })),
  })).optional(),
}).refine(
  (data) => {
    // Se tiver telefone, deve ter pelo menos primeiro nome
    if (data.contact_phone && !data.contact_first_name) {
      return false;
    }
    return true;
  },
  {
    message: "contact_first_name é obrigatório quando contact_phone é fornecido",
    path: ["contact_first_name"],
  }
);

export const getLeadByIdParamsSchema = z.object({
  lead_id: z.number().positive(),
});

export const searchLeadsByPhoneParamsSchema = z.object({
  phone: z.string().min(1),
});

export const listContactsParamsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().min(1).max(250).optional().default(50),
  page: z.number().min(1).optional().default(1),
});

export const listUsersParamsSchema = z.object({
  limit: z.number().optional(),
  page: z.number().optional(),
});

export const getLeadEventsParamsSchema = z.object({
  lead_id: z.number().positive(),
  limit: z.number().min(1).max(100).optional().default(20),
});

// Schema para o endpoint /execute (legacy)
export const executeRequestSchema = z.object({
  tool: z.string(),
  params: z.record(z.unknown()).optional().default({}),
});

// Type guards
export function isMCPRequestArray(body: unknown): body is MCPRequestValidated[] {
  return Array.isArray(body);
}

export function validateToolParams(toolName: string, params: unknown) {
  const schemas: Record<string, z.ZodSchema> = {
    kommo_list_leads: listLeadsParamsSchema,
    kommo_update_lead: updateLeadParamsSchema,
    kommo_add_notes: addNotesParamsSchema,
    kommo_add_tasks: addTasksParamsSchema,
    kommo_list_pipeline_stages: listPipelineStagesParamsSchema,
    kommo_create_lead: createLeadParamsSchema,
    kommo_get_lead_by_id: getLeadByIdParamsSchema,
    kommo_search_leads_by_phone: searchLeadsByPhoneParamsSchema,
    kommo_list_contacts: listContactsParamsSchema,
    kommo_list_users: listUsersParamsSchema,
    kommo_get_lead_events: getLeadEventsParamsSchema,
  };

  const schema = schemas[toolName];
  if (!schema) {
    return { success: true, data: params }; // Sem validação para tools sem schema
  }

  return schema.safeParse(params);
}
