import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kommoClient } from "../kommo/client.js";
import { StagesListResponse } from "../kommo/types.js";
import { createErrorResponse, createSuccessResponse } from "../utils/errors.js";
import { pipelinesCache } from "../utils/cache.js";
import { logger } from "../utils/logger.js";

export function registerListPipelineStages(server: McpServer) {
  server.tool(
    "kommo_list_pipeline_stages",
    `Lista os estágios de um pipeline específico do Kommo CRM.

📋 FERRAMENTA DE CONSULTA (não requer sessão)

QUANDO USAR:
- Consultar status_id de um pipeline específico
- Verificar as etapas disponíveis para movimentação

⚠️ USO INTERNO:
- Informação técnica para SEU uso
- Use kommo_list_pipelines primeiro para obter o pipeline_id

RETORNA: ID, nome, cor, ordenação do estágio.
CACHE: 10 minutos.`,
    {
      pipeline_id: z.number().positive().describe("ID do pipeline para listar os estágios (obrigatório)"),
    },
    async (params) => {
      try {
        const { pipeline_id } = params;
        const cacheKey = `pipeline_stages_${pipeline_id}`;

        logger.info("listPipelineStages", `Listando estágios do pipeline ${pipeline_id}`);

        const formattedStages = await pipelinesCache.getOrSet(
          cacheKey,
          async () => {
            logger.debug("listPipelineStages", "Cache miss - buscando da API");
            
            const response = await kommoClient.get<StagesListResponse>(
              `/leads/pipelines/${pipeline_id}/statuses`
            );

            const stages = response._embedded?.statuses || [];

            return stages.map((stage) => ({
              id: stage.id,
              name: stage.name,
              sort: stage.sort,
              color: stage.color,
              is_editable: stage.is_editable,
              type: stage.type === 0 ? "regular" : "incoming_leads",
              pipeline_id: stage.pipeline_id,
            }));
          },
          600 // Cache por 10 minutos
        );

        return createSuccessResponse(
          formattedStages,
          `Pipeline ${pipeline_id}: ${formattedStages.length} estágios encontrados`
        );
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
