/**
 * Modelo de Usuário para MariaDB
 * Gerencia operações CRUD de usuários no banco de dados
 */
class User {
    constructor(databaseManager) {
        this.db = databaseManager;
    }

    /**
     * Criar um novo usuário
     */
    async create(userData) {
        const { username, email, password_hash, first_name, last_name, is_admin = false } = userData;
        
        const sql = `
            INSERT INTO users (username, email, password_hash, first_name, last_name, is_admin)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const result = await this.db.query(sql, [username, email, password_hash, first_name, last_name, is_admin]);
        return { id: result.rows.insertId, ...userData };
    }

    /**
     * Buscar usuário por ID
     */
    async findById(id) {
        const sql = 'SELECT * FROM users WHERE id = ? AND is_active = true';
        const result = await this.db.query(sql, [id]);
        return result.rows[0] || null;
    }

    /**
     * Buscar usuário por email
     */
    async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = ? AND is_active = true';
        const result = await this.db.query(sql, [email]);
        return result.rows[0] || null;
    }

    /**
     * Buscar usuário por username
     */
    async findByUsername(username) {
        const sql = 'SELECT * FROM users WHERE username = ? AND is_active = true';
        const result = await this.db.query(sql, [username]);
        return result.rows[0] || null;
    }

    /**
     * Atualizar usuário
     */
    async update(id, updateData) {
        const fields = [];
        const values = [];
        
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(updateData[key]);
            }
        });
        
        if (fields.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }
        
        values.push(id);
        const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        await this.db.query(sql, values);
        return this.findById(id);
    }

    /**
     * Atualizar último login
     */
    async updateLastLogin(id) {
        const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
        await this.db.query(sql, [id]);
    }

    /**
     * Desativar usuário (soft delete)
     */
    async deactivate(id) {
        const sql = 'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await this.db.query(sql, [id]);
    }

    /**
     * Listar usuários com paginação
     */
    async list(options = {}) {
        const { page = 1, limit = 10, search = '', includeInactive = false } = options;
        const offset = (page - 1) * limit;
        
        let whereClause = includeInactive ? '' : 'WHERE is_active = true';
        const params = [];
        
        if (search) {
            whereClause = includeInactive 
                ? 'WHERE (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)'
                : 'WHERE is_active = true AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }
        
        const sql = `
            SELECT id, username, email, first_name, last_name, is_active, is_admin, last_login, created_at, updated_at
            FROM users 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        params.push(limit, offset);
        const result = await this.db.query(sql, params);
        
        // Contar total
        const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
        const countParams = search ? [searchPattern, searchPattern, searchPattern, searchPattern] : [];
        const countResult = await this.db.query(countSql, countParams);
        
        return {
            users: result.rows,
            total: countResult.rows[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult.rows[0].total / limit)
        };
    }

    /**
     * Verificar se email já existe
     */
    async emailExists(email, excludeId = null) {
        let sql = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
        const params = [email];
        
        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }
        
        const result = await this.db.query(sql, params);
        return result.rows[0].count > 0;
    }

    /**
     * Verificar se username já existe
     */
    async usernameExists(username, excludeId = null) {
        let sql = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
        const params = [username];
        
        if (excludeId) {
            sql += ' AND id != ?';
            params.push(excludeId);
        }
        
        const result = await this.db.query(sql, params);
        return result.rows[0].count > 0;
    }
}

export { User };