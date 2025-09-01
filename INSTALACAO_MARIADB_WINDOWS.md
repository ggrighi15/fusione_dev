# Guia de Instalação do MariaDB no Windows

## Opção 1: Download Direto (Recomendado)

### 1. Baixar o MariaDB
- Acesse: https://mariadb.org/download/
- Selecione a versão mais recente (LTS recomendada)
- Escolha "Windows" como sistema operacional
- Baixe o arquivo MSI (Windows Installer)

### 2. Instalar o MariaDB
1. Execute o arquivo MSI baixado como administrador
2. Siga o assistente de instalação:
   - Aceite os termos de licença
   - Escolha "Complete" para instalação completa
   - **IMPORTANTE**: Defina uma senha para o usuário root
   - Anote a senha, você precisará dela para configurar o sistema
   - Marque "Enable access from remote machines" se necessário
   - Deixe a porta padrão 3306

### 3. Verificar a Instalação
Após a instalação, abra o Command Prompt como administrador e execute:
```cmd
mysql -u root -p
```
Digite a senha definida durante a instalação.

## Opção 2: XAMPP (Alternativa Simples)

### 1. Baixar XAMPP
- Acesse: https://www.apachefriends.org/download.html
- Baixe a versão mais recente para Windows

### 2. Instalar XAMPP
1. Execute o instalador como administrador
2. Selecione os componentes (certifique-se que MySQL está marcado)
3. Escolha o diretório de instalação (padrão: C:\xampp)
4. Complete a instalação

### 3. Iniciar o MariaDB
1. Abra o XAMPP Control Panel
2. Clique em "Start" ao lado de "MySQL" (que na verdade é MariaDB)
3. O serviço deve ficar verde quando ativo

## Configuração do Sistema Fusione

Após instalar o MariaDB por qualquer uma das opções:

### 1. Criar Banco de Dados
Conecte-se ao MariaDB e execute:
```sql
CREATE DATABASE fusione_system;
CREATE USER 'fusione_user'@'localhost' IDENTIFIED BY 'fusione_password';
GRANT ALL PRIVILEGES ON fusione_system.* TO 'fusione_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Configurar o .env
Edite o arquivo `.env` e altere:
```env
# Configurações do Banco de Dados MariaDB
DATABASE_ENABLED=true
MARIADB_HOST=localhost
MARIADB_PORT=3306
MARIADB_DATABASE=fusione_system
MARIADB_USERNAME=fusione_user
MARIADB_PASSWORD=fusione_password
MARIADB_CONNECTION_LIMIT=10
MARIADB_TIMEOUT=60000
```

### 3. Reiniciar o Sistema
Após configurar, reinicie o sistema Fusione:
```bash
npm start
```

## Solução de Problemas

### Erro de Conexão
- Verifique se o serviço MariaDB está rodando
- Confirme as credenciais no arquivo `.env`
- Teste a conexão manualmente: `mysql -u fusione_user -p fusione_system`

### Porta em Uso
- Se a porta 3306 estiver em uso, altere no `.env` e na configuração do MariaDB

### Permissões
- Execute os comandos como administrador
- Verifique se o firewall não está bloqueando a conexão

## Comandos Úteis

```bash
# Verificar status do serviço (Windows)
sc query mysql

# Iniciar serviço
net start mysql

# Parar serviço
net stop mysql

# Conectar ao MariaDB
mysql -u root -p

# Mostrar bancos de dados
SHOW DATABASES;

# Usar banco específico
USE fusione_system;

# Mostrar tabelas
SHOW TABLES;
```

---

**Nota**: O sistema Fusione está configurado para criar automaticamente as tabelas necessárias quando conectar pela primeira vez ao MariaDB.