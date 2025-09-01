# Fusione Core System - Dockerfile
# Multi-stage build para otimizar o tamanho da imagem com Oracle JDK 24

# Estágio 1: Build
FROM node:18-alpine AS builder

# Instalar dependências necessárias para Oracle JDK
RUN apk add --no-cache \
    glibc-compat \
    libstdc++ \
    curl \
    bash

# Definir diretório de trabalho
WORKDIR /app

# Copiar Oracle JDK 24 binários
COPY dp/oracleJdk-24 /opt/java/openjdk

# Configurar variáveis de ambiente Java
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="$JAVA_HOME/bin:$PATH"
ENV JAVA_VERSION=24.0.2

# Verificar instalação do Java
RUN java -version && javac -version

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Executar build script com Oracle JDK 24
RUN npm run build

# Criar usuário não-root
RUN addgroup -g 1001 -S fusione && \
    adduser -S fusione -u 1001

# Estágio 2: Runtime
FROM node:18-alpine AS runtime

# Instalar dependências do sistema incluindo suporte para Oracle JDK
RUN apk add --no-cache \
    dumb-init \
    curl \
    glibc-compat \
    libstdc++ \
    bash \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root
RUN addgroup -g 1001 -S fusione && \
    adduser -S fusione -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar Oracle JDK 24 do estágio de build
COPY --from=builder /opt/java/openjdk /opt/java/openjdk

# Copiar aplicação construída do estágio de build
COPY --from=builder --chown=fusione:fusione /app/build /app
COPY --from=builder --chown=fusione:fusione /app/package*.json /app/

# Criar diretórios necessários
RUN mkdir -p /app/logs /app/data /app/temp && \
    chown -R fusione:fusione /app

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV LOG_DIR=/app/logs
ENV DATA_DIR=/app/data
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="$JAVA_HOME/bin:$PATH"
ENV JAVA_VERSION=24.0.2
ENV JDK_VENDOR="Oracle Corporation"
ENV TEMP_DIR=/app/temp

# Portas expostas
EXPOSE 3000 6379 27017

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Mudar para usuário não-root
USER fusione

# Comando de inicialização
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]