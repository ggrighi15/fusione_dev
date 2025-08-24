import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class HistoryManager {
  constructor(logger, historyPath = './data/history.json') {
    this.logger = logger;
    this.historyPath = historyPath;
    this.history = [];
    this.sessions = new Map();
    this.currentSession = null;
    
    this.initializeHistory();
  }

  initializeHistory() {
    try {
      const dir = path.dirname(this.historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.historyPath)) {
        const rawData = fs.readFileSync(this.historyPath, 'utf8');
        const loadedData = JSON.parse(rawData);
        this.history = loadedData.history || [];
        this.sessions = new Map(loadedData.sessions || []);
        this.logger.info('Histórico carregado com sucesso');
      } else {
        this.saveHistory();
        this.logger.info('Novo sistema de histórico criado');
      }
    } catch (error) {
      this.logger.error('Erro ao inicializar histórico:', error);
      throw error;
    }
  }

  saveHistory() {
    try {
      const dataToSave = {
        history: this.history,
        sessions: Array.from(this.sessions.entries()),
        lastSaved: new Date().toISOString()
      };

      fs.writeFileSync(this.historyPath, JSON.stringify(dataToSave, null, 2));
      this.logger.debug('Histórico salvo');
    } catch (error) {
      this.logger.error('Erro ao salvar histórico:', error);
      throw error;
    }
  }

  // ========== GESTÃO DE SESSÕES ==========
  
  startSession(sessionName = null) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      name: sessionName || `Sessão ${new Date().toLocaleString()}`,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'active',
      actions: [],
      progress: {
        totalSteps: 0,
        completedSteps: 0,
        currentStep: null
      },
      metadata: {
        userAgent: process.env.USER_AGENT || 'system',
        version: process.env.APP_VERSION || '1.0.0'
      }
    };

    this.sessions.set(sessionId, session);
    this.currentSession = sessionId;
    
    this.addEntry({
      type: 'session',
      action: 'session_started',
      sessionId,
      data: { name: session.name }
    });

    this.saveHistory();
    this.logger.info(`Nova sessão iniciada: ${sessionId}`);
    
    return sessionId;
  }

  endSession(sessionId = null) {
    const id = sessionId || this.currentSession;
    if (!id) {
      throw new Error('Nenhuma sessão ativa para finalizar');
    }

    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Sessão não encontrada: ${id}`);
    }

    session.endTime = new Date().toISOString();
    session.status = 'completed';
    
    this.sessions.set(id, session);
    
    this.addEntry({
      type: 'session',
      action: 'session_ended',
      sessionId: id,
      data: { 
        duration: this.calculateDuration(session.startTime, session.endTime),
        totalActions: session.actions.length
      }
    });

    if (this.currentSession === id) {
      this.currentSession = null;
    }

    this.saveHistory();
    this.logger.info(`Sessão finalizada: ${id}`);
  }

  getCurrentSession() {
    return this.currentSession ? this.sessions.get(this.currentSession) : null;
  }

  // ========== REGISTRO DE AÇÕES ==========
  
  addEntry(entryData) {
    const entry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      sessionId: entryData.sessionId || this.currentSession,
      type: entryData.type || 'action',
      action: entryData.action,
      data: entryData.data || {},
      status: entryData.status || 'completed',
      duration: entryData.duration || null,
      error: entryData.error || null,
      metadata: {
        source: entryData.source || 'system',
        level: entryData.level || 'info',
        tags: entryData.tags || []
      }
    };

    this.history.push(entry);
    
    // Adicionar à sessão atual se existir
    if (this.currentSession) {
      const session = this.sessions.get(this.currentSession);
      if (session) {
        session.actions.push(entry.id);
        this.sessions.set(this.currentSession, session);
      }
    }

    // Manter apenas os últimos 5000 registros
    if (this.history.length > 5000) {
      this.history = this.history.slice(-5000);
    }

    this.logger.debug(`Entrada de histórico adicionada: ${entry.action}`);
    return entry.id;
  }

  // ========== ACOMPANHAMENTO DE PROGRESSO ==========
  
  startProgress(processName, totalSteps, sessionId = null) {
    const id = sessionId || this.currentSession;
    if (!id) {
      throw new Error('Nenhuma sessão ativa para acompanhar progresso');
    }

    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Sessão não encontrada: ${id}`);
    }

    session.progress = {
      processName,
      totalSteps,
      completedSteps: 0,
      currentStep: null,
      startTime: new Date().toISOString(),
      endTime: null,
      percentage: 0
    };

    this.sessions.set(id, session);
    
    this.addEntry({
      type: 'progress',
      action: 'progress_started',
      sessionId: id,
      data: { processName, totalSteps }
    });

    this.saveHistory();
  }

  updateProgress(stepName, stepData = {}, sessionId = null) {
    const id = sessionId || this.currentSession;
    if (!id) return;

    const session = this.sessions.get(id);
    if (!session || !session.progress) return;

    session.progress.completedSteps++;
    session.progress.currentStep = stepName;
    session.progress.percentage = Math.round(
      (session.progress.completedSteps / session.progress.totalSteps) * 100
    );

    this.sessions.set(id, session);
    
    this.addEntry({
      type: 'progress',
      action: 'progress_updated',
      sessionId: id,
      data: {
        stepName,
        stepData,
        progress: session.progress.percentage,
        completedSteps: session.progress.completedSteps,
        totalSteps: session.progress.totalSteps
      }
    });

    this.saveHistory();
  }

  completeProgress(sessionId = null) {
    const id = sessionId || this.currentSession;
    if (!id) return;

    const session = this.sessions.get(id);
    if (!session || !session.progress) return;

    session.progress.endTime = new Date().toISOString();
    session.progress.percentage = 100;
    
    this.sessions.set(id, session);
    
    this.addEntry({
      type: 'progress',
      action: 'progress_completed',
      sessionId: id,
      data: {
        duration: this.calculateDuration(session.progress.startTime, session.progress.endTime),
        totalSteps: session.progress.totalSteps
      }
    });

    this.saveHistory();
  }

  // ========== REGISTRO DE AÇÕES ESPECÍFICAS ==========
  
  logFileUpload(fileInfo) {
    return this.addEntry({
      type: 'file',
      action: 'file_uploaded',
      data: {
        fileName: fileInfo.originalName,
        fileSize: fileInfo.size,
        fileType: fileInfo.type,
        fileId: fileInfo.id
      },
      tags: ['upload', 'file']
    });
  }

  logFileProcessing(fileId, fileName, processingType) {
    return this.addEntry({
      type: 'file',
      action: 'file_processing_started',
      data: {
        fileId,
        fileName,
        processingType
      },
      tags: ['processing', 'file']
    });
  }

  logFileProcessed(fileId, fileName, extractedData) {
    return this.addEntry({
      type: 'file',
      action: 'file_processed',
      data: {
        fileId,
        fileName,
        recordsExtracted: extractedData?.length || 0,
        dataSize: JSON.stringify(extractedData || {}).length
      },
      tags: ['processed', 'file']
    });
  }

  logAnalysisStarted(analysisId, analysisName, fileIds) {
    return this.addEntry({
      type: 'analysis',
      action: 'analysis_started',
      data: {
        analysisId,
        analysisName,
        fileCount: fileIds.length,
        fileIds
      },
      tags: ['analysis', 'started']
    });
  }

  logAnalysisProgress(analysisId, step, progress) {
    return this.addEntry({
      type: 'analysis',
      action: 'analysis_progress',
      data: {
        analysisId,
        step,
        progress
      },
      tags: ['analysis', 'progress']
    });
  }

  logAnalysisCompleted(analysisId, results) {
    return this.addEntry({
      type: 'analysis',
      action: 'analysis_completed',
      data: {
        analysisId,
        resultsSummary: {
          totalComparisons: results?.comparisons?.length || 0,
          totalRecords: results?.totalRecords || 0,
          differences: results?.differences?.length || 0
        }
      },
      tags: ['analysis', 'completed']
    });
  }

  logReportGenerated(reportId, reportType, analysisId) {
    return this.addEntry({
      type: 'report',
      action: 'report_generated',
      data: {
        reportId,
        reportType,
        analysisId
      },
      tags: ['report', 'generated']
    });
  }

  logError(error, context = {}) {
    return this.addEntry({
      type: 'error',
      action: 'error_occurred',
      status: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      data: context,
      level: 'error',
      tags: ['error']
    });
  }

  // ========== CONSULTAS E RELATÓRIOS ==========
  
  getHistory(filters = {}) {
    let filtered = [...this.history];

    if (filters.sessionId) {
      filtered = filtered.filter(entry => entry.sessionId === filters.sessionId);
    }

    if (filters.type) {
      filtered = filtered.filter(entry => entry.type === filters.type);
    }

    if (filters.action) {
      filtered = filtered.filter(entry => entry.action === filters.action);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate).toISOString();
      filtered = filtered.filter(entry => entry.timestamp >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate).toISOString();
      filtered = filtered.filter(entry => entry.timestamp <= end);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(entry => 
        filters.tags.some(tag => entry.metadata.tags.includes(tag))
      );
    }

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    return filtered
      .slice(-limit - offset, offset > 0 ? -offset : undefined)
      .reverse();
  }

  getSessionHistory(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Sessão não encontrada: ${sessionId}`);
    }

    const sessionEntries = this.history.filter(entry => entry.sessionId === sessionId);
    
    return {
      session,
      entries: sessionEntries,
      summary: this.generateSessionSummary(session, sessionEntries)
    };
  }

  generateSessionSummary(session, entries) {
    const summary = {
      duration: session.endTime ? 
        this.calculateDuration(session.startTime, session.endTime) : 
        this.calculateDuration(session.startTime, new Date().toISOString()),
      totalActions: entries.length,
      actionsByType: {},
      errors: entries.filter(e => e.type === 'error').length,
      filesProcessed: entries.filter(e => e.action === 'file_processed').length,
      analysesCompleted: entries.filter(e => e.action === 'analysis_completed').length,
      reportsGenerated: entries.filter(e => e.action === 'report_generated').length
    };

    // Contar ações por tipo
    entries.forEach(entry => {
      summary.actionsByType[entry.type] = (summary.actionsByType[entry.type] || 0) + 1;
    });

    return summary;
  }

  getProgressReport(sessionId = null) {
    const id = sessionId || this.currentSession;
    if (!id) {
      return null;
    }

    const session = this.sessions.get(id);
    if (!session || !session.progress) {
      return null;
    }

    return {
      ...session.progress,
      estimatedTimeRemaining: this.estimateTimeRemaining(session.progress)
    };
  }

  // ========== UTILITÁRIOS ==========
  
  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  estimateTimeRemaining(progress) {
    if (!progress.startTime || progress.completedSteps === 0) {
      return 'Calculando...';
    }

    const elapsed = new Date() - new Date(progress.startTime);
    const avgTimePerStep = elapsed / progress.completedSteps;
    const remainingSteps = progress.totalSteps - progress.completedSteps;
    const estimatedMs = avgTimePerStep * remainingSteps;
    
    const minutes = Math.floor(estimatedMs / (1000 * 60));
    const seconds = Math.floor((estimatedMs % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  // ========== EXPORTAÇÃO E BACKUP ==========
  
  exportHistory(exportPath, filters = {}) {
    const historyData = this.getHistory(filters);
    const exportData = {
      exportedAt: new Date().toISOString(),
      filters,
      totalEntries: historyData.length,
      entries: historyData
    };

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    this.logger.info(`Histórico exportado para: ${exportPath}`);
    
    return exportPath;
  }

  generateReport(reportType = 'summary', filters = {}) {
    const entries = this.getHistory(filters);
    
    switch (reportType) {
      case 'summary':
        return this.generateSummaryReport(entries);
      case 'detailed':
        return this.generateDetailedReport(entries);
      case 'performance':
        return this.generatePerformanceReport(entries);
      default:
        throw new Error(`Tipo de relatório não suportado: ${reportType}`);
    }
  }

  generateSummaryReport(entries) {
    const report = {
      period: {
        start: entries.length > 0 ? entries[entries.length - 1].timestamp : null,
        end: entries.length > 0 ? entries[0].timestamp : null
      },
      totals: {
        entries: entries.length,
        sessions: new Set(entries.map(e => e.sessionId)).size,
        errors: entries.filter(e => e.type === 'error').length
      },
      breakdown: {
        byType: {},
        byAction: {},
        byDay: {}
      }
    };

    entries.forEach(entry => {
      // Por tipo
      report.breakdown.byType[entry.type] = (report.breakdown.byType[entry.type] || 0) + 1;
      
      // Por ação
      report.breakdown.byAction[entry.action] = (report.breakdown.byAction[entry.action] || 0) + 1;
      
      // Por dia
      const day = entry.timestamp.split('T')[0];
      report.breakdown.byDay[day] = (report.breakdown.byDay[day] || 0) + 1;
    });

    return report;
  }

  generateDetailedReport(entries) {
    return {
      generatedAt: new Date().toISOString(),
      totalEntries: entries.length,
      entries: entries.map(entry => ({
        ...entry,
        formattedTimestamp: new Date(entry.timestamp).toLocaleString()
      }))
    };
  }

  generatePerformanceReport(entries) {
    const analysisEntries = entries.filter(e => e.type === 'analysis');
    const fileEntries = entries.filter(e => e.type === 'file');
    
    return {
      analysis: {
        total: analysisEntries.length,
        completed: analysisEntries.filter(e => e.action === 'analysis_completed').length,
        averageDuration: this.calculateAverageDuration(analysisEntries)
      },
      files: {
        total: fileEntries.length,
        processed: fileEntries.filter(e => e.action === 'file_processed').length,
        averageSize: this.calculateAverageFileSize(fileEntries)
      },
      errors: {
        total: entries.filter(e => e.type === 'error').length,
        byType: this.groupErrorsByType(entries.filter(e => e.type === 'error'))
      }
    };
  }

  calculateAverageDuration(entries) {
    const durations = entries
      .filter(e => e.duration)
      .map(e => this.parseDuration(e.duration));
    
    if (durations.length === 0) return '00:00:00';
    
    const avgMs = durations.reduce((sum, ms) => sum + ms, 0) / durations.length;
    return this.formatDuration(avgMs);
  }

  calculateAverageFileSize(entries) {
    const sizes = entries
      .filter(e => e.data && e.data.fileSize)
      .map(e => e.data.fileSize);
    
    if (sizes.length === 0) return 0;
    
    return Math.round(sizes.reduce((sum, size) => sum + size, 0) / sizes.length);
  }

  groupErrorsByType(errorEntries) {
    return errorEntries.reduce((acc, entry) => {
      const errorType = entry.error?.name || 'Unknown';
      acc[errorType] = (acc[errorType] || 0) + 1;
      return acc;
    }, {});
  }

  parseDuration(durationStr) {
    const [hours, minutes, seconds] = durationStr.split(':').map(Number);
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }

  formatDuration(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

export default HistoryManager;