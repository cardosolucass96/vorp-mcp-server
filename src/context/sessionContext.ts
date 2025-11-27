/**
 * Contexto de Sessão para SDR
 * 
 * Controla qual lead está em atendimento no momento.
 * O agente só pode modificar o lead que está no contexto ativo.
 */

export interface SessionContext {
  leadId: number | null;
  leadName: string | null;
  startedAt: Date | null;
  userId?: number;
}

class SessionManager {
  private context: SessionContext = {
    leadId: null,
    leadName: null,
    startedAt: null,
  };

  /**
   * Inicia um atendimento com um lead específico
   */
  startSession(leadId: number, leadName: string, userId?: number): void {
    this.context = {
      leadId,
      leadName,
      startedAt: new Date(),
      userId,
    };
  }

  /**
   * Encerra o atendimento atual
   */
  endSession(): void {
    this.context = {
      leadId: null,
      leadName: null,
      startedAt: null,
    };
  }

  /**
   * Retorna o contexto atual
   */
  getContext(): SessionContext {
    return { ...this.context };
  }

  /**
   * Verifica se há um atendimento ativo
   */
  hasActiveSession(): boolean {
    return this.context.leadId !== null;
  }

  /**
   * Verifica se o lead informado é o lead em atendimento
   */
  isAuthorized(leadId: number): boolean {
    return this.context.leadId === leadId;
  }

  /**
   * Retorna o ID do lead em atendimento (ou null)
   */
  getActiveLeadId(): number | null {
    return this.context.leadId;
  }

  /**
   * Retorna o nome do lead em atendimento
   */
  getActiveLeadName(): string | null {
    return this.context.leadName;
  }
}

// Singleton
export const sessionManager = new SessionManager();
