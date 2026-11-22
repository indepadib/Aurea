import {getDatabase} from "@netlify/database";
import {isAuthorized,sameOrigin,response} from "../../lib/aurea-auth.mjs";
import {hostId,UUID,hashPassword,newHostPassword,validTurnover,validTransition,qualityComplete} from "../../lib/aurea-ops-core.mjs";

const clean=(v,max=150)=>typeof v==="string"?v.trim().slice(0,max):"";
const identifier=(v)=>UUID.test(String(v||""));
const allowed=(r,act)=>act==="admin"||act==="concierge";
const failure=(e)=>{
 console.error("aurea-ops:",e?.code||"unavailable");
 if(e?.code==="23P01")return response({error:"Conflit : cette équipe est déjà affectée pendant ce créneau."},409);
 if(e?.code==="23505")return response({error:"Un enregistrement avec ce nom ou cet e-mail existe déjà."},409);
 if(e?.code==="23503")return response({error:"Référence invalide."},409);
 return response({error:"Opération indisponible. Vérifiez la base et ses migrations."},503);
};
async function actorFor(req,db){
 const space=req.headers.get("x-aurea-space");
 if(space==="operations" && !isAuthorized(req))return null;
 if(space==="operations" || (space!=="hosts" && isAuthorized(req)))return {role:"admin",companyId:null};
 const session=hostId(req);
 if(!session)return null;
 const rows=await db.sql`select id,name from aurea_ops_companies where id=${session.id}::uuid and session_rev=${session.rev} and active=true limit 1`;
 return rows.length?{role:"concierge",companyId:rows[0].id,companyName:rows[0].name}:null;
}
function propData(body){
 const name=clean(body.name,120),address=clean(body.address,350);
 const latitude=body.latitude===""||body.latitude===null||body.latitude===undefined?null:Number(body.latitude);
 const longitude=body.longitude===""||body.longitude===null||body.longitude===undefined?null:Number(body.longitude);
 const bedrooms=Number(body.bedrooms??1),bathrooms=Number(body.bathrooms??1);
 const surface=body.surface_m2===""||body.surface_m2===undefined||body.surface_m2===null?null:Number(body.surface_m2);
 if(name.length<2||address.length<8||![latitude,longitude].every(x=>x===null||Number.isFinite(x))||
  latitude!==null&&(latitude< -90||latitude>90)||longitude!==null&&(longitude< -180||longitude>180)||
  (latitude===null)!==(longitude===null)||
  !Number.isInteger(bedrooms)||bedrooms<0||bedrooms>40||
  !Number.isInteger(bathrooms)||bathrooms<0||bathrooms>40||
  surface!==null&&(!Number.isInteger(surface)||surface<=0||surface>10000))return null;
 return {name,address,latitude,longitude,bedrooms,bathrooms,surface,
  access:clean(body.access_notes,1000),linen:clean(body.linen_notes,800),consumables:clean(body.consumables_notes,800)};
}
export default async function handler(req){
 if(!["GET","POST"].includes(req.method))return response({error:"Méthode refusée"},405);
 if(req.method==="POST"&&!sameOrigin(req))return response({error:"Origine invalide"},403);
 try{
  const db=getDatabase(),actor=await actorFor(req,db);
  if(!actor)return response({error:"Connexion nécessaire"},401);
  const admin=actor.role==="admin",url=new URL(req.url),resource=url.searchParams.get("resource");
  if(req.method==="GET"){
   if(resource==="session")return response({role:actor.role,companyId:actor.companyId,name:actor.companyName||"Auréa Operations"});
   if(resource==="overview"){
    const companies=admin?await db.sql`select id,name,email,contact_name,phone,active,created_at from aurea_ops_companies order by created_at desc limit 300`:[];
    const properties=admin?await db.sql`select p.*,c.name as company_name from aurea_ops_properties p join aurea_ops_companies c on c.id=p.company_id order by p.name limit 600`:
     await db.sql`select * from aurea_ops_properties where company_id=${actor.companyId}::uuid order by name limit 600`;
    const teams=admin?await db.sql`select id,name,active from aurea_ops_teams order by name limit 120`:[];
    const jobs=admin?await db.sql`select j.*,p.name as property_name,p.address as property_address,p.latitude,p.longitude,c.name as company_name,t.name as team_name from aurea_ops_jobs j join aurea_ops_properties p on p.id=j.property_id join aurea_ops_companies c on c.id=j.company_id left join aurea_ops_teams t on t.id=j.team_id where j.start_at>=now()-interval '30 days' and j.start_at<=now()+interval '180 days' order by j.start_at limit 1500`:
     await db.sql`select j.*,p.name as property_name,p.address as property_address,p.latitude,p.longitude from aurea_ops_jobs j join aurea_ops_properties p on p.id=j.property_id where j.company_id=${actor.companyId}::uuid and j.start_at>=now()-interval '30 days' and j.start_at<=now()+interval '180 days' order by j.start_at limit 1000`;
    return response({companies,properties,teams,jobs,role:actor.role});
   }
   if(resource==="history"){
    const id=url.searchParams.get("job");
    if(!identifier(id))return response({error:"Intervention invalide"},400);
    const rows=admin?await db.sql`select id from aurea_ops_jobs where id=${id}::uuid limit 1`:
      await db.sql`select id from aurea_ops_jobs where id=${id}::uuid and company_id=${actor.companyId}::uuid limit 1`;
    if(!rows.length)return response({error:"Introuvable"},404);
    const events=await db.sql`select event,actor,detail,created_at from aurea_ops_job_events where job_id=${id}::uuid order by created_at desc limit 100`;
    const photos=await db.sql`select id,mime,caption,created_at from aurea_ops_job_photos where job_id=${id}::uuid order by created_at desc limit 30`;
    return response({events,photos});
   }
   return response({error:"Ressource inconnue"},404);
  }
  if(Number(req.headers.get("content-length")||0)>16000)return response({error:"Requête trop volumineuse"},413);
  if(!req.headers.get("content-type")?.includes("application/json"))return response({error:"Format JSON requis"},415);
  const body=await req.json(),action=body.action;
  if(action==="create_company"){
   if(!admin)return response({error:"Accès réservé à Auréa"},403);
   const name=clean(body.name,180),email=clean(body.email,250).toLowerCase(),contact=clean(body.contact_name,120),phone=clean(body.phone,40);
   if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return response({error:"Nom et e-mail professionnel obligatoires"},400);
   const password=newHostPassword(),hash=hashPassword(password);
   const created=await db.sql`insert into aurea_ops_companies(name,email,contact_name,phone,password_hash) values (${name},${email},${contact},${phone},${hash}) returning id,name,email,contact_name,phone,active`;
   return response({company:created[0],temporaryPassword:password,notice:"Copiez ce mot de passe : il ne sera plus affiché."},201);
  }
  if(action==="reset_company_access"){
   if(!admin||!identifier(body.companyId))return response({error:"Action interdite"},403);
   const password=newHostPassword(),hash=hashPassword(password);
   const rows=await db.sql`update aurea_ops_companies set password_hash=${hash},session_rev=session_rev+1 where id=${body.companyId}::uuid returning id,name,email`;
   return rows.length?response({company:rows[0],temporaryPassword:password}):response({error:"Client introuvable"},404);
  }
  if(action==="create_team"){
   if(!admin)return response({error:"Accès réservé à Auréa"},403);
   const name=clean(body.name,100);
   if(name.length<2)return response({error:"Nom d'équipe obligatoire"},400);
   const rows=await db.sql`insert into aurea_ops_teams(name) values (${name}) returning id,name,active`;
   return response({team:rows[0]},201);
  }
  if(action==="create_property"||action==="update_property"){
   const data=propData(body);
   if(!data)return response({error:"Fiche logement invalide : adresse, surface ou coordonnées à vérifier"},400);
   if(action==="create_property"){
    const companyId=admin?body.companyId:actor.companyId;
    if(!identifier(companyId))return response({error:"Sélectionnez une conciergerie"},400);
    const exists=await db.sql`select id from aurea_ops_companies where id=${companyId}::uuid and active=true`;
    if(!exists.length)return response({error:"Conciergerie introuvable"},404);
    const rows=await db.sql`insert into aurea_ops_properties(company_id,name,address,latitude,longitude,bedrooms,bathrooms,surface_m2,access_notes,linen_notes,consumables_notes)
      values(${companyId}::uuid,${data.name},${data.address},${data.latitude},${data.longitude},${data.bedrooms},${data.bathrooms},${data.surface},${data.access},${data.linen},${data.consumables}) returning id`;
    return response({property:rows[0]},201);
   }
   if(!identifier(body.propertyId))return response({error:"Logement invalide"},400);
   const rows=admin?await db.sql`update aurea_ops_properties set name=${data.name},address=${data.address},latitude=${data.latitude},longitude=${data.longitude},bedrooms=${data.bedrooms},bathrooms=${data.bathrooms},surface_m2=${data.surface},access_notes=${data.access},linen_notes=${data.linen},consumables_notes=${data.consumables},updated_at=now() where id=${body.propertyId}::uuid returning id`:
    await db.sql`update aurea_ops_properties set name=${data.name},address=${data.address},latitude=${data.latitude},longitude=${data.longitude},bedrooms=${data.bedrooms},bathrooms=${data.bathrooms},surface_m2=${data.surface},access_notes=${data.access},linen_notes=${data.linen},consumables_notes=${data.consumables},updated_at=now() where id=${body.propertyId}::uuid and company_id=${actor.companyId}::uuid returning id`;
   return rows.length?response({property:rows[0]}):response({error:"Logement introuvable"},404);
  }
  if(action==="request_job"){
   if(!identifier(body.propertyId)||!validTurnover(body.start,body.end,body.checkout,body.checkin)return response({error:"Choisissez un logement et un créneau futur de 30 minutes à 12 heures."},400);
   const prop=admin?await db.sql`select id,company_id from aurea_ops_properties where id=${body.propertyId}::uuid and active=true`:
    await db.sql`select id,company_id from aurea_ops_properties where id=${body.propertyId}::uuid and company_id=${actor.companyId}::uuid and active=true`;
   if(!prop.length)return response({error:"Logement non autorisé"},404);
   const companyId=prop[0].company_id,notes=clean(body.notes,1400);
   const start=new Date(body.start).toISOString(),end=new Date(body.end).toISOString();
   const checkout=body.checkout?new Date(body.checkout).toISOString():null,checkin=body.checkin?new Date(body.checkin).toISOString():null;
   const rows=await db.sql`insert into aurea_ops_jobs(company_id,property_id,start_at,end_at,checkout_at,next_checkin_at,notes) values(${companyId}::uuid,${body.propertyId}::uuid,${start}::timestamptz,${end}::timestamptz,${checkout}::timestamptz,${checkin}::timestamptz,${notes}) returning id,status`;
   await db.sql`insert into aurea_ops_job_events(job_id,actor,event) values(${rows[0].id}::uuid,${actor.role},'requested')`;
   return response({job:rows[0]},201);
  }
  if(action==="reschedule_job"){
   const id=body.jobId;
   if(!identifier(id)||!validTurnover(body.start,body.end,body.checkout,body.checkin))return response({error:"Créneau ou heures de rotation invalides"},400);
   const start=new Date(body.start).toISOString(),end=new Date(body.end).toISOString();
   const checkout=body.checkout?new Date(body.checkout).toISOString():null,checkin=body.checkin?new Date(body.checkin).toISOString():null,notes=clean(body.notes,1400);
   const rows=admin?
    await db.sql`update aurea_ops_jobs set start_at=${start}::timestamptz,end_at=${end}::timestamptz,checkout_at=${checkout}::timestamptz,next_checkin_at=${checkin}::timestamptz,notes=${notes},updated_at=now() where id=${id}::uuid and status='requested' returning id`:
    await db.sql`update aurea_ops_jobs set start_at=${start}::timestamptz,end_at=${end}::timestamptz,checkout_at=${checkout}::timestamptz,next_checkin_at=${checkin}::timestamptz,notes=${notes},updated_at=now() where id=${id}::uuid and company_id=${actor.companyId}::uuid and status='requested' returning id`;
   if(!rows.length)return response({error:"Modification possible uniquement avant confirmation"},409);
   await db.sql`insert into aurea_ops_job_events(job_id,actor,event,detail) values(${id}::uuid,${actor.role},'rescheduled',${JSON.stringify({start,end,checkout,checkin})}::jsonb)`;
   return response({job:rows[0]});
  }
  if(action==="change_job"){
   const id=body.jobId,to=clean(body.status,35);
   if(!identifier(id))return response({error:"Intervention invalide"},400);
   const rows=admin?await db.sql`select * from aurea_ops_jobs where id=${id}::uuid limit 1`:
    await db.sql`select * from aurea_ops_jobs where id=${id}::uuid and company_id=${actor.companyId}::uuid limit 1`;
   if(!rows.length)return response({error:"Intervention introuvable"},404);
   const j=rows[0];
   if(!validTransition(j.status,to,actor.role))return response({error:"Transition non autorisée depuis "+j.status},409);
   if(to==="assigned" &&(!admin||!identifier(body.teamId)))return response({error:"Équipe requise"},400);
   if(to==="assigned"){
    const team=await db.sql`select id from aurea_ops_teams where id=${body.teamId}::uuid and active=true`;
    if(!team.length)return response({error:"Équipe introuvable"},404);
   }
   if(to==="completed"){
    if(!qualityComplete(j.checklist))return response({error:"Checklist qualité incomplète"},409);
    const photos=await db.sql`select count(*)::int as total from aurea_ops_job_photos where job_id=${id}::uuid`;
    if(Number(photos[0]?.total||0)<1)return response({error:"Au moins une photo de contrôle est obligatoire"},409);
   }
   const teamId=to==="assigned"?body.teamId:null;
   const updated=to==="assigned"?
    await db.sql`update aurea_ops_jobs set status=${to},team_id=${teamId}::uuid,updated_at=now() where id=${id}::uuid and status=${j.status} returning id,status`:
    await db.sql`update aurea_ops_jobs set status=${to},updated_at=now(),completed_at=case when ${to}='completed' then now() else completed_at end where id=${id}::uuid and status=${j.status} returning id,status`;
   if(!updated.length)return response({error:"L'intervention a changé. Rechargez le planning."},409);
   await db.sql`insert into aurea_ops_job_events(job_id,actor,event,detail) values(${id}::uuid,${actor.role},${to},${JSON.stringify({from:j.status,teamId:teamId||null})}::jsonb)`;
   return response({job:updated[0]});
  }
  if(action==="reassign_job"){
   if(!admin||!identifier(body.jobId)||!identifier(body.teamId))return response({error:"Affectation invalide"},400);
   const team=await db.sql`select id from aurea_ops_teams where id=${body.teamId}::uuid and active=true`;
   if(!team.length)return response({error:"Équipe inactive"},404);
   const rows=await db.sql`update aurea_ops_jobs set team_id=${body.teamId}::uuid,updated_at=now() where id=${body.jobId}::uuid and status='assigned' returning id`;
   if(!rows.length)return response({error:"Réaffectation réservée aux interventions affectées"},409);
   await db.sql`insert into aurea_ops_job_events(job_id,actor,event,detail) values(${body.jobId}::uuid,'admin','reassigned',${JSON.stringify({teamId:body.teamId})}::jsonb)`;
   return response({job:rows[0]});
  }
  if(action==="quality"){
   if(!admin||!identifier(body.jobId))return response({error:"Accès réservé à Auréa"},403);
   if(!body.checklist||typeof body.checklist!=="object"||Array.isArray(body.checklist))return response({error:"Checklist requise"},400);
   const checklist=Object.fromEntries(["cleaning","linen","consumables","secure"].map(k=>[k,body.checklist[k]===true]));
   const notes=clean(body.notes,1200);
   const rows=await db.sql`update aurea_ops_jobs set checklist=${JSON.stringify(checklist)}::jsonb,quality_notes=${notes},updated_at=now() where id=${body.jobId}::uuid and status in ('in_progress','qa') returning id`;
   if(!rows.length)return response({error:"Passez l'intervention en cours ou en contrôle qualité"},409);
   await db.sql`insert into aurea_ops_job_events(job_id,actor,event,detail) values(${body.jobId}::uuid,'admin','quality_updated',${JSON.stringify({checklist,notes})}::jsonb)`;
   return response({job:rows[0]});
  }
  return response({error:"Action inconnue"},400);
 }catch(err){return failure(err)}
}
export const config={path:"/api/aurea-ops",rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:60,windowLimit:120}};
