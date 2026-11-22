-- Auréa sales CRM: preserve a real chronology rather than equating a draft with an email sent.
create table if not exists aurea_crm_activities (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references aurea_crm_records(id) on delete cascade,
  kind text not null check (kind in ('prospect','lead','partner')),
  result text not null check (result in ('email_envoye','appel_effectue','reponse_recue','rendezvous_confirme','devis_transmis','vente_conclue','non_interesse','note')),
  channel text not null check (channel in ('email','telephone','whatsapp','reunion','interne','autre')),
  note text not null default '',
  next_action text not null default '',
  next_date date,
  performed_at timestamptz not null default now()
);
create index if not exists aurea_crm_activities_record_idx on aurea_crm_activities(record_id,performed_at desc);
revoke all on aurea_crm_activities from public;
