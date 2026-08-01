create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  company text,
  role text,
  source text,
  status text not null default 'lead',
  estimated_value numeric(12,2),
  notes text,
  next_action text,
  next_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_contacts_customer_idx on public.crm_contacts(customer_id);
create index if not exists crm_contacts_status_idx on public.crm_contacts(customer_id,status);
alter table public.crm_contacts enable row level security;
drop policy if exists "CRM select own" on public.crm_contacts;
create policy "CRM select own" on public.crm_contacts for select to authenticated using (customer_id in (select id from public.customers where auth_user_id=(select auth.uid())));
drop policy if exists "CRM insert own" on public.crm_contacts;
create policy "CRM insert own" on public.crm_contacts for insert to authenticated with check (customer_id in (select id from public.customers where auth_user_id=(select auth.uid())));
drop policy if exists "CRM update own" on public.crm_contacts;
create policy "CRM update own" on public.crm_contacts for update to authenticated using (customer_id in (select id from public.customers where auth_user_id=(select auth.uid()))) with check (customer_id in (select id from public.customers where auth_user_id=(select auth.uid())));
drop policy if exists "CRM delete own" on public.crm_contacts;
create policy "CRM delete own" on public.crm_contacts for delete to authenticated using (customer_id in (select id from public.customers where auth_user_id=(select auth.uid())));
