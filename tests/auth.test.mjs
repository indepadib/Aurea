import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";

const vars = {
  AUREA_ADMIN_PASSWORD: "local-test-password-unique-very-long",
  AUREA_SESSION_SECRET: "local-test-session-secret-with-over-32-characters"
};
globalThis.Netlify = {env:{get:key => vars[key]}};

const auth = await import("../lib/aurea-auth.mjs");
test("login uses required secrets and compares password",()=>{
  assert.equal(auth.configured(),true);
  assert.equal(auth.validPassword(vars.AUREA_ADMIN_PASSWORD),true);
  assert.equal(auth.validPassword("not-the-admin-password"),false);
});
test("signed session is valid and forged cookie is rejected",()=>{
 const cookie = auth.issueCookie().split(";")[0];
 const request=(value)=>new Request("https://example.net/api/aurea-crm",{headers:{cookie:value}});
 assert.equal(auth.isAuthorized(request(cookie)),true);
 assert.equal(auth.isAuthorized(request(cookie+"not-valid")),false);
 assert.equal(auth.isAuthorized(request("aurea_session=v1.fake")),false);
 assert.equal(auth.isAuthorized(request("")),false);
});
test("cross-site request is not accepted",()=>{
 const ok=new Request("https://example.net/api/aurea-auth",{method:"POST",headers:{origin:"https://example.net"}});
 const bad=new Request("https://example.net/api/aurea-auth",{method:"POST",headers:{origin:"https://attacker.example"}});
 assert.equal(auth.sameOrigin(ok),true);
 assert.equal(auth.sameOrigin(bad),false);
});
test("missing password or session secret locks the console",()=>{
 vars.AUREA_ADMIN_PASSWORD="";
 assert.equal(auth.configured(),false);
 assert.equal(auth.isAuthorized(new Request("https://example.net/",{headers:{cookie:auth.issueCookie()}})),false);
 vars.AUREA_ADMIN_PASSWORD="local-test-password-unique-very-long";
});
test("build output preserves the vitrine and excludes private source",async()=>{
 const [site,built,forms,builtForms]=await Promise.all([
   readFile(new URL("../index.html",import.meta.url),"utf8"),
   readFile(new URL("../dist/index.html",import.meta.url),"utf8"),
   readFile(new URL("../forms.html",import.meta.url),"utf8"),
   readFile(new URL("../dist/forms.html",import.meta.url),"utf8")
 ]);
 assert.equal(built,site);
 assert.equal(builtForms,forms);
 assert.equal(existsSync(new URL("../dist/admin/index.html",import.meta.url)),true);
 assert.equal(existsSync(new URL("../dist/admin/app.js",import.meta.url)),true);
 assert.equal(existsSync(new URL("../dist/lib/aurea-auth.mjs",import.meta.url)),false);
 assert.equal(existsSync(new URL("../dist/netlify/functions/aurea-auth.mjs",import.meta.url)),false);
});
