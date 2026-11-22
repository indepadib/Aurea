-- Complete contacts verified on primary public business websites, 2026-11-22.
-- Safe updates conditional on still-missing or previous seeded values; preserves user edits.
update aurea_crm_records
set data=data||jsonb_build_object(
 'email','contact@zoya.ma',
 'contactSource','https://zoya.ma/contact/',
 'contactVerifiedAt','2026-11-22'
),updated_at=now()
where kind='prospect' and data->>'name'='ZOYA — résidence Zenata'
and coalesce(data->>'email','')='';

-- Use the commercial business contact displayed on La Clef's current Contact page,
-- instead of the legal/privacy mailbox from its mentions légales.
update aurea_crm_records
set data=data||jsonb_build_object(
 'email','laclefdeveloppement@gmail.com',
 'phone','+212666981042',
 'contactSource','https://www.laclefdeveloppement.ma/contact',
 'contactVerifiedAt','2026-11-22'
),updated_at=now()
where kind='partner' and data->>'name'='La Clef Développement'
and data->>'email'='contact@laclefdeveloppement.com'
and data->>'phone'='+212661245807';

-- Zenatys is a Marrakech business, NOT a verified provider at Zenata.
update aurea_crm_records
set data=data||jsonb_build_object(
 'priority','C',
 'zone','Marrakech — hors cible Zenata',
 'evidence','Site officiel : Zenatys est une conciergerie spécialisée à Marrakech, sans présence Zenata vérifiée.',
 'nextAction','Réserver à une éventuelle expansion hors Zenata'
),updated_at=now()
where kind='prospect' and data->>'name'='Zenatys Conciergerie'
and data->>'priority'='B'
and data->>'status'='À qualifier';

-- One more Casablanca company with real published business contact.
insert into aurea_crm_records(kind,data,source_key) values
('prospect',
'{"name":"Conciergerie Pro Casablanca","segment":"Conciergerie","zone":"Casablanca — Zenata à confirmer","priority":"B","status":"À qualifier","email":"contact@conciergerie-pro.ma","phone":"+212618830490","contactVerifiedAt":"2026-11-22","contactSource":"https://conciergerie-pro.ma/contact/","source":"Site officiel","sourceUrl":"https://conciergerie-pro.ma/contact/","evidence":"Site officiel d’une conciergerie spécialisée dans la gestion Airbnb à Casablanca ; couverture Zenata à vérifier.","nextAction":"Qualifier portefeuille à Zenata et besoin de sous-traitance ménage ou linge","owner":"SDR Hosts","consent":"À déterminer","notes":"Coordonnées professionnelles publiques uniquement ; aucune prise de contact."}'::jsonb,
'aurea-contact-qa-20261122:conciergerie-pro')
on conflict (source_key) where source_key is not null do nothing;
