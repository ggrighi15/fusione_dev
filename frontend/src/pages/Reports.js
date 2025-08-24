import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Fab,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Assessment,
  Add,
  Download,
  Share,
  Edit,
  Delete,
  Visibility,
  Schedule,
  FilterList,
  Search,
  MoreVert,
  PictureAsPdf,
  TableChart,
  InsertChart,
  Email,
  Print,
  Refresh,
  PlayArrow,
  Pause,
  Stop,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

// Dados de exemplo
const sampleReports = [
  {
    id: 1,
    name: 'Relatório de Performance Mensal',
    description: 'Análise detalhada da performance do sistema no último mês',
    type: 'performance',
    status: 'completed',
    createdAt: new Date('2024-01-15'),
    lastRun: new Date('2024-01-20'),
    nextRun: new Date('2024-02-15'),
    schedule: 'monthly',
    format: 'pdf',
    size: '2.4 MB',
    author: 'Sistema',
    downloads: 45,
  },
  {
    id: 2,
    name: 'Análise de Algoritmos',
    description: 'Comparativo de performance entre diferentes algoritmos',
    type: 'algorithms',
    status: 'running',
    createdAt: new Date('2024-01-10'),
    lastRun: new Date('2024-01-19'),
    nextRun: new Date('2024-01-26'),
    schedule: 'weekly',
    format: 'excel',
    size: '1.8 MB',
    author: 'João Silva',
    downloads: 23,
  },
  {
    id: 3,
    name: 'Relatório de Usuários',
    description: 'Estatísticas de uso e atividade dos usuários',
    type: 'users',
    status: 'scheduled',
    createdAt: new Date('2024-01-05'),
    lastRun: new Date('2024-01-18'),
    nextRun: new Date('2024-01-25'),
    schedule: 'weekly',
    format: 'pdf',
    size: '3.1 MB',
    author: 'Maria Santos',
    downloads: 67,
  },
  {
    id: 4,
    name: 'Dashboard Executivo',
    description: 'Resumo executivo com métricas principais',
    type: 'executive',
    status: 'failed',
    createdAt: new Date('2024-01-01'),
    lastRun: new Date('2024-01-17'),
    nextRun: new Date('2024-01-24'),
    schedule: 'daily',
    format: 'pdf',
    size: '1.2 MB',
    author: 'Sistema',
    downloads: 89,
  },
];

const reportTypes = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'performance', label: 'Performance' },
  { value: 'algorithms', label: 'Algoritmos' },
  { value: 'users', label: 'Usuários' },
  { value: 'executive', label: 'Executivo' },
  { value: 'custom', label: 'Personalizado' },
];

const reportFormats = [
  { value: 'pdf', label: 'PDF', icon: PictureAsPdf },
  { value: 'excel', label: 'Excel', icon: TableChart },
  { value: 'csv', label: 'CSV', icon: TableChart },
  { value: 'json', label: 'JSON', icon: InsertChart },
];

const scheduleOptions = [
  { value: 'once', label: 'Uma vez' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
];

const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return 'success';
    case 'running': return 'info';
    case 'scheduled': return 'warning';
    case 'failed': return 'error';
    default: return 'default';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'completed': return 'Concluído';
    case 'running': return 'Executando';
    case 'scheduled': return 'Agendado';
    case 'failed': return 'Falhou';
    default: return 'Desconhecido';
  }
};

const ReportCard = ({ report, onView, onEdit, onDelete, onDownload, onRun }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    handleMenuClose();
    action();
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box flex={1}>
            <Typography variant="h6" component="h3" gutterBottom>
              {report.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {report.description}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleMenuClick}>
            <MoreVert />
          </IconButton>
        </Box>

        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          <Chip
            label={getStatusText(report.status)}
            color={getStatusColor(report.status)}
            size="small"
          />
          <Chip
            label={report.format.toUpperCase()}
            variant="outlined"
            size="small"
          />
          <Chip
            label={report.schedule}
            variant="outlined"
            size="small"
          />
        </Box>

        <Box mb={2}>
          <Typography variant="caption" color="text.secondary" display="block">
            Criado em: {format(report.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Última execução: {format(report.lastRun, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Próxima execução: {format(report.nextRun, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </Typography>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {report.size} • {report.downloads} downloads
          </Typography>
          <Box>
            <IconButton size="small" onClick={() => onView(report)} color="primary">
              <Visibility />
            </IconButton>
            <IconButton size="small" onClick={() => onDownload(report)} color="success">
              <Download />
            </IconButton>
            {report.status !== 'running' && (
              <IconButton size="small" onClick={() => onRun(report)} color="info">
                <PlayArrow />
              </IconButton>
            )}
          </Box>
        </Box>
      </CardContent>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleAction(() => onView(report))}>
          <ListItemIcon><Visibility /></ListItemIcon>
          <ListItemText>Visualizar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(() => onEdit(report))}>
          <ListItemIcon><Edit /></ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(() => onDownload(report))}>
          <ListItemIcon><Download /></ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction(() => onRun(report))}>
          <ListItemIcon><PlayArrow /></ListItemIcon>
          <ListItemText>Executar Agora</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon><Share /></ListItemIcon>
          <ListItemText>Compartilhar</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon><Email /></ListItemIcon>
          <ListItemText>Enviar por Email</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction(() => onDelete(report))} sx={{ color: 'error.main' }}>
          <ListItemIcon><Delete color="error" /></ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
};

const CreateReportDialog = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'performance',
    format: 'pdf',
    schedule: 'once',
    startDate: new Date(),
    endDate: new Date(),
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleDateChange = (field) => (date) => {
    setFormData(prev => ({
      ...prev,
      [field]: date,
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Simular criação do relatório
      await new Promise(resolve => setTimeout(resolve, 2000));
      onSave(formData);
      toast.success('Relatório criado com sucesso!');
      onClose();
    } catch (error) {
      toast.error('Erro ao criar relatório');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Criar Novo Relatório</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nome do Relatório"
              value={formData.name}
              onChange={handleChange('name')}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descrição"
              value={formData.description}
              onChange={handleChange('description')}
              multiline
              rows={3}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Relatório</InputLabel>
              <Select
                value={formData.type}
                label="Tipo de Relatório"
                onChange={handleChange('type')}
              >
                {reportTypes.filter(type => type.value !== 'all').map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Formato</InputLabel>
              <Select
                value={formData.format}
                label="Formato"
                onChange={handleChange('format')}
              >
                {reportFormats.map((format) => (
                  <MenuItem key={format.value} value={format.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <format.icon fontSize="small" />
                      {format.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Agendamento</InputLabel>
              <Select
                value={formData.schedule}
                label="Agendamento"
                onChange={handleChange('schedule')}
              >
                {scheduleOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data de Início"
                value={formData.startDate}
                onChange={handleDateChange('startDate')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading || !formData.name}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Criar Relatório'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Reports = () => {
  const theme = useTheme();
  const [reports, setReports] = useState(sampleReports);
  const [filteredReports, setFilteredReports] = useState(sampleReports);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleTypeFilter = (event) => {
    setTypeFilter(event.target.value);
  };

  const handleStatusFilter = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simular carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Relatórios atualizados');
  };

  const handleViewReport = (report) => {
    toast.info(`Visualizando relatório: ${report.name}`);
  };

  const handleEditReport = (report) => {
    toast.info(`Editando relatório: ${report.name}`);
  };

  const handleDeleteReport = (report) => {
    setReports(prev => prev.filter(r => r.id !== report.id));
    toast.success('Relatório excluído com sucesso');
  };

  const handleDownloadReport = (report) => {
    toast.success(`Download iniciado: ${report.name}`);
  };

  const handleRunReport = (report) => {
    setReports(prev => prev.map(r => 
      r.id === report.id ? { ...r, status: 'running' } : r
    ));
    toast.info(`Executando relatório: ${report.name}`);
    
    // Simular execução
    setTimeout(() => {
      setReports(prev => prev.map(r => 
        r.id === report.id ? { ...r, status: 'completed', lastRun: new Date() } : r
      ));
      toast.success(`Relatório concluído: ${report.name}`);
    }, 3000);
  };

  const handleCreateReport = (reportData) => {
    const newReport = {
      id: Date.now(),
      ...reportData,
      status: 'scheduled',
      createdAt: new Date(),
      lastRun: new Date(),
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
      size: '0 KB',
      author: 'Usuário Atual',
      downloads: 0,
    };
    setReports(prev => [newReport, ...prev]);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filtrar relatórios
  useEffect(() => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report =>
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(report => report.type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    setFilteredReports(filtered);
    setPage(0);
  }, [reports, searchTerm, typeFilter, statusFilter]);

  const paginatedReports = filteredReports.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Relatórios
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie e visualize relatórios do sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          size="large"
        >
          Novo Relatório
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar relatórios..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={typeFilter}
                  label="Tipo"
                  onChange={handleTypeFilter}
                >
                  {reportTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={handleStatusFilter}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="completed">Concluído</MenuItem>
                  <MenuItem value="running">Executando</MenuItem>
                  <MenuItem value="scheduled">Agendado</MenuItem>
                  <MenuItem value="failed">Falhou</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                >
                  Filtros Avançados
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  Atualizar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Resultados */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Nenhum relatório encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando seu primeiro relatório'
              }
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Criar Primeiro Relatório
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Grid de Relatórios */}
          <Grid container spacing={3} mb={3}>
            {paginatedReports.map((report) => (
              <Grid item xs={12} sm={6} lg={4} key={report.id}>
                <ReportCard
                  report={report}
                  onView={handleViewReport}
                  onEdit={handleEditReport}
                  onDelete={handleDeleteReport}
                  onDownload={handleDownloadReport}
                  onRun={handleRunReport}
                />
              </Grid>
            ))}
          </Grid>

          {/* Paginação */}
          <Card>
            <TablePagination
              component="div"
              count={filteredReports.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[6, 12, 24, 48]}
              labelRowsPerPage="Relatórios por página:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          </Card>
        </>
      )}

      {/* Dialog de Criação */}
      <CreateReportDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSave={handleCreateReport}
      />

      {/* FAB para ações rápidas */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Reports;