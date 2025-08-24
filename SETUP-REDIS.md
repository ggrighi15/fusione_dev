# Redis Setup Guide

## Windows Installation

### Option 1: Using Docker (Recommended)

1. Install Docker Desktop for Windows
2. Run Redis container:
   ```bash
   docker run -d --name fusione-redis -p 6379:6379 redis:latest
   ```

### Option 2: Using WSL2

1. Install WSL2 and Ubuntu
2. In Ubuntu terminal:
   ```bash
   sudo apt update
   sudo apt install redis-server
   sudo service redis-server start
   ```

### Option 3: Using Redis for Windows

1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`

## Verification

Test Redis connection:
```bash
# Using redis-cli
redis-cli ping
# Should return: PONG
```

## Configuration

The system will automatically connect to Redis using the settings in `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Troubleshooting

- **Connection refused**: Make sure Redis server is running
- **Authentication failed**: Check REDIS_PASSWORD in .env
- **Wrong database**: Verify REDIS_DB number

## Features Available with Redis

- Session caching
- API response caching
- Module state persistence
- Rate limiting storage
- WebSocket session management

The system will continue to work without Redis, but with reduced performance and no caching capabilities.