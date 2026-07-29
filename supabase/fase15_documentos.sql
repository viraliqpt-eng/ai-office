-- Fase 15 — Metadados dos documentos analisados
create table if not exists public.ai_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete cascade,
  request_id uuid references public.ai_requests(id) on delete set null,
  filename text not null,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now()
);

create index if not exists ai_documents_customer_idx
on public.ai_documents(customer_id);

create index if not exists ai_documents_conversation_idx
on public.ai_documents(conversation_id);

alter table public.ai_documents enable row level security;

drop policy if exists "Cliente consulta documentos próprios" on public.ai_documents;

create policy "Cliente consulta documentos próprios"
on public.ai_documents
for select
to authenticated
using (
  customer_id in (
    select id
    from public.customers
    where auth_user_id = (select auth.uid())
  )
);
