/**
 * Modelo de Templates de Dados para MariaDB
 * Gerencia templates e estruturas de dados reutilizáveis
 */
class DataTemplate {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.tableName = 'data_templates';
    }

    /**
     * Inicializar tabela se não existir
     */
    async initializeTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                template_type VARCHAR(100) NOT NULL,
                template_schema JSON NOT NULL,
                default_values JSON,
                validation_rules JSON,
                created_by INT,
                is_public BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                version VARCHAR(20) DEFAULT '1.0.0',
                tags JSON,
                usage_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_template_type (template_type),
                INDEX idx_created_by (created_by),
                INDEX idx_is_public (is_public),
                INDEX idx_name (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
        
        await this.db.query(sql);
    }

    /**
     * Criar novo template
     */
    async create(templateData) {
        const {
            name,
            description = '',
            template_type,
            template_schema,
            default_values = {},
            validation_rules = {},
            created_by,
            is_public = false,
            version = '1.0.0',
            tags = []
        } = templateData;
        
        const sql = `
            INSERT INTO ${this.tableName} (
                name, description, template_type, template_schema, default_values,
                validation_rules, created_by, is_public, version, tags
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await this.db.query(sql, [
            name,
            description,
            template_type,
            JSON.stringify(template_schema),
            JSON.stringify(default_values),
            JSON.stringify(validation_rules),
            created_by,
            is_public,
            version,
            JSON.stringify(tags)
        ]);
        
        return { id: result.rows.insertId, ...templateData };
    }

    /**
     * Buscar template por ID
     */
    async findById(id) {
        const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND is_active = true`;
        const result = await this.db.query(sql, [id]);
        
        if (result.rows[0]) {
            return this.parseTemplate(result.rows[0]);
        }
        
        return null;
    }

    /**
     * Buscar templates por tipo
     */
    async findByType(templateType, options = {}) {
        const { userId = null, publicOnly = false } = options;
        
        let sql = `
            SELECT * FROM ${this.tableName}
            WHERE template_type = ? AND is_active = true
        `;
        const params = [templateType];
        
        if (publicOnly) {
            sql += ' AND is_public = true';
        } else if (userId) {
            sql += ' AND (is_public = true OR created_by = ?)';
            params.push(userId);
        }
        
        sql += ' ORDER BY usage_count DESC, created_at DESC';
        
        const result = await this.db.query(sql, params);
        return result.rows.map(row => this.parseTemplate(row));
    }

    /**
     * Buscar templates do usuário
     */
    async findByUser(userId, includePublic = true) {
        let sql = `
            SELECT * FROM ${this.tableName}
            WHERE created_by = ? AND is_active = true
        `;
        const params = [userId];
        
        if (includePublic) {
            sql = `
                SELECT * FROM ${this.tableName}
                WHERE (created_by = ? OR is_public = true) AND is_active = true
            `;
        }
        
        sql += ' ORDER BY created_at DESC';
        
        const result = await this.db.query(sql, params);
        return result.rows.map(row => this.parseTemplate(row));
    }

    /**
     * Atualizar template
     */
    async update(id, updateData) {
        const fields = [];
        const values = [];
        
        const allowedFields = [
            'name', 'description', 'template_schema', 'default_values',
            'validation_rules', 'is_public', 'version', 'tags'
        ];
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                if (['template_schema', 'default_values', 'validation_rules', 'tags'].includes(field)) {
                    fields.push(`${field} = ?`);
                    values.push(JSON.stringify(updateData[field]));
                } else {
                    fields.push(`${field} = ?`);
                    values.push(updateData[field]);
                }
            }
        });
        
        if (fields.length === 0) {
            throw new Error('Nenhum campo para atualizar');
        }
        
        values.push(id);
        const sql = `
            UPDATE ${this.tableName}
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await this.db.query(sql, values);
        return this.findById(id);
    }

    /**
     * Incrementar contador de uso
     */
    async incrementUsage(id) {
        const sql = `
            UPDATE ${this.tableName}
            SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await this.db.query(sql, [id]);
    }

    /**
     * Deletar template (soft delete)
     */
    async delete(id) {
        const sql = `
            UPDATE ${this.tableName}
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        await this.db.query(sql, [id]);
    }

    /**
     * Listar templates com paginação
     */
    async list(options = {}) {
        const {
            page = 1,
            limit = 10,
            templateType = null,
            userId = null,
            search = '',
            publicOnly = false,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = options;
        
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE is_active = true';
        const params = [];
        
        if (templateType) {
            whereClause += ' AND template_type = ?';
            params.push(templateType);
        }
        
        if (publicOnly) {
            whereClause += ' AND is_public = true';
        } else if (userId) {
            whereClause += ' AND (is_public = true OR created_by = ?)';
            params.push(userId);
        }
        
        if (search) {
            whereClause += ' AND (name LIKE ? OR description LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }
        
        const validSortFields = ['name', 'created_at', 'updated_at', 'usage_count'];
        const orderBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        const sql = `
            SELECT * FROM ${this.tableName}
            ${whereClause}
            ORDER BY ${orderBy} ${order}
            LIMIT ? OFFSET ?
        `;
        
        params.push(limit, offset);
        const result = await this.db.query(sql, params);
        
        // Contar total
        const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereClause}`;
        const countParams = params.slice(0, -2);
        const countResult = await this.db.query(countSql, countParams);
        
        const templates = result.rows.map(row => this.parseTemplate(row));
        
        return {
            templates,
            total: countResult.rows[0].total,
            page,
            limit,
            totalPages: Math.ceil(countResult.rows[0].total / limit)
        };
    }

    /**
     * Obter estatísticas dos templates
     */
    async getStats(userId = null) {
        let whereClause = 'WHERE is_active = true';
        const params = [];
        
        if (userId) {
            whereClause += ' AND created_by = ?';
            params.push(userId);
        }
        
        const sql = `
            SELECT 
                COUNT(*) as total_templates,
                COUNT(DISTINCT template_type) as unique_types,
                COUNT(CASE WHEN is_public = true THEN 1 END) as public_templates,
                COUNT(CASE WHEN is_public = false THEN 1 END) as private_templates,
                AVG(usage_count) as avg_usage,
                MAX(usage_count) as max_usage,
                COUNT(DISTINCT created_by) as unique_creators
            FROM ${this.tableName}
            ${whereClause}
        `;
        
        const result = await this.db.query(sql, params);
        return result.rows[0];
    }

    /**
     * Obter tipos de template mais populares
     */
    async getPopularTypes(limit = 10) {
        const sql = `
            SELECT 
                template_type,
                COUNT(*) as template_count,
                SUM(usage_count) as total_usage
            FROM ${this.tableName}
            WHERE is_active = true
            GROUP BY template_type
            ORDER BY total_usage DESC, template_count DESC
            LIMIT ?
        `;
        
        const result = await this.db.query(sql, [limit]);
        return result.rows;
    }

    /**
     * Clonar template
     */
    async clone(id, newName, userId) {
        const original = await this.findById(id);
        if (!original) {
            throw new Error('Template não encontrado');
        }
        
        const cloneData = {
            name: newName,
            description: `Clone de: ${original.description}`,
            template_type: original.template_type,
            template_schema: original.template_schema,
            default_values: original.default_values,
            validation_rules: original.validation_rules,
            created_by: userId,
            is_public: false,
            version: '1.0.0',
            tags: [...(original.tags || []), 'clone']
        };
        
        return this.create(cloneData);
    }

    /**
     * Validar dados contra template
     */
    validateData(templateSchema, data) {
        // Implementação básica de validação
        // TODO: Implementar validação mais robusta usando bibliotecas como Joi ou Yup
        const errors = [];
        
        if (templateSchema.required) {
            templateSchema.required.forEach(field => {
                if (!data.hasOwnProperty(field) || data[field] === null || data[field] === undefined) {
                    errors.push(`Campo obrigatório '${field}' não fornecido`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Aplicar valores padrão do template
     */
    applyDefaults(template, data = {}) {
        const result = { ...data };
        
        if (template.default_values) {
            Object.keys(template.default_values).forEach(key => {
                if (!result.hasOwnProperty(key)) {
                    result[key] = template.default_values[key];
                }
            });
        }
        
        return result;
    }

    /**
     * Parser para converter dados JSON do banco
     */
    parseTemplate(row) {
        return {
            ...row,
            template_schema: JSON.parse(row.template_schema),
            default_values: JSON.parse(row.default_values),
            validation_rules: JSON.parse(row.validation_rules),
            tags: JSON.parse(row.tags)
        };
    }
}

export default DataTemplate;