import {getDatabase} from "@netlify/database";
import {isAuthorized,response,sameOrigin} from "../../lib/aurea-auth.mjs";

const stages=new Set(["vue","choix","besoin","contact","soumis"]);
const segments=new Set(["HOSTS","HOME","SECURITE","INCONNU"]);
const sourcePattern=/^[a-zA-Z0-9_./:-]{1,70}$/;
export default async function handler(req){
 if(!["GET","POST"].includes(req.method))return response({error:"Méthode refusée"},405);
 try{
  const db=getDatabase();
  if(req.method==="GET"){
   if(!isAuthorized(req))return response({error:"Authentification nécessaire"},401);
   const rows=await db.sql`select stage,segment,source,sum(hits)::integer as hits from aurea_funnel_counts where day>=current_date-interval '30 days' group by stage,segment,source order by stage,segment,source limit 500`;
   return response({rows,period:"30 jours",unit:"événements (pas visiteurs uniques)"});
  }
  // Only same-origin pages can submit; origin-based check is CSRF hygiene, not anti-bot identity.
  if(!sameOrigin(req))return response({error:"Origine non autorisée"},403);
  if(Number(req.headers.get("content-length")||0)>1024)return response({error:"Requête excessive"},413);
  const data=await req.json();
  const stage=String(data.stage||""),segment=String(data.segment||"INCONNU"),source=String(data.source||"direct").slice(0,70);
  if(!stages.has(stage)||!segments.has(segment)||!sourcePattern.test(source))return response({error:"Événement invalide"},400);
  await db.sql`insert into aurea_funnel_counts(day,stage,segment,source,hits) values(current_date,${stage},${segment},${source},1)
   on conflict(day,stage,segment,source) do update set hits=aurea_funnel_counts.hits+1`;
  return response({recorded:true},201);
 }catch(err){
  console.error("aurea-funnel",err);
  return response({error:"Statistiques indisponibles"},503);
 }
}
export const config={path:"/api/aurea-funnel",rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:60,windowLimit:100}};
