import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
globalThis.Netlify={env:{get:key=>key==="AUREA_SESSION_SECRET"?"safe-test-secret-32-chars-plus-and-never-a-real-credential":""}};
const sec=await import("../lib/aurea-property-security.mjs");
test("lock codes encrypt with random authenticated ciphertext, not plaintext",()=>{
 const one=sec.encryptLockCode("8426#"),two=sec.encryptLockCode("8426#");
 assert.notEqual(one,two);
 assert.equal(one.includes("8426#"),false);
 assert.equal(sec.decryptLockCode(one),"8426#");
 assert.equal(sec.decryptLockCode(two),"8426#");
 assert.throws(()=>sec.decryptLockCode(one.slice(0,-2)+"AB"));
});
test("reject malformed or empty door access credentials",()=>{
 for(const code of ["","12"," 1234","1234 ","12\n34","x".repeat(65)])assert.equal(sec.validLockCode(code),false);
 assert.equal(sec.validLockCode("1234*"),true);
});
test("only time-ordered photo after start is proof eligible for QA",()=>{
 const start="2026-11-22T12:00:00Z";
 assert.equal(sec.canCountAsAfterPhoto("after","2026-11-22T12:20:00Z",start),true);
 assert.equal(sec.canCountAsAfterPhoto("before","2026-11-22T12:20:00Z",start),false);
 assert.equal(sec.canCountAsAfterPhoto("legacy","2026-11-22T12:20:00Z",start),false);
 assert.equal(sec.canCountAsAfterPhoto("after","2026-11-22T11:59:00Z",start),false);
 assert.equal(sec.canCountAsAfterPhoto("after","2026-11-22T12:20:00Z",null),false);
});
test("API sources deny final validation with generic or older photos",async()=>{
 const ops=await readFile(new URL("../netlify/functions/aurea-ops.mjs",import.meta.url),"utf8");
 const field=await readFile(new URL("../netlify/functions/aurea-field.mjs",import.meta.url),"utf8");
 for(const source of [ops,field]){
  assert.match(source,/photo_type='after'/);
  assert.match(source,/created_at >=/);
 }
 assert.match(ops,/and company_id=/);
 assert.match(field,/and j\.team_id=/);
 const photo=await readFile(new URL("../netlify/functions/aurea-ops-photo.mjs",import.meta.url),"utf8");
 assert.match(photo,/validPhotoType\(photoType\)/);
 assert.match(photo,/!job\[0\]\.started_at/);
});
