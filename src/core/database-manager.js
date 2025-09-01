import { MariaDBManager } from './mariadb-manager.js';
import { createLogger } from './logger.js';

class DatabaseManager {
    constructor(config, logger = null) {
        this.config = config;
        this.logger = logger || createLogger('DatabaseManager');
        this.mariadb = new MariaDBManager(config, this.logger);
        this.isConnected = false;
        this.connectionRetries = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 segundos
    }

    async connect() {
        try {
            if (this.isConnected) {
                this.logger.warn('Database já está conectado');
                return;
            }

            const dbConfig = this.config.get('database');
            if (!dbConfig) {
                throw new Error('Configuração do banco de dados não encontrada');
            }

            this.logger.info('Conectando ao banco de dados MariaDB...');
            await this.mariadb.connect();
            
            // Inicializar tabelas básicas
            await this.mariadb.initializeTables();
            
            this.isConnected = true;
            this.connectionRetries = 0;
            
            this.logger.info('Conectado ao MariaDB com sucesso');
            
        } catch (error) {
            this.logger.error('Erro ao conectar ao banco de dados:', error.message);
            await this.handleConnectionError(error);
        }
    }

    // Método removido - não necessário para MariaDB

    async handleConnectionError(error) {
        this.connectionRetries++;
        
        if (this.connectionRetries < this.maxRetries) {
            this.logger.warn(`Tentativa de reconexão ${this.connectionRetries}/${this.maxRetries} em ${this.retryDelay}ms`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            return await this.connect();
        } else {
            this.logger.error('Máximo de tentativas de conexão excedido');
            throw error;
        }
    }

    // Event listeners são gerenciados pelo MariaDBManager

    async disconnect() {
        try {
            if (!this.isConnected) {
                this.logger.warn('Database já está desconectado');
                return;
            }

            this.logger.info('Desconectando do banco de dados...');
            await this.mariadb.disconnect();
            
            this.isConnected = false;
            this.logger.info('Desconectado do banco de dados');
            
        } catch (error) {
            this.logger.error('Erro ao desconectar do banco de dados:', error.message);
        }
    }

    getConnection() {
        return this.mariadb.getPool();
    }

    isHealthy() {
        return this.isConnected && this.mariadb.isHealthy();
    }

    async getStats() {
        if (!this.isConnected) {
            return { connected: false };
        }

        return await this.mariadb.getStats();
    }

    // Métodos de conveniência para queries
    async query(sql, params = []) {
        return await this.mariadb.query(sql, params);
    }

    async transaction(callback) {
        return await this.mariadb.transaction(callback);
    }
}

export { DatabaseManager };