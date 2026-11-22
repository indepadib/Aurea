import {getDatabase} from "@netlify/database";
import {sameOrigin,response} from "../../lib/aurea-auth.mjs";
import {verifyPassword} from "../../lib/aurea-ops-core.mjs";
import {issueFieldCookie,clearFieldCookie} from "../../lib/aurea-field-core.mjs";

export default async function handler(req){
 if(req.method!=="POST")return response({error:"Méthode non autorisée"},405);
 if(!sameOrigin(req))return response({error:"Origine invalide"},403);
 if(Number(req.headers.get("content-length")||0)>2400)return response({error:"Requête trop volumineuse"},413);
 try{
  const body=await req.json();
  if(body.action==="logout")return response({authenticated:false},200,{"Set-Cookie":clearFieldCookie()});
  if(body.action!=="login")return response({error:"Action inconnue"},400);
  const email=String(body.email||"").trim().toLowerCase(),password=body.password;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>250||
     typeof password!=="string"||password.length>256)return response({error:"Identifiants incorrects"},401);
  const db=getDatabase();
  const rows=await db.sql`select a.id,a.full_name,a.password_hash,a.session_rev from aurea_ops_agents a
   join aurea_ops_teams t on t.id=a.team_id and t.active=true
   where lower(a.email)=${email} and a.active=true limit 1`;
  if(!rows.length||!verifyPassword(password,rows[0].password_hash))return response({error:"Identifiants incorrects"},401);
  return response({authenticated:true,name:rows[0].full_name},200,{"Set-Cookie":issueFieldCookie(rows[0].id,rows[0].session_rev)});
 }catch(e){console.error("aurea-field-login",e?.code||"unavailable");return response({error:"Connexion indisponible"},503)}
}
export const config={path:"/api/aurea-field-login",rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:60,windowLimit:10}};
