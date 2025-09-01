// Fusione Core System - Dashboard Advanced Functionality

class FusioneDashboard {
    constructor() {
        this.socket = null;
        this.moduleData = {};
        this.systemMetrics = {};
        this.charts = {};
        this.updateInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.init();
    }
    
    init() {
        this.initializeSocket();
        this.setupEventListeners();
        this.startPeriodicUpdates();
        this.initializeCharts();
        this.loadInitialData();
    }
    
    initializeSocket() {
        this.socket = io({
            transports: ['websocket', 'polling'],
            timeout: 5000,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts,
            forceNew: true
        });
        
        this.heartbeatInterval = null;
        
        this.socket.on('connect', () => {
            console.log('Dashboard conectado ao servidor');
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
            this.startHeartbeat();
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Dashboard desconectado do servidor:', reason);
            this.updateConnectionStatus(false);
            this.stopHeartbeat();
        });
        
        this.socket.on('reconnect', (attemptNumber) => {
            console.log('Reconectado após', attemptNumber, 'tentativas');
            this.updateConnectionStatus(true);
            this.startHeartbeat();
        });
        
        this.socket.on('reconnect_error', (error) => {
            console.error('Erro na reconexão:', error);
        });
        
        this.socket.on('reconnect_failed', () => {
            console.error('Falha na reconexão');
            this.updateConnectionStatus(false, 'Falha na conexão');
        });
        
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`Tentativa de reconexão ${attemptNumber}`);
            this.reconnectAttempts = attemptNumber;
        });
        
        this.socket.on('moduleStatus', (modules) => {
            this.handleModuleStatusUpdate(modules);
        });
        
        this.socket.on('moduleUpdate', (data) => {
            console.log('Module update received:', data);
            
            // Update real-time table
            if (window.realTimeTable) {
                window.realTimeTable.updateModule(data);
            }
        });
        
        this.socket.on('systemMetrics', (metrics) => {
            this.handleSystemMetricsUpdate(metrics);
        });
        
        this.socket.on('systemUpdate', (data) => {
            console.log('System update received:', data);
            
            // Update real-time table system stats
            if (window.realTimeTable) {
                window.realTimeTable.updateSystemStats(data);
            }
        });
        
        this.socket.on('moduleAlert', (alert) => {
            this.showAlert(alert);
        });
        
        this.socket.on('pong', (timestamp) => {
            const latency = Date.now() - timestamp;
            this.updateLatency(latency);
        });
    }
    
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshAllData();
                        break;
                    case 'f':
                        e.preventDefault();
                        this.toggleFullscreen();
                        break;
                }
            }
        });
        
        // Visibility change handling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseUpdates();
            } else {
                this.resumeUpdates();
            }
        });
        
        // Window resize handling
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    startPeriodicUpdates() {
        this.updateInterval = setInterval(() => {
            if (!document.hidden) {
                this.fetchSystemMetrics();
                this.updateCharts();
            }
        }, 10000); // Update every 10 seconds
    }
    
    pauseUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    resumeUpdates() {
        if (!this.updateInterval) {
            this.startPeriodicUpdates();
        }
    }
    
    async loadInitialData() {
        try {
            await Promise.all([
                this.fetchModules(),
                this.fetchSystemMetrics()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showError('Erro ao carregar dados do dashboard');
        }
    }
    
    async fetchModules() {
        try {
            const response = await fetch('/api/modules');
            if (!response.ok) throw new Error('Falha ao buscar módulos');
            
            const data = await response.json();
            this.handleModuleStatusUpdate(data.modules);
        } catch (error) {
            console.error('Erro ao buscar módulos:', error);
            throw error;
        }
    }
    
    async fetchSystemMetrics() {
        try {
            const response = await fetch('/api/metrics');
            if (!response.ok) throw new Error('Falha ao buscar métricas');
            
            const data = await response.json();
            this.handleSystemMetricsUpdate(data);
        } catch (error) {
            console.error('Erro ao buscar métricas:', error);
        }
    }
    
    handleModuleStatusUpdate(modules) {
        this.moduleData = modules;
        this.updateModulesDisplay();
        this.updateSystemOverview();
        
        // Update real-time table if available
        if (window.realTimeTable) {
            window.realTimeTable.updateData(Object.values(modules));
        }
    }
    
    handleSystemMetricsUpdate(metrics) {
        this.systemMetrics = metrics;
        this.updateSystemMetricsDisplay(metrics);
        this.updateCharts();
    }
    
    updateModulesDisplay() {
        const container = document.getElementById('modulesContainer');
        if (!container) return;
        
        if (Object.keys(this.moduleData).length === 0) {
            container.innerHTML = this.createEmptyState();
            return;
        }
        
        const modulesHTML = Object.entries(this.moduleData)
            .map(([name, status]) => this.createModuleCard(name, status))
            .join('');
        
        container.innerHTML = modulesHTML;
        
        // Add animation classes
        setTimeout(() => {
            container.querySelectorAll('.module-card').forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
                card.classList.add('fade-in');
            });
        }, 100);
    }
    
    createModuleCard(moduleName, moduleStatus) {
        const progress = moduleStatus.progress || 0;
        const responseTime = moduleStatus.responseTime ? `${moduleStatus.responseTime}ms` : 'N/A';
        const lastCheck = moduleStatus.lastCheck ? 
            new Date(moduleStatus.lastCheck).toLocaleTimeString('pt-BR') : 'Nunca';
        
        const statusClass = this.getStatusClass(moduleStatus.status);
        const statusIcon = this.getStatusIcon(moduleStatus.status);
        const progressColor = this.getProgressColor(progress);
        
        return `
            <div class="module-card" data-module="${moduleName}">
                <div class="module-header">
                    <div class="module-info">
                        <h3>${moduleStatus.name || moduleName}</h3>
                        <p class="module-description">
                            Porta: ${moduleStatus.port} | 
                            Debug: ${moduleStatus.debugPort || 'N/A'}
                        </p>
                    </div>
                    <div class="module-status ${statusClass}">
                        <i class="${statusIcon}"></i>
                        ${moduleStatus.status.toUpperCase()}
                    </div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%; background: ${progressColor};"></div>
                </div>
                <div style="text-align: center; margin-bottom: 15px; font-size: 14px; font-weight: 600;">
                    Progresso: ${progress}%
                </div>
                
                <div class="module-metrics">
                    <div class="module-metric tooltip" data-tooltip="Tempo de resposta da última verificação">
                        <span class="module-metric-value">${responseTime}</span>
                        <span class="module-metric-label">Resposta</span>
                    </div>
                    <div class="module-metric tooltip" data-tooltip="Total de requisições processadas">
                        <span class="module-metric-value">${(moduleStatus.requests || 0).toLocaleString()}</span>
                        <span class="module-metric-label">Requisições</span>
                    </div>
                    <div class="module-metric tooltip" data-tooltip="Tempo desde a última inicialização">
                        <span class="module-metric-value">${this.formatUptime(moduleStatus.uptime || 0)}</span>
                        <span class="module-metric-label">Uptime</span>
                    </div>
                    <div class="module-metric tooltip" data-tooltip="Horário da última verificação de saúde">
                        <span class="module-metric-value">${lastCheck}</span>
                        <span class="module-metric-label">Última Verificação</span>
                    </div>
                </div>
                
                <div class="module-actions">
                    <button class="btn btn-primary" onclick="dashboard.openModule('${moduleName}', ${moduleStatus.port})">
                        <i class="fas fa-external-link-alt"></i>
                        Abrir
                    </button>
                    <button class="btn btn-secondary" onclick="dashboard.restartModule('${moduleName}')">
                        <i class="fas fa-redo"></i>
                        Reiniciar
                    </button>
                    <button class="btn btn-secondary" onclick="dashboard.showModuleDetails('${moduleName}')">
                        <i class="fas fa-info-circle"></i>
                        Detalhes
                    </button>
                </div>
            </div>
        `;
    }
    
    createEmptyState() {
        return `
            <div class="empty-state" style="
                text-align: center;
                padding: 60px 20px;
                color: var(--text-secondary);
                grid-column: 1 / -1;
            ">
                <i class="fas fa-cube" style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3 style="margin-bottom: 10px;">Nenhum módulo encontrado</h3>
                <p>Inicie os containers dos módulos para vê-los aqui.</p>
                <button class="btn btn-primary" onclick="dashboard.refreshAllData()" style="margin-top: 20px;">
                    <i class="fas fa-refresh"></i>
                    Atualizar
                </button>
            </div>
        `;
    }
    
    updateSystemMetricsDisplay(metrics) {
        const elements = {
            totalModules: document.getElementById('totalModules'),
            activeModules: document.getElementById('activeModules'),
            systemUptime: document.getElementById('systemUptime'),
            totalRequests: document.getElementById('totalRequests'),
            avgResponseTime: document.getElementById('avgResponseTime'),
            systemLoad: document.getElementById('systemLoad'),
            healthScore: document.getElementById('healthScore')
        };
        
        if (elements.totalModules) {
            elements.totalModules.textContent = metrics.totalModules || 0;
        }
        if (elements.activeModules) {
            elements.activeModules.textContent = metrics.activeModules || 0;
        }
        if (elements.systemUptime) {
            elements.systemUptime.textContent = this.formatUptime(metrics.uptime || 0);
        }
        if (elements.totalRequests) {
            elements.totalRequests.textContent = (metrics.totalRequests || 0).toLocaleString();
        }
        if (elements.avgResponseTime) {
            elements.avgResponseTime.textContent = Math.round(metrics.averageResponseTime || 0) + 'ms';
        }
        
        // Calculate system load and health score
        const activePercentage = metrics.totalModules > 0 ? 
            (metrics.activeModules / metrics.totalModules) * 100 : 0;
        
        if (elements.systemLoad) {
            elements.systemLoad.textContent = Math.round(activePercentage) + '%';
        }
        if (elements.healthScore) {
            elements.healthScore.textContent = Math.round(activePercentage) + '%';
        }
    }
    
    updateSystemOverview() {
        const totalModules = Object.keys(this.moduleData).length;
        const activeModules = Object.values(this.moduleData)
            .filter(module => module.status === 'online').length;
        
        this.updateSystemMetricsDisplay({
            ...this.systemMetrics,
            totalModules,
            activeModules
        });
    }
    
    // Utility methods
    formatUptime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
    
    getStatusClass(status) {
        switch (status) {
            case 'online': return 'status-online';
            case 'offline': return 'status-offline';
            default: return 'status-unknown';
        }
    }
    
    getStatusIcon(status) {
        switch (status) {
            case 'online': return 'fas fa-check-circle';
            case 'offline': return 'fas fa-times-circle';
            default: return 'fas fa-question-circle';
        }
    }
    
    getProgressColor(progress) {
        if (progress >= 80) return 'var(--gradient-success)';
        if (progress >= 60) return 'var(--gradient-warning)';
        return 'var(--gradient-error)';
    }
    
    // Action methods
    openModule(moduleName, port) {
        const url = `http://localhost:${port}`;
        window.open(url, '_blank');
        
        // Track module access
        this.trackEvent('module_opened', { module: moduleName, port });
    }
    
    async restartModule(moduleName) {
        if (!confirm(`Tem certeza que deseja reiniciar o módulo ${moduleName}?`)) {
            return;
        }
        
        try {
            this.showLoading(`Reiniciando ${moduleName}...`);
            
            const response = await fetch(`/api/module/${moduleName}/restart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showSuccess(data.message || 'Módulo reiniciado com sucesso!');
                this.trackEvent('module_restarted', { module: moduleName });
            } else {
                throw new Error(data.error || 'Erro ao reiniciar módulo');
            }
        } catch (error) {
            console.error('Erro ao reiniciar módulo:', error);
            this.showError(`Erro ao reiniciar ${moduleName}: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }
    
    showModuleDetails(moduleName) {
        const moduleData = this.moduleData[moduleName];
        if (!moduleData) return;
        
        const details = `
            <div class="module-details">
                <h3>${moduleData.name || moduleName}</h3>
                <div class="detail-grid">
                    <div><strong>Status:</strong> ${moduleData.status}</div>
                    <div><strong>Porta:</strong> ${moduleData.port}</div>
                    <div><strong>Debug Port:</strong> ${moduleData.debugPort || 'N/A'}</div>
                    <div><strong>Progresso:</strong> ${moduleData.progress || 0}%</div>
                    <div><strong>Uptime:</strong> ${this.formatUptime(moduleData.uptime || 0)}</div>
                    <div><strong>Requisições:</strong> ${(moduleData.requests || 0).toLocaleString()}</div>
                    <div><strong>Tempo de Resposta:</strong> ${moduleData.responseTime || 'N/A'}ms</div>
                    <div><strong>Última Verificação:</strong> ${moduleData.lastCheck ? new Date(moduleData.lastCheck).toLocaleString('pt-BR') : 'Nunca'}</div>
                </div>
            </div>
        `;
        
        this.showModal('Detalhes do Módulo', details);
    }
    
    // UI Helper methods
    showAlert(alert) {
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${alert.type}`;
        alertElement.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(alert.type)}"></i>
            <span>${alert.message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(alertElement);
        
        setTimeout(() => {
            if (alertElement.parentElement) {
                alertElement.remove();
            }
        }, 5000);
    }
    
    showSuccess(message) {
        this.showAlert({ type: 'success', message });
    }
    
    showError(message) {
        this.showAlert({ type: 'error', message });
    }
    
    showLoading(message = 'Carregando...') {
        const loading = document.createElement('div');
        loading.id = 'global-loading';
        loading.innerHTML = `
            <div class="loading-overlay">
                <div class="spinner"></div>
                <span class="loading-text">${message}</span>
            </div>
        `;
        document.body.appendChild(loading);
    }
    
    hideLoading() {
        const loading = document.getElementById('global-loading');
        if (loading) {
            loading.remove();
        }
    }
    
    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    getAlertIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
    
    updateConnectionStatus(connected, message = '') {
        const indicator = document.querySelector('.real-time-indicator');
        if (indicator) {
            if (connected) {
                indicator.style.background = 'var(--gradient-success)';
                indicator.innerHTML = `
                    <i class="fas fa-circle" style="color: #10b981;"></i>
                    <span>Tempo Real</span>
                `;
            } else {
                indicator.style.background = 'var(--gradient-error)';
                const statusText = message || 'Desconectado';
                indicator.innerHTML = `
                    <i class="fas fa-circle" style="color: #ef4444;"></i>
                    <span>${statusText}</span>
                `;
            }
        }
        
        // Update real-time table connection status
        if (window.realTimeTable) {
            window.realTimeTable.updateConnectionStatus(connected);
        }
    }
    
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.socket.connected) {
                this.socket.emit('ping', Date.now());
            }
        }, 30000); // Send ping every 30 seconds
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    updateLatency(latency) {
        const latencyElement = document.getElementById('connectionLatency');
        if (latencyElement) {
            latencyElement.textContent = `${latency}ms`;
            latencyElement.className = latency < 100 ? 'good' : latency < 300 ? 'fair' : 'poor';
        }
    }
    
    refreshAllData() {
        this.loadInitialData();
        this.showSuccess('Dados atualizados!');
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    handleResize() {
        // Update charts on resize
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }
    
    initializeCharts() {
        // Placeholder for chart initialization
        // Charts will be implemented in a separate update
    }
    
    updateCharts() {
        // Placeholder for chart updates
        // Charts will be implemented in a separate update
    }
    
    trackEvent(eventName, data) {
        // Analytics tracking placeholder
        console.log(`Event: ${eventName}`, data);
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new FusioneDashboard();
    window.dashboard = dashboard; // Make it globally accessible
    
    // Initialize real-time table
    if (typeof RealTimeTable !== 'undefined') {
        window.realTimeTable = new RealTimeTable('realTimeTable');
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FusioneDashboard;
}