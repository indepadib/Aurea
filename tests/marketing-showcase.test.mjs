import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import {composeOutreach} from "../admin/outreach.js";
import {renderComposeModal} from "../admin/sales-ui.js";

const demo="https://aurea-services.netlify.app/presentation/";
test("Auréa marketing showcase is bundled and product screens are anonymized",async()=>{
 const html=await readFile(new URL("../dist/presentation/index.html",import.meta.url),"utf8");
 assert.match(html,/Démonstration/);
 assert.match(html,/données fictives/);
 assert.match(html,/devis\/\?utm_source=/);
 assert.doesNotMatch(html,/1234|8426#/);
 for(const file of ["hosts.svg","operations.svg","appartement.svg","field.svg"]){
  const path=new URL("../dist/presentation/screens/"+file,import.meta.url);
  assert.equal(existsSync(path),true);
  const content=await readFile(path,"utf8");
  assert.match(content,/DÉMO/);
  assert.match(content,/fictives/i);
 }
});
test("outbound hosts email includes usable sanitized showcase links and pilot CTA",()=>{
 const data={name:"Conciergerie Démo",zone:"Zenata",segment:"Conciergerie",service:"Rotations Airbnb"};
 const email=composeOutreach(data,"prospect","intro");
 assert.match(email.body,/photos APRÈS ménage|photos après ménage/i);
 assert.match(email.body,/linge hôtelier/i);
 assert.match(email.body,/réassort/i);
 assert.match(email.body,/contrôle.*photos/i);
 assert.match(email.body,/1 ou 2 appartements/);
 assert.match(email.body,/15 minutes/);
 assert.match(email.body,/données fictives/i);
 assert.match(email.body,/presentation\/screens\/hosts\.svg/);
 assert.match(email.body,/presentation\/screens\/appartement\.svg/);
 assert.ok(email.body.length>850);
});
test("commercial composer shows screen previews only to relevant prospects",()=>{
 const hosts={id:"mock",data:{name:"Demo Homes",segment:"Conciergerie",zone:"Zenata",email:"bonjour@demo.test"}};
 const syndic={id:"mock2",data:{name:"Syndic Démo",segment:"Syndic professionnel",zone:"Zenata",email:"syndic@demo.test"}};
 const a=renderComposeModal(hosts,"prospect");
 assert.match(a,/outreach-product-shots/);
 assert.match(a,/screens\/field\.svg/);
 const b=renderComposeModal(syndic,"prospect");
 assert.doesNotMatch(b,/outreach-product-shots/);
});
test("syndic messaging does not claim certified guarding authorization",()=>{
 const email=composeOutreach({name:"Syndic Démo",segment:"Syndic professionnel"},"prospect","intro");
 assert.match(email.body,/autorisations/i);
 assert.doesNotMatch(email.body,/agréés|autorisation obtenue/i);
});
