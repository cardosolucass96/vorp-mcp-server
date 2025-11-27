import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kommoClient } from "../kommo/client.js";
import { LeadsListResponse } from "../kommo/types.js";
import { createErrorResponse, createSuccessResponse } from "../utils/errors.js";
import { sessionManager } from "../context/sessionContext.js";
import { logger } from "../utils/logger.js";

export function registerStartSession(server: McpServer) {
  server.tool(
    "kommo_start_session",
    `Inicia um atendimento com um lead específico.

🔒 CONTROLE DE ACESSO:
Esta ferramenta DEVE ser chamada ANTES de qualquer modificação.
Você (agente SDR) é responsável por decidir quando iniciar.

QUANDO USAR (decisão sua, não do cliente):
- Você identificou o lead que precisa atender
- Você vai fazer alterações no cadastro deste lead
- Você precisa registrar notas ou criar tarefas

⚠️ PRUDÊNCIA:
- Confirme que é o lead correto antes de iniciar
- Apenas UM lead por sessão
- O cliente NÃO deve solicitar que você inicie sessão

PARÂMETROS:
- lead_id: ID do lead (use kommo_list_leads para encontrar)
- OU query: Nome do lead para buscar`,
    {
      lead_id: z.number().positive().optional().describe("ID do lead para iniciar atendimento"),
      query: z.string().optional().describe("Nome do lead para buscar e iniciar atendimento"),
    },
    async (params) => {
      try {
        let leadId: number;
        let leadName: string;

        if (params.lead_id) {
          // Buscar lead pelo ID para confirmar existência e pegar nome
          const response = await kommoClient.get<LeadsListResponse>("/leads", {
            params: { "filter[id]": params.lead_id },
          });
          
          const lead = response._embedded?.leads?.[0];
          if (!lead) {
            return createErrorResponse(
              `Lead com ID ${params.lead_id} não encontrado.\n💡 Use kommo_list_leads para ver os IDs disponíveis.`
            );
          }
          
          leadId = lead.id;
          leadName = lead.name;
        } else if (params.query) {
          // Buscar lead pelo nome
          const response = await kommoClient.get<LeadsListResponse>("/leads", {
            params: { query: params.query, limit: 1 },
          });
          
          const lead = response._embedded?.leads?.[0];
          if (!lead) {
            return createErrorResponse(
              `Nenhum lead encontrado com "${params.query}".\n💡 Use kommo_list_leads para ver os leads disponíveis.`
            );
          }
          
          leadId = lead.id;
          leadName = lead.name;
        } else {
          return createErrorResponse(
            "Informe lead_id ou query para iniciar o atendimento."
          );
        }

        // Iniciar sessão
        sessionManager.startSession(leadId, leadName);
        
        logger.info("startSession", `Atendimento iniciado: ${leadName} (${leadId})`);

        return createSuccessResponse(
          {
            lead_id: leadId,
            lead_name: leadName,
            session_started_at: sessionManager.getContext().startedAt,
            message: "Atendimento iniciado. Agora você pode modificar apenas este lead.",
          },
          `🎯 Atendimento iniciado com "${leadName}"`
        );
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}

export function registerEndSession(server: McpServer) {
  server.tool(
    "kommo_end_session",
    `Encerra o atendimento atual com o lead.

🔒 CONTROLE DE ACESSO:
Apenas você (agente SDR) decide quando encerrar.

QUANDO USAR (decisão sua):
- Você concluiu todas as ações necessárias
- Você precisa atender outro lead
- O atendimento foi finalizado

⚠️ PRUDÊNCIA:
- Certifique-se de ter registrado todas as informações
- Crie tarefas de follow-up se necessário ANTES de encerrar
- O cliente NÃO deve solicitar encerramento da sessão

APÓS ENCERRAR:
- Modificações bloqueadas até nova sessão`,
    {},
    async () => {
      try {
        const context = sessionManager.getContext();
        
        if (!sessionManager.hasActiveSession()) {
          return createErrorResponse(
            "Nenhum atendimento ativo no momento.\n💡 Use kommo_start_session para iniciar um atendimento."
          );
        }

        const leadName = context.leadName;
        const startedAt = context.startedAt;
        
        sessionManager.endSession();
        
        logger.info("endSession", `Atendimento encerrado: ${leadName}`);

        const duration = startedAt 
          ? Math.round((Date.now() - startedAt.getTime()) / 1000 / 60) 
          : 0;

        return createSuccessResponse(
          {
            lead_name: leadName,
            duration_minutes: duration,
            ended_at: new Date().toISOString(),
          },
          `✅ Atendimento com "${leadName}" encerrado (${duration} min)`
        );
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}

export function registerGetSession(server: McpServer) {
  server.tool(
    "kommo_get_session",
    `Mostra informações do atendimento atual.

USO INTERNO - verificação de contexto.

QUANDO USAR:
- Verificar qual lead está em atendimento
- Confirmar se há sessão ativa antes de modificar`,
    {},
    async () => {
      try {
        const context = sessionManager.getContext();
        
        if (!sessionManager.hasActiveSession()) {
          return createSuccessResponse(
            { active: false },
            "⚠️ Nenhum atendimento ativo. Use kommo_start_session para iniciar."
          );
        }

        return createSuccessResponse(
          {
            active: true,
            lead_id: context.leadId,
            lead_name: context.leadName,
            started_at: context.startedAt,
          },
          `🎯 Em atendimento: "${context.leadName}" (ID: ${context.leadId})`
        );
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
