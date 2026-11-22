import {getDatabase} from "@netlify/database";
import {getStore} from "@netlify/blobs";
import {randomUUID} from "node:crypto";
import {isAuthorized,sameOrigin,response} from "../../lib/aurea-auth.mjs";
import {hostId,UUID,detectImage} from "../../lib/aurea-ops-core.mjs";

const storeName="aurea-private-qa";
export default async function handler(req){
 if(!["GET","POST"].includes(req.method))return response({error:"Méthode refusée"},405);
 if(req.method==="POST"&&!sameOrigin(req))return response({error:"Origine invalide"},403);
 try{
  const db=getDatabase(),admin=isAuthorized(req),session=admin?null:hostId(req),companyId=session?.id||null;
  if(!admin&&!companyId)return response({error:"Connexion nécessaire"},401);
  if(companyId){
   const active=await db.sql`select id from aurea_ops_companies where id=${companyId}::uuid and session_rev=${session.rev} and active=true`;
   if(!active.length)return response({error:"Accès suspendu"},403);
  }
  if(req.method==="GET"){
   const url=new URL(req.url),id=url.searchParams.get("photo"),job=url.searchParams.get("job");
   if(!UUID.test(id||"")||!UUID.test(job||""))return response({error:"Photo invalide"},400);
   const rows=admin?await db.sql`select f.blob_key,f.mime from aurea_ops_job_photos f where f.id=${id}::uuid and f.job_id=${job}::uuid`:
    await db.sql`select f.blob_key,f.mime from aurea_ops_job_photos f join aurea_ops_jobs j on j.id=f.job_id where f.id=${id}::uuid and f.job_id=${job}::uuid and j.company_id=${companyId}::uuid`;
   if(!rows.length)return response({error:"Introuvable"},404);
   const blob=await getStore(storeName).get(rows[0].blob_key,{type:"arrayBuffer"});
   if(!blob)return response({error:"Fichier manquant"},404);
   return new Response(blob,{headers:{"Content-Type":rows[0].mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Disposition":"inline"}});
  }
  if(!admin)return response({error:"Seule l'équipe Auréa peut déposer une preuve de contrôle"},403);
  if(Number(req.headers.get("content-length")||0)>3800000)return response({error:"Photo trop volumineuse (3 Mo maximum)"},413);
  if(!req.headers.get("content-type")?.includes("multipart/form-data"))return response({error:"Fichier attendu"},415);
  const form=await req.formData(),jobId=String(form.get("jobId")||""),file=form.get("photo"),caption=String(form.get("caption")||"").trim().slice(0,100);
  if(!UUID.test(jobId)||!(file instanceof File)||file.size>3145728||file.size<50)return response({error:"Fichier ou intervention invalide"},400);
  const job=await db.sql`select id,status from aurea_ops_jobs where id=${jobId}::uuid and status in ('in_progress','qa')`;
  if(!job.length)return response({error:"Intervention non ouverte au contrôle qualité"},409);
  const count=await db.sql`select count(*)::int as n from aurea_ops_job_photos where job_id=${jobId}::uuid`;
  if(Number(count[0].n)>=8)return response({error:"Maximum de huit photos par intervention"},409);
  const bytes=new Uint8Array(await file.arrayBuffer()),mime=detectImage(bytes);
  if(!mime)return response({error:"Image JPEG, PNG ou WebP valide requise (3 Mo maximum)"},415);
  const key="ops/"+jobId+"/"+randomUUID();
  await getStore(storeName).set(key,bytes.buffer,{metadata:{mime}});
  const rows=await db.sql`insert into aurea_ops_job_photos(job_id,blob_key,mime,bytes,caption) values(${jobId}::uuid,${key},${mime},${bytes.byteLength},${caption}) returning id,mime,caption,created_at`;
  await db.sql`insert into aurea_ops_job_events(job_id,actor,event,detail) values(${jobId}::uuid,'admin','photo_added',${JSON.stringify({caption})}::jsonb)`;
  return response({photo:rows[0]},201);
 }catch(e){
  console.error("aurea-ops-photo",e?.code||"failed");
  return response({error:"Stockage photo indisponible"},503);
 }
}
export const config={path:"/api/aurea-ops-photo",rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:60,windowLimit:60}};
