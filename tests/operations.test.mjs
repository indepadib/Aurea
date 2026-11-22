import test from "node:test";
import assert from "node:assert/strict";
import {readFile,access} from "node:fs/promises";
import {existsSync} from "node:fs";
const cfg={AUREA_SESSION_SECRET:"local-tests-secret-longer-than-thirty-two-characters"};
globalThis.Netlify={env:{get:k=>cfg[k]}};
const core=await import("../lib/aurea-ops-core.mjs");
const company="d149d00a-d407-4a23-801e-61f62d29f20e";
test("conciergerie passwords are salted and never stored in plaintext",()=>{
 const hash=core.hashPassword("a-secure-partner-password-123");
 assert.match(hash,/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
 assert.notEqual(hash,core.hashPassword("a-secure-partner-password-123"));
 assert.equal(core.verifyPassword("a-secure-partner-password-123",hash),true);
 assert.equal(core.verifyPassword("wrong-password",hash),false);
});
test("host session cookie is signed, HttpOnly and rejects tampering",()=>{
 const cookie=core.hostCookie(company);
 assert.match(cookie,/HttpOnly/);
 assert.match(cookie,/Secure/);
 assert.match(cookie,/SameSite=Strict/);
 const raw=cookie.split(";")[0],req=value=>new Request("https://aurea.test/",{headers:{cookie:value}});
 assert.deepEqual(core.hostId(req(raw)),{id:company,rev:0});
 assert.equal(core.hostId(req(raw.replace(company,"d149d00a-d407-4a23-801e-61f62d29f20f"))),null);
 assert.equal(core.hostId(req(core.clearHostCookie())),null);
 assert.deepEqual(core.hostId(req(core.hostCookie(company,3).split(";")[0])),{id:company,rev:3});
});
test("only admins can confirm, assign and complete",()=>{
 assert.equal(core.validTransition("requested","confirmed","concierge"),false);
 assert.equal(core.validTransition("requested","cancelled","concierge"),true);
 assert.equal(core.validTransition("confirmed","assigned","admin"),true);
 assert.equal(core.validTransition("assigned","completed","admin"),false);
 assert.equal(core.validTransition("qa","completed","admin"),true);
 assert.equal(core.validTransition("completed","confirmed","admin"),false);
});
test("future windows are required and cannot exceed 12 hours",()=>{
 const start=new Date(Date.now()+3600000).toISOString();
 const end=new Date(Date.now()+3*3600000).toISOString();
 assert.equal(core.validSlot(start,end),true);
 assert.equal(core.validSlot(end,start),false);
 assert.equal(core.validSlot(new Date(Date.now()-86400000).toISOString(),end),false);
 assert.equal(core.validSlot(start,new Date(Date.now()+16*3600000).toISOString()),false);
 assert.equal(core.validSlot("2026-12-01T10:00","2026-12-01T11:00"),false);
});
test("completion needs all four quality checks",()=>{
 assert.equal(core.qualityComplete({cleaning:true,linen:true,consumables:true,secure:true}),true);
 assert.equal(core.qualityComplete({cleaning:true,linen:true,consumables:true,secure:false}),false);
});
test("only real JPEG, PNG and WEBP bytes pass image screening",()=>{
 assert.equal(core.detectImage(Uint8Array.from([0xff,0xd8,0xff,...new Array(20).fill(0)])),"image/jpeg");
 assert.equal(core.detectImage(Uint8Array.from([0x89,80,78,71,13,10,26,10,...new Array(12).fill(0)])),"image/png");
 assert.equal(core.detectImage(new Uint8Array(30)),null);
 assert.equal(core.detectImage(new Uint8Array(3145729)),null);
});
test("build exposes only UI entrypoints; private server modules remain excluded",async()=>{
 for(const f of ["hosts/index.html","operations/index.html","ops/console.js","ops/console.css"]){
  assert.equal(existsSync(new URL("../dist/"+f,import.meta.url)),true);
 }
 assert.equal(existsSync(new URL("../dist/lib/aurea-ops-core.mjs",import.meta.url)),false);
 assert.equal(existsSync(new URL("../dist/netlify/functions/aurea-ops.mjs",import.meta.url)),false);
 const html=await readFile(new URL("../dist/hosts/index.html",import.meta.url),"utf8");
 assert.match(html,/Auréa Hosts/);
});
