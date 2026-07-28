create table if not exists public.ai_requests(
id uuid primary key default gen_random_uuid(),
customer_id uuid references public.customers(id) on delete set null,
agent_type text not null default 'general',
prompt text not null,
answer text,
status text not null default 'completed',
created_at timestamptz not null default now()
);
alter table public.ai_requests enable row level security;
