-- Auréa Hosts & Operations P0: isolate every concierge and keep an immutable operations history.
create extension if not exists btree_gist;
create table if not exists aurea_ops_companies (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(name) between 2 and 180),
 email text not null,
 contact_name text not null default '',
 phone text not null default '',
 password_hash text not null,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create unique index if not exists aurea_ops_companies_email_unique on aurea_ops_companies (lower(email));
create table if not exists aurea_ops_properties (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references aurea_ops_companies(id),
 name text not null,
 address text not null,
 latitude double precision check (latitude between -90 and 90),
 longitude double precision check (longitude between -180 and 180),
 bedrooms integer not null default 1 check (bedrooms between 0 and 40),
 bathrooms integer not null default 1 check (bathrooms between 0 and 40),
 surface_m2 integer check (surface_m2 between 1 and 10000),
 access_notes text not null default '',
 linen_notes text not null default '',
 consumables_notes text not null default '',
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,company_id)
);
create index if not exists aurea_ops_properties_company_idx on aurea_ops_properties(company_id);
create table if not exists aurea_ops_teams (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists aurea_ops_jobs (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references aurea_ops_companies(id),
 property_id uuid not null,
 team_id uuid references aurea_ops_teams(id),
 start_at timestamptz not null,
 end_at timestamptz not null,
 checkout_at timestamptz,
 next_checkin_at timestamptz,
 status text not null default 'requested' check (status in ('requested','confirmed','assigned','in_progress','qa','completed','cancelled')),
 notes text not null default '',
 checklist jsonb not null default '{}'::jsonb check (jsonb_typeof(checklist)='object'),
 quality_notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 completed_at timestamptz,
 constraint aurea_ops_jobs_window check (end_at > start_at and end_at <= start_at + interval '12 hours'),
 constraint aurea_ops_jobs_property_tenant_fk foreign key (property_id, company_id) references aurea_ops_properties(id,company_id),
 constraint aurea_ops_jobs_team_no_overlap exclude using gist
   (team_id with =, tstzrange(start_at,end_at,'[)') with &&)
   where (team_id is not null and status in ('assigned','in_progress','qa','completed'))
);
create index if not exists aurea_ops_jobs_company_time_idx on aurea_ops_jobs(company_id,start_at desc);
create index if not exists aurea_ops_jobs_time_idx on aurea_ops_jobs(start_at);
create table if not exists aurea_ops_job_events (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references aurea_ops_jobs(id) on delete cascade,
 actor text not null check (actor in ('admin','concierge')),
 event text not null,
 detail jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists aurea_ops_job_events_job_idx on aurea_ops_job_events(job_id,created_at desc);
create table if not exists aurea_ops_job_photos (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references aurea_ops_jobs(id) on delete cascade,
 blob_key text not null unique,
 mime text not null check (mime in ('image/jpeg','image/png','image/webp')),
 bytes integer not null check (bytes between 1 and 3145728),
 caption text not null default '',
 created_at timestamptz not null default now()
);
create index if not exists aurea_ops_job_photos_job_idx on aurea_ops_job_photos(job_id);
revoke all on aurea_ops_companies,aurea_ops_properties,aurea_ops_teams,aurea_ops_jobs,aurea_ops_job_events,aurea_ops_job_photos from public;
