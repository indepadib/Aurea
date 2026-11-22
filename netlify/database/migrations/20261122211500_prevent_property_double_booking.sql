-- A property cannot have two overlapping live cleaning assignments.
alter table aurea_ops_jobs add constraint aurea_ops_jobs_property_no_overlap
 exclude using gist (property_id with =, tstzrange(start_at,end_at,'[)') with &&)
 where (status <> 'cancelled');
