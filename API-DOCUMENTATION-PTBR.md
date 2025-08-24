# Fusione Core System - Documentação da API

Este documento fornece documentação abrangente para a API REST do Fusione Core System.

## URL Base

```
http://localhost:3000/api
```

## Formato de Resposta

Todas as respostas da API seguem um formato consistente:

### Resposta de Sucesso
```json
{
  "success": true,
  "message": "Mensagem de sucesso",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Resposta de Erro
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "details": "Detalhes adicionais do erro (opcional)",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Autenticação

Atualmente, a API não requer autenticação. Isso pode mudar em versões futuras.

## Endpoints

### Informações do Sistema

#### Obter Informações do Sistema

**GET** `/system/info`

Retorna informações gerais sobre o sistema.

**Resposta:**
```json
{
  "success": true,
  "message": "Informações do sistema obtidas com sucesso",
  "data": {
    "name": "Fusione Core System",
    "version": "1.0.0",
    "environment": "development",
    "uptime": 3600,
    "memory": {
      "rss": 50331648,
      "heapTotal": 20971520,
      "heapUsed": 15728640,
      "external": 1048576
    },
    "pid": 12345,
    "platform": "win32",
    "nodeVersion": "v18.17.0"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Gerenciamento de Módulos

#### Listar Todos os Módulos

**GET** `/modules`

Retorna uma lista de todos os módulos carregados.

**Resposta:**
```json
{
  "success": true,
  "message": "Lista de módulos obtida com sucesso",
  "data": {
    "example-module": {
      "name": "example-module",
      "version": "1.0.0",
      "status": "running",
      "config": {
        "enabled": true,
        "autoStart": true
      }
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Obter Informações do Módulo

**GET** `/modules/{name}`

Retorna informações detalhadas sobre um módulo específico.

**Parâmetros:**
- `name` (caminho) - O nome do módulo

**Exemplo:** `GET /modules/example-module`

**Resposta:**
```json
{
  "success": true,
  "message": "Informações do módulo 'example-module' obtidas com sucesso",
  "data": {
    "name": "example-module",
    "status": "loaded",
    "config": {
      "enabled": true,
      "autoStart": true,
      "priority": 1,
      "settings": {
        "interval": 30000,
        "maxRetries": 3
      }
    },
    "version": "1.0.0",
    "description": "Módulo de exemplo para demonstração",
    "uptime": 3600,
    "stats": {
      "eventsEmitted": 120,
      "eventsReceived": 45,
      "tasksExecuted": 30
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Resposta de Erro (Módulo Não Encontrado):**
```json
{
  "success": false,
  "error": "Módulo 'inexistente' não encontrado",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Recarregar Módulo

**POST** `/modules/{name}/reload`

Recarrega um módulo específico.

**Parâmetros:**
- `name` (caminho) - O nome do módulo a ser recarregado

**Exemplo:** `POST /modules/example-module/reload`

**Resposta:**
```json
{
  "success": true,
  "message": "Módulo 'example-module' recarregado com sucesso",
  "data": {
    "name": "example-module",
    "status": "reloaded"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Gerenciamento de Configuração

#### Obter Todas as Configurações

**GET** `/config`

Retorna todas as configurações do sistema.

**Resposta:**
```json
{
  "success": true,
  "message": "Configurações obtidas com sucesso",
  "data": {
    "server": {
      "port": 3000,
      "host": "localhost"
    },
    "logging": {
      "level": "info",
      "format": "json"
    },
    "modules": {
      "autoLoad": true,
      "directory": "./modules"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Obter Configuração Específica

**GET** `/config/{key}`

Retorna um valor de configuração específico.

**Parâmetros:**
- `key` (caminho) - A chave de configuração (suporta notação de ponto)

**Exemplo:** `GET /config/server.port`

**Resposta:**
```json
{
  "success": true,
  "message": "Configuração 'server.port' obtida com sucesso",
  "data": {
    "key": "server.port",
    "value": 3000
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Atualizar Configuração

**PUT** `/config/{key}`

Atualiza um valor de configuração específico.

**Parâmetros:**
- `key` (caminho) - A chave de configuração

**Corpo da Requisição:**
```json
{
  "value": "novo_valor"
}
```

**Exemplo:** `PUT /config/logging.level`
```json
{
  "value": "debug"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Configuração 'logging.level' atualizada com sucesso",
  "data": {
    "key": "logging.level",
    "value": "debug"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Gerenciamento de Eventos

#### Obter Estatísticas de Eventos

**GET** `/events/stats`

Retorna estatísticas sobre o sistema de eventos.

**Resposta:**
```json
{
  "success": true,
  "message": "Estatísticas de eventos obtidas com sucesso",
  "data": {
    "totalEvents": 1250,
    "totalListeners": 15,
    "eventsPerSecond": 2.5,
    "topEvents": [
      {
        "event": "system:heartbeat",
        "count": 500
      },
      {
        "event": "module:status",
        "count": 300
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Obter Histórico de Eventos

**GET** `/events/history`

Retorna o histórico de eventos recentes.

**Parâmetros de Consulta:**
- `limit` (opcional) - Número máximo de eventos a retornar (padrão: 100)
- `event` (opcional) - Filtrar por nome de evento específico

**Exemplo:** `GET /events/history?limit=50&event=system:heartbeat`

**Resposta:**
```json
{
  "success": true,
  "message": "Histórico de eventos obtido com sucesso",
  "data": {
    "events": [
      {
        "event": "system:heartbeat",
        "data": { "timestamp": "2024-01-01T00:00:00.000Z" },
        "timestamp": "2024-01-01T00:00:00.000Z",
        "source": "system"
      }
    ],
    "total": 1,
    "limit": 50,
    "filter": "system:heartbeat"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Emitir Evento

**POST** `/events/emit`

Emite um evento personalizado através do sistema.

**Corpo da Requisição:**
```json
{
  "event": "custom:event",
  "data": {
    "message": "Olá Mundo",
    "priority": "high"
  }
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Evento 'custom:event' emitido com sucesso",
  "data": {
    "event": "custom:event",
    "data": {
      "message": "Olá Mundo",
      "priority": "high"
    },
    "emitted": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Logs

#### Obter Logs

**GET** `/logs`

Retorna logs recentes do sistema.

**Parâmetros de Consulta:**
- `level` (opcional) - Filtrar por nível de log (padrão: info)
- `limit` (opcional) - Número máximo de logs a retornar (padrão: 100)

**Exemplo:** `GET /logs?level=error&limit=50`

**Resposta:**
```json
{
  "success": true,
  "message": "Informação sobre logs",
  "data": {
    "message": "Endpoint de logs não implementado completamente",
    "suggestion": "Use ferramentas como Winston com transports apropriados para logs em produção"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Códigos de Erro

| Código de Status | Descrição |
|------------------|----------|
| 200 | Sucesso |
| 400 | Requisição Inválida - Parâmetros inválidos |
| 404 | Não Encontrado - Recurso não encontrado |
| 500 | Erro Interno do Servidor |
| 503 | Serviço Indisponível - Componente não disponível |

## Exemplos de Uso

### Usando cURL

```bash
# Obter informações do sistema
curl -X GET http://localhost:3000/api/system/info

# Obter todos os módulos
curl -X GET http://localhost:3000/api/modules

# Obter módulo específico
curl -X GET http://localhost:3000/api/modules/example-module

# Recarregar um módulo
curl -X POST http://localhost:3000/api/modules/example-module/reload

# Atualizar configuração
curl -X PUT http://localhost:3000/api/config/logging.level \
  -H "Content-Type: application/json" \
  -d '{"value": "debug"}'

# Emitir evento personalizado
curl -X POST http://localhost:3000/api/events/emit \
  -H "Content-Type: application/json" \
  -d '{"event": "test:ping", "data": {"message": "Olá"}}'
```

### Usando JavaScript (Fetch API)

```javascript
// Obter informações do sistema
const systemInfo = await fetch('http://localhost:3000/api/system/info')
  .then(response => response.json());

// Atualizar configuração
const updateConfig = await fetch('http://localhost:3000/api/config/logging.level', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ value: 'debug' })
}).then(response => response.json());

// Emitir evento
const emitEvent = await fetch('http://localhost:3000/api/events/emit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event: 'custom:notification',
    data: { message: 'Teste da API bem-sucedido' }
  })
}).then(response => response.json());
```

### Usando Python (requests)

```python
import requests
import json

base_url = 'http://localhost:3000/api'

# Obter informações do sistema
response = requests.get(f'{base_url}/system/info')
system_info = response.json()

# Atualizar configuração
config_data = {'value': 'debug'}
response = requests.put(
    f'{base_url}/config/logging.level',
    json=config_data
)
config_result = response.json()

# Emitir evento
event_data = {
    'event': 'python:test',
    'data': {'source': 'python-script'}
}
response = requests.post(
    f'{base_url}/events/emit',
    json=event_data
)
event_result = response.json()
```

## API WebSocket

O sistema também fornece conectividade WebSocket para comunicação em tempo real:

```javascript
// Conectar ao WebSocket
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = function() {
    console.log('Conectado ao Fusione Core System');
    
    // Enviar uma mensagem
    ws.send(JSON.stringify({
        type: 'ping',
        data: { message: 'Olá do cliente' }
    }));
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('Recebido:', message);
};
```

## Limitação de Taxa

Atualmente, não há limites de taxa implementados. Isso pode mudar em versões futuras para implantações em produção.

## Versionamento

A API está atualmente na versão 1.0. Versões futuras manterão compatibilidade com versões anteriores sempre que possível.

## Suporte

Para problemas e perguntas, consulte a documentação do projeto ou crie uma issue no repositório do projeto.