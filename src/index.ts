import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Importar tools
import { registerListLeads } from "./tools/listLeads.js";
import { registerUpdateLead } from "./tools/updateLead.js";
import { registerAddNotes } from "./tools/addNotes.js";
import { registerAddTasks } from "./tools/addTasks.js";
import { registerListPipelines } from "./tools/listPipelines.js";
import { registerListPipelineStages } from "./tools/listPipelineStages.js";
import { registerStartSession, registerEndSession, registerGetSession } from "./tools/sessionTools.js";

// Criar instância do servidor MCP
const server = new McpServer({
  name: "kommo-mcp-server",
  version: "1.0.0",
});

// Registrar tools de sessão (SDR)
registerStartSession(server);
registerEndSession(server);
registerGetSession(server);

// Registrar tools de dados
registerListLeads(server);
registerListPipelines(server);
registerListPipelineStages(server);

// Registrar tools de modificação (requerem sessão ativa)
registerUpdateLead(server);
registerAddNotes(server);
registerAddTasks(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🚀 Kommo MCP Server rodando (modo SDR)!");
  console.error("");
  console.error("📌 FLUXO DE ATENDIMENTO:");
  console.error("   1. kommo_start_session  → Iniciar atendimento");
  console.error("   2. kommo_update_lead    → Modificar lead");
  console.error("   3. kommo_add_notes      → Adicionar notas");
  console.error("   4. kommo_add_tasks      → Criar tarefas");
  console.error("   5. kommo_end_session    → Encerrar atendimento");
  console.error("");
  console.error("📋 Tools de consulta (sem sessão):");
  console.error("   - kommo_list_leads");
  console.error("   - kommo_list_pipelines");
  console.error("   - kommo_list_pipeline_stages");
  console.error("   - kommo_get_session");
}

main().catch((error) => {
  console.error("❌ Erro ao iniciar o servidor:", error);
  process.exit(1);
});
