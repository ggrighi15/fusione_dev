import React, { useState, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Avatar,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Edit,
  PhotoCamera,
  Save,
  Cancel,
  Security,
  Notifications,
  Language,
  Palette,
  Person,
  Email,
  Phone,
  Business,
  LocationOn,
  CalendarToday,
  Verified,
  Shield,
  Key,
  Visibility,
  VisibilityOff,
  History,
  Download,
  Delete,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Dados de exemplo para atividades recentes
const recentActivities = [
  {
    id: 1,
    action: 'Login realizado',
    details: 'Acesso via navegador Chrome',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    ip: '192.168.1.100',
    location: 'São Paulo, SP',
  },
  {
    id: 2,
    action: 'Perfil atualizado',
    details: 'Informações de contato alteradas',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    ip: '192.168.1.100',
    location: 'São Paulo, SP',
  },
  {
    id: 3,
    action: 'Senha alterada',
    details: 'Senha de acesso foi modificada',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    ip: '192.168.1.100',
    location: 'São Paulo, SP',
  },
  {
    id: 4,
    action: 'Login realizado',
    details: 'Acesso via aplicativo móvel',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    ip: '192.168.1.101',
    location: 'Rio de Janeiro, RJ',
  },
];

const ProfileTab = ({ user, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || '',
    position: user?.position || '',
    location: user?.location || '',
    bio: user?.bio || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSave(formData);
      setIsEditing(false);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      company: user?.company || '',
      position: user?.position || '',
      location: user?.location || '',
      bio: user?.bio || '',
    });
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Simular upload de avatar
      toast.success('Avatar atualizado com sucesso!');
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Box position="relative" display="inline-block" mb={2}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  fontSize: '3rem',
                  cursor: 'pointer',
                }}
                onClick={handleAvatarClick}
              >
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Avatar>
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                }}
                size="small"
                onClick={handleAvatarClick}
              >
                <PhotoCamera />
              </IconButton>
            </Box>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <Typography variant="h5" gutterBottom>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {user?.position} • {user?.company}
            </Typography>
            <Box display="flex" justifyContent="center" gap={1} mt={2}>
              <Chip
                icon={<Verified />}
                label="Verificado"
                color="success"
                size="small"
              />
              <Chip
                icon={<Shield />}
                label="2FA Ativo"
                color="primary"
                size="small"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Informações Pessoais</Typography>
              {!isEditing ? (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setIsEditing(true)}
                >
                  Editar
                </Button>
              ) : (
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    Salvar
                  </Button>
                </Box>
              )}
            </Box>

            {isLoading && <LinearProgress sx={{ mb: 2 }} />}

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nome"
                  value={formData.firstName}
                  onChange={handleChange('firstName')}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Sobrenome"
                  value={formData.lastName}
                  onChange={handleChange('lastName')}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Empresa"
                  value={formData.company}
                  onChange={handleChange('company')}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Cargo"
                  value={formData.position}
                  onChange={handleChange('position')}
                  disabled={!isEditing}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Localização"
                  value={formData.location}
                  onChange={handleChange('location')}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Biografia"
                  value={formData.bio}
                  onChange={handleChange('bio')}
                  disabled={!isEditing}
                  multiline
                  rows={3}
                  placeholder="Conte um pouco sobre você..."
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const SecurityTab = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      // Simular alteração de senha
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Erro ao alterar senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    setIsLoading(true);
    try {
      // Simular toggle 2FA
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTwoFactorEnabled(!twoFactorEnabled);
      toast.success(
        twoFactorEnabled
          ? 'Autenticação de dois fatores desabilitada'
          : 'Autenticação de dois fatores habilitada'
      );
    } catch (error) {
      toast.error('Erro ao alterar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Alterar Senha
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Senha Atual"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  InputProps={{
                    startAdornment: <Key sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nova Senha"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  InputProps={{
                    startAdornment: <Key sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Confirmar Nova Senha"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  InputProps={{
                    startAdornment: <Key sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showPasswords}
                      onChange={(e) => setShowPasswords(e.target.checked)}
                    />
                  }
                  label="Mostrar senhas"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleChangePassword}
                  disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                >
                  Alterar Senha
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Segurança da Conta
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Shield color={twoFactorEnabled ? 'success' : 'disabled'} />
                </ListItemIcon>
                <ListItemText
                  primary="Autenticação de Dois Fatores"
                  secondary={twoFactorEnabled ? 'Ativa' : 'Inativa'}
                />
                <Switch
                  checked={twoFactorEnabled}
                  onChange={handleToggle2FA}
                  disabled={isLoading}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Email color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Notificações de Segurança"
                  secondary="Receber alertas por email"
                />
                <Switch defaultChecked />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <History color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Histórico de Login"
                  secondary="Monitorar acessos à conta"
                />
                <Switch defaultChecked />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Dica de Segurança:</strong> Use uma senha forte com pelo menos 8 caracteres,
            incluindo letras maiúsculas, minúsculas, números e símbolos. Habilite a autenticação
            de dois fatores para maior proteção.
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  );
};

const ActivityTab = () => {
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">Atividades Recentes</Typography>
          <Button variant="outlined" startIcon={<Download />}>
            Exportar Histórico
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ação</TableCell>
                <TableCell>Detalhes</TableCell>
                <TableCell>Data/Hora</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Localização</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {activity.action}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {activity.details}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(activity.timestamp, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {activity.ip}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {activity.location}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const PreferencesTab = () => {
  const { settings, updateSettings } = useSettings();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleSettingChange = (setting, value) => {
    updateSettings({ [setting]: value });
    toast.success('Configuração atualizada!');
  };

  const handleDeleteAccount = () => {
    setDeleteDialogOpen(false);
    toast.error('Funcionalidade de exclusão de conta não implementada');
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Preferências Gerais
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Language />
                </ListItemIcon>
                <ListItemText primary="Idioma" secondary="Português (Brasil)" />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select value="pt-BR" disabled>
                    <MenuItem value="pt-BR">Português</MenuItem>
                    <MenuItem value="en-US">English</MenuItem>
                    <MenuItem value="es-ES">Español</MenuItem>
                  </Select>
                </FormControl>
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Palette />
                </ListItemIcon>
                <ListItemText
                  primary="Modo Escuro"
                  secondary="Alternar tema da interface"
                />
                <Switch
                  checked={settings.darkMode}
                  onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Notifications />
                </ListItemIcon>
                <ListItemText
                  primary="Notificações"
                  secondary="Receber notificações do sistema"
                />
                <Switch
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Privacidade
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Person />
                </ListItemIcon>
                <ListItemText
                  primary="Perfil Público"
                  secondary="Permitir que outros vejam seu perfil"
                />
                <Switch defaultChecked />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <History />
                </ListItemIcon>
                <ListItemText
                  primary="Histórico de Atividades"
                  secondary="Salvar histórico de ações"
                />
                <Switch defaultChecked />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemIcon>
                  <Email />
                </ListItemIcon>
                <ListItemText
                  primary="Emails Promocionais"
                  secondary="Receber novidades e promoções"
                />
                <Switch />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ border: '1px solid', borderColor: 'error.main' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Warning color="error" sx={{ mr: 1 }} />
              <Typography variant="h6" color="error">
                Zona de Perigo
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              As ações abaixo são irreversíveis. Tenha certeza antes de prosseguir.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Excluir Conta
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Excluir Conta</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Esta ação é irreversível e resultará na perda permanente de todos os seus dados.
          </Alert>
          <Typography variant="body2">
            Tem certeza de que deseja excluir sua conta? Todos os seus dados, configurações
            e histórico serão permanentemente removidos.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained">
            Excluir Conta
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSaveProfile = (profileData) => {
    updateProfile(profileData);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Meu Perfil
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gerencie suas informações pessoais e configurações de conta
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Perfil" icon={<Person />} iconPosition="start" />
          <Tab label="Segurança" icon={<Security />} iconPosition="start" />
          <Tab label="Atividades" icon={<History />} iconPosition="start" />
          <Tab label="Preferências" icon={<Settings />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {selectedTab === 0 && <ProfileTab user={user} onSave={handleSaveProfile} />}
        {selectedTab === 1 && <SecurityTab />}
        {selectedTab === 2 && <ActivityTab />}
        {selectedTab === 3 && <PreferencesTab />}
      </Box>
    </Box>
  );
};

export default Profile;