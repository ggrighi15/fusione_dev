import mysql from 'mysql2/promise';
import { createLogger } from './logger.js';

class MariaDBManager {
    constructor(config, logger = null) {
        this.config = config;
        this.logger = logger || createLogger('MariaDBManager');
        this.pool = null;
        this.isConnected = false;
        this.connectionRetries = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 segundos
    }

    async connect() {
        try {
            if (this.isConnected) {
                this.logger.warn('MariaDB já está conectado');
                return;
            }

            const dbConfig = this.config.get('database');
            if (!dbConfig) {
                throw new Error('Configuração do banco de dados não encontrada');
            }

            // Configurações do pool de conexões MariaDB
            const poolConfig = {
                host: dbConfig.host || 'localhost',
                port: dbConfig.port || 3306,
                user: dbConfig.username || 'root',
                password: dbConfig.password || '',
                database: dbConfig.database || 'fusione_core',
                connectionLimit: dbConfig.connectionLimit || 10,
                acquireTimeout: dbConfig.timeout || 60000,
                timeout: dbConfig.timeout || 60000,
                reconnect: true,
                charset: 'utf8mb4',
                timezone: 'Z'
            };

            this.logger.info('Conectando ao MariaDB...');
            this.pool = mysql.createPool(poolConfig);
            
            // Testar conexão
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();
            
            this.isConnected = true;
            this.connectionRetries = 0;
            
            this.logger.info('Conectado ao MariaDB com sucesso');
            this.setupEventListeners();
            
        } catch (error) {
            this.logger.error('Erro ao conectar ao MariaDB:', error.message);
            await this.handleConnectionError(error);
        }
    }

    async handleConnectionError(error) {
        this.isConnected = false;
        this.connectionRetries++;
        
        if (this.connectionRetries < this.maxRetries) {
            this.logger.warn(`Tentativa de reconexão ${this.connectionRetries}/${this.maxRetries} em ${this.retryDelay}ms`);
            setTimeout(() => this.connect(), this.retryDelay);
        } else {
            this.logger.error('Máximo de tentativas de conexão atingido');
            throw error;
        }
    }

    setupEventListeners() {
        if (this.pool) {
            this.pool.on('connection', (connection) => {
                this.logger.info(`Nova conexão MariaDB estabelecida: ${connection.threadId}`);
            });

            this.pool.on('error', (error) => {
                this.logger.error('Erro no pool de conexões MariaDB:', error);
                if (error.code === 'PROTOCOL_CONNECTION_LOST') {
                    this.isConnected = false;
                    this.connect();
                }
            });
        }

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    async disconnect() {
        try {
            if (this.pool) {
                this.logger.info('Desconectando do MariaDB...');
                await this.pool.end();
                this.pool = null;
                this.isConnected = false;
                this.logger.info('Desconectado do MariaDB');
            }
        } catch (error) {
            this.logger.error('Erro ao desconectar do MariaDB:', error.message);
        }
    }

    async query(sql, params = []) {
        if (!this.isConnected || !this.pool) {
            throw new Error('MariaDB não está conectado');
        }

        try {
            const [rows, fields] = await this.pool.execute(sql, params);
            return { rows, fields };
        } catch (error) {
            this.logger.error('Erro na query MariaDB:', error.message);
            throw error;
        }
    }

    async transaction(callback) {
        if (!this.isConnected || !this.pool) {
            throw new Error('MariaDB não está conectado');
        }

        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    getPool() {
        return this.pool;
    }

    isHealthy() {
        return this.isConnected && this.pool !== null;
    }

    async getStats() {
        if (!this.isConnected || !this.pool) {
            return { connected: false };
        }

        try {
            const [rows] = await this.pool.execute('SHOW STATUS LIKE "Threads_connected"');
            const [dbRows] = await this.pool.execute('SELECT DATABASE() as current_db');
            
            return {
                connected: true,
                threadsConnected: rows[0]?.Value || 0,
                currentDatabase: dbRows[0]?.current_db || 'unknown',
                poolConnections: this.pool._allConnections?.length || 0,
                freeConnections: this.pool._freeConnections?.length || 0
            };
        } catch (error) {
            this.logger.error('Erro ao obter estatísticas:', error.message);
            return { connected: false, error: error.message };
        }
    }

    // Método para criar tabelas iniciais
    async initializeTables() {
        if (!this.isConnected) {
            throw new Error('MariaDB não está conectado');
        }

        const tables = [
            {
                name: 'users',
                sql: `
                    CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(255) UNIQUE NOT NULL,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        first_name VARCHAR(255),
                        last_name VARCHAR(255),
                        is_active BOOLEAN DEFAULT true,
                        is_admin BOOLEAN DEFAULT false,
                        last_login TIMESTAMP NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `
            },
            {
                name: 'refresh_tokens',
                sql: `
                    CREATE TABLE IF NOT EXISTS refresh_tokens (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        token VARCHAR(500) UNIQUE NOT NULL,
                        expires_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `
            },
            {
                name: 'system_logs',
                sql: `
                    CREATE TABLE IF NOT EXISTS system_logs (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        level VARCHAR(50) NOT NULL,
                        message TEXT NOT NULL,
                        meta JSON,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_level (level),
                        INDEX idx_timestamp (timestamp)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `
            }
        ];

        for (const table of tables) {
            try {
                await this.query(table.sql);
                this.logger.info(`Tabela '${table.name}' criada/verificada com sucesso`);
            } catch (error) {
                this.logger.error(`Erro ao criar tabela '${table.name}':`, error.message);
                throw error;
            }
        }
    }
}

export { MariaDBManager };