/**
 * Cliente Google Sheets para leitura da Planilha de Eventos Vorp
 * Fonte de verdade para etapas pós-agendamento
 */

import { PlanilhaEvento, PLANILHA_COLUNAS, SheetsApiResponse, EventoStatus, EventoTipo } from './types.js';

export interface SheetsClientInterface {
  getEventos(filters?: EventoFilters): Promise<PlanilhaEvento[]>;
  getEventoByLeadId(leadId: number): Promise<PlanilhaEvento[]>;
  getEventoById(eventoId: string): Promise<PlanilhaEvento | null>;
  getMetricas(filters?: MetricasFilters): Promise<EventoMetricas>;
}

export interface EventoFilters {
  pipeline?: string;           // SDR, BDR, CLOSERS, MATCH_SALES
  tipo_evento?: EventoTipo;    // Tipo do evento (Agendamento, Reunião Realizada, etc)
  sdr_responsavel?: string;
  closer_responsavel?: string;
  data_de?: Date;              // Filtro por Data do evento (coluna H)
  data_ate?: Date;
  data_reuniao_de?: Date;      // Filtro por Data da reunião agendada (coluna G)
  data_reuniao_ate?: Date;
  limit?: number;
}

export interface MetricasFilters {
  pipeline?: string;
  responsavel?: string;
  data_de?: Date;
  data_ate?: Date;
}

export interface EventoMetricas {
  total_leads: number;           // Leads únicos no período
  agendados: number;             // Leads que tiveram agendamento
  realizados: number;            // Leads que tiveram reunião realizada
  propostas: number;             // Leads que receberam proposta
  contratos: number;             // Leads que receberam contrato
  vendas: number;                // Leads que fecharam venda
  perdidos: number;              // Leads perdidos
  valor_total_vendas: number;
  valor_total_contratos: number;
  taxa_conversao_reuniao: number;  // realizados / agendados
  taxa_conversao_venda: number;    // vendas / realizados
  ticket_medio: number;
  // Lista de leads (máximo 10) para cada categoria relevante
  leads_vendas?: LeadResumo[];
  leads_propostas?: LeadResumo[];
  leads_agendados?: LeadResumo[];
}

export interface LeadResumo {
  id_lead: number;
  nome: string;
  pipeline: string;
  sdr_responsavel: string;
  closer_responsavel: string;
  status_atual: string;
  valor_venda?: number | null;
  valor_contrato?: number | null;
  data_ultimo_evento: string;
  url_lead: string;
}

export function createSheetsClient(apiKey: string, spreadsheetId: string, sheetName: string = 'Eventos'): SheetsClientInterface {
  
  // Buscar dados da planilha via API
  async function fetchSheetData(): Promise<string[][]> {
    const range = encodeURIComponent(`${sheetName}!A:AV`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao acessar planilha: ${response.status} - ${error}`);
    }
    
    const data: SheetsApiResponse = await response.json();
    return data.values || [];
  }

  // Converter linha da planilha para objeto PlanilhaEvento
  function parseRow(row: string[]): PlanilhaEvento {
    const getValue = (index: number): string => row[index]?.trim() || '';
    const getNumber = (index: number): number | null => {
      const val = getValue(index).replace(/[R$\s.]/g, '').replace(',', '.');
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };
    const getInt = (index: number): number => {
      const val = getValue(index);
      const num = parseInt(val, 10);
      return isNaN(num) ? 0 : num;
    };

    return {
      nome_lead: getValue(PLANILHA_COLUNAS.NOME_LEAD),
      sdr_responsavel: getValue(PLANILHA_COLUNAS.SDR_RESPONSAVEL),
      status_agendamento: getValue(PLANILHA_COLUNAS.STATUS_AGENDAMENTO) as EventoStatus,
      tipo_evento: getValue(PLANILHA_COLUNAS.TIPO_EVENTO) as EventoTipo,
      data_criacao_lead: getValue(PLANILHA_COLUNAS.DATA_CRIACAO_LEAD),
      data_registro_agendamento: getValue(PLANILHA_COLUNAS.DATA_REGISTRO_AGENDAMENTO),
      data_reuniao_agendada: getValue(PLANILHA_COLUNAS.DATA_REUNIAO_AGENDADA),
      data_evento: getValue(PLANILHA_COLUNAS.DATA_EVENTO),
      data_registro_reuniao_realizada: getValue(PLANILHA_COLUNAS.DATA_REGISTRO_REUNIAO_REALIZADA),
      data_registro_proposta_enviada: getValue(PLANILHA_COLUNAS.DATA_REGISTRO_PROPOSTA_ENVIADA),
      data_registro_contrato_enviado: getValue(PLANILHA_COLUNAS.DATA_REGISTRO_CONTRATO_ENVIADO),
      data_registro_venda: getValue(PLANILHA_COLUNAS.DATA_REGISTRO_VENDA),
      valor_venda: getNumber(PLANILHA_COLUNAS.VALOR_VENDA),
      valor_contrato: getNumber(PLANILHA_COLUNAS.VALOR_CONTRATO),
      produto: getValue(PLANILHA_COLUNAS.PRODUTO),
      data_registro_perdido: getValue(PLANILHA_COLUNAS.DATA_REGISTRO_PERDIDO),
      motivo_perdido: getValue(PLANILHA_COLUNAS.MOTIVO_PERDIDO),
      closer_responsavel: getValue(PLANILHA_COLUNAS.CLOSER_RESPONSAVEL),
      origem_lead: getValue(PLANILHA_COLUNAS.ORIGEM_LEAD),
      canal_agendamento: getValue(PLANILHA_COLUNAS.CANAL_AGENDAMENTO),
      id_evento: getValue(PLANILHA_COLUNAS.ID_EVENTO),
      id_lead: getInt(PLANILHA_COLUNAS.ID_LEAD),
      id_responsavel_lead: getInt(PLANILHA_COLUNAS.ID_RESPONSAVEL_LEAD),
      url_lead: getValue(PLANILHA_COLUNAS.URL_LEAD),
      etapa_anterior: getValue(PLANILHA_COLUNAS.ETAPA_ANTERIOR),
      etapa_atual: getValue(PLANILHA_COLUNAS.ETAPA_ATUAL),
      pipeline: getValue(PLANILHA_COLUNAS.PIPELINE),
      cargo: getValue(PLANILHA_COLUNAS.CARGO),
      utiliza_voip_crm: getValue(PLANILHA_COLUNAS.UTILIZA_VOIP_CRM),
      faturamento: getValue(PLANILHA_COLUNAS.FATURAMENTO),
      qtd_reunioes: getValue(PLANILHA_COLUNAS.QTD_REUNIOES),
      tamanho_time: getValue(PLANILHA_COLUNAS.TAMANHO_TIME),
      utm_source: getValue(PLANILHA_COLUNAS.UTM_SOURCE),
      utm_campaign: getValue(PLANILHA_COLUNAS.UTM_CAMPAIGN),
      utm_medium: getValue(PLANILHA_COLUNAS.UTM_MEDIUM),
      utm_content: getValue(PLANILHA_COLUNAS.UTM_CONTENT),
      utm_term: getValue(PLANILHA_COLUNAS.UTM_TERM),
      tags: getValue(PLANILHA_COLUNAS.TAGS),
      nome_contato: getValue(PLANILHA_COLUNAS.NOME_CONTATO),
      id_contato: getInt(PLANILHA_COLUNAS.ID_CONTATO),
      responsavel_contato: getValue(PLANILHA_COLUNAS.RESPONSAVEL_CONTATO),
      data_criacao_contato: getValue(PLANILHA_COLUNAS.DATA_CRIACAO_CONTATO),
      id_responsavel_contato: getInt(PLANILHA_COLUNAS.ID_RESPONSAVEL_CONTATO),
      telefone_contato: getValue(PLANILHA_COLUNAS.TELEFONE_CONTATO),
      email_contato: getValue(PLANILHA_COLUNAS.EMAIL_CONTATO),
      cargo_contato: getValue(PLANILHA_COLUNAS.CARGO_CONTATO),
      url_contato: getValue(PLANILHA_COLUNAS.URL_CONTATO),
      observacao: getValue(PLANILHA_COLUNAS.OBSERVACAO),
    };
  }

  // Converter data BR (dd/mm/yyyy HH:mm:ss) para Date
  function parseDateBR(dateStr: string): Date | null {
    if (!dateStr) return null;
    // Formato: 30/08/2025 22:00:29
    const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2})?:?(\d{2})?:?(\d{2})?/);
    if (!match) return null;
    const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  }

  // Aplicar filtros nos eventos
  function applyFilters(eventos: PlanilhaEvento[], filters: EventoFilters): PlanilhaEvento[] {
    let filtered = eventos;

    if (filters.pipeline) {
      const pipelineNorm = filters.pipeline.toLowerCase();
      filtered = filtered.filter(e => 
        e.pipeline.toLowerCase().includes(pipelineNorm) ||
        (pipelineNorm === 'closers' && e.pipeline.toLowerCase().includes('closer'))
      );
    }

    // Filtrar por tipo_evento (Reunião Agendada, Reunião Realizada, etc)
    if (filters.tipo_evento) {
      const tipoNorm = filters.tipo_evento.toLowerCase();
      filtered = filtered.filter(e => 
        e.tipo_evento.toLowerCase().includes(tipoNorm)
      );
    }

    if (filters.sdr_responsavel) {
      filtered = filtered.filter(e => 
        e.sdr_responsavel.toLowerCase().includes(filters.sdr_responsavel!.toLowerCase())
      );
    }

    if (filters.closer_responsavel) {
      filtered = filtered.filter(e => 
        e.closer_responsavel.toLowerCase().includes(filters.closer_responsavel!.toLowerCase())
      );
    }

    // Filtrar por Data do Evento (coluna H) - quando o evento aconteceu
    if (filters.data_de) {
      filtered = filtered.filter(e => {
        const dataEvento = parseDateBR(e.data_evento);
        return dataEvento && dataEvento >= filters.data_de!;
      });
    }

    if (filters.data_ate) {
      filtered = filtered.filter(e => {
        const dataEvento = parseDateBR(e.data_evento);
        return dataEvento && dataEvento <= filters.data_ate!;
      });
    }

    // Filtrar por Data da Reunião Agendada (coluna G) - quando a reunião vai/foi acontecer
    // Útil para: "Quantas reuniões temos agendadas para amanhã?"
    if (filters.data_reuniao_de) {
      filtered = filtered.filter(e => {
        const dataReuniao = parseDateBR(e.data_reuniao_agendada);
        return dataReuniao && dataReuniao >= filters.data_reuniao_de!;
      });
    }

    if (filters.data_reuniao_ate) {
      filtered = filtered.filter(e => {
        const dataReuniao = parseDateBR(e.data_reuniao_agendada);
        return dataReuniao && dataReuniao <= filters.data_reuniao_ate!;
      });
    }

    if (filters.limit && filters.limit > 0) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  return {
    // Buscar eventos com filtros
    async getEventos(filters?: EventoFilters): Promise<PlanilhaEvento[]> {
      const rows = await fetchSheetData();
      
      // Pular header (primeira linha)
      const dataRows = rows.slice(1);
      
      // Converter para objetos
      const eventos = dataRows
        .filter(row => row.length > 0 && row[PLANILHA_COLUNAS.ID_LEAD]) // Filtrar linhas vazias
        .map(parseRow);
      
      // Aplicar filtros se houver
      return filters ? applyFilters(eventos, filters) : eventos;
    },

    // Buscar eventos de um lead específico
    async getEventoByLeadId(leadId: number): Promise<PlanilhaEvento[]> {
      const eventos = await this.getEventos();
      return eventos.filter(e => e.id_lead === leadId);
    },

    // Buscar evento por ID único
    async getEventoById(eventoId: string): Promise<PlanilhaEvento | null> {
      const eventos = await this.getEventos();
      return eventos.find(e => e.id_evento === eventoId) || null;
    },

    // Calcular métricas
    async getMetricas(filters?: MetricasFilters): Promise<EventoMetricas> {
      let eventos = await this.getEventos();
      
      // Aplicar filtros de data - SOMENTE pela coluna "Data do evento"
      if (filters?.data_de || filters?.data_ate) {
        eventos = eventos.filter(e => {
          const dataEvento = parseDateBR(e.data_evento);
          if (!dataEvento) return false;
          
          if (filters.data_de && dataEvento < filters.data_de) return false;
          if (filters.data_ate && dataEvento > filters.data_ate) return false;
          
          return true;
        });
      }

      // Aplicar filtro de pipeline
      if (filters?.pipeline) {
        const pipelineNorm = filters.pipeline.toLowerCase();
        eventos = eventos.filter(e => 
          e.pipeline.toLowerCase().includes(pipelineNorm) ||
          (pipelineNorm === 'closers' && e.pipeline.toLowerCase().includes('closer'))
        );
      }

      // Aplicar filtro de responsável
      if (filters?.responsavel) {
        eventos = eventos.filter(e => 
          e.sdr_responsavel.toLowerCase().includes(filters.responsavel!.toLowerCase()) ||
          e.closer_responsavel.toLowerCase().includes(filters.responsavel!.toLowerCase())
        );
      }

      // Contar EVENTOS por tipo_evento (coluna D)
      // Cada linha é um evento único - contamos eventos, não leads
      let agendados = 0;
      let realizados = 0;
      let propostas = 0;
      let contratos = 0;
      let vendas = 0;
      let perdidos = 0;
      let valorTotalVendas = 0;
      let valorTotalContratos = 0;
      
      const leadsVendas: LeadResumo[] = [];
      const leadsPropostas: LeadResumo[] = [];
      const leadsAgendados: LeadResumo[] = [];
      const leadsUnicos = new Set<number>();
      
      for (const evento of eventos) {
        leadsUnicos.add(evento.id_lead);
        
        const tipoEvento = evento.tipo_evento.toLowerCase();
        
        // Contar por tipo_evento
        if (tipoEvento === 'agendamento') {
          agendados++;
          if (leadsAgendados.length < 10) {
            leadsAgendados.push(criarLeadResumo(evento));
          }
        }
        if (tipoEvento === 'reunião realizada') {
          realizados++;
        }
        if (tipoEvento === 'proposta enviada') {
          propostas++;
          if (leadsPropostas.length < 10) {
            leadsPropostas.push(criarLeadResumo(evento));
          }
        }
        if (tipoEvento === 'contrato enviado') {
          contratos++;
          if (evento.valor_contrato) valorTotalContratos += evento.valor_contrato;
        }
        if (tipoEvento === 'venda realizada') {
          vendas++;
          if (evento.valor_venda) valorTotalVendas += evento.valor_venda;
          if (leadsVendas.length < 10) {
            leadsVendas.push(criarLeadResumo(evento));
          }
        }
        if (tipoEvento === 'perdido') {
          perdidos++;
        }
      }
      
      function criarLeadResumo(e: PlanilhaEvento): LeadResumo {
        return {
          id_lead: e.id_lead,
          nome: e.nome_lead,
          pipeline: e.pipeline,
          sdr_responsavel: e.sdr_responsavel,
          closer_responsavel: e.closer_responsavel,
          status_atual: e.status_agendamento,
          valor_venda: e.valor_venda,
          valor_contrato: e.valor_contrato,
          data_ultimo_evento: e.data_evento,
          url_lead: e.url_lead,
        };
      }

      return {
        total_leads: leadsUnicos.size,
        agendados,
        realizados,
        propostas,
        contratos,
        vendas,
        perdidos,
        valor_total_vendas: valorTotalVendas,
        valor_total_contratos: valorTotalContratos,
        taxa_conversao_reuniao: agendados > 0 ? Math.round((realizados / agendados) * 100) : 0,
        taxa_conversao_venda: realizados > 0 ? Math.round((vendas / realizados) * 100) : 0,
        ticket_medio: vendas > 0 ? Math.round(valorTotalVendas / vendas) : 0,
        leads_vendas: leadsVendas.length > 0 ? leadsVendas : undefined,
        leads_propostas: leadsPropostas.length > 0 ? leadsPropostas : undefined,
        leads_agendados: leadsAgendados.length > 0 ? leadsAgendados : undefined,
      };
    },
  };
}
