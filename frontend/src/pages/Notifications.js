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
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Badge,
  Divider,
  Tab,
  Tabs,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Alert,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive,
  NotificationsOff,
  Settings,
  Delete,
  DeleteSweep,
  MarkEmailRead,
  MarkEmailUnread,
  FilterList,
  Search,
  Add,
  Info,
  Warning,
  Error,
  CheckCircle,
  Security,
  Update,
  BugReport,
  Schedule,
  Person,
  Computer,
  Email,
  Sms,
  VolumeUp,
  VolumeOff,
  Refresh,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { useNotification } from '../contexts/NotificationContext';

// Dados de exemplo
const sampleNotifications = [
  {
    id: 1,
    title: 'Sistema atualizado com sucesso',
    message: 'O sistema foi atualizado para a versão 2.1.0 com novas funcionalidades e correções de bugs.',
    type: 'success',
    category: 'system',
    priority: 'medium',
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
    actions: [{ label: 'Ver Changelog', action: 'view_changelog' }],
  },
  {
    id: 2,
    title: 'Falha na execução do algoritmo ML-001',
    message: 'O algoritmo de machine learning ML-001 falhou durante a execução. Verifique os logs para mais detalhes.',
    type: 'error',
    category: 'algorithm',
    priority: 'high',
    read: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutos atrás
    actions: [
      { label: 'Ver Logs', action: 'view_logs' },
      { label: 'Reiniciar', action: 'restart_algorithm' },
    ],
  },
  {
    id: 3,
    title: 'Novo usuário registrado',
    message: 'Um novo usuário (maria.silva@empresa.com) se registrou no sistema.',
    type: 'info',
    category: 'user',
    priority: 'low',
    read: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    actions: [{ label: 'Ver Perfil', action: 'view_profile' }],
  },
  {
    id: 4,
    title: 'Uso de CPU acima do limite',
    message: 'O uso de CPU atingiu 85% e está próximo do limite crítico de 90%.',
    type: 'warning',
    category: 'performance',
    priority: 'high',
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
    actions: [
      { label: 'Ver Métricas', action: 'view_metrics' },
      { label: 'Otimizar', action: 'optimize_performance' },
    ],
  },
  {
    id: 5,
    title: 'Backup concluído',
    message: 'O backup automático foi concluído com sucesso. 2.4 GB de dados foram salvos.',
    type: 'success',
    category: 'system',
    priority: 'low',
    read: true,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 horas atrás
    actions: [{ label: 'Ver Detalhes', action: 'view_backup_details' }],
  },
  {
    id: 6,
    title: 'Tentativa de acesso suspeita',
    message: 'Detectada tentativa de acesso suspeita do IP 192.168.1.100. Verifique os logs de segurança.',
    type: 'warning',
    category: 'security',
    priority: 'high',
    read: false,
    createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutos atrás
    actions: [
      { label: 'Ver Logs', action: 'view_security_logs' },
      { label: 'Bloquear IP', action: 'block_ip' },
    ],
  },
];

const notificationCategories = [
  { value: 'all', label: 'Todas', icon: NotificationsIcon },
  { value: 'system', label: 'Sistema', icon: Computer },
  { value: 'algorithm', label: 'Algoritmos', icon: BugReport },
  { value: 'user', label: 'Usuários', icon: Person },
  { value: 'performance', label: 'Performance', icon: Update },
  { value: 'security', label: 'Segurança', icon: Security },
];

const getNotificationIcon = (type) => {
  switch (type) {
    case 'success': return CheckCircle;
    case 'warning': return Warning;
    case 'error': return Error;
    case 'info': return Info;
    default: return Info;
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'success': return 'success';
    case 'warning': return 'warning';
    case 'error': return 'error';
    case 'info': return 'info';
    default: return 'default';
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return 'error';
    case 'medium': return 'warning';
    case 'low': return 'success';
    default: return 'default';
  }
};

const NotificationItem = ({ notification, onMarkRead, onDelete, onAction }) => {
  const theme = useTheme();
  const IconComponent = getNotificationIcon(notification.type);

  const handleAction = (actionType) => {
    onAction(notification.id, actionType);
  };

  return (
    <ListItem
      sx={{
        bgcolor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
        borderLeft: notification.read ? 'none' : `4px solid ${theme.palette.primary.main}`,
        mb: 1,
        borderRadius: 1,
        '&:hover': {
          bgcolor: alpha(theme.palette.action.hover, 0.1),
        },
      }}
    >
      <ListItemAvatar>
        <Avatar
          sx={{
            bgcolor: `${getNotificationColor(notification.type)}.main`,
            color: 'white',
          }}
        >
          <IconComponent />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: notification.read ? 'normal' : 'bold',
                flex: 1,
              }}
            >
              {notification.title}
            </Typography>
            <Chip
              label={notification.priority}
              size="small"
              color={getPriorityColor(notification.priority)}
              variant="outlined"
            />
          </Box>
        }
        secondary={
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {notification.message}
            </Typography>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(notification.createdAt, {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </Typography>
              {notification.actions && notification.actions.length > 0 && (
                <Box display="flex" gap={0.5}>
                  {notification.actions.map((action, index) => (
                    <Button
                      key={index}
                      size="small"
                      variant="outlined"
                      onClick={() => handleAction(action.action)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        }
      />
      <ListItemSecondaryAction>
        <Box display="flex" flexDirection="column" gap={0.5}>
          <IconButton
            size="small"
            onClick={() => onMarkRead(notification.id, !notification.read)}
            title={notification.read ? 'Marcar como não lida' : 'Marcar como lida'}
          >
            {notification.read ? <MarkEmailUnread /> : <MarkEmailRead />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onDelete(notification.id)}
            title="Excluir notificação"
            color="error"
          >
            <Delete />
          </IconButton>
        </Box>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

const NotificationSettings = ({ open, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleChange = (category, type, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: value,
      },
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Configurações de Notificações</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {Object.entries(localSettings).map(([category, categorySettings]) => (
            <Grid item xs={12} key={category}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
                  {category === 'system' ? 'Sistema' :
                   category === 'algorithm' ? 'Algoritmos' :
                   category === 'user' ? 'Usuários' :
                   category === 'performance' ? 'Performance' :
                   category === 'security' ? 'Segurança' : category}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={categorySettings.email}
                          onChange={(e) => handleChange(category, 'email', e.target.checked)}
                        />
                      }
                      label="Email"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={categorySettings.push}
                          onChange={(e) => handleChange(category, 'push', e.target.checked)}
                        />
                      }
                      label="Push"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={categorySettings.sound}
                          onChange={(e) => handleChange(category, 'sound', e.target.checked)}
                        />
                      }
                      label="Som"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">
          Salvar Configurações
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Notifications = () => {
  const theme = useTheme();
  const [notifications, setNotifications] = useState(sampleNotifications);
  const [filteredNotifications, setFilteredNotifications] = useState(sampleNotifications);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [notificationSettings, setNotificationSettings] = useState({
    system: { email: true, push: true, sound: true },
    algorithm: { email: true, push: true, sound: true },
    user: { email: false, push: true, sound: false },
    performance: { email: true, push: true, sound: true },
    security: { email: true, push: true, sound: true },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleCategoryFilter = (event) => {
    setCategoryFilter(event.target.value);
  };

  const handleTypeFilter = (event) => {
    setTypeFilter(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleMarkRead = (id, read) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read } : n
    ));
    toast.success(read ? 'Marcada como lida' : 'Marcada como não lida');
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('Todas as notificações foram marcadas como lidas');
  };

  const handleDeleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('Notificação excluída');
  };

  const handleDeleteAll = () => {
    setNotifications([]);
    toast.success('Todas as notificações foram excluídas');
  };

  const handleNotificationAction = (id, actionType) => {
    toast.info(`Ação executada: ${actionType}`);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simular carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Notificações atualizadas');
  };

  const handleSaveSettings = (newSettings) => {
    setNotificationSettings(newSettings);
  };

  // Filtrar notificações
  useEffect(() => {
    let filtered = notifications;

    if (searchTerm) {
      filtered = filtered.filter(notification =>
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(notification => notification.category === categoryFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(notification => notification.type === typeFilter);
    }

    if (showUnreadOnly) {
      filtered = filtered.filter(notification => !notification.read);
    }

    // Filtrar por aba
    if (selectedTab === 1) {
      filtered = filtered.filter(notification => !notification.read);
    } else if (selectedTab === 2) {
      filtered = filtered.filter(notification => notification.read);
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchTerm, categoryFilter, typeFilter, showUnreadOnly, selectedTab]);

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <Badge badgeContent={unreadCount} color="error" sx={{ mr: 2 }}>
              <NotificationsIcon />
            </Badge>
            Notificações
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie suas notificações e configurações
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Atualizar
          </Button>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setSettingsOpen(true)}
          >
            Configurações
          </Button>
        </Box>
      </Box>

      {/* Estatísticas */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary">
                    {notifications.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </Box>
                <NotificationsIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="error">
                    {unreadCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Não Lidas
                  </Typography>
                </Box>
                <NotificationsActive color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning">
                    {notifications.filter(n => n.priority === 'high').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Alta Prioridade
                  </Typography>
                </Box>
                <Warning color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success">
                    {notifications.filter(n => n.read).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lidas
                  </Typography>
                </Box>
                <MarkEmailRead color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros e Ações */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar notificações..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Categoria"
                  onChange={handleCategoryFilter}
                >
                  {notificationCategories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <category.icon fontSize="small" />
                        {category.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={typeFilter}
                  label="Tipo"
                  onChange={handleTypeFilter}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="success">Sucesso</MenuItem>
                  <MenuItem value="warning">Aviso</MenuItem>
                  <MenuItem value="error">Erro</MenuItem>
                  <MenuItem value="info">Informação</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1} justifyContent="flex-end" alignItems="center">
                <FormControlLabel
                  control={
                    <Switch
                      checked={showUnreadOnly}
                      onChange={(e) => setShowUnreadOnly(e.target.checked)}
                    />
                  }
                  label="Apenas não lidas"
                />
                <Button
                  variant="outlined"
                  startIcon={<MarkEmailRead />}
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                >
                  Marcar Todas
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DeleteSweep />}
                  onClick={handleDeleteAll}
                  color="error"
                  disabled={notifications.length === 0}
                >
                  Limpar Todas
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`Todas (${notifications.length})`} />
          <Tab label={`Não Lidas (${unreadCount})`} />
          <Tab label={`Lidas (${notifications.filter(n => n.read).length})`} />
        </Tabs>

        {/* Lista de Notificações */}
        <CardContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box p={2}>
              {[...Array(5)].map((_, index) => (
                <Box key={index} mb={2}>
                  <Skeleton variant="rectangular" height={80} />
                </Box>
              ))}
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box textAlign="center" py={8}>
              <NotificationsOff sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Nenhuma notificação encontrada
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm || categoryFilter !== 'all' || typeFilter !== 'all' || showUnreadOnly
                  ? 'Tente ajustar os filtros de busca'
                  : 'Você está em dia com suas notificações'
                }
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 2 }}>
              {filteredNotifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDeleteNotification}
                    onAction={handleNotificationAction}
                  />
                  {index < filteredNotifications.length - 1 && <Divider sx={{ my: 1 }} />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Configurações */}
      <NotificationSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={notificationSettings}
        onSave={handleSaveSettings}
      />
    </Box>
  );
};

export default Notifications;