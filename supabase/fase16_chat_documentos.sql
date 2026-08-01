-- Fase 16 — Chat persistente com documentos

alter table public.ai_documents
  add column if not exists openai_file_id text,
  add column if not exists status text not null default 'ready',
  add column if not exists last_used_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists ai_documents_openai_file_id_idx
on public.ai_documents(openai_file_id);

create index if not exists ai_documents_active_idx
on public.ai_documents(customer_id, deleted_at);

drop policy if exists "Cliente cria documentos próprios" on public.ai_documents;
create policy "Cliente cria documentos próprios"
on public.ai_documents
for insert
to authenticated
with check (
  customer_id in (
    select id
    from public.customers
    where auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Cliente atualiza documentos próprios" on public.ai_documents;
create policy "Cliente atualiza documentos próprios"
on public.ai_documents
for update
to authenticated
using (
  customer_id in (
    select id
    from public.customers
    where auth_user_id = (select auth.uid())
  )
)
with check (
  customer_id in (
    select id
    from public.customers
    where auth_user_id = (select auth.uid())
  )
);
