/**
 * Testes para o Logger
 * Testa a funcionalidade do sistema de logging
 */

const { createLogger } = require('../../src/core/logger.js');
const fs = require('fs');
const path = require('path');

describe('Logger', () => {
  let logger;
  let tempLogDir;

  beforeEach(() => {
    // Criar diretório temporário para logs
    tempLogDir = path.join(process.cwd(), 'temp-logs');
    if (!fs.existsSync(tempLogDir)) {
      fs.mkdirSync(tempLogDir, { recursive: true });
    }

    logger = createLogger('test', {
      level: 'debug',
      console: true,
      file: true,
      logDir: tempLogDir
    });
  });

  afterEach(() => {
    // Limpar diretório temporário
    if (fs.existsSync(tempLogDir)) {
      fs.rmSync(tempLogDir, { recursive: true, force: true });
    }
  });

  test('deve criar uma instância do Logger', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  test('deve aplicar configurações padrão', () => {
    const defaultLogger = createLogger('default');
    
    expect(defaultLogger).toBeDefined();
    expect(typeof defaultLogger.info).toBe('function');
  });

  test('deve validar níveis de log', () => {
    const validLevels = ['debug', 'info', 'warn', 'error'];
    
    for (const level of validLevels) {
      expect(() => {
        createLogger('test', { level });
      }).not.toThrow();
    }

    expect(() => {
      createLogger('test', { level: 'invalid' });
    }).toThrow('Nível de log inválido');
  });

  test('deve formatar mensagens corretamente', () => {
    // Mock console.log para capturar saída
    const originalLog = console.log;
    const logOutput = [];
    console.log = (message) => logOutput.push(message);

    logger.info('Mensagem de teste');
    
    expect(logOutput.length).toBe(1);
    expect(logOutput[0]).toContain('[INFO]');
    expect(logOutput[0]).toContain('[test]');
    expect(logOutput[0]).toContain('Mensagem de teste');
    
    // Restaurar console.log
    console.log = originalLog;
  });

  test('deve formatar metadados como objeto', () => {
    const originalLog = console.log;
    const logOutput = [];
    console.log = (message) => logOutput.push(message);

    const metadata = { userId: 123, action: 'login' };
    logger.info('Usuário logado', metadata);
    
    expect(logOutput.length).toBe(1);
    expect(logOutput[0]).toContain('Usuário logado');
    expect(logOutput[0]).toContain('userId');
    expect(logOutput[0]).toContain('123');
    expect(logOutput[0]).toContain('action');
    expect(logOutput[0]).toContain('login');
    
    console.log = originalLog;
  });

  test('deve formatar objetos de erro corretamente', () => {
    const originalLog = console.log;
    const logOutput = [];
    console.log = (message) => logOutput.push(message);

    const error = new Error('Erro de teste');
    logger.error('Erro ocorreu', { error });
    
    expect(logOutput.length).toBe(1);
    expect(logOutput[0]).toContain('[ERROR]');
    expect(logOutput[0]).toContain('Erro ocorreu');
    expect(logOutput[0]).toContain('Erro de teste');
    
    console.log = originalLog;
  });

  test('deve incluir stack trace para erros', () => {
    const originalLog = console.log;
    const logOutput = [];
    console.log = (message) => logOutput.push(message);

    const error = new Error('Erro com stack');
    logger.error('Erro com stack trace', { error, includeStack: true });
    
    expect(logOutput.length).toBe(1);
    expect(logOutput[0]).toContain('stack');
    
    console.log = originalLog;
  });

  test('deve fazer log no console quando habilitado', () => {
    const consoleLogger = createLogger('console-test', {
      console: true,
      file: false
    });

    const originalLog = console.log;
    const logOutput = [];
    console.log = (message) => logOutput.push(message);

    consoleLogger.info('Teste console');
    
    expect(logOutput.length).toBe(1);
    expect(logOutput[0]).toContain('Teste console');
    
    console.log = originalLog;
  });

  test('deve não fazer log no console quando desabilitado', () => {
    const noConsoleLogger = createLogger('no-console-test', {
      console: false,
      file: false
    });

    const originalLog = console.log;
    const logOutput = [];
    console.log = (message) => logOutput.push(message);

    noConsoleLogger.info('Teste sem console');
    
    expect(logOutput.length).toBe(0);
    
    console.log = originalLog;
  });

  test('deve criar arquivo de log quando habilitado', () => {
    const fileLogger = createLogger('file-test', {
      console: false,
      file: true,
      logDir: tempLogDir
    });

    fileLogger.info('Teste arquivo de log');
    
    // Aguardar um pouco para o arquivo ser escrito
    setTimeout(() => {
      const logFiles = fs.readdirSync(tempLogDir);
      expect(logFiles.length).toBeGreaterThan(0);
      
      const logFile = logFiles.find(file => file.includes('file-test'));
      expect(logFile).toBeDefined();
      
      const logContent = fs.readFileSync(path.join(tempLogDir, logFile), 'utf8');
      expect(logContent).toContain('Teste arquivo de log');
    }, 100);
  });

  test('deve criar diretório de log se não existir', () => {
    const newLogDir = path.join(process.cwd(), 'new-log-dir');
    
    // Garantir que o diretório não existe
    if (fs.existsSync(newLogDir)) {
      fs.rmSync(newLogDir, { recursive: true, force: true });
    }

    const dirLogger = createLogger('dir-test', {
      console: false,
      file: true,
      logDir: newLogDir
    });

    dirLogger.info('Teste criação de diretório');
    
    setTimeout(() => {
      expect(fs.existsSync(newLogDir)).toBe(true);
      
      // Limpar
      fs.rmSync(newLogDir, { recursive: true, force: true });
    }, 100);
  });

  test('deve lidar com caracteres especiais nas mensagens', () => {
    const originalLog = console.log;
    const logOutput = [];
    console.log = (message) => logOutput.push(message);

    const specialMessage = 'Teste com acentos: ção, ã, é, ü e símbolos: @#$%';
    logger.info(specialMessage);
    
    expect(logOutput.length).toBe(1);
    expect(logOutput[0]).toContain(specialMessage);
    
    console.log = originalLog;
  });

  test('deve respeitar níveis de log', () => {
    const warnLogger = createLogger('warn-test', {
      level: 'warn',
      console: true,
      file: false
    });

    const originalLog = console.log;
    const logOutput = [];
    console.log = (message) => logOutput.push(message);

    // Debug e info não devem aparecer
    warnLogger.debug('Debug message');
    warnLogger.info('Info message');
    
    // Warn e error devem aparecer
    warnLogger.warn('Warning message');
    warnLogger.error('Error message');
    
    expect(logOutput.length).toBe(2);
    expect(logOutput[0]).toContain('Warning message');
    expect(logOutput[1]).toContain('Error message');
    
    console.log = originalLog;
  });

  test('deve formatar timestamp corretamente', () => {
    const originalLog = console.log;
    const logOutput = [];
    console.log = (message) => logOutput.push(message);

    logger.info('Teste timestamp');
    
    expect(logOutput.length).toBe(1);
    // Verificar se contém um timestamp no formato ISO
    expect(logOutput[0]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    
    console.log = originalLog;
  });

  test('deve lidar com metadados undefined ou null', () => {
    const originalLog = console.log;
    const logOutput = [];
    console.log = (message) => logOutput.push(message);

    logger.info('Teste sem metadados', undefined);
    logger.info('Teste com null', null);
    
    expect(logOutput.length).toBe(2);
    expect(logOutput[0]).toContain('Teste sem metadados');
    expect(logOutput[1]).toContain('Teste com null');
    
    console.log = originalLog;
  });

  test('deve validar configuração de logger', () => {
    expect(() => {
      createLogger('', { level: 'info' });
    }).toThrow('Nome do logger é obrigatório');

    expect(() => {
      createLogger(123, { level: 'info' });
    }).toThrow('Nome do logger deve ser uma string');
  });
});