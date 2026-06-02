# Quản lý cá nhân

Personal Finance & Time Management web app for a small group of users.
Track expenses, income, time blocks, and todos, with a weekly/monthly dashboard.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth + Postgres (with Row Level Security)
- Deploy target: Vercel

## Features

- Email/password authentication; every page is protected and each user only
  sees their own data (enforced by middleware + Supabase RLS).
- Transactions: add/edit/delete income & expense, filter by month and type,
  totals for income, expense and balance.
- Time blocks: add/edit/delete, with total hours by day and week.
- Todos: add/edit/delete, mark done, grouped into overdue / today / upcoming.
- Dashboard: monthly income/expense/balance, today's focus hours, pending and
  overdue todos, recent transactions, today's schedule, weekly time summary, and
  an expense-by-category breakdown.

## Getting started

See [SETUP.md](./SETUP.md) for full setup, the Supabase SQL to run, environment
variables, local development, and Vercel deployment instructions.

```bash
npm install
# create .env.local from .env.local.example and add your Supabase keys
# run supabase/schema.sql in the Supabase SQL editor
npm run dev
```

The UI is in Vietnamese; all code, variables, and database columns are in
English.
