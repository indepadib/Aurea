import {getDatabase} from "@netlify/database";
import {sameOrigin,response} from "../../lib/aurea-auth.mjs";
import {verifyPassword,hostCookie,clearHostCookie,hostId} from "../../lib/aurea-ops-core.mjs";

export default async function handler(req){
 if(req.method!=="POST")return response({error:"Méthode non autorisée"},405);
 if(!sameOrigin(req))return response({error:"Origine invalide"},403);
 if(Number(req.headers.get("content-length")||0)>2500)return response({error:"Requête excessive"},413);
 try{
  const body=await req.json();
  if(body.action==="logout")return response({authenticated:false},200,{"Set-Cookie":clearHostCookie()});
  if(body.action!=="login")return response({error:"Action inconnue"},400);
  const email=String(body.email||"").trim().toLowerCase(),password=body.password;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>250||typeof password!=="string"||password.length>256)
   return response({error:"Identifiants incorrects"},401);
  const db=getDatabase();
  const rows=await db.sql`select id,name,password_hash from aurea_ops_companies where lower(email)=${{email} and active=true limit 1`;
  if(!rows.length||!verifyPassword(password,rows[0].password_hash))return response({error:"Identifiants incorrects"},401);
  return response({authenticated:true,company:rows[0].name},200,{"Set-Cookie":hostCookie(rows[0].id)});
 }catch(e){
  console.error("aurea-host-login",e?.code||"failed");
  return response({error:"Connexion indisponible"},503);
 }
}
export const config={path:"/api/aurea-host-login",rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:60,windowLimit:10}};
