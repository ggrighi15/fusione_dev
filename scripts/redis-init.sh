#!/bin/bash
# Fusione Core System - Redis Initialization Script
# Script executado durante a inicialização do container Redis

echo "Iniciando configuração do Redis para Fusione Core System..."

# Aguardar o Redis estar disponível
echo "Aguardando Redis estar disponível..."
until redis-cli ping; do
  echo "Redis não está pronto - aguardando..."
  sleep 2
done

echo "Redis está disponível!"

# Configurar estruturas de dados iniciais
echo "Configurando estruturas de dados iniciais..."

# Configurar contadores globais
redis-cli SET "fusione:counters:users" 0
redis-cli SET "fusione:counters:sessions" 0
redis-cli SET "fusione:counters:notifications" 0
redis-cli SET "fusione:counters:requests" 0

echo "Contadores globais configurados"

# Configurar configurações do sistema em cache
redis-cli HSET "fusione:config:app" \
  "name" "Fusione Core System" \
  "version" "1.0.0" \
  "environment" "production" \
  "debug" "false"

redis-cli HSET "fusione:config:cache" \
  "defaultTTL" "3600" \
  "maxMemory" "256mb" \
  "evictionPolicy" "allkeys-lru"

redis-cli HSET "fusione:config:session" \
  "timeout" "1800" \
  "maxSessions" "5" \
  "renewThreshold" "300"

redis-cli HSET "fusione:config:rateLimit" \
  "windowMs" "900000" \
  "maxRequests" "100" \
  "skipSuccessfulRequests" "false"

echo "Configurações do sistema em cache definidas"

# Configurar listas para diferentes tipos de dados
echo "Configurando estruturas de listas..."

# Lista para logs em tempo real (limitada a 1000 entradas)
redis-cli DEL "fusione:logs:realtime"
redis-cli LPUSH "fusione:logs:realtime" '{"level":"info","message":"Sistema inicializado","timestamp":"'$(date -Iseconds)'","module":"system"}'

# Lista para eventos do sistema
redis-cli DEL "fusione:events:system"
redis-cli LPUSH "fusione:events:system" '{"type":"system_start","timestamp":"'$(date -Iseconds)'","data":{"version":"1.0.0"}}'

echo "Estruturas de listas configuradas"

# Configurar conjuntos (sets) para dados únicos
echo "Configurando conjuntos..."

# Set para usuários online
redis-cli DEL "fusione:users:online"

# Set para sessões ativas
redis-cli DEL "fusione:sessions:active"

# Set para IPs bloqueados
redis-cli DEL "fusione:security:blocked_ips"

echo "Conjuntos configurados"

# Configurar sorted sets para rankings e métricas
echo "Configurando sorted sets..."

# Ranking de usuários mais ativos
redis-cli DEL "fusione:rankings:active_users"

# Métricas de performance por endpoint
redis-cli DEL "fusione:metrics:endpoint_performance"

# Contadores de erros por tipo
redis-cli DEL "fusione:metrics:error_counts"

echo "Sorted sets configurados"

# Configurar TTL para chaves temporárias
echo "Configurando TTL para chaves temporárias..."

# Configurar expiração para logs em tempo real (24 horas)
redis-cli EXPIRE "fusione:logs:realtime" 86400

# Configurar expiração para eventos do sistema (7 dias)
redis-cli EXPIRE "fusione:events:system" 604800

echo "TTL configurado para chaves temporárias"

# Configurar padrões de cache para diferentes módulos
echo "Configurando padrões de cache..."

# Cache para configurações (TTL: 1 hora)
redis-cli SETEX "fusione:cache:config:ttl" 3600 "3600"

# Cache para dados de usuário (TTL: 30 minutos)
redis-cli SETEX "fusione:cache:user:ttl" 1800 "1800"

# Cache para notificações (TTL: 15 minutos)
redis-cli SETEX "fusione:cache:notifications:ttl" 900 "900"

# Cache para métricas (TTL: 5 minutos)
redis-cli SETEX "fusione:cache:metrics:ttl" 300 "300"

echo "Padrões de cache configurados"

# Configurar pub/sub channels
echo "Configurando canais pub/sub..."

# Publicar evento de inicialização
redis-cli PUBLISH "fusione:events" '{"type":"redis_initialized","timestamp":"'$(date -Iseconds)'","message":"Redis inicializado com sucesso"}'

echo "Canais pub/sub configurados"

# Configurar scripts Lua para operações atômicas
echo "Carregando scripts Lua..."

# Script para incrementar contador com limite
INCR_WITH_LIMIT_SCRIPT='local key = KEYS[1]
local limit = tonumber(ARGV[1])
local current = redis.call("GET", key)
if current == false then
  current = 0
else
  current = tonumber(current)
end
if current < limit then
  return redis.call("INCR", key)
else
  return nil
end'

INCR_WITH_LIMIT_SHA=$(redis-cli SCRIPT LOAD "$INCR_WITH_LIMIT_SCRIPT")
redis-cli SET "fusione:scripts:incr_with_limit" "$INCR_WITH_LIMIT_SHA"

# Script para rate limiting
RATE_LIMIT_SCRIPT='local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local current = redis.call("GET", key)
if current == false then
  redis.call("SET", key, 1)
  redis.call("EXPIRE", key, window)
  return {1, limit}
else
  current = tonumber(current)
  if current < limit then
    local new_val = redis.call("INCR", key)
    local ttl = redis.call("TTL", key)
    return {new_val, limit}
  else
    local ttl = redis.call("TTL", key)
    return {current, limit, ttl}
  end
end'

RATE_LIMIT_SHA=$(redis-cli SCRIPT LOAD "$RATE_LIMIT_SCRIPT")
redis-cli SET "fusione:scripts:rate_limit" "$RATE_LIMIT_SHA"

echo "Scripts Lua carregados"

# Configurar monitoramento
echo "Configurando monitoramento..."

# Métricas de sistema
redis-cli HSET "fusione:monitoring:redis" \
  "initialized_at" "$(date -Iseconds)" \
  "version" "$(redis-cli INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')" \
  "mode" "$(redis-cli INFO replication | grep role | cut -d: -f2 | tr -d '\r')" \
  "status" "ready"

echo "Monitoramento configurado"

# Configurar backup automático (se necessário)
echo "Configurando backup..."

# Forçar um save inicial
redis-cli BGSAVE

echo "Backup inicial configurado"

# Configurar alertas e notificações
echo "Configurando sistema de alertas..."

# Configurar thresholds para alertas
redis-cli HSET "fusione:alerts:thresholds" \
  "memory_usage" "80" \
  "connection_count" "1000" \
  "error_rate" "5" \
  "response_time" "1000"

echo "Sistema de alertas configurado"

# Verificar configuração
echo "Verificando configuração..."

# Verificar se todas as chaves foram criadas
echo "Chaves de configuração criadas:"
redis-cli KEYS "fusione:config:*" | wc -l

echo "Contadores criados:"
redis-cli KEYS "fusione:counters:*" | wc -l

echo "Scripts carregados:"
redis-cli KEYS "fusione:scripts:*" | wc -l

echo "Configuração de monitoramento:"
redis-cli HGETALL "fusione:monitoring:redis"

# Publicar evento de conclusão
redis-cli PUBLISH "fusione:events" '{"type":"redis_setup_complete","timestamp":"'$(date -Iseconds)'","message":"Configuração do Redis concluída com sucesso"}'

echo "✅ Inicialização do Redis concluída com sucesso!"
echo "📊 Estruturas de dados configuradas"
echo "⚙️  Configurações do sistema em cache"
echo "🔧 Scripts Lua carregados"
echo "📈 Monitoramento ativo"
echo "🔔 Sistema de alertas configurado"
echo ""
echo "Redis está pronto para o Fusione Core System!"