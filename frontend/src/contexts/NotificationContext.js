import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

// Estados iniciais
const initialState = {
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  isLoading: false,
  error: null,
  settings: {
    sound: true,
    desktop: true,
    email: true,
    push: true,
  },
};

// Actions
const NOTIFICATION_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CONNECTED: 'SET_CONNECTED',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_AS_READ: 'MARK_AS_READ',
  MARK_ALL_AS_READ: 'MARK_ALL_AS_READ',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_ALL_NOTIFICATIONS: 'CLEAR_ALL_NOTIFICATIONS',
  LOAD_NOTIFICATIONS: 'LOAD_NOTIFICATIONS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_UNREAD_COUNT: 'UPDATE_UNREAD_COUNT',
};

// Reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case NOTIFICATION_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case NOTIFICATION_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case NOTIFICATION_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case NOTIFICATION_ACTIONS.SET_CONNECTED:
      return {
        ...state,
        isConnected: action.payload,
      };

    case NOTIFICATION_ACTIONS.ADD_NOTIFICATION:
      const newNotification = {
        id: action.payload.id || Date.now().toString(),
        ...action.payload,
        timestamp: action.payload.timestamp || new Date().toISOString(),
        read: false,
      };
      
      return {
        ...state,
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };

    case NOTIFICATION_ACTIONS.MARK_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };

    case NOTIFICATION_ACTIONS.MARK_ALL_AS_READ:
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          read: true,
        })),
        unreadCount: 0,
      };

    case NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION:
      const notificationToRemove = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(notification => notification.id !== action.payload),
        unreadCount: notificationToRemove && !notificationToRemove.read 
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };

    case NOTIFICATION_ACTIONS.CLEAR_ALL_NOTIFICATIONS:
      return {
        ...state,
        notifications: [],
        unreadCount: 0,
      };

    case NOTIFICATION_ACTIONS.LOAD_NOTIFICATIONS:
      const unreadCount = action.payload.filter(n => !n.read).length;
      return {
        ...state,
        notifications: action.payload,
        unreadCount,
        isLoading: false,
      };

    case NOTIFICATION_ACTIONS.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    case NOTIFICATION_ACTIONS.UPDATE_UNREAD_COUNT:
      return {
        ...state,
        unreadCount: action.payload,
      };

    default:
      return state;
  }
};

// Context
const NotificationContext = createContext();

// Provider
export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const socketRef = useRef(null);
  const audioRef = useRef(null);

  // Configurar áudio para notificações
  useEffect(() => {
    audioRef.current = new Audio('/notification-sound.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Conectar WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      socketRef.current = io(API_BASE_URL, {
        auth: {
          token,
        },
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('WebSocket conectado');
        dispatch({ type: NOTIFICATION_ACTIONS.SET_CONNECTED, payload: true });
      });

      socketRef.current.on('disconnect', () => {
        console.log('WebSocket desconectado');
        dispatch({ type: NOTIFICATION_ACTIONS.SET_CONNECTED, payload: false });
      });

      socketRef.current.on('notification', (notification) => {
        handleNewNotification(notification);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Erro de conexão WebSocket:', error);
        dispatch({ type: NOTIFICATION_ACTIONS.SET_ERROR, payload: 'Erro de conexão' });
      });

    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      dispatch({ type: NOTIFICATION_ACTIONS.SET_ERROR, payload: 'Erro ao conectar' });
    }
  }, []);

  // Desconectar WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      dispatch({ type: NOTIFICATION_ACTIONS.SET_CONNECTED, payload: false });
    }
  }, []);

  // Lidar com nova notificação
  const handleNewNotification = useCallback((notification) => {
    dispatch({ type: NOTIFICATION_ACTIONS.ADD_NOTIFICATION, payload: notification });

    // Mostrar toast
    const toastOptions = {
      position: 'top-right',
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    };

    switch (notification.type) {
      case 'success':
        toast.success(notification.message, toastOptions);
        break;
      case 'error':
        toast.error(notification.message, toastOptions);
        break;
      case 'warning':
        toast.warning(notification.message, toastOptions);
        break;
      case 'info':
      default:
        toast.info(notification.message, toastOptions);
        break;
    }

    // Reproduzir som se habilitado
    if (state.settings.sound && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }

    // Mostrar notificação desktop se habilitado
    if (state.settings.desktop && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(notification.title || 'Fusione Core', {
          body: notification.message,
          icon: '/logo192.png',
          tag: notification.id,
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(notification.title || 'Fusione Core', {
              body: notification.message,
              icon: '/logo192.png',
              tag: notification.id,
            });
          }
        });
      }
    }
  }, [state.settings.sound, state.settings.desktop]);

  // Carregar notificações do servidor
  const loadNotifications = useCallback(async () => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.SET_LOADING, payload: true });
      
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/notifications/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const notifications = await response.json();
        dispatch({ type: NOTIFICATION_ACTIONS.LOAD_NOTIFICATIONS, payload: notifications });
      } else {
        throw new Error('Erro ao carregar notificações');
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      dispatch({ type: NOTIFICATION_ACTIONS.SET_ERROR, payload: 'Erro ao carregar notificações' });
    }
  }, []);

  // Marcar como lida
  const markAsRead = useCallback(async (notificationId) => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.MARK_AS_READ, payload: notificationId });
      
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.MARK_ALL_AS_READ });
      
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      toast.error('Erro ao marcar notificações como lidas');
    }
  }, []);

  // Remover notificação
  const removeNotification = useCallback(async (notificationId) => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.REMOVE_NOTIFICATION, payload: notificationId });
      
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
    }
  }, []);

  // Limpar todas as notificações
  const clearAllNotifications = useCallback(async () => {
    try {
      dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_ALL_NOTIFICATIONS });
      
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      await fetch(`${API_BASE_URL}/api/notifications/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      toast.success('Todas as notificações foram removidas');
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
      toast.error('Erro ao limpar notificações');
    }
  }, []);

  // Enviar notificação
  const sendNotification = useCallback(async (notificationData) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });

      if (response.ok) {
        toast.success('Notificação enviada com sucesso');
        return { success: true };
      } else {
        throw new Error('Erro ao enviar notificação');
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      toast.error('Erro ao enviar notificação');
      return { success: false, error: error.message };
    }
  }, []);

  // Atualizar configurações
  const updateSettings = useCallback((newSettings) => {
    dispatch({ type: NOTIFICATION_ACTIONS.UPDATE_SETTINGS, payload: newSettings });
    
    // Salvar no localStorage
    const currentSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    const updatedSettings = { ...currentSettings, ...newSettings };
    localStorage.setItem('notificationSettings', JSON.stringify(updatedSettings));
    
    toast.success('Configurações de notificação atualizadas');
  }, []);

  // Solicitar permissão para notificações desktop
  const requestDesktopPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Limpar erro
  const clearError = useCallback(() => {
    dispatch({ type: NOTIFICATION_ACTIONS.CLEAR_ERROR });
  }, []);

  // Efeitos
  useEffect(() => {
    // Carregar configurações do localStorage
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: NOTIFICATION_ACTIONS.UPDATE_SETTINGS, payload: settings });
      } catch (error) {
        console.error('Erro ao carregar configurações de notificação:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Cleanup na desmontagem
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  const value = {
    // Estado
    ...state,
    
    // Actions
    connectWebSocket,
    disconnectWebSocket,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    sendNotification,
    updateSettings,
    requestDesktopPermission,
    clearError,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook personalizado
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
};

export default NotificationContext;