import express from 'express';

const router = express.Router();

// POST /api/business/validate - Validar dados usando regras de negócio
router.post('/validate', async (req, res) => {
  try {
    const { dataType, data } = req.body;
    
    if (!dataType || !data) {
      return res.status(400).json({
        success: false,
        error: 'dataType e data são obrigatórios'
      });
    }
    
    const businessLogicModule = req.app.moduleManager?.getModule('business-logic-module');
    
    if (!businessLogicModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de lógica de negócio não disponível'
      });
    }
    
    // Obter processador apropriado
    const processor = businessLogicModule.dataProcessors.get(dataType);
    
    if (!processor) {
      return res.status(400).json({
        success: false,
        error: `Processador para tipo '${dataType}' não encontrado`
      });
    }
    
    // Validar dados
    const validationResult = await processor.validate(data);
    
    res.json({
      success: true,
      message: 'Validação concluída',
      data: {
        dataType,
        isValid: validationResult.isValid,
        errors: validationResult.errors || [],
        validatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/business/process - Processar dados com lógica de negócio
router.post('/process', async (req, res) => {
  try {
    const { dataType, data, options = {} } = req.body;
    
    if (!dataType || !data) {
      return res.status(400).json({
        success: false,
        error: 'dataType e data são obrigatórios'
      });
    }
    
    const businessLogicModule = req.app.moduleManager?.getModule('business-logic-module');
    
    if (!businessLogicModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de lógica de negócio não disponível'
      });
    }
    
    // Obter processador apropriado
    const processor = businessLogicModule.dataProcessors.get(dataType);
    
    if (!processor) {
      return res.status(400).json({
        success: false,
        error: `Processador para tipo '${dataType}' não encontrado`
      });
    }
    
    // Validar dados primeiro
    const validationResult = await processor.validate(data);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Dados não passaram na validação',
        validationErrors: validationResult.errors
      });
    }
    
    // Processar dados
    const processedData = await processor.process(data);
    
    // Transformar dados se necessário
    const transformedData = await processor.transform(processedData);
    
    res.json({
      success: true,
      message: 'Dados processados com sucesso',
      data: {
        dataType,
        originalData: data,
        processedData: transformedData,
        processedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/business/rules/execute - Executar regra de negócio específica
router.post('/rules/execute', async (req, res) => {
  try {
    const { ruleName, ruleData } = req.body;
    
    if (!ruleName || !ruleData) {
      return res.status(400).json({
        success: false,
        error: 'ruleName e ruleData são obrigatórios'
      });
    }
    
    const businessLogicModule = req.app.moduleManager?.getModule('business-logic-module');
    
    if (!businessLogicModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de lógica de negócio não disponível'
      });
    }
    
    // Executar regra de negócio
    const result = await businessLogicModule.executeBusinessRule({ ruleName, ruleData });
    
    res.json({
      success: true,
      message: `Regra '${ruleName}' executada com sucesso`,
      data: {
        ruleName,
        result,
        executedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/business/rules - Listar regras de negócio disponíveis
router.get('/rules', async (req, res) => {
  try {
    const businessLogicModule = req.app.moduleManager?.getModule('business-logic-module');
    
    if (!businessLogicModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de lógica de negócio não disponível'
      });
    }
    
    const rules = {
      financial: {
        name: 'Regras Financeiras',
        rules: businessLogicModule.businessRules.financial,
        availableRules: [
          'validate_transaction',
          'calculate_fees',
          'categorize_transaction'
        ]
      },
      inventory: {
        name: 'Regras de Inventário',
        rules: businessLogicModule.businessRules.inventory,
        availableRules: [
          'check_inventory_levels',
          'validate_stock_update',
          'check_reorder_needed'
        ]
      },
      customer: {
        name: 'Regras de Cliente',
        rules: businessLogicModule.businessRules.customer,
        availableRules: [
          'verify_customer_data',
          'detect_duplicates',
          'validate_documents'
        ]
      },
      sales: {
        name: 'Regras de Vendas',
        rules: businessLogicModule.businessRules.sales,
        availableRules: [
          'process_sale',
          'calculate_commission',
          'check_approval_needed'
        ]
      }
    };
    
    res.json({
      success: true,
      message: 'Regras de negócio obtidas com sucesso',
      data: rules,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/business/rules/:ruleName - Atualizar regra de negócio
router.put('/rules/:ruleName', async (req, res) => {
  try {
    const { ruleName } = req.params;
    const { ruleConfig } = req.body;
    
    if (!ruleConfig) {
      return res.status(400).json({
        success: false,
        error: 'ruleConfig é obrigatório'
      });
    }
    
    const businessLogicModule = req.app.moduleManager?.getModule('business-logic-module');
    
    if (!businessLogicModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de lógica de negócio não disponível'
      });
    }
    
    // Validar se a regra existe
    const validRuleCategories = ['financial', 'inventory', 'customer', 'sales'];
    const [category, rule] = ruleName.split('.');
    
    if (!validRuleCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Categoria de regra '${category}' inválida`
      });
    }
    
    // Atualizar regra
    if (rule) {
      businessLogicModule.businessRules[category][rule] = ruleConfig;
    } else {
      businessLogicModule.businessRules[category] = { ...businessLogicModule.businessRules[category], ...ruleConfig };
    }
    
    // Salvar configuração atualizada
    await businessLogicModule.updateConfig({ businessRules: businessLogicModule.businessRules });
    
    res.json({
      success: true,
      message: `Regra '${ruleName}' atualizada com sucesso`,
      data: {
        ruleName,
        updatedConfig: rule ? ruleConfig : businessLogicModule.businessRules[category],
        updatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/business/stats - Obter estatísticas do módulo
router.get('/stats', async (req, res) => {
  try {
    const businessLogicModule = req.app.moduleManager?.getModule('business-logic-module');
    
    if (!businessLogicModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de lógica de negócio não disponível'
      });
    }
    
    const stats = businessLogicModule.getStats();
    
    res.json({
      success: true,
      message: 'Estatísticas obtidas com sucesso',
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/business/automation/run - Executar tarefa de automação
router.post('/automation/run', async (req, res) => {
  try {
    const { taskName } = req.body;
    
    if (!taskName) {
      return res.status(400).json({
        success: false,
        error: 'taskName é obrigatório'
      });
    }
    
    const businessLogicModule = req.app.moduleManager?.getModule('business-logic-module');
    
    if (!businessLogicModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de lógica de negócio não disponível'
      });
    }
    
    // Verificar se a tarefa existe
    const task = businessLogicModule.automationTasks.get(taskName);
    
    if (!task) {
      return res.status(400).json({
        success: false,
        error: `Tarefa de automação '${taskName}' não encontrada`
      });
    }
    
    // Executar tarefa
    await task.execute();
    
    res.json({
      success: true,
      message: `Tarefa '${taskName}' executada com sucesso`,
      data: {
        taskName,
        taskDescription: task.name,
        executedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/business/processors - Listar processadores de dados disponíveis
router.get('/processors', async (req, res) => {
  try {
    const businessLogicModule = req.app.moduleManager?.getModule('business-logic-module');
    
    if (!businessLogicModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de lógica de negócio não disponível'
      });
    }
    
    const processors = [];
    
    for (const [key, processor] of businessLogicModule.dataProcessors) {
      processors.push({
        type: key,
        name: processor.name,
        description: `Processador para dados do tipo ${key}`,
        methods: ['validate', 'process', 'transform']
      });
    }
    
    res.json({
      success: true,
      message: 'Processadores obtidos com sucesso',
      data: {
        processors,
        totalProcessors: processors.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/business/batch/validate - Validar múltiplos registros
router.post('/batch/validate', async (req, res) => {
  try {
    const { dataType, records } = req.body;
    
    if (!dataType || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'dataType e records (array) são obrigatórios'
      });
    }
    
    const businessLogicModule = req.app.moduleManager?.getModule('business-logic-module');
    
    if (!businessLogicModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de lógica de negócio não disponível'
      });
    }
    
    const processor = businessLogicModule.dataProcessors.get(dataType);
    
    if (!processor) {
      return res.status(400).json({
        success: false,
        error: `Processador para tipo '${dataType}' não encontrado`
      });
    }
    
    const results = [];
    let validCount = 0;
    let invalidCount = 0;
    
    // Validar cada registro
    for (let i = 0; i < records.length; i++) {
      try {
        const validationResult = await processor.validate(records[i]);
        
        results.push({
          index: i,
          record: records[i],
          isValid: validationResult.isValid,
          errors: validationResult.errors || []
        });
        
        if (validationResult.isValid) {
          validCount++;
        } else {
          invalidCount++;
        }
        
      } catch (error) {
        results.push({
          index: i,
          record: records[i],
          isValid: false,
          errors: [error.message]
        });
        invalidCount++;
      }
    }
    
    res.json({
      success: true,
      message: 'Validação em lote concluída',
      data: {
        dataType,
        totalRecords: records.length,
        validRecords: validCount,
        invalidRecords: invalidCount,
        successRate: (validCount / records.length * 100).toFixed(2) + '%',
        results,
        validatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/business/batch/process - Processar múltiplos registros
router.post('/batch/process', async (req, res) => {
  try {
    const { dataType, records, options = {} } = req.body;
    
    if (!dataType || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'dataType e records (array) são obrigatórios'
      });
    }
    
    const businessLogicModule = req.app.moduleManager?.getModule('business-logic-module');
    
    if (!businessLogicModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de lógica de negócio não disponível'
      });
    }
    
    const processor = businessLogicModule.dataProcessors.get(dataType);
    
    if (!processor) {
      return res.status(400).json({
        success: false,
        error: `Processador para tipo '${dataType}' não encontrado`
      });
    }
    
    const results = [];
    let processedCount = 0;
    let errorCount = 0;
    
    // Processar cada registro
    for (let i = 0; i < records.length; i++) {
      try {
        // Validar primeiro
        const validationResult = await processor.validate(records[i]);
        
        if (!validationResult.isValid && !options.skipValidation) {
          results.push({
            index: i,
            originalRecord: records[i],
            processed: false,
            errors: validationResult.errors
          });
          errorCount++;
          continue;
        }
        
        // Processar
        const processedData = await processor.process(records[i]);
        const transformedData = await processor.transform(processedData);
        
        results.push({
          index: i,
          originalRecord: records[i],
          processedRecord: transformedData,
          processed: true,
          errors: []
        });
        
        processedCount++;
        
      } catch (error) {
        results.push({
          index: i,
          originalRecord: records[i],
          processed: false,
          errors: [error.message]
        });
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: 'Processamento em lote concluído',
      data: {
        dataType,
        totalRecords: records.length,
        processedRecords: processedCount,
        errorRecords: errorCount,
        successRate: (processedCount / records.length * 100).toFixed(2) + '%',
        results,
        processedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;