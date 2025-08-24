@echo off
echo ========================================
echo    FUSIONE CORE SYSTEM - INSTALADOR
echo ========================================
echo.

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js não encontrado!
    echo Por favor, instale Node.js 18+ de: https://nodejs.org/
    pause
    exit /b 1
)

REM Verificar versão do Node.js
for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js detectado: %NODE_VERSION%

REM Verificar se MongoDB está rodando
echo [INFO] Verificando MongoDB...
netstat -an | find ":27017" >nul
if %errorlevel% neq 0 (
    echo [AVISO] MongoDB não detectado na porta 27017
    echo Certifique-se de que o MongoDB está instalado e rodando
)

REM Verificar se Redis está rodando
echo [INFO] Verificando Redis...
netstat -an | find ":6379" >nul
if %errorlevel% neq 0 (
    echo [AVISO] Redis não detectado na porta 6379
    echo Certifique-se de que o Redis está instalado e rodando
)

echo.
echo [INFO] Iniciando instalação do Fusione Core System...
echo.

REM Criar arquivo .env se não existir
if not exist ".env" (
    echo [INFO] Criando arquivo de configuração .env...
    copy ".env.example" ".env"
    echo [INFO] Configure o arquivo .env com suas credenciais antes de continuar
)

REM Instalar dependências do backend
echo [INFO] Instalando dependências do backend...
npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha na instalação das dependências do backend
    pause
    exit /b 1
)

REM Instalar dependências do frontend
echo [INFO] Instalando dependências do frontend...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha na instalação das dependências do frontend
    cd ..
    pause
    exit /b 1
)

REM Build do frontend
echo [INFO] Gerando build de produção do frontend...
npm run build
if %errorlevel% neq 0 (
    echo [AVISO] Build do frontend falhou, mas continuando...
    echo [INFO] Você pode executar 'npm run build' manualmente no diretório frontend
)

cd ..

REM Criar diretório de logs se não existir
if not exist "logs" (
    mkdir logs
    echo [INFO] Diretório de logs criado
)

REM Executar testes (opcional)
echo [INFO] Executando testes básicos...
npm test -- --passWithNoTests --watchAll=false

echo.
echo ========================================
echo    INSTALAÇÃO CONCLUÍDA COM SUCESSO!
echo ========================================
echo.
echo Para iniciar o sistema:
echo   1. Configure o arquivo .env
echo   2. Execute: npm start
echo   3. Acesse: http://localhost:3001
echo.
echo Para usar Docker:
echo   docker-compose up -d
echo.
pause