/**
 * Cache simples em memória com TTL (Time To Live)
 * Útil para evitar chamadas repetidas à API Kommo
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLSeconds: number = 300) {
    // Padrão: 5 minutos
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  /**
   * Armazena um valor no cache
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Recupera um valor do cache
   * Retorna undefined se não existir ou estiver expirado
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Verificar se expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  /**
   * Verifica se uma chave existe e não está expirada
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Remove uma chave do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Executa uma função e cacheia o resultado
   * Se já existir no cache, retorna o valor cacheado
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn();
    this.set(key, result, ttlSeconds);
    return result;
  }

  /**
   * Retorna estatísticas do cache
   */
  stats(): { size: number; keys: string[] } {
    // Limpar entradas expiradas primeiro
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Cache para pipelines (muda pouco, pode ter TTL longo)
export const pipelinesCache = new MemoryCache(600); // 10 minutos

// Cache geral (TTL curto para dados que mudam mais)
export const generalCache = new MemoryCache(60); // 1 minuto
