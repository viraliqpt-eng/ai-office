-- Fase 21 — Envio real de emails
alter table public.crm_email_drafts
  add column if not exists provider text,
  add column if not exists provider_message_id text,
  add column if not exists send_error text,
  add column if not exists last_send_attempt_at timestamptz;
create index if not exists crm_email_drafts_provider_message_idx
on public.crm_email_drafts(provider_message_id);
