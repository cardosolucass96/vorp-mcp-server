import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kommoClient } from "../kommo/client.js";
import { LeadsListResponse } from "../kommo/types.js";
import { createErrorResponse, createSuccessResponse } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function registerListLeads(server: McpServer) {
  server.tool(
    "kommo_list_leads",
    `Lista leads do Kommo CRM com filtros opcionais.

📋 FERRAMENTA DE CONSULTA (não requer sessão)

QUANDO USAR:
- Localizar um lead antes de iniciar atendimento
- Verificar informações atuais de um lead
- Buscar leads por nome ou filtros

⚠️ PRUDÊNCIA:
- Esta ferramenta apenas CONSULTA, não modifica nada
- Use para encontrar o lead ANTES de kommo_start_session
- Não exponha dados sensíveis ao interlocutor

RETORNA: ID, nome, preço, status_id, pipeline_id.
DICA: Use 'query' para buscar por nome.`,
    {
      page: z.number().min(1).default(1).optional().describe("Número da página (padrão: 1)"),
      limit: z.number().min(1).max(50).default(10).optional().describe("Quantidade por página (padrão: 10, máximo recomendado: 50)"),
      query: z.string().optional().describe("Busca por nome do lead. Exemplo: 'João', 'Empresa XYZ'"),
      filter: z.object({
        id: z.array(z.number()).optional().describe("Filtrar por IDs específicos de leads"),
        pipeline_id: z.array(z.number()).optional().describe("Filtrar por IDs de pipelines"),
        status_id: z.array(z.number()).optional().describe("Filtrar por IDs de estágios"),
        responsible_user_id: z.array(z.number()).optional().describe("Filtrar por IDs de usuários responsáveis"),
        created_at: z.object({
          from: z.number().optional().describe("Unix timestamp início"),
          to: z.number().optional().describe("Unix timestamp fim"),
        }).optional().describe("Filtrar por data de criação"),
        updated_at: z.object({
          from: z.number().optional().describe("Unix timestamp início"),
          to: z.number().optional().describe("Unix timestamp fim"),
        }).optional().describe("Filtrar por data de atualização"),
        closed_at: z.object({
          from: z.number().optional().describe("Unix timestamp início"),
          to: z.number().optional().describe("Unix timestamp fim"),
        }).optional().describe("Filtrar por data de fechamento"),
      }).optional().describe("Filtros de busca"),
      with: z.array(
        z.enum(["contacts", "loss_reason", "is_price_modified_by_robot", "catalog_elements", "source_id", "source", "only_deleted"])
      ).optional().describe("Dados extras a incluir na resposta"),
      order: z.object({
        field: z.enum(["created_at", "updated_at", "id"]).describe("Campo para ordenação"),
        direction: z.enum(["asc", "desc"]).describe("Direção da ordenação"),
      }).optional().describe("Ordenação dos resultados"),
    },
    async (params) => {
      try {
        logger.info("listLeads", "Listando leads", { query: params.query, page: params.page, limit: params.limit });
        
        // Construir query params
        const queryParams: Record<string, unknown> = {};

        if (params.page) queryParams.page = params.page;
        if (params.limit) queryParams.limit = params.limit;
        if (params.query) queryParams.query = params.query;

        // Processar filtros
        if (params.filter) {
          if (params.filter.id) {
            queryParams["filter[id]"] = params.filter.id.join(",");
          }
          if (params.filter.pipeline_id) {
            queryParams["filter[pipeline_id]"] = params.filter.pipeline_id.join(",");
          }
          if (params.filter.status_id) {
            queryParams["filter[status_id]"] = params.filter.status_id.join(",");
          }
          if (params.filter.responsible_user_id) {
            queryParams["filter[responsible_user_id]"] = params.filter.responsible_user_id.join(",");
          }
          if (params.filter.created_at) {
            if (params.filter.created_at.from) {
              queryParams["filter[created_at][from]"] = params.filter.created_at.from;
            }
            if (params.filter.created_at.to) {
              queryParams["filter[created_at][to]"] = params.filter.created_at.to;
            }
          }
          if (params.filter.updated_at) {
            if (params.filter.updated_at.from) {
              queryParams["filter[updated_at][from]"] = params.filter.updated_at.from;
            }
            if (params.filter.updated_at.to) {
              queryParams["filter[updated_at][to]"] = params.filter.updated_at.to;
            }
          }
          if (params.filter.closed_at) {
            if (params.filter.closed_at.from) {
              queryParams["filter[closed_at][from]"] = params.filter.closed_at.from;
            }
            if (params.filter.closed_at.to) {
              queryParams["filter[closed_at][to]"] = params.filter.closed_at.to;
            }
          }
        }

        // Processar with
        if (params.with && params.with.length > 0) {
          queryParams.with = params.with.join(",");
        }

        // Processar order
        if (params.order) {
          queryParams[`order[${params.order.field}]`] = params.order.direction;
        }

        const response = await kommoClient.get<LeadsListResponse>("/leads", {
          params: queryParams,
        });

        const leads = response._embedded?.leads || [];
        return createSuccessResponse(
          {
            page: response._page,
            total: leads.length,
            leads: leads,
          },
          `Encontrados ${leads.length} leads`
        );
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
