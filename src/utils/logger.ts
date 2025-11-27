/**
 * Logger estruturado para debug em produção
 * Usa stderr para não interferir com a comunicação MCP (que usa stdout)
 */

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
  duration?: number;
}

class Logger {
  private enabled: boolean;
  private minLevel: LogLevel;

  private levels: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  constructor() {
    this.enabled = process.env.KOMMO_DEBUG === "true";
    this.minLevel = (process.env.KOMMO_LOG_LEVEL as LogLevel) || "INFO";
  }

  private shouldLog(level: LogLevel): boolean {
    return this.enabled && this.levels[level] >= this.levels[this.minLevel];
  }

  private formatLog(entry: LogEntry): string {
    const base = `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}`;
    
    if (entry.duration !== undefined) {
      return `${base} (${entry.duration}ms)`;
    }
    
    if (entry.data !== undefined) {
      return `${base}\n${JSON.stringify(entry.data, null, 2)}`;
    }
    
    return base;
  }

  private log(level: LogLevel, context: string, message: string, data?: unknown) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
    };

    // Usar stderr para não interferir com stdout do MCP
    console.error(this.formatLog(entry));
  }

  debug(context: string, message: string, data?: unknown) {
    this.log("DEBUG", context, message, data);
  }

  info(context: string, message: string, data?: unknown) {
    this.log("INFO", context, message, data);
  }

  warn(context: string, message: string, data?: unknown) {
    this.log("WARN", context, message, data);
  }

  error(context: string, message: string, data?: unknown) {
    this.log("ERROR", context, message, data);
  }

  /**
   * Mede o tempo de execução de uma operação
   */
  async time<T>(context: string, operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      
      if (this.shouldLog("DEBUG")) {
        console.error(`[${new Date().toISOString()}] [DEBUG] [${context}] ${operation} (${duration}ms)`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(context, `${operation} falhou após ${duration}ms`, error);
      throw error;
    }
  }
}

export const logger = new Logger();
