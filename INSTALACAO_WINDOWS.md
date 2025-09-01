# Fusione Core System - Guia de Instalação para Windows

## 📋 Status dos Pré-requisitos

✅ **Sistema Operacional**: Windows (Compatível)  
⚠️ **Node.js**: Versão 14.17.1 detectada (Requer atualização para v18+)  
✅ **Database**: MongoDB and Redis removed (no longer required)  

## 🔧 Passo a Passo da Instalação

### 1. Atualizar Node.js

Sua versão atual (14.17.1) é muito antiga. O sistema requer Node.js 18+.

**Opção A - Download Direto:**
1. Acesse: https://nodejs.org/
2. Baixe a versão LTS (Long Term Support)
3. Execute o instalador e siga as instruções
4. Reinicie o terminal

**Opção B - Via Chocolatey:**
```powershell
# Instalar Chocolatey (se não tiver)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar Node.js
choco install nodejs
```

### 2. Database Configuration

**MongoDB and Redis Removed**
```powershell
# These database services are no longer required
# The system now operates without MongoDB and Redis dependencies
# This simplifies installation and reduces system requirements
```

### 4. Verificar Instalações

Após instalar tudo, verifique se está funcionando:

```powershell
# Verificar Node.js (deve mostrar v18+)
node --version

# Verificar npm
npm --version

# Database services no longer required
# MongoDB and Redis have been removed
```

### 5. Configurar o Sistema Fusione

```powershell
# Navegar para o diretório do projeto
cd C:\Users\Gustavo_ri\fusione-core-system

# Copiar arquivo de configuração
copy .env.example .env

# Editar configurações (abrir no Notepad)
notepad .env
```

**Configurações mínimas no .env:**
```env
# Banco de dados
# Database configuration removed - MongoDB and Redis no longer used

# Segurança (ALTERE ESTES VALORES!)
JWT_SECRET=seu_jwt_secret_muito_seguro_aqui_123456789
ENCRYPTION_KEY=sua_chave_de_criptografia_32_chars_12

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
PORT=3001
```

### 6. Executar Instalação Automática

```powershell
# Executar script de instalação
.\install.bat
```

Ou manualmente:

```powershell
# Instalar dependências do backend
npm install

# Instalar dependências do frontend
cd frontend
npm install
cd ..

# Build do frontend
cd frontend
npm run build
cd ..
```

### 7. Iniciar o Sistema

```powershell
# Modo desenvolvimento
npm run dev

# Ou modo produção
npm start
```

### 8. Acessar o Sistema

Após iniciar, acesse:
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:3000 (se rodando separadamente)

## 🐳 Alternativa com Docker

Se preferir usar Docker (mais simples):

```powershell
# Instalar Docker Desktop
# Download: https://www.docker.com/products/docker-desktop

# Após instalar Docker, execute:
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f fusione-app
```

## 🔍 Solução de Problemas

### Erro de Porta em Uso
```powershell
# Verificar o que está usando a porta 3001
netstat -ano | findstr :3001

# Matar processo se necessário
taskkill /PID <numero_do_pid> /F
```

### Application Issues

```cmd
# Check if application is running
tasklist | findstr node

# Restart application
npm restart
```

### Problemas de Permissão
```powershell
# Executar PowerShell como Administrador
# Ou ajustar política de execução
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📞 Próximos Passos

1. ✅ Instalar pré-requisitos (Node.js 18+)
2. ✅ Configurar arquivo .env
3. ✅ Executar instalação
4. ✅ Iniciar sistema
5. 🔄 Testar funcionalidades
6. 🔄 Configurar módulos específicos (se necessário)

---

**Dica**: Se encontrar dificuldades, a opção Docker é mais simples e evita problemas de configuração manual.