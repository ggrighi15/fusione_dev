/**
 * Testes para o EventBus
 * Testa a funcionalidade do sistema de eventos
 */

const { EventBus } = require('../../src/core/event-bus.js');

describe('EventBus', () => {
  let eventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  test('deve criar uma instância do EventBus', () => {
    expect(eventBus).toBeInstanceOf(EventBus);
    expect(typeof eventBus.on).toBe('function');
    expect(typeof eventBus.emit).toBe('function');
    expect(typeof eventBus.off).toBe('function');
    expect(typeof eventBus.once).toBe('function');
  });

  test('deve registrar e executar listeners', () => {
    const mockCallback = jest.fn();
    
    eventBus.on('test-event', mockCallback);
    eventBus.emit('test-event', 'test-data');
    
    expect(mockCallback).toHaveBeenCalledWith('test-data');
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('deve remover listeners', () => {
    const mockCallback = jest.fn();
    
    eventBus.on('test-event', mockCallback);
    eventBus.off('test-event', mockCallback);
    eventBus.emit('test-event', 'test-data');
    
    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('deve executar listener apenas uma vez com once', () => {
    const mockCallback = jest.fn();
    
    eventBus.once('test-event', mockCallback);
    eventBus.emit('test-event', 'data1');
    eventBus.emit('test-event', 'data2');
    
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith('data1');
  });

  test('deve suportar múltiplos listeners para o mesmo evento', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    
    eventBus.on('test-event', callback1);
    eventBus.on('test-event', callback2);
    eventBus.emit('test-event', 'test-data');
    
    expect(callback1).toHaveBeenCalledWith('test-data');
    expect(callback2).toHaveBeenCalledWith('test-data');
  });

  test('deve obter estatísticas corretas', () => {
    eventBus.on('event1', () => {});
    eventBus.on('event1', () => {});
    eventBus.on('event2', () => {});
    
    const stats = eventBus.getStats();
    
    expect(stats.totalEvents).toBe(2);
    expect(stats.totalListeners).toBe(3);
    expect(stats.events['event1']).toBe(2);
    expect(stats.events['event2']).toBe(1);
  });

  test('deve manter histórico de eventos', () => {
    eventBus.emit('test-event', 'data1');
    eventBus.emit('test-event', 'data2');
    
    const history = eventBus.getHistory();
    
    expect(history).toHaveLength(2);
    expect(history[0].event).toBe('test-event');
    expect(history[0].data).toBe('data1');
    expect(history[1].event).toBe('test-event');
    expect(history[1].data).toBe('data2');
  });

  test('deve filtrar histórico por evento', () => {
    eventBus.emit('event1', 'data1');
    eventBus.emit('event2', 'data2');
    eventBus.emit('event1', 'data3');
    
    const filteredHistory = eventBus.getHistory('event1');
    
    expect(filteredHistory).toHaveLength(2);
    expect(filteredHistory[0].data).toBe('data1');
    expect(filteredHistory[1].data).toBe('data3');
  });

  test('deve lidar com erros em listeners', () => {
    const errorCallback = jest.fn(() => {
      throw new Error('Test error');
    });
    const normalCallback = jest.fn();
    
    eventBus.on('test-event', errorCallback);
    eventBus.on('test-event', normalCallback);
    
    // Não deve lançar erro
    expect(() => {
      eventBus.emit('test-event', 'test-data');
    }).not.toThrow();
    
    expect(errorCallback).toHaveBeenCalled();
    expect(normalCallback).toHaveBeenCalled();
  });

  test('deve limitar o tamanho do histórico', () => {
    // Assumindo que o limite padrão é 100
    for (let i = 0; i < 150; i++) {
      eventBus.emit('test-event', `data${i}`);
    }
    
    const history = eventBus.getHistory();
    expect(history.length).toBeLessThanOrEqual(100);
  });
});