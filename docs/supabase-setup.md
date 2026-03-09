# Supabase Setup

## Decision

This project does not need a separate PostgreSQL service if you use Supabase.
Supabase already runs on PostgreSQL, so it covers:

- users and authentication
- relational data for content and blog
- storage for images and videos
- row-level security

Add a separate PostgreSQL server only if you later need:

- self-hosted database outside Supabase
- heavy custom extensions not available in your Supabase tier
- isolated analytics/warehouse workloads

## What was prepared in the codebase

- Supabase client config in [`src/lib/supabase.js`](/D:/PROJECTS/src/lib/supabase.js)
- Env template in [`.env.example`](/D:/PROJECTS/.env.example)
- Database schema in [`supabase/schema.sql`](/D:/PROJECTS/supabase/schema.sql)
- RLS and storage policies in [`supabase/policies.sql`](/D:/PROJECTS/supabase/policies.sql)
- App state ready to use Supabase when env vars are present in [`src/state/AppState.jsx`](/D:/PROJECTS/src/state/AppState.jsx)

## What you need to do in your Supabase account

1. Create a new Supabase project.
2. In `Project Settings -> API`, copy:
   - `Project URL`
   - `Publishable key`
3. Create a local `.env` file from [`.env.example`](/D:/PROJECTS/.env.example).
4. Paste:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

If your dashboard still shows legacy keys, `VITE_SUPABASE_ANON_KEY` also works, but the current Supabase UI prefers the publishable key.

5. In Supabase SQL Editor, run [`supabase/schema.sql`](/D:/PROJECTS/supabase/schema.sql).
6. Then run [`supabase/policies.sql`](/D:/PROJECTS/supabase/policies.sql).
7. In `Authentication -> Sign In / Providers`, enable Email provider.
8. Create your first admin user from `Authentication -> Users`.
9. In SQL Editor, promote that user to admin:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_ADMIN_EMAIL';
```

10. Restart dev server:

```powershell
npm run dev
```

## Current limits

This repo now supports:

- admin login with Supabase email/password
- site content persistence in Supabase
- profile listing and role/status updates from the admin panel
- media upload to Supabase Storage for home images

Still recommended next:

- a server-side admin workflow for creating users safely
- blog CRUD UI
- video upload UI and metadata handling
- audit logging for admin actions
