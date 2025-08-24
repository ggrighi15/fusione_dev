import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useSettings } from '../../contexts/SettingsContext';

const AuthLayout = ({ children, title, subtitle }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { darkMode, toggleDarkMode } = useSettings();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, 
          ${theme.palette.primary.main}15 0%, 
          ${theme.palette.secondary.main}15 100%),
          ${theme.palette.background.default}`,
        position: 'relative',
      }}
    >
      {/* Header com controles */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 1,
          zIndex: 1,
        }}
      >
        <Tooltip title={darkMode ? 'Modo claro' : 'Modo escuro'}>
          <IconButton
            onClick={toggleDarkMode}
            sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              backdropFilter: 'blur(8px)',
              '&:hover': {
                backgroundColor: alpha(theme.palette.background.paper, 0.9),
              },
            }}
          >
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Conteúdo principal */}
      <Container
        component="main"
        maxWidth="sm"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 4,
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 3,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '2rem',
              fontWeight: 'bold',
              mb: 3,
              boxShadow: theme.shadows[8],
            }}
          >
            F
          </Box>

          {/* Título */}
          <Typography
            component="h1"
            variant="h3"
            sx={{
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: 'center',
              mb: 1,
            }}
          >
            Fusione Core
          </Typography>

          {/* Subtítulo */}
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              textAlign: 'center',
              fontWeight: 400,
              mb: 2,
            }}
          >
            Sistema de Gestão Empresarial
          </Typography>

          {/* Título da página */}
          {title && (
            <Typography
              variant="h4"
              component="h2"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                textAlign: 'center',
                mb: 1,
              }}
            >
              {title}
            </Typography>
          )}

          {/* Subtítulo da página */}
          {subtitle && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                textAlign: 'center',
                mb: 3,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Card do formulário */}
        <Paper
          elevation={8}
          sx={{
            p: isMobile ? 3 : 4,
            borderRadius: 3,
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          {children}
        </Paper>

        {/* Footer */}
        <Box
          sx={{
            mt: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © 2024 Fusione Core. Todos os direitos reservados.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Versão 1.0.0
          </Typography>
        </Box>
      </Container>

      {/* Elementos decorativos */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          zIndex: -1,
        }}
      >
        {/* Círculos decorativos */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 70%)`,
            animation: 'float 6s ease-in-out infinite',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
            animation: 'float 8s ease-in-out infinite reverse',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '60%',
            left: '5%',
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.08)} 0%, transparent 70%)`,
            animation: 'float 10s ease-in-out infinite',
          }}
        />
      </Box>

      {/* Keyframes para animação - movido para CSS global */}
    </Box>
  );
};

// Função helper para alpha
function alpha(color, opacity) {
  // Implementação simples para adicionar transparência
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

export default AuthLayout;