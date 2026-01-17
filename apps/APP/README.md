# Configuração do Supabase

Este projeto contém scripts auxiliares para inicializar um novo projeto no Supabase e configurar autenticação.

## Status do Projeto: FusioneCore

- **Project Ref**: `<project-ref>`
- **API URL**: `https://<project-ref>.supabase.co`
- **Anon Key**: `REDACTED_JWT`

## Como Usar

### 1. Inicializar Projeto (Setup)
*Já concluído. Projeto "FusioneCore" encontrado.*

### 2. Configurar Autenticação (Auth)

Execute o comando abaixo para configurar seus provedores (GitHub, Apple, Azure). Você precisará dos **Client IDs** e **Secrets** de cada provedor.

```bash
# PowerShell
$env:SUPABASE_ACCESS_TOKEN="REPLACE_ME"
$env:PROJECT_REF="<project-ref>"

node scripts/config-auth.js
```

### 3. Configurar Frontend (Web)

Crie ou atualize o arquivo `.env` na pasta `apps/web`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=REPLACE_ME
```

Certifique-se de que o arquivo `apps/web/src/lib/supabase.ts` use essas variáveis:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
```
