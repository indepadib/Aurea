import {configured,issueCookie,clearCookie,isAuthorized,validPassword,sameOrigin,response} from "../../lib/aurea-auth.mjs";
export default async function handler(req){
 if(req.method==="GET") return response({authenticated:isAuthorized(req),configured:configured()});
 if(req.method!=="POST") return response({error:"Méthode non autorisée"},405);
 if(!sameOrigin(req)) return response({error:"Origine invalide"},403);
 let body;
 try{ if(Number(req.headers.get("content-length")||0)>2048) return response({error:"Requête trop longue"},413);body=await req.json(); }
 catch{return response({error:"Requête invalide"},400);}
 if(body.action==="logout") return response({authenticated:false},200,{"Set-Cookie":clearCookie()});
 if(body.action!=="login") return response({error:"Action invalide"},400);
 if(!validPassword(body.password)) return response({error:"Identifiants incorrects"},401);
 return response({authenticated:true},200,{"Set-Cookie":issueCookie(body.remember===true)});
}
export const config={
 path:"/api/aurea-auth",
 rateLimit:{action:"rate_limit",aggregateBy:"ip",windowSize:60,windowLimit:12}
};
