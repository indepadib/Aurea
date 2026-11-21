-- Auréa CRM v1: independent namespace; no changes to the public website forms.
create table if not exists aurea_crm_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('prospect','lead','partner','content','task')),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists aurea_crm_records_kind_created_idx on aurea_crm_records (kind, created_at desc);
create index if not exists aurea_crm_records_status_idx on aurea_crm_records ((data->>'status'));
revoke all on aurea_crm_records from public;
