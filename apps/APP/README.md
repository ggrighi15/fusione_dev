# Configuração do Supabase

Este projeto contém scripts auxiliares para inicializar um novo projeto no Supabase e configurar autenticação.

## Status do Projeto: FusioneCore

- **Project Ref**: `qlhshypgcbgggvvnwojb`
- **API URL**: `https://qlhshypgcbgggvvnwojb.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaHNoeXBnY2JnZ2d2dm53b2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTI0OTYsImV4cCI6MjA3ODU2ODQ5Nn0.LvA4qzjZGtKVHVRihzInVP3hWNrIrFdzy6NUctRUJiM`

## Como Usar

### 1. Inicializar Projeto (Setup)
*Já concluído. Projeto "FusioneCore" encontrado.*

### 2. Configurar Autenticação (Auth)

Execute o comando abaixo para configurar seus provedores (GitHub, Apple, Azure). Você precisará dos **Client IDs** e **Secrets** de cada provedor.

```bash
# PowerShell
$env:SUPABASE_ACCESS_TOKEN="sbp_155ab7e8fb236c0848769c4d9f1fcc11982ad946"
$env:PROJECT_REF="qlhshypgcbgggvvnwojb"

node scripts/config-auth.js
```

### 3. Configurar Frontend (Web)

Crie ou atualize o arquivo `.env` na pasta `apps/web`:

```env
VITE_SUPABASE_URL=https://qlhshypgcbgggvvnwojb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaHNoeXBnY2JnZ2d2dm53b2piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5OTI0OTYsImV4cCI6MjA3ODU2ODQ5Nn0.LvA4qzjZGtKVHVRihzInVP3hWNrIrFdzy6NUctRUJiM
```

Certifique-se de que o arquivo `apps/web/src/lib/supabase.ts` use essas variáveis:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
```
