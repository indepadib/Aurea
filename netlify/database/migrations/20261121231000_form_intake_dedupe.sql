-- Store only a non-reversible event fingerprint for idempotent intake.
alter table aurea_crm_records add column if not exists source_key text;
create unique index if not exists aurea_crm_records_source_key_unique
 on aurea_crm_records (source_key) where source_key is not null;
