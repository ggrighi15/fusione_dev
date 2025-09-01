import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Skeleton,
  Fab,
  Menu,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Tooltip,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  Notifications as NotificationsIcon,
  FilterList as FilterIcon,
  Fullscreen as FullscreenIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import { Line, Bar, Doughnut, Area } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useSnackbar } from 'notistack';
import api from '../services/api';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const BusinessIntelligence = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 segundos
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [widgetTypes, setWidgetTypes] = useState([]);

  // Estados para criação/edição de dashboard
  const [dashboardForm, setDashboardForm] = useState({
    name: '',
    type: 'custom',
    description: '',
    widgets: []
  });

  // Estados para exportação
  const [exportForm, setExportForm] = useState({
    format: 'pdf',
    options: {}
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, []);

  // Auto-refresh dos dados
  useEffect(() => {
    let interval;
    if (autoRefresh && selectedDashboard && realTimeEnabled) {
      interval = setInterval(() => {
        loadDashboardData(selectedDashboard.id, false);
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedDashboard, realTimeEnabled, refreshInterval]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [dashboardsRes, kpisRes, widgetTypesRes, alertsRes] = await Promise.all([
        api.get('/api/bi/dashboards'),
        api.get('/api/bi/kpis'),
        api.get('/api/bi/widgets/types'),
        api.get('/api/bi/alerts')
      ]);

      setDashboards(dashboardsRes.data.data || []);
      setKpis(kpisRes.data.data || []);
      setWidgetTypes(widgetTypesRes.data.data || []);
      setAlerts(alertsRes.data.data || []);

      // Selecionar primeiro dashboard se existir
      if (dashboardsRes.data.data && dashboardsRes.data.data.length > 0) {
        const firstDashboard = dashboardsRes.data.data[0];
        setSelectedDashboard(firstDashboard);
        await loadDashboardData(firstDashboard.id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      enqueueSnackbar('Erro ao carregar dados do Business Intelligence', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (dashboardId, showLoading = true) => {
    try {
      if (showLoading) setDataLoading(true);
      const response = await api.get(`/api/bi/dashboards/${dashboardId}/data`);
      setDashboardData(response.data.data || {});
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      enqueueSnackbar('Erro ao carregar dados do dashboard', { variant: 'error' });
    } finally {
      if (showLoading) setDataLoading(false);
    }
  };

  const handleCreateDashboard = async () => {
    try {
      const response = await api.post('/api/bi/dashboards', dashboardForm);
      const newDashboard = response.data.data;
      
      setDashboards(prev => [...prev, newDashboard]);
      setSelectedDashboard(newDashboard);
      await loadDashboardData(newDashboard.id);
      
      setCreateDialogOpen(false);
      setDashboardForm({ name: '', type: 'custom', description: '', widgets: [] });
      enqueueSnackbar('Dashboard criado com sucesso', { variant: 'success' });
    } catch (error) {
      console.error('Erro ao criar dashboard:', error);
      enqueueSnackbar('Erro ao criar dashboard', { variant: 'error' });
    }
  };

  const handleUpdateDashboard = async () => {
    try {
      const response = await api.put(`/api/bi/dashboards/${selectedDashboard.id}`, dashboardForm);
      const updatedDashboard = response.data.data;
      
      setDashboards(prev => prev.map(d => d.id === updatedDashboard.id ? updatedDashboard : d));
      setSelectedDashboard(updatedDashboard);
      
      setEditDialogOpen(false);
      enqueueSnackbar('Dashboard atualizado com sucesso', { variant: 'success' });
    } catch (error) {
      console.error('Erro ao atualizar dashboard:', error);
      enqueueSnackbar('Erro ao atualizar dashboard', { variant: 'error' });
    }
  };

  const handleDeleteDashboard = async (dashboardId) => {
    if (!window.confirm('Tem certeza que deseja excluir este dashboard?')) return;
    
    try {
      await api.delete(`/api/bi/dashboards/${dashboardId}`);
      
      setDashboards(prev => prev.filter(d => d.id !== dashboardId));
      if (selectedDashboard?.id === dashboardId) {
        setSelectedDashboard(null);
        setDashboardData({});
      }
      
      enqueueSnackbar('Dashboard excluído com sucesso', { variant: 'success' });
    } catch (error) {
      console.error('Erro ao excluir dashboard:', error);
      enqueueSnackbar('Erro ao excluir dashboard', { variant: 'error' });
    }
  };

  const handleExportDashboard = async () => {
    try {
      const response = await api.post(`/api/bi/dashboards/${selectedDashboard.id}/export`, exportForm);
      
      setExportDialogOpen(false);
      enqueueSnackbar('Exportação iniciada com sucesso', { variant: 'success' });
    } catch (error) {
      console.error('Erro ao exportar dashboard:', error);
      enqueueSnackbar('Erro ao exportar dashboard', { variant: 'error' });
    }
  };

  const handleRefreshData = async () => {
    if (selectedDashboard) {
      await loadDashboardData(selectedDashboard.id);
      enqueueSnackbar('Dados atualizados', { variant: 'success' });
    }
  };

  const openEditDialog = (dashboard) => {
    setDashboardForm({
      name: dashboard.name,
      type: dashboard.type,
      description: dashboard.description || '',
      widgets: dashboard.widgets || []
    });
    setEditDialogOpen(true);
  };

  const getDashboardTypeColor = (type) => {
    const colors = {
      executive: '#1976d2',
      legal: '#388e3c',
      financial: '#f57c00',
      operational: '#7b1fa2',
      custom: '#424242'
    };
    return colors[type] || colors.custom;
  };

  const getDashboardTypeIcon = (type) => {
    const icons = {
      executive: <AssessmentIcon />,
      legal: <TimelineIcon />,
      financial: <TrendingUpIcon />,
      operational: <BarChartIcon />,
      custom: <DashboardIcon />
    };
    return icons[type] || icons.custom;
  };

  const renderWidget = (widget, index) => {
    const widgetData = dashboardData[widget.id] || {};
    
    return (
      <Grid item xs={12} sm={6} md={widget.size || 4} key={widget.id}>
        <Card sx={{ height: '100%', position: 'relative' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" component="div">
                {widget.title}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => {
                  setAnchorEl(e.currentTarget);
                  setSelectedWidget(widget);
                }}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
            
            {dataLoading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : (
              renderWidgetContent(widget, widgetData)
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderWidgetContent = (widget, data) => {
    switch (widget.type) {
      case 'kpi_grid':
        return (
          <Grid container spacing={2}>
            {(data.kpis || []).map((kpi, index) => (
              <Grid item xs={6} key={index}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {kpi.value}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {kpi.label}
                  </Typography>
                  {kpi.change && (
                    <Chip
                      size="small"
                      label={`${kpi.change > 0 ? '+' : ''}${kpi.change}%`}
                      color={kpi.change > 0 ? 'success' : 'error'}
                    />
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        );
      
      case 'line_chart':
        return (
          <Box height={200}>
            <Line
              data={data.chartData || { labels: [], datasets: [] }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top'
                  }
                }
              }}
            />
          </Box>
        );
      
      case 'column_chart':
        return (
          <Box height={200}>
            <Bar
              data={data.chartData || { labels: [], datasets: [] }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top'
                  }
                }
              }}
            />
          </Box>
        );
      
      case 'donut_chart':
        return (
          <Box height={200} display="flex" justifyContent="center">
            <Doughnut
              data={data.chartData || { labels: [], datasets: [] }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </Box>
        );
      
      case 'metric_card':
        return (
          <Box textAlign="center">
            <Typography variant="h3" color="primary" gutterBottom>
              {data.value || '0'}
            </Typography>
            <Typography variant="h6" gutterBottom>
              {data.label || 'Métrica'}
            </Typography>
            {data.description && (
              <Typography variant="body2" color="textSecondary">
                {data.description}
              </Typography>
            )}
            {data.trend && (
              <Box mt={1}>
                <Chip
                  size="small"
                  label={`${data.trend > 0 ? '+' : ''}${data.trend}%`}
                  color={data.trend > 0 ? 'success' : 'error'}
                  icon={data.trend > 0 ? <TrendingUpIcon /> : <ShowChartIcon />}
                />
              </Box>
            )}
          </Box>
        );
      
      default:
        return (
          <Typography variant="body2" color="textSecondary">
            Widget tipo: {widget.type}
          </Typography>
        );
    }
  };

  if (loading) {
    return (
      <Box p={3}>
        <Skeleton variant="text" width={300} height={40} />
        <Grid container spacing={3} mt={2}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Business Intelligence
        </Typography>
        
        <Box display="flex" gap={1}>
          <FormControlLabel
            control={
              <Switch
                checked={realTimeEnabled}
                onChange={(e) => setRealTimeEnabled(e.target.checked)}
              />
            }
            label="Tempo Real"
          />
          
          <Tooltip title="Atualizar Dados">
            <IconButton onClick={handleRefreshData} disabled={dataLoading}>
              {dataLoading ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Novo Dashboard
          </Button>
        </Box>
      </Box>

      {/* Alertas */}
      {alerts.length > 0 && (
        <Box mb={3}>
          {alerts.slice(0, 3).map((alert, index) => (
            <Alert
              key={index}
              severity={alert.severity || 'info'}
              sx={{ mb: 1 }}
              action={
                <IconButton size="small">
                  <NotificationsIcon />
                </IconButton>
              }
            >
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {/* Lista de Dashboards */}
      <Grid container spacing={3} mb={3}>
        {dashboards.map((dashboard) => (
          <Grid item xs={12} sm={6} md={4} key={dashboard.id}>
            <Card
              sx={{
                cursor: 'pointer',
                border: selectedDashboard?.id === dashboard.id ? 2 : 1,
                borderColor: selectedDashboard?.id === dashboard.id 
                  ? getDashboardTypeColor(dashboard.type) 
                  : 'divider'
              }}
              onClick={() => {
                setSelectedDashboard(dashboard);
                loadDashboardData(dashboard.id);
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box color={getDashboardTypeColor(dashboard.type)}>
                      {getDashboardTypeIcon(dashboard.type)}
                    </Box>
                    <Box>
                      <Typography variant="h6" component="div">
                        {dashboard.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {dashboard.description}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(dashboard);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDashboard(dashboard.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                
                <Box mt={2}>
                  <Chip
                    size="small"
                    label={dashboard.type}
                    style={{ backgroundColor: getDashboardTypeColor(dashboard.type), color: 'white' }}
                  />
                  <Typography variant="caption" color="textSecondary" ml={1}>
                    {dashboard.widgets?.length || 0} widgets
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dashboard Selecionado */}
      {selectedDashboard && (
        <Paper sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="h2">
              {selectedDashboard.name}
            </Typography>
            
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={() => setExportDialogOpen(true)}
              >
                Exportar
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => openEditDialog(selectedDashboard)}
              >
                Configurar
              </Button>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          {/* Widgets do Dashboard */}
          <Grid container spacing={3}>
            {selectedDashboard.widgets?.map((widget, index) => renderWidget(widget, index))}
          </Grid>
          
          {(!selectedDashboard.widgets || selectedDashboard.widgets.length === 0) && (
            <Box textAlign="center" py={8}>
              <DashboardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Nenhum widget configurado
              </Typography>
              <Typography variant="body2" color="textSecondary" mb={3}>
                Adicione widgets para visualizar seus dados
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openEditDialog(selectedDashboard)}
              >
                Adicionar Widget
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* FAB para adicionar dashboard */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Dialog para criar dashboard */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Criar Novo Dashboard</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome do Dashboard"
                value={dashboardForm.name}
                onChange={(e) => setDashboardForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={dashboardForm.type}
                  onChange={(e) => setDashboardForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="executive">Executivo</MenuItem>
                  <MenuItem value="legal">Jurídico</MenuItem>
                  <MenuItem value="financial">Financeiro</MenuItem>
                  <MenuItem value="operational">Operacional</MenuItem>
                  <MenuItem value="custom">Personalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Descrição"
                value={dashboardForm.description}
                onChange={(e) => setDashboardForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateDashboard} variant="contained">Criar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para editar dashboard */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Dashboard</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome do Dashboard"
                value={dashboardForm.name}
                onChange={(e) => setDashboardForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Descrição"
                value={dashboardForm.description}
                onChange={(e) => setDashboardForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleUpdateDashboard} variant="contained">Salvar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para exportar dashboard */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Exportar Dashboard</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Formato</InputLabel>
            <Select
              value={exportForm.format}
              onChange={(e) => setExportForm(prev => ({ ...prev, format: e.target.value }))}
            >
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="excel">Excel</MenuItem>
              <MenuItem value="png">PNG</MenuItem>
              <MenuItem value="svg">SVG</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleExportDashboard} variant="contained">Exportar</Button>
        </DialogActions>
      </Dialog>

      {/* Menu de contexto para widgets */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ListItemIcon><EditIcon /></ListItemIcon>
          <ListItemText>Editar Widget</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ListItemIcon><FullscreenIcon /></ListItemIcon>
          <ListItemText>Tela Cheia</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ListItemIcon><RefreshIcon /></ListItemIcon>
          <ListItemText>Atualizar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ListItemIcon><DeleteIcon /></ListItemIcon>
          <ListItemText>Remover</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default BusinessIntelligence;