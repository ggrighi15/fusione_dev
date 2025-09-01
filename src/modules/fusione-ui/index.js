import path from 'path';
import { promises as fs } from 'fs';
import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { spawn } from 'child_process';

class FusioneUIModule {
    constructor(core) {
        this.core = core;
        this.name = 'fusione-ui';
        this.version = '1.0.0';
        this.description = 'Interface unificada ReactJS com Tailwind CSS para o Fusione Core System';
        
        this.config = {
            theme: {
                primary: '#2563eb',
                secondary: '#64748b',
                accent: '#f59e0b',
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                info: '#3b82f6'
            },
            layout: {
                sidebar: {
                    width: '280px',
                    collapsedWidth: '80px',
                    position: 'fixed'
                },
                header: {
                    height: '64px',
                    fixed: true
                },
                content: {
                    padding: '24px',
                    maxWidth: '1200px'
                }
            },
            features: {
                darkMode: true,
                responsive: true,
                animations: true,
                notifications: true,
                breadcrumbs: true,
                search: true,
                filters: true,
                export: true
            },
            components: {
                dashboard: true,
                dataTable: true,
                forms: true,
                charts: true,
                modals: true,
                tabs: true,
                accordion: true,
                calendar: true,
                fileUpload: true,
                richTextEditor: true
            }
        };
        
        this.routes = [];
        this.middleware = [];
        this.staticPaths = [];
        this.apiEndpoints = new Map();
        
        this.uiComponents = {
            layouts: new Map(),
            pages: new Map(),
            components: new Map(),
            hooks: new Map(),
            utils: new Map()
        };
        
        this.buildConfig = {
            entry: './src/index.js',
            output: './dist',
            publicPath: '/ui',
            devServer: {
                port: 3000,
                proxy: {
                    '/api': 'http://localhost:8080'
                }
            }
        };
    }
    
    async initialize() {
        try {
            console.log(`[${this.name}] Inicializando módulo Fusione UI...`);
            
            // Carregar configurações
            await this.loadConfig();
            
            // Criar estrutura de diretórios
            await this.createDirectoryStructure();
            
            // Gerar componentes React
            await this.generateReactComponents();
            
            // Gerar hooks e contextos
            await this.generateHooks();
            
            // Gerar utilitários
            await this.generateUtils();
            
            // Gerar estilos
            await this.generateStyles();
            
            // Gerar arquivos de configuração
            await this.generateConfigFiles();
            
            // Gerar aplicação principal
            await this.generateMainApp();
            
            // Configurar rotas da API
            await this.setupAPIRoutes();
            
            // Configurar middleware
            await this.setupMiddleware();
            
            // Configurar arquivos estáticos
            await this.setupStaticFiles();
            
            // Registrar eventos
            this.registerEventHandlers();
            
            console.log(`[${this.name}] Módulo inicializado com sucesso`);
            
            return {
                success: true,
                message: 'Fusione UI Module inicializado com sucesso',
                config: this.config
            };
        } catch (error) {
            console.error(`[${this.name}] Erro na inicialização:`, error);
            throw error;
        }
    }
    
    async loadConfig() {
        try {
            const configPath = path.join(__dirname, 'config', 'ui.json');
            const configExists = await fs.access(configPath).then(() => true).catch(() => false);
            
            if (configExists) {
                const configData = await fs.readFile(configPath, 'utf8');
                const customConfig = JSON.parse(configData);
                this.config = { ...this.config, ...customConfig };
            }
            
            console.log(`[${this.name}] Configurações carregadas`);
        } catch (error) {
            console.error(`[${this.name}] Erro ao carregar configurações:`, error);
        }
    }
    
    async createDirectoryStructure() {
        const directories = [
            'src',
            'src/components',
            'src/components/common',
            'src/components/forms',
            'src/components/layout',
            'src/components/charts',
            'src/pages',
            'src/pages/dashboard',
            'src/pages/pessoas',
            'src/pages/contratos',
            'src/pages/compliance',
            'src/pages/contencioso',
            'src/hooks',
            'src/utils',
            'src/services',
            'src/styles',
            'src/assets',
            'src/assets/images',
            'src/assets/icons',
            'public',
            'dist',
            'config'
        ];
        
        for (const dir of directories) {
            const dirPath = path.join(__dirname, dir);
            try {
                await fs.mkdir(dirPath, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    console.error(`[${this.name}] Erro ao criar diretório ${dir}:`, error);
                }
            }
        }
        
        console.log(`[${this.name}] Estrutura de diretórios criada`);
    }
    
    async generateReactComponents() {
        // Gerar componentes principais
        await this.generateMainApp();
        await this.generateLayoutComponents();
        await this.generateCommonComponents();
        await this.generatePageComponents();
        await this.generateHooks();
        await this.generateUtils();
        await this.generateStyles();
        await this.generatePackageJson();
        await this.generateWebpackConfig();
        
        console.log(`[${this.name}] Componentes React gerados`);
    }
    
    async generateLayoutComponents() {
        // Layout principal
        const layoutContent = `import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useTheme } from '../../contexts/ThemeContext';

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme } = useTheme();

  return (
    <div className={\`min-h-screen bg-gray-50 dark:bg-gray-900 \${theme}\`}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
      <div className={\`transition-all duration-300 \${sidebarCollapsed ? 'ml-20' : 'ml-72'}\`}>
        <Header onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'components', 'layout', 'Layout.js'), layoutContent);
        
        // Sidebar
        const sidebarContent = `import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  UsersIcon, 
  DocumentTextIcon, 
  ShieldCheckIcon, 
  ScaleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const menuItems = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Pessoas', href: '/pessoas', icon: UsersIcon },
  { name: 'Contratos', href: '/contratos', icon: DocumentTextIcon },
  { name: 'Compliance', href: '/compliance', icon: ShieldCheckIcon },
  { name: 'Contencioso', href: '/contencioso', icon: ScaleIcon },
];

const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();

  return (
    <div className={\`fixed inset-y-0 left-0 z-50 \${collapsed ? 'w-20' : 'w-72'} bg-white dark:bg-gray-800 shadow-lg transition-all duration-300\`}>
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Fusione
          </h1>
        )}
        <button
          onClick={onToggle}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={\`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors \${
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }\`}
                >
                  <item.icon className={\`h-5 w-5 \${collapsed ? '' : 'mr-3'}\`} />
                  {!collapsed && item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'components', 'layout', 'Sidebar.js'), sidebarContent);
        
        // Header
        const headerContent = `import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isDark ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>
          
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <BellIcon className="h-5 w-5" />
          </button>
          
          <div className="relative">
            <button className="flex items-center space-x-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
              <UserCircleIcon className="h-6 w-6" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.name || 'Usuário'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'components', 'layout', 'Header.js'), headerContent);
    }
    
    async generateCommonComponents() {
        // DataTable component
        const dataTableContent = `import React, { useState, useMemo } from 'react';
import { 
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const DataTable = ({ 
  data = [], 
  columns = [], 
  searchable = true, 
  sortable = true,
  filterable = false,
  pagination = true,
  pageSize = 10,
  onRowClick,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});

  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(item =>
          String(item[key]).toLowerCase().includes(value.toLowerCase())
        );
      }
    });

    return filtered;
  }, [data, searchTerm, filters]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key) => {
    if (!sortable) return;
    
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className={\`bg-white dark:bg-gray-800 rounded-lg shadow \${className}\`}>
      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            {searchable && (
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
            {filterable && (
              <button className="flex items-center space-x-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                <FunnelIcon className="h-4 w-4" />
                <span>Filtros</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={\`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300 \${
                    sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                  }\`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortable && column.sortable !== false && sortConfig.key === column.key && (
                      sortConfig.direction === 'asc' ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedData.map((row, index) => (
              <tr
                key={index}
                className={\`hover:bg-gray-50 dark:hover:bg-gray-700 \${
                  onRowClick ? 'cursor-pointer' : ''
                }\`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length} resultados
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'components', 'common', 'DataTable.js'), dataTableContent);
        
        // ProtectedRoute component
        const protectedRouteContent = `import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'components', 'common', 'ProtectedRoute.js'), protectedRouteContent);
    }
    
    async generatePageComponents() {
        // Dashboard page
        const dashboardContent = `import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  UsersIcon, 
  DocumentTextIcon, 
  ShieldCheckIcon, 
  ScaleIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => fetch('/api/dashboard/stats').then(res => res.json())
  });

  const cards = [
    {
      title: 'Pessoas',
      value: stats?.pessoas || 0,
      icon: UsersIcon,
      color: 'bg-blue-500',
      href: '/pessoas'
    },
    {
      title: 'Contratos',
      value: stats?.contratos || 0,
      icon: DocumentTextIcon,
      color: 'bg-green-500',
      href: '/contratos'
    },
    {
      title: 'Compliance',
      value: stats?.compliance || 0,
      icon: ShieldCheckIcon,
      color: 'bg-yellow-500',
      href: '/compliance'
    },
    {
      title: 'Contencioso',
      value: stats?.contencioso || 0,
      icon: ScaleIcon,
      color: 'bg-red-500',
      href: '/contencioso'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => window.location.href = card.href}
            >
              <div className="flex items-center">
                <div className={\`p-3 rounded-lg \${card.color}\`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Atividades Recentes
          </h2>
          <div className="space-y-3">
            {stats?.recentActivities?.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhuma atividade recente
              </p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Alertas
          </h2>
          <div className="space-y-3">
            {stats?.alerts?.map((alert, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {alert.type}
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhum alerta
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'pages', 'dashboard', 'Dashboard.js'), dashboardContent);
        
        // Login page
        const loginContent = `import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(credentials);
      toast.success('Login realizado com sucesso!');
    } catch (error) {
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Fusione Core System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Faça login em sua conta
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Email"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Senha"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'pages', 'auth', 'Login.js'), loginContent);
        
        // Pessoas page
        const pessoasContent = `import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DataTable from '../../components/common/DataTable';
import { PlusIcon } from '@heroicons/react/24/outline';

const Pessoas = () => {
  const { data: pessoas, isLoading } = useQuery({
    queryKey: ['pessoas'],
    queryFn: () => fetch('/api/pessoas').then(res => res.json())
  });

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'documento', label: 'Documento' },
    { key: 'email', label: 'Email' },
    { key: 'telefone', label: 'Telefone' },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => (
        <span className={\`px-2 py-1 text-xs rounded-full \${
          value === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }\`}>
          {value}
        </span>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pessoas
        </h1>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <PlusIcon className="h-5 w-5" />
          <span>Nova Pessoa</span>
        </button>
      </div>

      <DataTable
        data={pessoas?.data || []}
        columns={columns}
        searchable
        sortable
        pagination
      />
    </div>
  );
};

export default Pessoas;`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'pages', 'pessoas', 'Pessoas.js'), pessoasContent);
    }
    
    async generateHooks() {
        // AuthContext
        const authContextContent = `import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: \`Bearer \${token}\`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const { token, user: userData } = await response.json();
      
      localStorage.setItem('token', token);
      setUser(userData);
      setIsAuthenticated(true);
      
      return userData;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'contexts', 'AuthContext.js'), authContextContent);
        
        // ThemeContext
        const themeContextContent = `import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const value = {
    isDark,
    theme: isDark ? 'dark' : 'light',
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'contexts', 'ThemeContext.js'), themeContextContent);
    }
    
    async generateUtils() {
        // API utilities
        const apiUtilsContent = `const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = \`\${this.baseURL}\${endpoint}\`;
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: \`Bearer \${token}\` }),
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || \`HTTP \${response.status}\`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  upload(endpoint, formData, options = {}) {
    const token = localStorage.getItem('token');
    
    return fetch(\`\${this.baseURL}\${endpoint}\`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: \`Bearer \${token}\` }),
        ...options.headers
      },
      body: formData,
      ...options
    });
  }
}

export const apiClient = new ApiClient();

// Specific API functions
export const pessoasAPI = {
  list: (params) => apiClient.get('/pessoas', { params }),
  get: (id) => apiClient.get(\`/pessoas/\${id}\`),
  create: (data) => apiClient.post('/pessoas', data),
  update: (id, data) => apiClient.put(\`/pessoas/\${id}\`, data),
  delete: (id) => apiClient.delete(\`/pessoas/\${id}\`)
};

export const contratosAPI = {
  list: (params) => apiClient.get('/contratos', { params }),
  get: (id) => apiClient.get(\`/contratos/\${id}\`),
  create: (data) => apiClient.post('/contratos', data),
  update: (id, data) => apiClient.put(\`/contratos/\${id}\`, data),
  delete: (id) => apiClient.delete(\`/contratos/\${id}\`)
};

export const complianceAPI = {
  dashboard: () => apiClient.get('/compliance/dashboard'),
  policies: () => apiClient.get('/compliance/politicas'),
  risks: () => apiClient.get('/compliance/riscos'),
  audits: () => apiClient.get('/compliance/auditorias')
};`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'utils', 'api.js'), apiUtilsContent);
        
        // Format utilities
        const formatUtilsContent = `export const formatCurrency = (value, currency = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(value);
};

export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  };
  
  return new Intl.DateTimeFormat('pt-BR', defaultOptions).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

export const formatCPF = (cpf) => {
  return cpf.replace(/(\\d{3})(\\d{3})(\\d{3})(\\d{2})/, '$1.$2.$3-$4');
};

export const formatCNPJ = (cnpj) => {
  return cnpj.replace(/(\\d{2})(\\d{3})(\\d{3})(\\d{4})(\\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatPhone = (phone) => {
  if (phone.length === 10) {
    return phone.replace(/(\\d{2})(\\d{4})(\\d{4})/, '($1) $2-$3');
  }
  return phone.replace(/(\\d{2})(\\d{5})(\\d{4})/, '($1) $2-$3');
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const truncateText = (text, maxLength = 50) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'utils', 'format.js'), formatUtilsContent);
    }
    
    async generateStyles() {
        // Global CSS with Tailwind
        const globalCssContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  body {
    @apply bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100;
  }
}

@layer components {
  .btn {
    @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2;
  }
  
  .btn-primary {
    @apply btn bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
  }
  
  .btn-secondary {
    @apply btn bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500;
  }
  
  .btn-success {
    @apply btn bg-green-600 text-white hover:bg-green-700 focus:ring-green-500;
  }
  
  .btn-danger {
    @apply btn bg-red-600 text-white hover:bg-red-700 focus:ring-red-500;
  }
  
  .btn-outline {
    @apply btn border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500 dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700;
  }
  
  .form-input {
    @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white;
  }
  
  .form-label {
    @apply block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1;
  }
  
  .card {
    @apply bg-white dark:bg-gray-800 shadow rounded-lg;
  }
  
  .card-header {
    @apply px-6 py-4 border-b border-gray-200 dark:border-gray-700;
  }
  
  .card-body {
    @apply px-6 py-4;
  }
  
  .card-footer {
    @apply px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700;
  }
}

@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.3s ease-in-out;
  }
  
  .animate-slide-in {
    animation: slideIn 0.3s ease-out;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-800;
}

::-webkit-scrollbar-thumb {
  @apply bg-gray-300 dark:bg-gray-600 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400 dark:bg-gray-500;
}

/* Print styles */
@media print {
  .no-print {
    display: none !important;
  }
  
  .print-break {
    page-break-after: always;
  }
}`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'styles', 'globals.css'), globalCssContent);
    }
    
    async generateConfigFiles() {
        // Package.json
        const packageJsonContent = {
            "name": "fusione-ui",
            "version": "1.0.0",
            "description": "Fusione Core System - React UI",
            "main": "src/index.js",
            "scripts": {
                "start": "webpack serve --mode development",
                "build": "webpack --mode production",
                "test": "jest",
                "lint": "eslint src/",
                "format": "prettier --write src/"
            },
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "react-router-dom": "^6.8.0",
                "@heroicons/react": "^2.0.16",
                "date-fns": "^2.29.3",
                "chart.js": "^4.2.1",
                "react-chartjs-2": "^5.2.0",
                "react-hook-form": "^7.43.1",
                "react-query": "^3.39.3",
                "axios": "^1.3.4"
            },
            "devDependencies": {
                "@babel/core": "^7.21.0",
                "@babel/preset-env": "^7.20.2",
                "@babel/preset-react": "^7.18.6",
                "babel-loader": "^9.1.2",
                "css-loader": "^6.7.3",
                "html-webpack-plugin": "^5.5.0",
                "mini-css-extract-plugin": "^2.7.2",
                "postcss": "^8.4.21",
                "postcss-loader": "^7.0.2",
                "tailwindcss": "^3.2.7",
                "autoprefixer": "^10.4.14",
                "webpack": "^5.75.0",
                "webpack-cli": "^5.0.1",
                "webpack-dev-server": "^4.8.0",
                "eslint": "^8.36.0",
                "eslint-plugin-react": "^7.32.2",
                "prettier": "^2.8.4",
                "jest": "^29.5.0"
            },
            "browserslist": {
                "production": [
                    ">0.2%",
                    "not dead",
                    "not op_mini all"
                ],
                "development": [
                    "last 1 chrome version",
                    "last 1 firefox version",
                    "last 1 safari version"
                ]
            }
        };
        
        await fs.writeFile(path.join(__dirname, 'package.json'), JSON.stringify(packageJsonContent, null, 2));
        
        // Webpack config
        const webpackConfigContent = `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      clean: true,
      publicPath: '/'
    },
    module: {
      rules: [
        {
          test: /\\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react']
            }
          }
        },
        {
          test: /\\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        },
        {
          test: /\\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource'
        },
        {
          test: /\\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        favicon: './public/favicon.ico'
      }),
      ...(isProduction ? [new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css'
      })] : [])
    ],
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    devServer: {
      contentBase: path.join(__dirname, 'dist'),
      compress: true,
      port: 3000,
      hot: true,
      historyApiFallback: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true
        }
      }
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\\\/]node_modules[\\\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    }
  };
};`;
        
        await fs.writeFile(path.join(__dirname, 'webpack.config.js'), webpackConfigContent);
        
        // Tailwind config
        const tailwindConfigContent = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite'
      }
    }
  },
  plugins: []
};`;
        
        await fs.writeFile(path.join(__dirname, 'tailwind.config.js'), tailwindConfigContent);
        
        // PostCSS config
        const postcssConfigContent = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};`;
        
        await fs.writeFile(path.join(__dirname, 'postcss.config.js'), postcssConfigContent);
        
        // HTML template
        const htmlTemplateContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Fusione Core System - Sistema de Gestão Empresarial" />
    <title>Fusione Core System</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <noscript>Você precisa habilitar o JavaScript para executar esta aplicação.</noscript>
    <div id="root"></div>
</body>
</html>`;
        
        await fs.mkdir(path.join(__dirname, 'public'), { recursive: true });
        await fs.writeFile(path.join(__dirname, 'public', 'index.html'), htmlTemplateContent);
        
        // Babel config
        const babelConfigContent = {
            "presets": [
                ["@babel/preset-env", {
                    "targets": {
                        "browsers": ["> 1%", "last 2 versions"]
                    }
                }],
                "@babel/preset-react"
            ],
            "plugins": []
        };
        
        await fs.writeFile(path.join(__dirname, '.babelrc'), JSON.stringify(babelConfigContent, null, 2));
    }
    
    async generateMainApp() {
        const appContent = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import Pessoas from './pages/pessoas/Pessoas';
import Contratos from './pages/contratos/Contratos';
import Compliance from './pages/compliance/Compliance';
import Contencioso from './pages/contencioso/Contencioso';
import Login from './pages/auth/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/pessoas" element={
                  <ProtectedRoute>
                    <Layout>
                      <Pessoas />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/contratos" element={
                  <ProtectedRoute>
                    <Layout>
                      <Contratos />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/compliance" element={
                  <ProtectedRoute>
                    <Layout>
                      <Compliance />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/contencioso" element={
                  <ProtectedRoute>
                    <Layout>
                      <Contencioso />
                    </Layout>
                  </ProtectedRoute>
                } />
              </Routes>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  className: 'dark:bg-gray-800 dark:text-white',
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'App.js'), appContent);
        
        const indexContent = `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<App />);`;
        
        await fs.writeFile(path.join(__dirname, 'src', 'index.js'), indexContent);
    }
    
    async setupAPIRoutes() {
        // Configurar rotas da API para servir a UI
        this.apiEndpoints.set('GET /ui/*', this.serveStaticFiles.bind(this));
        this.apiEndpoints.set('GET /api/ui/config', this.getUIConfig.bind(this));
        this.apiEndpoints.set('POST /api/ui/theme', this.updateTheme.bind(this));
        this.apiEndpoints.set('GET /api/ui/components', this.getComponents.bind(this));
        this.apiEndpoints.set('POST /api/ui/layout', this.updateLayout.bind(this));
        
        console.log(`[${this.name}] Rotas da API configuradas`);
    }
    
    async setupMiddleware() {
        // Middleware para servir arquivos estáticos
        this.middleware.push({
            path: '/ui',
            handler: express.static(path.join(__dirname, 'dist'))
        });
        
        // Middleware para SPA routing
        this.middleware.push({
            path: '/ui/*',
            handler: (req, res) => {
                res.sendFile(path.join(__dirname, 'dist', 'index.html'));
            }
        });
        
        console.log(`[${this.name}] Middleware configurado`);
    }
    
    async setupStaticFiles() {
        this.staticPaths.push({
            route: '/ui',
            directory: path.join(__dirname, 'dist')
        });
        
        this.staticPaths.push({
            route: '/ui/assets',
            directory: path.join(__dirname, 'src', 'assets')
        });
        
        console.log(`[${this.name}] Arquivos estáticos configurados`);
    }
    
    registerEventHandlers() {
        if (this.core.eventBus) {
            // Escutar eventos de outros módulos
            this.core.eventBus.on('user:login', this.handleUserLogin.bind(this));
            this.core.eventBus.on('user:logout', this.handleUserLogout.bind(this));
            this.core.eventBus.on('theme:changed', this.handleThemeChange.bind(this));
            this.core.eventBus.on('notification:new', this.handleNotification.bind(this));
            
            console.log(`[${this.name}] Event handlers registrados`);
        }
    }
    
    // API Handlers
    async serveStaticFiles(req, res) {
        try {
            const filePath = path.join(__dirname, 'dist', req.params[0] || 'index.html');
            res.sendFile(filePath);
        } catch (error) {
            res.status(404).json({ error: 'Arquivo não encontrado' });
        }
    }
    
    async getUIConfig(req, res) {
        try {
            res.json({
                success: true,
                config: this.config
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    async updateTheme(req, res) {
        try {
            const { theme } = req.body;
            
            this.config.theme = { ...this.config.theme, ...theme };
            
            // Salvar configuração
            await this.saveConfig();
            
            // Emitir evento
            if (this.core.eventBus) {
                this.core.eventBus.emit('ui:theme_updated', { theme: this.config.theme });
            }
            
            res.json({
                success: true,
                message: 'Tema atualizado com sucesso',
                theme: this.config.theme
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    async getComponents(req, res) {
        try {
            const components = {
                layouts: Array.from(this.uiComponents.layouts.keys()),
                pages: Array.from(this.uiComponents.pages.keys()),
                components: Array.from(this.uiComponents.components.keys()),
                hooks: Array.from(this.uiComponents.hooks.keys()),
                utils: Array.from(this.uiComponents.utils.keys())
            };
            
            res.json({
                success: true,
                components
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    async updateLayout(req, res) {
        try {
            const { layout } = req.body;
            
            this.config.layout = { ...this.config.layout, ...layout };
            
            // Salvar configuração
            await this.saveConfig();
            
            // Emitir evento
            if (this.core.eventBus) {
                this.core.eventBus.emit('ui:layout_updated', { layout: this.config.layout });
            }
            
            res.json({
                success: true,
                message: 'Layout atualizado com sucesso',
                layout: this.config.layout
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    
    // Event Handlers
    handleUserLogin(data) {
        console.log(`[${this.name}] Usuário logado:`, data.userId);
        // Atualizar estado da UI
    }
    
    handleUserLogout(data) {
        console.log(`[${this.name}] Usuário deslogado:`, data.userId);
        // Limpar estado da UI
    }
    
    handleThemeChange(data) {
        console.log(`[${this.name}] Tema alterado:`, data.theme);
        // Aplicar novo tema
    }
    
    handleNotification(data) {
        console.log(`[${this.name}] Nova notificação:`, data);
        // Exibir notificação na UI
    }
    
    // Utility Methods
    async saveConfig() {
        try {
            const configPath = path.join(__dirname, 'config', 'ui.json');
            await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error(`[${this.name}] Erro ao salvar configuração:`, error);
        }
    }
    
    async buildProduction() {
        try {
            console.log(`[${this.name}] Iniciando build de produção...`);
            
            // Executar build do React
            // spawn já importado no topo
            
            return new Promise((resolve, reject) => {
                const buildProcess = spawn('npm', ['run', 'build'], {
                    cwd: __dirname,
                    stdio: 'inherit'
                });
                
                buildProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log(`[${this.name}] Build concluído com sucesso`);
                        resolve();
                    } else {
                        reject(new Error(`Build falhou com código ${code}`));
                    }
                });
            });
        } catch (error) {
            console.error(`[${this.name}] Erro no build:`, error);
            throw error;
        }
    }
    
    async startDevServer() {
        try {
            console.log(`[${this.name}] Iniciando servidor de desenvolvimento...`);
            
            // spawn já importado no topo
            
            const devProcess = spawn('npm', ['start'], {
                cwd: __dirname,
                stdio: 'inherit'
            });
            
            console.log(`[${this.name}] Servidor de desenvolvimento iniciado na porta ${this.buildConfig.devServer.port}`);
            
            return devProcess;
        } catch (error) {
            console.error(`[${this.name}] Erro ao iniciar servidor de desenvolvimento:`, error);
            throw error;
        }
    }
    
    getRoutes() {
        return this.routes;
    }
    
    getMiddleware() {
        return this.middleware;
    }
    
    getStaticPaths() {
        return this.staticPaths;
    }
    
    getAPIEndpoints() {
        return this.apiEndpoints;
    }
    
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            config: this.config,
            components: {
                layouts: this.uiComponents.layouts.size,
                pages: this.uiComponents.pages.size,
                components: this.uiComponents.components.size,
                hooks: this.uiComponents.hooks.size,
                utils: this.uiComponents.utils.size
            }
        };
    }
}

export default FusioneUIModule;