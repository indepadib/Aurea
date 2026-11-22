import {createHmac,randomBytes,scryptSync,timingSafeEqual} from "node:crypto";

const COOKIE="aurea_host";
const AGE=8*60*60;
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const env=(name)=>(typeof Netlify!=="undefined"&&Netlify?.env?.get?.(name))||process.env[name]||"";
const signature=(payload)=>createHmac("sha256",env("AUREA_SESSION_SECRET")).update(payload).digest("hex");
const secureEquals=(a,b)=>{
 const x=Buffer.from(String(a)),y=Buffer.from(String(b));
 return x.length===y.length&&timingSafeEqual(x,y);
};
export function hashPassword(password){
 if(typeof password!=="string"||password.length<16||password.length>256)throw Error("Mot de passe invalide");
 const salt=randomBytes(16).toString("hex");
 return "scrypt:"+salt+":"+scryptSync(password,salt,64).toString("hex");
}
export function verifyPassword(password,stored){
 if(typeof password!=="string"||password.length>256||typeof stored!=="string")return false;
 const parts=stored.split(":");
 if(parts.length!==3||parts[0]!=="scrypt"||!/^[a-f0-9]{32}$/.test(parts[1])||!/^[a-f0-9]{128}$/.test(parts[2]))return false;
 return secureEquals(scryptSync(password,parts[1],64).toString("hex"),parts[2]);
}
export const newHostPassword=()=>randomBytes(21).toString("base64url");
export function hostCookie(companyId,rev=0){
 if(!UUID.test(companyId)||env("AUREA_SESSION_SECRET").length<32)throw Error("Configuration manquante");
 const payload=["v2",companyId,String(rev),Date.now()+AGE*1000,randomBytes(12).toString("hex")].join(".");
 return COOKIE+"="+payload+"."+signature(payload)+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age="+AGE;
}
export const clearHostCookie=()=>COOKIE+"=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
export function hostId(request){
 if(env("AUREA_SESSION_SECRET").length<32)return null;
 const raw=(request.headers.get("cookie")||"").split(";").map(v=>v.trim()).find(v=>v.startsWith(COOKIE+"="))?.slice(COOKIE.length+1)||"";
 const p=raw.split(".");
 if(p.length!==6||p[0]!=="v2"||!UUID.test(p[1])||!/^\d{1,7}$/.test(p[2])||!/^\d{13}$/.test(p[3])||!/^[a-f0-9]{24}$/.test(p[4])||!/^[a-f0-9]{64}$/.test(p[5]))return null;
 const exp=Number(p[3]);
 if(exp<=Date.now()||exp>Date.now()+AGE*1000+60000)return null;
 return secureEquals(p[5],signature(p.slice(0,5).join(".")))?{id:p[1],rev:Number(p[2])}:null;
}
export function validSlot(start,end){
 if(typeof start!=="string"||typeof end!=="string"||!/(Z|[+-]\d\d:\d\d)$/.test(start)||!/(Z|[+-]\d\d:\d\d)$/.test(end))return false;
 const a=Date.parse(start),b=Date.parse(end);
 return Number.isFinite(a)&&Number.isFinite(b)&&a>=Date.now()-300000&&b>a&&b-a>=30*60000&&b-a<=12*3600000;
}
export function validTurnover(start,end,checkout="",checkin=""){
 if(!validSlot(start,end))return false;
 for(const item of [checkout,checkin]){
  if(item && (typeof item!=="string"||!/(Z|[+-]\\d\\d:\\d\\d)$/.test(item)||!Number.isFinite(Date.parse(item))))return false;
 }
 if(checkout && Date.parse(checkout)>Date.parse(start))return false;
 if(checkin && Date.parse(checkin)<Date.parse(end))return false;
 if(checkout && checkin && Date.parse(checkout)>=Date.parse(checkin))return false;
 return true;
}
const graph={
 requested:["confirmed","cancelled"],
 confirmed:["assigned","cancelled"],
 assigned:["in_progress","cancelled"],
 in_progress:["qa"],
 qa:["in_progress","completed"],
 completed:[],
 cancelled:[]
};
export function validTransition(from,to,actor){
 if(!graph[from]?.includes(to))return false;
 return actor==="admin"||(actor==="concierge"&&from==="requested"&&to==="cancelled");
}
export const qualityComplete=(checks)=>checks&&["cleaning","linen","consumables","secure"].every(k=>checks[k]===true);
export function detectImage(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<12||bytes.byteLength>3145728)return null;
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return "image/jpeg";
 if([137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x))return "image/png";
 if(String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return "image/webp";
 return null;
}
