# Configuração do Git e GitHub

Este guia ajudará você a configurar o Git e publicar o projeto no GitHub.

## 1. Instalação do Git

### Windows
1. Baixe o Git de: https://git-scm.com/download/win
2. Execute o instalador e siga as instruções
3. Reinicie o terminal/PowerShell

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install git
```

### Linux (CentOS/RHEL)
```bash
sudo yum install git
# ou para versões mais recentes:
sudo dnf install git
```

### macOS
```bash
# Usando Homebrew
brew install git

# Ou baixe de: https://git-scm.com/download/mac
```

## 2. Configuração Inicial do Git

Após instalar o Git, configure suas informações:

```bash
# Configure seu nome e email
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"

# Verifique a configuração
git config --list
```

## 3. Inicialização do Repositório

No diretório do projeto (`fusione-core-system`), execute:

```bash
# Inicialize o repositório Git
git init

# Adicione todos os arquivos
git add .

# Faça o commit inicial
git commit -m "Initial commit: Fusione Core System"
```

## 4. Configuração do GitHub

### Opção A: Usando GitHub CLI (Recomendado)

1. Instale o GitHub CLI:
   - Windows: https://cli.github.com/
   - Linux/Mac: https://github.com/cli/cli#installation

2. Faça login:
   ```bash
   gh auth login
   ```

3. Crie o repositório:
   ```bash
   gh repo create fusione_dev --public --source=. --remote=origin --push
   ```

### Opção B: Manualmente

1. Acesse https://github.com/new
2. Crie um repositório chamado `fusione_dev`
3. **NÃO** inicialize com README, .gitignore ou licença
4. Copie a URL do repositório

5. No terminal, adicione o remote:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/fusione_dev.git
   git branch -M main
   git push -u origin main
   ```

## 5. Verificação

Para verificar se tudo está funcionando:

```bash
# Verifique o status
git status

# Verifique os remotes
git remote -v

# Verifique o histórico
git log --oneline
```

## 6. Comandos Úteis para o Futuro

```bash
# Adicionar mudanças
git add .
git commit -m "Descrição das mudanças"
git push

# Verificar mudanças
git status
git diff

# Criar uma nova branch
git checkout -b nova-feature

# Voltar para a main
git checkout main

# Fazer merge de uma branch
git merge nova-feature

# Atualizar do repositório remoto
git pull
```

## 7. Estrutura de Commits Recomendada

Use mensagens de commit descritivas:

```bash
git commit -m "feat: adiciona nova funcionalidade X"
git commit -m "fix: corrige bug na autenticação"
git commit -m "docs: atualiza documentação"
git commit -m "style: melhora formatação do código"
git commit -m "refactor: reorganiza estrutura de pastas"
git commit -m "test: adiciona testes para módulo Y"
```

## 8. Arquivo .gitignore

O projeto já inclui um arquivo `.gitignore` configurado para:
- `node_modules/`
- Arquivos de build
- Variáveis de ambiente (`.env`)
- Arquivos de IDE
- Logs e cache

## 9. Solução de Problemas

### Erro: "Git não é reconhecido"
- Reinicie o terminal após instalar o Git
- Verifique se o Git foi adicionado ao PATH do sistema

### Erro de autenticação no GitHub
- Use um Personal Access Token em vez de senha
- Configure SSH keys para autenticação mais segura

### Conflitos de merge
```bash
# Resolva os conflitos manualmente nos arquivos
# Depois:
git add .
git commit -m "resolve: conflitos de merge"
```

## 10. Próximos Passos

Após configurar o Git:

1. Configure GitHub Actions para CI/CD
2. Adicione badges ao README
3. Configure branch protection rules
4. Adicione colaboradores se necessário

---

**Nota**: Este arquivo pode ser removido após a configuração inicial do Git.