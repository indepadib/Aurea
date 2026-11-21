import {getDatabase} from "@netlify/database";
import {isAuthorized,sameOrigin,response} from "../../lib/aurea-auth.mjs";

const kinds=new Set(["prospect","lead","partner","content","task"]);
const fields={
 prospect:["name","segment","zone","evidence","priority","status","source","sourceUrl","nextAction","nextDate","owner","notes","email","phone","consent"],
 lead:["name","segment","zone","service","status","source","nextAction","nextDate","owner","notes","email","phone","quote","revenue","variableCost","consent"],
 partner:["name","segment","zone","status","source","sourceUrl","nextAction","nextDate","owner","notes","email","phone","consent"],
 content:["name","segment","channel","format","date","status","cta","copy","owner","notes"],
 task:["name","segment","status","priority","dueDate","owner","notes"]
};
function clean(kind,data){
 const allowed=fields[kind],out={};
 if(!data || typeof data!=="object" || Array.isArray(data)) return null;
 for(const key of allowed){
  const val=data[key];
  if(typeof val==="string") out[key]=val.trim().slice(0,key==="copy"?4000:900);
  if(["quote","revenue","variableCost"].includes(key)&&typeof val==="number"&&Number.isFinite(val)&&val>=0&&val<1e9)out[key]=val;
 }
 if(!out.name || out.name.length<2) return null;
 return out;
}
export default async function handler(req){
 if(!isAuthorized(req)) return response({error:"Session expirée. Reconnectez-vous."},401);
 if(!["GET","POST","PUT","DELETE"].includes(req.method)) return response({error:"Méthode non autorisée"},405);
 if(req.method!=="GET"&&!sameOrigin(req)) return response({error:"Origine invalide"},403);
 const url=new URL(req.url),kind=url.searchParams.get("kind");
 if(!kinds.has(kind)) return response({error:"Catégorie invalide"},400);
 try{
  const db=getDatabase();
  if(req.method==="GET"){
   const rows=await db.sql`select id,kind,data,created_at,updated_at from aurea_crm_records where kind=${kind} order by updated_at desc limit 250`;
   return response({items:rows});
  }
  if(req.method==="DELETE"){
   const id=url.searchParams.get("id");
   if(!/^[0-9a-f-]{36}$/i.test(id||""))return response({error:"Identifiant invalide"},400);
   const deleted=await db.sql`delete from aurea_crm_records where id=${id}::uuid and kind=${kind} returning id`;
   return response({deleted:deleted.length===1});
  }
  if(Number(req.headers.get("content-length")||0)>12000)return response({error:"Taille de requête excessive"},413);
  const body=await req.json(),data=clean(kind,body.data);
  if(!data)return response({error:"Un nom ou titre est obligatoire"},400);
  if(req.method==="POST"){
   const rows=await db.sql`insert into aurea_crm_records(kind,data) values (${kind},${JSON.stringify(data)}::jsonb) returning id,kind,data,created_at,updated_at`;
   return response({item:rows[0]},201);
  }
  const id=url.searchParams.get("id");
  if(!/^[0-9a-f-]{36}$/i.test(id||""))return response({error:"Identifiant invalide"},400);
  const rows=await db.sql`update aurea_crm_records set data=${JSON.stringify(data)}::jsonb,updated_at=now() where id=${id}::uuid and kind=${kind} returning id,kind,data,created_at,updated_at`;
  return rows.length?response({item:rows[0]}):response({error:"Introuvable"},404);
 }catch(error){
  console.error("aurea-crm",error);
  return response({error:"Service indisponible : vérifier la configuration de la base."},503);
 }
}
export const config={
 path:"/api/aurea-crm",
 rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:60,windowLimit:120}
};
