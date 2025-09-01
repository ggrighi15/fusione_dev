# Guia de Deploy - Fusione Core System

Este guia fornece instruções detalhadas para fazer deploy do Fusione Core System em diferentes ambientes.

## 📋 Pré-requisitos para Deploy

- Servidor com Node.js 18+
- Nginx ou Apache (para servir arquivos estáticos)
- PM2 (para gerenciamento de processos)
- Git (para clonagem do repositório)

## 🚀 Deploy em Servidor Linux (Ubuntu/Debian)

### 1. Preparação do Servidor

```bash
# Atualize o sistema
sudo apt update && sudo apt upgrade -y

# Instale Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instale PM2 globalmente
sudo npm install -g pm2

# Instale Nginx
sudo apt install nginx -y

# Instale Git
sudo apt install git -y
```

### 2. Clone e Configuração

```bash
# Clone o repositório
git clone https://github.com/ggrighi15/fusione_dev.git
cd fusione_dev

# Execute o script de instalação
chmod +x install.sh
./install.sh

# Ou instale manualmente
npm run install:all
npm run build:frontend
```

### 3. Configuração do Nginx

Crie um arquivo de configuração:

```bash
sudo nano /etc/nginx/sites-available/fusione
```

Adicione a configuração:

```nginx
server {
    listen 80;
    server_name seu-dominio.com www.seu-dominio.com;
    
    # Servir arquivos estáticos do frontend
    location / {
        root /caminho/para/fusione_dev/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy para API do backend (se houver)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Configurações de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src * data: 'unsafe-eval' 'unsafe-inline'" always;
    
    # Compressão
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}
```

Ative o site:

```bash
sudo ln -s /etc/nginx/sites-available/fusione /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Configuração do PM2 (se houver backend)

```bash
# Crie um arquivo de configuração PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'fusione-backend',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

# Inicie a aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🐳 Deploy com Docker

### 1. Dockerfile para Frontend

Crie `frontend/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Docker Compose

Crie `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    restart: unless-stopped
    
  # Adicione outros serviços conforme necessário
  # backend:
  #   build: .
  #   ports:
  #     - "3001:3001"
  #   environment:
  #     - NODE_ENV=production
  #   restart: unless-stopped
```

### 3. Deploy com Docker

```bash
# Build e start
docker-compose -f docker-compose.prod.yml up -d --build

# Verificar logs
docker-compose -f docker-compose.prod.yml logs -f

# Parar
docker-compose -f docker-compose.prod.yml down
```

## ☁️ Deploy em Serviços Cloud

### Vercel (Frontend)

1. Conecte seu repositório GitHub ao Vercel
2. Configure o build:
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/build`
   - Install Command: `cd frontend && npm install`

### Netlify (Frontend)

1. Conecte seu repositório GitHub ao Netlify
2. Configure o build:
   - Build command: `cd frontend && npm run build`
   - Publish directory: `frontend/build`

### Heroku (Fullstack)

Crie `Procfile`:
```
web: npm start
```

Configure scripts no `package.json`:
```json
{
  "scripts": {
    "heroku-postbuild": "cd frontend && npm install && npm run build",
    "start": "node src/index.js"
  }
}
```

## 🔧 Configurações de Produção

### Variáveis de Ambiente

Crie `.env.production`:

```env
NODE_ENV=production
PORT=3001

# Database
# Database configuration removed - MongoDB and Redis no longer used

# Security
JWT_SECRET=seu-jwt-secret-muito-seguro
SESSION_SECRET=seu-session-secret-muito-seguro

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app

# Frontend URL
FRONTEND_URL=https://seu-dominio.com
```

### SSL/HTTPS com Let's Encrypt

```bash
# Instale Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenha certificado SSL
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Configure renovação automática
sudo crontab -e
# Adicione: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoramento

### PM2 Monitoring

```bash
# Monitorar processos
pm2 monit

# Ver logs
pm2 logs

# Restart aplicação
pm2 restart fusione-backend

# Reload (zero downtime)
pm2 reload fusione-backend
```

### Logs do Nginx

```bash
# Logs de acesso
sudo tail -f /var/log/nginx/access.log

# Logs de erro
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Atualizações

### Script de Atualização

Crie `update.sh`:

```bash
#!/bin/bash
echo "Atualizando Fusione Core System..."

# Backup
cp -r frontend/build frontend/build.backup.$(date +%Y%m%d_%H%M%S)

# Atualizar código
git pull origin main

# Instalar dependências
cd frontend
npm install

# Gerar novo build
npm run build

# Restart serviços
sudo systemctl reload nginx
# pm2 reload fusione-backend  # Se houver backend

echo "Atualização concluída!"
```

## 🛡️ Segurança

### Firewall

```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Backup

```bash
# Script de backup
#!/bin/bash
BACKUP_DIR="/backup/fusione/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup do código
tar -czf $BACKUP_DIR/code.tar.gz /caminho/para/fusione_dev

# Backup do banco (se houver)
# Database backup commands removed - MongoDB no longer used

echo "Backup concluído em $BACKUP_DIR"
```

## 📞 Suporte

Para problemas de deploy:

1. Verifique os logs: `pm2 logs`, `sudo journalctl -u nginx`
2. Teste a configuração: `sudo nginx -t`
3. Verifique portas: `sudo netstat -tlnp`
4. Monitore recursos: `htop`, `df -h`

---

**Nota**: Adapte as configurações conforme seu ambiente específico.