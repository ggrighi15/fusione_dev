import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

// Configuração do axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Estados iniciais
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  permissions: [],
  refreshToken: null,
};

// Actions
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  REFRESH_TOKEN_SUCCESS: 'REFRESH_TOKEN_SUCCESS',
  REFRESH_TOKEN_FAILURE: 'REFRESH_TOKEN_FAILURE',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        permissions: action.payload.permissions || [],
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AUTH_ACTIONS.REFRESH_TOKEN_SUCCESS:
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        error: null,
      };

    case AUTH_ACTIONS.REFRESH_TOKEN_FAILURE:
      return {
        ...initialState,
        isLoading: false,
        error: 'Sessão expirada. Faça login novamente.',
      };

    default:
      return state;
  }
};

// Context
const AuthContext = createContext();

// Provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Configurar interceptadores do axios
  useEffect(() => {
    // Request interceptor
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (state.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await refreshToken();
            return api(originalRequest);
          } catch (refreshError) {
            logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [state.token]);

  // Inicializar autenticação
  const initializeAuth = useCallback(async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const token = localStorage.getItem('authToken');
      const refreshTokenStored = localStorage.getItem('refreshToken');
      const userData = localStorage.getItem('userData');

      if (token && userData) {
        const user = JSON.parse(userData);
        
        // Verificar se o token ainda é válido
        try {
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: {
              user: response.data.user || user,
              token,
              refreshToken: refreshTokenStored,
              permissions: response.data.permissions || [],
            },
          });
        } catch (error) {
          // Token inválido, tentar refresh
          if (refreshTokenStored) {
            try {
              await refreshToken();
            } catch (refreshError) {
              clearStoredAuth();
              dispatch({ type: AUTH_ACTIONS.LOGOUT });
            }
          } else {
            clearStoredAuth();
            dispatch({ type: AUTH_ACTIONS.LOGOUT });
          }
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    } catch (error) {
      console.error('Erro ao inicializar autenticação:', error);
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // Login
  const login = useCallback(async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await api.post('/auth/login', credentials);
      const { user, token, refreshToken: newRefreshToken, permissions } = response.data;

      // Armazenar no localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', newRefreshToken);
      localStorage.setItem('userData', JSON.stringify(user));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user,
          token,
          refreshToken: newRefreshToken,
          permissions: permissions || [],
        },
      });

      toast.success(`Bem-vindo(a), ${user.name || user.email}!`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao fazer login';
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Register
  const register = useCallback(async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await api.post('/api/auth/register', userData);
      const { user, token, refreshToken: newRefreshToken, permissions } = response.data;

      // Armazenar no localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', newRefreshToken);
      localStorage.setItem('userData', JSON.stringify(user));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user,
          token,
          refreshToken: newRefreshToken,
          permissions: permissions || [],
        },
      });

      toast.success('Conta criada com sucesso!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao criar conta';
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: errorMessage });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      // Tentar fazer logout no servidor
      if (state.token) {
        await api.post('/auth/logout', {
          refreshToken: state.refreshToken,
        });
      }
    } catch (error) {
      console.error('Erro ao fazer logout no servidor:', error);
    } finally {
      clearStoredAuth();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.info('Logout realizado com sucesso');
    }
  }, [state.token, state.refreshToken]);

  // Refresh token
  const refreshToken = useCallback(async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        throw new Error('Refresh token não encontrado');
      }

      const response = await api.post('/auth/refresh', {
        refreshToken: storedRefreshToken,
      });

      const { token: newToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('authToken', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      dispatch({
        type: AUTH_ACTIONS.REFRESH_TOKEN_SUCCESS,
        payload: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });

      return newToken;
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.REFRESH_TOKEN_FAILURE });
      clearStoredAuth();
      throw error;
    }
  }, []);

  // Atualizar perfil do usuário
  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await api.put('/api/auth/profile', profileData);
      const updatedUser = response.data.user;

      localStorage.setItem('userData', JSON.stringify(updatedUser));
      dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updatedUser });

      toast.success('Perfil atualizado com sucesso!');
      return { success: true, user: updatedUser };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao atualizar perfil';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Alterar senha
  const changePassword = useCallback(async (passwordData) => {
    try {
      await api.put('/auth/change-password', passwordData);
      toast.success('Senha alterada com sucesso!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao alterar senha';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Recuperar senha
  const forgotPassword = useCallback(async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Email de recuperação enviado!');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Erro ao enviar email de recuperação';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Verificar permissão
  const hasPermission = useCallback((permission) => {
    return state.permissions.includes(permission) || state.user?.role === 'admin';
  }, [state.permissions, state.user?.role]);

  // Limpar dados armazenados
  const clearStoredAuth = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  };

  // Limpar erro
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const value = {
    // Estado
    ...state,
    
    // Ações
    initializeAuth,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
    forgotPassword,
    hasPermission,
    clearError,
    
    // API instance
    api,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export default AuthContext;