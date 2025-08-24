import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Slider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Palette,
  Language,
  Notifications,
  Security,
  Storage,
  Speed,
  Backup,
  Update,
  Info,
  RestoreFromTrash,
  Save,
  Refresh,
  Download,
  Upload,
  Delete,
  Warning,
  CheckCircle,
  Error,
  VolumeUp,
  VolumeOff,
  Brightness4,
  Brightness7,
  Computer,
  Smartphone,
  Tablet,
  DesktopWindows,
  CloudSync,
  Lock,
  Public,
  VisibilityOff,
} from '@mui/icons-material';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'react-toastify';

const AppearanceTab = () => {
  const { settings, updateSettings } = useSettings();
  const theme = useTheme();

  const handleThemeChange = (setting, value) => {
    updateSettings({ [setting]: value });
    toast.success('Configuração de aparência atualizada!');
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Tema
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  {settings.darkMode ? <Brightness4 /> : <Brightness7 />}
                </ListItemIcon>
                <ListItemText
                  primary="Modo Escuro"
                  secondary="Alternar entre tema claro e escuro"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.darkMode}
                    onChange={(e) => handleThemeChange('darkMode', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Palette />
                </ListItemIcon>
                <ListItemText
                  primary="Cor Primária"
                  secondary="Escolha a cor principal do sistema"
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={settings.primaryColor || 'blue'}
                    onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
                  >
                    <MenuItem value="blue">Azul</MenuItem>
                    <MenuItem value="green">Verde</MenuItem>
                    <MenuItem value="purple">Roxo</MenuItem>
                    <MenuItem value="orange">Laranja</MenuItem>
                    <MenuItem value="red">Vermelho</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <DesktopWindows />
                </ListItemIcon>
                <ListItemText
                  primary="Densidade da Interface"
                  secondary="Ajustar espaçamento dos elementos"
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={settings.density || 'comfortable'}
                    onChange={(e) => handleThemeChange('density', e.target.value)}
                  >
                    <MenuItem value="compact">Compacta</MenuItem>
                    <MenuItem value="comfortable">Confortável</MenuItem>
                    <MenuItem value="spacious">Espaçosa</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Layout
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Computer />
                </ListItemIcon>
                <ListItemText
                  primary="Sidebar Fixa"
                  secondary="Manter barra lateral sempre visível"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.fixedSidebar || false}
                    onChange={(e) => handleThemeChange('fixedSidebar', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Tablet />
                </ListItemIcon>
                <ListItemText
                  primary="Layout Responsivo"
                  secondary="Adaptar interface para dispositivos móveis"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.responsiveLayout !== false}
                    onChange={(e) => handleThemeChange('responsiveLayout', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Smartphone />
                </ListItemIcon>
                <ListItemText
                  primary="Animações"
                  secondary="Habilitar animações da interface"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={settings.animations !== false}
                    onChange={(e) => handleThemeChange('animations', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Dica:</strong> As configurações de aparência são salvas localmente e
            aplicadas automaticamente em suas próximas sessões.
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  );
};

const NotificationsTab = () => {
  const [notificationSettings, setNotificationSettings] = useState({
    desktop: true,
    email: true,
    sound: true,
    vibration: false,
    frequency: 'immediate',
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00',
  });

  const handleNotificationChange = (setting, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
    toast.success('Configuração de notificação atualizada!');
  };

  const handleTestNotification = () => {
    toast.info('Esta é uma notificação de teste!');
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Tipos de Notificação
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Computer />
                </ListItemIcon>
                <ListItemText
                  primary="Notificações Desktop"
                  secondary="Mostrar notificações na área de trabalho"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notificationSettings.desktop}
                    onChange={(e) => handleNotificationChange('desktop', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <VolumeUp />
                </ListItemIcon>
                <ListItemText
                  primary="Som"
                  secondary="Reproduzir som ao receber notificações"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notificationSettings.sound}
                    onChange={(e) => handleNotificationChange('sound', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Smartphone />
                </ListItemIcon>
                <ListItemText
                  primary="Vibração"
                  secondary="Vibrar em dispositivos móveis"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={notificationSettings.vibration}
                    onChange={(e) => handleNotificationChange('vibration', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configurações Avançadas
            </Typography>
            <Box mb={3}>
              <Typography variant="body2" gutterBottom>
                Frequência de Notificações
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={notificationSettings.frequency}
                  onChange={(e) => handleNotificationChange('frequency', e.target.value)}
                >
                  <MenuItem value="immediate">Imediata</MenuItem>
                  <MenuItem value="batched">Agrupada (5 min)</MenuItem>
                  <MenuItem value="hourly">Por hora</MenuItem>
                  <MenuItem value="daily">Diária</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box mb={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.quietHours}
                    onChange={(e) => handleNotificationChange('quietHours', e.target.checked)}
                  />
                }
                label="Horário Silencioso"
              />
              {notificationSettings.quietHours && (
                <Box mt={2} display="flex" gap={2}>
                  <TextField
                    label="Início"
                    type="time"
                    value={notificationSettings.quietStart}
                    onChange={(e) => handleNotificationChange('quietStart', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Fim"
                    type="time"
                    value={notificationSettings.quietEnd}
                    onChange={(e) => handleNotificationChange('quietEnd', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              )}
            </Box>

            <Button
              variant="outlined"
              onClick={handleTestNotification}
              fullWidth
            >
              Testar Notificação
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const SystemTab = () => {
  const [systemSettings, setSystemSettings] = useState({
    autoUpdate: true,
    crashReporting: true,
    analytics: false,
    debugMode: false,
    cacheSize: 500,
    maxLogSize: 100,
    backupFrequency: 'daily',
    dataRetention: 90,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);

  const handleSystemChange = (setting, value) => {
    setSystemSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
    toast.success('Configuração do sistema atualizada!');
  };

  const handleClearCache = async () => {
    setIsLoading(true);
    try {
      // Simular limpeza de cache
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Cache limpo com sucesso!');
    } catch (error) {
      toast.error('Erro ao limpar cache');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    setIsLoading(true);
    try {
      // Simular backup
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success('Backup criado com sucesso!');
      setBackupDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao criar backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = () => {
    toast.info('Funcionalidade de restauração não implementada');
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Atualizações e Manutenção
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Update />
                </ListItemIcon>
                <ListItemText
                  primary="Atualizações Automáticas"
                  secondary="Instalar atualizações automaticamente"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={systemSettings.autoUpdate}
                    onChange={(e) => handleSystemChange('autoUpdate', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Error />
                </ListItemIcon>
                <ListItemText
                  primary="Relatórios de Erro"
                  secondary="Enviar relatórios de erro automaticamente"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={systemSettings.crashReporting}
                    onChange={(e) => handleSystemChange('crashReporting', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Info />
                </ListItemIcon>
                <ListItemText
                  primary="Análise de Uso"
                  secondary="Compartilhar dados de uso anônimos"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={systemSettings.analytics}
                    onChange={(e) => handleSystemChange('analytics', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance
            </Typography>
            <Box mb={3}>
              <Typography variant="body2" gutterBottom>
                Tamanho do Cache (MB): {systemSettings.cacheSize}
              </Typography>
              <Slider
                value={systemSettings.cacheSize}
                onChange={(e, value) => handleSystemChange('cacheSize', value)}
                min={100}
                max={2000}
                step={100}
                marks={[
                  { value: 100, label: '100MB' },
                  { value: 1000, label: '1GB' },
                  { value: 2000, label: '2GB' },
                ]}
              />
            </Box>

            <Box mb={3}>
              <Typography variant="body2" gutterBottom>
                Tamanho Máximo dos Logs (MB): {systemSettings.maxLogSize}
              </Typography>
              <Slider
                value={systemSettings.maxLogSize}
                onChange={(e, value) => handleSystemChange('maxLogSize', value)}
                min={50}
                max={500}
                step={50}
                marks={[
                  { value: 50, label: '50MB' },
                  { value: 250, label: '250MB' },
                  { value: 500, label: '500MB' },
                ]}
              />
            </Box>

            <Button
              variant="outlined"
              onClick={handleClearCache}
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? 'Limpando...' : 'Limpar Cache'}
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Backup e Restauração
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Frequência de Backup</InputLabel>
                  <Select
                    value={systemSettings.backupFrequency}
                    label="Frequência de Backup"
                    onChange={(e) => handleSystemChange('backupFrequency', e.target.value)}
                  >
                    <MenuItem value="hourly">Por hora</MenuItem>
                    <MenuItem value="daily">Diário</MenuItem>
                    <MenuItem value="weekly">Semanal</MenuItem>
                    <MenuItem value="monthly">Mensal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Retenção de Dados (dias)"
                  type="number"
                  value={systemSettings.dataRetention}
                  onChange={(e) => handleSystemChange('dataRetention', parseInt(e.target.value))}
                  size="small"
                  inputProps={{ min: 1, max: 365 }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    startIcon={<Backup />}
                    onClick={() => setBackupDialogOpen(true)}
                    disabled={isLoading}
                  >
                    Backup
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RestoreFromTrash />}
                    onClick={handleRestore}
                  >
                    Restaurar
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Dialog de Backup */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)}>
        <DialogTitle>Criar Backup</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            Isso criará um backup completo de todas as configurações e dados do sistema.
            O processo pode levar alguns minutos.
          </Typography>
          <Alert severity="info">
            O backup será salvo localmente e poderá ser usado para restaurar o sistema
            em caso de problemas.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleBackup} variant="contained" disabled={isLoading}>
            {isLoading ? 'Criando...' : 'Criar Backup'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

const SecurityTab = () => {
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiry: 90,
    twoFactorRequired: false,
    ipWhitelist: false,
    auditLog: true,
    encryptionLevel: 'high',
    secureHeaders: true,
  });

  const handleSecurityChange = (setting, value) => {
    setSecuritySettings(prev => ({
      ...prev,
      [setting]: value,
    }));
    toast.success('Configuração de segurança atualizada!');
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Autenticação
            </Typography>
            <Box mb={3}>
              <Typography variant="body2" gutterBottom>
                Timeout de Sessão (minutos): {securitySettings.sessionTimeout}
              </Typography>
              <Slider
                value={securitySettings.sessionTimeout}
                onChange={(e, value) => handleSecurityChange('sessionTimeout', value)}
                min={5}
                max={120}
                step={5}
                marks={[
                  { value: 5, label: '5min' },
                  { value: 30, label: '30min' },
                  { value: 60, label: '1h' },
                  { value: 120, label: '2h' },
                ]}
              />
            </Box>

            <Box mb={3}>
              <Typography variant="body2" gutterBottom>
                Máximo de Tentativas de Login: {securitySettings.maxLoginAttempts}
              </Typography>
              <Slider
                value={securitySettings.maxLoginAttempts}
                onChange={(e, value) => handleSecurityChange('maxLoginAttempts', value)}
                min={3}
                max={10}
                step={1}
                marks={[
                  { value: 3, label: '3' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                ]}
              />
            </Box>

            <List>
              <ListItem>
                <ListItemIcon>
                  <Lock />
                </ListItemIcon>
                <ListItemText
                  primary="2FA Obrigatório"
                  secondary="Exigir autenticação de dois fatores"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={securitySettings.twoFactorRequired}
                    onChange={(e) => handleSecurityChange('twoFactorRequired', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Proteção e Monitoramento
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Public />
                </ListItemIcon>
                <ListItemText
                  primary="Lista Branca de IPs"
                  secondary="Restringir acesso a IPs específicos"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={securitySettings.ipWhitelist}
                    onChange={(e) => handleSecurityChange('ipWhitelist', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <VisibilityOff />
                </ListItemIcon>
                <ListItemText
                  primary="Log de Auditoria"
                  secondary="Registrar todas as ações do sistema"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={securitySettings.auditLog}
                    onChange={(e) => handleSecurityChange('auditLog', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Security />
                </ListItemIcon>
                <ListItemText
                  primary="Cabeçalhos de Segurança"
                  secondary="Habilitar cabeçalhos HTTP de segurança"
                />
                <ListItemSecondaryAction>
                  <Switch
                    checked={securitySettings.secureHeaders}
                    onChange={(e) => handleSecurityChange('secureHeaders', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>

            <Box mt={2}>
              <Typography variant="body2" gutterBottom>
                Nível de Criptografia
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={securitySettings.encryptionLevel}
                  onChange={(e) => handleSecurityChange('encryptionLevel', e.target.value)}
                >
                  <MenuItem value="basic">Básico (AES-128)</MenuItem>
                  <MenuItem value="standard">Padrão (AES-192)</MenuItem>
                  <MenuItem value="high">Alto (AES-256)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Alert severity="warning">
          <Typography variant="body2">
            <strong>Atenção:</strong> Alterações nas configurações de segurança podem
            afetar o acesso ao sistema. Certifique-se de que você tem acesso alternativo
            antes de fazer mudanças críticas.
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  );
};

const Settings = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSaveAll = () => {
    setHasUnsavedChanges(false);
    toast.success('Todas as configurações foram salvas!');
  };

  const handleResetAll = () => {
    toast.info('Configurações redefinidas para os valores padrão');
  };

  const handleExportSettings = () => {
    const settings = {
      appearance: {},
      notifications: {},
      system: {},
      security: {},
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fusione-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Configurações exportadas com sucesso!');
  };

  const handleImportSettings = () => {
    toast.info('Funcionalidade de importação não implementada');
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Configurações
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Personalize o sistema de acordo com suas preferências
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportSettings}
          >
            Exportar
          </Button>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={handleImportSettings}
          >
            Importar
          </Button>
          {hasUnsavedChanges && (
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveAll}
            >
              Salvar Tudo
            </Button>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Aparência" icon={<Palette />} iconPosition="start" />
          <Tab label="Notificações" icon={<Notifications />} iconPosition="start" />
          <Tab label="Sistema" icon={<SettingsIcon />} iconPosition="start" />
          <Tab label="Segurança" icon={<Security />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {selectedTab === 0 && <AppearanceTab />}
        {selectedTab === 1 && <NotificationsTab />}
        {selectedTab === 2 && <SystemTab />}
        {selectedTab === 3 && <SecurityTab />}
      </Box>

      {/* Footer Actions */}
      <Box mt={4} display="flex" justifyContent="center" gap={2}>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleResetAll}
        >
          Redefinir Tudo
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSaveAll}
        >
          Salvar Configurações
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;