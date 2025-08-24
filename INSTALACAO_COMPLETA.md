# 🚀 Guia de Instalação Completa - Fusione Core System

## 📋 Visão Geral

O **Fusione Core System** é uma plataforma modular completa para gestão empresarial, desenvolvida especificamente para escritórios de advocacia e empresas que necessitam de controle rigoroso de compliance, contratos, propriedade intelectual e processos societários.

### 🎯 Módulos Implementados

1. **🎨 Fusione UI** - Interface unificada ReactJS com Tailwind CSS
2. **👥 Pessoas** - Gestão completa de pessoas físicas/jurídicas com integração à Receita Federal
3. **🔒 Segurança** - Controle avançado de segurança com OAuth2 + 2FA e auditoria completa
4. **📄 Contratos** - Ciclo de vida contratual completo com assinaturas eletrônicas
5. **✅ Compliance** - Monitoramento de integridade e conformidade legal
6. **⚖️ Contencioso** - Gestão de processos judiciais e administrativos
7. **📋 Procurações** - Controle de poderes e representações legais
8. **🏢 Societário** - Gestão da estrutura societária do grupo
9. **🏷️ Marcas** - Gestão de propriedade intelectual (marcas e patentes)
10. **🔧 Bolts** - Micro-funcionalidades plugáveis para automação

---

## 🛠️ Pré-requisitos

### Requisitos Obrigatórios
- **Node.js** 18.0.0 ou superior
- **npm** 8.0.0 ou superior
- **MongoDB** 6.0 ou superior
- **Redis** 7.0 ou superior

### Requisitos Opcionais
- **Docker** 20.0.0 ou superior (para containerização)
- **Docker Compose** 2.0.0 ou superior
- **Git** (para controle de versão)

---

## 🚀 Instalação Rápida

### Opção 1: Instalação Automatizada

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/fusione-core-system.git
cd fusione-core-system

# 2. Execute o script de configuração automática
npm run setup

# 3. Execute as migrações do banco de dados
npm run migrate

# 4. Inicie a aplicação
npm run dev
```

### Opção 2: Instalação com Docker

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/fusione-core-system.git
cd fusione-core-system

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env conforme necessário

# 3. Inicie todos os serviços
docker-compose up -d

# 4. Verifique o status
docker-compose ps
```

---

## 📝 Instalação Manual Detalhada

### Passo 1: Preparação do Ambiente

```bash
# Verificar versões dos pré-requisitos
node --version  # Deve ser >= 18.0.0
npm --version   # Deve ser >= 8.0.0

# Clone o repositório
git clone https://github.com/seu-usuario/fusione-core-system.git
cd fusione-core-system
```

### Passo 2: Configuração das Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Aplicação
NODE_ENV=development
API_PORT=3000
API_HOST=localhost
LOG_LEVEL=debug

# Segurança
JWT_SECRET=seu-jwt-secret-super-seguro-aqui
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Banco de Dados
MONGODB_URI=mongodb://localhost:27017/fusione
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=sua-senha-mongo

# Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sua-senha-redis
REDIS_TTL=3600

# Email (opcional)
SMTP_HOST=seu-smtp-host
SMTP_PORT=587
SMTP_USER=seu-email@dominio.com
SMTP_PASS=sua-senha-email
SMTP_FROM=noreply@fusione.com
```

### Passo 3: Instalação das Dependências

```bash
# Instalar dependências do backend
npm install

# Instalar dependências do frontend (se aplicável)
cd frontend
npm install
cd ..
```

### Passo 4: Configuração do Banco de Dados

#### MongoDB

```bash
# Opção 1: Instalação local
# Siga as instruções em: https://docs.mongodb.com/manual/installation/

# Opção 2: Docker
docker run -d \
  --name fusione-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=fusione123 \
  -v mongo-data:/data/db \
  mongo:6
```

#### Redis

```bash
# Opção 1: Instalação local
# Siga as instruções em: https://redis.io/download

# Opção 2: Docker
docker run -d \
  --name fusione-redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --requirepass fusione123
```

### Passo 5: Migração do Banco de Dados

```bash
# Executar migrações
npm run migrate
```

### Passo 6: Inicialização da Aplicação

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

---

## 🔧 Configuração Avançada

### Configuração de Módulos

Cada módulo possui seu próprio arquivo `module.json` com configurações específicas:

```bash
# Estrutura de módulos
src/modules/
├── pessoas-module/
│   ├── index.js
│   └── module.json
├── seguranca-module/
│   ├── index.js
│   └── module.json
└── ...
```

### Configuração de Segurança

1. **JWT Secret**: Gere uma chave segura para JWT
2. **HTTPS**: Configure certificados SSL para produção
3. **Rate Limiting**: Ajuste limites de requisições por IP
4. **CORS**: Configure domínios permitidos

### Configuração de Email

Para funcionalidades de notificação:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=noreply@fusione.com
```

---

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com cobertura
npm run test:coverage
```

---

## 🐳 Deploy com Docker

### Desenvolvimento

```bash
# Construir imagem
npm run docker:build

# Iniciar serviços
npm run docker:run

# Ver logs
npm run docker:logs

# Parar serviços
npm run docker:stop
```

### Produção

```bash
# Construir para produção
docker build -t fusione-core:latest .

# Executar com docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoramento e Logs

### Health Check

```bash
# Verificar saúde da aplicação
curl http://localhost:3000/api/v1/health
```

### Logs

```bash
# Ver logs em tempo real
tail -f logs/fusione.log

# Ver logs do Docker
docker-compose logs -f
```

### Métricas

Acesse o dashboard de métricas em:
- **Desenvolvimento**: http://localhost:3000/metrics
- **Produção**: https://seu-dominio.com/metrics

---

## 🔐 Primeiro Acesso

### Credenciais Padrão

- **Usuário**: admin
- **Senha**: admin123

⚠️ **IMPORTANTE**: Altere a senha padrão no primeiro acesso!

### URLs de Acesso

- **Aplicação Principal**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/v1/health
- **Metrics**: http://localhost:3000/metrics

---

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar em modo desenvolvimento
npm run setup            # Configuração inicial automática
npm run migrate          # Executar migrações
npm test                 # Executar testes
npm run lint             # Verificar código
npm run format           # Formatar código

# Docker
npm run docker:build     # Construir imagem
npm run docker:run       # Iniciar containers
npm run docker:stop      # Parar containers
npm run docker:logs      # Ver logs

# Produção
npm start                # Iniciar em produção
npm run build            # Build para produção
```

---

## 🆘 Solução de Problemas

### Problemas Comuns

#### 1. Erro de Conexão com MongoDB

```bash
# Verificar se MongoDB está rodando
mongosh --eval "db.adminCommand('ping')"

# Reiniciar MongoDB
sudo systemctl restart mongod
```

#### 2. Erro de Conexão com Redis

```bash
# Verificar se Redis está rodando
redis-cli ping

# Reiniciar Redis
sudo systemctl restart redis
```

#### 3. Porta já em uso

```bash
# Verificar processo usando a porta 3000
lsof -i :3000

# Matar processo
kill -9 <PID>
```

#### 4. Problemas de Permissão

```bash
# Corrigir permissões
sudo chown -R $USER:$USER .
chmod +x scripts/*.js
```

### Logs de Debug

```bash
# Ativar logs detalhados
export LOG_LEVEL=debug
npm run dev
```

---

## 📚 Documentação Adicional

- **API Documentation**: `API-DOCUMENTATION.md`
- **Módulos**: `MODULOS_COMPLEMENTARES_FUSIONE.md`
- **Especificações Técnicas**: `PROPULSOR_TECHNICAL_SPECS.md`
- **Setup MongoDB**: `SETUP-MONGODB.md`
- **Setup Redis**: `SETUP-REDIS.md`

---

## 🤝 Suporte

### Contato

- **Email**: gustavorighi@gmail.com
- **Documentação**: ./docs/
- **Issues**: GitHub Issues

### Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo `LICENSE` para detalhes.

---

## 🎉 Próximos Passos

Após a instalação bem-sucedida:

1. ✅ **Configurar usuários e permissões**
2. ✅ **Importar dados iniciais**
3. ✅ **Configurar integrações externas**
4. ✅ **Personalizar módulos conforme necessário**
5. ✅ **Configurar backups automáticos**
6. ✅ **Implementar monitoramento em produção**

**🚀 Bem-vindo ao Fusione Core System!**