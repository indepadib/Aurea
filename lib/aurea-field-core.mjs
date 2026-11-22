import {createHmac,randomBytes,timingSafeEqual} from "node:crypto";
import {UUID} from "./aurea-ops-core.mjs";
const COOKIE="aurea_field";
const MAX_AGE=60*60*8;
const secret=()=>((typeof Netlify!=="undefined"&&Netlify?.env?.get?.("AUREA_SESSION_SECRET"))||process.env.AUREA_SESSION_SECRET||"");
function mac(payload){return createHmac("sha256",secret()).update(payload).digest("hex")}
function safeEq(a,b){
 const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));
 return aa.length===bb.length&&timingSafeEqual(aa,bb);
}
export function issueFieldCookie(agentId,version){
 if(!UUID.test(agentId)||!Number.isSafeInteger(version)||version<0||secret().length<32)throw Error("Session non configurable");
 const payload=["v1",agentId,String(version),String(Date.now()+MAX_AGE*1000),randomBytes(12).toString("hex")].join(".");
 return COOKIE+"="+payload+"."+mac(payload)+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age="+MAX_AGE;
}
export function clearFieldCookie(){return COOKIE+"=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"}
export function readFieldSession(req){
 if(secret().length<32)return null;
 const pair=(req.headers.get("cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(COOKIE+"="));
 const parts=(pair?.slice(COOKIE.length+1)||"").split(".");
 if(parts.length!==6||parts[0]!=="v1"||!UUID.test(parts[1])||
    !/^\d{1,8}$/.test(parts[2])||!/^\d{13}$/.test(parts[3])||
    !/^[0-9a-f]{24}$/.test(parts[4])||!/^[0-9a-f]{64}$/.test(parts[5]))return null;
 const expire=Number(parts[3]);
 if(expire<Date.now()||expire>Date.now()+MAX_AGE*1000+60000)return null;
 if(!safeEq(parts[5],mac(parts.slice(0,5).join("."))))return null;
 return {id:parts[1],version:Number(parts[2])};
}
export async function fieldActor(req,db){
 const session=readFieldSession(req);
 if(!session)return null;
 const rows=await db.sql`select a.id,a.team_id,a.full_name from aurea_ops_agents a
  join aurea_ops_teams t on t.id=a.team_id and t.active=true
  where a.id=${session.id}::uuid and a.session_rev=${session.version} and a.active=true limit 1`;
 return rows[0]||null;
}
export const fieldCanStart=status=>status==="assigned";
export const fieldCanSubmit=status=>status==="in_progress";
