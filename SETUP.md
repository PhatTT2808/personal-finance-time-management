# Quản lý cá nhân — Setup & Deployment

Personal Finance & Time Management web app built with Next.js (App Router),
TypeScript, Tailwind CSS, shadcn/ui and Supabase (Auth + Postgres).

## 1. Prerequisites

- Node.js 18+ (project was built and tested on Node 24 LTS)
- A free Supabase project (https://supabase.com)

## 2. Environment variables

Create a file named `.env.local` in the project root (copy from
`.env.local.example`) and fill in the values from your Supabase project
(Supabase Dashboard → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both variables are public (anon) keys. Row Level Security protects the data.

## 3. Supabase database setup

1. Open your Supabase project → SQL Editor → New query.
2. Paste the entire contents of `supabase/schema.sql` and run it.

This creates four tables (`profiles`, `transactions`, `time_blocks`, `todos`)
with:

- UUID primary keys
- `user_id` referencing `auth.users(id)`
- `created_at` / `updated_at` (auto-updated via trigger)
- Row Level Security enabled
- Per-user select/insert/update/delete policies (each user only sees their own
  data)
- A trigger that auto-creates a `profiles` row on signup

### Auth settings

- Email/password auth is used. In Supabase → Authentication → Providers, make
  sure Email is enabled.
- For quick local testing you can disable "Confirm email" (Authentication →
  Sign In / Providers → Email) so new accounts log in immediately. If you keep
  email confirmation on, the confirmation link redirects to `/auth/callback`.

## 4. Run locally

```
npm install
npm run dev
```

Open http://localhost:3000 — you will be redirected to `/login`. Register a new
account, then you are taken to the dashboard.

Useful scripts:

```
npm run lint    # ESLint
npm run build   # Production build
```

## 5. Deploy to Vercel

1. Push this project to a Git repository (GitHub/GitLab/Bitbucket).
2. In Vercel, click "New Project" and import the repository.
3. Framework preset: Next.js (auto-detected). No build settings changes needed.
4. Add the environment variables under Project Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy.
6. In Supabase → Authentication → URL Configuration, add your Vercel domain to
   "Site URL" and "Redirect URLs" (e.g. `https://your-app.vercel.app` and
   `https://your-app.vercel.app/auth/callback`).

## 6. Project structure

```
app/
  (auth)/login, (auth)/register        # Public auth pages
  (dashboard)/dashboard                # Summary dashboard
  (dashboard)/transactions             # Income/expense CRUD + filters
  (dashboard)/time-blocks              # Time block CRUD + day/week hours
  (dashboard)/todos                    # Todo CRUD + today/overdue grouping
  (dashboard)/settings                 # Account info + logout
  auth/callback                        # Email confirmation handler
components/
  layout/                              # Sidebar, nav, header, logout
  transactions/ todos/ time-blocks/    # Feature components (dialogs, items)
  dashboard/                           # Dashboard widgets
  ui/                                  # shadcn/ui components
lib/
  supabase/                            # Browser/server clients + middleware
  constants.ts                         # Categories + Vietnamese labels
  format.ts                            # Currency/date/time/hours helpers
types/database.ts                      # Row type definitions
supabase/schema.sql                    # Database schema + RLS policies
middleware.ts                          # Route protection
```

## 7. Notes

- UI text is in Vietnamese; all code, variables and database columns are in
  English.
- Authentication is enforced both in middleware and in the dashboard layout, and
  data isolation is enforced by Supabase RLS — every query only returns the
  signed-in user's rows.
