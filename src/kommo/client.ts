import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";
import { logger } from "../utils/logger.js";

export interface KommoApiError {
  status: number;
  title: string;
  detail?: string;
}

class KommoClient {
  private client: AxiosInstance | null = null;

  private getClient(): AxiosInstance {
    if (this.client) {
      return this.client;
    }

    const baseURL = process.env.KOMMO_BASE_URL;
    const accessToken = process.env.KOMMO_ACCESS_TOKEN;

    if (!baseURL) {
      throw new Error("KOMMO_BASE_URL não está configurado nas variáveis de ambiente");
    }

    if (!accessToken) {
      throw new Error("KOMMO_ACCESS_TOKEN não está configurado nas variáveis de ambiente");
    }

    this.client = axios.create({
      baseURL: `${baseURL}/api/v4`,
      timeout: 30000, // 30 segundos de timeout
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // Interceptor para log de requests
    this.client.interceptors.request.use((config) => {
      logger.debug("KommoClient", `${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Interceptor para log de responses
    this.client.interceptors.response.use(
      (response) => {
        logger.debug("KommoClient", `Response ${response.status} ${response.config.url}`);
        return response;
      },
      (error: AxiosError<KommoApiError>) => {
        const status = error.response?.status;
        const url = error.config?.url;
        
        logger.error("KommoClient", `Erro ${status} em ${url}`, {
          status,
          url,
          data: error.response?.data,
        });
        
        // Deixar o erro propagar para ser tratado pelo formatError
        throw error;
      }
    );

    logger.info("KommoClient", "Cliente inicializado com sucesso", { baseURL });
    return this.client;
  }

  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.getClient().get<T>(endpoint, config);
    return response.data;
  }

  async post<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.getClient().post<T>(endpoint, data, config);
    return response.data;
  }

  async patch<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.getClient().patch<T>(endpoint, data, config);
    return response.data;
  }
}

// Singleton do cliente (lazy initialization)
export const kommoClient = new KommoClient();
