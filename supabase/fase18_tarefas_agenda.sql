create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'normal',
  status text not null default 'pending',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_tasks_customer_idx on public.crm_tasks(customer_id);
create index if not exists crm_tasks_due_idx on public.crm_tasks(customer_id,due_at);
create index if not exists crm_tasks_status_idx on public.crm_tasks(customer_id,status);
alter table public.crm_tasks enable row level security;
drop policy if exists "Cliente consulta tarefas próprias" on public.crm_tasks;
create policy "Cliente consulta tarefas próprias" on public.crm_tasks for select to authenticated using (customer_id in (select id from public.customers where auth_user_id=(select auth.uid())));
drop policy if exists "Cliente cria tarefas próprias" on public.crm_tasks;
create policy "Cliente cria tarefas próprias" on public.crm_tasks for insert to authenticated with check (customer_id in (select id from public.customers where auth_user_id=(select auth.uid())));
drop policy if exists "Cliente atualiza tarefas próprias" on public.crm_tasks;
create policy "Cliente atualiza tarefas próprias" on public.crm_tasks for update to authenticated using (customer_id in (select id from public.customers where auth_user_id=(select auth.uid()))) with check (customer_id in (select id from public.customers where auth_user_id=(select auth.uid())));
drop policy if exists "Cliente elimina tarefas próprias" on public.crm_tasks;
create policy "Cliente elimina tarefas próprias" on public.crm_tasks for delete to authenticated using (customer_id in (select id from public.customers where auth_user_id=(select auth.uid())));
