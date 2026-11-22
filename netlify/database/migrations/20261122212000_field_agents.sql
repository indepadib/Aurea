-- Auréa Field: distinct personal accounts for intervenants, never shared with conciergeries.
create table if not exists aurea_ops_agents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references aurea_ops_teams(id),
  full_name text not null check (length(full_name) between 2 and 140),
  email text not null,
  password_hash text not null,
  session_rev integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists aurea_ops_agents_email_unique on aurea_ops_agents(lower(email));
create index if not exists aurea_ops_agents_team_idx on aurea_ops_agents(team_id, active);
revoke all on aurea_ops_agents from public;
alter table aurea_ops_job_events drop constraint if exists aurea_ops_job_events_actor_check;
alter table aurea_ops_job_events add constraint aurea_ops_job_events_actor_check
 check (actor in ('admin','concierge','field'));
alter table aurea_ops_jobs add column if not exists started_at timestamptz;
alter table aurea_ops_jobs add column if not exists qa_submitted_at timestamptz;
