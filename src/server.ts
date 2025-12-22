/**
 * Vorp MCP Server - Servidor MCP especializado para agente comercial do Grupo Vorp
 * 
 * 🎯 Grupo Vorp: Quatro empresas, um propósito - construir negócios fortes e escaláveis
 * 
 * FUNIS DISPONÍVEIS:
 * - SDR: Leads da internet (inbound)
 * - BDR: Prospecção ativa (outbound)
 * - CLOSERS: Fechamento a partir de reunião
 * 
 * FONTES DE DADOS:
 * - Kommo CRM: Etapas iniciais (antes de agendamento)
 * - Planilha Google Sheets: Etapas pós-agendamento (reuniões, propostas, vendas)
 * 
 * Multi-tenant: Token Bearer = senha|subdomain|kommoToken
 */

import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { createKommoClient, KommoClientInterface } from "./kommo/client.js";
import { createSheetsClient, SheetsClientInterface } from "./sheets/client.js";
import { PlanilhaEvento } from "./sheets/types.js";
import {
  LeadsListResponse,
  Lead,
  LeadUpdateRequest,
  NotesCreateResponse,
  NoteCreateRequest,
  TasksCreateResponse,
  TaskCreateRequest,
  PipelinesListResponse,
  StagesListResponse,
  Contact,
  ContactsListResponse,
  User,
  UsersListResponse,
  EventsListResponse,
  LeadCreateResponse,
} from "./kommo/types.js";
import {
  MCP_PROTOCOL_VERSION,
  SERVER_INFO,
  CACHE_TTL,
  JSON_RPC_ERRORS,
  API_LIMITS,
  SERVER_CONFIG,
  ERROR_MESSAGES,
  VORP_FUNNELS,
  VorpFunnelCode,
  SHEETS_CONFIG,
  EVENT_STATUS,
} from "./constants.js";
import {
  mcpRequestSchema,
  validateToolParams,
  isMCPRequestArray,
} from "./schemas.js";

// ========== Cliente da Planilha de Eventos ==========
// Inicializado globalmente pois é read-only e não depende de autenticação por tenant
const sheetsClient = createSheetsClient(
  SHEETS_CONFIG.API_KEY,
  SHEETS_CONFIG.SPREADSHEET_ID,
  SHEETS_CONFIG.SHEET_NAME
);

// ========== MCP Protocol Types ==========
interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ========== Cache em memória ==========
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttlSeconds: number = CACHE_TTL.PIPELINES) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// ========== Mapeamento de Funis Vorp para Pipelines ==========
interface FunnelMapping {
  pipeline_id: number;
  pipeline_name: string;
  stages: Array<{ id: number; name: string; color: string }>;
}

async function getFunnelMappings(client: KommoClientInterface): Promise<Map<VorpFunnelCode, FunnelMapping>> {
  const cacheKey = "vorp_funnel_mappings";
  const cached = getCached<Map<VorpFunnelCode, FunnelMapping>>(cacheKey);
  if (cached) return cached;

  const response = await client.get<PipelinesListResponse>("/leads/pipelines");
  const pipelines = response._embedded?.pipelines || [];
  
  const mappings = new Map<VorpFunnelCode, FunnelMapping>();
  
  // Primeiro passo: Buscar matches EXATOS (nome = "SDR", "BDR", "Closers")
  for (const pipeline of pipelines) {
    const name = pipeline.name.toLowerCase().trim();
    const stages = pipeline._embedded?.statuses?.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
    })) || [];
    
    const mapping: FunnelMapping = {
      pipeline_id: pipeline.id,
      pipeline_name: pipeline.name,
      stages,
    };
    
    // Match EXATO primeiro (prioridade máxima)
    if (name === 'sdr') {
      mappings.set('SDR', mapping);
    } else if (name === 'bdr') {
      mappings.set('BDR', mapping);
    } else if (name === 'closers' || name === 'closer') {
      mappings.set('CLOSERS', mapping);
    }
  }
  
  // Segundo passo: Se não encontrou exato, buscar parcial (sem sobrescrever)
  for (const pipeline of pipelines) {
    const name = pipeline.name.toLowerCase().trim();
    const stages = pipeline._embedded?.statuses?.map(s => ({
      id: s.id,
      name: s.name,
      color: s.color,
    })) || [];
    
    const mapping: FunnelMapping = {
      pipeline_id: pipeline.id,
      pipeline_name: pipeline.name,
      stages,
    };
    
    // Detectar funil SDR (se não tem match exato ainda)
    if (!mappings.has('SDR')) {
      if (name.includes('sdr') || (name.includes('inbound') && !name.includes('matri'))) {
        mappings.set('SDR', mapping);
      }
    }
    // Detectar funil BDR
    if (!mappings.has('BDR')) {
      if (name.includes('bdr') || (name.includes('outbound') && !name.includes('matri'))) {
        mappings.set('BDR', mapping);
      }
    }
    // Detectar funil Closers
    if (!mappings.has('CLOSERS')) {
      if (name.includes('closer') || name.includes('fechamento')) {
        mappings.set('CLOSERS', mapping);
      }
    }
  }
  
  // Se não encontrou todos, usar os primeiros pipelines disponíveis
  const funnelCodes: VorpFunnelCode[] = ['SDR', 'BDR', 'CLOSERS'];
  let pipelineIndex = 0;
  
  for (const code of funnelCodes) {
    if (!mappings.has(code) && pipelines[pipelineIndex]) {
      const pipeline = pipelines[pipelineIndex];
      mappings.set(code, {
        pipeline_id: pipeline.id,
        pipeline_name: pipeline.name,
        stages: pipeline._embedded?.statuses?.map(s => ({
          id: s.id,
          name: s.name,
          color: s.color,
        })) || [],
      });
      pipelineIndex++;
    }
  }
  
  setCache(cacheKey, mappings, CACHE_TTL.PIPELINES);
  return mappings;
}

// ========== Interface para campo customizado formatado ==========
interface FormattedCustomField {
  field_id: number;
  nome: string;
  tipo: string;
  obrigatorio: boolean;
  opcoes: Array<{ enum_id: number; valor: string }> | null;
}

// ========== Buscar campos customizados com cache ==========
async function getCustomFieldsCached(client: KommoClientInterface): Promise<FormattedCustomField[]> {
  const cacheKey = "vorp_custom_fields_full";
  const cached = getCached<FormattedCustomField[]>(cacheKey);
  if (cached) return cached;

  const response = await client.get<any>("/leads/custom_fields");
  const fields = response._embedded?.custom_fields || [];

  const formatted: FormattedCustomField[] = fields.map((f: any) => ({
    field_id: f.id,
    nome: f.name,
    tipo: f.type,
    obrigatorio: f.is_required || false,
    opcoes: f.enums?.map((e: any) => ({
      enum_id: e.id,
      valor: e.value,
    })) || null,
  }));

  setCache(cacheKey, formatted, CACHE_TTL.CUSTOM_FIELDS);
  return formatted;
}

// ========== Gerar descrição de campos customizados para a ferramenta de atualização ==========
async function getCustomFieldsDescription(_client: KommoClientInterface): Promise<string> {
  // Descrição simplificada - força o agente a usar vorp_listar_campos_customizados para obter enum_ids
  
  let info = `

📋 CAMPOS CUSTOMIZADOS PRINCIPAIS:

⚠️ IMPORTANTE: Para campos do tipo SELECT/MULTISELECT, você DEVE usar vorp_listar_campos_customizados 
ANTES de atualizar para obter os enum_ids corretos! Não assuma valores.

═══════════════════════════════════════════════════════════════
🗓️ REUNIÃO E AGENDAMENTO
═══════════════════════════════════════════════════════════════
• Data e hora da reunião (1012642, date_time) → Unix timestamp
• Link da reunião (1012648, url) → URL do Meet/Zoom
• Reuniao Acontecida (1014589, select) → Use vorp_listar_campos_customizados
• Temperatura do Lead (1019551, select) → Use vorp_listar_campos_customizados

═══════════════════════════════════════════════════════════════
👥 RESPONSÁVEIS E ORIGEM
═══════════════════════════════════════════════════════════════
• Canal/Origem (1013670, select) → ORIGEM DO LEAD (tráfego, indicação, outbound, etc)
  ⚠️ Use vorp_listar_campos_customizados para ver opções!
• Pré-Venda (1015049, select) → SDR responsável
• Closer (1013954, select) → Closer que vai fechar

═══════════════════════════════════════════════════════════════
📋 QUALIFICAÇÃO
═══════════════════════════════════════════════════════════════
• Segmento (1014388, select) → Use vorp_listar_campos_customizados
• Faturamento Mensal (1016311, select) → Use vorp_listar_campos_customizados
• Dor (1024463, text) → Texto livre

═══════════════════════════════════════════════════════════════
📦 PRODUTO
═══════════════════════════════════════════════════════════════
• Produto (1013956, multiselect) → Use vorp_listar_campos_customizados

═══════════════════════════════════════════════════════════════
💡 COMO USAR:
═══════════════════════════════════════════════════════════════
Campos texto:    { field_id: ID, values: [{ value: "texto" }] }
Campos data:     { field_id: ID, values: [{ value: UNIX_TIMESTAMP }] }
Campos select:   { field_id: ID, values: [{ enum_id: ENUM_ID }] }  ← Obter enum_id via vorp_listar_campos_customizados!
Campos monetary: { field_id: ID, values: [{ value: "1000" }] }`;
  
  return info;
}

// ========== Gerar descrição dos funis para as tools ==========
async function getFunnelsDescription(client: KommoClientInterface): Promise<string> {
  try {
    const mappings = await getFunnelMappings(client);
    
    if (mappings.size === 0) {
      return "";
    }
    
    let info = "\n\n📊 FUNIS DO GRUPO VORP CONFIGURADOS:\n";
    
    for (const [code, mapping] of mappings) {
      const funnelInfo = VORP_FUNNELS[code];
      info += `\n🔹 ${funnelInfo.name} (pipeline_id: ${mapping.pipeline_id})\n`;
      info += `   📋 Objetivo: ${funnelInfo.objective}\n`;
      info += `   📈 Etapas:\n`;
      mapping.stages.forEach((stage) => {
        info += `      • ${stage.name} (status_id: ${stage.id})\n`;
      });
    }
    
    return info;
  } catch (error) {
    console.error("Error fetching funnels:", error);
    return "";
  }
}

// ========== Tool Definitions - Contextualizadas para Agente Comercial Vorp ==========
async function generateToolDefinitions(client: KommoClientInterface): Promise<MCPToolDefinition[]> {
  const funnelsInfo = await getFunnelsDescription(client);
  const customFieldsInfo = await getCustomFieldsDescription(client);
  
  return [
    // ========== FERRAMENTA PRINCIPAL: LISTAR LEADS DO FUNIL ==========
    {
      name: "vorp_listar_leads_funil",
      description: `🎯 BUSCA LEADS NOS FUNIS DO GRUPO VORP

Esta ferramenta é essencial para o agente comercial Vorp consultar oportunidades nos três funis de vendas: SDR (leads da internet), BDR (prospecção ativa) e CLOSERS (fechamento pós-reunião).

📋 COMO USAR:
1. Escolha o funil: SDR para leads inbound, BDR para outbound, CLOSERS para negociações
2. Aplique filtros por nome, telefone, período ou etapa
3. Analise os resultados para tomada de decisão comercial

💡 RETORNA: Lista de leads com contato principal (nome, telefone), valor, etapa atual e datas. Ideal para:
- Verificar volume de leads em cada funil
- Identificar leads parados em determinada etapa
- Priorizar follow-ups e abordagens
- Gerar relatórios de performance${funnelsInfo}`,
      inputSchema: {
        type: "object",
        properties: {
          funil: { 
            type: "string", 
            enum: ["SDR", "BDR", "CLOSERS"],
            description: "Funil de vendas Vorp: SDR (leads da internet/inbound), BDR (prospecção ativa/outbound) ou CLOSERS (negociações pós-reunião)" 
          },
          query: { 
            type: "string", 
            description: "Buscar por nome do lead, empresa ou telefone do contato" 
          },
          limit: { 
            type: "number", 
            description: "Quantidade de leads a retornar (padrão: 10, máximo: 250)" 
          },
          page: { 
            type: "number", 
            description: "Página para paginação de resultados" 
          },
          created_at_from: { 
            type: "number", 
            description: "Filtrar leads criados A PARTIR desta data (Unix timestamp em segundos)" 
          },
          created_at_to: { 
            type: "number", 
            description: "Filtrar leads criados ATÉ esta data (Unix timestamp em segundos)" 
          },
          status_id: { 
            type: "number", 
            description: "Filtrar por etapa específica do funil (use os status_id listados acima)" 
          },
        },
        required: ["funil"],
      },
    },

    // ========== FERRAMENTA: LISTAR ETAPAS DO FUNIL ==========
    {
      name: "vorp_listar_etapas_funil",
      description: `📊 CONSULTA ETAPAS DOS FUNIS VORP

Retorna todas as etapas de um funil específico do Grupo Vorp. Use para:
- Descobrir os status_id válidos antes de mover um lead
- Entender a jornada do cliente em cada funil
- Verificar gargalos entre etapas

🔹 SDR: Etapas de qualificação de leads inbound (primeiro contato, qualificação, agendamento)
🔹 BDR: Etapas de prospecção ativa (research, abordagem, conexão, agendamento)
🔹 CLOSERS: Etapas de fechamento (reunião realizada, proposta, negociação, fechamento)${funnelsInfo}`,
      inputSchema: {
        type: "object",
        properties: {
          funil: { 
            type: "string", 
            enum: ["SDR", "BDR", "CLOSERS"],
            description: "Funil de vendas: SDR, BDR ou CLOSERS" 
          },
        },
        required: ["funil"],
      },
    },

    // ========== FERRAMENTA: MOVER LEAD ENTRE ETAPAS ==========
    {
      name: "vorp_mover_lead",
      description: `🔄 MOVE LEAD PARA OUTRA ETAPA DO FUNIL

Atualiza a etapa de um lead dentro do processo comercial Vorp. Essencial para:
- Avançar leads qualificados pelo SDR/BDR para CLOSERS
- Registrar progresso na jornada de vendas
- Manter o funil atualizado para gestão de pipeline

⚠️ IMPORTANTE: Se a ação afetar MÚLTIPLOS leads, peça confirmação do usuário antes!

📋 WORKFLOW:
1. Use vorp_listar_leads_funil para encontrar o lead_id
2. Use vorp_listar_etapas_funil para ver status_id disponíveis
3. Execute a movimentação

💡 Quando mover para CLOSERS: Lead passou por qualificação e tem reunião agendada/realizada${funnelsInfo}`,
      inputSchema: {
        type: "object",
        properties: {
          lead_id: { 
            type: "number", 
            description: "ID do lead a ser movido (obtenha com vorp_listar_leads_funil)" 
          },
          funil: { 
            type: "string", 
            enum: ["SDR", "BDR", "CLOSERS"],
            description: "Funil de destino" 
          },
          status_id: { 
            type: "number", 
            description: "ID da etapa de destino no funil (obtenha com vorp_listar_etapas_funil)" 
          },
        },
        required: ["lead_id", "funil", "status_id"],
      },
    },

    // ========== FERRAMENTA: ATUALIZAR LEAD ==========
    {
      name: "vorp_atualizar_lead",
      description: `✏️ ATUALIZA DADOS DE UM LEAD VORP

Atualiza campos nativos e customizados de um lead.

═══════════════════════════════════════════════════════════════
📌 CAMPOS NATIVOS (usar diretamente):
═══════════════════════════════════════════════════════════════
• name → Nome do lead
• price → Valor em reais (ex: 15000)
• status_id → Etapa do funil (use vorp_listar_etapas_funil)
• responsible_user_id → Responsável (use vorp_listar_vendedores)

═══════════════════════════════════════════════════════════════
📋 CAMPOS CUSTOMIZADOS (usar custom_fields_values):
═══════════════════════════════════════════════════════════════
⚠️ Use vorp_listar_campos_customizados ANTES para obter field_id e enum_id!

Formato:
- Texto: { field_id: ID, values: [{ value: "texto" }] }
- Select: { field_id: ID, values: [{ enum_id: ID_OPCAO }] }
- Data: { field_id: ID, values: [{ value: UNIX_TIMESTAMP }] }
${customFieldsInfo}`,
      inputSchema: {
        type: "object",
        properties: {
          lead_id: { 
            type: "number", 
            description: "ID do lead (obtenha com vorp_listar_leads_funil)" 
          },
          name: { 
            type: "string", 
            description: "Novo nome do lead/oportunidade" 
          },
          price: { 
            type: "number", 
            description: "Novo valor do lead em reais (ex: 15000 para R$ 15.000)" 
          },
          status_id: { 
            type: "number", 
            description: "ID da nova etapa (use vorp_mover_lead para mudanças de funil)" 
          },
          responsible_user_id: { 
            type: "number", 
            description: "ID do usuário responsável pelo lead (obtenha com vorp_listar_vendedores)" 
          },
          custom_fields_values: { 
            type: "array", 
            description: "Campos customizados. Use vorp_listar_campos_customizados para obter field_id e enum_id corretos!",
            items: {
              type: "object",
              properties: {
                field_id: { type: "number", description: "ID do campo customizado" },
                values: { 
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      value: { description: "Valor para campos texto, data (timestamp), monetary" },
                      enum_id: { type: "number", description: "ID da opção para campos select/multiselect" },
                    },
                  },
                },
              },
              required: ["field_id", "values"],
            },
          },
        },
        required: ["lead_id"],
      },
    },

    // ========== FERRAMENTA: ADICIONAR NOTA ==========
    {
      name: "vorp_adicionar_nota",
      description: `📝 REGISTRA NOTA/OBSERVAÇÃO EM UM LEAD

Documenta interações e informações importantes no histórico do lead. Fundamental para:
- Registrar resultado de ligações (SDR/BDR)
- Documentar pontos discutidos em reuniões (CLOSERS)
- Anotar objeções, necessidades e contexto do cliente
- Manter equipe informada sobre status da negociação

⚠️ Se for adicionar notas em MÚLTIPLOS leads, peça confirmação antes!

💡 Metodologia Vorp: Documentação gera previsibilidade. "Se prometeu, cumpra" - registre os compromissos!`,
      inputSchema: {
        type: "object",
        properties: {
          lead_id: { 
            type: "number", 
            description: "ID do lead (obtenha com vorp_listar_leads_funil)" 
          },
          text: { 
            type: "string", 
            description: "Conteúdo da nota. Ex: 'Ligação realizada - Cliente interessado, agendou demo para sexta 10h'" 
          },
        },
        required: ["lead_id", "text"],
      },
    },

    // ========== FERRAMENTA: CRIAR TAREFA ==========
    {
      name: "vorp_criar_tarefa",
      description: `📅 CRIA TAREFA/LEMBRETE PARA UM LEAD

Agenda próximas ações comerciais para garantir follow-up. Essencial para:
- Agendar ligações de qualificação (SDR)
- Programar abordagens de prospecção (BDR)
- Lembrar de enviar proposta ou fazer follow-up (CLOSERS)
- Garantir que nenhuma oportunidade seja esquecida

⚠️ Se for criar tarefas em MÚLTIPLOS leads, peça confirmação antes!

📋 TIPOS DE TAREFA:
1 = Ligar (follow-up telefônico)
2 = Reunião (encontro agendado)
3 = Email (enviar proposta, informações)

💡 Dica: complete_till em segundos. Amanhã = Math.floor(Date.now()/1000) + 86400`,
      inputSchema: {
        type: "object",
        properties: {
          lead_id: { 
            type: "number", 
            description: "ID do lead" 
          },
          text: { 
            type: "string", 
            description: "Descrição da tarefa. Ex: 'Ligar para confirmar reunião de amanhã'" 
          },
          complete_till: { 
            type: "number", 
            description: "Prazo em Unix timestamp (segundos). Amanhã = agora + 86400" 
          },
          task_type_id: { 
            type: "number", 
            description: "Tipo: 1=Ligar, 2=Reunião, 3=Email (padrão: 1)" 
          },
        },
        required: ["lead_id", "text", "complete_till"],
      },
    },

    // ========== FERRAMENTA: CRIAR LEAD ==========
    {
      name: "vorp_criar_lead",
      description: `Cria novo lead com contato vinculado no Kommo.

IMPORTANTE: Lead e Contato sao entidades separadas. Se passar contact_first_name + contact_phone, um contato eh criado e vinculado ao lead automaticamente.

Campos obrigatorios: name (nome do lead), funil (SDR/BDR/CLOSERS)
Campos recomendados: contact_first_name, contact_phone ou contact_email

Exemplo: Para "Joao Silva, tel 11999999999, SDR" use name="Joao Silva", funil="SDR", contact_first_name="Joao", contact_last_name="Silva", contact_phone="+5511999999999"${funnelsInfo}`,
      inputSchema: {
        type: "object",
        properties: {
          name: { 
            type: "string", 
            description: "Nome do lead (geralmente nome da pessoa)" 
          },
          funil: { 
            type: "string", 
            enum: ["SDR", "BDR", "CLOSERS"],
            description: "Funil: SDR, BDR ou CLOSERS" 
          },
          contact_first_name: { 
            type: "string", 
            description: "Nome da pessoa (cria contato vinculado)" 
          },
          contact_last_name: { 
            type: "string", 
            description: "Sobrenome da pessoa" 
          },
          contact_phone: { 
            type: "string", 
            description: "Telefone. Formato: +5511999999999" 
          },
          contact_email: { 
            type: "string", 
            description: "Email do contato" 
          },
          company_name: { 
            type: "string", 
            description: "Nome da empresa (opcional)" 
          },
          price: { 
            type: "number", 
            description: "Valor potencial em reais" 
          },
          responsible_user_id: { 
            type: "number", 
            description: "ID do vendedor responsavel" 
          },
          status_id: { 
            type: "number", 
            description: "Etapa inicial no funil (opcional - usa primeira etapa se não informado)" 
          },
        },
        required: ["name", "funil"],
      },
    },

    // ========== FERRAMENTA: BUSCAR LEAD POR ID ==========
    {
      name: "vorp_buscar_lead_por_id",
      description: `🔍 BUSCA LEAD ESPECÍFICO POR ID

Retorna todos os detalhes de um lead quando você já conhece o ID. Mais eficiente que listar quando precisa de informações completas de um lead específico.

💡 Retorna: dados completos, contatos, empresa, campos customizados, histórico.`,
      inputSchema: {
        type: "object",
        properties: {
          lead_id: { 
            type: "number", 
            description: "ID do lead" 
          },
        },
        required: ["lead_id"],
      },
    },

    // ========== FERRAMENTA: BUSCAR POR TELEFONE ==========
    {
      name: "vorp_buscar_por_telefone",
      description: `📱 BUSCA LEADS PELO TELEFONE DO CONTATO

Localiza rapidamente leads de um cliente que está ligando ou entrando em contato. Fundamental para:
- Atendimento de retorno de ligação
- Identificar histórico antes de uma call
- Verificar se prospect já existe no CRM antes de criar novo lead

💡 Formatos aceitos: +5511999999999, 11999999999, 999999999`,
      inputSchema: {
        type: "object",
        properties: {
          phone: { 
            type: "string", 
            description: "Número de telefone (completo ou parcial)" 
          },
        },
        required: ["phone"],
      },
    },

    // ========== FERRAMENTA: BUSCAR LEAD GLOBAL ==========
    {
      name: "vorp_buscar_lead",
      description: `🔎 BUSCA LEADS EM TODOS OS FUNIS (SDR, BDR, CLOSERS)

⚡ USE ESTA FERRAMENTA PRIMEIRO quando precisar encontrar um lead por nome!

Diferente de vorp_listar_leads_funil, esta ferramenta:
- Busca em TODOS os funis simultaneamente (SDR + BDR + CLOSERS)
- Não requer especificar o funil
- Ordena por atualização mais recente

📋 QUANDO USAR:
- "Busca o lead do João Silva" → use vorp_buscar_lead
- "Preciso do lead da empresa XYZ" → use vorp_buscar_lead  
- "Encontra o Pedro Castro pedim" → use vorp_buscar_lead

🔥 DICA IMPORTANTE: 
Se a busca por nome completo não encontrar, tente buscar por uma palavra mais específica ou única.
Ex: Se não encontrar "Pedro Castro", busque por "pedim" (sobrenome único).

💡 Após encontrar, use vorp_buscar_lead_por_id para detalhes completos com campos customizados.`,
      inputSchema: {
        type: "object",
        properties: {
          query: { 
            type: "string", 
            description: "Nome do lead, empresa ou contato. Use a palavra mais específica/única para melhores resultados." 
          },
          limit: { 
            type: "number", 
            description: "Quantidade de resultados (padrão: 10, máximo: 50)" 
          },
        },
        required: ["query"],
      },
    },

    // ========== FERRAMENTA: HISTÓRICO DO LEAD ==========
    {
      name: "vorp_historico_lead",
      description: `📜 CONSULTA HISTÓRICO DE EVENTOS DO LEAD

Visualiza a timeline completa de um lead: mensagens, ligações, mudanças de etapa, tarefas concluídas. Use para:
- Entender o contexto antes de uma ligação
- Revisar interações anteriores
- Verificar última atividade do lead
- Identificar leads abandonados

💡 Essencial para abordagem consultiva: entenda a jornada antes de falar com o cliente.`,
      inputSchema: {
        type: "object",
        properties: {
          lead_id: { 
            type: "number", 
            description: "ID do lead" 
          },
          limit: { 
            type: "number", 
            description: "Quantidade de eventos a retornar (padrão: 20, máximo: 100)" 
          },
        },
        required: ["lead_id"],
      },
    },

    // ========== FERRAMENTA: LISTAR VENDEDORES ==========
    {
      name: "vorp_listar_vendedores",
      description: `👥 LISTA VENDEDORES/USUÁRIOS DO CRM

Retorna todos os usuários do CRM com seus IDs. Use para:
- Descobrir responsible_user_id ao criar/atualizar leads
- Atribuir leads para vendedores específicos
- Analisar distribuição de leads por vendedor
- Reatribuir leads entre membros da equipe`,
      inputSchema: {
        type: "object",
        properties: {},
      },
    },

    // ========== FERRAMENTA: CAMPOS CUSTOMIZADOS ==========
    {
      name: "vorp_listar_campos_customizados",
      description: `Lista todos os campos personalizados do CRM com seus IDs e opcoes.

OBRIGATORIO: Consulte ANTES de atualizar qualquer campo customizado!

Retorna para cada campo:
- field_id: ID para usar no custom_fields_values
- nome: Nome do campo
- tipo: text, select, multiselect, date, date_time, monetary, numeric, etc
- opcoes: Para campos select/multiselect, lista de {enum_id, valor}

Exemplo de retorno:
{ field_id: 1016311, nome: "Faturamento Mensal", tipo: "select", opcoes: [{enum_id: 1283559, valor: "Entre 100 e 300 mil"}] }

Para usar na atualizacao: custom_fields_values: [{ field_id: 1016311, values: [{ enum_id: 1283559 }] }]`,
      inputSchema: {
        type: "object",
        properties: {},
      },
    },

    // ========== FERRAMENTA: LISTAR CONTATOS ==========
    {
      name: "vorp_listar_contatos",
      description: `👤 LISTA CONTATOS DO CRM

Busca contatos (pessoas) independente dos leads. Um contato pode estar vinculado a múltiplos leads/oportunidades. Use para:
- Verificar se uma pessoa já existe no CRM
- Buscar informações de contato
- Consultar leads vinculados a uma pessoa`,
      inputSchema: {
        type: "object",
        properties: {
          query: { 
            type: "string", 
            description: "Buscar por nome, telefone ou email" 
          },
          limit: { 
            type: "number", 
            description: "Quantidade de resultados (padrão: 50)" 
          },
          page: { 
            type: "number", 
            description: "Página para paginação" 
          },
        },
      },
    },

    // ========== FERRAMENTA: ATUALIZAR CONTATO ==========
    {
      name: "vorp_atualizar_contato",
      description: `✏️ ATUALIZA DADOS DE UM CONTATO

Atualiza informações de um contato (pessoa) no CRM. Use para:
- Adicionar ou atualizar email de um contato
- Adicionar ou atualizar telefone de um contato
- Corrigir nome do contato

⚠️ IMPORTANTE: Contatos são entidades separadas dos leads! 
Para atualizar o email/telefone de uma pessoa vinculada a um lead, você precisa:
1. Buscar o lead com vorp_buscar_lead_por_id para ver os contatos vinculados
2. Usar esta ferramenta com o contact_id do contato

💡 DICA: Use vorp_listar_contatos para encontrar o contact_id pelo nome ou telefone.`,
      inputSchema: {
        type: "object",
        properties: {
          contact_id: { 
            type: "number", 
            description: "ID do contato a ser atualizado (obtenha com vorp_listar_contatos ou vorp_buscar_lead_por_id)" 
          },
          first_name: { 
            type: "string", 
            description: "Primeiro nome do contato" 
          },
          last_name: { 
            type: "string", 
            description: "Sobrenome do contato" 
          },
          phone: { 
            type: "string", 
            description: "Telefone do contato (formato: +5585999991234)" 
          },
          email: { 
            type: "string", 
            description: "Email do contato" 
          },
        },
        required: ["contact_id"],
      },
    },

    // ========== FERRAMENTAS DA PLANILHA DE EVENTOS ==========
    // A planilha é a fonte de verdade para etapas pós-agendamento

    {
      name: "vorp_planilha_listar_eventos",
      description: `📊 PLANILHA DE EVENTOS - FONTE DE VERDADE PARA MÉTRICAS COMERCIAIS

🚨 OBRIGATÓRIO USAR ESTA FERRAMENTA QUANDO O USUÁRIO PERGUNTAR:
- "Como foi o fechamento?" → Use tipo_evento="Venda realizada"
- "Quantas vendas/fechamentos?" → Use tipo_evento="Venda realizada"
- "Quantas reuniões realizadas?" → Use tipo_evento="Reunião Realizada"
- "Quantas propostas enviadas?" → Use tipo_evento="Proposta enviada"
- "Quantos agendamentos?" → Use tipo_evento="Agendamento"
- "Resultados da semana/mês" → Use esta ferramenta COM as datas
- "Reuniões agendadas para amanhã" → Use data_reuniao_de/data_reuniao_ate

⚠️ NÃO USE O CRM (vorp_listar_leads) PARA MÉTRICAS! A planilha é a fonte correta.

📋 MAPEAMENTO DE TERMOS:
- "fechamento" / "vendas" / "ganhos" → tipo_evento="Venda realizada"
- "reunião" / "call" / "meet" → tipo_evento="Reunião Realizada"
- "proposta" / "orçamento" → tipo_evento="Proposta enviada"
- "contrato" → tipo_evento="Contrato enviado"
- "agendamento" / "marcação" → tipo_evento="Agendamento"

📅 FILTROS DE DATA:
- data_de/data_ate: Para eventos que JÁ ACONTECERAM (passado)
- data_reuniao_de/data_reuniao_ate: Para reuniões FUTURAS (agendadas)

Exemplo "fechamentos da última sexta": tipo_evento="Venda realizada", data_de="20/12/2025", data_ate="20/12/2025"`,
      inputSchema: {
        type: "object",
        properties: {
          tipo_evento: { 
            type: "string",
            enum: ["Agendamento", "Reunião Realizada", "Proposta enviada", "Contrato enviado", "Venda realizada"],
            description: "Tipo do evento. Para 'fechamento' use 'Venda realizada'." 
          },
          pipeline: { 
            type: "string", 
            enum: ["SDR", "BDR", "CLOSERS", "MATCH_SALES"],
            description: "Filtrar por pipeline/funil" 
          },
          sdr_responsavel: { 
            type: "string", 
            description: "Nome do SDR responsável pelo agendamento" 
          },
          closer_responsavel: { 
            type: "string", 
            description: "Nome do Closer responsável" 
          },
          data_de: { 
            type: "string", 
            description: "Data inicial (DD/MM/YYYY). Filtra pela 'Data do evento' (quando aconteceu)." 
          },
          data_ate: { 
            type: "string", 
            description: "Data final (DD/MM/YYYY). Filtra pela 'Data do evento' (quando aconteceu)." 
          },
          data_reuniao_de: { 
            type: "string", 
            description: "Data inicial (DD/MM/YYYY). Filtra pela 'Data da reunião agendada' (quando vai acontecer). Use para reuniões futuras." 
          },
          data_reuniao_ate: { 
            type: "string", 
            description: "Data final (DD/MM/YYYY). Filtra pela 'Data da reunião agendada' (quando vai acontecer). Use para reuniões futuras." 
          },
          lead_id: { 
            type: "number", 
            description: "ID do lead no Kommo para buscar eventos específicos" 
          },
          limit: { 
            type: "number", 
            description: "Quantidade máxima de eventos a retornar" 
          },
        },
      },
    },

    {
      name: "vorp_planilha_eventos_lead",
      description: `🔍 BUSCA TODOS OS EVENTOS DE UM LEAD NA PLANILHA

Retorna o histórico completo de eventos de um lead específico na planilha. Use para:
- Ver todas as reuniões agendadas/realizadas de um lead
- Verificar status atual de negociação
- Consultar valores de propostas e contratos
- Entender a jornada completa pós-agendamento

⚠️ Use esta ferramenta ao invés de vorp_historico_lead para informações de etapas pós-agendamento!`,
      inputSchema: {
        type: "object",
        properties: {
          lead_id: { 
            type: "number", 
            description: "ID do lead no Kommo" 
          },
        },
        required: ["lead_id"],
      },
    },

    {
      name: "vorp_planilha_metricas",
      description: `📈 MÉTRICAS E KPIs DA PLANILHA DE EVENTOS

Calcula métricas de performance comercial baseado nos eventos da planilha. Ideal para:
- Relatórios de vendas
- Análise de conversão
- Acompanhamento de metas
- Performance por responsável

📊 MÉTRICAS RETORNADAS:
- Total de eventos por status (agendados, realizados, propostas, contratos, vendas, perdidos)
- Valor total de vendas e contratos
- Taxa de conversão reunião (realizados/agendados)
- Taxa de conversão venda (vendas/realizados)
- Ticket médio

📅 COMO USAR DATAS:
Use data_de e data_ate com datas explícitas no formato DD/MM/YYYY ou YYYY-MM-DD.

Exemplos:
- Hoje (18/12/2025): data_de="18/12/2025", data_ate="18/12/2025"
- Ontem (17/12/2025): data_de="17/12/2025", data_ate="17/12/2025"
- Esta semana: data_de="16/12/2025", data_ate="22/12/2025"
- Este mês: data_de="01/12/2025", data_ate="31/12/2025"

💡 DICA: O agente já sabe a data atual, calcule as datas de início e fim antes de chamar!`,
      inputSchema: {
        type: "object",
        properties: {
          data_de: {
            type: "string",
            description: "Data inicial do período (DD/MM/YYYY). OBRIGATÓRIO para filtrar por data."
          },
          data_ate: {
            type: "string",
            description: "Data final do período (DD/MM/YYYY). OBRIGATÓRIO para filtrar por data."
          },
          pipeline: { 
            type: "string", 
            enum: ["SDR", "BDR", "CLOSERS", "MATCH_SALES"],
            description: "Filtrar por pipeline/funil" 
          },
          responsavel: { 
            type: "string", 
            description: "Nome do responsável (SDR ou Closer)" 
          },
        },
      },
    },

    {
      name: "vorp_planilha_buscar_evento",
      description: `🔎 BUSCA EVENTO ESPECÍFICO POR ID NA PLANILHA

Retorna todos os detalhes de um evento específico quando você já conhece o ID do evento (UUID).`,
      inputSchema: {
        type: "object",
        properties: {
          evento_id: { 
            type: "string", 
            description: "ID único do evento (UUID)" 
          },
        },
        required: ["evento_id"],
      },
    },
  ];
}

// Lista de nomes das tools
const toolNames = [
  "vorp_listar_leads_funil",
  "vorp_listar_etapas_funil",
  "vorp_mover_lead",
  "vorp_atualizar_lead",
  "vorp_adicionar_nota",
  "vorp_criar_tarefa",
  "vorp_criar_lead",
  "vorp_buscar_lead_por_id",
  "vorp_buscar_por_telefone",
  "vorp_buscar_lead",
  "vorp_historico_lead",
  "vorp_listar_vendedores",
  "vorp_listar_campos_customizados",
  "vorp_listar_contatos",
  "vorp_atualizar_contato",
  // Ferramentas da Planilha (fonte de verdade pós-agendamento)
  "vorp_planilha_listar_eventos",
  "vorp_planilha_eventos_lead",
  "vorp_planilha_metricas",
  "vorp_planilha_buscar_evento",
];

// ========== Tool Handlers ==========
type ToolHandler = (
  params: Record<string, unknown>,
  client: KommoClientInterface
) => Promise<unknown>;

const toolHandlers: Record<string, ToolHandler> = {
  // Listar leads do funil
  vorp_listar_leads_funil: async (params, client) => {
    const validated = validateToolParams<{
      funil: VorpFunnelCode;
      query?: string;
      limit?: number;
      page?: number;
      created_at_from?: number;
      created_at_to?: number;
      status_id?: number;
    }>('vorp_listar_leads_funil', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { 
      funil,
      query, 
      limit = API_LIMITS.DEFAULT_LEADS_LIMIT, 
      page = API_LIMITS.DEFAULT_PAGE,
      created_at_from,
      created_at_to,
      status_id,
    } = validated.data;
    
    // Obter pipeline_id do funil
    const mappings = await getFunnelMappings(client);
    const funnelMapping = mappings.get(funil);
    
    if (!funnelMapping) {
      throw new Error(ERROR_MESSAGES.FUNNEL_NOT_FOUND(funil));
    }
    
    const queryParams: Record<string, unknown> = { 
      limit, 
      page, 
      with: "contacts",
      'filter[statuses][0][pipeline_id]': funnelMapping.pipeline_id,
    };
    
    if (query) queryParams.query = query;
    if (created_at_from) queryParams['filter[created_at][from]'] = created_at_from;
    if (created_at_to) queryParams['filter[created_at][to]'] = created_at_to;
    if (status_id) queryParams['filter[statuses][0][status_id]'] = status_id;

    const response = await client.get<LeadsListResponse>("/leads", queryParams);
    const allLeads = response._embedded?.leads || [];
    const totalLeads = allLeads.length;

    // Buscar detalhes dos contatos
    const contactIds = new Set<number>();
    allLeads.forEach(lead => {
      lead._embedded?.contacts?.forEach(contact => {
        contactIds.add(contact.id);
      });
    });

    let contactsMap = new Map<number, Contact>();
    if (contactIds.size > 0) {
      try {
        const contactsResponse = await client.get<ContactsListResponse>(
          "/contacts", 
          { id: Array.from(contactIds) }
        );
        const contacts = contactsResponse._embedded?.contacts || [];
        contacts.forEach(contact => {
          contactsMap.set(contact.id, contact);
        });
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    }

    // Enriquecer leads com informações de contato
    const enrichedLeads = allLeads.map(lead => {
      const mainContactId = lead._embedded?.contacts?.find(c => c.is_main)?.id;
      const contact = mainContactId ? contactsMap.get(mainContactId) : null;
      
      let contactInfo = null;
      if (contact) {
        const phoneField = contact.custom_fields_values?.find(
          f => f.field_code === "PHONE" || f.field_type === "multitext"
        );
        const phone = phoneField?.values?.[0]?.value || null;
        
        contactInfo = {
          id: contact.id,
          name: contact.name,
          first_name: contact.first_name,
          last_name: contact.last_name,
          phone: phone,
        };
      }
      
      // Encontrar nome da etapa atual
      const currentStage = funnelMapping.stages.find(s => s.id === lead.status_id);
      
      return {
        id: lead.id,
        name: lead.name,
        price: lead.price,
        status_id: lead.status_id,
        status_name: currentStage?.name || 'Desconhecido',
        pipeline_id: lead.pipeline_id,
        responsible_user_id: lead.responsible_user_id,
        created_at: lead.created_at,
        updated_at: lead.updated_at,
        contact_info: contactInfo,
      };
    });

    return {
      funil: VORP_FUNNELS[funil].name,
      pipeline_id: funnelMapping.pipeline_id,
      total: totalLeads,
      leads: enrichedLeads,
      message: totalLeads === 0 
        ? `Nenhum lead encontrado no funil ${VORP_FUNNELS[funil].name}` 
        : `${totalLeads} lead(s) encontrado(s) no funil ${VORP_FUNNELS[funil].name}`,
    };
  },

  // Listar etapas do funil
  vorp_listar_etapas_funil: async (params, client) => {
    const validated = validateToolParams<{ funil: VorpFunnelCode }>('vorp_listar_etapas_funil', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { funil } = validated.data;
    const mappings = await getFunnelMappings(client);
    const funnelMapping = mappings.get(funil);
    
    if (!funnelMapping) {
      throw new Error(ERROR_MESSAGES.FUNNEL_NOT_FOUND(funil));
    }
    
    const funnelInfo = VORP_FUNNELS[funil];
    
    return {
      funil: funnelInfo.name,
      objetivo: funnelInfo.objective,
      pipeline_id: funnelMapping.pipeline_id,
      etapas: funnelMapping.stages.map((s, index) => ({
        ordem: index + 1,
        status_id: s.id,
        nome: s.name,
        cor: s.color,
      })),
    };
  },

  // Mover lead entre etapas
  vorp_mover_lead: async (params, client) => {
    const validated = validateToolParams<{
      lead_id: number;
      funil: VorpFunnelCode;
      status_id: number;
    }>('vorp_mover_lead', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { lead_id, funil, status_id } = validated.data;
    
    const mappings = await getFunnelMappings(client);
    const funnelMapping = mappings.get(funil);
    
    if (!funnelMapping) {
      throw new Error(ERROR_MESSAGES.FUNNEL_NOT_FOUND(funil));
    }
    
    const body: LeadUpdateRequest = {
      status_id,
      pipeline_id: funnelMapping.pipeline_id,
    };

    const result = await client.patch<Lead>(`/leads/${lead_id}`, body);
    const stageName = funnelMapping.stages.find(s => s.id === status_id)?.name || 'Etapa desconhecida';
    
    return {
      success: true,
      lead_id,
      funil: VORP_FUNNELS[funil].name,
      nova_etapa: stageName,
      message: `Lead ${lead_id} movido para "${stageName}" no funil ${VORP_FUNNELS[funil].name}`,
    };
  },

  // Atualizar lead
  vorp_atualizar_lead: async (params, client) => {
    const validated = validateToolParams<{
      lead_id: number;
      name?: string;
      price?: number;
      status_id?: number;
      responsible_user_id?: number;
      custom_fields_values?: Array<{ field_id: number; values: Array<{ value: string | number | boolean; enum_id?: number }> }>;
    }>('vorp_atualizar_lead', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { lead_id, name, price, status_id, responsible_user_id, custom_fields_values } = validated.data;
    
    const body: LeadUpdateRequest = {};
    if (name) body.name = name;
    if (price !== undefined) body.price = price;
    if (status_id) body.status_id = status_id;
    if (responsible_user_id) body.responsible_user_id = responsible_user_id;
    if (custom_fields_values) body.custom_fields_values = custom_fields_values as any;

    const result = await client.patch<Lead>(`/leads/${lead_id}`, body);
    
    return {
      success: true,
      lead_id,
      updated_fields: Object.keys(body),
      message: `Lead ${lead_id} atualizado com sucesso`,
    };
  },

  // Adicionar nota
  vorp_adicionar_nota: async (params, client) => {
    const validated = validateToolParams<{ lead_id: number; text: string }>('vorp_adicionar_nota', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { lead_id, text } = validated.data;
    
    const payload: NoteCreateRequest[] = [{
      entity_id: lead_id,
      note_type: "common",
      params: { text },
    }];

    const response = await client.post<NotesCreateResponse>("/leads/notes", payload);
    const note = response._embedded?.notes?.[0];
    
    return {
      success: true,
      lead_id,
      note_id: note?.id,
      message: `Nota adicionada ao lead ${lead_id}`,
    };
  },

  // Criar tarefa
  vorp_criar_tarefa: async (params, client) => {
    const validated = validateToolParams<{
      lead_id: number;
      text: string;
      complete_till: number;
      task_type_id?: number;
    }>('vorp_criar_tarefa', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { lead_id, text, complete_till, task_type_id = 1 } = validated.data;
    
    const taskTypes: Record<number, string> = { 1: 'Ligar', 2: 'Reunião', 3: 'Email' };
    
    const payload: TaskCreateRequest[] = [{
      task_type_id,
      text,
      complete_till,
      entity_id: lead_id,
      entity_type: "leads",
      request_id: `task_${Date.now()}`,
    }];

    const response = await client.post<TasksCreateResponse>("/tasks", payload);
    const task = response._embedded?.tasks?.[0];
    
    const prazoDate = new Date(complete_till * 1000);
    
    return {
      success: true,
      lead_id,
      task_id: task?.id,
      tipo: taskTypes[task_type_id] || 'Tarefa',
      prazo: prazoDate.toLocaleString('pt-BR'),
      message: `Tarefa "${text}" criada para ${prazoDate.toLocaleDateString('pt-BR')}`,
    };
  },

  // Criar lead
  vorp_criar_lead: async (params, client) => {
    const validated = validateToolParams<{
      name: string;
      funil: VorpFunnelCode;
      status_id?: number;
      price?: number;
      responsible_user_id?: number;
      contact_first_name?: string;
      contact_last_name?: string;
      contact_phone?: string;
      contact_email?: string;
      company_name?: string;
      company_phone?: string;
    }>('vorp_criar_lead', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { 
      name, 
      funil,
      status_id,
      price, 
      responsible_user_id,
      contact_first_name,
      contact_last_name,
      contact_phone,
      contact_email,
      company_name,
      company_phone,
    } = validated.data;
    
    // Obter pipeline_id do funil
    const mappings = await getFunnelMappings(client);
    const funnelMapping = mappings.get(funil);
    
    if (!funnelMapping) {
      throw new Error(ERROR_MESSAGES.FUNNEL_NOT_FOUND(funil));
    }
    
    // Usar primeira etapa se não especificada
    const finalStatusId = status_id || funnelMapping.stages[0]?.id;
    
    const leadData: any = {
      name,
      price,
      status_id: finalStatusId,
      pipeline_id: funnelMapping.pipeline_id,
      responsible_user_id,
      _embedded: {},
    };
    
    // Criar contato
    if (contact_first_name || contact_phone || contact_email) {
      const contactCustomFields: any[] = [];
      
      if (contact_phone) {
        contactCustomFields.push({
          field_code: "PHONE",
          values: [{ value: contact_phone, enum_code: "WORK" }]
        });
      }
      
      if (contact_email) {
        contactCustomFields.push({
          field_code: "EMAIL",
          values: [{ value: contact_email, enum_code: "WORK" }]
        });
      }
      
      const fullName = contact_last_name 
        ? `${contact_first_name} ${contact_last_name}` 
        : contact_first_name || "Contato";
      
      leadData._embedded.contacts = [{
        first_name: contact_first_name || "",
        last_name: contact_last_name || "",
        name: fullName,
        custom_fields_values: contactCustomFields.length > 0 ? contactCustomFields : undefined,
      }];
    }
    
    // Criar empresa
    if (company_name) {
      const companyCustomFields: any[] = [];
      
      if (company_phone) {
        companyCustomFields.push({
          field_code: "PHONE",
          values: [{ value: company_phone, enum_code: "WORK" }]
        });
      }
      
      leadData._embedded.companies = [{
        name: company_name,
        custom_fields_values: companyCustomFields.length > 0 ? companyCustomFields : undefined,
      }];
    }
    
    const endpoint = (contact_first_name || company_name) ? "/leads/complex" : "/leads";
    const payload = [leadData];
    
    const response = await client.post<LeadCreateResponse>(endpoint, payload);
    const createdLead = response._embedded?.leads?.[0];
    
    const stageName = funnelMapping.stages.find(s => s.id === finalStatusId)?.name || 'Primeira etapa';
    
    return {
      success: true,
      lead_id: createdLead?.id,
      funil: VORP_FUNNELS[funil].name,
      etapa: stageName,
      message: `Lead "${name}" criado no funil ${VORP_FUNNELS[funil].name}, etapa "${stageName}"`,
    };
  },

  // Buscar lead por ID
  vorp_buscar_lead_por_id: async (params, client) => {
    const validated = validateToolParams<{ lead_id: number }>('vorp_buscar_lead_por_id', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { lead_id } = validated.data;
    
    const lead = await client.get<Lead>(`/leads/${lead_id}`, { with: "contacts,companies" });
    
    // Identificar funil
    const mappings = await getFunnelMappings(client);
    let funnelName = 'Outro';
    let stageName = 'Desconhecida';
    
    for (const [code, mapping] of mappings) {
      if (mapping.pipeline_id === lead.pipeline_id) {
        funnelName = VORP_FUNNELS[code].name;
        stageName = mapping.stages.find(s => s.id === lead.status_id)?.name || 'Desconhecida';
        break;
      }
    }
    
    // Extrair Valor de Competência ARR (1024619) - valor total do contrato
    const valorARRField = lead.custom_fields_values?.find(f => f.field_id === 1024619);
    const valorARR = valorARRField?.values?.[0]?.value 
      ? parseFloat(String(valorARRField.values[0].value)) 
      : null;
    
    return {
      id: lead.id,
      name: lead.name,
      
      // Valores com observações
      valor_venda: lead.price,
      valor_venda_formatado: lead.price ? lead.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null,
      valor_venda_obs: "Valor pago no ato do fechamento (price)",
      
      valor_contrato: valorARR,
      valor_contrato_formatado: valorARR ? valorARR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null,
      valor_contrato_obs: "Valor total do contrato (Valor de Competência ARR)",
      
      funil: funnelName,
      etapa: stageName,
      status_id: lead.status_id,
      pipeline_id: lead.pipeline_id,
      responsible_user_id: lead.responsible_user_id,
      created_at: new Date(lead.created_at * 1000).toLocaleString('pt-BR'),
      updated_at: new Date(lead.updated_at * 1000).toLocaleString('pt-BR'),
      contacts: lead._embedded?.contacts || [],
      companies: lead._embedded?.companies || [],
      custom_fields: lead.custom_fields_values,
    };
  },

  // Buscar por telefone
  vorp_buscar_por_telefone: async (params, client) => {
    const validated = validateToolParams<{ phone: string }>('vorp_buscar_por_telefone', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { phone } = validated.data;
    
    const response = await client.get<LeadsListResponse>("/leads", { 
      query: phone, 
      with: "contacts",
      limit: 50,
    });
    
    const leads = response._embedded?.leads || [];
    
    return {
      phone,
      total: leads.length,
      leads: leads.map(lead => ({
        id: lead.id,
        name: lead.name,
        price: lead.price,
        status_id: lead.status_id,
        pipeline_id: lead.pipeline_id,
      })),
      message: leads.length === 0 
        ? `Nenhum lead encontrado com telefone ${phone}` 
        : `${leads.length} lead(s) encontrado(s) com telefone ${phone}`,
    };
  },

  // Busca global de leads (todos os funis)
  vorp_buscar_lead: async (params, client) => {
    const query = params.query as string;
    const limit = Math.min((params.limit as number) || 10, 50);
    
    if (!query || query.trim().length < 2) {
      throw new Error("O termo de busca deve ter pelo menos 2 caracteres");
    }

    // Obter mapeamentos dos funis Vorp
    const mappings = await getFunnelMappings(client);
    const vorpPipelineIds = Array.from(mappings.values()).map(m => m.pipeline_id);

    // Buscar leads usando a query - buscar bastante para ter margem
    const response = await client.get<LeadsListResponse>("/leads", { 
      query: query.trim(),
      with: "contacts",
      limit: limit * 3, // Buscar mais para filtrar e ordenar depois
      order: { updated_at: 'desc' }, // Mais recentes primeiro
    });
    
    let leads = response._embedded?.leads || [];
    
    // Filtrar apenas leads dos funis Vorp (SDR, BDR, CLOSERS)
    leads = leads.filter(lead => vorpPipelineIds.includes(lead.pipeline_id));
    
    // Ordenar por data de atualização (mais recentes primeiro)
    leads.sort((a, b) => b.updated_at - a.updated_at);
    
    // Limitar ao número pedido
    leads = leads.slice(0, limit);

    // Mapear nome do funil para cada lead
    const pipelineToFunnel = new Map<number, string>();
    for (const [code, mapping] of mappings) {
      pipelineToFunnel.set(mapping.pipeline_id, VORP_FUNNELS[code].name);
    }

    // Buscar detalhes dos contatos
    const contactIds = new Set<number>();
    leads.forEach(lead => {
      lead._embedded?.contacts?.forEach(contact => {
        contactIds.add(contact.id);
      });
    });

    let contactsMap = new Map<number, Contact>();
    if (contactIds.size > 0) {
      try {
        const contactsResponse = await client.get<ContactsListResponse>(
          "/contacts", 
          { id: Array.from(contactIds) }
        );
        const contacts = contactsResponse._embedded?.contacts || [];
        contacts.forEach(contact => {
          contactsMap.set(contact.id, contact);
        });
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    }
    
    const enrichedLeads = leads.map(lead => {
      const mainContactId = lead._embedded?.contacts?.find(c => c.is_main)?.id;
      const contact = mainContactId ? contactsMap.get(mainContactId) : null;
      
      let contactInfo = null;
      if (contact) {
        const phoneField = contact.custom_fields_values?.find(
          f => f.field_code === "PHONE" || f.field_type === "multitext"
        );
        contactInfo = {
          nome: contact.name,
          telefone: phoneField?.values?.[0]?.value || null,
        };
      }

      // Extrair Valor de Competência ARR (1024619) - valor total do contrato
      const valorARRField = lead.custom_fields_values?.find(f => f.field_id === 1024619);
      const valorARR = valorARRField?.values?.[0]?.value 
        ? parseFloat(String(valorARRField.values[0].value)) 
        : null;

      return {
        id: lead.id,
        name: lead.name,
        funil: pipelineToFunnel.get(lead.pipeline_id) || 'Desconhecido',
        pipeline_id: lead.pipeline_id,
        status_id: lead.status_id,
        valor_venda: lead.price,
        valor_venda_obs: "Valor pago no ato (price)",
        valor_contrato: valorARR,
        valor_contrato_obs: "Valor total do contrato (ARR)",
        contato: contactInfo,
        updated_at: new Date(lead.updated_at * 1000).toLocaleString('pt-BR'),
      };
    });

    return {
      busca: query,
      total: enrichedLeads.length,
      leads: enrichedLeads,
      message: enrichedLeads.length === 0 
        ? `Nenhum lead encontrado para "${query}" nos funis SDR, BDR ou CLOSERS` 
        : `${enrichedLeads.length} lead(s) encontrado(s) para "${query}"`,
    };
  },

  // Histórico do lead
  vorp_historico_lead: async (params, client) => {
    const validated = validateToolParams<{ lead_id: number; limit?: number }>('vorp_historico_lead', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { lead_id, limit = 20 } = validated.data;
    
    const response = await client.get<EventsListResponse>("/events", {
      'filter[entity]': 'lead',
      'filter[entity_id]': lead_id,
      limit,
    });
    
    const events = response._embedded?.events || [];
    
    const eventTypes: Record<string, string> = {
      'incoming_chat_message': '💬 Mensagem recebida',
      'outgoing_chat_message': '📤 Mensagem enviada',
      'lead_status_changed': '🔄 Etapa alterada',
      'incoming_call': '📞 Ligação recebida',
      'outgoing_call': '📱 Ligação realizada',
      'task_completed': '✅ Tarefa concluída',
      'note_added': '📝 Nota adicionada',
      'lead_added': '➕ Lead criado',
    };
    
    return {
      lead_id,
      total_eventos: events.length,
      eventos: events.map(event => ({
        id: event.id,
        tipo: eventTypes[event.type] || event.type,
        data: new Date(event.created_at * 1000).toLocaleString('pt-BR'),
        detalhes: event.value_after,
      })),
    };
  },

  // Listar vendedores
  vorp_listar_vendedores: async (_params, client) => {
    const cacheKey = "vorp_users";
    const cached = getCached<User[]>(cacheKey);
    if (cached) {
      return { vendedores: cached };
    }
    
    const response = await client.get<UsersListResponse>("/users");
    const users = response._embedded?.users || [];
    
    const formatted = users.map(u => ({
      id: u.id,
      nome: u.name,
      email: u.email,
    }));
    
    setCache(cacheKey, formatted, CACHE_TTL.USERS);
    
    return { vendedores: formatted };
  },

  // Listar campos customizados
  vorp_listar_campos_customizados: async (_params, client) => {
    const cacheKey = "vorp_custom_fields_v2";
    const cached = getCached<unknown>(cacheKey);
    if (cached) return cached;

    const response = await client.get<any>("/leads/custom_fields");
    const fields = response._embedded?.custom_fields || [];

    // Campos mais usados que precisam destaque
    const camposImportantes = [
      'Faturamento Mensal', 'Faturamento Real', 'Canal', 'Temperatura do Lead',
      'Segmento', 'Produto', 'Cargo', 'Reuniao Acontecida', 'Data e hora da reunião',
      'Link da reunião', 'Dor', 'Bant'
    ];

    const formatted = fields.map((f: any) => {
      const isImportante = camposImportantes.some(c => 
        f.name.toLowerCase().includes(c.toLowerCase())
      );
      
      return {
        field_id: f.id,
        nome: f.name,
        tipo: f.type,
        obrigatorio: f.is_required || false,
        destaque: isImportante,
        opcoes: f.enums?.map((e: any) => ({
          enum_id: e.id,
          valor: e.value,
        })) || null,
        uso: f.type === 'select' || f.type === 'multiselect' 
          ? `{ field_id: ${f.id}, values: [{ enum_id: ID_DA_OPCAO }] }`
          : f.type === 'date' || f.type === 'date_time'
          ? `{ field_id: ${f.id}, values: [{ value: UNIX_TIMESTAMP }] }`
          : `{ field_id: ${f.id}, values: [{ value: "texto" }] }`,
      };
    });

    // Ordenar: campos importantes primeiro
    formatted.sort((a: any, b: any) => {
      if (a.destaque && !b.destaque) return -1;
      if (!a.destaque && b.destaque) return 1;
      return 0;
    });

    const result = { 
      instrucoes: "Para atualizar um lead, use custom_fields_values com field_id e enum_id (para select) ou value (para texto/data). Campos com destaque=true sao os mais usados.",
      total: formatted.length,
      campos: formatted 
    };

    setCache(cacheKey, result, CACHE_TTL.CUSTOM_FIELDS);
    return result;
  },

  // Listar contatos
  vorp_listar_contatos: async (params, client) => {
    const query = params.query as string | undefined;
    const limit = (params.limit as number) || 50;
    const page = (params.page as number) || 1;
    
    const queryParams: Record<string, unknown> = { limit, page };
    if (query) queryParams.query = query;
    
    const response = await client.get<ContactsListResponse>("/contacts", queryParams);
    const contacts = response._embedded?.contacts || [];
    
    return {
      total: contacts.length,
      contatos: contacts.map(c => {
        const phoneField = c.custom_fields_values?.find(
          f => f.field_code === "PHONE"
        );
        const emailField = c.custom_fields_values?.find(
          f => f.field_code === "EMAIL"
        );
        
        return {
          id: c.id,
          nome: c.name,
          telefone: phoneField?.values?.[0]?.value || null,
          email: emailField?.values?.[0]?.value || null,
        };
      }),
    };
  },

  // Atualizar contato
  vorp_atualizar_contato: async (params, client) => {
    const validated = validateToolParams<{
      contact_id: number;
      first_name?: string;
      last_name?: string;
      phone?: string;
      email?: string;
    }>('vorp_atualizar_contato', params);
    
    if (!validated.success) {
      throw new Error(`Parâmetros inválidos: ${validated.error}`);
    }
    
    const { contact_id, first_name, last_name, phone, email } = validated.data;
    
    // Montar payload de atualização
    const updatePayload: any = {};
    
    if (first_name) updatePayload.first_name = first_name;
    if (last_name) updatePayload.last_name = last_name;
    
    // Campos customizados (telefone e email são campos especiais no Kommo)
    const customFields: any[] = [];
    
    if (phone) {
      customFields.push({
        field_code: "PHONE",
        values: [{ value: phone, enum_code: "WORK" }]
      });
    }
    
    if (email) {
      customFields.push({
        field_code: "EMAIL",
        values: [{ value: email, enum_code: "WORK" }]
      });
    }
    
    if (customFields.length > 0) {
      updatePayload.custom_fields_values = customFields;
    }
    
    // Verificar se há algo para atualizar
    if (Object.keys(updatePayload).length === 0) {
      throw new Error("Nenhum campo para atualizar. Informe pelo menos um: first_name, last_name, phone ou email");
    }
    
    // Executar atualização via PATCH
    const response = await client.patch<ContactsListResponse>("/contacts", [{ id: contact_id, ...updatePayload }]);
    
    const updatedContact = response?._embedded?.contacts?.[0];
    
    return {
      sucesso: true,
      message: `Contato ${contact_id} atualizado com sucesso`,
      contato: {
        id: contact_id,
        first_name: first_name || "(não alterado)",
        last_name: last_name || "(não alterado)",
        phone: phone || "(não alterado)",
        email: email || "(não alterado)",
      },
    };
  },

  // ========== HANDLERS DA PLANILHA DE EVENTOS ==========
  // Fonte de verdade para etapas pós-agendamento

  // Listar eventos da planilha
  vorp_planilha_listar_eventos: async (params, _client) => {
    const tipo_evento = params.tipo_evento as string | undefined;
    const pipeline = params.pipeline as string | undefined;
    const sdr_responsavel = params.sdr_responsavel as string | undefined;
    const closer_responsavel = params.closer_responsavel as string | undefined;
    const data_de = params.data_de as string | undefined;
    const data_ate = params.data_ate as string | undefined;
    const data_reuniao_de = params.data_reuniao_de as string | undefined;
    const data_reuniao_ate = params.data_reuniao_ate as string | undefined;
    const lead_id = params.lead_id as number | undefined;
    const limit = params.limit as number | undefined;

    // Se tem lead_id, buscar eventos específicos desse lead
    if (lead_id) {
      const eventos = await sheetsClient.getEventoByLeadId(lead_id);
      return {
        fonte: "Planilha de Eventos Vorp",
        lead_id,
        total: eventos.length,
        eventos: eventos.map(formatEventoParaResposta),
        message: eventos.length === 0 
          ? `Nenhum evento encontrado para o lead ${lead_id}` 
          : `${eventos.length} evento(s) encontrado(s) para o lead ${lead_id}`,
      };
    }

    // Montar filtros
    const filters: any = {};
    if (tipo_evento) filters.tipo_evento = tipo_evento;
    if (pipeline) filters.pipeline = pipeline;
    if (sdr_responsavel) filters.sdr_responsavel = sdr_responsavel;
    if (closer_responsavel) filters.closer_responsavel = closer_responsavel;
    if (limit) filters.limit = limit;
    
    // Converter datas do evento (quando aconteceu)
    if (data_de) {
      filters.data_de = parseDateInput(data_de);
    }
    if (data_ate) {
      filters.data_ate = parseDateInput(data_ate, true); // true = final do dia (23:59:59)
    }
    
    // Converter datas da reunião agendada (quando vai acontecer)
    if (data_reuniao_de) {
      filters.data_reuniao_de = parseDateInput(data_reuniao_de);
    }
    if (data_reuniao_ate) {
      filters.data_reuniao_ate = parseDateInput(data_reuniao_ate, true);
    }

    const eventos = await sheetsClient.getEventos(filters);
    
    return {
      fonte: "Planilha de Eventos Vorp",
      filtros_aplicados: { 
        tipo_evento, 
        pipeline, 
        sdr_responsavel, 
        closer_responsavel, 
        data_de, 
        data_ate,
        data_reuniao_de,
        data_reuniao_ate
      },
      total: eventos.length,
      eventos: eventos.map(formatEventoParaResposta),
      message: eventos.length === 0 
        ? "Nenhum evento encontrado com os filtros aplicados" 
        : `${eventos.length} evento(s) encontrado(s)`,
    };
  },

  // Buscar eventos de um lead específico
  vorp_planilha_eventos_lead: async (params, _client) => {
    const lead_id = params.lead_id as number;
    
    if (!lead_id) {
      throw new Error("lead_id é obrigatório");
    }

    const eventos = await sheetsClient.getEventoByLeadId(lead_id);
    
    return {
      fonte: "Planilha de Eventos Vorp",
      lead_id,
      total: eventos.length,
      eventos: eventos.map(formatEventoParaResposta),
      resumo: eventos.length > 0 ? {
        ultimo_status: eventos[eventos.length - 1].status_agendamento,
        ultimo_tipo: eventos[eventos.length - 1].tipo_evento,
        tem_venda: eventos.some(e => e.status_agendamento.toLowerCase() === 'venda'),
        valor_total: eventos.reduce((sum, e) => sum + (e.valor_venda || 0), 0),
      } : null,
      message: eventos.length === 0 
        ? `Lead ${lead_id} não possui eventos na planilha (pode estar em etapas iniciais no Kommo)` 
        : `${eventos.length} evento(s) encontrado(s) para o lead ${lead_id}`,
    };
  },

  // Métricas da planilha
  vorp_planilha_metricas: async (params, _client) => {
    const pipeline = params.pipeline as string | undefined;
    const responsavel = params.responsavel as string | undefined;
    const data_de_str = params.data_de as string | undefined;
    const data_ate_str = params.data_ate as string | undefined;

    // Converter datas string para Date se fornecidas
    const data_de = data_de_str ? parseDateInput(data_de_str) : undefined;
    const data_ate = data_ate_str ? parseDateInput(data_ate_str, true) : undefined; // true = final do dia

    const metricas = await sheetsClient.getMetricas({ pipeline, responsavel, data_de, data_ate });
    
    // Montar descrição do período
    let periodoDescricao = 'todos os tempos';
    if (data_de_str && data_ate_str) {
      if (data_de_str === data_ate_str) {
        periodoDescricao = data_de_str; // Dia único
      } else {
        periodoDescricao = `${data_de_str} até ${data_ate_str}`;
      }
    } else if (data_de_str) {
      periodoDescricao = `a partir de ${data_de_str}`;
    } else if (data_ate_str) {
      periodoDescricao = `até ${data_ate_str}`;
    }
    
    return {
      fonte: "Planilha de Eventos Vorp",
      filtros: { periodo: periodoDescricao, pipeline, responsavel, data_de: data_de_str, data_ate: data_ate_str },
      metricas: {
        total_leads: metricas.total_leads,
        agendados: metricas.agendados,
        realizados: metricas.realizados,
        propostas: metricas.propostas,
        contratos: metricas.contratos,
        vendas: metricas.vendas,
        perdidos: metricas.perdidos,
        valor_total_vendas: metricas.valor_total_vendas,
        valor_total_vendas_formatado: formatarMoeda(metricas.valor_total_vendas),
        valor_total_contratos: metricas.valor_total_contratos,
        valor_total_contratos_formatado: formatarMoeda(metricas.valor_total_contratos),
        ticket_medio: metricas.ticket_medio,
        ticket_medio_formatado: formatarMoeda(metricas.ticket_medio),
        taxa_conversao_reuniao: metricas.taxa_conversao_reuniao,
        taxa_conversao_reuniao_formatada: `${metricas.taxa_conversao_reuniao}%`,
        taxa_conversao_venda: metricas.taxa_conversao_venda,
        taxa_conversao_venda_formatada: `${metricas.taxa_conversao_venda}%`,
      },
      // Lista de leads (máximo 10 por categoria)
      leads_vendas: metricas.leads_vendas?.map(l => ({
        id: l.id_lead,
        nome: l.nome,
        pipeline: l.pipeline,
        closer: l.closer_responsavel,
        valor: l.valor_venda ? formatarMoeda(l.valor_venda) : null,
        data: l.data_ultimo_evento,
        url: l.url_lead,
      })),
      leads_propostas: metricas.leads_propostas?.map(l => ({
        id: l.id_lead,
        nome: l.nome,
        pipeline: l.pipeline,
        closer: l.closer_responsavel,
        valor_contrato: l.valor_contrato ? formatarMoeda(l.valor_contrato) : null,
        data: l.data_ultimo_evento,
        url: l.url_lead,
      })),
      resumo: `📊 Total: ${metricas.total_leads} leads | ` +
              `✅ Vendas: ${metricas.vendas} leads (${formatarMoeda(metricas.valor_total_vendas)}) | ` +
              `📈 Conversão: ${metricas.taxa_conversao_venda}%`,
    };
  },

  // Buscar evento por ID
  vorp_planilha_buscar_evento: async (params, _client) => {
    const evento_id = params.evento_id as string;
    
    if (!evento_id) {
      throw new Error("evento_id é obrigatório");
    }

    const evento = await sheetsClient.getEventoById(evento_id);
    
    if (!evento) {
      return {
        encontrado: false,
        message: `Evento com ID "${evento_id}" não encontrado na planilha`,
      };
    }
    
    return {
      fonte: "Planilha de Eventos Vorp",
      encontrado: true,
      evento: formatEventoParaResposta(evento),
    };
  },
};

// ========== Funções Auxiliares ==========

// Formatar evento da planilha para resposta
function formatEventoParaResposta(evento: PlanilhaEvento) {
  return {
    // Identificação principal
    nome_lead: evento.nome_lead,
    id_lead: evento.id_lead,
    
    // Responsáveis
    sdr_responsavel: evento.sdr_responsavel,
    closer_responsavel: evento.closer_responsavel,
    
    // Origem e contexto
    origem_lead: evento.origem_lead,
    produto: evento.produto,
    pipeline: evento.pipeline,
    
    // Evento
    tipo_evento: evento.tipo_evento,
    status: evento.status_agendamento,
    data_evento: evento.data_evento,
    data_reuniao_agendada: evento.data_reuniao_agendada,
    
    // Valores
    valor_venda: evento.valor_venda,
    valor_venda_formatado: evento.valor_venda ? formatarMoeda(evento.valor_venda) : null,
    valor_venda_obs: "Valor pago no ato do fechamento",
    valor_contrato: evento.valor_contrato,
    valor_contrato_formatado: evento.valor_contrato ? formatarMoeda(evento.valor_contrato) : null,
    valor_contrato_obs: "Valor total do contrato",
    
    // Datas de registro
    data_reuniao_realizada: evento.data_registro_reuniao_realizada || null,
    data_proposta: evento.data_registro_proposta_enviada || null,
    data_contrato: evento.data_registro_contrato_enviado || null,
    data_venda: evento.data_registro_venda || null,
    data_perdido: evento.data_registro_perdido || null,
    motivo_perdido: evento.motivo_perdido || null,
    
    // Contato (resumido)
    contato: evento.nome_contato ? {
      nome: evento.nome_contato,
      telefone: evento.telefone_contato,
      email: evento.email_contato,
    } : null,
    
    // Links
    url_lead: evento.url_lead,
    id_evento: evento.id_evento,
  };
}

// Formatar valor em reais
function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Converter input de data para Date
// isEndOfDay: se true, define horário como 23:59:59 (para filtros data_ate)
function parseDateInput(dateStr: string, isEndOfDay: boolean = false): Date {
  let date: Date;
  
  // Tentar formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
  if (dateStr.includes('-')) {
    date = new Date(dateStr);
  } else {
    // Tentar formato BR (DD/MM/YYYY)
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      date = new Date(dateStr);
    }
  }
  
  // Se é data final (data_ate), definir horário como final do dia
  if (isEndOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  
  return date;
}

// ========== Fastify Server ==========
const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Autenticação
function parseAuthToken(authHeader: string | undefined): { password: string; subdomain: string; kommoToken: string } | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  const parts = token.split("|");
  if (parts.length !== 3) {
    return null;
  }
  return { password: parts[0], subdomain: parts[1], kommoToken: parts[2] };
}

// Health check
app.get("/health", async () => ({ status: "ok", server: SERVER_INFO.name }));

// Endpoint SSE para eventos (compatibilidade MCP)
app.get("/sse", async (request: FastifyRequest, reply: FastifyReply) => {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  reply.raw.write(`data: {"type":"endpoint","url":"/mcp"}\n\n`);
  
  const keepAlive = setInterval(() => {
    reply.raw.write(": keep-alive\n\n");
  }, 30000);

  request.raw.on("close", () => {
    clearInterval(keepAlive);
  });
});

// Endpoint principal MCP
app.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
  const auth = parseAuthToken(request.headers.authorization);
  if (!auth) {
    return reply.status(401).send({
      jsonrpc: "2.0",
      id: null,
      error: { code: JSON_RPC_ERRORS.SERVER_ERROR, message: ERROR_MESSAGES.INVALID_TOKEN_FORMAT },
    });
  }

  const client = createKommoClient(`https://${auth.subdomain}.kommo.com`, auth.kommoToken);

  // Suporte a batch requests
  const isBatch = isMCPRequestArray(request.body);
  const requests = isBatch ? (request.body as MCPRequest[]) : [request.body as MCPRequest];
  
  const responses: MCPResponse[] = [];

  for (const req of requests) {
    try {
      const parsed = mcpRequestSchema.safeParse(req);
      if (!parsed.success) {
        responses.push({
          jsonrpc: "2.0",
          id: req.id ?? 0,
          error: { code: JSON_RPC_ERRORS.INVALID_REQUEST, message: "Invalid request format" },
        });
        continue;
      }

      const { id, method, params } = parsed.data;

      let result: unknown;

      switch (method) {
        case "initialize":
          result = {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: { tools: { listChanged: true } },
            serverInfo: SERVER_INFO,
          };
          break;

        case "notifications/initialized":
          result = {};
          break;

        case "tools/list":
          const tools = await generateToolDefinitions(client);
          result = { tools };
          break;

        case "tools/call":
          const toolName = (params as any)?.name;
          const toolArgs = (params as any)?.arguments || {};

          if (!toolName || !toolHandlers[toolName]) {
            throw new Error(ERROR_MESSAGES.TOOL_NOT_FOUND(toolName));
          }

          result = { content: [{ type: "text", text: JSON.stringify(await toolHandlers[toolName](toolArgs, client), null, 2) }] };
          break;

        default:
          throw new Error(ERROR_MESSAGES.METHOD_NOT_SUPPORTED(method));
      }

      responses.push({ jsonrpc: "2.0", id, result });
    } catch (error) {
      responses.push({
        jsonrpc: "2.0",
        id: req.id ?? 0,
        error: {
          code: JSON_RPC_ERRORS.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  return isBatch ? responses : responses[0];
});

// Iniciar servidor
const port = parseInt(process.env.PORT || String(SERVER_CONFIG.DEFAULT_PORT));
const host = process.env.HOST || SERVER_CONFIG.DEFAULT_HOST;

try {
  await app.listen({ port, host });
  console.log(`\n🚀 Vorp MCP Server rodando em http://${host}:${port}`);
  console.log(`📊 Funis disponíveis: SDR, BDR, CLOSERS`);
  console.log(`🎯 Grupo Vorp: Construindo negócios fortes e escaláveis\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
