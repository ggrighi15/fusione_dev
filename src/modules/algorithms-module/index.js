import path from 'path';
import fs from 'fs';

/**
 * Módulo de Algoritmos e Estruturas de Dados
 * Integra algoritmos úteis para processamento de dados e otimização
 */
class AlgorithmsModule {
  constructor(core) {
    this.core = core;
    this.name = 'algorithms-module';
    this.version = '1.0.0';
    this.description = 'Módulo para algoritmos e estruturas de dados avançadas';
    this.logger = core.logger;
    this.eventBus = core.eventBus;
    this.cache = core.cache;
    this.database = core.database;
    
    // Configurações do módulo
    this.config = {
      enableSorting: true,
      enableSearch: true,
      enableDataStructures: true,
      cacheResults: true,
      maxCacheSize: 1000
    };
    
    // Cache para resultados de algoritmos
    this.algorithmCache = new Map();
  }

  /**
   * Inicializa o módulo
   */
  async initialize() {
    try {
      this.logger.info(`[${this.name}] Inicializando módulo de algoritmos...`);
      
      // Registrar eventos
      this.registerEvents();
      
      // Registrar rotas da API
      this.registerApiRoutes();
      
      this.logger.info(`[${this.name}] Módulo inicializado com sucesso`);
      return true;
    } catch (error) {
      this.logger.error(`[${this.name}] Erro ao inicializar:`, error);
      return false;
    }
  }

  /**
   * Registra eventos do módulo
   */
  registerEvents() {
    // Evento para ordenação de dados
    this.eventBus.on('data:sort', async (data) => {
      try {
        const result = await this.sortData(data.array, data.algorithm, data.options);
        this.eventBus.emit('data:sort:success', { result, requestId: data.requestId });
      } catch (error) {
        this.eventBus.emit('data:sort:error', { error: error.message, requestId: data.requestId });
      }
    });

    // Evento para busca em dados
    this.eventBus.on('data:search', async (data) => {
      try {
        const result = await this.searchData(data.array, data.target, data.algorithm);
        this.eventBus.emit('data:search:success', { result, requestId: data.requestId });
      } catch (error) {
        this.eventBus.emit('data:search:error', { error: error.message, requestId: data.requestId });
      }
    });

    // Evento para análise de grafos
    this.eventBus.on('graph:analyze', async (data) => {
      try {
        const result = await this.analyzeGraph(data.nodes, data.edges, data.analysis);
        this.eventBus.emit('graph:analyze:success', { result, requestId: data.requestId });
      } catch (error) {
        this.eventBus.emit('graph:analyze:error', { error: error.message, requestId: data.requestId });
      }
    });
  }

  /**
   * Registra rotas da API
   */
  registerApiRoutes() {
    if (this.core.apiModule) {
      const router = this.core.apiModule.router;
      
      // POST /api/algorithms/sort - Ordenar dados
      const self = this;
      router.post('/algorithms/sort', async (req, res) => {
        try {
          const { data, algorithm = 'quicksort', options = {} } = req.body;
          
          if (!Array.isArray(data)) {
            return res.status(400).json({
              success: false,
              error: 'Dados devem ser um array'
            });
          }
          
          const result = await self.sortData(data, algorithm, options);
          
          res.json({
            success: true,
            result,
            algorithm,
            originalLength: data.length,
            sortedLength: result.data ? result.data.length : result.length
          });
        } catch (error) {
          self.logger.error(`[${self.name}] Erro ao ordenar dados:`, error);
          res.status(500).json({
            success: false,
            message: 'Erro ao ordenar dados',
            error: error.message
          });
        }
      });

      // POST /api/algorithms/search - Buscar em dados
      router.post('/algorithms/search', async (req, res) => {
        try {
          const { data, target, algorithm = 'binary' } = req.body;
          
          if (!Array.isArray(data)) {
            return res.status(400).json({
              success: false,
              error: 'Dados devem ser um array'
            });
          }
          
          const result = await self.searchData(data, target, algorithm);
          
          res.json({
            success: true,
            result,
            algorithm,
            target,
            found: result.index !== -1
          });
        } catch (error) {
          self.logger.error(`[${self.name}] Erro ao buscar dados:`, error);
          res.status(500).json({
            success: false,
            message: 'Erro ao buscar dados',
            error: error.message
          });
        }
      });

      // POST /api/algorithms/graph - Analisar grafo
      router.post('/algorithms/graph', async (req, res) => {
        try {
          const { nodes, edges, analysis = 'shortest-path' } = req.body;
          
          if (!Array.isArray(nodes) || !Array.isArray(edges)) {
            return res.status(400).json({
              success: false,
              error: 'Nodes e edges devem ser arrays'
            });
          }
          
          const result = await this.analyzeGraph(nodes, edges, analysis);
          
          res.json({
            success: true,
            result,
            analysis,
            nodeCount: nodes.length,
            edgeCount: edges.length
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      });

      // GET /api/algorithms/stats - Estatísticas do módulo
      router.get('/algorithms/stats', (req, res) => {
        res.json({
          success: true,
          stats: {
            cacheSize: this.algorithmCache.size,
            availableAlgorithms: {
              sorting: ['quicksort', 'mergesort', 'heapsort', 'bubblesort'],
              searching: ['binary', 'linear'],
              graph: ['shortest-path', 'connected-components', 'topological-sort']
            },
            config: this.config
          }
        });
      });
    }
  }

  /**
   * Algoritmos de Ordenação
   */
  async sortData(array, algorithm = 'quicksort', options = {}) {
    const cacheKey = `sort_${algorithm}_${JSON.stringify(array)}_${JSON.stringify(options)}`;
    
    // Verificar cache
    if (this.config.cacheResults && this.algorithmCache.has(cacheKey)) {
      this.logger.debug(`[${this.name}] Resultado de ordenação encontrado no cache`);
      return this.algorithmCache.get(cacheKey);
    }
    
    let result;
    const startTime = Date.now();
    
    switch (algorithm.toLowerCase()) {
      case 'quicksort':
        result = this.quickSort([...array]);
        break;
      case 'mergesort':
        result = this.mergeSort([...array]);
        break;
      case 'heapsort':
        result = this.heapSort([...array]);
        break;
      case 'bubblesort':
        result = this.bubbleSort([...array]);
        break;
      default:
        throw new Error(`Algoritmo de ordenação '${algorithm}' não suportado`);
    }
    
    const executionTime = Date.now() - startTime;
    
    const finalResult = {
      data: result,
      algorithm,
      executionTime,
      originalLength: array.length,
      comparisons: result.comparisons || 0
    };
    
    // Salvar no cache
    if (this.config.cacheResults) {
      this.algorithmCache.set(cacheKey, finalResult);
      this.cleanCache();
    }
    
    this.logger.debug(`[${this.name}] Ordenação ${algorithm} concluída em ${executionTime}ms`);
    return finalResult;
  }

  /**
   * Quick Sort
   */
  quickSort(array) {
    let comparisons = 0;
    
    function partition(arr, low, high) {
      const pivot = arr[high];
      let i = low - 1;
      
      for (let j = low; j < high; j++) {
        comparisons++;
        if (arr[j] <= pivot) {
          i++;
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
      }
      
      [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
      return i + 1;
    }
    
    function quickSortRecursive(arr, low, high) {
      if (low < high) {
        const pi = partition(arr, low, high);
        quickSortRecursive(arr, low, pi - 1);
        quickSortRecursive(arr, pi + 1, high);
      }
    }
    
    quickSortRecursive(array, 0, array.length - 1);
    array.comparisons = comparisons;
    return array;
  }

  /**
   * Merge Sort
   */
  mergeSort(array) {
    let comparisons = 0;
    
    function merge(left, right) {
      const result = [];
      let leftIndex = 0;
      let rightIndex = 0;
      
      while (leftIndex < left.length && rightIndex < right.length) {
        comparisons++;
        if (left[leftIndex] <= right[rightIndex]) {
          result.push(left[leftIndex]);
          leftIndex++;
        } else {
          result.push(right[rightIndex]);
          rightIndex++;
        }
      }
      
      return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
    }
    
    function mergeSortRecursive(arr) {
      if (arr.length <= 1) return arr;
      
      const middle = Math.floor(arr.length / 2);
      const left = mergeSortRecursive(arr.slice(0, middle));
      const right = mergeSortRecursive(arr.slice(middle));
      
      return merge(left, right);
    }
    
    const result = mergeSortRecursive(array);
    result.comparisons = comparisons;
    return result;
  }

  /**
   * Heap Sort
   */
  heapSort(array) {
    let comparisons = 0;
    
    function heapify(arr, n, i) {
      let largest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      
      if (left < n) {
        comparisons++;
        if (arr[left] > arr[largest]) {
          largest = left;
        }
      }
      
      if (right < n) {
        comparisons++;
        if (arr[right] > arr[largest]) {
          largest = right;
        }
      }
      
      if (largest !== i) {
        [arr[i], arr[largest]] = [arr[largest], arr[i]];
        heapify(arr, n, largest);
      }
    }
    
    const n = array.length;
    
    // Build heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      heapify(array, n, i);
    }
    
    // Extract elements
    for (let i = n - 1; i > 0; i--) {
      [array[0], array[i]] = [array[i], array[0]];
      heapify(array, i, 0);
    }
    
    array.comparisons = comparisons;
    return array;
  }

  /**
   * Bubble Sort
   */
  bubbleSort(array) {
    let comparisons = 0;
    const n = array.length;
    
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        comparisons++;
        if (array[j] > array[j + 1]) {
          [array[j], array[j + 1]] = [array[j + 1], array[j]];
        }
      }
    }
    
    array.comparisons = comparisons;
    return array;
  }

  /**
   * Algoritmos de Busca
   */
  async searchData(array, target, algorithm = 'binary') {
    const cacheKey = `search_${algorithm}_${JSON.stringify(array)}_${target}`;
    
    // Verificar cache
    if (this.config.cacheResults && this.algorithmCache.has(cacheKey)) {
      this.logger.debug(`[${this.name}] Resultado de busca encontrado no cache`);
      return this.algorithmCache.get(cacheKey);
    }
    
    let result;
    const startTime = Date.now();
    
    switch (algorithm.toLowerCase()) {
      case 'binary':
        result = this.binarySearch(array, target);
        break;
      case 'linear':
        result = this.linearSearch(array, target);
        break;
      default:
        throw new Error(`Algoritmo de busca '${algorithm}' não suportado`);
    }
    
    const executionTime = Date.now() - startTime;
    
    const finalResult = {
      ...result,
      algorithm,
      executionTime,
      target
    };
    
    // Salvar no cache
    if (this.config.cacheResults) {
      this.algorithmCache.set(cacheKey, finalResult);
      this.cleanCache();
    }
    
    this.logger.debug(`[${this.name}] Busca ${algorithm} concluída em ${executionTime}ms`);
    return finalResult;
  }

  /**
   * Binary Search
   */
  binarySearch(array, target) {
    // Ordenar array se necessário
    const sortedArray = [...array].sort((a, b) => a - b);
    
    let left = 0;
    let right = sortedArray.length - 1;
    let comparisons = 0;
    
    while (left <= right) {
      comparisons++;
      const mid = Math.floor((left + right) / 2);
      
      if (sortedArray[mid] === target) {
        return {
          index: mid,
          value: sortedArray[mid],
          comparisons,
          found: true
        };
      }
      
      if (sortedArray[mid] < target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return {
      index: -1,
      value: null,
      comparisons,
      found: false
    };
  }

  /**
   * Linear Search
   */
  linearSearch(array, target) {
    let comparisons = 0;
    
    for (let i = 0; i < array.length; i++) {
      comparisons++;
      if (array[i] === target) {
        return {
          index: i,
          value: array[i],
          comparisons,
          found: true
        };
      }
    }
    
    return {
      index: -1,
      value: null,
      comparisons,
      found: false
    };
  }

  /**
   * Análise de Grafos
   */
  async analyzeGraph(nodes, edges, analysis = 'shortest-path') {
    const cacheKey = `graph_${analysis}_${JSON.stringify(nodes)}_${JSON.stringify(edges)}`;
    
    // Verificar cache
    if (this.config.cacheResults && this.algorithmCache.has(cacheKey)) {
      this.logger.debug(`[${this.name}] Resultado de análise de grafo encontrado no cache`);
      return this.algorithmCache.get(cacheKey);
    }
    
    let result;
    const startTime = Date.now();
    
    switch (analysis.toLowerCase()) {
      case 'shortest-path':
        result = this.dijkstraShortestPath(nodes, edges);
        break;
      case 'connected-components':
        result = this.findConnectedComponents(nodes, edges);
        break;
      case 'topological-sort':
        result = this.topologicalSort(nodes, edges);
        break;
      default:
        throw new Error(`Análise de grafo '${analysis}' não suportada`);
    }
    
    const executionTime = Date.now() - startTime;
    
    const finalResult = {
      ...result,
      analysis,
      executionTime,
      nodeCount: nodes.length,
      edgeCount: edges.length
    };
    
    // Salvar no cache
    if (this.config.cacheResults) {
      this.algorithmCache.set(cacheKey, finalResult);
      this.cleanCache();
    }
    
    this.logger.debug(`[${this.name}] Análise de grafo ${analysis} concluída em ${executionTime}ms`);
    return finalResult;
  }

  /**
   * Algoritmo de Dijkstra para menor caminho
   */
  dijkstraShortestPath(nodes, edges) {
    // Implementação simplificada do algoritmo de Dijkstra
    const graph = this.buildAdjacencyList(nodes, edges);
    const distances = {};
    const previous = {};
    const unvisited = new Set();
    
    // Inicializar distâncias
    nodes.forEach(node => {
      distances[node.id] = Infinity;
      previous[node.id] = null;
      unvisited.add(node.id);
    });
    
    // Se há um nó inicial, definir distância como 0
    if (nodes.length > 0) {
      distances[nodes[0].id] = 0;
    }
    
    while (unvisited.size > 0) {
      // Encontrar nó não visitado com menor distância
      let current = null;
      let minDistance = Infinity;
      
      for (const nodeId of unvisited) {
        if (distances[nodeId] < minDistance) {
          minDistance = distances[nodeId];
          current = nodeId;
        }
      }
      
      if (current === null) break;
      
      unvisited.delete(current);
      
      // Atualizar distâncias dos vizinhos
      if (graph[current]) {
        graph[current].forEach(neighbor => {
          const alt = distances[current] + neighbor.weight;
          if (alt < distances[neighbor.id]) {
            distances[neighbor.id] = alt;
            previous[neighbor.id] = current;
          }
        });
      }
    }
    
    return {
      distances,
      previous,
      paths: this.reconstructPaths(previous, nodes[0]?.id)
    };
  }

  /**
   * Encontrar componentes conectados
   */
  findConnectedComponents(nodes, edges) {
    const graph = this.buildAdjacencyList(nodes, edges);
    const visited = new Set();
    const components = [];
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component = [];
        this.dfsComponent(node.id, graph, visited, component);
        components.push(component);
      }
    });
    
    return {
      components,
      count: components.length,
      isConnected: components.length === 1
    };
  }

  /**
   * DFS para componentes conectados
   */
  dfsComponent(nodeId, graph, visited, component) {
    visited.add(nodeId);
    component.push(nodeId);
    
    if (graph[nodeId]) {
      graph[nodeId].forEach(neighbor => {
        if (!visited.has(neighbor.id)) {
          this.dfsComponent(neighbor.id, graph, visited, component);
        }
      });
    }
  }

  /**
   * Ordenação topológica
   */
  topologicalSort(nodes, edges) {
    const graph = this.buildAdjacencyList(nodes, edges);
    const inDegree = {};
    const result = [];
    const queue = [];
    
    // Calcular grau de entrada
    nodes.forEach(node => {
      inDegree[node.id] = 0;
    });
    
    edges.forEach(edge => {
      inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
    });
    
    // Adicionar nós com grau 0 à fila
    Object.keys(inDegree).forEach(nodeId => {
      if (inDegree[nodeId] === 0) {
        queue.push(nodeId);
      }
    });
    
    // Processar fila
    while (queue.length > 0) {
      const current = queue.shift();
      result.push(current);
      
      if (graph[current]) {
        graph[current].forEach(neighbor => {
          inDegree[neighbor.id]--;
          if (inDegree[neighbor.id] === 0) {
            queue.push(neighbor.id);
          }
        });
      }
    }
    
    return {
      order: result,
      isDAG: result.length === nodes.length,
      hasCycle: result.length !== nodes.length
    };
  }

  /**
   * Construir lista de adjacência
   */
  buildAdjacencyList(nodes, edges) {
    const graph = {};
    
    nodes.forEach(node => {
      graph[node.id] = [];
    });
    
    edges.forEach(edge => {
      if (!graph[edge.from]) graph[edge.from] = [];
      graph[edge.from].push({
        id: edge.to,
        weight: edge.weight || 1
      });
    });
    
    return graph;
  }

  /**
   * Reconstruir caminhos
   */
  reconstructPaths(previous, startNode) {
    const paths = {};
    
    Object.keys(previous).forEach(nodeId => {
      if (nodeId !== startNode) {
        const path = [];
        let current = nodeId;
        
        while (current !== null) {
          path.unshift(current);
          current = previous[current];
        }
        
        paths[nodeId] = path;
      }
    });
    
    return paths;
  }

  /**
   * Limpar cache quando necessário
   */
  cleanCache() {
    if (this.algorithmCache.size > this.config.maxCacheSize) {
      // Remover entradas mais antigas (implementação simples)
      const entries = Array.from(this.algorithmCache.entries());
      const toRemove = entries.slice(0, Math.floor(this.config.maxCacheSize * 0.2));
      
      toRemove.forEach(([key]) => {
        this.algorithmCache.delete(key);
      });
      
      this.logger.debug(`[${this.name}] Cache limpo: ${toRemove.length} entradas removidas`);
    }
  }

  /**
   * Obter estatísticas do módulo
   */
  getStats() {
    return {
      name: this.name,
      version: this.version,
      cacheSize: this.algorithmCache.size,
      config: this.config,
      availableAlgorithms: {
        sorting: ['quicksort', 'mergesort', 'heapsort', 'bubblesort'],
        searching: ['binary', 'linear'],
        graph: ['shortest-path', 'connected-components', 'topological-sort']
      }
    };
  }

  /**
   * Finaliza o módulo
   */
  async shutdown() {
    try {
      this.logger.info(`[${this.name}] Finalizando módulo...`);
      
      // Limpar cache
      this.algorithmCache.clear();
      
      this.logger.info(`[${this.name}] Módulo finalizado`);
      return true;
    } catch (error) {
      this.logger.error(`[${this.name}] Erro ao finalizar:`, error);
      return false;
    }
  }
}

export default AlgorithmsModule;