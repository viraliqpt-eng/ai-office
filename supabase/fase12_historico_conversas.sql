-- Fase 12 — Histórico de conversas
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null default 'Nova conversa',
  agent_type text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_requests
  add column if not exists conversation_id uuid
  references public.ai_conversations(id)
  on delete cascade;

create index if not exists ai_conversations_customer_id_idx
on public.ai_conversations(customer_id);

create index if not exists ai_conversations_updated_at_idx
on public.ai_conversations(updated_at desc);

create index if not exists ai_requests_conversation_id_idx
on public.ai_requests(conversation_id);

alter table public.ai_conversations enable row level security;
alter table public.ai_requests enable row level security;

drop policy if exists "Cliente consulta conversas próprias" on public.ai_conversations;
create policy "Cliente consulta conversas próprias"
on public.ai_conversations
for select
to authenticated
using (
  customer_id in (
    select id from public.customers
    where auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Cliente consulta pedidos IA próprios" on public.ai_requests;
create policy "Cliente consulta pedidos IA próprios"
on public.ai_requests
for select
to authenticated
using (
  customer_id in (
    select id from public.customers
    where auth_user_id = (select auth.uid())
  )
);
