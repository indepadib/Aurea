-- Lock codes are never stored in plaintext. Photo type is mandatory for every new proof.
alter table aurea_ops_properties add column if not exists lock_code_ciphertext text;
alter table aurea_ops_properties add column if not exists lock_code_updated_at timestamptz;
alter table aurea_ops_job_photos add column if not exists photo_type text not null default 'legacy';
alter table aurea_ops_job_photos add constraint aurea_ops_job_photos_type_check
  check (photo_type in ('legacy','before','after','incident'));
create index if not exists aurea_ops_job_photos_after_idx
 on aurea_ops_job_photos(job_id,created_at)
 where photo_type='after';

-- Audit the act of revealing or updating access credentials without ever logging the secret itself.
create table if not exists aurea_ops_property_access_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references aurea_ops_properties(id) on delete cascade,
  actor text not null check (actor in ('admin','concierge','field')),
  actor_id uuid,
  action text not null check (action in ('code_viewed','code_updated','code_removed')),
  created_at timestamptz not null default now()
);
create index if not exists aurea_ops_property_access_events_property_idx
 on aurea_ops_property_access_events(property_id,created_at desc);
revoke all on aurea_ops_property_access_events from public;
