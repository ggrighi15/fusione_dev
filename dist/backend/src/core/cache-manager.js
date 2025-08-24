import redis from 'redis';
import { createLogger } from './logger.js';

/**
 * Gerenciador de Cache Redis
 * Fornece funcionalidades de cache distribuído com Redis
 */
class CacheManager {
    constructor(config = {}, logger = null) {
        this.config = {
            host: config.host || 'localhost',
            port: config.port || 6379,
            password: config.password || null,
            db: config.db || 0,
            keyPrefix: config.keyPrefix || 'fusione:',
            defaultTTL: config.defaultTTL || 3600, // 1 hora em segundos
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };
        
        this.logger = logger || createLogger('CacheManager');
        this.client = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
    }

    /**
     * Conecta ao Redis
     * @returns {Promise<boolean>} True se conectado com sucesso
     */
    async connect() {
        try {
            this.logger.info('Conectando ao Redis...', {
                host: this.config.host,
                port: this.config.port,
                db: this.config.db
            });

            // Configuração do cliente Redis
            const clientConfig = {
                socket: {
                    host: this.config.host,
                    port: this.config.port,
                    reconnectStrategy: (retries) => {
                        if (retries > this.config.retryAttempts) {
                            this.logger.error('Máximo de tentativas de reconexão atingido');
                            return false;
                        }
                        const delay = Math.min(retries * this.config.retryDelay, 30000);
                        this.logger.warn(`Tentativa de reconexão ${retries} em ${delay}ms`);
                        return delay;
                    }
                },
                database: this.config.db
            };

            if (this.config.password) {
                clientConfig.password = this.config.password;
            }

            this.client = redis.createClient(clientConfig);

            // Event listeners
            this.client.on('connect', () => {
                this.logger.info('Conectado ao Redis');
                this.isConnected = true;
                this.connectionAttempts = 0;
            });

            this.client.on('error', (error) => {
                this.logger.error('Erro no Redis:', error);
                this.isConnected = false;
            });

            this.client.on('end', () => {
                this.logger.warn('Conexão com Redis encerrada');
                this.isConnected = false;
            });

            this.client.on('reconnecting', () => {
                this.connectionAttempts++;
                this.logger.info(`Reconectando ao Redis (tentativa ${this.connectionAttempts})`);
            });

            await this.client.connect();
            
            // Teste de conectividade
            await this.client.ping();
            
            this.logger.info('Cache Redis inicializado com sucesso');
            return true;

        } catch (error) {
            this.logger.error('Erro ao conectar ao Redis:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Desconecta do Redis
     */
    async disconnect() {
        if (this.client) {
            try {
                await this.client.quit();
                this.logger.info('Desconectado do Redis');
            } catch (error) {
                this.logger.error('Erro ao desconectar do Redis:', error);
            }
        }
        this.isConnected = false;
    }

    /**
     * Gera chave com prefixo
     * @param {string} key - Chave original
     * @returns {string} Chave com prefixo
     */
    _getKey(key) {
        return `${this.config.keyPrefix}${key}`;
    }

    /**
     * Define um valor no cache
     * @param {string} key - Chave
     * @param {*} value - Valor
     * @param {number} ttl - Tempo de vida em segundos (opcional)
     * @returns {Promise<boolean>} True se definido com sucesso
     */
    async set(key, value, ttl = null) {
        if (!this.isConnected) {
            this.logger.warn('Cache não conectado, operação ignorada');
            return false;
        }

        try {
            const serializedValue = JSON.stringify(value);
            const cacheKey = this._getKey(key);
            const expiration = ttl || this.config.defaultTTL;

            await this.client.setEx(cacheKey, expiration, serializedValue);
            
            this.logger.debug(`Cache definido: ${key} (TTL: ${expiration}s)`);
            return true;

        } catch (error) {
            this.logger.error(`Erro ao definir cache para ${key}:`, error);
            return false;
        }
    }

    /**
     * Obtém um valor do cache
     * @param {string} key - Chave
     * @returns {Promise<*|null>} Valor ou null se não encontrado
     */
    async get(key) {
        if (!this.isConnected) {
            this.logger.warn('Cache não conectado, retornando null');
            return null;
        }

        try {
            const cacheKey = this._getKey(key);
            const value = await this.client.get(cacheKey);
            
            if (value === null) {
                this.logger.debug(`Cache miss: ${key}`);
                return null;
            }

            const parsedValue = JSON.parse(value);
            this.logger.debug(`Cache hit: ${key}`);
            return parsedValue;

        } catch (error) {
            this.logger.error(`Erro ao obter cache para ${key}:`, error);
            return null;
        }
    }

    /**
     * Remove um valor do cache
     * @param {string} key - Chave
     * @returns {Promise<boolean>} True se removido com sucesso
     */
    async del(key) {
        if (!this.isConnected) {
            this.logger.warn('Cache não conectado, operação ignorada');
            return false;
        }

        try {
            const cacheKey = this._getKey(key);
            const result = await this.client.del(cacheKey);
            
            this.logger.debug(`Cache removido: ${key}`);
            return result > 0;

        } catch (error) {
            this.logger.error(`Erro ao remover cache para ${key}:`, error);
            return false;
        }
    }

    /**
     * Verifica se uma chave existe no cache
     * @param {string} key - Chave
     * @returns {Promise<boolean>} True se existe
     */
    async exists(key) {
        if (!this.isConnected) {
            return false;
        }

        try {
            const cacheKey = this._getKey(key);
            const result = await this.client.exists(cacheKey);
            return result === 1;

        } catch (error) {
            this.logger.error(`Erro ao verificar existência de ${key}:`, error);
            return false;
        }
    }

    /**
     * Define TTL para uma chave existente
     * @param {string} key - Chave
     * @param {number} ttl - Tempo de vida em segundos
     * @returns {Promise<boolean>} True se definido com sucesso
     */
    async expire(key, ttl) {
        if (!this.isConnected) {
            return false;
        }

        try {
            const cacheKey = this._getKey(key);
            const result = await this.client.expire(cacheKey, ttl);
            return result === 1;

        } catch (error) {
            this.logger.error(`Erro ao definir TTL para ${key}:`, error);
            return false;
        }
    }

    /**
     * Obtém TTL restante de uma chave
     * @param {string} key - Chave
     * @returns {Promise<number>} TTL em segundos (-1 se sem TTL, -2 se não existe)
     */
    async ttl(key) {
        if (!this.isConnected) {
            return -2;
        }

        try {
            const cacheKey = this._getKey(key);
            return await this.client.ttl(cacheKey);

        } catch (error) {
            this.logger.error(`Erro ao obter TTL de ${key}:`, error);
            return -2;
        }
    }

    /**
     * Limpa todas as chaves com o prefixo configurado
     * @returns {Promise<number>} Número de chaves removidas
     */
    async flush() {
        if (!this.isConnected) {
            return 0;
        }

        try {
            const pattern = `${this.config.keyPrefix}*`;
            const keys = await this.client.keys(pattern);
            
            if (keys.length === 0) {
                return 0;
            }

            const result = await this.client.del(keys);
            this.logger.info(`Cache limpo: ${result} chaves removidas`);
            return result;

        } catch (error) {
            this.logger.error('Erro ao limpar cache:', error);
            return 0;
        }
    }

    /**
     * Obtém estatísticas do cache
     * @returns {Promise<Object>} Estatísticas
     */
    async getStats() {
        if (!this.isConnected) {
            return {
                connected: false,
                keys: 0,
                memory: 0
            };
        }

        try {
            const info = await this.client.info('memory');
            const pattern = `${this.config.keyPrefix}*`;
            const keys = await this.client.keys(pattern);
            
            // Parse memory info
            const memoryMatch = info.match(/used_memory:(\d+)/);
            const memory = memoryMatch ? parseInt(memoryMatch[1]) : 0;

            return {
                connected: this.isConnected,
                keys: keys.length,
                memory: memory,
                memoryHuman: this._formatBytes(memory)
            };

        } catch (error) {
            this.logger.error('Erro ao obter estatísticas:', error);
            return {
                connected: false,
                keys: 0,
                memory: 0,
                error: error.message
            };
        }
    }

    /**
     * Formata bytes em formato legível
     * @param {number} bytes - Bytes
     * @returns {string} Formato legível
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Wrapper para operações com fallback
     * Executa uma função e retorna o resultado do cache ou executa a função se não estiver em cache
     * @param {string} key - Chave do cache
     * @param {Function} fn - Função a ser executada
     * @param {number} ttl - TTL opcional
     * @returns {Promise<*>} Resultado
     */
    async remember(key, fn, ttl = null) {
        try {
            // Tenta obter do cache primeiro
            const cached = await this.get(key);
            if (cached !== null) {
                return cached;
            }

            // Se não estiver em cache, executa a função
            const result = await fn();
            
            // Salva no cache para próximas consultas
            await this.set(key, result, ttl);
            
            return result;

        } catch (error) {
            this.logger.error(`Erro em remember para ${key}:`, error);
            // Em caso de erro, executa a função diretamente
            return await fn();
        }
    }

    /**
     * Verifica se o cache está saudável
     * @returns {Promise<Object>} Status de saúde
     */
    async healthCheck() {
        const startTime = Date.now();
        
        try {
            if (!this.isConnected) {
                return {
                    status: 'unhealthy',
                    message: 'Não conectado ao Redis',
                    responseTime: 0
                };
            }

            // Teste de ping
            await this.client.ping();
            
            // Teste de escrita/leitura
            const testKey = 'health_check_test';
            const testValue = { timestamp: Date.now() };
            
            await this.set(testKey, testValue, 10); // TTL de 10 segundos
            const retrieved = await this.get(testKey);
            await this.del(testKey);
            
            const responseTime = Date.now() - startTime;
            
            if (JSON.stringify(retrieved) === JSON.stringify(testValue)) {
                return {
                    status: 'healthy',
                    message: 'Cache funcionando corretamente',
                    responseTime: responseTime
                };
            } else {
                return {
                    status: 'unhealthy',
                    message: 'Falha no teste de escrita/leitura',
                    responseTime: responseTime
                };
            }

        } catch (error) {
            return {
                status: 'unhealthy',
                message: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }
}

export default CacheManager;