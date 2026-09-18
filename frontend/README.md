# Frontend

This folder contains the CP Giraneza Health browser application.

- `src/App.tsx` contains the routes and UI components.
- `src/main.tsx` starts the React application.
- `src/index.css` contains the frontend styles.
- `src/lib/supabase.ts` contains the browser-side Supabase client.

From the project root, run `npm run dev` or build with `npm run build`. These commands delegate to the `frontend` application. You can also run the same commands from this folder.

## Configure Supabase

1. Copy `.env.example` to `.env`.
2. Replace both placeholder values with the Supabase project URL and anon key.
3. Run `backend/schema.sql`, then `backend/admin_rls.sql`, `backend/registration_workflow.sql`, and `backend/security_hardening.sql` in the Supabase SQL editor.
4. Restart Vite after changing `.env`.

Create an account through `/register`. When email confirmation is disabled, the user is signed in immediately and sent to the registration workspace. When confirmation is enabled, the verification screen is shown first.

To grant an existing account administrator access, run this in Supabase:

```sql
update public.profiles
set role = 'ADMIN', updated_at = now()
where email = 'your-admin-email@example.com';
```
