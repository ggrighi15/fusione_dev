/**
 * Modelo de Dados do Usuário para MariaDB
 * Gerencia dados personalizados dos usuários
 */
class UserData {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.tableName = 'user_data';
    }

    /**
     * Inicializar tabela se não existir
     */
    async initializeTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                data_type VARCHAR(100) NOT NULL,
                data_key VARCHAR(255) NOT NULL,
                data_value JSON,
                metadata JSON,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_data_type (data_type),
                INDEX idx_data_key (data_key),
                UNIQUE KEY unique_user_data (user_id, data_type, data_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await this.db.query(sql);
    }

    /**
     * Criar novo registro de dados
     */
    async create(userData) {
        const { user_id, data_type, data_key, data_value, metadata = {} } = userData;
        
        const sql = `
            INSERT INTO ${this.tableName} (user_id, data_type, data_key, data_value, metadata)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            data_value = VALUES(data_value),
            metadata = VALUES(metadata),
            updated_at = CURRENT_TIMESTAMP
        `;
        
        const result = await this.db.query(sql, [
            user_id, 
            data_type, 
            data_key, 
            JSON.stringify(data_value), 
            JSON.stringify(metadata)
        ]);
        
        return { id: result.rows.insertId, ...userData };
    }

    /**
     * Buscar dados por ID
     */
    async findById(id) {
        const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND is_active = true`;
        const result = await this.db.query(sql, [id]);
        
        if (result.rows[0]) {
            const row = result.rows[0];
            row.data_value = JSON.parse(row.data_value);
            row.metadata = JSON.parse(row.metadata);
            return row;
        }
        
        return null;
    }

    /**
     * Buscar dados por usuário
     */
    async findByUserId(userId, dataType = null) {
        let sql = `SELECT * FROM ${this.tableName} WHERE user_id = ? AND is_active = true`;
        const params = [userId];
        
        if (dataType) {
            sql += ' AND data_type = ?';
            params.push(dataType);
        }
        
        sql += ' ORDER BY created_at DESC';
        
        const result = await this.db.query(sql, params);
        
        return result.rows.map(row => {
            row.data_value = JSON.parse(row.data_value);
            row.metadata = JSON.parse(row.metadata);
            return row;
        });
    }

    /**
     * Buscar dados por chave específica
     */
    async findByKey(userId, dataType, dataKey) {
        const sql = `
            SELECT * FROM ${this.tableName} 
            WHERE user_id = ? AND data_type = ? AND data_key = ? AND is_active = true
        `;
        
        const result = await this.db.query(sql, [userId, dataType, dataKey]);
        
        if (result.rows[0]) {
            const row = result.rows[0];
            row.data_value = JSON.parse(row.data_value);
            row.metadata = JSON.parse(row.metadata);
            return row;
        }
        
        return null;
    }

    /**
     * Atualizar dados
     */
    async update(id, updateData) {
        const { data_value, metadata } = updateData;
        
        const sql = `
            UPDATE ${this.tableName} 
            SET data_value = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        
        await this.db.query(sql, [
            JSON.stringify(data_value),
            JSON.stringify(metadata),
            id
        ]);
        
        return this.findById(id);
    }

    /**
     * Deletar dados (soft delete)
     */
    async delete(id) {
        const sql = `UPDATE ${this.tableName} SET is_active = false WHERE id = ?`;
        await this.db.query(sql, [id]);
    }

    /**
     * Deletar dados por chave
     */
    async deleteByKey(userId, dataType, dataKey) {
        const sql = `
            UPDATE ${this.tableName} 
            SET is_active = false 
            WHERE user_id = ? AND data_type = ? AND data_key = ?
        `;
        
        await this.db.query(sql, [userId, dataType, dataKey]);
    }

    /**
     * Listar dados com paginação
     */
    async list(options = {}) {
        const { page = 1, limit = 10, userId = null, dataType = null, search = '' } = options;
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE is_active = true';
        const params = [];
        
        if (userId) {
            whereClause += ' AND user_id = ?';
            params.push(userId);
        }
        
        if (dataType) {
            whereClause += ' AND data_type = ?';
            params.push(dataType);
        }
        
        if (search) {
            whereClause += ' AND (data_key LIKE ? OR JSON_EXTRACT(data_value, "$") LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }
        
        const sql = `
            SELECT * FROM ${this.tableName}
            ${whereClause}
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        `;
        
        params.push(limit, offset);
        const result = await this.db.query(sql, params);
        
        // Contar total
        const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
        const countParams = params.slice(0, -2); // Remove limit e offset
        const countResult = await this.db.query(countSql, countParams);
        
        const data = result.rows.map(row => {
            row.data_value = JSON.parse(row.data_value);
            row.metadata = JSON.parse(row.metadata);
            return row;
        });
        
        return {
            data,
            total: countResult.rows[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult.rows[0].total / limit)
        };
    }

    /**
     * Obter estatísticas
     */
    async getStats(userId = null) {
        let whereClause = 'WHERE is_active = true';
        const params = [];
        
        if (userId) {
            whereClause += ' AND user_id = ?';
            params.push(userId);
        }
        
        const sql = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT data_type) as unique_types,
                COUNT(DISTINCT data_key) as unique_keys
            FROM ${this.tableName}
            ${whereClause}
        `;
        
        const result = await this.db.query(sql, params);
        return result.rows[0];
    }

    /**
     * Backup de dados do usuário
     */
    async backup(userId) {
        const sql = `
            SELECT data_type, data_key, data_value, metadata, created_at, updated_at
            FROM ${this.tableName}
            WHERE user_id = ? AND is_active = true
            ORDER BY data_type, data_key
        `;
        
        const result = await this.db.query(sql, [userId]);
        
        return result.rows.map(row => {
            row.data_value = JSON.parse(row.data_value);
            row.metadata = JSON.parse(row.metadata);
            return row;
        });
    }

    /**
     * Restaurar dados do backup
     */
    async restore(userId, backupData) {
        const results = [];
        
        for (const item of backupData) {
            try {
                const result = await this.create({
                    user_id: userId,
                    data_type: item.data_type,
                    data_key: item.data_key,
                    data_value: item.data_value,
                    metadata: item.metadata
                });
                results.push(result);
            } catch (error) {
                console.error('Erro ao restaurar item:', error);
            }
        }
        
        return results;
    }
}

export default UserData;