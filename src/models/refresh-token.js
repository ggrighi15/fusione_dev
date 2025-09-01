/**
 * Modelo de Refresh Token para MariaDB
 * Gerencia operações CRUD de tokens de refresh no banco de dados
 */
class RefreshToken {
    constructor(databaseManager) {
        this.db = databaseManager;
    }

    /**
     * Criar um novo refresh token
     */
    async create(tokenData) {
        const { user_id, token, expires_at } = tokenData;
        
        const sql = `
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES (?, ?, ?)
        `;
        
        const result = await this.db.query(sql, [user_id, token, expires_at]);
        return { id: result.rows.insertId, ...tokenData };
    }

    /**
     * Buscar refresh token por token
     */
    async findByToken(token) {
        const sql = 'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()';
        const result = await this.db.query(sql, [token]);
        return result.rows[0] || null;
    }

    /**
     * Buscar todos os tokens de um usuário
     */
    async findByUserId(userId) {
        const sql = 'SELECT * FROM refresh_tokens WHERE user_id = ? AND expires_at > NOW()';
        const result = await this.db.query(sql, [userId]);
        return result.rows;
    }

    /**
     * Revogar um refresh token específico
     */
    async revokeToken(token) {
        const sql = 'DELETE FROM refresh_tokens WHERE token = ?';
        const result = await this.db.query(sql, [token]);
        return result.rows.affectedRows > 0;
    }

    /**
     * Revogar todos os tokens de um usuário
     */
    async revokeAllUserTokens(userId) {
        const sql = 'DELETE FROM refresh_tokens WHERE user_id = ?';
        const result = await this.db.query(sql, [userId]);
        return result.rows.affectedRows;
    }

    /**
     * Limpar tokens expirados
     */
    async cleanExpiredTokens() {
        const sql = 'DELETE FROM refresh_tokens WHERE expires_at <= NOW()';
        const result = await this.db.query(sql);
        return result.rows.affectedRows;
    }

    /**
     * Verificar se um token existe e é válido
     */
    async isValidToken(token) {
        const sql = 'SELECT COUNT(*) as count FROM refresh_tokens WHERE token = ? AND expires_at > NOW()';
        const result = await this.db.query(sql, [token]);
        return result.rows[0].count > 0;
    }

    /**
     * Atualizar data de expiração de um token
     */
    async updateExpiration(token, newExpiresAt) {
        const sql = 'UPDATE refresh_tokens SET expires_at = ? WHERE token = ?';
        const result = await this.db.query(sql, [newExpiresAt, token]);
        return result.rows.affectedRows > 0;
    }

    /**
     * Obter estatísticas dos tokens
     */
    async getStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_tokens,
                COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_tokens,
                COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_tokens,
                COUNT(DISTINCT user_id) as unique_users
            FROM refresh_tokens
        `;
        
        const result = await this.db.query(sql);
        return result.rows[0];
    }

    /**
     * Listar tokens com informações do usuário
     */
    async listWithUserInfo(options = {}) {
        const { page = 1, limit = 10, userId = null } = options;
        const offset = (page - 1) * limit;
        
        let whereClause = '';
        const params = [];
        
        if (userId) {
            whereClause = 'WHERE rt.user_id = ?';
            params.push(userId);
        }
        
        const sql = `
            SELECT 
                rt.id,
                rt.token,
                rt.expires_at,
                rt.created_at,
                u.username,
                u.email,
                CASE WHEN rt.expires_at > NOW() THEN 'active' ELSE 'expired' END as status
            FROM refresh_tokens rt
            JOIN users u ON rt.user_id = u.id
            ${whereClause}
            ORDER BY rt.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        params.push(limit, offset);
        const result = await this.db.query(sql, params);
        
        // Contar total
        const countSql = `
            SELECT COUNT(*) as total 
            FROM refresh_tokens rt
            JOIN users u ON rt.user_id = u.id
            ${whereClause}
        `;
        const countParams = userId ? [userId] : [];
        const countResult = await this.db.query(countSql, countParams);
        
        return {
            tokens: result.rows,
            total: countResult.rows[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult.rows[0].total / limit)
        };
    }
}

export { RefreshToken };