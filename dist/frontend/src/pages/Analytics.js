import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  IconButton,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  DatePicker,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  useTheme,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp,
  TrendingDown,
  Download,
  Refresh,
  FilterList,
  Timeline,
  BarChart,
  PieChart,
  ShowChart,
  Assessment,
  Speed,
  Storage,
  Memory,
  CloudQueue,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { ptBR } from 'date-fns/locale';

// Dados de exemplo
const performanceData = [
  { time: '00:00', cpu: 45, memory: 62, disk: 78, network: 23 },
  { time: '04:00', cpu: 52, memory: 58, disk: 82, network: 31 },
  { time: '08:00', cpu: 78, memory: 71, disk: 85, network: 67 },
  { time: '12:00', cpu: 85, memory: 79, disk: 88, network: 89 },
  { time: '16:00', cpu: 92, memory: 85, disk: 91, network: 95 },
  { time: '20:00', cpu: 67, memory: 73, disk: 86, network: 54 },
];

const algorithmPerformance = [
  { name: 'Bubble Sort', time: 1200, memory: 45, executions: 150 },
  { name: 'Quick Sort', time: 45, memory: 52, executions: 890 },
  { name: 'Merge Sort', time: 65, memory: 78, executions: 670 },
  { name: 'Heap Sort', time: 58, memory: 65, executions: 420 },
  { name: 'Binary Search', time: 15, memory: 12, executions: 1200 },
  { name: 'Linear Search', time: 85, memory: 8, executions: 340 },
];

const userActivityData = [
  { hour: 0, users: 120 },
  { hour: 1, users: 95 },
  { hour: 2, users: 78 },
  { hour: 3, users: 65 },
  { hour: 4, users: 58 },
  { hour: 5, users: 72 },
  { hour: 6, users: 145 },
  { hour: 7, users: 234 },
  { hour: 8, users: 456 },
  { hour: 9, users: 678 },
  { hour: 10, users: 789 },
  { hour: 11, users: 845 },
  { hour: 12, users: 923 },
  { hour: 13, users: 876 },
  { hour: 14, users: 798 },
  { hour: 15, users: 734 },
  { hour: 16, users: 656 },
  { hour: 17, users: 567 },
  { hour: 18, users: 445 },
  { hour: 19, users: 334 },
  { hour: 20, users: 267 },
  { hour: 21, users: 198 },
  { hour: 22, users: 156 },
  { hour: 23, users: 134 },
];

const moduleUsageData = [
  { name: 'Analytics', value: 35, color: '#8884d8' },
  { name: 'Reports', value: 25, color: '#82ca9d' },
  { name: 'Business Logic', value: 20, color: '#ffc658' },
  { name: 'Notifications', value: 15, color: '#ff7300' },
  { name: 'Data Management', value: 5, color: '#00ff00' },
];

const radarData = [
  { subject: 'Performance', A: 120, B: 110, fullMark: 150 },
  { subject: 'Reliability', A: 98, B: 130, fullMark: 150 },
  { subject: 'Scalability', A: 86, B: 130, fullMark: 150 },
  { subject: 'Security', A: 99, B: 100, fullMark: 150 },
  { subject: 'Usability', A: 85, B: 90, fullMark: 150 },
  { subject: 'Maintainability', A: 65, B: 85, fullMark: 150 },
];

const MetricCard = ({ title, value, change, icon: Icon, color = 'primary', suffix = '' }) => {
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
          <Box flex={1}>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}{suffix}
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
          <Icon
            sx={{
              fontSize: 40,
              color: alpha(theme.palette[color].main, 0.7),
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Analytics = () => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simular carregamento de dados
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const handleExport = () => {
    // Implementar exportação de dados
    console.log('Exportando dados...');
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    handleRefresh();
  }, [timeRange]);

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Análise detalhada de performance e uso do sistema
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Período</InputLabel>
            <Select
              value={timeRange}
              label="Período"
              onChange={handleTimeRangeChange}
            >
              <MenuItem value="1h">Última hora</MenuItem>
              <MenuItem value="24h">Últimas 24h</MenuItem>
              <MenuItem value="7d">Últimos 7 dias</MenuItem>
              <MenuItem value="30d">Últimos 30 dias</MenuItem>
              <MenuItem value="custom">Personalizado</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Exportar
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
      </Box>

      {/* Filtros de Data Personalizada */}
      {timeRange === 'custom' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <Box display="flex" gap={2} alignItems="center">
                <MuiDatePicker
                  label="Data Inicial"
                  value={startDate}
                  onChange={setStartDate}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
                <MuiDatePicker
                  label="Data Final"
                  value={endDate}
                  onChange={setEndDate}
                  renderInput={(params) => <TextField {...params} size="small" />}
                />
                <Button variant="contained" onClick={handleRefresh}>
                  Aplicar
                </Button>
              </Box>
            </LocalizationProvider>
          </CardContent>
        </Card>
      )}

      {/* Métricas Principais */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Requisições/min"
            value="1,247"
            change={12.5}
            icon={Speed}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Tempo de Resposta"
            value="145"
            change={-8.2}
            icon={Timeline}
            color="success"
            suffix="ms"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Uso de CPU"
            value="67"
            change={5.1}
            icon={Memory}
            color="warning"
            suffix="%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Throughput"
            value="2.4"
            change={15.3}
            icon={CloudQueue}
            color="info"
            suffix="GB/h"
          />
        </Grid>
      </Grid>

      {/* Tabs de Análise */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Performance" icon={<ShowChart />} />
            <Tab label="Algoritmos" icon={<BarChart />} />
            <Tab label="Usuários" icon={<Assessment />} />
            <Tab label="Módulos" icon={<PieChart />} />
          </Tabs>
        </Box>

        {/* Tab Performance */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Typography variant="h6" gutterBottom>
                Performance do Sistema em Tempo Real
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
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
                    <Area
                      type="monotone"
                      dataKey="disk"
                      stackId="1"
                      stroke={theme.palette.success.main}
                      fill={theme.palette.success.main}
                      fillOpacity={0.6}
                      name="Disco (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Grid>
            <Grid item xs={12} lg={4}>
              <Typography variant="h6" gutterBottom>
                Análise de Qualidade
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 150]} />
                    <Radar
                      name="Atual"
                      dataKey="A"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.main}
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Meta"
                      dataKey="B"
                      stroke={theme.palette.secondary.main}
                      fill={theme.palette.secondary.main}
                      fillOpacity={0.3}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab Algoritmos */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom>
                Performance dos Algoritmos
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart data={algorithmPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" name="Tempo (ms)" />
                    <YAxis dataKey="memory" name="Memória (MB)" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter
                      name="Algoritmos"
                      data={algorithmPerformance}
                      fill={theme.palette.primary.main}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Detalhes dos Algoritmos
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Algoritmo</TableCell>
                      <TableCell align="right">Execuções</TableCell>
                      <TableCell align="right">Tempo Médio</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {algorithmPerformance.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell component="th" scope="row">
                          {row.name}
                        </TableCell>
                        <TableCell align="right">{row.executions}</TableCell>
                        <TableCell align="right">{row.time}ms</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab Usuários */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Atividade de Usuários por Hora
          </Typography>
          {isLoading ? (
            <Skeleton variant="rectangular" height={400} />
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" name="Hora" />
                <YAxis name="Usuários" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke={theme.palette.primary.main}
                  strokeWidth={3}
                  dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 4 }}
                  name="Usuários Ativos"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </TabPanel>

        {/* Tab Módulos */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Distribuição de Uso dos Módulos
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={moduleUsageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {moduleUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Uso por Módulo (Barras)
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={300} />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={moduleUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill={theme.palette.primary.main}
                      name="Uso (%)"
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </Grid>
          </Grid>
        </TabPanel>
      </Card>
    </Box>
  );
};

export default Analytics;