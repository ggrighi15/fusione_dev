import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';

// Layout Components
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Loading Component
import LoadingScreen from './components/common/LoadingScreen';

// Lazy loading das páginas para otimização
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Login = React.lazy(() => import('./pages/auth/Login'));
const Register = React.lazy(() => import('./pages/auth/Register'));
const ForgotPassword = React.lazy(() => import('./pages/auth/ForgotPassword'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Settings = React.lazy(() => import('./pages/Settings'));

// Módulos principais
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const DataManagement = React.lazy(() => import('./pages/DataManagement'));
const DataAnalysis = React.lazy(() => import('./pages/DataAnalysis'));
const BusinessLogic = React.lazy(() => import('./pages/BusinessLogic'));
const Algorithms = React.lazy(() => import('./pages/Algorithms'));

// Páginas de erro
const NotFound = React.lazy(() => import('./pages/errors/NotFound'));
const Unauthorized = React.lazy(() => import('./pages/errors/Unauthorized'));
const ServerError = React.lazy(() => import('./pages/errors/ServerError'));

// Componente de rota protegida
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Componente de rota pública (apenas para usuários não autenticados)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
};

// Componente de fallback para Suspense
const SuspenseFallback = ({ message = 'Carregando...' }) => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    minHeight="60vh"
    gap={2}
  >
    <CircularProgress size={40} thickness={4} />
    <Typography variant="body1" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

// Componente principal da aplicação
function App() {
  const { initializeAuth } = useAuth();
  const { connectWebSocket } = useNotification();
  const location = useLocation();

  // Inicializar autenticação e WebSocket
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Conectar WebSocket apenas se autenticado
    const token = localStorage.getItem('authToken');
    if (token) {
      connectWebSocket();
    }
  }, [connectWebSocket]);

  // Analytics de navegação (opcional)
  useEffect(() => {
    // Aqui você pode adicionar tracking de páginas
    console.log('Navegando para:', location.pathname);
  }, [location]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        {/* Rotas públicas (autenticação) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando página de login..." />}>
                  <Login />
                </Suspense>
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando página de registro..." />}>
                  <Register />
                </Suspense>
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <AuthLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando recuperação de senha..." />}>
                  <ForgotPassword />
                </Suspense>
              </AuthLayout>
            </PublicRoute>
          }
        />

        {/* Rotas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando dashboard..." />}>
                  <Dashboard />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando analytics..." />}>
                  <Analytics />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando relatórios..." />}>
                  <Reports />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando notificações..." />}>
                  <Notifications />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando gestão de dados..." />}>
                  <DataManagement />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-analysis"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando análise de dados..." />}>
                  <DataAnalysis />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/business"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando lógica de negócio..." />}>
                  <BusinessLogic />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/algorithms"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando algoritmos..." />}>
                  <Algorithms />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando perfil..." />}>
                  <Profile />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Suspense fallback={<SuspenseFallback message="Carregando configurações..." />}>
                  <Settings />
                </Suspense>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Páginas de erro */}
        <Route
          path="/unauthorized"
          element={
            <Suspense fallback={<SuspenseFallback />}>
              <Unauthorized />
            </Suspense>
          }
        />
        <Route
          path="/server-error"
          element={
            <Suspense fallback={<SuspenseFallback />}>
              <ServerError />
            </Suspense>
          }
        />
        <Route
          path="/404"
          element={
            <Suspense fallback={<SuspenseFallback />}>
              <NotFound />
            </Suspense>
          }
        />

        {/* Redirecionamentos */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Box>
  );
}

export default App;