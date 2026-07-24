-- Fase 7 — pagamentos e subscrições

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  client_id uuid references public.profiles(id) on delete set null,
  customer_email text,
  amount_total integer not null default 0,
  currency text not null default 'eur',
  status text not null default 'unpaid',
  plan_name text,
  billing_type text check (billing_type in ('single','monthly')),
  invoice_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  stripe_subscription_id text unique not null,
  client_id uuid references public.profiles(id) on delete set null,
  plan_name text not null,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;

create policy "Clients can view own payments"
on public.payments for select
using (auth.uid() = client_id);

create policy "Clients can view own subscriptions"
on public.subscriptions for select
using (auth.uid() = client_id);

create policy "Admins can view all payments"
on public.payments for select
using (public.is_admin());

create policy "Admins can view all subscriptions"
on public.subscriptions for select
using (public.is_admin());
