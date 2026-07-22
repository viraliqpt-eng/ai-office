-- AI Office™ — Supabase schema inicial
-- Execute este ficheiro no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  company_name text,
  nif text,
  phone text,
  address text,
  sector text,
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  client_id uuid not null references public.profiles(id) on delete cascade,
  service_name text not null,
  description text,
  priority text default 'Normal',
  status text not null default 'Novo'
    check (status in ('Novo','Em análise','Em produção','Revisão','Entregue','Concluído')),
  progress integer not null default 10 check (progress between 0 and 100),
  value_eur numeric(10,2) default 0,
  delivery_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  name text not null,
  file_path text not null,
  file_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_role text not null check (sender_role in ('client','admin','system')),
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create sequence if not exists public.order_number_seq start 1;

create or replace function public.generate_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null then
    new.order_number :=
      'AO-' || extract(year from now())::int || '-' ||
      lpad(nextval('public.order_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_order_number on public.orders;
create trigger set_order_number
before insert on public.orders
for each row execute function public.generate_order_number();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, company_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'company_name',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.documents enable row level security;
alter table public.messages enable row level security;

create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id);

create policy "Clients can view own orders"
on public.orders for select
using (auth.uid() = client_id);

create policy "Clients can create own orders"
on public.orders for insert
with check (auth.uid() = client_id);

create policy "Clients can view own documents"
on public.documents for select
using (auth.uid() = client_id);

create policy "Clients can view own messages"
on public.messages for select
using (auth.uid() = client_id);

create policy "Clients can send own messages"
on public.messages for insert
with check (auth.uid() = client_id and sender_role = 'client');

insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

create policy "Clients can view own stored files"
on storage.objects for select
using (
  bucket_id = 'client-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Clients can upload own stored files"
on storage.objects for insert
with check (
  bucket_id = 'client-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
