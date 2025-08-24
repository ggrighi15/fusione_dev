/**
 * Sistema de Eventos do Fusione Core System
 * Event Bus para comunicação entre módulos e componentes
 */

import { EventEmitter } from 'events';
import { createLogger } from './logger.js';

export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.logger = createLogger('EventBus');
    this.eventHistory = [];
    this.maxHistorySize = 1000;
    this.subscribers = new Map();
    
    // Configurar limite de listeners
    this.setMaxListeners(100);
    
    // Log de eventos se em modo debug
    if (process.env.DEBUG_EVENTS === 'true') {
      this.setupEventLogging();
    }
  }

  /**
   * Emite um evento com logging e histórico
   * @param {string} eventName - Nome do evento
   * @param {*} data - Dados do evento
   */
  emit(eventName, data = null) {
    const eventData = {
      name: eventName,
      data,
      timestamp: new Date().toISOString(),
      id: this.generateEventId()
    };

    // Adicionar ao histórico
    this.addToHistory(eventData);

    // Log do evento
    this.logger.debug(`Evento emitido: ${eventName}`, {
      eventId: eventData.id,
      hasData: data !== null,
      listenerCount: this.listenerCount(eventName)
    });

    // Emitir evento
    return super.emit(eventName, data, eventData);
  }

  /**
   * Registra um listener para um evento
   * @param {string} eventName - Nome do evento
   * @param {Function} listener - Função listener
   * @param {Object} options - Opções do listener
   */
  on(eventName, listener, options = {}) {
    const wrappedListener = this.wrapListener(eventName, listener, options);
    
    // Registrar subscriber
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, new Set());
    }
    this.subscribers.get(eventName).add({
      listener: wrappedListener,
      originalListener: listener,
      options,
      registeredAt: new Date().toISOString()
    });

    super.on(eventName, wrappedListener);
    
    this.logger.debug(`Listener registrado para evento: ${eventName}`, {
      totalListeners: this.listenerCount(eventName),
      options
    });

    return this;
  }

  /**
   * Registra um listener que executa apenas uma vez
   * @param {string} eventName - Nome do evento
   * @param {Function} listener - Função listener
   * @param {Object} options - Opções do listener
   */
  once(eventName, listener, options = {}) {
    const wrappedListener = this.wrapListener(eventName, listener, { ...options, once: true });
    
    super.once(eventName, wrappedListener);
    
    this.logger.debug(`Listener único registrado para evento: ${eventName}`);

    return this;
  }

  /**
   * Remove um listener específico
   * @param {string} eventName - Nome do evento
   * @param {Function} listener - Função listener original
   */
  off(eventName, listener) {
    const subscribers = this.subscribers.get(eventName);
    if (subscribers) {
      for (const subscriber of subscribers) {
        if (subscriber.originalListener === listener) {
          super.off(eventName, subscriber.listener);
          subscribers.delete(subscriber);
          
          this.logger.debug(`Listener removido do evento: ${eventName}`);
          break;
        }
      }
    }

    return this;
  }

  /**
   * Remove todos os listeners de um evento
   * @param {string} eventName - Nome do evento
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.subscribers.delete(eventName);
      this.logger.debug(`Todos os listeners removidos do evento: ${eventName}`);
    } else {
      this.subscribers.clear();
      this.logger.debug('Todos os listeners removidos de todos os eventos');
    }

    return super.removeAllListeners(eventName);
  }

  /**
   * Obtém estatísticas do event bus
   * @returns {Object} Estatísticas
   */
  getStats() {
    const eventCounts = {};
    const subscriberCounts = {};

    // Contar eventos no histórico
    for (const event of this.eventHistory) {
      eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;
    }

    // Contar subscribers
    for (const [eventName, subscribers] of this.subscribers) {
      subscriberCounts[eventName] = subscribers.size;
    }

    return {
      totalEvents: this.eventHistory.length,
      eventCounts,
      subscriberCounts,
      totalSubscribers: Array.from(this.subscribers.values())
        .reduce((total, subscribers) => total + subscribers.size, 0),
      historySize: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize
    };
  }

  /**
   * Obtém o histórico de eventos
   * @param {number} limit - Limite de eventos a retornar
   * @param {string} eventName - Filtrar por nome do evento
   * @returns {Array} Histórico de eventos
   */
  getHistory(limit = 100, eventName = null) {
    let history = this.eventHistory;

    if (eventName) {
      history = history.filter(event => event.name === eventName);
    }

    return history.slice(-limit);
  }

  /**
   * Limpa o histórico de eventos
   */
  clearHistory() {
    this.eventHistory = [];
    this.logger.debug('Histórico de eventos limpo');
  }

  /**
   * Aguarda por um evento específico
   * @param {string} eventName - Nome do evento
   * @param {number} timeout - Timeout em ms (opcional)
   * @returns {Promise} Promise que resolve quando o evento ocorre
   */
  waitFor(eventName, timeout = null) {
    return new Promise((resolve, reject) => {
      let timeoutId;

      const listener = (data) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(data);
      };

      this.once(eventName, listener);

      if (timeout) {
        timeoutId = setTimeout(() => {
          this.off(eventName, listener);
          reject(new Error(`Timeout aguardando evento: ${eventName}`));
        }, timeout);
      }
    });
  }

  /**
   * Configura logging automático de eventos
   */
  setupEventLogging() {
    this.on('*', (data, eventData) => {
      this.logger.debug('Evento processado', {
        event: eventData.name,
        eventId: eventData.id,
        timestamp: eventData.timestamp,
        hasData: data !== null
      });
    });
  }

  /**
   * Envolve um listener com funcionalidades extras
   * @param {string} eventName - Nome do evento
   * @param {Function} listener - Função listener
   * @param {Object} options - Opções
   * @returns {Function} Listener envolvido
   */
  wrapListener(eventName, listener, options = {}) {
    return async (data, eventData) => {
      try {
        // Verificar se deve executar
        if (options.condition && !options.condition(data, eventData)) {
          return;
        }

        // Executar listener
        const result = await listener(data, eventData);

        // Log de sucesso
        if (options.logExecution) {
          this.logger.debug(`Listener executado com sucesso para evento: ${eventName}`);
        }

        return result;

      } catch (error) {
        this.logger.error(`Erro no listener do evento ${eventName}:`, error);
        
        // Emitir evento de erro se configurado
        if (options.emitError !== false) {
          this.emit('listener:error', {
            eventName,
            error: error.message,
            stack: error.stack,
            originalData: data
          });
        }

        // Re-throw se configurado
        if (options.throwOnError) {
          throw error;
        }
      }
    };
  }

  /**
   * Adiciona evento ao histórico
   * @param {Object} eventData - Dados do evento
   */
  addToHistory(eventData) {
    this.eventHistory.push(eventData);

    // Manter tamanho do histórico
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Gera ID único para evento
   * @returns {string} ID do evento
   */
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}