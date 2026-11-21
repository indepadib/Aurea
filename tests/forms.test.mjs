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
 assert.match(mapped.sourceKey,/^netlify-form:[a-f0-9]{64}$/);
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
 assert.equal(mapFormSubmission({...raw,profil:"Particulier"}).data.segment,"HOME");
});
