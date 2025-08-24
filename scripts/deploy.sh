#!/bin/bash
# Fusione Core System - Deploy Script
# Script para automatizar o processo de deploy

set -e  # Parar execução em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Configurações
APP_NAME="fusione-core-system"
DOCKER_REGISTRY="localhost:5000"  # Altere para seu registry
VERSION=${1:-"latest"}
ENVIRONMENT=${2:-"production"}
COMPOSE_FILE="docker-compose.yml"

# Verificar dependências
check_dependencies() {
    log "Verificando dependências..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose não está instalado"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js não está instalado"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm não está instalado"
        exit 1
    fi
    
    log_success "Todas as dependências estão instaladas"
}

# Verificar arquivos necessários
check_files() {
    log "Verificando arquivos necessários..."
    
    local required_files=(
        "package.json"
        "Dockerfile"
        "docker-compose.yml"
        "src/index.js"
        ".env.example"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Arquivo necessário não encontrado: $file"
            exit 1
        fi
    done
    
    log_success "Todos os arquivos necessários estão presentes"
}

# Configurar ambiente
setup_environment() {
    log "Configurando ambiente: $ENVIRONMENT"
    
    # Criar arquivo .env se não existir
    if [[ ! -f ".env" ]]; then
        log_warning "Arquivo .env não encontrado, criando a partir do .env.example"
        cp .env.example .env
        
        # Gerar secrets aleatórios
        JWT_SECRET=$(openssl rand -hex 32)
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        
        # Atualizar .env com secrets gerados
        sed -i "s/your-super-secret-jwt-key-here/$JWT_SECRET/g" .env
        sed -i "s/your-encryption-key-here/$ENCRYPTION_KEY/g" .env
        
        log_success "Arquivo .env criado com secrets gerados"
    fi
    
    # Configurar variáveis específicas do ambiente
    case $ENVIRONMENT in
        "development")
            sed -i 's/NODE_ENV=.*/NODE_ENV=development/' .env
            sed -i 's/LOG_LEVEL=.*/LOG_LEVEL=debug/' .env
            ;;
        "staging")
            sed -i 's/NODE_ENV=.*/NODE_ENV=staging/' .env
            sed -i 's/LOG_LEVEL=.*/LOG_LEVEL=info/' .env
            ;;
        "production")
            sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env
            sed -i 's/LOG_LEVEL=.*/LOG_LEVEL=warn/' .env
            ;;
    esac
    
    log_success "Ambiente configurado para: $ENVIRONMENT"
}

# Executar testes
run_tests() {
    log "Executando testes..."
    
    # Instalar dependências se necessário
    if [[ ! -d "node_modules" ]]; then
        log "Instalando dependências..."
        npm ci
    fi
    
    # Executar testes unitários
    if npm run test; then
        log_success "Todos os testes passaram"
    else
        log_error "Testes falharam"
        exit 1
    fi
}

# Build da aplicação
build_app() {
    log "Fazendo build da aplicação..."
    
    # Limpar builds anteriores
    if [[ -d "dist" ]]; then
        rm -rf dist
    fi
    
    # Build da aplicação (se houver script de build)
    if npm run build &> /dev/null; then
        log_success "Build da aplicação concluído"
    else
        log_warning "Script de build não encontrado, continuando..."
    fi
}

# Build da imagem Docker
build_docker_image() {
    log "Fazendo build da imagem Docker..."
    
    local image_tag="$DOCKER_REGISTRY/$APP_NAME:$VERSION"
    local latest_tag="$DOCKER_REGISTRY/$APP_NAME:latest"
    
    # Build da imagem
    if docker build -t "$image_tag" -t "$latest_tag" .; then
        log_success "Imagem Docker criada: $image_tag"
    else
        log_error "Falha ao criar imagem Docker"
        exit 1
    fi
    
    # Push para registry (se não for localhost)
    if [[ "$DOCKER_REGISTRY" != "localhost:5000" ]]; then
        log "Fazendo push da imagem para o registry..."
        docker push "$image_tag"
        docker push "$latest_tag"
        log_success "Imagem enviada para o registry"
    fi
}

# Parar serviços existentes
stop_services() {
    log "Parando serviços existentes..."
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        docker-compose -f "$COMPOSE_FILE" down
        log_success "Serviços parados"
    else
        log "Nenhum serviço em execução"
    fi
}

# Fazer backup do banco de dados
backup_database() {
    log "Fazendo backup do banco de dados..."
    
    local backup_dir="backups/$(date +'%Y%m%d_%H%M%S')"
    mkdir -p "$backup_dir"
    
    # Backup MongoDB (se estiver rodando)
    if docker-compose -f "$COMPOSE_FILE" ps mongodb | grep -q "Up"; then
        docker-compose -f "$COMPOSE_FILE" exec -T mongodb mongodump --out /tmp/backup
        docker cp $(docker-compose -f "$COMPOSE_FILE" ps -q mongodb):/tmp/backup "$backup_dir/mongodb"
        log_success "Backup do MongoDB criado"
    fi
    
    # Backup Redis (se estiver rodando)
    if docker-compose -f "$COMPOSE_FILE" ps redis | grep -q "Up"; then
        docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE
        sleep 2
        docker cp $(docker-compose -f "$COMPOSE_FILE" ps -q redis):/data/dump.rdb "$backup_dir/redis_dump.rdb"
        log_success "Backup do Redis criado"
    fi
    
    log_success "Backup completo salvo em: $backup_dir"
}

# Iniciar serviços
start_services() {
    log "Iniciando serviços..."
    
    # Definir arquivo de compose baseado no ambiente
    local compose_files="-f $COMPOSE_FILE"
    
    if [[ -f "docker-compose.$ENVIRONMENT.yml" ]]; then
        compose_files="$compose_files -f docker-compose.$ENVIRONMENT.yml"
    fi
    
    # Iniciar serviços
    if docker-compose $compose_files up -d; then
        log_success "Serviços iniciados"
    else
        log_error "Falha ao iniciar serviços"
        exit 1
    fi
}

# Verificar saúde dos serviços
check_health() {
    log "Verificando saúde dos serviços..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Tentativa $attempt/$max_attempts..."
        
        # Verificar se a aplicação está respondendo
        if curl -f http://localhost:3000/health &> /dev/null; then
            log_success "Aplicação está saudável"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Aplicação não está respondendo após $max_attempts tentativas"
            
            # Mostrar logs para debug
            log "Logs da aplicação:"
            docker-compose -f "$COMPOSE_FILE" logs --tail=50 fusione-app
            
            exit 1
        fi
        
        sleep 10
        ((attempt++))
    done
}

# Executar migrações
run_migrations() {
    log "Executando migrações..."
    
    # Aguardar banco de dados estar pronto
    sleep 10
    
    # Executar migrações (se houver)
    if docker-compose -f "$COMPOSE_FILE" exec -T fusione-app npm run migrate &> /dev/null; then
        log_success "Migrações executadas"
    else
        log_warning "Script de migração não encontrado ou falhou"
    fi
}

# Limpar recursos antigos
cleanup() {
    log "Limpando recursos antigos..."
    
    # Remover imagens não utilizadas
    docker image prune -f
    
    # Remover volumes órfãos
    docker volume prune -f
    
    # Remover redes não utilizadas
    docker network prune -f
    
    log_success "Limpeza concluída"
}

# Mostrar status final
show_status() {
    log "Status final dos serviços:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log_success "Deploy concluído com sucesso!"
    echo ""
    echo "🌐 Aplicação: http://localhost:3000"
    echo "📊 Métricas: http://localhost:3000/metrics"
    echo "🔍 Health Check: http://localhost:3000/health"
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "grafana"; then
        echo "📈 Grafana: http://localhost:3001"
    fi
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "redis-commander"; then
        echo "🔴 Redis Commander: http://localhost:8081"
    fi
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "mongo-express"; then
        echo "🍃 Mongo Express: http://localhost:8082"
    fi
    
    echo ""
}

# Função principal
main() {
    echo "🚀 Iniciando deploy do Fusione Core System"
    echo "📦 Versão: $VERSION"
    echo "🌍 Ambiente: $ENVIRONMENT"
    echo ""
    
    check_dependencies
    check_files
    setup_environment
    
    # Executar testes apenas em desenvolvimento
    if [[ "$ENVIRONMENT" == "development" ]]; then
        run_tests
    fi
    
    build_app
    build_docker_image
    
    # Fazer backup apenas em produção
    if [[ "$ENVIRONMENT" == "production" ]]; then
        backup_database
    fi
    
    stop_services
    start_services
    run_migrations
    check_health
    cleanup
    show_status
}

# Tratamento de sinais
trap 'log_error "Deploy interrompido"; exit 1' INT TERM

# Executar função principal
main "$@"