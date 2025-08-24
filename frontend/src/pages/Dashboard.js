import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  IconButton,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Analytics,
  Speed,
  Storage,
  Notifications,
  Assessment,
  Timeline,
  Refresh,
  MoreVert,
  CheckCircle,
  Warning,
  Error,
  Info,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useSettings } from '../contexts/SettingsContext';

// Dados de exemplo para os gráficos
const performanceData = [
  { name: 'Jan', cpu: 65, memory: 45, requests: 1200 },
  { name: 'Fev', cpu: 59, memory: 52, requests: 1400 },
  { name: 'Mar', cpu: 80, memory: 48, requests: 1600 },
  { name: 'Abr', cpu: 81, memory: 61, requests: 1800 },
  { name: 'Mai', cpu: 56, memory: 55, requests: 2000 },
  { name: 'Jun', cpu: 55, memory: 40, requests: 2200 },
];

const algorithmData = [
  { name: 'Bubble Sort', executions: 450, avgTime: 120 },
  { name: 'Quick Sort', executions: 890, avgTime: 45 },
  { name: 'Merge Sort', executions: 670, avgTime: 65 },
  { name: 'Binary Search', executions: 1200, avgTime: 15 },
  { name: 'Linear Search', executions: 340, avgTime: 85 },
];

const moduleUsageData = [
  { name: 'Analytics', value: 35, color: '#8884d8' },
  { name: 'Reports', value: 25, color: '#82ca9d' },
  { name: 'Business Logic', value: 20, color: '#ffc658' },
  { name: 'Notifications', value: 15, color: '#ff7300' },
  { name: 'Data Management', value: 5, color: '#00ff00' },
];

const recentActivities = [
  {
    id: 1,
    type: 'success',
    title: 'Relatório gerado',
    description: 'Relatório de performance mensal foi gerado com sucesso',
    timestamp: '2 min atrás',
    icon: CheckCircle,
  },
  {
    id: 2,
    type: 'warning',
    title: 'Alto uso de CPU',
    description: 'CPU atingiu 85% de utilização no servidor principal',
    timestamp: '15 min atrás',
    icon: Warning,
  },
  {
    id: 3,
    type: 'info',
    title: 'Novo usuário registrado',
    description: 'João Silva se registrou no sistema',
    timestamp: '1 hora atrás',
    icon: Info,
  },
  {
    id: 4,
    type: 'error',
    title: 'Falha na sincronização',
    description: 'Erro ao sincronizar dados com o banco externo',
    timestamp: '2 horas atrás',
    icon: Error,
  },
];

const StatCard = ({ title, value, change, icon: Icon, color = 'primary' }) => {
  const theme = useTheme();
  const isPositive = change >= 0;
  
  return (
    <Card 
      sx={{ 
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.1)} 0%, ${alpha(theme.palette[color].main, 0.05)} 100%)`,
        border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            <Box display="flex" alignItems="center" mt={1}>
              {isPositive ? (
                <TrendingUp color="success" fontSize="small" />
              ) : (
                <TrendingDown color="error" fontSize="small" />
              )}
              <Typography
                variant="body2"
                color={isPositive ? 'success.main' : 'error.main'}
                ml={0.5}
              >
                {isPositive ? '+' : ''}{change}%
              </Typography>
            </Box>
          </Box>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette[color].main, 0.1),
              color: theme.palette[color].main,
              width: 56,
              height: 56,
            }}
          >
            <Icon fontSize="large" />
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
};

const ActivityItem = ({ activity }) => {
  const theme = useTheme();
  const IconComponent = activity.icon;
  
  const getColor = (type) => {
    switch (type) {
      case 'success': return theme.palette.success.main;
      case 'warning': return theme.palette.warning.main;
      case 'error': return theme.palette.error.main;
      case 'info': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  return (
    <ListItem alignItems="flex-start">
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: alpha(getColor(activity.type), 0.1), color: getColor(activity.type) }}>
          <IconComponent fontSize="small" />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={activity.title}
        secondary={
          <>
            <Typography component="span" variant="body2" color="text.primary">
              {activity.description}
            </Typography>
            <br />
            <Typography component="span" variant="caption" color="text.secondary">
              {activity.timestamp}
            </Typography>
          </>
        }
      />
    </ListItem>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { unreadCount } = useNotification();
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [systemStats, setSystemStats] = useState({
    totalRequests: 15420,
    activeUsers: 1247,
    systemUptime: 99.8,
    dataProcessed: 2.4,
  });

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simular carregamento de dados
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  useEffect(() => {
    // Carregar dados do dashboard
    handleRefresh();
  }, []);

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Bem-vindo de volta, {user?.name || 'Usuário'}! Aqui está um resumo do seu sistema.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={isLoading}
        >
          Atualizar
        </Button>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Requisições"
            value={systemStats.totalRequests.toLocaleString()}
            change={12.5}
            icon={Analytics}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Usuários Ativos"
            value={systemStats.activeUsers.toLocaleString()}
            change={8.2}
            icon={Speed}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Uptime do Sistema"
            value={`${systemStats.systemUptime}%`}
            change={0.1}
            icon={Assessment}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Dados Processados"
            value={`${systemStats.dataProcessed} TB`}
            change={-2.1}
            icon={Storage}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Gráficos e Atividades */}
      <Grid container spacing={3}>
        {/* Gráfico de Performance */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" component="h2">
                  Performance do Sistema
                </Typography>
                <IconButton size="small">
                  <MoreVert />
                </IconButton>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stackId="1"
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.primary.main}
                    fillOpacity={0.6}
                    name="CPU (%)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    stackId="1"
                    stroke={theme.palette.secondary.main}
                    fill={theme.palette.secondary.main}
                    fillOpacity={0.6}
                    name="Memória (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Atividades Recentes */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" component="h2">
                  Atividades Recentes
                </Typography>
                <Chip
                  label={`${unreadCount} novas`}
                  color="primary"
                  size="small"
                  icon={<Notifications />}
                />
              </Box>
              <List sx={{ maxHeight: 280, overflow: 'auto' }}>
                {recentActivities.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ActivityItem activity={activity} />
                    {index < recentActivities.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Uso de Algoritmos */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" mb={2}>
                Execução de Algoritmos
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={algorithmData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="executions"
                    fill={theme.palette.primary.main}
                    name="Execuções"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Uso de Módulos */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" mb={2}>
                Uso de Módulos
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={moduleUsageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {moduleUsageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Métricas de Tempo Real */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" mb={2}>
                Métricas em Tempo Real
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke={theme.palette.success.main}
                    strokeWidth={3}
                    dot={{ fill: theme.palette.success.main, strokeWidth: 2, r: 4 }}
                    name="Requisições"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;