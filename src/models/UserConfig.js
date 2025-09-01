/**
 * Modelo de Configurações do Usuário para MariaDB
 * Gerencia configurações personalizadas dos usuários
 */
class UserConfig {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.tableName = 'user_configs';
    }

    /**
     * Inicializar tabela se não existir
     */
    async initializeTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                config_key VARCHAR(255) NOT NULL,
                config_value JSON NOT NULL,
                config_type VARCHAR(50) DEFAULT 'user',
                is_encrypted BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_config_key (config_key),
                INDEX idx_config_type (config_type),
                UNIQUE KEY unique_user_config (user_id, config_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await this.db.query(sql);
    }

    /**
     * Criar ou atualizar configuração
     */
    async set(userId, configKey, configValue, options = {}) {
        const { configType = 'user', isEncrypted = false } = options;
        
        const sql = `
            INSERT INTO ${this.tableName} (user_id, config_key, config_value, config_type, is_encrypted)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            config_value = VALUES(config_value),
            config_type = VALUES(config_type),
            is_encrypted = VALUES(is_encrypted),
            updated_at = CURRENT_TIMESTAMP
        `;
        
        const result = await this.db.query(sql, [
            userId,
            configKey,
            JSON.stringify(configValue),
            configType,
            isEncrypted
        ]);
        
        return { id: result.rows.insertId, user_id: userId, config_key: configKey, config_value: configValue };
    }

    /**
     * Obter configuração específica
     */
    async get(userId, configKey, defaultValue = null) {
        const sql = `
            SELECT config_value, is_encrypted FROM ${this.tableName}
            WHERE user_id = ? AND config_key = ? AND is_active = true
        `;
        
        const result = await this.db.query(sql, [userId, configKey]);
        
        if (result.rows[0]) {
            let value = JSON.parse(result.rows[0].config_value);
            
            // TODO: Implementar descriptografia se necessário
            if (result.rows[0].is_encrypted) {
                // value = decrypt(value);
            }
            
            return value;
        }
        
        return defaultValue;
    }

    /**
     * Obter todas as configurações do usuário
     */
    async getAll(userId, configType = null) {
        let sql = `
            SELECT config_key, config_value, config_type, is_encrypted, created_at, updated_at
            FROM ${this.tableName}
            WHERE user_id = ? AND is_active = true
        `;
        const params = [userId];
        
        if (configType) {
            sql += ' AND config_type = ?';
            params.push(configType);
        }
        
        sql += ' ORDER BY config_key';
        
        const result = await this.db.query(sql, params);
        
        const configs = {};
        result.rows.forEach(row => {
            let value = JSON.parse(row.config_value);
            
            // TODO: Implementar descriptografia se necessário
            if (row.is_encrypted) {
                // value = decrypt(value);
            }
            
            configs[row.config_key] = {
                value,
                type: row.config_type,
                encrypted: row.is_encrypted,
                created_at: row.created_at,
                updated_at: row.updated_at
            };
        });
        
        return configs;
    }

    /**
     * Verificar se configuração existe
     */
    async exists(userId, configKey) {
        const sql = `
            SELECT COUNT(*) as count FROM ${this.tableName}
            WHERE user_id = ? AND config_key = ? AND is_active = true
        `;
        
        const result = await this.db.query(sql, [userId, configKey]);
        return result.rows[0].count > 0;
    }

    /**
     * Deletar configuração
     */
    async delete(userId, configKey) {
        const sql = `
            UPDATE ${this.tableName}
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND config_key = ?
        `;
        
        await this.db.query(sql, [userId, configKey]);
    }

    /**
     * Deletar todas as configurações do usuário
     */
    async deleteAll(userId, configType = null) {
        let sql = `
            UPDATE ${this.tableName}
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `;
        const params = [userId];
        
        if (configType) {
            sql += ' AND config_type = ?';
            params.push(configType);
        }
        
        await this.db.query(sql, params);
    }

    /**
     * Obter configurações padrão do sistema
     */
    async getDefaults() {
        return {
            theme: 'light',
            language: 'pt-BR',
            timezone: 'America/Sao_Paulo',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            notifications: {
                email: true,
                push: true,
                sms: false
            },
            privacy: {
                profileVisible: true,
                activityVisible: false,
                dataSharing: false
            },
            ui: {
                sidebarCollapsed: false,
                gridDensity: 'comfortable',
                showTooltips: true
            }
        };
    }

    /**
     * Aplicar configurações padrão para um usuário
     */
    async applyDefaults(userId) {
        const defaults = await this.getDefaults();
        const results = [];
        
        for (const [key, value] of Object.entries(defaults)) {
            try {
                const result = await this.set(userId, key, value, { configType: 'default' });
                results.push(result);
            } catch (error) {
                console.error(`Erro ao aplicar configuração padrão ${key}:`, error);
            }
        }
        
        return results;
    }

    /**
     * Backup das configurações do usuário
     */
    async backup(userId) {
        const sql = `
            SELECT config_key, config_value, config_type, is_encrypted, created_at, updated_at
            FROM ${this.tableName}
            WHERE user_id = ? AND is_active = true
            ORDER BY config_key
        `;
        
        const result = await this.db.query(sql, [userId]);
        
        return result.rows.map(row => ({
            config_key: row.config_key,
            config_value: JSON.parse(row.config_value),
            config_type: row.config_type,
            is_encrypted: row.is_encrypted,
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
    }

    /**
     * Restaurar configurações do backup
     */
    async restore(userId, backupData) {
        const results = [];
        
        for (const config of backupData) {
            try {
                const result = await this.set(
                    userId,
                    config.config_key,
                    config.config_value,
                    {
                        configType: config.config_type,
                        isEncrypted: config.is_encrypted
                    }
                );
                results.push(result);
            } catch (error) {
                console.error('Erro ao restaurar configuração:', error);
            }
        }
        
        return results;
    }

    /**
     * Obter estatísticas das configurações
     */
    async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_configs,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT config_key) as unique_keys,
                COUNT(CASE WHEN config_type = 'user' THEN 1 END) as user_configs,
                COUNT(CASE WHEN config_type = 'system' THEN 1 END) as system_configs,
                COUNT(CASE WHEN is_encrypted = true THEN 1 END) as encrypted_configs
            FROM ${this.tableName}
            WHERE is_active = true
        `;
        
        const result = await this.db.query(sql);
        return result.rows[0];
    }

    /**
     * Listar configurações com paginação
     */
    async list(options = {}) {
        const { page = 1, limit = 10, userId = null, configType = null, search = '' } = options;
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE is_active = true';
        const params = [];
        
        if (userId) {
            whereClause += ' AND user_id = ?';
            params.push(userId);
        }
        
        if (configType) {
            whereClause += ' AND config_type = ?';
            params.push(configType);
        }
        
        if (search) {
            whereClause += ' AND config_key LIKE ?';
            params.push(`%${search}%`);
        }
        
        const sql = `
            SELECT user_id, config_key, config_value, config_type, is_encrypted, created_at, updated_at
            FROM ${this.tableName}
            ${whereClause}
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        `;
        
        params.push(limit, offset);
        const result = await this.db.query(sql, params);
        
        // Contar total
        const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
        const countParams = params.slice(0, -2);
        const countResult = await this.db.query(countSql, countParams);
        
        const configs = result.rows.map(row => ({
            ...row,
            config_value: JSON.parse(row.config_value)
        }));
        
        return {
            configs,
            total: countResult.rows[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult.rows[0].total / limit)
        };
    }
}

export default UserConfig;