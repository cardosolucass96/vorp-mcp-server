import { AxiosError } from "axios";

export class KommoError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = "KommoError";
  }
}

/**
 * Mapeamento de códigos de erro HTTP para mensagens amigáveis e sugestões
 */
const ERROR_MESSAGES: Record<number, { message: string; suggestion: string }> = {
  400: {
    message: "Requisição inválida",
    suggestion: "Verifique se os parâmetros estão corretos. IDs devem ser números positivos.",
  },
  401: {
    message: "Não autorizado",
    suggestion: "O token de acesso expirou ou é inválido. Gere um novo token no Kommo.",
  },
  403: {
    message: "Acesso negado",
    suggestion: "O usuário não tem permissão para esta operação. Verifique as permissões no Kommo.",
  },
  404: {
    message: "Recurso não encontrado",
    suggestion: "O ID informado não existe. Use kommo_list_leads para ver os IDs válidos.",
  },
  422: {
    message: "Dados inválidos",
    suggestion: "Os dados enviados não são válidos. Verifique campos obrigatórios e formatos.",
  },
  429: {
    message: "Limite de requisições excedido",
    suggestion: "Aguarde alguns segundos antes de tentar novamente.",
  },
  500: {
    message: "Erro interno do servidor Kommo",
    suggestion: "Problema temporário. Tente novamente em alguns segundos.",
  },
  502: {
    message: "Servidor Kommo indisponível",
    suggestion: "Problema temporário. Tente novamente em alguns segundos.",
  },
  503: {
    message: "Serviço Kommo em manutenção",
    suggestion: "Aguarde alguns minutos e tente novamente.",
  },
  504: {
    message: "Timeout na API Kommo",
    suggestion: "A requisição demorou demais. Tente novamente ou reduza a quantidade de dados.",
  },
};

export function formatError(error: unknown): string {
  // Erro do Axios com resposta HTTP
  if (error instanceof AxiosError && error.response) {
    const status = error.response.status;
    const errorInfo = ERROR_MESSAGES[status];
    const apiDetail = error.response.data?.detail || error.response.data?.title || "";
    
    if (errorInfo) {
      let msg = `${errorInfo.message} (${status})`;
      if (apiDetail) {
        msg += `: ${apiDetail}`;
      }
      msg += `\n💡 Sugestão: ${errorInfo.suggestion}`;
      return msg;
    }
    
    return `Erro HTTP ${status}: ${apiDetail || error.message}`;
  }

  // Erro do Axios sem resposta (timeout, rede)
  if (error instanceof AxiosError) {
    if (error.code === "ECONNABORTED") {
      return "Timeout: A requisição demorou mais de 30 segundos.\n💡 Sugestão: Tente novamente ou reduza a quantidade de dados.";
    }
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return "Erro de conexão: Não foi possível conectar ao Kommo.\n💡 Sugestão: Verifique sua conexão com a internet.";
    }
    return `Erro de rede: ${error.message}`;
  }

  // KommoError customizado
  if (error instanceof KommoError) {
    let msg = error.message;
    if (error.suggestion) {
      msg += `\n💡 Sugestão: ${error.suggestion}`;
    }
    return msg;
  }

  // Erro genérico
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  return "Erro desconhecido. Tente novamente.";
}

export function createErrorResponse(error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `❌ Erro: ${formatError(error)}`,
      },
    ],
    isError: true,
  };
}

export function createSuccessResponse(data: unknown, message?: string) {
  const text = message
    ? `✅ ${message}\n\n${JSON.stringify(data, null, 2)}`
    : JSON.stringify(data, null, 2);

  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
}

