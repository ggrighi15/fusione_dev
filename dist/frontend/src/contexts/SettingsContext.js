import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';

// Estados iniciais
const initialState = {
  darkMode: false,
  language: 'pt-BR',
  notifications: {
    email: true,
    push: true,
    sound: true,
    desktop: true,
  },
  dashboard: {
    layout: 'grid', // 'grid' | 'list'
    refreshInterval: 30000, // 30 segundos
    showWelcome: true,
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium', // 'small' | 'medium' | 'large'
  },
  performance: {
    enableAnimations: true,
    lazyLoading: true,
    cacheEnabled: true,
  },
  privacy: {
    analytics: true,
    cookies: true,
    dataSharing: false,
  },
  isLoading: false,
  error: null,
};

// Actions
const SETTINGS_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  TOGGLE_DARK_MODE: 'TOGGLE_DARK_MODE',
  SET_LANGUAGE: 'SET_LANGUAGE',
  UPDATE_NOTIFICATIONS: 'UPDATE_NOTIFICATIONS',
  UPDATE_DASHBOARD: 'UPDATE_DASHBOARD',
  UPDATE_ACCESSIBILITY: 'UPDATE_ACCESSIBILITY',
  UPDATE_PERFORMANCE: 'UPDATE_PERFORMANCE',
  UPDATE_PRIVACY: 'UPDATE_PRIVACY',
  LOAD_SETTINGS: 'LOAD_SETTINGS',
  RESET_SETTINGS: 'RESET_SETTINGS',
};

// Reducer
const settingsReducer = (state, action) => {
  switch (action.type) {
    case SETTINGS_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case SETTINGS_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case SETTINGS_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case SETTINGS_ACTIONS.TOGGLE_DARK_MODE:
      return {
        ...state,
        darkMode: !state.darkMode,
      };

    case SETTINGS_ACTIONS.SET_LANGUAGE:
      return {
        ...state,
        language: action.payload,
      };

    case SETTINGS_ACTIONS.UPDATE_NOTIFICATIONS:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          ...action.payload,
        },
      };

    case SETTINGS_ACTIONS.UPDATE_DASHBOARD:
      return {
        ...state,
        dashboard: {
          ...state.dashboard,
          ...action.payload,
        },
      };

    case SETTINGS_ACTIONS.UPDATE_ACCESSIBILITY:
      return {
        ...state,
        accessibility: {
          ...state.accessibility,
          ...action.payload,
        },
      };

    case SETTINGS_ACTIONS.UPDATE_PERFORMANCE:
      return {
        ...state,
        performance: {
          ...state.performance,
          ...action.payload,
        },
      };

    case SETTINGS_ACTIONS.UPDATE_PRIVACY:
      return {
        ...state,
        privacy: {
          ...state.privacy,
          ...action.payload,
        },
      };

    case SETTINGS_ACTIONS.LOAD_SETTINGS:
      return {
        ...state,
        ...action.payload,
        isLoading: false,
        error: null,
      };

    case SETTINGS_ACTIONS.RESET_SETTINGS:
      return {
        ...initialState,
        isLoading: false,
      };

    default:
      return state;
  }
};

// Context
const SettingsContext = createContext();

// Provider
export const SettingsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  // Carregar configurações do localStorage
  const loadSettings = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('fusioneSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        dispatch({
          type: SETTINGS_ACTIONS.LOAD_SETTINGS,
          payload: parsedSettings,
        });
      } else {
        // Detectar preferências do sistema
        const systemPreferences = {
          darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
          accessibility: {
            ...initialState.accessibility,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            highContrast: window.matchMedia('(prefers-contrast: high)').matches,
          },
        };
        
        dispatch({
          type: SETTINGS_ACTIONS.LOAD_SETTINGS,
          payload: { ...initialState, ...systemPreferences },
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      dispatch({
        type: SETTINGS_ACTIONS.SET_ERROR,
        payload: 'Erro ao carregar configurações',
      });
    }
  }, []);

  // Salvar configurações no localStorage
  const saveSettings = useCallback((settings) => {
    try {
      localStorage.setItem('fusioneSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    }
  }, []);

  // Efeito para salvar configurações quando o estado mudar
  useEffect(() => {
    if (!state.isLoading) {
      saveSettings(state);
    }
  }, [state, saveSettings]);

  // Efeito para aplicar tema escuro
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [state.darkMode]);

  // Efeito para aplicar configurações de acessibilidade
  useEffect(() => {
    const root = document.documentElement;
    
    // Fonte
    root.style.setProperty('--font-size-multiplier', 
      state.accessibility.fontSize === 'small' ? '0.875' :
      state.accessibility.fontSize === 'large' ? '1.125' : '1'
    );
    
    // Alto contraste
    if (state.accessibility.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }
    
    // Movimento reduzido
    if (state.accessibility.reducedMotion) {
      root.setAttribute('data-reduced-motion', 'true');
    } else {
      root.removeAttribute('data-reduced-motion');
    }
  }, [state.accessibility]);

  // Efeito para aplicar configurações de performance
  useEffect(() => {
    const root = document.documentElement;
    
    if (!state.performance.enableAnimations) {
      root.setAttribute('data-no-animations', 'true');
    } else {
      root.removeAttribute('data-no-animations');
    }
  }, [state.performance.enableAnimations]);

  // Inicializar configurações
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Listeners para mudanças de preferências do sistema
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleDarkModeChange = (e) => {
      if (!localStorage.getItem('fusioneSettings')) {
        dispatch({ type: SETTINGS_ACTIONS.TOGGLE_DARK_MODE });
      }
    };

    const handleReducedMotionChange = (e) => {
      dispatch({
        type: SETTINGS_ACTIONS.UPDATE_ACCESSIBILITY,
        payload: { reducedMotion: e.matches },
      });
    };

    const handleHighContrastChange = (e) => {
      dispatch({
        type: SETTINGS_ACTIONS.UPDATE_ACCESSIBILITY,
        payload: { highContrast: e.matches },
      });
    };

    darkModeQuery.addEventListener('change', handleDarkModeChange);
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      darkModeQuery.removeEventListener('change', handleDarkModeChange);
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  // Actions
  const toggleDarkMode = useCallback(() => {
    dispatch({ type: SETTINGS_ACTIONS.TOGGLE_DARK_MODE });
  }, []);

  const setLanguage = useCallback((language) => {
    dispatch({ type: SETTINGS_ACTIONS.SET_LANGUAGE, payload: language });
    toast.success('Idioma alterado com sucesso');
  }, []);

  const updateNotifications = useCallback((notifications) => {
    dispatch({ type: SETTINGS_ACTIONS.UPDATE_NOTIFICATIONS, payload: notifications });
    toast.success('Configurações de notificação atualizadas');
  }, []);

  const updateDashboard = useCallback((dashboard) => {
    dispatch({ type: SETTINGS_ACTIONS.UPDATE_DASHBOARD, payload: dashboard });
    toast.success('Configurações do dashboard atualizadas');
  }, []);

  const updateAccessibility = useCallback((accessibility) => {
    dispatch({ type: SETTINGS_ACTIONS.UPDATE_ACCESSIBILITY, payload: accessibility });
    toast.success('Configurações de acessibilidade atualizadas');
  }, []);

  const updatePerformance = useCallback((performance) => {
    dispatch({ type: SETTINGS_ACTIONS.UPDATE_PERFORMANCE, payload: performance });
    toast.success('Configurações de performance atualizadas');
  }, []);

  const updatePrivacy = useCallback((privacy) => {
    dispatch({ type: SETTINGS_ACTIONS.UPDATE_PRIVACY, payload: privacy });
    toast.success('Configurações de privacidade atualizadas');
  }, []);

  const resetSettings = useCallback(() => {
    dispatch({ type: SETTINGS_ACTIONS.RESET_SETTINGS });
    localStorage.removeItem('fusioneSettings');
    toast.success('Configurações restauradas para o padrão');
  }, []);

  const exportSettings = useCallback(() => {
    try {
      const settingsData = JSON.stringify(state, null, 2);
      const blob = new Blob([settingsData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fusione-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Configurações exportadas com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar configurações');
    }
  }, [state]);

  const importSettings = useCallback((file) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result);
          dispatch({ type: SETTINGS_ACTIONS.LOAD_SETTINGS, payload: importedSettings });
          toast.success('Configurações importadas com sucesso');
        } catch (parseError) {
          toast.error('Arquivo de configurações inválido');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      toast.error('Erro ao importar configurações');
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: SETTINGS_ACTIONS.CLEAR_ERROR });
  }, []);

  const value = {
    // Estado
    ...state,
    
    // Actions
    toggleDarkMode,
    setLanguage,
    updateNotifications,
    updateDashboard,
    updateAccessibility,
    updatePerformance,
    updatePrivacy,
    resetSettings,
    exportSettings,
    importSettings,
    clearError,
    loadSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Hook personalizado
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings deve ser usado dentro de um SettingsProvider');
  }
  return context;
};

export default SettingsContext;