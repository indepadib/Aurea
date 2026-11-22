import test from "node:test";
import assert from "node:assert/strict";
import {Window} from "happy-dom";

const companyId="d149d00a-d407-4a23-801e-61f62d29f20e";
const propertyId="6cced65d-d1e4-4b1e-a679-ce95e69b4802";
const jobId="f8a0741d-534a-4e91-a0ce-6ce304875f01";
const day=new Date(Date.now()+86400000).toISOString();
const after=new Date(Date.now()+93600000).toISOString();
const prop={id:propertyId,company_id:companyId,name:"Studio Zenata",address:"Résidence des Arènes, Zenata, Maroc",bedrooms:1,bathrooms:1,surface_m2:54,latitude:null,longitude:null};
const job={id:jobId,company_id:companyId,property_id:propertyId,property_name:"Studio Zenata",property_address:prop.address,start_at:day,end_at:after,status:"requested",notes:"Ménage après départ"};
async function boot(mode,nonce){
 const window=new Window({url:"https://preview.example/"+(mode==="hosts"?"hosts":"operations")+"/"});
 window.document.body.innerHTML='<div id="app"></div>';
 window.document.body.dataset.mode=mode;
 const old={document:globalThis.document,window:globalThis.window,FormData:globalThis.FormData,fetch:globalThis.fetch};
 globalThis.document=window.document;globalThis.window=window;globalThis.FormData=window.FormData;
 const calls=[];
 globalThis.fetch=async(uri,options={})=>{
  calls.push({uri:String(uri),options});
  let data={};
  if(String(uri).includes("resource=session"))data={role:mode==="hosts"?"concierge":"admin",name:"Test partenaire",companyId};
  else if(String(uri).includes("resource=overview"))data={companies:mode==="hosts"?[]:[{id:companyId,name:"Partenaire test",email:"contact@example.com",active:true}],properties:[{...prop,company_name:"Partenaire test"}],teams:mode==="hosts"?[]:[{id:"798a649f-d9a1-4e83-99ed-0a1c8a430508",name:"Équipe A",active:true}],jobs:[{...job,company_name:"Partenaire test"}]};
  else if(String(uri).includes("resource=history"))data={events:[],photos:[]};
  else if(options.method==="POST")data={job:{id:jobId,status:"requested"}};
  return {ok:true,status:200,json:async()=>data};
 };
 await import("../ops/console.js?smoke-"+nonce);
 await new Promise(resolve=>setTimeout(resolve,45));
 return {window,calls,restore:()=>{globalThis.document=old.document;globalThis.window=old.window;globalThis.FormData=old.FormData;globalThis.fetch=old.fetch;window.close();}};
}
test("Auréa Hosts renders private calendar, property and booking actions",async()=>{
 const ctx=await boot("hosts","hosts");
 try{
  const doc=ctx.window.document;
  assert.match(doc.body.textContent,/Votre planning/);
  assert.match(doc.body.textContent,/Studio Zenata/);
  assert.equal(doc.querySelectorAll(".job").length>=0,true);
  doc.querySelector('[data-action="create-job"]').click();
  assert.ok(doc.querySelector('form[data-form="job"]'));
  assert.ok(doc.querySelector('[name="propertyId"]'));
  assert.ok(doc.querySelector('[name="checkout"]'));
  assert.ok(doc.querySelector('[name="checkin"]'));
  assert.equal(doc.querySelector('[data-action="create-company"]'),null);
  doc.querySelector('#overlay [data-action="close"]').click();
  doc.querySelector('[data-action="job"]').click();
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.ok(doc.querySelector('form[data-form="incident"]'));
  assert.ok(doc.querySelector('[data-action="reschedule"]'));
 }finally{ctx.restore();}
});
test("Auréa Operations renders private team and company controls",async()=>{
 const ctx=await boot("operations","operations");
 try{
  const doc=ctx.window.document;
  assert.match(doc.body.textContent,/Chaque intervention/);
  assert.ok(doc.querySelector('[data-action="create-company"]'));
  assert.ok(doc.querySelector('[data-action="create-team"]'));
  assert.ok(doc.querySelector('[data-tab="teams"]'));
  doc.querySelector('[data-tab="teams"]').click();
  assert.match(doc.body.textContent,/Équipe A/);
 }finally{ctx.restore();}
});
