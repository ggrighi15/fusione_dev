#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    FUSIONE CORE SYSTEM - INSTALADOR${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar se Node.js está instalado
if ! command_exists node; then
    echo -e "${RED}[ERRO] Node.js não encontrado!${NC}"
    echo "Por favor, instale Node.js 18+ de: https://nodejs.org/"
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node --version)
echo -e "${GREEN}[INFO] Node.js detectado: $NODE_VERSION${NC}"

# Verificar se npm está instalado
if ! command_exists npm; then
    echo -e "${RED}[ERRO] npm não encontrado!${NC}"
    exit 1
fi

# Database services no longer required
echo -e "${BLUE}[INFO] MongoDB and Redis dependencies removed${NC}"
echo "System now operates without external database dependencies"

echo
echo -e "${BLUE}[INFO] Iniciando instalação do Fusione Core System...${NC}"
echo

# Criar arquivo .env se não existir
if [ ! -f ".env" ]; then
    echo -e "${BLUE}[INFO] Criando arquivo de configuração .env...${NC}"
    cp ".env.example" ".env"
    echo -e "${YELLOW}[INFO] Configure o arquivo .env com suas credenciais antes de continuar${NC}"
fi

# Instalar dependências do backend
echo -e "${BLUE}[INFO] Instalando dependências do backend...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERRO] Falha na instalação das dependências do backend${NC}"
    exit 1
fi

# Instalar dependências do frontend
echo -e "${BLUE}[INFO] Instalando dependências do frontend...${NC}"
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERRO] Falha na instalação das dependências do frontend${NC}"
    cd ..
    exit 1
fi

# Build do frontend
echo -e "${BLUE}[INFO] Gerando build de produção do frontend...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}[ERRO] Falha no build do frontend${NC}"
    cd ..
    exit 1
fi

cd ..

# Executar testes
echo -e "${BLUE}[INFO] Executando testes...${NC}"
npm test -- --passWithNoTests

# Tornar scripts executáveis
chmod +x scripts/*.sh 2>/dev/null

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    INSTALAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo "Para iniciar o sistema:"
echo "  1. Configure o arquivo .env"
echo "  2. Execute: npm start"
echo "  3. Acesse: http://localhost:3001"
echo
echo "Para usar Docker:"
echo "  docker-compose up -d"
echo
echo "Para desenvolvimento:"
echo "  Backend: npm run dev"
echo "  Frontend: cd frontend && npm start"
echo