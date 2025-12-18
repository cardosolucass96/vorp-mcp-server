/**
 * Tipos para integração com a Planilha de Eventos do Grupo Vorp
 * A planilha é a fonte de verdade para etapas pós-agendamento
 */

// Evento da planilha (cada linha é um evento)
export interface PlanilhaEvento {
  // Identificação
  nome_lead: string;
  id_evento: string;              // UUID único do evento
  id_lead: number;                // ID do lead no Kommo
  url_lead: string;
  
  // Responsáveis
  sdr_responsavel: string;
  closer_responsavel: string;
  id_responsavel_lead: number;
  
  // Status
  status_agendamento: EventoStatus;
  tipo_evento: EventoTipo;
  etapa_anterior: string;
  etapa_atual: string;
  pipeline: string;               // SDR, BDR, Match Sales, Closer
  
  // Datas
  data_criacao_lead: string;
  data_registro_agendamento: string;
  data_reuniao_agendada: string;
  data_evento: string;
  data_registro_reuniao_realizada: string;
  data_registro_proposta_enviada: string;
  data_registro_contrato_enviado: string;
  data_registro_venda: string;
  data_registro_perdido: string;
  
  // Valores
  valor_venda: number | null;
  valor_contrato: number | null;
  
  // Contexto
  produto: string;
  origem_lead: string;
  canal_agendamento: string;
  motivo_perdido: string;
  
  // Dados do contato
  nome_contato: string;
  id_contato: number;
  responsavel_contato: string;
  data_criacao_contato: string;
  id_responsavel_contato: number;
  telefone_contato: string;
  email_contato: string;
  cargo_contato: string;
  url_contato: string;
  
  // Campos adicionais
  cargo: string;
  utiliza_voip_crm: string;
  faturamento: string;
  qtd_reunioes: string;
  tamanho_time: string;
  utm_source: string;
  utm_campaign: string;
  utm_medium: string;
  utm_content: string;
  utm_term: string;
  tags: string;
  observacao: string;
}

// Status possíveis na planilha
export type EventoStatus = 
  | "Agendado"
  | "Realizado"
  | "Proposta enviada"
  | "Contrato enviado"
  | "Venda"
  | "Perdido";

// Tipos de evento (valores reais da planilha - coluna D)
export type EventoTipo =
  | "Agendamento"
  | "Reunião Realizada"
  | "Proposta enviada"
  | "Contrato enviado"
  | "Venda realizada";

// Mapeamento de colunas da planilha (índice 0-based)
export const PLANILHA_COLUNAS = {
  NOME_LEAD: 0,
  SDR_RESPONSAVEL: 1,
  STATUS_AGENDAMENTO: 2,
  TIPO_EVENTO: 3,
  DATA_CRIACAO_LEAD: 4,
  DATA_REGISTRO_AGENDAMENTO: 5,
  DATA_REUNIAO_AGENDADA: 6,
  DATA_EVENTO: 7,
  DATA_REGISTRO_REUNIAO_REALIZADA: 8,
  DATA_REGISTRO_PROPOSTA_ENVIADA: 9,
  DATA_REGISTRO_CONTRATO_ENVIADO: 10,
  DATA_REGISTRO_VENDA: 11,
  VALOR_VENDA: 12,
  VALOR_CONTRATO: 13,
  PRODUTO: 14,
  DATA_REGISTRO_PERDIDO: 15,
  MOTIVO_PERDIDO: 16,
  CLOSER_RESPONSAVEL: 17,
  ORIGEM_LEAD: 18,
  CANAL_AGENDAMENTO: 19,
  ID_EVENTO: 20,
  ID_LEAD: 21,
  ID_RESPONSAVEL_LEAD: 22,
  URL_LEAD: 23,
  ETAPA_ANTERIOR: 24,
  ETAPA_ATUAL: 25,
  PIPELINE: 26,
  CARGO: 27,
  UTILIZA_VOIP_CRM: 28,
  FATURAMENTO: 29,
  QTD_REUNIOES: 30,
  TAMANHO_TIME: 31,
  UTM_SOURCE: 32,
  UTM_CAMPAIGN: 33,
  UTM_MEDIUM: 34,
  UTM_CONTENT: 35,
  UTM_TERM: 36,
  TAGS: 37,
  NOME_CONTATO: 38,
  ID_CONTATO: 39,
  RESPONSAVEL_CONTATO: 40,
  DATA_CRIACAO_CONTATO: 41,
  ID_RESPONSAVEL_CONTATO: 42,
  TELEFONE_CONTATO: 43,
  EMAIL_CONTATO: 44,
  CARGO_CONTATO: 45,
  URL_CONTATO: 46,
  OBSERVACAO: 47,
} as const;

// Resposta do Google Sheets API
export interface SheetsApiResponse {
  range: string;
  majorDimension: string;
  values: string[][];
}
