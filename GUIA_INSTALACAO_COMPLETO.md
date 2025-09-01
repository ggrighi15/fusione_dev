# Fusione Core System - Guia de Instalação Completo

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação Automática](#instalação-automática)
3. [Instalação Manual](#instalação-manual)
4. [Configuração com Docker](#configuração-com-docker)
5. [Configuração de Produção](#configuração-de-produção)
6. [Verificação da Instalação](#verificação-da-instalação)
7. [Solução de Problemas](#solução-de-problemas)
8. [Manutenção](#manutenção)

## 🔧 Pré-requisitos

### Sistema Operacional
- Windows 10/11, Linux (Ubuntu 18+), macOS 10.15+
- Mínimo 4GB RAM, recomendado 8GB+
- Mínimo 10GB espaço em disco

### Software Necessário

#### Obrigatório
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Elasticsearch 8+** - [Download](https://www.elastic.co/downloads/elasticsearch)

#### Opcional
- **Docker & Docker Compose** - [Download](https://www.docker.com/)
- **Git** - [Download](https://git-scm.com/)

## 🚀 Instalação Automática

### Windows
```batch
# Descompacte o arquivo fusione-core-system.zip
# Abra o Prompt de Comando como Administrador
cd caminho\para\fusione-core-system
install.bat
```

### Linux/macOS
```bash
# Descompacte o arquivo fusione-core-system.zip
cd caminho/para/fusione-core-system
chmod +x install.sh
./install.sh
```

## 🔨 Instalação Manual

### 1. Preparar o Ambiente

```bash
# Verificar versões
node --version  # Deve ser 18+
npm --version
# Database services no longer required - MongoDB and Redis removed
```

### 2. Configurar Banco de Dados

#### Database Services
```bash
# MongoDB and Redis are no longer required
# The system now operates without these dependencies
```

### 3. Instalar Dependências

```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 4. Configurar Variáveis de Ambiente

```bash
# Copiar template
cp .env.example .env

# Editar configurações
# Windows: notepad .env
# Linux/macOS: nano .env
```

#### Configurações Essenciais
```env
# Banco de dados
# Database configuration removed - MongoDB and Redis no longer used

# Segurança (ALTERE ESTES VALORES!)
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui
ENCRYPTION_KEY=sua_chave_de_criptografia_32_chars

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

### 5. Executar o Sistema

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🐳 Configuração com Docker

### Instalação Completa
```bash
# Subir todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f fusione-app
```

### Perfis Disponíveis

#### Produção
```bash
# Inclui Nginx como proxy reverso
docker-compose --profile production up -d
```

#### Desenvolvimento
```bash
# Inclui ferramentas de administração
docker-compose --profile development up -d
```

#### Monitoramento
```bash
# Inclui Prometheus e Grafana
docker-compose --profile monitoring up -d
```

### Portas dos Serviços
- **Aplicação Principal**: 3000
- **Application**: 3000
- **Nginx**: 80, 443
- **Grafana**: 3001
- **Prometheus**: 9090
- **Admin Panel**: 8080

## ⚙️ Configuração de Produção

### 1. Variáveis de Ambiente

Use o arquivo `.env.production` como base:

```bash
cp .env.production .env
```

### 2. Configurações de Segurança

```env
# Gerar secrets seguros
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
```

### 3. SSL/HTTPS

```bash
# Gerar certificados auto-assinados (desenvolvimento)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout config/ssl/private.key \
  -out config/ssl/certificate.crt
```

### 4. Backup Automático

```bash
# Configurar backup do MongoDB
# Adicionar ao crontab
0 2 * * * /caminho/para/scripts/backup-mongo.sh
```

## ✅ Verificação da Instalação

### 1. Health Check
```bash
# Verificar saúde da aplicação
curl http://localhost:3001/api/health

# Resposta esperada:
# {"status":"ok","timestamp":"...","services":{...}}
```

### 2. Teste de Login
```bash
# Acessar interface web
# http://localhost:3000

# Credenciais padrão:
# Email: admin@fusione.com
# Senha: admin123
```

### 3. Verificar Logs
```bash
# Logs da aplicação
tail -f logs/fusione-core.log

# Logs do Docker
docker-compose logs -f
```

## 🔧 Solução de Problemas

### Problemas Comuns

#### 1. Application Connection Issues

```bash
# Check if application is running
ps aux | grep node

# Check application logs
npm run logs
```

#### 3. Porta em Uso
```bash
# Windows
netstat -ano | findstr :3001

# Linux/macOS
lsof -i :3001

# Matar processo
# Windows
taskkill /PID <PID> /F

# Linux/macOS
kill -9 <PID>
```

#### 4. Problemas de Permissão
```bash
# Linux/macOS - Corrigir permissões
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

### Logs de Debug

```bash
# Ativar logs detalhados
export LOG_LEVEL=debug
export NODE_ENV=development

# Executar com logs detalhados
npm run dev
```

## 🔄 Manutenção

### Backup

```bash
# Application backup
npm run backup

# Backup dos arquivos
tar -czf backup/files-$(date +%Y%m%d).tar.gz data/ logs/ config/
```

### Atualização

```bash
# Parar serviços
docker-compose down
# ou
npm stop

# Backup antes da atualização
./scripts/backup.sh

# Atualizar código
git pull origin main

# Atualizar dependências
npm install
cd frontend && npm install && cd ..

# Reiniciar serviços
docker-compose up -d
# ou
npm start
```

### Monitoramento

```bash
# Verificar uso de recursos
docker stats

# Verificar logs de erro
grep -i error logs/fusione-core.log

# Verificar performance
curl http://localhost:3001/api/metrics
```

## 📞 Suporte

- **Documentação**: `/docs`
- **API**: `/api-docs`
- **Health Check**: `/api/health`
- **Métricas**: `/api/metrics`

### Informações do Sistema

```bash
# Coletar informações para suporte
node --version
npm --version
docker --version
# Database services no longer required

# Logs relevantes
tail -100 logs/fusione-core.log
```

---

**Fusione Core System v1.0.0**  
*Sistema de Gestão Empresarial Integrado*