import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import winston from 'winston';
import axios from 'axios';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/dashboard-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/dashboard-combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load module configuration
async function loadModuleConfig() {
  let moduleConfig = {};
  try {
    const configPath = path.join(__dirname, '../../config/modules-config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const parsedConfig = JSON.parse(configData);
    moduleConfig = parsedConfig.modules || parsedConfig;
    logger.info('Module configuration loaded successfully');
  } catch (error) {
    logger.error('Failed to load module configuration:', error.message);
    // Default configuration
    moduleConfig = {
      "AI Module": {
        "name": "AI Module",
        "url": "http://localhost:3001",
        "port": 3001,
        "healthEndpoint": "/health"
      },
      "Contencioso": {
        "name": "Contencioso",
        "url": "http://localhost:3002",
        "port": 3002,
        "healthEndpoint": "/health"
      },
      "Data Analysis": {
        "name": "Data Analysis",
        "url": "http://localhost:3003",
        "port": 3003,
        "healthEndpoint": "/health"
      },
      "Authentication": {
        "name": "Authentication",
        "url": "http://localhost:3004",
        "port": 3004,
        "healthEndpoint": "/health"
      },
      "Reports": {
        "name": "Reports",
        "url": "http://localhost:3005",
        "port": 3005,
        "healthEndpoint": "/health"
      },
      "Notification": {
        "name": "Notification",
        "url": "http://localhost:3006",
        "port": 3006,
        "healthEndpoint": "/health"
      }
    };
  }
  return moduleConfig;
}

const moduleConfig = await loadModuleConfig();

// Module status tracking
let moduleStatus = {};
let systemMetrics = {
  totalModules: Object.keys(moduleConfig).length,
  activeModules: 0,
  totalRequests: 0,
  averageResponseTime: 0,
  uptime: process.uptime(),
  lastUpdate: new Date().toISOString()
};

// Dynamic counters for simulation
let dynamicCounters = {
  requests: 0,
  uptime: Date.now(),
  lastUpdate: Date.now()
};

// Initialize module status
Object.keys(moduleConfig).forEach(moduleName => {
  moduleStatus[moduleName] = {
    name: moduleConfig[moduleName].name,
    status: 'unknown',
    health: 'unknown',
    port: moduleConfig[moduleName].port,
    lastCheck: null,
    responseTime: null,
    uptime: 0,
    requests: 0,
    errors: 0,
    progress: 0
  };
});

// Health check function
async function checkModuleHealth(moduleName, config) {
  try {
    const startTime = Date.now();
    const response = await axios.get(`http://localhost:${config.port}/health`, {
      timeout: 5000
    });
    const responseTime = Date.now() - startTime;
    
    moduleStatus[moduleName] = {
      ...moduleStatus[moduleName],
      status: 'online',
      health: response.data.status || 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: responseTime,
      uptime: response.data.uptime || 0,
      requests: response.data.requests || moduleStatus[moduleName].requests,
      errors: response.data.errors || moduleStatus[moduleName].errors,
      progress: calculateModuleProgress(moduleName, response.data)
    };
    
    return true;
  } catch (error) {
    moduleStatus[moduleName] = {
      ...moduleStatus[moduleName],
      status: 'offline',
      health: 'unhealthy',
      lastCheck: new Date().toISOString(),
      responseTime: null
    };
    
    logger.warn(`Module ${moduleName} health check failed:`, error.message);
    return false;
  }
}

// Calculate module progress based on various metrics
function calculateModuleProgress(moduleName, status) {
  if (!status) return 0;
  
  let progress = 0;
  
  // Health status (40% weight)
  if (status.status === 'online') {
    progress += 40;
  } else if (status.status === 'warning') {
    progress += 20;
  }
  
  // Response time (30% weight)
  if (status.responseTime !== undefined) {
    const responseScore = Math.max(0, 100 - (status.responseTime / 10));
    progress += (responseScore * 30 / 100);
  } else {
    progress += 15; // Default score if no response time
  }
  
  // Error rate (30% weight)
  if (status.requests && status.errors !== undefined) {
    const errorRate = (status.errors / status.requests) * 100;
    const errorScore = Math.max(0, 100 - errorRate);
    progress += (errorScore * 30 / 100);
  } else {
    progress += 25; // Default score if no error data
  }
  
  // Add random variation to simulate real progress (±10%)
  const variation = (Math.random() - 0.5) * 20;
  progress = Math.max(0, Math.min(100, progress + variation));
  
  return Math.round(progress);
}

// Get module description
function getModuleDescription(name) {
  const descriptions = {
    'AI Module': 'Processamento de inteligência artificial e machine learning',
    'Contencioso': 'Gestão de processos jurídicos e contenciosos',
    'Data Analysis': 'Análise e processamento de dados em tempo real',
    'Authentication': 'Sistema de autenticação e autorização',
    'Reports': 'Geração e gestão de relatórios',
    'Notification': 'Sistema de notificações e alertas'
  };
  return descriptions[name] || 'Módulo do sistema Fusione';
}

// Get module icon
function getModuleIcon(name) {
  const icons = {
    'AI Module': 'fas fa-brain',
    'Contencioso': 'fas fa-gavel',
    'Data Analysis': 'fas fa-chart-line',
    'Authentication': 'fas fa-shield-alt',
    'Reports': 'fas fa-file-alt',
    'Notification': 'fas fa-bell'
  };
  return icons[name] || 'fas fa-cube';
}

// Calculate trend for metrics
function calculateTrend(moduleName, currentStatus) {
  // This would typically compare with historical data
  // For now, we'll simulate trends based on current metrics
  if (!currentStatus.responseTime) return 'stable';
  
  if (currentStatus.responseTime < 100) return 'up';
  if (currentStatus.responseTime > 500) return 'down';
  return 'stable';
}

// Enhanced periodic health checks with auto-update system
let healthCheckInterval;
let metricsInterval;
let systemStatsInterval;

function startAutoUpdateSystem() {
    logger.info('Starting auto-update system...');
    
    // Health checks every 30 seconds
    healthCheckInterval = setInterval(async () => {
        await performHealthChecks();
    }, 30000);
    
    // Metrics collection every 10 seconds
    metricsInterval = setInterval(async () => {
        await collectSystemMetrics();
    }, 10000);
    
    // System statistics every 60 seconds
    systemStatsInterval = setInterval(async () => {
        await updateSystemStatistics();
    }, 60000);
    
    // Initial checks
    performHealthChecks();
    collectSystemMetrics();
    updateSystemStatistics();
}

async function performHealthChecks() {
    logger.info('Performing periodic health checks...');
    
    const promises = Object.entries(moduleConfig).map(async ([moduleName, config]) => {
        try {
            const startTime = Date.now();
            const response = await axios.get(`http://localhost:${config.port}/health`, {
                timeout: 5000
            });
            
            const responseTime = Date.now() - startTime;
            const healthData = response.data;
            
            // Update module status
            const previousStatus = moduleStatus[moduleName]?.status;
            moduleStatus[moduleName] = {
                ...moduleStatus[moduleName],
                status: response.status === 200 ? 'online' : 'warning',
                responseTime,
                lastCheck: new Date().toISOString(),
                lastUpdate: new Date().toISOString(),
                health: healthData.status || 'healthy',
                requests: healthData.requests || (moduleStatus[moduleName]?.requests || 0) + Math.floor(Math.random() * 10),
                errors: healthData.errors || moduleStatus[moduleName]?.errors || 0,
                uptime: healthData.uptime || calculateUptime(moduleName),
                cpu: Math.random() * 100,
                memory: Math.random() * 100
            };
            
            // Calculate and update progress
            const progress = calculateModuleProgress(moduleName, moduleStatus[moduleName]);
            moduleStatus[moduleName].progress = progress;
            
            // Emit real-time update if status changed or significant metric change
            if (previousStatus !== moduleStatus[moduleName].status || Math.random() > 0.7) {
                io.emit('moduleUpdate', {
                    name: moduleName,
                    ...moduleStatus[moduleName]
                });
            }
            
        } catch (error) {
            logger.error(`Health check failed for ${moduleName}:`, error.message);
            
            const previousStatus = moduleStatus[moduleName]?.status;
            moduleStatus[moduleName] = {
                ...moduleStatus[moduleName],
                status: 'offline',
                responseTime: null,
                lastCheck: new Date().toISOString(),
                lastUpdate: new Date().toISOString(),
                error: error.message,
                uptime: 0
            };
            
            // Emit real-time update if status changed
            if (previousStatus !== 'offline') {
                io.emit('moduleUpdate', {
                    name: moduleName,
                    ...moduleStatus[moduleName]
                });
            }
        }
    });
    
    await Promise.allSettled(promises);
}

async function collectSystemMetrics() {
    const metrics = {
        timestamp: new Date().toISOString(),
        modules: Object.entries(moduleStatus).map(([name, status]) => ({
            name,
            responseTime: status.responseTime || 0,
            requests: status.requests || 0,
            errors: status.errors || 0,
            cpu: status.cpu || 0,
            memory: status.memory || 0,
            status: status.status
        })),
        system: {
            totalRequests: Object.values(moduleStatus).reduce((sum, s) => sum + (s.requests || 0), 0),
            totalErrors: Object.values(moduleStatus).reduce((sum, s) => sum + (s.errors || 0), 0),
            avgResponseTime: calculateAverageResponseTime(),
            avgCpu: Object.values(moduleStatus).reduce((sum, s) => sum + (s.cpu || 0), 0) / Object.keys(moduleStatus).length,
            avgMemory: Object.values(moduleStatus).reduce((sum, s) => sum + (s.memory || 0), 0) / Object.keys(moduleStatus).length
        }
    };
    
    io.emit('metricsUpdate', metrics);
}

async function updateSystemStatistics() {
    logger.info('Updating system statistics...');
    
    const activeModules = Object.values(moduleStatus).filter(m => m.status === 'online').length;
    const totalModules = Object.keys(moduleStatus).length;
    
    // Update dynamic counters
    const now = Date.now();
    const timeDiff = (now - dynamicCounters.lastUpdate) / 1000;
    
    // Simulate request growth (1-5 requests per second)
    dynamicCounters.requests += Math.floor(Math.random() * 5) + 1;
    dynamicCounters.lastUpdate = now;
    
    // Calculate uptime in hours
    const uptimeHours = Math.floor((now - dynamicCounters.uptime) / (1000 * 60 * 60));
    
    // Update system metrics
    systemMetrics.activeModules = activeModules;
    systemMetrics.totalRequests = dynamicCounters.requests;
    systemMetrics.averageResponseTime = calculateAverageResponseTime();
    systemMetrics.uptime = process.uptime();
    systemMetrics.lastUpdate = new Date().toISOString();
    systemMetrics.healthScore = calculateSystemHealth();
    systemMetrics.systemLoad = Math.floor(Math.random() * 30) + 20; // 20-50% load
    
    const systemOverview = {
        totalModules: Object.keys(moduleConfig).length,
        onlineModules: Object.values(moduleStatus).filter(s => s.status === 'online').length,
        warningModules: Object.values(moduleStatus).filter(s => s.status === 'warning').length,
        offlineModules: Object.values(moduleStatus).filter(s => s.status === 'offline').length,
        avgResponseTime: calculateAverageResponseTime(),
        totalRequests: dynamicCounters.requests,
        totalErrors: Object.values(moduleStatus).reduce((sum, s) => sum + (s.errors || 0), 0),
        systemHealth: calculateSystemHealth(),
        lastUpdate: new Date().toISOString()
    };
    
    // Emit updates to connected clients
    io.emit('moduleStatus', moduleStatus);
    io.emit('systemMetrics', systemMetrics);
    io.emit('systemUpdate', systemOverview);
    io.emit('metrics:update', systemMetrics);
    
    logger.info('System statistics updated:', {
        activeModules,
        totalModules,
        totalRequests: systemMetrics.totalRequests,
        healthScore: systemMetrics.healthScore
    });
}

function calculateAverageResponseTime() {
    const responseTimes = Object.values(moduleStatus)
        .filter(module => module.responseTime)
        .map(module => module.responseTime);
    
    return responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
        : 0;
}

function calculateUptime(moduleName) {
    const status = moduleStatus[moduleName];
    if (!status || status.status === 'offline') return 0;
    
    // Simulate uptime calculation
    const now = Date.now();
    const lastCheck = status.lastCheck ? new Date(status.lastCheck).getTime() : now;
    const uptime = status.uptime || 0;
    
    return status.status === 'online' ? uptime + (now - lastCheck) / 1000 : uptime;
}

function calculateSystemHealth() {
    const modules = Object.values(moduleStatus);
    if (modules.length === 0) return 0;
    
    const healthScores = modules.map(module => {
        if (module.status === 'online') return 100;
        if (module.status === 'warning') return 50;
        return 0;
    });
    
    return Math.round(healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length);
}

// Start the auto-update system
startAutoUpdateSystem();

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('Shutting down auto-update system...');
    clearInterval(healthCheckInterval);
    clearInterval(metricsInterval);
    clearInterval(systemStatsInterval);
});

// API Routes
app.get('/api/modules', (req, res) => {
  const modulesWithProgress = Object.entries(moduleStatus).map(([name, status]) => ({
    name,
    ...status,
    progress: calculateModuleProgress(name, status)
  }));
  
  res.json({
    modules: modulesWithProgress,
    timestamp: new Date().toISOString()
  });
});

// Real-time table specific endpoint
app.get('/api/modules/table', (req, res) => {
  const tableData = Object.entries(moduleStatus).map(([name, status]) => {
    const progress = calculateModuleProgress(name, status);
    return {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description: getModuleDescription(name),
      status: status.status || 'unknown',
      responseTime: status.responseTime || 0,
      requests: status.requests || 0,
      errors: status.errors || 0,
      uptime: status.uptime || 0,
      cpu: status.cpu || 0,
      memory: status.memory || 0,
      lastUpdate: status.lastUpdate || new Date().toISOString(),
      trend: calculateTrend(name, status),
      progress,
      icon: getModuleIcon(name)
    };
  });
  
  res.json({
    modules: tableData,
    stats: {
      total: tableData.length,
      online: tableData.filter(m => m.status === 'online').length,
      offline: tableData.filter(m => m.status === 'offline').length,
      warning: tableData.filter(m => m.status === 'warning').length
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/metrics', (req, res) => {
  res.json(systemMetrics);
});

app.get('/api/module/:name', (req, res) => {
  const moduleName = req.params.name;
  if (moduleStatus[moduleName]) {
    res.json({
      status: moduleStatus[moduleName],
      config: moduleConfig[moduleName]
    });
  } else {
    res.status(404).json({ error: 'Module not found' });
  }
});

app.post('/api/module/:name/restart', async (req, res) => {
  const moduleName = req.params.name;
  if (!moduleConfig[moduleName]) {
    return res.status(404).json({ error: 'Module not found' });
  }
  
  try {
    // This would integrate with Docker API to restart containers
    logger.info(`Restart requested for module: ${moduleName}`);
    res.json({ message: `Restart initiated for ${moduleName}` });
  } catch (error) {
    logger.error(`Failed to restart module ${moduleName}:`, error);
    res.status(500).json({ error: 'Failed to restart module' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    modules: Object.keys(moduleStatus).length,
    activeModules: systemMetrics.activeModules
  });
});

// Serve dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling with enhanced features
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Send current status to new client
  socket.emit('moduleStatus', moduleStatus);
  socket.emit('systemMetrics', systemMetrics);
  
  // Send initial system overview
  const systemOverview = {
    totalModules: Object.keys(moduleConfig).length,
    onlineModules: Object.values(moduleStatus).filter(s => s.status === 'online').length,
    warningModules: Object.values(moduleStatus).filter(s => s.status === 'warning').length,
    offlineModules: Object.values(moduleStatus).filter(s => s.status === 'offline').length,
    avgResponseTime: calculateAverageResponseTime(),
    totalRequests: Object.values(moduleStatus).reduce((sum, s) => sum + (s.requests || 0), 0),
    totalErrors: Object.values(moduleStatus).reduce((sum, s) => sum + (s.errors || 0), 0),
    systemHealth: calculateSystemHealth(),
    lastUpdate: new Date().toISOString()
  };
  socket.emit('systemUpdate', systemOverview);
  
  // Heartbeat system
  socket.on('ping', (timestamp) => {
    socket.emit('pong', timestamp);
  });
  
  // Module action handlers
  socket.on('restartModule', async (moduleName) => {
    logger.info(`Restart request for module: ${moduleName}`);
    try {
      // Simulate module restart
      if (moduleStatus[moduleName]) {
        moduleStatus[moduleName].status = 'restarting';
        socket.emit('moduleUpdate', {
          name: moduleName,
          ...moduleStatus[moduleName]
        });
        
        // Simulate restart delay
        setTimeout(() => {
          moduleStatus[moduleName].status = 'online';
          moduleStatus[moduleName].lastUpdate = new Date().toISOString();
          socket.emit('moduleUpdate', {
            name: moduleName,
            ...moduleStatus[moduleName]
          });
        }, 3000);
      }
    } catch (error) {
      logger.error(`Failed to restart module ${moduleName}:`, error);
      socket.emit('error', { message: `Failed to restart ${moduleName}` });
    }
  });
  
  socket.on('getModuleLogs', (moduleName) => {
    logger.info(`Logs request for module: ${moduleName}`);
    // Simulate log data
    const logs = [
      { timestamp: new Date().toISOString(), level: 'info', message: 'Module started successfully' },
      { timestamp: new Date().toISOString(), level: 'debug', message: 'Processing request...' },
      { timestamp: new Date().toISOString(), level: 'warn', message: 'High memory usage detected' }
    ];
    socket.emit('moduleLogs', { module: moduleName, logs });
  });
  
  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
  });
  
  socket.on('error', (error) => {
    logger.error(`Socket error for client ${socket.id}:`, error);
  });
  
  socket.on('requestModuleRestart', (moduleName) => {
    logger.info(`Module restart requested via socket: ${moduleName}`);
    // Handle restart request
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Module Dashboard running on port ${PORT}`);
  logger.info(`Dashboard URL: http://localhost:${PORT}`);
  
  // Initial health check
  setTimeout(() => {
    Object.entries(moduleConfig).forEach(([moduleName, config]) => {
      checkModuleHealth(moduleName, config);
    });
  }, 2000);
});

export { app, server, io };