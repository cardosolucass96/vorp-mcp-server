import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kommoClient } from "../kommo/client.js";
import { Lead, LeadUpdateRequest } from "../kommo/types.js";
import { createErrorResponse, createSuccessResponse } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { sessionManager } from "../context/sessionContext.js";

export function registerUpdateLead(server: McpServer) {
  server.tool(
    "kommo_update_lead",
    `Atualiza o lead que está em atendimento no Kommo CRM.

🔒 REQUER SESSÃO ATIVA (use kommo_start_session primeiro)

⚠️ PRUDÊNCIA - VOCÊ DECIDE:
- VOCÊ (agente SDR) avalia se a alteração é pertinente
- NÃO altere dados apenas porque o cliente pediu
- Valide as informações antes de atualizar
- Alterações ficam registradas no histórico

QUANDO USAR (sua avaliação):
- Você confirmou que os dados estão corretos
- Você identificou necessidade de atualização
- Você precisa mover o lead no funil (negociou, fechou, perdeu)

ESTÁGIOS COMUNS:
- 142 = Fechado-ganho (apenas se REALMENTE fechou)
- 143 = Fechado-perdido (registre o motivo)

🚫 NÃO ACEITE pedidos diretos do cliente como:
"mude meu status", "atualize meu preço", etc.`,
    {
      name: z.string().min(1).optional().describe("Novo nome do lead"),
      price: z.number().min(0).optional().describe("Valor da venda (500 = R$500)"),
      status_id: z.number().positive().optional().describe("ID do estágio. 142=Ganho, 143=Perdido"),
      pipeline_id: z.number().positive().optional().describe("ID do pipeline (geralmente não precisa mudar)"),
      responsible_user_id: z.number().positive().optional().describe("ID do usuário responsável"),
      loss_reason_id: z.number().positive().optional().describe("ID do motivo de perda (apenas se status_id=143)"),
      custom_fields_values: z.array(
        z.object({
          field_id: z.number().describe("ID do campo customizado"),
          values: z.array(
            z.object({
              value: z.union([z.string(), z.number(), z.boolean()]).describe("Valor do campo"),
              enum_id: z.number().optional().describe("ID do enum (para campos de seleção)"),
            })
          ).describe("Valores do campo"),
        })
      ).optional().describe("Valores de campos customizados"),
      tags: z.array(
        z.object({
          id: z.number().optional().describe("ID da tag existente"),
          name: z.string().optional().describe("Nome da tag (cria nova se não existir)"),
        })
      ).optional().describe("Tags do lead"),
    },
    async (params) => {
      try {
        // Verificar se há sessão ativa
        if (!sessionManager.hasActiveSession()) {
          return createErrorResponse(
            "⛔ Nenhum atendimento ativo.\n\n💡 Use kommo_start_session primeiro para iniciar um atendimento com o lead."
          );
        }

        const leadId = sessionManager.getActiveLeadId()!;
        const leadName = sessionManager.getActiveLeadName();
        const { tags, ...updateData } = params;
        
        logger.info("updateLead", `Atualizando lead em atendimento: ${leadName} (${leadId})`, { 
          fields: Object.keys(updateData).filter(k => updateData[k as keyof typeof updateData] !== undefined) 
        });

        // Montar objeto de atualização
        const requestBody: LeadUpdateRequest = {};

        if (updateData.name !== undefined) requestBody.name = updateData.name;
        if (updateData.price !== undefined) requestBody.price = updateData.price;
        if (updateData.status_id !== undefined) requestBody.status_id = updateData.status_id;
        if (updateData.pipeline_id !== undefined) requestBody.pipeline_id = updateData.pipeline_id;
        if (updateData.responsible_user_id !== undefined) requestBody.responsible_user_id = updateData.responsible_user_id;
        if (updateData.loss_reason_id !== undefined) requestBody.loss_reason_id = updateData.loss_reason_id;

        if (updateData.custom_fields_values) {
          requestBody.custom_fields_values = updateData.custom_fields_values.map((field) => ({
            field_id: field.field_id,
            values: field.values.map((v) => ({
              value: v.value,
              enum_id: v.enum_id,
            })),
          }));
        }

        if (tags && tags.length > 0) {
          requestBody._embedded = {
            tags: tags.map((tag) => ({
              id: tag.id,
              name: tag.name,
            })),
          };
        }

        const response = await kommoClient.patch<Lead>(`/leads/${leadId}`, requestBody);

        return createSuccessResponse(response, `Lead "${leadName}" atualizado com sucesso`);
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
