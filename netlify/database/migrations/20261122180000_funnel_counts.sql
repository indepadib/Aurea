-- Aggregated, anonymous conversion counts, no emails, phone numbers, IPs or visitor cookies.
create table if not exists aurea_funnel_counts(
 day date not null default current_date,
 segment text not null check(segment in ('HOSTS','HOME','SECURITE','INCONNU')),
 stage text not null check(stage in ('vue','choix','besoin','contact','soumis')),
 source text not null default 'direct',
 hits integer not null default 0 check(hits>=0),
 primary key(day,segment,stage,source)
);
revoke all on aurea_funnel_counts from public;
