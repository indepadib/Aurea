-- Reserve a team at confirmation, not only at assignment.
-- Concurrent confirmations and reassignments compete under the same GiST exclusion constraint.
alter table aurea_ops_jobs drop constraint if exists aurea_ops_jobs_team_no_overlap;
alter table aurea_ops_jobs add constraint aurea_ops_jobs_team_no_overlap
 exclude using gist (team_id with =, tstzrange(start_at,end_at,'[)') with &&)
 where (team_id is not null and status in ('confirmed','assigned','in_progress','qa','completed'));
alter table aurea_ops_jobs add constraint aurea_ops_jobs_confirmation_requires_team
 check (status not in ('confirmed','assigned','in_progress','qa','completed') or team_id is not null);
