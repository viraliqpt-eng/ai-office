-- Fase 19 — Emails Inteligentes

create table if not exists public.crm_email_drafts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  recipient_email text,
  recipient_name text,
  subject text not null default '',
  body text not null default '',
  status text not null default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_email_drafts_customer_idx
on public.crm_email_drafts(customer_id);

create index if not exists crm_email_drafts_status_idx
on public.crm_email_drafts(customer_id, status);

alter table public.crm_email_drafts enable row level security;

drop policy if exists "Cliente consulta emails próprios" on public.crm_email_drafts;
create policy "Cliente consulta emails próprios"
on public.crm_email_drafts
for select
to authenticated
using (
  customer_id in (
    select id from public.customers
    where auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Cliente cria emails próprios" on public.crm_email_drafts;
create policy "Cliente cria emails próprios"
on public.crm_email_drafts
for insert
to authenticated
with check (
  customer_id in (
    select id from public.customers
    where auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Cliente atualiza emails próprios" on public.crm_email_drafts;
create policy "Cliente atualiza emails próprios"
on public.crm_email_drafts
for update
to authenticated
using (
  customer_id in (
    select id from public.customers
    where auth_user_id = (select auth.uid())
  )
)
with check (
  customer_id in (
    select id from public.customers
    where auth_user_id = (select auth.uid())
  )
);

drop policy if exists "Cliente elimina emails próprios" on public.crm_email_drafts;
create policy "Cliente elimina emails próprios"
on public.crm_email_drafts
for delete
to authenticated
using (
  customer_id in (
    select id from public.customers
    where auth_user_id = (select auth.uid())
  )
);