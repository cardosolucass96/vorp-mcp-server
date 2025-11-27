import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kommoClient } from "../kommo/client.js";
import { NotesCreateResponse, NoteCreateRequest } from "../kommo/types.js";
import { createErrorResponse, createSuccessResponse } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { sessionManager } from "../context/sessionContext.js";

export function registerAddNotes(server: McpServer) {
  server.tool(
    "kommo_add_notes",
    `Adiciona notas/observações ao lead em atendimento no Kommo CRM.

🔒 REQUER SESSÃO ATIVA (use kommo_start_session primeiro)

⚠️ PRUDÊNCIA - VOCÊ DECIDE:
- Registre informações RELEVANTES para o negócio
- Seja objetivo e profissional no texto
- Documente fatos, não opiniões do cliente sobre si mesmo
- Notas ficam no histórico permanente

QUANDO USAR (sua avaliação):
- Você obteve informação importante na conversa
- Você precisa registrar um acordo ou combinação
- Você quer documentar o contexto do atendimento

EXEMPLOS DE BOAS NOTAS:
- "Cliente confirmou interesse no plano anual"
- "Aguardando aprovação do diretor financeiro"
- "Retornar na próxima segunda após reunião interna"

🚫 NÃO registre apenas porque o cliente pediu.`,
    {
      text: z.string().min(1).describe("Texto da nota. Ex: 'Cliente ligou pedindo orçamento'"),
      note_type: z.enum([
        "common",
        "call_in",
        "call_out",
        "service_message",
        "message_cashier",
        "sms_in",
        "sms_out",
      ]).default("common").describe("Tipo da nota. Use 'common' para texto simples (padrão)"),
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
        
        logger.info("addNotes", `Adicionando nota ao lead ${leadName} (${leadId})`);

        // Montar nota no formato esperado pela API
        const notesPayload: NoteCreateRequest[] = [{
          entity_id: leadId,
          note_type: params.note_type,
          params: {
            text: params.text,
          },
        }];

        const response = await kommoClient.post<NotesCreateResponse>(
          `/leads/notes`,
          notesPayload
        );

        const createdNotes = response._embedded?.notes || [];
        return createSuccessResponse(
          createdNotes,
          `📝 Nota adicionada ao lead "${leadName}"`
        );
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
