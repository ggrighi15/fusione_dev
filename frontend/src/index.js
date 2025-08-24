import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SettingsProvider } from './contexts/SettingsContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/global.css';
import reportWebVitals from './reportWebVitals';

// Configuração do React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Tema personalizado do Material-UI
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e',
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

// Configuração de desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // Habilitar React Query Devtools em desenvolvimento
  import('@tanstack/react-query-devtools').then(({ ReactQueryDevtools }) => {
    window.ReactQueryDevtools = ReactQueryDevtools;
  });
}

// Função principal de renderização
function renderApp() {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
              <AuthProvider>
                <NotificationProvider>
                  <SettingsProvider>
                    <App />
                    <ToastContainer
                      position="top-right"
                      autoClose={5000}
                      hideProgressBar={false}
                      newestOnTop
                      closeOnClick
                      rtl={false}
                      pauseOnFocusLoss
                      draggable
                      pauseOnHover
                      theme="light"
                      toastStyle={{
                        borderRadius: '8px',
                        fontFamily: theme.typography.fontFamily,
                      }}
                    />
                  </SettingsProvider>
                </NotificationProvider>
              </AuthProvider>
            </BrowserRouter>
          </ThemeProvider>
          {/* React Query Devtools - apenas em desenvolvimento */}
          {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.ReactQueryDevtools && (
            <window.ReactQueryDevtools initialIsOpen={false} />
          )}
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// Renderizar a aplicação
renderApp();

// Configurar Web Vitals para monitoramento de performance
reportWebVitals(console.log);

// Hot Module Replacement para desenvolvimento
if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && module.hot) {
  module.hot.accept('./App', () => {
    renderApp();
  });
}

// Configurações globais
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  // Aqui você pode enviar erros para um serviço de monitoramento
});

window.addEventListener('error', event => {
  console.error('Global error:', event.error);
  // Aqui você pode enviar erros para um serviço de monitoramento
});

// Configurar interceptadores globais para requisições
if (window.axios) {
  // Request interceptor
  window.axios.interceptors.request.use(
    config => {
      // Adicionar token de autenticação se disponível
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );
  
  // Response interceptor
  window.axios.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        // Token expirado ou inválido
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
}

export default renderApp;