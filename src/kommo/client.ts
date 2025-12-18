/**
 * Cliente Kommo para o MCP Server Vorp
 * Usa fetch nativo para requisições à API do Kommo CRM
 */

export interface KommoClientInterface {
  get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  patch<T>(endpoint: string, data?: unknown): Promise<T>;
}

export function createKommoClient(baseUrl: string, accessToken: string): KommoClientInterface {
  const apiUrl = `${baseUrl}/api/v4`;

  async function request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    let url = `${apiUrl}${endpoint}`;
    
    // Adicionar query params
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v, i) => searchParams.append(`${key}[${i}]`, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      }
      url += `?${searchParams.toString()}`;
    }

    const options: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };

    if (data && (method === "POST" || method === "PATCH")) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
      const message = getErrorMessage(response.status, errorData);
      throw new Error(message);
    }

    // Alguns endpoints retornam 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  function getErrorMessage(status: number, data: Record<string, unknown>): string {
    const detail = data.detail || data.title || "";
    
    const messages: Record<number, string> = {
      400: `Requisição inválida: ${detail}`,
      401: "Token expirado ou inválido. Gere um novo token no Kommo.",
      403: "Acesso negado. Verifique as permissões do usuário.",
      404: "Recurso não encontrado. Verifique o ID informado.",
      422: `Dados inválidos: ${detail}`,
      429: "Limite de requisições excedido. Aguarde alguns segundos.",
      500: "Erro interno do Kommo. Tente novamente.",
      502: "Kommo indisponível. Tente novamente em alguns minutos.",
      503: "Kommo em manutenção. Aguarde.",
      504: "Timeout na requisição. Tente novamente.",
    };

    return messages[status] || `Erro HTTP ${status}: ${detail}`;
  }

  return {
    get: <T>(endpoint: string, params?: Record<string, unknown>) => 
      request<T>("GET", endpoint, undefined, params),
    post: <T>(endpoint: string, data?: unknown) => 
      request<T>("POST", endpoint, data),
    patch: <T>(endpoint: string, data?: unknown) => 
      request<T>("PATCH", endpoint, data),
  };
}
