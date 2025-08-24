import path from 'path';
import fs from 'fs';

/**
 * Configurações do módulo XML Loader
 */
const config = {
  // Diretórios permitidos para ingestão
  allowedDirectories: [
    path.join(process.cwd(), 'data', 'xml'),
    path.join(process.cwd(), 'uploads', 'xml'),
    'C:\\XMLs',
    'D:\\XMLs',
    'C:\\Espaider\\XMLs',
    'D:\\Espaider\\XMLs'
  ],
  
  // Configurações de upload
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 20,
    allowedExtensions: ['.xml'],
    tempDirectory: path.join(process.cwd(), 'uploads', 'temp')
  },
  
  // Configurações de processamento
  processing: {
    batchSize: 100,
    maxConcurrentFiles: 5,
    retryAttempts: 3,
    retryDelay: 1000 // ms
  },
  
  // Mapeamentos de campos XML
  fieldMappings: {
    classificacao: [
      'Classificação_Classificação',
      'Classificacao_Classificacao',
      '@Classificação_Classificação',
      '@Classificacao_Classificacao'
    ],
    contagem: [
      'Classificação_Contagem',
      'Classificacao_Contagem',
      '@Classificação_Contagem',
      '@Classificacao_Contagem'
    ],
    classificacaoPai: [
      'Classificação_ClassificaçãoPai',
      'Classificacao_ClassificacaoPai',
      '@Classificação_ClassificaçãoPai',
      '@Classificacao_ClassificacaoPai'
    ]
  },
  
  // Categorias de relatórios
  reportCategories: {
    contratos: {
      keywords: ['contrato', 'contract'],
      description: 'Relatórios de contratos e licitações'
    },
    financeiro: {
      keywords: ['financeiro', 'pagamento', 'orcamento', 'despesa'],
      description: 'Relatórios financeiros e orçamentários'
    },
    operacional: {
      keywords: ['operacional', 'operacao', 'processo'],
      description: 'Relatórios operacionais e de processos'
    },
    analytics: {
      keywords: ['analytics', 'analise', 'dashboard', 'indicador'],
      description: 'Relatórios analíticos e indicadores'
    },
    custom: {
      keywords: [],
      description: 'Relatórios customizados'
    }
  },
  
  // Configurações de validação
  validation: {
    maxFilenameLength: 255,
    maxDirectoryDepth: 10,
    requiredXMLElements: ['Details', 'CabecalhoDetalhe'],
    maxXMLSize: 100 * 1024 * 1024 // 100MB
  },
  
  // Configurações de cache
  cache: {
    enabled: true,
    ttl: 3600, // 1 hora
    maxSize: 1000
  },
  
  // Configurações de log
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    enableFileLogging: true,
    logDirectory: path.join(process.cwd(), 'logs', 'xml-loader'),
    maxLogFiles: 10,
    maxLogSize: '10m'
  },
  
  // Configurações de monitoramento
  monitoring: {
    enableMetrics: true,
    metricsInterval: 60000, // 1 minuto
    alertThresholds: {
      errorRate: 0.1, // 10%
      processingTime: 30000, // 30 segundos
      queueSize: 100
    }
  },
  
  // Configurações de segurança
  security: {
    enablePathValidation: true,
    allowedMimeTypes: ['text/xml', 'application/xml'],
    maxPathLength: 260,
    blockedPatterns: [
      /\.\./,
      /[<>:"|?*]/,
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i
    ]
  },
  
  // Inicialização do módulo
  async initialize() {
    try {
      // Criar diretórios necessários
      const dirsToCreate = [
        this.upload.tempDirectory,
        this.logging.logDirectory,
        path.join(process.cwd(), 'data', 'xml')
      ];
      
      for (const dir of dirsToCreate) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
      
      console.log('XML Loader module initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize XML Loader module:', error);
      return false;
    }
  },
  
  // Validação de configuração
  validate() {
    const errors = [];
    
    // Validar diretórios permitidos
    this.allowedDirectories.forEach(dir => {
      if (!path.isAbsolute(dir)) {
        errors.push(`Directory must be absolute: ${dir}`);
      }
    });
    
    // Validar configurações de upload
    if (this.upload.maxFileSize <= 0) {
      errors.push('Upload max file size must be positive');
    }
    
    if (this.upload.maxFiles <= 0) {
      errors.push('Upload max files must be positive');
    }
    
    // Validar configurações de processamento
    if (this.processing.batchSize <= 0) {
      errors.push('Processing batch size must be positive');
    }
    
    if (this.processing.maxConcurrentFiles <= 0) {
      errors.push('Max concurrent files must be positive');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  // Obter configuração por ambiente
  getEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    const envConfigs = {
      development: {
        logging: { level: 'debug' },
        cache: { enabled: false },
        monitoring: { enableMetrics: false }
      },
      test: {
        logging: { level: 'error' },
        cache: { enabled: false },
        monitoring: { enableMetrics: false },
        upload: { tempDirectory: path.join(process.cwd(), 'test', 'temp') }
      },
      production: {
        logging: { level: 'info' },
        cache: { enabled: true },
        monitoring: { enableMetrics: true }
      }
    };
    
    return envConfigs[env] || envConfigs.development;
  }
};

export default config;