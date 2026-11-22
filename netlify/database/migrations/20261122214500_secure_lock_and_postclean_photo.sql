-- Lock codes are never stored in plaintext. Photo type is mandatory for every new proof.
alter table aurea_ops_properties add column if not exists lock_code_ciphertext text;
alter table aurea_ops_properties add column if not exists lock_code_updated_at timestamptz;
alter table aurea_ops_job_photos add column if not exists photo_type text not null default 'legacy';
alter table aurea_ops_job_photos add constraint aurea_ops_job_photos_type_check
  check (photo_type in ('legacy','before','after','incident'));
create index if not exists aurea_ops_job_photos_after_idx
 on aurea_ops_job_photos(job_id,created_at)
 where photo_type='after';
