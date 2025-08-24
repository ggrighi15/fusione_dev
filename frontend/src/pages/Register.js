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
  LinearProgress,
  useTheme,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Phone,
  Business,
  Google,
  GitHub,
  PersonAdd,
  CheckCircle,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

// Schema de validação
const schema = yup.object({
  firstName: yup
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .required('Nome é obrigatório'),
  lastName: yup
    .string()
    .min(2, 'Sobrenome deve ter pelo menos 2 caracteres')
    .required('Sobrenome é obrigatório'),
  email: yup
    .string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  phone: yup
    .string()
    .matches(/^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/, 'Telefone inválido')
    .required('Telefone é obrigatório'),
  company: yup.string(),
  password: yup
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .matches(/(?=.*[a-z])/, 'Senha deve conter pelo menos uma letra minúscula')
    .matches(/(?=.*[A-Z])/, 'Senha deve conter pelo menos uma letra maiúscula')
    .matches(/(?=.*\d)/, 'Senha deve conter pelo menos um número')
    .matches(/(?=.*[@$!%*?&])/, 'Senha deve conter pelo menos um caractere especial')
    .required('Senha é obrigatória'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Senhas não coincidem')
    .required('Confirmação de senha é obrigatória'),
  acceptTerms: yup
    .boolean()
    .oneOf([true], 'Você deve aceitar os termos de uso'),
  acceptNewsletter: yup.boolean(),
});

// Função para calcular força da senha
const calculatePasswordStrength = (password) => {
  let strength = 0;
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (/[a-z]/.test(password)) strength += 20;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/\d/.test(password)) strength += 20;
  if (/[@$!%*?&]/.test(password)) strength += 10;
  return Math.min(strength, 100);
};

const getPasswordStrengthColor = (strength) => {
  if (strength < 30) return 'error';
  if (strength < 60) return 'warning';
  if (strength < 80) return 'info';
  return 'success';
};

const getPasswordStrengthText = (strength) => {
  if (strength < 30) return 'Fraca';
  if (strength < 60) return 'Média';
  if (strength < 80) return 'Boa';
  return 'Forte';
};

const steps = ['Informações Pessoais', 'Dados de Contato', 'Segurança'];

const Register = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    trigger,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      acceptNewsletter: false,
    },
    mode: 'onChange',
  });

  const watchedPassword = watch('password');

  const onSubmit = async (data) => {
    try {
      clearError();
      const userData = {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone,
        company: data.company,
        password: data.password,
        acceptNewsletter: data.acceptNewsletter,
      };

      const result = await register(userData);
      
      if (result.success) {
        toast.success('Conta criada com sucesso! Verifique seu email.');
        navigate('/login', {
          state: {
            message: 'Conta criada com sucesso! Faça login para continuar.',
          },
        });
      } else {
        toast.error(result.error || 'Erro ao criar conta');
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      toast.error('Erro inesperado ao criar conta');
    }
  };

  const handleSocialRegister = async (provider) => {
    try {
      setSocialLoading(provider);
      // Implementar registro social aqui
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simular delay
      toast.info(`Registro com ${provider} não implementado ainda`);
    } catch (error) {
      toast.error(`Erro ao registrar com ${provider}`);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleNext = async () => {
    const fieldsToValidate = {
      0: ['firstName', 'lastName'],
      1: ['email', 'phone', 'company'],
      2: ['password', 'confirmPassword', 'acceptTerms'],
    };

    const isStepValid = await trigger(fieldsToValidate[activeStep]);
    if (isStepValid) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(watchedPassword || ''));
  }, [watchedPassword]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <>
            <Controller
              name="firstName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Nome"
                  autoComplete="given-name"
                  autoFocus
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="lastName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Sobrenome"
                  autoComplete="family-name"
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </>
        );

      case 1:
        return (
          <>
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

            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Telefone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="company"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Empresa (opcional)"
                  autoComplete="organization"
                  error={!!errors.company}
                  helperText={errors.company?.message}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Business color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </>
        );

      case 2:
        return (
          <>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    {...field}
                    fullWidth
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    error={!!errors.password}
                    helperText={errors.password?.message}
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
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  {watchedPassword && (
                    <Box sx={{ mt: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Força da senha:
                        </Typography>
                        <Typography
                          variant="caption"
                          color={`${getPasswordStrengthColor(passwordStrength)}.main`}
                          fontWeight="bold"
                        >
                          {getPasswordStrengthText(passwordStrength)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={passwordStrength}
                        color={getPasswordStrengthColor(passwordStrength)}
                        sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  )}
                </Box>
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Confirmar Senha"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleToggleConfirmPasswordVisibility}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="acceptTerms"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      color="primary"
                      icon={<CheckCircle />}
                      checkedIcon={<CheckCircle />}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Eu aceito os{' '}
                      <Link href="/terms" target="_blank" color="primary">
                        Termos de Uso
                      </Link>{' '}
                      e a{' '}
                      <Link href="/privacy" target="_blank" color="primary">
                        Política de Privacidade
                      </Link>
                    </Typography>
                  }
                  sx={{ mb: 2, alignItems: 'flex-start' }}
                />
              )}
            />
            {errors.acceptTerms && (
              <Typography variant="caption" color="error" sx={{ mb: 2, display: 'block' }}>
                {errors.acceptTerms.message}
              </Typography>
            )}

            <Controller
              name="acceptNewsletter"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox {...field} color="primary" />}
                  label="Quero receber novidades e atualizações por email"
                  sx={{ mb: 2 }}
                />
              )}
            />
          </>
        );

      default:
        return null;
    }
  };

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
          maxWidth: 500,
          width: '100%',
          boxShadow: theme.shadows[10],
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box textAlign="center" mb={3}>
            <PersonAdd
              sx={{
                fontSize: 48,
                color: theme.palette.primary.main,
                mb: 2,
              }}
            />
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              Criar Conta
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Junte-se ao Fusione Core
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Erro */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
              {error}
            </Alert>
          )}

          {/* Formulário */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {renderStepContent(activeStep)}

            {/* Botões de Navegação */}
            <Box display="flex" justifyContent="space-between" mt={3}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                variant="outlined"
              >
                Voltar
              </Button>
              
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || isLoading}
                  sx={{ minWidth: 120 }}
                >
                  {(isSubmitting || isLoading) ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                >
                  Próximo
                </Button>
              )}
            </Box>
          </Box>

          {/* Login Social (apenas no primeiro step) */}
          {activeStep === 0 && (
            <>
              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  ou registre-se com
                </Typography>
              </Divider>

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
                  onClick={() => handleSocialRegister('google')}
                  disabled={socialLoading !== null}
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
                  onClick={() => handleSocialRegister('github')}
                  disabled={socialLoading !== null}
                >
                  GitHub
                </Button>
              </Box>
            </>
          )}

          {/* Link para Login */}
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Já tem uma conta?{' '}
              <Link
                component={RouterLink}
                to="/login"
                sx={{
                  color: theme.palette.primary.main,
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Fazer login
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;