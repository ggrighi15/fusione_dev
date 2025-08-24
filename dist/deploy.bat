@echo off
echo ========================================
echo    FUSIONE CORE SYSTEM - DEPLOY
echo ========================================
echo.

REM Verificar se estamos no diretório correto
if not exist "package.json" (
    echo [ERRO] Execute este script no diretório raiz do projeto
    pause
    exit /b 1
)

REM Limpar builds anteriores
echo [INFO] Limpando builds anteriores...
if exist "frontend\build" rmdir /s /q "frontend\build"
if exist "dist" rmdir /s /q "dist"

REM Instalar dependências se necessário
echo [INFO] Verificando dependências...
if not exist "node_modules" (
    echo [INFO] Instalando dependências do backend...
    npm install
)

if not exist "frontend\node_modules" (
    echo [INFO] Instalando dependências do frontend...
    cd frontend
    npm install
    cd ..
)

REM Criar diretório de distribuição
echo [INFO] Criando pacote de distribuição...
mkdir dist 2>nul
mkdir dist\backend 2>nul
mkdir dist\frontend 2>nul
mkdir dist\config 2>nul
mkdir dist\scripts 2>nul
mkdir dist\docs 2>nul

REM Copiar arquivos do backend
echo [INFO] Copiando arquivos do backend...
xcopy /E /I /Y src dist\backend\src\
xcopy /E /I /Y node_modules dist\backend\node_modules\
copy package.json dist\backend\
copy package-lock.json dist\backend\ 2>nul

REM Copiar arquivos do frontend
echo [INFO] Copiando arquivos do frontend...
xcopy /E /I /Y frontend\src dist\frontend\src\
xcopy /E /I /Y frontend\public dist\frontend\public\
copy frontend\package.json dist\frontend\
copy frontend\package-lock.json dist\frontend\ 2>nul

REM Copiar configurações
echo [INFO] Copiando configurações...
xcopy /E /I /Y config dist\config\
copy .env.example dist\
copy .env.production dist\
copy docker-compose.yml dist\
copy Dockerfile dist\

REM Copiar scripts
echo [INFO] Copiando scripts...
xcopy /E /I /Y scripts dist\scripts\
copy install.bat dist\
copy install.sh dist\
copy deploy.bat dist\

REM Copiar documentação
echo [INFO] Copiando documentação...
copy README.md dist\docs\ 2>nul
copy API-DOCUMENTATION.md dist\docs\ 2>nul
copy INSTALACAO_COMPLETA.md dist\docs\ 2>nul

REM Criar arquivo de versão
echo [INFO] Criando arquivo de versão...
echo Fusione Core System > dist\VERSION.txt
echo Build: %date% %time% >> dist\VERSION.txt
echo Versao: 1.0.0 >> dist\VERSION.txt

REM Criar README para distribuição
echo [INFO] Criando README de distribuição...
echo # Fusione Core System - Pacote de Instalacao > dist\README.txt
echo. >> dist\README.txt
echo Para instalar: >> dist\README.txt
echo   Windows: execute install.bat >> dist\README.txt
echo   Linux/Mac: execute ./install.sh >> dist\README.txt
echo. >> dist\README.txt
echo Para usar Docker: >> dist\README.txt
echo   docker-compose up -d >> dist\README.txt
echo. >> dist\README.txt
echo Documentacao completa em: docs\ >> dist\README.txt

echo.
echo [INFO] Criando arquivo compactado...
if exist "fusione-core-system.zip" del "fusione-core-system.zip"
powershell -command "Compress-Archive -Path 'dist\*' -DestinationPath 'fusione-core-system.zip'"

echo.
echo ========================================
echo    DEPLOY CONCLUÍDO COM SUCESSO!
echo ========================================
echo.
echo Pacote criado: fusione-core-system.zip
echo Tamanho: 
dir fusione-core-system.zip | find ".zip"
echo.
echo Para distribuir:
echo   1. Envie o arquivo fusione-core-system.zip
echo   2. Descompacte no servidor de destino
echo   3. Execute install.bat (Windows) ou install.sh (Linux)
echo.
pause