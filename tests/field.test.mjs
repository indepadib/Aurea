import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {existsSync} from "node:fs";
const config={AUREA_SESSION_SECRET:"local-field-test-secret-with-forty-plus-characters"};
globalThis.Netlify={env:{get:k=>config[k]}};
const auth=await import("../lib/aurea-field-core.mjs");
const id="d149d00a-d407-4a23-801e-61f62d29f20e",team="4b3cc56d-8e3f-4ec3-9efe-7384c332b3ee";
const request=cookie=>new Request("https://example.test/api/aurea-field",{headers:{cookie}});
test("individual field session is HttpOnly, signed and revocable",()=>{
 const raw=auth.issueFieldCookie(id,3);
 assert.match(raw,/HttpOnly/);assert.match(raw,/Secure/);assert.match(raw,/SameSite=Strict/);
 const pair=raw.split(";")[0];
 assert.deepEqual(auth.readFieldSession(request(pair)),{id,version:3});
 assert.equal(auth.readFieldSession(request(pair.replace(id,"e149d00a-d407-4a23-801e-61f62d29f20e"))),null);
 assert.equal(auth.readFieldSession(request(pair+"wrong")),null);
 assert.equal(auth.readFieldSession(request(auth.clearFieldCookie())),null);
});
test("field role checked against team and current session revision",async()=>{
 const cookie=auth.issueFieldCookie(id,3).split(";")[0];
 const seen=[];
 const db={sql:async(parts,...values)=>{seen.push({statement:parts.join("?"),values});return [{id,team_id:team,full_name:"Test agent"}]}};
 const actor=await auth.fieldActor(request(cookie),db);
 assert.equal(actor.team_id,team);
 assert.match(seen[0].statement,/aurea_ops_teams/);
 assert.match(seen[0].statement,/session_rev/);
 assert.equal(seen[0].values[0],id);
 assert.equal(seen[0].values[1],3);
 assert.equal(await auth.fieldActor(request(""),db),null);
});
test("field portal files are public UI only; server modules stay private",async()=>{
 for(const name of ["field/index.html","field/field.js","field/field.css"])
  assert.equal(existsSync(new URL("../dist/"+name,import.meta.url)),true);
 assert.equal(existsSync(new URL("../dist/lib/aurea-field-core.mjs",import.meta.url)),false);
 assert.equal(existsSync(new URL("../dist/netlify/functions/aurea-field.mjs",import.meta.url)),false);
 const html=await readFile(new URL("../dist/field/index.html",import.meta.url),"utf8");
 assert.match(html,/Auréa Field/);
});
