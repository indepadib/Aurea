-- Revoking a concierge password also invalidates every outstanding signed session.
alter table aurea_ops_companies add column if not exists session_rev integer not null default 0;
