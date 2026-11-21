import {createHmac, createHash, randomBytes, timingSafeEqual} from "node:crypto";
const MAX_AGE=60*60*8;
const COOKIE="aurea_session";
const env=(key)=>Netlify.env.get(key)||process.env[key];
export function configured(){
 return (env("AUREA_ADMIN_PASSWORD")||"").length>=16 && (env("AUREA_SESSION_SECRET")||"").length>=32;
}
function eq(a,b){
 const left=createHash("sha256").update(String(a)).digest();
 const right=createHash("sha256").update(String(b)).digest();
 return timingSafeEqual(left,right);
}
function sign(payload){
 return createHmac("sha256",env("AUREA_SESSION_SECRET")).update(payload).digest("hex");
}
export function issueCookie(){
 const expiry=Date.now()+MAX_AGE*1000, nonce=randomBytes(16).toString("hex");
 const payload="v1."+expiry+"."+nonce, signature=sign(payload);
 return COOKIE+"="+payload+"."+signature+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age="+MAX_AGE;
}
export function clearCookie(){
 return COOKIE+"=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}
export function isAuthorized(req){
 if(!configured()) return false;
 const pair=(req.headers.get("cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="));
 if(!pair) return false;
 const token=pair.slice(COOKIE.length+1), parts=token.split(".");
 if(parts.length!==4 || parts[0]!=="v1") return false;
 const [version,expiry,nonce,sig]=parts;
 if(!/^\d{13}$/.test(expiry)|| !/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(sig)) return false;
 if(Number(expiry)<Date.now() || Number(expiry)>Date.now()+MAX_AGE*1000+60000) return false;
 return eq(sig,sign(version+"."+expiry+"."+nonce));
}
export function validPassword(pass){
 if(!configured() || typeof pass!=="string" || pass.length>256) return false;
 return eq(pass,env("AUREA_ADMIN_PASSWORD"));
}
export function sameOrigin(req){
 const origin=req.headers.get("origin");
 const site=new URL(req.url).origin;
 return origin===site;
}
export function response(data,status=200,headers={}){
 return Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...headers}});
}
