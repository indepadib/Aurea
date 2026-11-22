import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {mapFormSubmission} from "../lib/aurea-form.mjs";
import {funnelCounts,publicFunnelLink} from "../admin/funnel-ui.js";
import {issueCookie,isAuthorized} from "../lib/aurea-auth.mjs";
import {contactLinks} from "../admin/outreach.js";
globalThis.Netlify={env:{get:key=>({
 AUREA_ADMIN_PASSWORD:"local-test-very-long-admin-password",
 AUREA_SESSION_SECRET:"local-test-independent-32-char-session-secret"
})[key]}};


test("Auréa Hosts qualified lead records campaign, contact preference and optional tasks",()=>{
 const entry=mapFormSubmission({
  "form-name":"demande-devis",nom:"Host Test",telephone:"0612345678",email:"host@example.ma",
  ville:"Les Arènes, Zenata",profil:"Propriétaire Airbnb / Booking",service:"Préparation Airbnb / Booking",
  volume:"2 studios",frequence:"4 à 8 rotations",options:"Ménage entre réservations ; Linge hôtelier",
  preference_contact:"WhatsApp",date_souhaitee:"2026-12-01",parcours:"hosts",
  source_campagne:"facebook / winter",message:"Préparation chaque semaine",
  consentement_contact:"on",request_id:"aabbccdd-1122-4222-8222-aabbccddeeff"
 });
 assert.equal(entry.data.segment,"HOSTS");
 assert.equal(entry.data.status,"Nouveau");
 assert.equal(entry.data.preferredContact,"WhatsApp");
 assert.equal(entry.data.requestedDate,"2026-12-01");
 assert.match(entry.data.serviceOptions,/Linge hôtelier/);
 assert.equal(entry.data.sourceCampaign,"facebook / winter");
 assert.match(entry.sourceKey,/^netlify-form:uuid:/);
});
test("Syndic request must create SECURITE lead, never HOME",()=>{
 const base={"form-name":"demande-devis",nom:"Syndic Test",telephone:"0522456745",ville:"Résidence Zenata",profil:"Syndic / Gestionnaire de résidence",
 service:"Entretien de résidence / étude gardiennage",consentement_contact:"on",parcours:"syndic"};
 const mapped=mapFormSubmission(base);
 assert.equal(mapped.data.segment,"SECURITE");
 assert.match(mapped.data.nextAction,/qualifier/i);
 assert.equal(mapFormSubmission({...base,consentement_contact:""}),null);
});
test("Home request creates HOME lead",()=>{
 const mapped=mapFormSubmission({"form-name":"demande-devis",nom:"Résident Test",telephone:"0612345678",
 ville:"Zenata",profil:"Particulier",service:"Ménage à domicile",consentement_contact:"on",parcours:"home"});
 assert.equal(mapped.data.segment,"HOME");
});
test("campaign links are directed to the correct funnel and tracking source",()=>{
 const url=new URL(publicFunnelLink("syndic","facebook"));
 assert.equal(url.pathname,"/devis/");
 assert.equal(url.searchParams.get("type"),"syndic");
 assert.equal(url.searchParams.get("utm_source"),"facebook");
 assert.equal(url.searchParams.get("utm_campaign"),"aurea-growth");
});
test("WhatsApp draft is offered only for consented inbound lead",()=>{
 const common={name:"Demandeur",phone:"06 63 21 56 26",service:"Ménage Zenata"};
 const good=contactLinks({...common,consent:"Demande entrante"},"lead");
 assert.match(good.whatsapp,/^https:\/\/wa.me\/212663215626\?text=/);
 assert.match(decodeURIComponent(good.whatsapp),/Bonjour Demandeur/);
 assert.equal(contactLinks({...common,consent:"Ne pas solliciter"},"lead").whatsapp,"");
 assert.equal(contactLinks({...common,consent:"Demande entrante"},"prospect").whatsapp,"");
});
test("aggregate funnel stage events without implying unique visitors",()=>{
 const v=funnelCounts([{stage:"vue",segment:"HOSTS",hits:17},{stage:"soumis",segment:"HOSTS",hits:3},{stage:"vue",segment:"SECURITE",hits:4},{stage:"erreur",segment:"HOME",hits:7}]);
 assert.equal(v.totals.vue,21);
 assert.equal(v.totals.soumis,3);
 assert.equal(v.bySegment.HOSTS.soumis,3);
 assert.equal(v.bySegment.HOME.vue,0);
});
test("opt-in remembered sessions have a 7-day signed cookie, default retains 8 hours",()=>{
 const normal=issueCookie(false),remembered=issueCookie(true);
 assert.match(normal,/Max-Age=28800/);
 assert.match(remembered,/Max-Age=604800/);
 assert.match(remembered,/HttpOnly; Secure; SameSite=Strict/);
 assert.equal(isAuthorized(new Request("https://example.net/",{headers:{cookie:remembered.split(";")[0]}})),true);
 assert.equal(isAuthorized(new Request("https://example.net/",{headers:{cookie:remembered.split(";")[0]+"tampered"}})),false);
});
test("production build includes the funnel and no database source",async()=>{
 const root=new URL("../",import.meta.url);
 const [land,funnel,script,form]=await Promise.all([
  readFile(new URL("../dist/index.html",import.meta.url),"utf8"),
  readFile(new URL("../dist/devis/index.html",import.meta.url),"utf8"),
  readFile(new URL("../dist/devis/wizard.js",import.meta.url),"utf8"),
  readFile(new URL("../dist/forms.html",import.meta.url),"utf8")
 ]);
 assert.match(land,/href="\/devis\/\?type=hosts/);
 assert.match(land,/href="\/devis\/\?type=syndic/);
 assert.match(funnel,/name="demande-devis"/);
 assert.match(funnel,/name="consentement_contact"/);
 assert.match(funnel,/id="stepSuccess"/);
 assert.match(form,/name="source_campagne"/);
 assert.match(form,/name="date_souhaitee"/);
 assert.match(script,/fetch\("\/"/);
});
