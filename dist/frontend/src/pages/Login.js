import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  Divider,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Google,
  GitHub,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

// Schema de validação
const schema = yup.object({
  email: yup
    .string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .required('Senha é obrigatória'),
  rememberMe: yup.boolean(),
});

const Login = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data) => {
    try {
      clearError();
      const result = await login(data.email, data.password, data.rememberMe);
      
      if (result.success) {
        toast.success('Login realizado com sucesso!');
        navigate(from, { replace: true });
      } else {
        toast.error(result.error || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error('Erro inesperado ao fazer login');
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      setSocialLoading(provider);
      // Implementar login social aqui
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular delay
      toast.info(`Login com ${provider} não implementado ainda`);
    } catch (error) {
      toast.error(`Erro ao fazer login com ${provider}`);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleDemoLogin = async () => {
    try {
      clearError();
      const result = await login('demo@fusione.com', 'demo123', false);
      
      if (result.success) {
        toast.success('Login demo realizado com sucesso!');
        navigate(from, { replace: true });
      } else {
        toast.error('Erro ao fazer login demo');
      }
    } catch (error) {
      toast.error('Erro ao fazer login demo');
    }
  };

  useEffect(() => {
    // Limpar erro quando o componente for desmontado
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    // Mostrar mensagem se veio de uma página protegida
    if (location.state?.message) {
      toast.info(location.state.message);
    }
  }, [location.state]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '100%',
          boxShadow: theme.shadows[10],
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box textAlign="center" mb={3}>
            <LoginIcon
              sx={{
                fontSize: 48,
                color: theme.palette.primary.main,
                mb: 2,
              }}
            />
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              Entrar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Acesse sua conta do Fusione Core
            </Typography>
          </Box>

          {/* Erro */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
              {error}
            </Alert>
          )}

          {/* Formulário */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email */}
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {/* Senha */}
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleTogglePasswordVisibility}
                          edge="end"
                          aria-label="toggle password visibility"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            {/* Lembrar-me e Esqueci a senha */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
            >
              <Controller
                name="rememberMe"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox {...field} color="primary" />}
                    label="Lembrar-me"
                  />
                )}
              />
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={handleForgotPassword}
                sx={{ textDecoration: 'none' }}
              >
                Esqueci a senha
              </Link>
            </Box>

            {/* Botão de Login */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting || isLoading}
              sx={{
                mb: 2,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
              }}
            >
              {(isSubmitting || isLoading) ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Entrar'
              )}
            </Button>

            {/* Botão Demo */}
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleDemoLogin}
              disabled={isSubmitting || isLoading}
              sx={{ mb: 3, py: 1.5 }}
            >
              Entrar como Demo
            </Button>

            {/* Divider */}
            <Divider sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                ou continue com
              </Typography>
            </Divider>

            {/* Login Social */}
            <Box display="flex" gap={2} mb={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={
                  socialLoading === 'google' ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Google />
                  )
                }
                onClick={() => handleSocialLogin('google')}
                disabled={socialLoading !== null}
                sx={{ py: 1.5 }}
              >
                Google
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={
                  socialLoading === 'github' ? (
                    <CircularProgress size={20} />
                  ) : (
                    <GitHub />
                  )
                }
                onClick={() => handleSocialLogin('github')}
                disabled={socialLoading !== null}
                sx={{ py: 1.5 }}
              >
                GitHub
              </Button>
            </Box>

            {/* Link para Registro */}
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Não tem uma conta?{' '}
                <Link
                  component={RouterLink}
                  to="/register"
                  sx={{
                    color: theme.palette.primary.main,
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Criar conta
                </Link>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;