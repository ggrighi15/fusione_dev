import mongoose from 'mongoose';
import { createLogger } from './logger.js';

class DatabaseManager {
    constructor(config, logger = null) {
        this.config = config;
        this.logger = logger || createLogger('DatabaseManager');
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

            const connectionString = this.buildConnectionString(dbConfig);
            
            // Configurações do Mongoose
            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: dbConfig.maxPoolSize || 10,
                serverSelectionTimeoutMS: dbConfig.serverSelectionTimeoutMS || 5000,
                socketTimeoutMS: dbConfig.socketTimeoutMS || 45000,
                bufferMaxEntries: 0,
                bufferCommands: false,
                ...dbConfig.options
            };

            this.logger.info('Conectando ao banco de dados...');
            await mongoose.connect(connectionString, options);
            
            this.isConnected = true;
            this.connectionRetries = 0;
            
            this.logger.info('Conectado ao banco de dados com sucesso');
            this.setupEventListeners();
            
        } catch (error) {
            this.logger.error('Erro ao conectar ao banco de dados:', error.message);
            await this.handleConnectionError(error);
        }
    }

    buildConnectionString(dbConfig) {
        const { host, port, database, username, password, authSource } = dbConfig;
        
        let connectionString = 'mongodb://';
        
        if (username && password) {
            connectionString += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
        }
        
        connectionString += `${host}:${port}/${database}`;
        
        if (authSource) {
            connectionString += `?authSource=${authSource}`;
        }
        
        return connectionString;
    }

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

    setupEventListeners() {
        mongoose.connection.on('connected', () => {
            this.logger.info('Mongoose conectado ao MongoDB');
        });

        mongoose.connection.on('error', (error) => {
            this.logger.error('Erro na conexão do Mongoose:', error);
        });

        mongoose.connection.on('disconnected', () => {
            this.logger.warn('Mongoose desconectado do MongoDB');
            this.isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            this.logger.info('Mongoose reconectado ao MongoDB');
            this.isConnected = true;
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    async disconnect() {
        try {
            if (!this.isConnected) {
                this.logger.warn('Database já está desconectado');
                return;
            }

            this.logger.info('Desconectando do banco de dados...');
            await mongoose.connection.close();
            this.isConnected = false;
            this.logger.info('Desconectado do banco de dados');
        } catch (error) {
            this.logger.error('Erro ao desconectar do banco de dados:', error.message);
            throw error;
        }
    }

    getConnection() {
        return mongoose.connection;
    }

    isHealthy() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }

    getStats() {
        if (!this.isConnected) {
            return { connected: false };
        }

        const connection = mongoose.connection;
        return {
            connected: true,
            readyState: connection.readyState,
            host: connection.host,
            port: connection.port,
            name: connection.name,
            collections: Object.keys(connection.collections).length
        };
    }
}

export { DatabaseManager };