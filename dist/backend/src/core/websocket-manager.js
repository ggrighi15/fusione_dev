import { Server } from 'socket.io';
import { createLogger } from './logger.js';

/**
 * Gerenciador de WebSockets para comunicação em tempo real
 * Fornece funcionalidades para broadcasting, salas e eventos personalizados
 */
class WebSocketManager {
    constructor(httpServer, config = {}, logger = null) {
        this.httpServer = httpServer;
        this.config = {
            cors: {
                origin: config.allowedOrigins || ['http://localhost:3000', 'http://localhost:3001'],
                methods: ['GET', 'POST']
            },
            pingTimeout: config.pingTimeout || 60000,
            pingInterval: config.pingInterval || 25000,
            maxHttpBufferSize: config.maxHttpBufferSize || 1e6,
            transports: config.transports || ['websocket', 'polling'],
            ...config
        };
        
        this.logger = logger || createLogger('WebSocketManager');
        this.io = null;
        this.connectedClients = new Map();
        this.rooms = new Map();
        this.eventHandlers = new Map();
        this.middleware = [];
        this.isInitialized = false;
    }

    /**
     * Inicializa o servidor WebSocket
     */
    initialize() {
        try {
            this.io = new Server(this.httpServer, this.config);
            this.setupEventHandlers();
            this.setupMiddleware();
            this.isInitialized = true;
            
            this.logger.info('🔌 WebSocket Manager inicializado', {
                cors: this.config.cors.origin,
                transports: this.config.transports
            });
            
            return true;
        } catch (error) {
            this.logger.error('Erro ao inicializar WebSocket Manager:', error);
            return false;
        }
    }

    /**
     * Configura os manipuladores de eventos principais
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    /**
     * Configura middleware personalizado
     */
    setupMiddleware() {
        // Middleware de autenticação
        this.io.use((socket, next) => {
            this.authenticateSocket(socket, next);
        });

        // Middleware de rate limiting
        this.io.use((socket, next) => {
            this.rateLimitSocket(socket, next);
        });

        // Aplicar middleware personalizado
        this.middleware.forEach(middleware => {
            this.io.use(middleware);
        });
    }

    /**
     * Manipula nova conexão de cliente
     */
    handleConnection(socket) {
        const clientInfo = {
            id: socket.id,
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent'],
            connectedAt: new Date(),
            userId: socket.userId || null,
            rooms: new Set()
        };

        this.connectedClients.set(socket.id, clientInfo);
        
        this.logger.info('Cliente conectado', {
            socketId: socket.id,
            ip: clientInfo.ip,
            totalClients: this.connectedClients.size
        });

        // Eventos padrão
        socket.on('disconnect', (reason) => {
            this.handleDisconnection(socket, reason);
        });

        socket.on('error', (error) => {
            this.logger.error('Erro no socket:', error, { socketId: socket.id });
        });

        // Eventos personalizados
        socket.on('join-room', (roomName) => {
            this.joinRoom(socket, roomName);
        });

        socket.on('leave-room', (roomName) => {
            this.leaveRoom(socket, roomName);
        });

        socket.on('broadcast-to-room', (data) => {
            this.broadcastToRoom(data.room, data.event, data.payload, socket.id);
        });

        // Registrar eventos personalizados
        this.eventHandlers.forEach((handler, eventName) => {
            socket.on(eventName, (data) => {
                handler(socket, data);
            });
        });

        // Emitir evento de boas-vindas
        socket.emit('welcome', {
            socketId: socket.id,
            serverTime: new Date().toISOString(),
            connectedClients: this.connectedClients.size
        });
    }

    /**
     * Manipula desconexão de cliente
     */
    handleDisconnection(socket, reason) {
        const clientInfo = this.connectedClients.get(socket.id);
        
        if (clientInfo) {
            // Remover de todas as salas
            clientInfo.rooms.forEach(roomName => {
                this.leaveRoom(socket, roomName, false);
            });
            
            this.connectedClients.delete(socket.id);
            
            this.logger.info('Cliente desconectado', {
                socketId: socket.id,
                reason,
                duration: Date.now() - clientInfo.connectedAt.getTime(),
                totalClients: this.connectedClients.size
            });
        }
    }

    /**
     * Middleware de autenticação
     */
    authenticateSocket(socket, next) {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
            // Permitir conexões anônimas por padrão
            return next();
        }

        try {
            // Aqui você pode integrar com o AuthManager para validar o token
            // const decoded = this.authManager.verifyToken(token);
            // socket.userId = decoded.userId;
            // socket.userRole = decoded.role;
            
            next();
        } catch (error) {
            this.logger.warn('Falha na autenticação do socket:', error.message);
            next(new Error('Authentication failed'));
        }
    }

    /**
     * Middleware de rate limiting
     */
    rateLimitSocket(socket, next) {
        // Implementação básica de rate limiting
        const clientIp = socket.handshake.address;
        const now = Date.now();
        
        if (!this.rateLimitData) {
            this.rateLimitData = new Map();
        }
        
        const clientData = this.rateLimitData.get(clientIp) || { count: 0, resetTime: now + 60000 };
        
        if (now > clientData.resetTime) {
            clientData.count = 0;
            clientData.resetTime = now + 60000;
        }
        
        clientData.count++;
        this.rateLimitData.set(clientIp, clientData);
        
        if (clientData.count > 100) { // 100 conexões por minuto
            return next(new Error('Rate limit exceeded'));
        }
        
        next();
    }

    /**
     * Adiciona cliente a uma sala
     */
    joinRoom(socket, roomName) {
        if (!roomName || typeof roomName !== 'string') {
            return false;
        }

        socket.join(roomName);
        
        const clientInfo = this.connectedClients.get(socket.id);
        if (clientInfo) {
            clientInfo.rooms.add(roomName);
        }

        // Atualizar informações da sala
        if (!this.rooms.has(roomName)) {
            this.rooms.set(roomName, {
                name: roomName,
                clients: new Set(),
                createdAt: new Date()
            });
        }
        
        this.rooms.get(roomName).clients.add(socket.id);
        
        this.logger.info('Cliente entrou na sala', {
            socketId: socket.id,
            room: roomName,
            roomSize: this.rooms.get(roomName).clients.size
        });

        // Notificar outros clientes na sala
        socket.to(roomName).emit('user-joined-room', {
            socketId: socket.id,
            room: roomName,
            timestamp: new Date().toISOString()
        });

        return true;
    }

    /**
     * Remove cliente de uma sala
     */
    leaveRoom(socket, roomName, notify = true) {
        if (!roomName || typeof roomName !== 'string') {
            return false;
        }

        socket.leave(roomName);
        
        const clientInfo = this.connectedClients.get(socket.id);
        if (clientInfo) {
            clientInfo.rooms.delete(roomName);
        }

        const room = this.rooms.get(roomName);
        if (room) {
            room.clients.delete(socket.id);
            
            // Remover sala se estiver vazia
            if (room.clients.size === 0) {
                this.rooms.delete(roomName);
            }
        }

        this.logger.info('Cliente saiu da sala', {
            socketId: socket.id,
            room: roomName,
            roomSize: room ? room.clients.size : 0
        });

        // Notificar outros clientes na sala
        if (notify) {
            socket.to(roomName).emit('user-left-room', {
                socketId: socket.id,
                room: roomName,
                timestamp: new Date().toISOString()
            });
        }

        return true;
    }

    /**
     * Envia mensagem para todos os clientes
     */
    broadcast(event, data) {
        if (!this.isInitialized) {
            return false;
        }

        this.io.emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
            type: 'broadcast'
        });

        this.logger.debug('Broadcast enviado', {
            event,
            recipients: this.connectedClients.size
        });

        return true;
    }

    /**
     * Envia mensagem para uma sala específica
     */
    broadcastToRoom(roomName, event, data, excludeSocketId = null) {
        if (!this.isInitialized || !roomName) {
            return false;
        }

        const room = this.rooms.get(roomName);
        if (!room) {
            return false;
        }

        const emitter = excludeSocketId ? 
            this.io.to(roomName).except(excludeSocketId) : 
            this.io.to(roomName);

        emitter.emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
            type: 'room-broadcast',
            room: roomName
        });

        this.logger.debug('Broadcast para sala enviado', {
            room: roomName,
            event,
            recipients: room.clients.size - (excludeSocketId ? 1 : 0)
        });

        return true;
    }

    /**
     * Envia mensagem para um cliente específico
     */
    sendToClient(socketId, event, data) {
        if (!this.isInitialized || !socketId) {
            return false;
        }

        this.io.to(socketId).emit(event, {
            ...data,
            timestamp: new Date().toISOString(),
            type: 'direct-message'
        });

        this.logger.debug('Mensagem direta enviada', {
            socketId,
            event
        });

        return true;
    }

    /**
     * Registra um manipulador de evento personalizado
     */
    registerEventHandler(eventName, handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler deve ser uma função');
        }

        this.eventHandlers.set(eventName, handler);
        
        this.logger.info('Event handler registrado', { event: eventName });
    }

    /**
     * Remove um manipulador de evento
     */
    unregisterEventHandler(eventName) {
        const removed = this.eventHandlers.delete(eventName);
        
        if (removed) {
            this.logger.info('Event handler removido', { event: eventName });
        }
        
        return removed;
    }

    /**
     * Adiciona middleware personalizado
     */
    addMiddleware(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('Middleware deve ser uma função');
        }

        this.middleware.push(middleware);
        
        if (this.isInitialized) {
            this.io.use(middleware);
        }
    }

    /**
     * Obtém estatísticas do WebSocket
     */
    getStats() {
        return {
            connectedClients: this.connectedClients.size,
            activeRooms: this.rooms.size,
            registeredEvents: this.eventHandlers.size,
            middleware: this.middleware.length,
            rooms: Array.from(this.rooms.entries()).map(([name, room]) => ({
                name,
                clients: room.clients.size,
                createdAt: room.createdAt
            })),
            clients: Array.from(this.connectedClients.values()).map(client => ({
                id: client.id,
                connectedAt: client.connectedAt,
                rooms: Array.from(client.rooms),
                userId: client.userId
            }))
        };
    }

    /**
     * Health check do WebSocket
     */
    async healthCheck() {
        const startTime = Date.now();
        
        try {
            if (!this.isInitialized || !this.io) {
                return {
                    status: 'unhealthy',
                    message: 'WebSocket não inicializado',
                    responseTime: Date.now() - startTime
                };
            }

            const stats = this.getStats();
            const responseTime = Date.now() - startTime;
            
            return {
                status: 'healthy',
                message: 'WebSocket funcionando corretamente',
                responseTime,
                stats: {
                    connectedClients: stats.connectedClients,
                    activeRooms: stats.activeRooms,
                    registeredEvents: stats.registeredEvents
                }
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                message: error.message,
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
     * Desconecta todos os clientes e fecha o servidor
     */
    async shutdown() {
        if (!this.isInitialized) {
            return;
        }

        this.logger.info('Iniciando shutdown do WebSocket Manager...');
        
        // Notificar todos os clientes sobre o shutdown
        this.broadcast('server-shutdown', {
            message: 'Servidor sendo reiniciado',
            timestamp: new Date().toISOString()
        });

        // Aguardar um pouco para as mensagens serem enviadas
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Desconectar todos os clientes
        this.io.disconnectSockets();
        
        // Limpar dados
        this.connectedClients.clear();
        this.rooms.clear();
        this.eventHandlers.clear();
        
        this.isInitialized = false;
        
        this.logger.info('WebSocket Manager desligado com sucesso');
    }
}

export default WebSocketManager;