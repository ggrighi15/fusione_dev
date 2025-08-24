/**
 * Módulo de Relatórios Personalizados
 * Gera relatórios baseados nos dados do usuário e configurações específicas
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

class ReportsModule extends EventEmitter {
  constructor(config = {}) {
    super();
    this.name = 'reports-module';
    this.version = '1.0.0';
    this.config = {
      outputFormats: ['json', 'csv', 'html', 'pdf'],
      defaultFormat: 'json',
      maxReportSize: 10 * 1024 * 1024, // 10MB
      cacheReports: true,
      cacheDuration: 3600000, // 1 hora
      templatesPath: './templates/reports',
      outputPath: './output/reports',
      ...config
    };
    
    this.reportTemplates = new Map();
    this.reportCache = new Map();
    this.reportGenerators = new Map();
    this.reportHistory = [];
    this.stats = {
      totalReports: 0,
      successfulReports: 0,
      failedReports: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastReportTime: null,
      averageGenerationTime: 0
    };
    
    this.setupReportGenerators();
  }
  
  async initialize() {
    try {
      // Criar diretórios necessários
      await this.ensureDirectories();
      
      // Carregar templates de relatórios
      await this.loadReportTemplates();
      
      // Configurar limpeza automática do cache
      this.setupCacheCleanup();
      
      this.emit('initialized', {
        module: this.name,
        templates: this.reportTemplates.size,
        generators: this.reportGenerators.size
      });
      
      return true;
    } catch (error) {
      this.emit('error', { module: this.name, error: error.message });
      throw error;
    }
  }
  
  async ensureDirectories() {
    const dirs = [this.config.templatesPath, this.config.outputPath];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }
  
  setupReportGenerators() {
    // Gerador de relatório de dados financeiros
    this.reportGenerators.set('financial', {
      name: 'Relatório Financeiro',
      description: 'Gera relatórios de transações e análises financeiras',
      generate: async (data, options = {}) => {
        const startTime = Date.now();
        
        try {
          const report = {
            title: 'Relatório Financeiro',
            generatedAt: new Date().toISOString(),
            period: options.period || 'all',
            summary: {
              totalTransactions: data.transactions?.length || 0,
              totalRevenue: this.calculateTotalRevenue(data.transactions || []),
              totalExpenses: this.calculateTotalExpenses(data.transactions || []),
              netProfit: 0
            },
            transactions: data.transactions || [],
            categories: this.categorizeTransactions(data.transactions || []),
            trends: this.analyzeTrends(data.transactions || [], options.period)
          };
          
          report.summary.netProfit = report.summary.totalRevenue - report.summary.totalExpenses;
          
          const generationTime = Date.now() - startTime;
          this.updateStats('success', generationTime);
          
          return report;
        } catch (error) {
          this.updateStats('error');
          throw error;
        }
      }
    });
    
    // Gerador de relatório de inventário
    this.reportGenerators.set('inventory', {
      name: 'Relatório de Inventário',
      description: 'Gera relatórios de estoque e movimentação de produtos',
      generate: async (data, options = {}) => {
        const startTime = Date.now();
        
        try {
          const report = {
            title: 'Relatório de Inventário',
            generatedAt: new Date().toISOString(),
            summary: {
              totalProducts: data.products?.length || 0,
              totalValue: this.calculateInventoryValue(data.products || []),
              lowStockItems: this.findLowStockItems(data.products || []),
              outOfStockItems: this.findOutOfStockItems(data.products || [])
            },
            products: data.products || [],
            movements: data.movements || [],
            categories: this.categorizeProducts(data.products || []),
            alerts: this.generateInventoryAlerts(data.products || [])
          };
          
          const generationTime = Date.now() - startTime;
          this.updateStats('success', generationTime);
          
          return report;
        } catch (error) {
          this.updateStats('error');
          throw error;
        }
      }
    });
    
    // Gerador de relatório de clientes
    this.reportGenerators.set('customers', {
      name: 'Relatório de Clientes',
      description: 'Gera relatórios de análise de clientes e comportamento',
      generate: async (data, options = {}) => {
        const startTime = Date.now();
        
        try {
          const report = {
            title: 'Relatório de Clientes',
            generatedAt: new Date().toISOString(),
            summary: {
              totalCustomers: data.customers?.length || 0,
              activeCustomers: this.countActiveCustomers(data.customers || []),
              newCustomers: this.countNewCustomers(data.customers || [], options.period),
              averageOrderValue: this.calculateAverageOrderValue(data.orders || [])
            },
            customers: data.customers || [],
            segments: this.segmentCustomers(data.customers || []),
            topCustomers: this.findTopCustomers(data.customers || [], data.orders || []),
            churnAnalysis: this.analyzeChurn(data.customers || [], data.orders || [])
          };
          
          const generationTime = Date.now() - startTime;
          this.updateStats('success', generationTime);
          
          return report;
        } catch (error) {
          this.updateStats('error');
          throw error;
        }
      }
    });
    
    // Gerador de relatório de vendas
    this.reportGenerators.set('sales', {
      name: 'Relatório de Vendas',
      description: 'Gera relatórios de performance de vendas e análises',
      generate: async (data, options = {}) => {
        const startTime = Date.now();
        
        try {
          const report = {
            title: 'Relatório de Vendas',
            generatedAt: new Date().toISOString(),
            period: options.period || 'all',
            summary: {
              totalSales: data.sales?.length || 0,
              totalRevenue: this.calculateSalesRevenue(data.sales || []),
              averageSaleValue: this.calculateAverageSaleValue(data.sales || []),
              conversionRate: this.calculateConversionRate(data.leads || [], data.sales || [])
            },
            sales: data.sales || [],
            performance: this.analyzeSalesPerformance(data.sales || []),
            trends: this.analyzeSalesTrends(data.sales || [], options.period),
            forecasting: this.generateSalesForecast(data.sales || [])
          };
          
          const generationTime = Date.now() - startTime;
          this.updateStats('success', generationTime);
          
          return report;
        } catch (error) {
          this.updateStats('error');
          throw error;
        }
      }
    });
    
    // Gerador de relatório personalizado
    this.reportGenerators.set('custom', {
      name: 'Relatório Personalizado',
      description: 'Gera relatórios baseados em templates personalizados',
      generate: async (data, options = {}) => {
        const startTime = Date.now();
        
        try {
          const templateName = options.template;
          if (!templateName) {
            throw new Error('Template é obrigatório para relatórios personalizados');
          }
          
          const template = this.reportTemplates.get(templateName);
          if (!template) {
            throw new Error(`Template '${templateName}' não encontrado`);
          }
          
          const report = await this.processTemplate(template, data, options);
          
          const generationTime = Date.now() - startTime;
          this.updateStats('success', generationTime);
          
          return report;
        } catch (error) {
          this.updateStats('error');
          throw error;
        }
      }
    });
  }
  
  async generateReport(type, data, options = {}) {
    try {
      const cacheKey = this.generateCacheKey(type, data, options);
      
      // Verificar cache se habilitado
      if (this.config.cacheReports && this.reportCache.has(cacheKey)) {
        const cached = this.reportCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cacheDuration) {
          this.stats.cacheHits++;
          return cached.report;
        } else {
          this.reportCache.delete(cacheKey);
        }
      }
      
      this.stats.cacheMisses++;
      
      const generator = this.reportGenerators.get(type);
      if (!generator) {
        throw new Error(`Gerador de relatório '${type}' não encontrado`);
      }
      
      const report = await generator.generate(data, options);
      
      // Adicionar metadados
      report.metadata = {
        type,
        generator: generator.name,
        options,
        dataSize: JSON.stringify(data).length,
        reportId: this.generateReportId()
      };
      
      // Cache do relatório
      if (this.config.cacheReports) {
        this.reportCache.set(cacheKey, {
          report,
          timestamp: Date.now()
        });
      }
      
      // Adicionar ao histórico
      this.reportHistory.push({
        id: report.metadata.reportId,
        type,
        generatedAt: report.generatedAt,
        success: true
      });
      
      // Manter apenas os últimos 100 relatórios no histórico
      if (this.reportHistory.length > 100) {
        this.reportHistory = this.reportHistory.slice(-100);
      }
      
      this.emit('reportGenerated', {
        type,
        reportId: report.metadata.reportId,
        success: true
      });
      
      return report;
      
    } catch (error) {
      this.reportHistory.push({
        type,
        generatedAt: new Date().toISOString(),
        success: false,
        error: error.message
      });
      
      this.emit('reportError', {
        type,
        error: error.message
      });
      
      throw error;
    }
  }
  
  async exportReport(report, format = null) {
    const outputFormat = format || this.config.defaultFormat;
    
    if (!this.config.outputFormats.includes(outputFormat)) {
      throw new Error(`Formato '${outputFormat}' não suportado`);
    }
    
    const filename = `${report.metadata.reportId}_${Date.now()}.${outputFormat}`;
    const filepath = path.join(this.config.outputPath, filename);
    
    let content;
    
    switch (outputFormat) {
      case 'json':
        content = JSON.stringify(report, null, 2);
        break;
        
      case 'csv':
        content = this.convertToCSV(report);
        break;
        
      case 'html':
        content = this.convertToHTML(report);
        break;
        
      case 'pdf':
        // Para PDF, seria necessário uma biblioteca como puppeteer ou jsPDF
        throw new Error('Exportação para PDF não implementada ainda');
        
      default:
        throw new Error(`Formato '${outputFormat}' não implementado`);
    }
    
    await fs.writeFile(filepath, content, 'utf8');
    
    return {
      filename,
      filepath,
      format: outputFormat,
      size: content.length
    };
  }
  
  // Métodos auxiliares para cálculos financeiros
  calculateTotalRevenue(transactions) {
    return transactions
      .filter(t => t.type === 'income' || t.amount > 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }
  
  calculateTotalExpenses(transactions) {
    return transactions
      .filter(t => t.type === 'expense' || t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  }
  
  categorizeTransactions(transactions) {
    const categories = {};
    
    transactions.forEach(transaction => {
      const category = transaction.category || 'Outros';
      if (!categories[category]) {
        categories[category] = {
          name: category,
          count: 0,
          total: 0,
          transactions: []
        };
      }
      
      categories[category].count++;
      categories[category].total += Math.abs(transaction.amount);
      categories[category].transactions.push(transaction);
    });
    
    return Object.values(categories);
  }
  
  analyzeTrends(transactions, period) {
    // Implementação básica de análise de tendências
    const now = new Date();
    const periodMs = this.getPeriodInMs(period);
    const startDate = new Date(now.getTime() - periodMs);
    
    const filteredTransactions = transactions.filter(t => 
      new Date(t.date) >= startDate
    );
    
    return {
      period,
      transactionCount: filteredTransactions.length,
      totalAmount: filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
      averagePerDay: filteredTransactions.length / (periodMs / (24 * 60 * 60 * 1000))
    };
  }
  
  // Métodos auxiliares para inventário
  calculateInventoryValue(products) {
    return products.reduce((sum, product) => {
      return sum + (product.quantity * product.price);
    }, 0);
  }
  
  findLowStockItems(products, threshold = 10) {
    return products.filter(product => 
      product.quantity <= threshold && product.quantity > 0
    );
  }
  
  findOutOfStockItems(products) {
    return products.filter(product => product.quantity === 0);
  }
  
  categorizeProducts(products) {
    const categories = {};
    
    products.forEach(product => {
      const category = product.category || 'Outros';
      if (!categories[category]) {
        categories[category] = {
          name: category,
          count: 0,
          totalValue: 0,
          products: []
        };
      }
      
      categories[category].count++;
      categories[category].totalValue += product.quantity * product.price;
      categories[category].products.push(product);
    });
    
    return Object.values(categories);
  }
  
  generateInventoryAlerts(products) {
    const alerts = [];
    
    products.forEach(product => {
      if (product.quantity === 0) {
        alerts.push({
          type: 'out_of_stock',
          severity: 'high',
          product: product.name,
          message: `Produto '${product.name}' está fora de estoque`
        });
      } else if (product.quantity <= 10) {
        alerts.push({
          type: 'low_stock',
          severity: 'medium',
          product: product.name,
          message: `Produto '${product.name}' com estoque baixo (${product.quantity} unidades)`
        });
      }
    });
    
    return alerts;
  }
  
  // Métodos auxiliares para clientes
  countActiveCustomers(customers) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return customers.filter(customer => 
      new Date(customer.lastActivity) >= thirtyDaysAgo
    ).length;
  }
  
  countNewCustomers(customers, period) {
    const periodMs = this.getPeriodInMs(period);
    const startDate = new Date(Date.now() - periodMs);
    
    return customers.filter(customer => 
      new Date(customer.createdAt) >= startDate
    ).length;
  }
  
  calculateAverageOrderValue(orders) {
    if (orders.length === 0) return 0;
    
    const totalValue = orders.reduce((sum, order) => sum + order.total, 0);
    return totalValue / orders.length;
  }
  
  segmentCustomers(customers) {
    const segments = {
      new: customers.filter(c => this.isNewCustomer(c)),
      active: customers.filter(c => this.isActiveCustomer(c)),
      inactive: customers.filter(c => this.isInactiveCustomer(c)),
      vip: customers.filter(c => this.isVIPCustomer(c))
    };
    
    return segments;
  }
  
  findTopCustomers(customers, orders, limit = 10) {
    const customerOrders = {};
    
    orders.forEach(order => {
      if (!customerOrders[order.customerId]) {
        customerOrders[order.customerId] = {
          totalOrders: 0,
          totalValue: 0
        };
      }
      
      customerOrders[order.customerId].totalOrders++;
      customerOrders[order.customerId].totalValue += order.total;
    });
    
    return customers
      .map(customer => ({
        ...customer,
        orderStats: customerOrders[customer.id] || { totalOrders: 0, totalValue: 0 }
      }))
      .sort((a, b) => b.orderStats.totalValue - a.orderStats.totalValue)
      .slice(0, limit);
  }
  
  analyzeChurn(customers, orders) {
    // Implementação básica de análise de churn
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    
    const churnedCustomers = customers.filter(customer => {
      const lastOrder = orders
        .filter(order => order.customerId === customer.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      
      return lastOrder && new Date(lastOrder.date) < sixtyDaysAgo;
    });
    
    return {
      totalCustomers: customers.length,
      churnedCustomers: churnedCustomers.length,
      churnRate: (churnedCustomers.length / customers.length * 100).toFixed(2) + '%',
      churnedList: churnedCustomers
    };
  }
  
  // Métodos auxiliares para vendas
  calculateSalesRevenue(sales) {
    return sales.reduce((sum, sale) => sum + sale.total, 0);
  }
  
  calculateAverageSaleValue(sales) {
    if (sales.length === 0) return 0;
    return this.calculateSalesRevenue(sales) / sales.length;
  }
  
  calculateConversionRate(leads, sales) {
    if (leads.length === 0) return 0;
    return (sales.length / leads.length * 100).toFixed(2) + '%';
  }
  
  analyzeSalesPerformance(sales) {
    const performance = {
      daily: {},
      weekly: {},
      monthly: {}
    };
    
    sales.forEach(sale => {
      const date = new Date(sale.date);
      const day = date.toISOString().split('T')[0];
      const week = this.getWeekKey(date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Performance diária
      if (!performance.daily[day]) {
        performance.daily[day] = { count: 0, total: 0 };
      }
      performance.daily[day].count++;
      performance.daily[day].total += sale.total;
      
      // Performance semanal
      if (!performance.weekly[week]) {
        performance.weekly[week] = { count: 0, total: 0 };
      }
      performance.weekly[week].count++;
      performance.weekly[week].total += sale.total;
      
      // Performance mensal
      if (!performance.monthly[month]) {
        performance.monthly[month] = { count: 0, total: 0 };
      }
      performance.monthly[month].count++;
      performance.monthly[month].total += sale.total;
    });
    
    return performance;
  }
  
  analyzeSalesTrends(sales, period) {
    const periodMs = this.getPeriodInMs(period);
    const startDate = new Date(Date.now() - periodMs);
    
    const filteredSales = sales.filter(sale => 
      new Date(sale.date) >= startDate
    );
    
    return {
      period,
      totalSales: filteredSales.length,
      totalRevenue: this.calculateSalesRevenue(filteredSales),
      averagePerDay: filteredSales.length / (periodMs / (24 * 60 * 60 * 1000)),
      growth: this.calculateGrowth(sales, period)
    };
  }
  
  generateSalesForecast(sales) {
    // Implementação básica de previsão baseada em tendência linear
    if (sales.length < 2) {
      return { message: 'Dados insuficientes para previsão' };
    }
    
    const monthlySales = this.groupSalesByMonth(sales);
    const months = Object.keys(monthlySales).sort();
    
    if (months.length < 2) {
      return { message: 'Dados insuficientes para previsão' };
    }
    
    const lastMonth = monthlySales[months[months.length - 1]];
    const previousMonth = monthlySales[months[months.length - 2]];
    
    const growth = (lastMonth.total - previousMonth.total) / previousMonth.total;
    const nextMonthForecast = lastMonth.total * (1 + growth);
    
    return {
      currentMonth: lastMonth,
      previousMonth: previousMonth,
      growthRate: (growth * 100).toFixed(2) + '%',
      nextMonthForecast: nextMonthForecast.toFixed(2),
      confidence: 'low' // Implementação básica
    };
  }
  
  // Métodos utilitários
  generateCacheKey(type, data, options) {
    const dataHash = this.simpleHash(JSON.stringify(data));
    const optionsHash = this.simpleHash(JSON.stringify(options));
    return `${type}_${dataHash}_${optionsHash}`;
  }
  
  generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  getPeriodInMs(period) {
    const periods = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000
    };
    
    return periods[period] || periods['30d'];
  }
  
  getWeekKey(date) {
    const year = date.getFullYear();
    const week = Math.ceil((date.getDate() + new Date(year, 0, 1).getDay()) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }
  
  groupSalesByMonth(sales) {
    const monthly = {};
    
    sales.forEach(sale => {
      const date = new Date(sale.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthly[month]) {
        monthly[month] = { count: 0, total: 0 };
      }
      
      monthly[month].count++;
      monthly[month].total += sale.total;
    });
    
    return monthly;
  }
  
  calculateGrowth(sales, period) {
    const periodMs = this.getPeriodInMs(period);
    const now = Date.now();
    const currentPeriodStart = now - periodMs;
    const previousPeriodStart = currentPeriodStart - periodMs;
    
    const currentPeriodSales = sales.filter(sale => {
      const saleTime = new Date(sale.date).getTime();
      return saleTime >= currentPeriodStart && saleTime < now;
    });
    
    const previousPeriodSales = sales.filter(sale => {
      const saleTime = new Date(sale.date).getTime();
      return saleTime >= previousPeriodStart && saleTime < currentPeriodStart;
    });
    
    const currentTotal = this.calculateSalesRevenue(currentPeriodSales);
    const previousTotal = this.calculateSalesRevenue(previousPeriodSales);
    
    if (previousTotal === 0) return 0;
    
    return ((currentTotal - previousTotal) / previousTotal * 100).toFixed(2) + '%';
  }
  
  // Métodos de classificação de clientes
  isNewCustomer(customer) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return new Date(customer.createdAt) >= thirtyDaysAgo;
  }
  
  isActiveCustomer(customer) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return new Date(customer.lastActivity) >= thirtyDaysAgo;
  }
  
  isInactiveCustomer(customer) {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    return new Date(customer.lastActivity) < sixtyDaysAgo;
  }
  
  isVIPCustomer(customer) {
    // Critério simples: clientes com mais de 10 pedidos ou valor total > 10000
    return customer.totalOrders > 10 || customer.totalSpent > 10000;
  }
  
  // Métodos de conversão de formato
  convertToCSV(report) {
    // Implementação básica de conversão para CSV
    let csv = '';
    
    // Cabeçalho
    csv += `Relatório: ${report.title}\n`;
    csv += `Gerado em: ${report.generatedAt}\n\n`;
    
    // Resumo
    if (report.summary) {
      csv += 'RESUMO\n';
      Object.entries(report.summary).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
      csv += '\n';
    }
    
    return csv;
  }
  
  convertToHTML(report) {
    // Implementação básica de conversão para HTML
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${report.title}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; }
            .summary { background-color: #f5f5f5; padding: 15px; margin: 20px 0; }
            .section { margin: 20px 0; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${report.title}</h1>
            <p>Gerado em: ${report.generatedAt}</p>
        </div>
    `;
    
    if (report.summary) {
      html += '<div class="summary"><h2>Resumo</h2>';
      Object.entries(report.summary).forEach(([key, value]) => {
        html += `<p><strong>${key}:</strong> ${value}</p>`;
      });
      html += '</div>';
    }
    
    html += `
    </body>
    </html>
    `;
    
    return html;
  }
  
  async loadReportTemplates() {
    try {
      const files = await fs.readdir(this.config.templatesPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of jsonFiles) {
        try {
          const filepath = path.join(this.config.templatesPath, file);
          const content = await fs.readFile(filepath, 'utf8');
          const template = JSON.parse(content);
          
          const templateName = path.basename(file, '.json');
          this.reportTemplates.set(templateName, template);
        } catch (error) {
          console.warn(`Erro ao carregar template ${file}:`, error.message);
        }
      }
    } catch (error) {
      // Diretório não existe ou está vazio, não é um erro crítico
      console.info('Nenhum template de relatório encontrado');
    }
  }
  
  async processTemplate(template, data, options) {
    // Implementação básica de processamento de template
    const report = {
      title: template.title || 'Relatório Personalizado',
      generatedAt: new Date().toISOString(),
      template: template.name,
      sections: []
    };
    
    if (template.sections) {
      for (const section of template.sections) {
        const processedSection = await this.processTemplateSection(section, data, options);
        report.sections.push(processedSection);
      }
    }
    
    return report;
  }
  
  async processTemplateSection(section, data, options) {
    // Implementação básica de processamento de seção
    return {
      title: section.title,
      type: section.type,
      content: section.content || 'Conteúdo não implementado',
      data: data[section.dataSource] || null
    };
  }
  
  setupCacheCleanup() {
    // Limpeza automática do cache a cada hora
    setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.reportCache.entries()) {
        if (now - cached.timestamp > this.config.cacheDuration) {
          this.reportCache.delete(key);
        }
      }
    }, 60 * 60 * 1000); // 1 hora
  }
  
  updateStats(type, generationTime = 0) {
    this.stats.totalReports++;
    
    if (type === 'success') {
      this.stats.successfulReports++;
      this.stats.lastReportTime = new Date().toISOString();
      
      // Calcular tempo médio de geração
      const currentAvg = this.stats.averageGenerationTime;
      const count = this.stats.successfulReports;
      this.stats.averageGenerationTime = ((currentAvg * (count - 1)) + generationTime) / count;
    } else {
      this.stats.failedReports++;
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.reportCache.size,
      templatesLoaded: this.reportTemplates.size,
      generatorsAvailable: this.reportGenerators.size,
      historySize: this.reportHistory.length
    };
  }
  
  getAvailableReports() {
    const reports = [];
    
    for (const [key, generator] of this.reportGenerators) {
      reports.push({
        type: key,
        name: generator.name,
        description: generator.description
      });
    }
    
    return reports;
  }
  
  getReportHistory(limit = 50) {
    return this.reportHistory.slice(-limit);
  }
  
  clearCache() {
    this.reportCache.clear();
    return true;
  }
  
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', { module: this.name, config: this.config });
    return true;
  }
  
  getInfo() {
    return {
      name: this.name,
      version: this.version,
      description: 'Módulo para geração de relatórios personalizados',
      config: this.config,
      stats: this.getStats(),
      availableReports: this.getAvailableReports()
    };
  }
  
  async shutdown() {
    // Limpar cache
    this.reportCache.clear();
    
    // Remover todos os listeners
    this.removeAllListeners();
    
    this.emit('shutdown', { module: this.name });
    return true;
  }
}

export default ReportsModule;