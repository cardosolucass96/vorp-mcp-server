import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { kommoClient } from "../kommo/client.js";
import { TasksCreateResponse, TaskCreateRequest } from "../kommo/types.js";
import { createErrorResponse, createSuccessResponse } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { sessionManager } from "../context/sessionContext.js";

export function registerAddTasks(server: McpServer) {
  server.tool(
    "kommo_add_tasks",
    `Cria tarefas/lembretes para o lead em atendimento no Kommo CRM.

🔒 REQUER SESSÃO ATIVA (use kommo_start_session primeiro)

⚠️ PRUDÊNCIA - VOCÊ DECIDE:
- Crie tarefas que FAÇAM SENTIDO para o processo de vendas
- Defina prazos realistas baseados no contexto
- Você é responsável pelo follow-up, não o cliente

QUANDO USAR (sua avaliação):
- Você combinou um retorno com o cliente
- Você identificou próximo passo no processo
- Você precisa lembrar de fazer follow-up

TIPOS DE TAREFA:
- 1 = Ligar (ligação telefônica)
- 2 = Reunião
- 3 = Escrever carta/email

PRAZO (complete_till): Unix timestamp.
Dica: Amanhã = Math.floor(Date.now()/1000) + 86400

🚫 NÃO crie tarefas só porque o cliente pediu "me ligue amanhã".
Avalie se faz sentido para o processo.`,
    {
      text: z.string().min(1).describe("Descrição da tarefa. Ex: 'Ligar para confirmar interesse'"),
      complete_till: z.number().positive().describe("Prazo Unix timestamp. Amanhã = agora + 86400"),
      task_type_id: z.number().min(1).max(3).default(1).describe("1=Ligar, 2=Reunião, 3=Email (padrão: 1)"),
      responsible_user_id: z.number().positive().optional().describe("ID do responsável (opcional)"),
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
        
        logger.info("addTasks", `Criando tarefa para lead ${leadName} (${leadId})`);

        // Montar tarefa no formato esperado pela API
        const tasksPayload: TaskCreateRequest[] = [{
          task_type_id: params.task_type_id,
          text: params.text,
          complete_till: params.complete_till,
          entity_id: leadId,
          entity_type: "leads",
          responsible_user_id: params.responsible_user_id,
          request_id: `task_${Date.now()}_0`,
        }];

        const response = await kommoClient.post<TasksCreateResponse>(
          "/tasks",
          tasksPayload
        );

        const createdTasks = response._embedded?.tasks || [];
        
        const taskTypeNames: Record<number, string> = {
          1: "📞 Ligar",
          2: "📅 Reunião",
          3: "✉️ Email",
        };
        const taskTypeName = taskTypeNames[params.task_type_id] || "📋 Tarefa";
        
        return createSuccessResponse(
          createdTasks,
          `${taskTypeName} criada para "${leadName}"`
        );
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );
}
