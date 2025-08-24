# Fusione Core System

![Fusione Logo](https://img.shields.io/badge/Fusione-Core%20System-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)
![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square)

Um sistema modular e escalável construído em Node.js, projetado para fornecer uma base sólida para aplicações empresariais modernas.

## 🚀 Características Principais

- **Arquitetura Modular**: Sistema baseado em módulos independentes e reutilizáveis
- **Event-Driven**: Comunicação assíncrona através de Event Bus
- **Cache Inteligente**: Sistema de cache Redis com TTL configurável
- **Banco de Dados**: Suporte completo ao MongoDB com validação de esquemas
- **Autenticação JWT**: Sistema seguro de autenticação e autorização
- **API RESTful**: Endpoints bem documentados com validação automática
- **Monitoramento**: Métricas em tempo real e sistema de logs estruturados
- **Containerização**: Suporte completo ao Docker e Kubernetes
- **Testes Automatizados**: Cobertura completa de testes unitários
- **Deploy Automatizado**: Scripts de deploy para diferentes ambientes

## 📋 Pré-requisitos

- **Node.js** 18.0.0 ou superior
- **npm** 8.0.0 ou superior
- **Docker** 20.0.0 ou superior (opcional)
- **Docker Compose** 2.0.0 ou superior (opcional)
- **MongoDB** 7.0 ou superior
- **Redis** 7.0 ou superior

## 🛠️ Instalação

### Instalação Local

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/fusione-core-system.git
cd fusione-core-system

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Execute as migrações (se necessário)
npm run migrate

# Inicie a aplicação
npm start
```

### Instalação com Docker

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/fusione-core-system.git
cd fusione-core-system

# Configure as variáveis de ambiente
cp .env.example .env

# Inicie todos os serviços
docker-compose up -d

# Verifique o status
docker-compose ps
```

## 🏗️ Arquitetura

```
Fusione Core System
├── Core Components
│   ├── Module Manager    # Gerenciamento de módulos
│   ├── Event Bus        # Sistema de eventos
│   ├── Config Manager   # Gerenciamento de configurações
│   ├── Health Check     # Monitoramento de saúde
│   └── Logger          # Sistema de logging
├── API Layer           # Interface REST
├── Modules             # Módulos dinâmicos
└── Configuration       # Arquivos de configuração
```

## 🚀 Início Rápido

### Pré-requisitos

- Node.js >= 18.0.0
- npm ou yarn

### Instalação

1. **Clone o repositório**
   ```bash
   git clone <repository-url>
   cd fusione-core-system
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure o ambiente**
   ```bash
   cp .env.example .env
   # Edite o arquivo .env conforme necessário
   ```

4. **Inicie o sistema**
   ```bash
   npm start
   ```

### Desenvolvimento

```bash
# Modo de desenvolvimento com watch
npm run dev

# Executar testes
npm test

# Linting
npm run lint

# Formatação de código
npm run format
```

## 📁 Estrutura do Projeto

```
fusione-core-system/
├── src/
│   ├── core/                 # Componentes principais
│   │   ├── config-manager.js # Gerenciador de configurações
│   │   ├── event-bus.js      # Sistema de eventos
│   │   ├── health-check.js   # Health checks
│   │   ├── logger.js         # Sistema de logging
│   │   └── module-manager.js # Gerenciador de módulos
│   ├── modules/              # Módulos dinâmicos
│   ├── routes/               # Rotas da API
│   │   └── api.js           # Rotas principais da API
│   └── index.js             # Ponto de entrada principal
├── config/                   # Arquivos de configuração
├── logs/                     # Arquivos de log (produção)
├── tests/                    # Testes
├── .env.example             # Exemplo de variáveis de ambiente
├── package.json             # Dependências e scripts
└── README.md               # Este arquivo
```

## 🔧 Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do servidor | `3000` |
| `HOST` | Host do servidor | `localhost` |
| `NODE_ENV` | Ambiente de execução | `development` |
| `LOG_LEVEL` | Nível de logging | `info` |
| `DEBUG_EVENTS` | Debug de eventos | `false` |
| `ALLOWED_ORIGINS` | Origens permitidas para CORS | `http://localhost:3000` |

### Arquivos de Configuração

O sistema suporta configurações em arquivos JSON:

- `config/default.json` - Configurações padrão
- `config/development.json` - Configurações de desenvolvimento
- `config/production.json` - Configurações de produção

## 📡 API

### Endpoints Principais

#### Sistema
- `GET /` - Informações básicas do sistema
- `GET /health` - Status de saúde do sistema
- `GET /api/system/info` - Informações detalhadas do sistema

#### Módulos
- `GET /api/modules` - Lista todos os módulos carregados
- `GET /api/modules/:name` - Informações de um módulo específico
- `POST /api/modules/:name/reload` - Recarrega um módulo

#### Configurações
- `GET /api/config` - Todas as configurações
- `GET /api/config/:key` - Configuração específica
- `PUT /api/config/:key` - Atualiza configuração

#### Eventos
- `GET /api/events/stats` - Estatísticas de eventos
- `GET /api/events/history` - Histórico de eventos
- `POST /api/events/emit` - Emite um evento

### Exemplo de Resposta da API

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "name": "Fusione Core System",
    "version": "1.0.0",
    "status": "running"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🧩 Desenvolvimento de Módulos

### Estrutura de um Módulo

```
src/modules/meu-modulo/
├── index.js      # Classe principal do módulo
├── module.json   # Configuração do módulo
└── ...
```

### Exemplo de Módulo

**module.json**
```json
{
  "name": "meu-modulo",
  "version": "1.0.0",
  "description": "Descrição do meu módulo",
  "dependencies": [],
  "config": {
    "enabled": true
  }
}
```

**index.js**
```javascript
export default class MeuModulo {
  constructor({ eventBus, logger, config }) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.config = config;
  }

  async initialize() {
    this.logger.info('Módulo inicializado');
    
    // Registrar listeners de eventos
    this.eventBus.on('system:started', this.onSystemStarted.bind(this));
  }

  async cleanup() {
    this.logger.info('Módulo finalizado');
  }

  onSystemStarted(data) {
    this.logger.info('Sistema iniciado', data);
  }

  getInfo() {
    return {
      status: 'active',
      customData: 'valor'
    };
  }
}
```

## 📊 Monitoramento

### Health Checks

O sistema inclui health checks automáticos para:

- **Memória**: Monitora uso de heap
- **Uptime**: Tempo de atividade do sistema
- **Carga do Sistema**: Monitoramento de CPU
- **Módulos Customizados**: Health checks específicos de módulos

### Logging

Sistema de logging estruturado com níveis:

- `error` - Erros críticos
- `warn` - Avisos
- `info` - Informações gerais
- `debug` - Informações de debug

## 🔒 Segurança

- **Helmet**: Proteção contra vulnerabilidades comuns
- **CORS**: Controle de acesso entre origens
- **Validação**: Validação de entrada com Joi
- **Rate Limiting**: (Recomendado para produção)
- **Autenticação**: (Implementar conforme necessário)

## 🚀 Deploy

### Produção

1. **Configurar variáveis de ambiente**
   ```bash
   export NODE_ENV=production
   export PORT=3000
   export LOG_LEVEL=warn
   ```

2. **Instalar dependências de produção**
   ```bash
   npm ci --only=production
   ```

3. **Iniciar aplicação**
   ```bash
   npm start
   ```

### Docker (Exemplo)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY config/ ./config/

EXPOSE 3000

CMD ["npm", "start"]
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Autores

- **Gustavo Righi** - *Desenvolvimento inicial* - [gustavorighi@gmail.com](mailto:gustavorighi@gmail.com)

## 🙏 Agradecimentos

- Comunidade Node.js
- Contribuidores do projeto
- Bibliotecas e ferramentas utilizadas

---

**Fusione Core System** - Sistema modular para o futuro 🚀#   f u s i o n e - c o r e - s y s t e m 
 
 