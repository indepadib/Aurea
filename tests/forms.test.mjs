import test from "node:test";
import assert from "node:assert/strict";
import {mapFormSubmission} from "../lib/aurea-form.mjs";
const raw={
 "form-name":"demande-devis",nom:"Propriétaire Test",telephone:"0600000000",
 email:"owner@example.com",ville:"Zenata",
 profil:"Propriétaire Airbnb / Booking",
 service:"Pack Airbnb / Booking",
 volume:"2 appartements",frequence:"Selon réservations / turnovers",
 message:"Je cherche un service de préparation.",
 consentement_contact:"on"
};
test("verified form submission maps to a HOSTS lead",()=>{
 const mapped=mapFormSubmission(raw);
 assert.equal(mapped.data.status,"Nouveau");
 assert.equal(mapped.data.segment,"HOSTS");
 assert.equal(mapped.data.source,"Site Auréa");
 assert.equal(mapped.data.consent,"Demande entrante");
 assert.match(mapped.sourceKey,/^netlify-form:legacy:[a-f0-9]{64}$/);
});
test("form intake requires consent and valid contact",()=>{
 assert.equal(mapFormSubmission({...raw,consentement_contact:""}),null);
 assert.equal(mapFormSubmission({...raw,telephone:""}),null);
 assert.equal(mapFormSubmission({...raw,"form-name":"autre-formulaire"}),null);
});
test("idempotence key is stable for duplicate delivery",()=>{
 assert.equal(mapFormSubmission(raw).sourceKey,mapFormSubmission({...raw}).sourceKey);
});
test("personal home request maps to HOME",()=>{
 assert.equal(mapFormSubmission({...raw,profil:"Particulier",service:"Ménage à domicile"}).data.segment,"HOME");
});
test("different form attempts create different CRM leads even with identical details",()=>{
 const a=mapFormSubmission({...raw,request_id:"014f993a-bf7d-4f36-a6da-f86a8dcf17c0"});
 const b=mapFormSubmission({...raw,request_id:"0d4d5da5-d9fa-4e41-999a-dbeaa2d8f5f4"});
 assert.notEqual(a.sourceKey,b.sourceKey);
 assert.equal(a.sourceKey,mapFormSubmission({...raw,request_id:"014f993a-bf7d-4f36-a6da-f86a8dcf17c0"}).sourceKey);
});
test("form mapping cannot turn an unrelated form into a CRM lead",()=>{
 assert.equal(mapFormSubmission({...raw,"form-name":"newsletter"}),null);
});
