# Supabase Setup (Optional)

This folder contains helper scripts to initialize and configure Supabase.
Supabase is optional in this repository and is not required by `fc_core` runtime.

## Security Rules

- Never commit real credentials in README/docs/scripts/json/md files.
- Keep real values only in secret stores or local `.env` files ignored by Git.
- Do not document `service_role` keys in repository files.

## Environment Placeholders

Use placeholders only:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=REPLACE_ME
SUPABASE_ACCESS_TOKEN=REPLACE_ME
PROJECT_REF=<project-ref>
```

## Auth Config Script

Run with secure local environment values:

```powershell
$env:SUPABASE_ACCESS_TOKEN="REPLACE_ME"
$env:PROJECT_REF="<project-ref>"
node scripts/config-auth.js
```

## Frontend Example

Set local env values in `apps/web/.env` (not committed):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=REPLACE_ME
```

Reference usage:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
```
