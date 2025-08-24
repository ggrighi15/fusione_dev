import express from 'express';

const router = express.Router();

// Middleware de autenticação simulado
const authenticateUser = (req, res, next) => {
  // Simular autenticação
  req.user = { id: 'user123', name: 'Test User' };
  next();
};

// Middleware para obter instância do módulo de algoritmos
const getAlgorithmsModule = (req, res, next) => {
  const moduleManager = req.app.get('moduleManager');
  if (!moduleManager) {
    return res.status(503).json({
      success: false,
      message: 'Module Manager não disponível'
    });
  }
  
  const algorithmsModule = moduleManager.getModule('algorithms-module');
  if (!algorithmsModule) {
    return res.status(503).json({
      success: false,
      message: 'Módulo de algoritmos não disponível'
    });
  }
  
  req.algorithmsModule = algorithmsModule;
  next();
};

// Aplicar middlewares a todas as rotas
router.use(authenticateUser);
router.use(getAlgorithmsModule);

/**
 * @route POST /api/algorithms/sort
 * @desc Ordenar dados usando algoritmos otimizados
 * @access Private
 */
router.post('/sort', async (req, res) => {
  try {
    const { data, algorithm = 'quicksort', order = 'asc' } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos. Esperado um array.'
      });
    }

    const result = await req.algorithmsModule.sortData(data, algorithm, order);
    
    res.json({
      success: true,
      data: result.sortedData,
      algorithm: result.algorithm,
      executionTime: result.executionTime,
      originalSize: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao ordenar dados',
      error: error.message
    });
  }
});

/**
 * @route POST /api/algorithms/search
 * @desc Buscar dados usando algoritmos eficientes
 * @access Private
 */
router.post('/search', async (req, res) => {
  try {
    const { data, target, algorithm = 'binary' } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos. Esperado um array.'
      });
    }

    if (target === undefined || target === null) {
      return res.status(400).json({
        success: false,
        message: 'Valor de busca não fornecido.'
      });
    }

    const result = await req.algorithmsModule.searchData(data, target, algorithm);
    
    res.json({
      success: true,
      found: result.found,
      index: result.index,
      algorithm: result.algorithm,
      executionTime: result.executionTime,
      comparisons: result.comparisons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dados',
      error: error.message
    });
  }
});

/**
 * @route POST /api/algorithms/graph
 * @desc Analisar grafos e redes
 * @access Private
 */
router.post('/graph', async (req, res) => {
  try {
    const { graph, operation, source, target } = req.body;
    
    if (!graph || typeof graph !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Grafo inválido. Esperado um objeto com vértices e arestas.'
      });
    }

    if (!operation) {
      return res.status(400).json({
        success: false,
        message: 'Operação não especificada. Use: shortest-path, connected-components, topological-sort'
      });
    }

    let result;
    switch (operation) {
      case 'shortest-path':
        if (!source || !target) {
          return res.status(400).json({
            success: false,
            message: 'Vértices de origem e destino são obrigatórios para shortest-path.'
          });
        }
        result = await req.algorithmsModule.findShortestPath(graph, source, target);
        break;
      
      case 'connected-components':
        result = await req.algorithmsModule.findConnectedComponents(graph);
        break;
      
      case 'topological-sort':
        result = await req.algorithmsModule.topologicalSort(graph);
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Operação não suportada. Use: shortest-path, connected-components, topological-sort'
        });
    }
    
    res.json({
      success: true,
      operation,
      result: result.data,
      executionTime: result.executionTime,
      metadata: result.metadata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao analisar grafo',
      error: error.message
    });
  }
});

/**
 * @route GET /api/algorithms/stats
 * @desc Obter estatísticas do módulo de algoritmos
 * @access Private
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await req.algorithmsModule.getStats();
    
    res.json({
      success: true,
      stats: {
        totalOperations: stats.totalOperations,
        sortingOperations: stats.sortingOperations,
        searchOperations: stats.searchOperations,
        graphOperations: stats.graphOperations,
        cacheHits: stats.cacheHits,
        cacheMisses: stats.cacheMisses,
        averageExecutionTime: stats.averageExecutionTime,
        mostUsedAlgorithm: stats.mostUsedAlgorithm,
        uptime: stats.uptime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message
    });
  }
});

/**
 * @route GET /api/algorithms/info
 * @desc Obter informações sobre algoritmos disponíveis
 * @access Private
 */
router.get('/info', (req, res) => {
  try {
    const algorithmsInfo = {
      sorting: {
        quicksort: {
          name: 'Quick Sort',
          complexity: 'O(n log n) médio, O(n²) pior caso',
          description: 'Algoritmo de ordenação eficiente baseado em divisão e conquista',
          stable: false,
          inPlace: true
        },
        mergesort: {
          name: 'Merge Sort',
          complexity: 'O(n log n)',
          description: 'Algoritmo de ordenação estável baseado em divisão e conquista',
          stable: true,
          inPlace: false
        },
        heapsort: {
          name: 'Heap Sort',
          complexity: 'O(n log n)',
          description: 'Algoritmo de ordenação baseado em heap binário',
          stable: false,
          inPlace: true
        },
        bubblesort: {
          name: 'Bubble Sort',
          complexity: 'O(n²)',
          description: 'Algoritmo de ordenação simples, adequado para pequenos conjuntos',
          stable: true,
          inPlace: true
        }
      },
      searching: {
        binary: {
          name: 'Busca Binária',
          complexity: 'O(log n)',
          description: 'Busca eficiente em arrays ordenados',
          requirement: 'Array deve estar ordenado'
        },
        linear: {
          name: 'Busca Linear',
          complexity: 'O(n)',
          description: 'Busca sequencial em arrays',
          requirement: 'Nenhum'
        }
      },
      graph: {
        'shortest-path': {
          name: 'Caminho Mais Curto (Dijkstra)',
          complexity: 'O(V² + E)',
          description: 'Encontra o caminho mais curto entre dois vértices'
        },
        'connected-components': {
          name: 'Componentes Conectados',
          complexity: 'O(V + E)',
          description: 'Identifica componentes conectados em um grafo'
        },
        'topological-sort': {
          name: 'Ordenação Topológica',
          complexity: 'O(V + E)',
          description: 'Ordena vértices de um grafo direcionado acíclico'
        }
      }
    };
    
    res.json({
      success: true,
      algorithms: algorithmsInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter informações dos algoritmos',
      error: error.message
    });
  }
});

export default router;