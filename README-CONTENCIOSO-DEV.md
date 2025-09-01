# Container de Desenvolvimento - Módulo Contencioso

## 📋 Visão Geral

Este documento descreve como usar o container de desenvolvimento específico para o módulo **Contencioso** do Fusione Core System. O container foi otimizado para desenvolvimento com hot reload, debugging e isolamento do módulo.

## 🚀 Início Rápido

### 1. Iniciar o Container de Desenvolvimento

```bash
# Iniciar apenas o container do contencioso
docker-compose up contencioso-dev

# Ou iniciar em background
docker-compose up -d contencioso-dev

# Ou usar o profile de desenvolvimento completo
docker-compose --profile development up -d
```

### 2. Usar Scripts NPM

```bash
# Desenvolvimento local (sem Docker)
npm run dev:contencioso

# Com watch específico do módulo
npm run dev:contencioso:watch

# Executar container via npm
npm run docker:run:contencioso
```

## 🔧 Configuração

### Portas Expostas

- **3002**: API do módulo contencioso
- **9229**: Porta de debug (Node.js Inspector)

### Variáveis de Ambiente

```env
NODE_ENV=development
LOG_LEVEL=debug
MODULE_FOCUS=contencioso
HOT_RELOAD=true
DEBUG_MODE=true
JWT_SECRET=fusione-dev-secret
```

### Volumes Montados

```yaml
volumes:
  - ./src/modules/contencioso-module:/app/src/modules/contencioso-module
  - ./src/core:/app/src/core
  - ./src/middleware:/app/src/middleware
  - ./src/models:/app/src/models
  - ./config:/app/config
  - ./data:/app/data
  - ./logs/contencioso:/app/logs
```

## 🛠️ Desenvolvimento

### Hot Reload

O container está configurado com **nodemon** para reinicialização automática quando arquivos são modificados:

- Monitora: `src/modules/contencioso-module/**/*`
- Reinicia automaticamente o servidor
- Preserva estado do banco de dados

### Debugging

#### VS Code

1. Adicione esta configuração ao `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "attach",
  "name": "Docker: Contencioso",
  "remoteRoot": "/app",
  "localRoot": "${workspaceFolder}",
  "port": 9229,
  "restart": true,
  "skipFiles": ["<node_internals>/**"]
}
```

2. Inicie o container
3. Execute "Docker: Contencioso" no debugger

#### Chrome DevTools

1. Abra `chrome://inspect`
2. Clique em "Configure" e adicione `localhost:9229`
3. Clique em "inspect" no target remoto

### Logs

```bash
# Ver logs em tempo real
docker-compose logs -f contencioso-dev

# Ver logs específicos
npm run docker:logs:contencioso

# Logs salvos em arquivo
tail -f logs/contencioso/contencioso-dev.log
```

## 🧪 Testes

```bash
# Executar testes do módulo contencioso
npm run test:contencioso

# Testes com watch
npm run test:watch -- --testPathPattern=contencioso

# Dentro do container
docker-compose exec contencioso-dev npm run test:contencioso
```

## 📊 Monitoramento

### Health Check

- **URL**: `http://localhost:3002/api/v1/contencioso/health`
- **Intervalo**: 30 segundos
- **Timeout**: 10 segundos
- **Tentativas**: 3

### Métricas

- **Endpoint**: `http://localhost:3002/api/v1/contencioso/metrics`
- **Formato**: Prometheus

## 🗄️ Banco de Dados

### Desenvolvimento

- **Tipo**: SQLite
- **Arquivo**: `data/contencioso-dev.db`
- **Auto-migração**: Habilitada
- **Dados de teste**: Carregados automaticamente

### Comandos Úteis

```bash
# Resetar banco de dados
rm data/contencioso-dev.db
docker-compose restart contencioso-dev

# Backup do banco
cp data/contencioso-dev.db data/contencioso-dev-backup.db

# Executar migrações
docker-compose exec contencioso-dev npm run migrate
```

## 📁 Estrutura de Arquivos

```
src/modules/contencioso-module/
├── index.js                 # Ponto de entrada do módulo
├── routes.js               # Definição de rotas
├── controllers/            # Controladores
│   ├── processos.js
│   ├── audiencias.js
│   └── documentos.js
├── models/                 # Modelos de dados
│   ├── Processo.js
│   ├── Audiencia.js
│   └── Documento.js
├── services/               # Serviços de negócio
│   ├── ProcessoService.js
│   ├── TribunalService.js
│   └── NotificacaoService.js
├── middleware/             # Middlewares específicos
├── utils/                  # Utilitários
├── tests/                  # Testes do módulo
└── config/                 # Configurações específicas
```

## 🔧 Comandos de Manutenção

```bash
# Rebuild do container
docker-compose build contencioso-dev

# Rebuild sem cache
docker-compose build --no-cache contencioso-dev

# Parar container
docker-compose stop contencioso-dev

# Remover container
docker-compose rm contencioso-dev

# Limpar volumes
docker-compose down -v

# Verificar status
docker-compose ps contencioso-dev
```

## 🐛 Troubleshooting

### Container não inicia

1. Verificar logs: `docker-compose logs contencioso-dev`
2. Verificar portas em uso: `netstat -tulpn | grep :3002`
3. Rebuild: `docker-compose build --no-cache contencioso-dev`

### Hot reload não funciona

1. Verificar volumes montados
2. Verificar permissões de arquivo
3. Reiniciar container: `docker-compose restart contencioso-dev`

### Debug não conecta

1. Verificar porta 9229 disponível
2. Verificar firewall
3. Testar conexão: `telnet localhost 9229`

### Performance lenta

1. Verificar recursos do Docker
2. Otimizar volumes (evitar node_modules)
3. Usar .dockerignore apropriado

## 📚 Recursos Adicionais

- [Documentação do Módulo Contencioso](./docs/contencioso/README.md)
- [API Documentation](./API-DOCUMENTATION.md)
- [Guia de Instalação Completo](./GUIA_INSTALACAO_COMPLETO.md)
- [Docker Compose Reference](https://docs.docker.com/compose/)

## 🤝 Contribuição

Para contribuir com o desenvolvimento do módulo contencioso:

1. Use o container de desenvolvimento
2. Siga as convenções de código
3. Execute testes antes de commit
4. Documente mudanças significativas

---

**Desenvolvido por**: Gustavo Righi  
**Projeto**: Fusione Core System  
**Módulo**: Contencioso Development Container