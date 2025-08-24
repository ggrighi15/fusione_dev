import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

class ReportGenerator {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Gera relatório completo da comparação
   */
  generateComparisonReport(comparisonResult, options = {}) {
    try {
      this.logger.info('Gerando relatório de comparação...');
      
      const report = {
        metadata: {
          generatedAt: new Date().toISOString(),
          datasets: comparisonResult.datasets,
          summary: comparisonResult.summary
        },
        statistics: comparisonResult.statistics,
        analysis: {
          newRecords: this.formatRecordsForReport(comparisonResult.newRecords, 'new'),
          removedRecords: this.formatRecordsForReport(comparisonResult.removedRecords, 'removed'),
          modifiedRecords: this.formatModifiedRecords(comparisonResult.modifiedRecords),
          significantChanges: this.identifySignificantChanges(comparisonResult)
        },
        insights: this.generateInsights(comparisonResult)
      };

      this.logger.info('Relatório de comparação gerado com sucesso');
      return report;
    } catch (error) {
      this.logger.error('Erro ao gerar relatório:', error);
      throw error;
    }
  }

  /**
   * Formata registros para o relatório
   */
  formatRecordsForReport(records, type) {
    return records.map(record => {
      const formatted = {
        key: record.key,
        type: type,
        data: record.record || record.data
      };

      // Adicionar informações específicas baseadas no tipo
      if (type === 'new') {
        formatted.description = `Novo processo: ${record.key}`;
      } else if (type === 'removed') {
        formatted.description = `Processo encerrado: ${record.key}`;
      }

      return formatted;
    });
  }

  /**
   * Formata registros modificados
   */
  formatModifiedRecords(modifiedRecords) {
    return modifiedRecords.map(record => {
      const changes = record.differences.map(diff => ({
        field: diff.field,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
        changeType: diff.changeType,
        magnitude: diff.magnitude,
        isSignificant: diff.isSignificant
      }));

      return {
        key: record.key,
        type: 'modified',
        description: `Processo alterado: ${record.key}`,
        changes: changes,
        significantChanges: changes.filter(c => c.isSignificant).length,
        totalChanges: changes.length
      };
    });
  }

  /**
   * Identifica mudanças significativas
   */
  identifySignificantChanges(comparisonResult) {
    const significantChanges = [];

    // Mudanças em valores altos
    comparisonResult.modifiedRecords.forEach(record => {
      record.differences.forEach(diff => {
        if (diff.isSignificant && diff.field.includes('Valor')) {
          significantChanges.push({
            key: record.key,
            field: diff.field,
            change: diff,
            impact: this.calculateImpact(diff)
          });
        }
      });
    });

    // Ordenar por impacto
    return significantChanges.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Calcula o impacto de uma mudança
   */
  calculateImpact(difference) {
    if (difference.changeType === 'numeric') {
      return Math.abs(difference.magnitude || 0);
    }
    return difference.magnitude || 0;
  }

  /**
   * Gera insights automáticos
   */
  generateInsights(comparisonResult) {
    const insights = [];
    const stats = comparisonResult.statistics;

    // Insight sobre novos processos
    if (stats.records.new > 0) {
      insights.push({
        type: 'new_processes',
        title: 'Novos Processos',
        description: `${stats.records.new} novos processos foram identificados`,
        severity: stats.records.new > 10 ? 'high' : 'medium'
      });
    }

    // Insight sobre processos encerrados
    if (stats.records.removed > 0) {
      insights.push({
        type: 'closed_processes',
        title: 'Processos Encerrados',
        description: `${stats.records.removed} processos foram encerrados`,
        severity: 'medium'
      });
    }

    // Insight sobre mudanças significativas
    const significantModifications = comparisonResult.modifiedRecords.filter(
      record => record.differences.some(diff => diff.isSignificant)
    ).length;

    if (significantModifications > 0) {
      insights.push({
        type: 'significant_changes',
        title: 'Mudanças Significativas',
        description: `${significantModifications} processos tiveram mudanças significativas`,
        severity: significantModifications > 5 ? 'high' : 'medium'
      });
    }

    // Insight sobre estabilidade
    const stabilityRate = (stats.records.unchanged / stats.records.total) * 100;
    insights.push({
      type: 'stability',
      title: 'Taxa de Estabilidade',
      description: `${stabilityRate.toFixed(1)}% dos processos permaneceram inalterados`,
      severity: stabilityRate > 80 ? 'low' : stabilityRate > 60 ? 'medium' : 'high'
    });

    return insights;
  }

  /**
   * Exporta relatório para Excel
   */
  exportToExcel(report, outputPath) {
    try {
      this.logger.info('Exportando relatório para Excel...');
      
      const workbook = XLSX.utils.book_new();

      // Aba de Resumo
      const summaryData = this.prepareSummarySheet(report);
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

      // Aba de Novos Processos
      if (report.analysis.newRecords.length > 0) {
        const newRecordsData = this.prepareRecordsSheet(report.analysis.newRecords, 'Novos');
        const newRecordsSheet = XLSX.utils.aoa_to_sheet(newRecordsData);
        XLSX.utils.book_append_sheet(workbook, newRecordsSheet, 'Novos Processos');
      }

      // Aba de Processos Encerrados
      if (report.analysis.removedRecords.length > 0) {
        const removedRecordsData = this.prepareRecordsSheet(report.analysis.removedRecords, 'Encerrados');
        const removedRecordsSheet = XLSX.utils.aoa_to_sheet(removedRecordsData);
        XLSX.utils.book_append_sheet(workbook, removedRecordsSheet, 'Processos Encerrados');
      }

      // Aba de Processos Modificados
      if (report.analysis.modifiedRecords.length > 0) {
        const modifiedRecordsData = this.prepareModifiedSheet(report.analysis.modifiedRecords);
        const modifiedRecordsSheet = XLSX.utils.aoa_to_sheet(modifiedRecordsData);
        XLSX.utils.book_append_sheet(workbook, modifiedRecordsSheet, 'Processos Modificados');
      }

      // Aba de Mudanças Significativas
      if (report.analysis.significantChanges.length > 0) {
        const significantData = this.prepareSignificantChangesSheet(report.analysis.significantChanges);
        const significantSheet = XLSX.utils.aoa_to_sheet(significantData);
        XLSX.utils.book_append_sheet(workbook, significantSheet, 'Mudanças Significativas');
      }

      // Salvar arquivo
      XLSX.writeFile(workbook, outputPath);
      this.logger.info(`Relatório Excel salvo em: ${outputPath}`);
      
      return outputPath;
    } catch (error) {
      this.logger.error('Erro ao exportar para Excel:', error);
      throw error;
    }
  }

  /**
   * Prepara dados para a aba de resumo
   */
  prepareSummarySheet(report) {
    const data = [
      ['RELATÓRIO DE ANÁLISE COMPARATIVA'],
      [''],
      ['Gerado em:', new Date(report.metadata.generatedAt).toLocaleString('pt-BR')],
      [''],
      ['DATASETS ANALISADOS'],
      ['Dataset 1:', report.metadata.datasets.dataset1.name, 'Registros:', report.metadata.datasets.dataset1.totalRecords],
      ['Dataset 2:', report.metadata.datasets.dataset2.name, 'Registros:', report.metadata.datasets.dataset2.totalRecords],
      [''],
      ['ESTATÍSTICAS GERAIS'],
      ['Total de Registros:', report.statistics.records.total],
      ['Novos Processos:', report.statistics.records.new],
      ['Processos Encerrados:', report.statistics.records.removed],
      ['Processos Modificados:', report.statistics.records.modified],
      ['Processos Inalterados:', report.statistics.records.unchanged],
      [''],
      ['INSIGHTS PRINCIPAIS']
    ];

    // Adicionar insights
    report.insights.forEach(insight => {
      data.push([insight.title, insight.description, `Severidade: ${insight.severity}`]);
    });

    return data;
  }

  /**
   * Prepara dados para abas de registros
   */
  prepareRecordsSheet(records, type) {
    const headers = ['Chave', 'Tipo', 'Descrição'];
    
    // Adicionar cabeçalhos específicos baseados nos dados
    if (records.length > 0 && records[0].data) {
      const sampleData = records[0].data;
      Object.keys(sampleData).forEach(key => {
        if (!headers.includes(key)) {
          headers.push(key);
        }
      });
    }

    const data = [headers];

    records.forEach(record => {
      const row = [record.key, record.type, record.description];
      
      // Adicionar dados específicos
      if (record.data) {
        headers.slice(3).forEach(header => {
          row.push(record.data[header] || '');
        });
      }
      
      data.push(row);
    });

    return data;
  }

  /**
   * Prepara dados para aba de processos modificados
   */
  prepareModifiedSheet(modifiedRecords) {
    const data = [
      ['Chave', 'Descrição', 'Total de Mudanças', 'Mudanças Significativas', 'Campos Alterados']
    ];

    modifiedRecords.forEach(record => {
      const changedFields = record.changes.map(c => c.field).join(', ');
      data.push([
        record.key,
        record.description,
        record.totalChanges,
        record.significantChanges,
        changedFields
      ]);
    });

    return data;
  }

  /**
   * Prepara dados para aba de mudanças significativas
   */
  prepareSignificantChangesSheet(significantChanges) {
    const data = [
      ['Chave', 'Campo', 'Valor Anterior', 'Valor Atual', 'Tipo de Mudança', 'Magnitude', 'Impacto']
    ];

    significantChanges.forEach(change => {
      data.push([
        change.key,
        change.field,
        change.change.oldValue,
        change.change.newValue,
        change.change.changeType,
        change.change.magnitude,
        change.impact
      ]);
    });

    return data;
  }

  /**
   * Exporta relatório para JSON
   */
  exportToJSON(report, outputPath) {
    try {
      this.logger.info('Exportando relatório para JSON...');
      
      const jsonContent = JSON.stringify(report, null, 2);
      fs.writeFileSync(outputPath, jsonContent, 'utf8');
      
      this.logger.info(`Relatório JSON salvo em: ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error('Erro ao exportar para JSON:', error);
      throw error;
    }
  }

  /**
   * Gera relatório resumido
   */
  generateSummaryReport(comparisonResult) {
    const summary = {
      timestamp: new Date().toISOString(),
      overview: {
        totalProcesses: comparisonResult.statistics.records.total,
        newProcesses: comparisonResult.statistics.records.new,
        closedProcesses: comparisonResult.statistics.records.removed,
        modifiedProcesses: comparisonResult.statistics.records.modified,
        unchangedProcesses: comparisonResult.statistics.records.unchanged
      },
      highlights: {
        stabilityRate: ((comparisonResult.statistics.records.unchanged / comparisonResult.statistics.records.total) * 100).toFixed(1) + '%',
        changeRate: ((comparisonResult.statistics.records.modified / comparisonResult.statistics.records.total) * 100).toFixed(1) + '%',
        significantChanges: comparisonResult.modifiedRecords.filter(
          record => record.differences.some(diff => diff.isSignificant)
        ).length
      },
      topChanges: comparisonResult.modifiedRecords
        .filter(record => record.differences.some(diff => diff.isSignificant))
        .slice(0, 5)
        .map(record => ({
          key: record.key,
          changesCount: record.differences.length,
          significantChanges: record.differences.filter(diff => diff.isSignificant).length
        }))
    };

    return summary;
  }
}

export default ReportGenerator;