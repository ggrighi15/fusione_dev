import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Button,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CloudUpload,
  Compare,
  Download,
  Visibility,
  Delete,
  CheckCircle,
  Error,
  Warning,
  Info,
  Assessment,
  TableChart,
  PictureAsPdf,
  GetApp,
  Refresh,
  Timeline,
  TrendingUp,
  TrendingDown,
  Add,
  Remove,
  Edit,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const DataAnalysis = () => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState({ excel: [], json: [], xml: [] });
  const [analysisResults, setAnalysisResults] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [reportDialog, setReportDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Configuração do dropzone unificado para todos os tipos
  const unifiedDropzone = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml']
    },
    maxFiles: 20,
    onDrop: (acceptedFiles) => {
      const totalFiles = uploadedFiles.excel.length + uploadedFiles.json.length + uploadedFiles.xml.length;
      
      if (totalFiles + acceptedFiles.length > 20) {
        setError('Máximo de 20 arquivos permitidos');
        return;
      }
      
      const categorizedFiles = {
        excel: [],
        json: [],
        xml: []
      };
      
      acceptedFiles.forEach(file => {
        const fileType = getFileType(file.name);
        const fileObj = {
          file,
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: fileType
        };
        
        categorizedFiles[fileType].push(fileObj);
      });
      
      setUploadedFiles(prev => ({
        excel: [...prev.excel, ...categorizedFiles.excel],
        json: [...prev.json, ...categorizedFiles.json],
        xml: [...prev.xml, ...categorizedFiles.xml]
      }));
    }
  });

  // Função para determinar o tipo do arquivo
  const getFileType = (filename) => {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return 'excel';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      default:
        return 'unknown';
    }
  };
  
  // Função para obter estatísticas dos arquivos
  const getFileStats = () => {
    const total = uploadedFiles.excel.length + uploadedFiles.json.length + uploadedFiles.xml.length;
    return {
      total,
      excel: uploadedFiles.excel.length,
      json: uploadedFiles.json.length,
      xml: uploadedFiles.xml.length,
      remaining: 20 - total
    };
  };

  // Carregar relatórios existentes
  const loadReports = useCallback(async () => {
    try {
      const response = await axios.get('/api/data-analysis/reports');
      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    }
  }, []);

  // Carregar histórico
  const loadHistory = async () => {
    try {
      const response = await axios.get('/api/data-analysis/history');
      return response.data;
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      return [];
    }
  };

  // Carregar estatísticas
  const loadStatistics = async () => {
    try {
      const response = await axios.get('/api/data-analysis/statistics');
      return response.data;
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      return null;
    }
  };

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Remover arquivo da lista
  const removeFile = (fileId, type) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: prev[type].filter(f => f.id !== fileId)
    }));
  };

  // Preview de arquivo Excel
  const previewFile = async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file.file);
      
      const response = await axios.post('/api/data-analysis/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setPreviewData(response.data.preview);
        setPreviewDialog(true);
      }
    } catch (error) {
      setError('Erro ao gerar preview do arquivo');
    } finally {
      setLoading(false);
    }
  };

  // Executar análise completa
  const executeAnalysis = async () => {
    const stats = getFileStats();
    
    if (stats.total < 2) {
      setError('Pelo menos 2 arquivos são necessários para análise comparativa');
      return;
    }

    setLoading(true);
    setError(null);
    setActiveStep(1);
    
    try {
      const formData = new FormData();
      
      // Adicionar todos os arquivos com identificação de tipo
      uploadedFiles.excel.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });
      
      uploadedFiles.json.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });
      
      uploadedFiles.xml.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });
      
      // Metadados da análise
      formData.append('analysisType', 'multi-file-comparison');
      formData.append('fileCount', stats.total.toString());
      formData.append('fileTypes', JSON.stringify({
        excel: stats.excel,
        json: stats.json,
        xml: stats.xml
      }));
      formData.append('autoAnalyze', 'true');
      formData.append('reportFormat', 'json');
      
      const response = await axios.post('/api/data-analysis/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setAnalysisResults(response.data);
        setActiveStep(2);
        setSuccess(`Análise concluída com sucesso! ${stats.total} arquivos processados.`);
        setSuccess('Análise executada com sucesso!');
        setActiveStep(2);
        loadReports(); // Recarregar lista de relatórios
      }
    } catch (error) {
      setError('Erro ao executar análise: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Download de relatório
  const downloadReport = async (reportId, format = 'json') => {
    try {
      const response = await axios.get(`/api/data-analysis/reports/${reportId}?format=${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_${reportId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Erro ao baixar relatório');
    }
  };

  // Formatar tamanho do arquivo
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Obter ícone de status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'error': return <Error color="error" />;
      case 'uploaded': return <Warning color="warning" />;
      default: return <Info color="info" />;
    }
  };

  // Obter cor do chip de status
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'error': return 'error';
      case 'uploaded': return 'warning';
      default: return 'default';
    }
  };

  const steps = [
    {
      label: 'Upload de Arquivos',
      description: 'Envie os arquivos Excel e JSON para análise'
    },
    {
      label: 'Configuração e Execução',
      description: 'Configure e execute a análise comparativa'
    },
    {
      label: 'Resultados e Relatórios',
      description: 'Visualize os resultados e baixe os relatórios'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <Assessment sx={{ mr: 2, verticalAlign: 'middle' }} />
          Análise Comparativa de Dados
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Compare dados entre períodos, identifique diferenças e gere relatórios detalhados
        </Typography>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <AlertTitle>Erro</AlertTitle>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          <AlertTitle>Sucesso</AlertTitle>
          {success}
        </Alert>
      )}

      {/* Progress */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1 }} align="center">
            Processando...
          </Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Stepper */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Processo de Análise
              </Typography>
              <Stepper activeStep={activeStep} orientation="vertical">
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel>{step.label}</StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        </Grid>

        {/* Conteúdo Principal */}
        <Grid item xs={12} md={8}>
          {/* Step 1: Upload de Arquivos */}
          {activeStep === 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upload de Arquivos
                </Typography>
                
                {/* Upload Unificado */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Upload de Arquivos (até 20 arquivos)
                  </Typography>
                  
                  {/* Estatísticas dos arquivos */}
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">Total</Typography>
                        <Typography variant="h6">{getFileStats().total}/20</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">Excel</Typography>
                        <Typography variant="h6" color="primary.main">{getFileStats().excel}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">JSON</Typography>
                        <Typography variant="h6" color="secondary.main">{getFileStats().json}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="body2" color="text.secondary">XML</Typography>
                        <Typography variant="h6" color="success.main">{getFileStats().xml}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  <Paper
                    {...unifiedDropzone.getRootProps()}
                    sx={{
                      p: 3,
                      border: '2px dashed',
                      borderColor: unifiedDropzone.isDragActive ? 'primary.main' : 'grey.300',
                      bgcolor: unifiedDropzone.isDragActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input {...unifiedDropzone.getInputProps()} />
                    <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" gutterBottom>
                      {unifiedDropzone.isDragActive
                        ? 'Solte os arquivos aqui...'
                        : 'Arraste arquivos aqui ou clique para selecionar'
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Formatos aceitos: .xlsx, .xls, .json, .xml
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Restam {getFileStats().remaining} arquivos
                    </Typography>
                  </Paper>
                  
                  {/* Lista de todos os arquivos */}
                  {getFileStats().total > 0 && (
                    <Box sx={{ mt: 2 }}>
                      {/* Arquivos Excel */}
                      {uploadedFiles.excel.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="primary.main" gutterBottom>
                            Arquivos Excel ({uploadedFiles.excel.length})
                          </Typography>
                          <List dense>
                            {uploadedFiles.excel.map((file) => (
                              <ListItem key={file.id}>
                                <ListItemIcon>
                                  <TableChart color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={file.name}
                                  secondary={formatFileSize(file.size)}
                                />
                                <ListItemSecondaryAction>
                                  <Tooltip title="Preview">
                                    <IconButton onClick={() => previewFile(file)} size="small">
                                      <Visibility />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Remover">
                                    <IconButton onClick={() => removeFile(file.id, 'excel')} size="small">
                                      <Delete />
                                    </IconButton>
                                  </Tooltip>
                                </ListItemSecondaryAction>
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      
                      {/* Arquivos JSON */}
                      {uploadedFiles.json.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="secondary.main" gutterBottom>
                            Arquivos JSON ({uploadedFiles.json.length})
                          </Typography>
                          <List dense>
                            {uploadedFiles.json.map((file) => (
                              <ListItem key={file.id}>
                                <ListItemIcon>
                                  <Assessment color="secondary" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={file.name}
                                  secondary={formatFileSize(file.size)}
                                />
                                <ListItemSecondaryAction>
                                  <Tooltip title="Remover">
                                    <IconButton onClick={() => removeFile(file.id, 'json')} size="small">
                                      <Delete />
                                    </IconButton>
                                  </Tooltip>
                                </ListItemSecondaryAction>
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                      
                      {/* Arquivos XML */}
                      {uploadedFiles.xml.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" color="success.main" gutterBottom>
                            Arquivos XML ({uploadedFiles.xml.length})
                          </Typography>
                          <List dense>
                            {uploadedFiles.xml.map((file) => (
                              <ListItem key={file.id}>
                                <ListItemIcon>
                                  <Edit color="success" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={file.name}
                                  secondary={formatFileSize(file.size)}
                                />
                                <ListItemSecondaryAction>
                                  <Tooltip title="Remover">
                                    <IconButton onClick={() => removeFile(file.id, 'xml')} size="small">
                                      <Delete />
                                    </IconButton>
                                  </Tooltip>
                                </ListItemSecondaryAction>
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Botões de ação */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setUploadedFiles({ excel: [], json: [], xml: [] })}
                    disabled={getFileStats().total === 0}
                  >
                    Limpar Tudo
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(1)}
                    disabled={getFileStats().total === 0}
                    endIcon={<Compare />}
                  >
                    Continuar para Análise
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Configuração e Execução */}
          {activeStep === 1 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuração e Execução da Análise
                </Typography>
                
                {/* Resumo dos arquivos */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Arquivos Selecionados:
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                        <Typography variant="body2" color="primary" gutterBottom>
                          Arquivos Excel: {uploadedFiles.excel.length}
                        </Typography>
                        {uploadedFiles.excel.map((file, index) => (
                          <Typography key={file.id} variant="caption" display="block">
                            {index + 1}. {file.name}
                          </Typography>
                        ))}
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                        <Typography variant="body2" color="secondary" gutterBottom>
                          Dicionários JSON: {uploadedFiles.json.length}
                        </Typography>
                        {uploadedFiles.json.map((file, index) => (
                          <Typography key={file.id} variant="caption" display="block">
                            {index + 1}. {file.name}
                          </Typography>
                        ))}
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                        <Typography variant="body2" color="success.main" gutterBottom>
                          Arquivos XML: {uploadedFiles.xml.length}
                        </Typography>
                        {uploadedFiles.xml.map((file, index) => (
                          <Typography key={file.id} variant="caption" display="block">
                            {index + 1}. {file.name}
                          </Typography>
                        ))}
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                {/* Botões de ação */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setActiveStep(0)}
                  >
                    Voltar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={executeAnalysis}
                    disabled={loading || getFileStats().total === 0}
                    endIcon={<Timeline />}
                  >
                    {loading ? 'Executando...' : 'Executar Análise'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Resultados */}
          {activeStep === 2 && analysisResults && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Resultados da Análise
                </Typography>
                
                {/* Resumo dos resultados */}
                {analysisResults.summary && (
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                        <Typography variant="h4" color="info.main">
                          {analysisResults.summary.totalRecords}
                        </Typography>
                        <Typography variant="body2">Total</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                        <Typography variant="h4" color="success.main">
                          {analysisResults.summary.newRecords}
                        </Typography>
                        <Typography variant="body2">Novos</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.error.main, 0.1) }}>
                        <Typography variant="h4" color="error.main">
                          {analysisResults.summary.removedRecords}
                        </Typography>
                        <Typography variant="body2">Removidos</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                        <Typography variant="h4" color="warning.main">
                          {analysisResults.summary.modifiedRecords}
                        </Typography>
                        <Typography variant="body2">Modificados</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                )}

                {/* Ações */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  {analysisResults.reportId && (
                    <>
                      <Button
                        variant="contained"
                        startIcon={<Download />}
                        onClick={() => downloadReport(analysisResults.reportId, 'json')}
                      >
                        Download JSON
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<GetApp />}
                        onClick={() => downloadReport(analysisResults.reportId, 'xlsx')}
                      >
                        Download Excel
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={() => {
                      setActiveStep(0);
                      setAnalysisResults(null);
                      setUploadedFiles({ excel: [], json: [], xml: [] });
                    }}
                  >
                    Nova Análise
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Relatórios Existentes */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Relatórios Existentes
            </Typography>
            <Button
              startIcon={<Refresh />}
              onClick={loadReports}
              size="small"
              sx={{ mr: 1 }}
            >
              Atualizar
            </Button>
            <Button
              startIcon={<Timeline />}
              onClick={async () => {
                const history = await loadHistory();
                console.log('Histórico:', history);
                // Aqui você pode abrir um modal ou navegar para uma página de histórico
              }}
              size="small"
            >
              Histórico
            </Button>
          </Box>
          
          {reports.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              Nenhum relatório encontrado
            </Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Formato</TableCell>
                    <TableCell>Tamanho</TableCell>
                    <TableCell>Criado em</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {report.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={report.format.toUpperCase()}
                          size="small"
                          color={report.format === 'xlsx' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>{formatFileSize(report.size)}</TableCell>
                      <TableCell>
                        {new Date(report.createdAt).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Download">
                          <IconButton
                            size="small"
                            onClick={() => downloadReport(report.id, report.format)}
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Preview */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Preview do Arquivo
        </DialogTitle>
        <DialogContent>
          {previewData && (
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    {previewData.headers.map((header, index) => (
                      <TableCell key={index}>
                        <Typography variant="subtitle2">
                          {header}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Typography variant="body2">
                            {cell}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataAnalysis;