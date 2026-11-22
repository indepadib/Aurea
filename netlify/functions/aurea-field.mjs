import {getDatabase} from "@netlify/database";
import {sameOrigin,response} from "../../lib/aurea-auth.mjs";
import {UUID,qualityComplete} from "../../lib/aurea-ops-core.mjs";
import {fieldActor} from "../../lib/aurea-field-core.mjs";
import {decryptLockCode} from "../../lib/aurea-property-security.mjs";

const trim=(v,max=900)=>typeof v==="string"?v.trim().slice(0,max):"";
const severity=new Set(["low","medium","high","critical"]);
export default async function handler(req){
 if(!["GET","POST"].includes(req.method))return response({error:"Méthode non autorisée"},405);
 if(req.method==="POST"&&!sameOrigin(req))return response({error:"Origine invalide"},403);
 try{
  const db=getDatabase(),agent=await fieldActor(req,db);
  if(!agent)return response({error:"Connexion terrain nécessaire"},401);
  const url=new URL(req.url),resource=url.searchParams.get("resource");
  if(req.method==="GET"){
   if(resource==="session")return response({id:agent.id,name:agent.full_name,teamId:agent.team_id});
   if(resource==="overview"){
    const jobs=await db.sql`select j.id,j.start_at,j.end_at,j.checkout_at,j.next_checkin_at,j.status,j.notes,
     j.quality_notes,j.checklist,j.started_at,j.qa_submitted_at,
     p.name as property_name,p.address,p.latitude,p.longitude,p.access_method,(p.lock_code_ciphertext is not null) as lock_configured,p.linen_notes,p.consumables_notes,
     case when j.status in ('assigned','in_progress','qa') then p.access_notes else '' end as access_notes,
     t.name as team_name from aurea_ops_jobs j
     join aurea_ops_properties p on p.id=j.property_id
     join aurea_ops_teams t on t.id=j.team_id
     where j.team_id=${agent.team_id}::uuid
     and j.status in ('assigned','in_progress','qa','completed')
     and j.start_at>=now()-interval '7 days' and j.start_at<=now()+interval '45 days'
     order by j.start_at asc limit 300`;
    return response({name:agent.full_name,teamId:agent.team_id,jobs});
   }
   if(resource==="lock_code"){
    const jobId=url.searchParams.get("job");
    if(!UUID.test(jobId||""))return response({error:"Intervention invalide"},400);
    const rows=await db.sql`select p.id as property_id,p.lock_code_ciphertext
      from aurea_ops_jobs j join aurea_ops_properties p on p.id=j.property_id
      where j.id=${jobId}::uuid and j.team_id=${agent.team_id}::uuid
      and j.status in ('assigned','in_progress','qa') and p.active=true limit 1`;
    if(!rows.length)return response({error:"Accès indisponible : équipe non affectée ou intervention clôturée"},404);
    if(!rows[0].lock_code_ciphertext)return response({error:"Code non renseigné par la conciergerie"},404);
    const code=decryptLockCode(rows[0].lock_code_ciphertext);
    await db.sql`insert into aurea_ops_property_access_events(property_id,actor,actor_id,action)
      values(${rows[0].property_id}::uuid,'field',${agent.id}::uuid,'code_viewed')`;
    return response({code},200,{"Cache-Control":"private, no-store","Pragma":"no-cache","Vary":"Cookie","X-Content-Type-Options":"nosniff"});
   }
   if(resource==="history"){
    const jobId=url.searchParams.get("job");
    if(!UUID.test(jobId||""))return response({error:"Intervention invalide"},400);
    const jobs=await db.sql`select id from aurea_ops_jobs where id=${jobId}::uuid and team_id=${agent.team_id}::uuid
     and status in ('assigned','in_progress','qa','completed') limit 1`;
    if(!jobs.length)return response({error:"Intervention non autorisée"},404);
    const events=await db.sql`select event,actor,detail,created_at from aurea_ops_job_events
      where job_id=${jobId}::uuid order by created_at desc limit 100`;
    const photos=await db.sql`select id,mime,photo_type,caption,created_at from aurea_ops_job_photos
      where job_id=${jobId}::uuid order by created_at desc limit 30`;
    return response({events,photos});
   }
   return response({error:"Ressource inconnue"},404);
  }
  if(Number(req.headers.get("content-length")||0)>6500)return response({error:"Requête trop volumineuse"},413);
  if(!req.headers.get("content-type")?.includes("application/json"))return response({error:"JSON obligatoire"},415);
  const body=await req.json(),action=body.action,id=body.jobId;
  if(!UUID.test(id||""))return response({error:"Intervention invalide"},400);
  if(action==="start"){
   const jobs=await db.sql`update aurea_ops_jobs
    set status='in_progress',started_at=now(),updated_at=now()
    where id=${id}::uuid and team_id=${agent.team_id}::uuid and status='assigned'
      and start_at>=now()-interval '36 hours' and start_at<=now()+interval '12 hours'
    returning id,status,started_at`;
   if(!jobs.length)return response({error:"Intervention non affectée à votre équipe, déjà commencée ou trop éloignée dans le temps"},409);
   await db.sql`insert into aurea_ops_job_events(job_id,actor,event,detail)
    values(${id}::uuid,'field','in_progress',${JSON.stringify({agentId:agent.id})}::jsonb)`;
   return response({job:jobs[0]});
  }
  if(action==="quality"){
   if(!body.checklist||typeof body.checklist!=="object"||Array.isArray(body.checklist))return response({error:"Checklist manquante"},400);
   const checks=Object.fromEntries(["cleaning","linen","consumables","secure"].map(k=>[k,body.checklist[k]===true]));
   const note=trim(body.note,1200);
   const rows=await db.sql`update aurea_ops_jobs set checklist=${JSON.stringify(checks)}::jsonb,
    quality_notes=${note},updated_at=now()
    where id=${id}::uuid and team_id=${agent.team_id}::uuid and status='in_progress'
    returning id`;
   if(!rows.length)return response({error:"La checklist n'est modifiable que pendant une intervention en cours"},409);
   await db.sql`insert into aurea_ops_job_events(job_id,actor,event,detail)
    values(${id}::uuid,'field','quality_updated',${JSON.stringify({agentId:agent.id,checks,note})}::jsonb)`;
   return response({job:rows[0]});
  }
  if(action==="submit_qa"){
   const jobs=await db.sql`select id,checklist,started_at from aurea_ops_jobs
    where id=${id}::uuid and team_id=${agent.team_id}::uuid and status='in_progress' limit 1`;
   if(!jobs.length)return response({error:"Intervention non disponible pour le contrôle qualité"},409);
   if(!qualityComplete(jobs[0].checklist))return response({error:"Les quatre contrôles qualité sont requis"},409);
   const photos=await db.sql`select count(*)::int as count from aurea_ops_job_photos where job_id=${id}::uuid and photo_type='after' and created_at >= ${jobs[0].started_at}::timestamptz`;
   if(Number(photos[0]?.count||0)<1)return response({error:"Ajoutez au moins une photo APRÈS le ménage, prise après le démarrage"},409);
   const rows=await db.sql`update aurea_ops_jobs set status='qa',qa_submitted_at=now(),updated_at=now()
    where id=${id}::uuid and team_id=${agent.team_id}::uuid and status='in_progress'
    returning id,status,qa_submitted_at`;
   if(!rows.length)return response({error:"L'intervention a changé. Rechargez la page."},409);
   await db.sql`insert into aurea_ops_job_events(job_id,actor,event,detail)
    values(${id}::uuid,'field','qa',${JSON.stringify({agentId:agent.id})}::jsonb)`;
   return response({job:rows[0]});
  }
  if(action==="incident"){
   const note=trim(body.note,1400),level=trim(body.severity,20);
   if(note.length<10||!severity.has(level))return response({error:"Précisez la gravité et les faits constatés"},400);
   const jobs=await db.sql`select id from aurea_ops_jobs
    where id=${id}::uuid and team_id=${agent.team_id}::uuid
    and status in ('assigned','in_progress','qa') limit 1`;
   if(!jobs.length)return response({error:"Intervention non autorisée"},404);
   const detail=JSON.stringify({agentId:agent.id,severity:level,note});
   const events=await db.sql`insert into aurea_ops_job_events(job_id,actor,event,detail)
    values(${id}::uuid,'field','incident_reported',${detail}::jsonb)
    returning id,created_at`;
   return response({incident:events[0]},201);
  }
  return response({error:"Action inconnue"},400);
 }catch(e){console.error("aurea-field",e?.code||"unavailable");return response({error:"Service terrain indisponible"},503)}
}
export const config={path:"/api/aurea-field",rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:60,windowLimit:100}};
