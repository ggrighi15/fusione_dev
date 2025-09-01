/**
 * Real-Time Monitoring Table Component
 * Componente de tabela para acompanhamento em tempo real dos módulos
 */
class RealTimeTable {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            updateInterval: options.updateInterval || 5000, // 5 segundos
            maxHistoryPoints: options.maxHistoryPoints || 50,
            showMiniCharts: options.showMiniCharts !== false,
            enableFilters: options.enableFilters !== false,
            enableExport: options.enableExport !== false,
            ...options
        };
        
        this.modules = [];
        this.filteredModules = [];
        this.sortConfig = { field: 'name', direction: 'asc' };
        this.filters = {
            status: 'all',
            search: '',
            type: 'all'
        };
        
        this.updateTimer = null;
        this.socket = null;
        
        this.init();
    }
    
    init() {
        this.createTableStructure();
        this.setupSocketConnection();
        this.startRealTimeUpdates();
        this.loadInitialData();
    }
    
    createTableStructure() {
        this.container.innerHTML = `
            <div class="real-time-table-container">
                <!-- Header com controles -->
                <div class="table-header">
                    <div class="table-title">
                        <h2>
                            <i class="fas fa-table"></i>
                            Monitoramento em Tempo Real
                            <span class="real-time-indicator">
                                <i class="fas fa-circle"></i>
                                Ao Vivo
                            </span>
                        </h2>
                    </div>
                    
                    <div class="table-controls">
                        <!-- Filtros -->
                        <div class="filter-group">
                            <select id="statusFilter" class="filter-select">
                                <option value="all">Todos os Status</option>
                                <option value="online">Online</option>
                                <option value="offline">Offline</option>
                                <option value="warning">Aviso</option>
                                <option value="maintenance">Manutenção</option>
                            </select>
                            
                            <select id="typeFilter" class="filter-select">
                                <option value="all">Todos os Tipos</option>
                                <option value="ai">AI</option>
                                <option value="contencioso">Contencioso</option>
                                <option value="data">Análise de Dados</option>
                                <option value="auth">Autenticação</option>
                                <option value="reports">Relatórios</option>
                                <option value="notification">Notificações</option>
                            </select>
                            
                            <div class="search-box">
                                <i class="fas fa-search"></i>
                                <input type="text" id="searchInput" placeholder="Buscar módulos...">
                            </div>
                        </div>
                        
                        <!-- Ações -->
                        <div class="action-group">
                            <button class="btn btn-secondary" onclick="realTimeTable.refreshData()">
                                <i class="fas fa-sync-alt"></i>
                                Atualizar
                            </button>
                            <button class="btn btn-secondary" onclick="realTimeTable.exportData()">
                                <i class="fas fa-download"></i>
                                Exportar
                            </button>
                            <button class="btn btn-secondary" onclick="realTimeTable.toggleAutoUpdate()">
                                <i class="fas fa-pause" id="autoUpdateIcon"></i>
                                <span id="autoUpdateText">Pausar</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Estatísticas rápidas -->
                <div class="quick-stats">
                    <div class="stat-item">
                        <div class="stat-icon online">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value" id="onlineCount">0</span>
                            <span class="stat-label">Online</span>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon offline">
                            <i class="fas fa-times-circle"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value" id="offlineCount">0</span>
                            <span class="stat-label">Offline</span>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon warning">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value" id="warningCount">0</span>
                            <span class="stat-label">Avisos</span>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value" id="avgResponseTime">0ms</span>
                            <span class="stat-label">Tempo Médio</span>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <span class="stat-value" id="totalRequests">0</span>
                            <span class="stat-label">Requisições</span>
                        </div>
                    </div>
                </div>
                
                <!-- Tabela principal -->
                <div class="table-wrapper">
                    <table class="real-time-table" id="modulesTable">
                        <thead>
                            <tr>
                                <th class="sortable" data-field="name">
                                    <i class="fas fa-cube"></i>
                                    Módulo
                                    <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th class="sortable" data-field="status">
                                    <i class="fas fa-heartbeat"></i>
                                    Status
                                    <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th class="sortable" data-field="responseTime">
                                    <i class="fas fa-clock"></i>
                                    Resposta
                                    <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th class="sortable" data-field="requests">
                                    <i class="fas fa-exchange-alt"></i>
                                    Requisições
                                    <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th class="sortable" data-field="errors">
                                    <i class="fas fa-exclamation-circle"></i>
                                    Erros
                                    <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th class="sortable" data-field="uptime">
                                    <i class="fas fa-chart-line"></i>
                                    Uptime
                                    <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th class="sortable" data-field="cpu">
                                    <i class="fas fa-microchip"></i>
                                    CPU
                                    <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th class="sortable" data-field="memory">
                                    <i class="fas fa-memory"></i>
                                    Memória
                                    <i class="fas fa-sort sort-icon"></i>
                                </th>
                                <th>
                                    <i class="fas fa-chart-area"></i>
                                    Tendência
                                </th>
                                <th>
                                    <i class="fas fa-cogs"></i>
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            <!-- Dados serão inseridos aqui -->
                        </tbody>
                    </table>
                </div>
                
                <!-- Loading overlay -->
                <div class="loading-overlay" id="loadingOverlay">
                    <div class="loading-content">
                        <div class="spinner"></div>
                        <p>Carregando dados em tempo real...</p>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Filtros
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('typeFilter').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });
        
        // Ordenação
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const field = header.dataset.field;
                this.sortTable(field);
            });
        });
    }
    
    setupSocketConnection() {
        if (typeof io !== 'undefined') {
            this.socket = io();
            
            this.socket.on('module-update', (data) => {
                this.handleModuleUpdate(data);
            });
            
            this.socket.on('system-metrics', (data) => {
                this.updateQuickStats(data);
            });
            
            this.socket.on('connect', () => {
                console.log('Conectado ao servidor em tempo real');
                this.updateConnectionStatus(true);
            });
            
            this.socket.on('disconnect', () => {
                console.log('Desconectado do servidor');
                this.updateConnectionStatus(false);
            });
        }
    }
    
    async loadInitialData() {
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/modules/status');
            const data = await response.json();
            
            this.modules = data.modules || [];
            this.applyFilters();
            this.updateQuickStats(data.metrics || {});
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showError('Erro ao carregar dados dos módulos');
        } finally {
            this.showLoading(false);
        }
    }
    
    handleModuleUpdate(data) {
        const moduleIndex = this.modules.findIndex(m => m.id === data.id);
        
        if (moduleIndex !== -1) {
            // Atualizar módulo existente
            this.modules[moduleIndex] = { ...this.modules[moduleIndex], ...data };
        } else {
            // Adicionar novo módulo
            this.modules.push(data);
        }
        
        this.applyFilters();
        this.highlightUpdatedRow(data.id);
    }
    
    applyFilters() {
        this.filteredModules = this.modules.filter(module => {
            // Filtro por status
            if (this.filters.status !== 'all' && module.status !== this.filters.status) {
                return false;
            }
            
            // Filtro por tipo
            if (this.filters.type !== 'all' && module.type !== this.filters.type) {
                return false;
            }
            
            // Filtro por busca
            if (this.filters.search && !module.name.toLowerCase().includes(this.filters.search)) {
                return false;
            }
            
            return true;
        });
        
        this.sortTable(this.sortConfig.field, this.sortConfig.direction);
        this.renderTable();
    }
    
    sortTable(field, direction = null) {
        if (direction === null) {
            // Toggle direction se for o mesmo campo
            if (this.sortConfig.field === field) {
                direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                direction = 'asc';
            }
        }
        
        this.sortConfig = { field, direction };
        
        this.filteredModules.sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            
            // Tratamento especial para diferentes tipos de dados
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.updateSortIcons();
        this.renderTable();
    }
    
    updateSortIcons() {
        // Reset todos os ícones
        document.querySelectorAll('.sort-icon').forEach(icon => {
            icon.className = 'fas fa-sort sort-icon';
        });
        
        // Atualizar ícone ativo
        const activeHeader = document.querySelector(`[data-field="${this.sortConfig.field}"] .sort-icon`);
        if (activeHeader) {
            activeHeader.className = `fas fa-sort-${this.sortConfig.direction === 'asc' ? 'up' : 'down'} sort-icon active`;
        }
    }
    
    renderTable() {
        const tbody = document.getElementById('tableBody');
        
        if (this.filteredModules.length === 0) {
            tbody.innerHTML = `
                <tr class="no-data">
                    <td colspan="10">
                        <div class="no-data-content">
                            <i class="fas fa-search"></i>
                            <h3>Nenhum módulo encontrado</h3>
                            <p>Ajuste os filtros ou verifique se os módulos estão configurados.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        const rows = this.filteredModules.map(module => this.createTableRow(module)).join('');
        tbody.innerHTML = rows;
    }
    
    createTableRow(module) {
        const statusClass = this.getStatusClass(module.status);
        const statusIcon = this.getStatusIcon(module.status);
        const moduleIcon = this.getModuleIcon(module.type);
        
        return `
            <tr class="module-row" data-module-id="${module.id}">
                <!-- Módulo -->
                <td class="module-cell">
                    <div class="module-info">
                        <div class="module-icon ${module.type}">
                            <i class="${moduleIcon}"></i>
                        </div>
                        <div class="module-details">
                            <div class="module-name">${module.name}</div>
                            <div class="module-description">${module.description || ''}</div>
                        </div>
                    </div>
                </td>
                
                <!-- Status -->
                <td class="status-cell">
                    <div class="status-indicator ${statusClass}">
                        <i class="${statusIcon}"></i>
                        <span>${this.formatStatus(module.status)}</span>
                        <div class="status-pulse"></div>
                    </div>
                </td>
                
                <!-- Tempo de Resposta -->
                <td class="metric-cell">
                    <div class="metric-value">
                        <span class="value">${module.responseTime || 0}</span>
                        <span class="unit">ms</span>
                    </div>
                    <div class="metric-trend ${this.getTrendClass(module.responseTimeTrend)}">
                        <i class="fas fa-arrow-${this.getTrendIcon(module.responseTimeTrend)}"></i>
                    </div>
                </td>
                
                <!-- Requisições -->
                <td class="metric-cell">
                    <div class="metric-value">
                        <span class="value">${this.formatNumber(module.requests || 0)}</span>
                    </div>
                    <div class="metric-trend ${this.getTrendClass(module.requestsTrend)}">
                        <i class="fas fa-arrow-${this.getTrendIcon(module.requestsTrend)}"></i>
                    </div>
                </td>
                
                <!-- Erros -->
                <td class="metric-cell">
                    <div class="metric-value ${module.errors > 0 ? 'error' : ''}">
                        <span class="value">${module.errors || 0}</span>
                    </div>
                    <div class="error-rate">
                        ${module.errorRate ? `${module.errorRate}%` : '0%'}
                    </div>
                </td>
                
                <!-- Uptime -->
                <td class="metric-cell">
                    <div class="uptime-bar">
                        <div class="uptime-fill" style="width: ${module.uptime || 0}%"></div>
                        <span class="uptime-text">${module.uptime || 0}%</span>
                    </div>
                </td>
                
                <!-- CPU -->
                <td class="metric-cell">
                    <div class="resource-bar">
                        <div class="resource-fill cpu" style="width: ${module.cpu || 0}%"></div>
                        <span class="resource-text">${module.cpu || 0}%</span>
                    </div>
                </td>
                
                <!-- Memória -->
                <td class="metric-cell">
                    <div class="resource-bar">
                        <div class="resource-fill memory" style="width: ${module.memory || 0}%"></div>
                        <span class="resource-text">${module.memory || 0}%</span>
                    </div>
                </td>
                
                <!-- Tendência (Mini Chart) -->
                <td class="chart-cell">
                    <div class="mini-chart" id="chart-${module.id}">
                        ${this.createMiniChart(module.history || [])}
                    </div>
                </td>
                
                <!-- Ações -->
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button class="action-btn primary" onclick="realTimeTable.openModule('${module.id}')" title="Abrir Módulo">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="action-btn secondary" onclick="realTimeTable.restartModule('${module.id}')" title="Reiniciar">
                            <i class="fas fa-redo"></i>
                        </button>
                        <button class="action-btn secondary" onclick="realTimeTable.viewLogs('${module.id}')" title="Ver Logs">
                            <i class="fas fa-file-alt"></i>
                        </button>
                        <button class="action-btn secondary" onclick="realTimeTable.moduleSettings('${module.id}')" title="Configurações">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    createMiniChart(history) {
        if (!history || history.length === 0) {
            return '<div class="no-chart">Sem dados</div>';
        }
        
        const maxValue = Math.max(...history);
        const points = history.map((value, index) => {
            const x = (index / (history.length - 1)) * 100;
            const y = 100 - ((value / maxValue) * 80); // 80% da altura
            return `${x},${y}`;
        }).join(' ');
        
        return `
            <svg class="mini-chart-svg" viewBox="0 0 100 100">
                <polyline points="${points}" fill="none" stroke="#7c3aed" stroke-width="2"/>
                <circle cx="${100}" cy="${100 - ((history[history.length - 1] / maxValue) * 80)}" r="2" fill="#7c3aed"/>
            </svg>
        `;
    }
    
    updateQuickStats(metrics) {
        const stats = this.calculateStats();
        
        document.getElementById('onlineCount').textContent = stats.online;
        document.getElementById('offlineCount').textContent = stats.offline;
        document.getElementById('warningCount').textContent = stats.warning;
        document.getElementById('avgResponseTime').textContent = stats.avgResponseTime + 'ms';
        document.getElementById('totalRequests').textContent = this.formatNumber(stats.totalRequests);
    }
    
    calculateStats() {
        const stats = {
            online: 0,
            offline: 0,
            warning: 0,
            maintenance: 0,
            totalRequests: 0,
            totalResponseTime: 0,
            activeModules: 0
        };
        
        this.modules.forEach(module => {
            stats[module.status] = (stats[module.status] || 0) + 1;
            stats.totalRequests += module.requests || 0;
            stats.totalResponseTime += module.responseTime || 0;
            if (module.status === 'online') stats.activeModules++;
        });
        
        stats.avgResponseTime = this.modules.length > 0 
            ? Math.round(stats.totalResponseTime / this.modules.length) 
            : 0;
            
        return stats;
    }
    
    highlightUpdatedRow(moduleId) {
        const row = document.querySelector(`[data-module-id="${moduleId}"]`);
        if (row) {
            row.classList.add('updated');
            setTimeout(() => {
                row.classList.remove('updated');
            }, 2000);
        }
    }
    
    // Utility methods
    getStatusClass(status) {
        switch (status?.toLowerCase()) {
            case 'online': return 'status-online';
            case 'offline': return 'status-offline';
            case 'warning': return 'status-warning';
            case 'maintenance': return 'status-maintenance';
            default: return 'status-unknown';
        }
    }
    
    getStatusIcon(status) {
        switch (status?.toLowerCase()) {
            case 'online': return 'fas fa-check-circle';
            case 'offline': return 'fas fa-times-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            case 'maintenance': return 'fas fa-tools';
            default: return 'fas fa-question-circle';
        }
    }
    
    getModuleIcon(type) {
        switch (type?.toLowerCase()) {
            case 'ai': return 'fas fa-brain';
            case 'contencioso': return 'fas fa-gavel';
            case 'data': return 'fas fa-chart-bar';
            case 'auth': return 'fas fa-lock';
            case 'reports': return 'fas fa-file-alt';
            case 'notification': return 'fas fa-bell';
            default: return 'fas fa-cube';
        }
    }
    
    formatStatus(status) {
        const statusMap = {
            'online': 'Online',
            'offline': 'Offline',
            'warning': 'Aviso',
            'maintenance': 'Manutenção'
        };
        return statusMap[status?.toLowerCase()] || status;
    }
    
    getTrendClass(trend) {
        if (trend > 0) return 'trend-up';
        if (trend < 0) return 'trend-down';
        return 'trend-stable';
    }
    
    getTrendIcon(trend) {
        if (trend > 0) return 'up';
        if (trend < 0) return 'down';
        return 'right';
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }
    
    showError(message) {
        console.error(message);
        // Implementar notificação de erro
    }
    
    updateConnectionStatus(connected) {
        const indicator = document.querySelector('.real-time-indicator');
        if (indicator) {
            indicator.className = `real-time-indicator ${connected ? 'connected' : 'disconnected'}`;
            indicator.innerHTML = `
                <i class="fas fa-circle"></i>
                ${connected ? 'Ao Vivo' : 'Desconectado'}
            `;
        }
    }
    
    // Public methods
    refreshData() {
        this.loadInitialData();
    }
    
    exportData() {
        const data = this.filteredModules.map(module => ({
            nome: module.name,
            status: this.formatStatus(module.status),
            tipo: module.type,
            resposta: module.responseTime + 'ms',
            requisicoes: module.requests,
            erros: module.errors,
            uptime: module.uptime + '%',
            cpu: module.cpu + '%',
            memoria: module.memory + '%'
        }));
        
        const csv = this.convertToCSV(data);
        this.downloadCSV(csv, 'modulos-status.csv');
    }
    
    convertToCSV(data) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(',')).join('\n');
        return headers + '\n' + rows;
    }
    
    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    toggleAutoUpdate() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
            document.getElementById('autoUpdateIcon').className = 'fas fa-play';
            document.getElementById('autoUpdateText').textContent = 'Retomar';
        } else {
            this.startRealTimeUpdates();
            document.getElementById('autoUpdateIcon').className = 'fas fa-pause';
            document.getElementById('autoUpdateText').textContent = 'Pausar';
        }
    }
    
    startRealTimeUpdates() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        this.updateTimer = setInterval(() => {
            if (!document.hidden) {
                this.loadInitialData();
            }
        }, this.options.updateInterval);
    }
    
    // Action methods
    openModule(moduleId) {
        const module = this.modules.find(m => m.id === moduleId);
        if (module) {
            window.open(`/modules/${module.type}-module.html`, '_blank');
        }
    }
    
    restartModule(moduleId) {
        const module = this.modules.find(m => m.id === moduleId);
        if (module && confirm(`Tem certeza que deseja reiniciar o módulo ${module.name}?`)) {
            // Implementar restart via API
            fetch(`/api/modules/${moduleId}/restart`, { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    console.log('Módulo reiniciado:', data);
                    this.refreshData();
                })
                .catch(error => {
                    console.error('Erro ao reiniciar módulo:', error);
                });
        }
    }
    
    viewLogs(moduleId) {
        window.open(`/api/modules/${moduleId}/logs`, '_blank');
    }
    
    moduleSettings(moduleId) {
        const module = this.modules.find(m => m.id === moduleId);
        if (module) {
            alert(`Configurações do módulo ${module.name} serão implementadas`);
        }
    }
    
    destroy() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealTimeTable;
} else {
    window.RealTimeTable = RealTimeTable;
}