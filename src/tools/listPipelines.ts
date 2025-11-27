import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kommoClient } from "../kommo/client.js";
import { PipelinesListResponse, Pipeline } from "../kommo/types.js";
import { createErrorResponse, createSuccessResponse } from "../utils/errors.js";
import { pipelinesCache } from "../utils/cache.js";
import { logger } from "../utils/logger.js";

const CACHE_KEY = "pipelines_all";

export interface FormattedPipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  is_unsorted_on: boolean;
  is_archive: boolean;
  stages: {
    id: number;
    name: string;
    sort: number;
    color: string;
    type: string;
  }[];
}

/**
 * Função auxiliar para buscar pipelines (com cache)
 * Pode ser usada por outras ferramentas
 */
export async function getPipelinesWithCache(): Promise<FormattedPipeline[]> {
  return pipelinesCache.getOrSet(CACHE_KEY, async () => {
    logger.debug("listPipelines", "Cache miss - buscando pipelines da API");
    
    const response = await kommoClient.get<PipelinesListResponse>("/leads/pipelines");
    const pipelines = response._embedded?.pipelines || [];

    return pipelines.map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      sort: pipeline.sort,
      is_main: pipeline.is_main,
      is_unsorted_on: pipeline.is_unsorted_on,
      is_archive: pipeline.is_archive,
      stages: pipeline._embedded?.statuses?.map((stage) => ({
        id: stage.id,
        name: stage.name,
        sort: stage.sort,
        color: stage.color,
        type: stage.type === 0 ? "regular" : "incoming_leads",
      })) || [],
    }));
  }, 600); // Cache por 10 minutos
}

export function registerListPipelines(server: McpServer) {
  server.tool(
    "kommo_list_pipelines",
    `Lista todos os pipelines e estágios do Kommo CRM.

📋 FERRAMENTA DE CONSULTA (não requer sessão)

QUANDO USAR:
- Consultar status_id antes de mover um lead
- Entender a estrutura do funil de vendas
- Verificar em qual estágio um lead pode ser movido

⚠️ USO INTERNO:
- Informação para SEU uso, não do cliente
- Cliente não precisa saber os IDs dos estágios
- Use para tomar decisões sobre movimentação

RETORNA: Pipelines com estágios (id, nome, cor).
CACHE: 10 minutos.`,
    {},
    async () => {
      try {
        logger.info("listPipelines", "Listando pipelines");
        
        const formattedPipelines = await getPipelinesWithCache();

        return createSuccessResponse(
          formattedPipelines,
          `Encontrados ${formattedPipelines.length} pipelines`
        );
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
