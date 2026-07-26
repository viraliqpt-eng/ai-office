create extension if not exists "pgcrypto";

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  email text unique,
  company text,
  phone text,
  nif text,
  sector text,
  status text default 'ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  stripe_session_id text unique not null,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  customer_email text,
  customer_name text,
  company text,
  plan_name text,
  billing_type text,
  amount_total integer default 0,
  currency text default 'eur',
  payment_status text,
  order_status text default 'novo',
  description text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  stripe_payment_intent_id text,
  customer_email text,
  amount_total integer default 0,
  currency text default 'eur',
  status text,
  plan_name text,
  billing_type text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique references public.orders(id) on delete cascade,
  title text not null,
  description text,
  status text default 'por_iniciar',
  priority text default 'normal',
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.tasks enable row level security;
