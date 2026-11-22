import {getDatabase} from "@netlify/database";
import {isAuthorized,sameOrigin,response} from "../../lib/aurea-auth.mjs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kinds=new Set(["prospect","lead","partner"]);
const results=new Set(["email_envoye","appel_effectue","reponse_recue","rendezvous_confirme","devis_transmis","vente_conclue","non_interesse","note"]);
const channels=new Set(["email","telephone","whatsapp","reunion","interne","autre"]);
const statusFor={
 email_envoye:{prospect:"Contacté",lead:"Contacté",partner:"Contacté"},
 appel_effectue:{prospect:"Contacté",lead:"Contacté",partner:"Contacté"},
 reponse_recue:{prospect:"En échange",lead:"Qualifié",partner:"En négociation"},
 rendezvous_confirme:{prospect:"Rendez-vous",lead:"Rendez-vous",partner:"En négociation"},
 devis_transmis:{prospect:"Devis envoyé",lead:"Devis envoyé",partner:"En négociation"},
 vente_conclue:{prospect:"Client",lead:"Client",partner:"Actif"},
 non_interesse:{prospect:"Sans suite",lead:"Perdu",partner:"Écarté"}
};
const clean=(x,max=900)=>typeof x==="string"?x.trim().slice(0,max):"";
export default async function handler(req){
 if(!isAuthorized(req))return response({error:"Connexion nécessaire"},401);
 if(req.method!=="GET"&&req.method!=="POST")return response({error:"Méthode non autorisée"},405);
 if(req.method==="POST"&&!sameOrigin(req))return response({error:"Origine invalide"},403);
 const url=new URL(req.url);
 let id=url.searchParams.get("recordId"),kind=url.searchParams.get("kind");
 try{
  if(req.method==="GET"){
   if(!uuid.test(id||"")||!kinds.has(kind))return response({error:"Fiche invalide"},400);
   const db=getDatabase();
   const items=await db.sql`select id,record_id,kind,result,channel,note,next_action,next_date,performed_at from aurea_crm_activities where record_id=${id}::uuid and kind=${kind} order by performed_at desc limit 100`;
   return response({items});
  }
  const length=Number(req.headers.get("content-length")||0);
  if(length>6000)return response({error:"Requête trop longue"},413);
  const body=await req.json();
  id=body.recordId;kind=body.kind;
  const result=clean(body.result,45),channel=clean(body.channel,40),note=clean(body.note,1500),nextAction=clean(body.nextAction,400),nextDate=clean(body.nextDate,10);
  if(!uuid.test(id||"")||!kinds.has(kind)||!results.has(result)||!channels.has(channel))
   return response({error:"Activité invalide"},400);
  if(nextDate&&!/^\d{4}-\d{2}-\d{2}$/.test(nextDate))return response({error:"Date invalide"},400);
  if(result!=="note" && note.length<5)return response({error:"Précisez brièvement le résultat réel de cet échange"},400);
  const db=getDatabase();
  const exists=await db.sql`select id,data from aurea_crm_records where id=${id}::uuid and kind=${kind} limit 1`;
  if(!exists.length)return response({error:"Fiche introuvable"},404);
  // Guard against an unlicensed security contract being marked closed.
  const recordData=exists[0]?.data||{};
  const isSecurity=kind==="lead" && recordData.segment==="SECURITE";
  if(result==="vente_conclue" && isSecurity &&
   (recordData.securityCompliance!=="Autorisations vérifiées" || String(recordData.complianceEvidence||"").trim().length<10))
   return response({error:"Gardiennage : renseignez et documentez la vérification des autorisations avant de marquer ce dossier comme client."},409);
  const items=await db.sql`
   insert into aurea_crm_activities(record_id,kind,result,channel,note,next_action,next_date)
   values (${id}::uuid,${kind},${result},${channel},${note},${nextAction},${nextDate||null}::date)
   returning id,record_id,kind,result,channel,note,next_action,next_date,performed_at`;
  const status=statusFor[result]?.[kind];
  const patch={};
  if(status)patch.status=status;
  if(nextAction)patch.nextAction=nextAction;
  if(nextDate)patch.nextDate=nextDate;
  if(["email_envoye","appel_effectue"].includes(result)){
   patch.contactedAt=new Date().toISOString().slice(0,10);
   patch.lastContactChannel=channel==="email"?"Email":channel==="telephone"?"Téléphone":channel;
  }
  if(Object.keys(patch).length){
   await db.sql`update aurea_crm_records set data=data||${JSON.stringify(patch)}::jsonb,updated_at=now() where id=${id}::uuid and kind=${kind}`;
  }
  return response({item:items[0]},201);
 }catch(error){
  console.error("aurea-activities",error);
  return response({error:"Impossible de sauvegarder l'activité"},503);
 }
}
export const config={path:"/api/aurea-activities",rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:60,windowLimit:100}};
