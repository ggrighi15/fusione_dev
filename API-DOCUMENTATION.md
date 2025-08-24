# Fusione Core System - API Documentation

This document provides comprehensive documentation for the Fusione Core System REST API.

## Base URL

```
http://localhost:3000/api
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details (optional)",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Authentication

Currently, the API does not require authentication. This may change in future versions.

## Endpoints

### System Information

#### Get System Information

**GET** `/system/info`

Returns general information about the system.

**Response:**
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

### Module Management

#### List All Modules

**GET** `/modules`

Returns a list of all loaded modules.

**Response:**
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

#### Get Module Information

**GET** `/modules/{name}`

Returns detailed information about a specific module.

**Parameters:**
- `name` (path) - The name of the module

**Example:** `GET /modules/example-module`

**Response:**
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
    "description": "Example module for demonstration",
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

**Error Response (Module Not Found):**
```json
{
  "success": false,
  "error": "Módulo 'non-existent' não encontrado",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Reload Module

**POST** `/modules/{name}/reload`

Reloads a specific module.

**Parameters:**
- `name` (path) - The name of the module to reload

**Example:** `POST /modules/example-module/reload`

**Response:**
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

### Configuration Management

#### Get All Configurations

**GET** `/config`

Returns all system configurations.

**Response:**
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

#### Get Specific Configuration

**GET** `/config/{key}`

Returns a specific configuration value.

**Parameters:**
- `key` (path) - The configuration key (supports dot notation)

**Example:** `GET /config/server.port`

**Response:**
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

#### Update Configuration

**PUT** `/config/{key}`

Updates a specific configuration value.

**Parameters:**
- `key` (path) - The configuration key

**Request Body:**
```json
{
  "value": "new_value"
}
```

**Example:** `PUT /config/logging.level`
```json
{
  "value": "debug"
}
```

**Response:**
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

### Event Management

#### Get Event Statistics

**GET** `/events/stats`

Returns statistics about the event system.

**Response:**
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

#### Get Event History

**GET** `/events/history`

Returns the history of recent events.

**Query Parameters:**
- `limit` (optional) - Maximum number of events to return (default: 100)
- `event` (optional) - Filter by specific event name

**Example:** `GET /events/history?limit=50&event=system:heartbeat`

**Response:**
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

#### Emit Event

**POST** `/events/emit`

Emits a custom event through the system.

**Request Body:**
```json
{
  "event": "custom:event",
  "data": {
    "message": "Hello World",
    "priority": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Evento 'custom:event' emitido com sucesso",
  "data": {
    "event": "custom:event",
    "data": {
      "message": "Hello World",
      "priority": "high"
    },
    "emitted": true
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Logging

#### Get Logs

**GET** `/logs`

Returns recent system logs.

**Query Parameters:**
- `level` (optional) - Filter by log level (default: info)
- `limit` (optional) - Maximum number of logs to return (default: 100)

**Example:** `GET /logs?level=error&limit=50`

**Response:**
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

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Component not available |

## Usage Examples

### Using cURL

```bash
# Get system information
curl -X GET http://localhost:3000/api/system/info

# Get all modules
curl -X GET http://localhost:3000/api/modules

# Get specific module
curl -X GET http://localhost:3000/api/modules/example-module

# Reload a module
curl -X POST http://localhost:3000/api/modules/example-module/reload

# Update configuration
curl -X PUT http://localhost:3000/api/config/logging.level \
  -H "Content-Type: application/json" \
  -d '{"value": "debug"}'

# Emit custom event
curl -X POST http://localhost:3000/api/events/emit \
  -H "Content-Type: application/json" \
  -d '{"event": "test:ping", "data": {"message": "Hello"}}'
```

### Using JavaScript (Fetch API)

```javascript
// Get system information
const systemInfo = await fetch('http://localhost:3000/api/system/info')
  .then(response => response.json());

// Update configuration
const updateConfig = await fetch('http://localhost:3000/api/config/logging.level', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ value: 'debug' })
}).then(response => response.json());

// Emit event
const emitEvent = await fetch('http://localhost:3000/api/events/emit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event: 'custom:notification',
    data: { message: 'API test successful' }
  })
}).then(response => response.json());
```

### Using Python (requests)

```python
import requests
import json

base_url = 'http://localhost:3000/api'

# Get system information
response = requests.get(f'{base_url}/system/info')
system_info = response.json()

# Update configuration
config_data = {'value': 'debug'}
response = requests.put(
    f'{base_url}/config/logging.level',
    json=config_data
)
config_result = response.json()

# Emit event
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

## WebSocket API

The system also provides WebSocket connectivity for real-time communication:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = function() {
    console.log('Connected to Fusione Core System');
    
    // Send a message
    ws.send(JSON.stringify({
        type: 'ping',
        data: { message: 'Hello from client' }
    }));
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
};
```

## Rate Limiting

Currently, there are no rate limits implemented. This may change in future versions for production deployments.

## Versioning

The API is currently at version 1.0. Future versions will maintain backward compatibility where possible.

## Support

For issues and questions, please refer to the project documentation or create an issue in the project repository.