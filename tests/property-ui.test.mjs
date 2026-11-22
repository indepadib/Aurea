import test from "node:test";
import assert from "node:assert/strict";
import {Window} from "happy-dom";

test("property dossier shows all apartment details and masks lock until authorized click",async()=>{
 const win=new Window({url:"https://preview.example/operations/"});
 win.document.body.innerHTML='<div id="app"></div>';
 win.document.body.dataset.mode="operations";
 const prev={document:globalThis.document,window:globalThis.window,FormData:globalThis.FormData,fetch:globalThis.fetch};
 globalThis.document=win.document;globalThis.window=win;globalThis.FormData=win.FormData;
 const property="6cced65d-d1e4-4b1e-a679-ce95e69b4802";
 const p={id:property,company_id:"d149d00a-d407-4a23-801e-61f62d29f20e",name:"Studio test Zenata",address:"Les Arènes, Zenata, Maroc",bedrooms:1,bathrooms:1,surface_m2:54,access_method:"code",lock_configured:true,access_notes:"Entrée côté cour",linen_notes:"Draps blancs",consumables_notes:"Savon et papier",latitude:null,longitude:null};
 const requests=[];
 globalThis.fetch=async(uri,options={})=>{
  const url=String(uri);requests.push(url);
  let data={};
  if(url.includes("resource=session"))data={role:"admin",name:"Auréa Operations"};
  else if(url.includes("resource=overview"))data={properties:[p],companies:[],teams:[],agents:[],incidents:[],jobs:[]};
  else if(url.includes("resource=property_detail"))data={property:p,jobs:[],photos:[]};
  else if(url.includes("resource=lock_code"))data={code:"8426#"};
  return {ok:true,status:200,json:async()=>data};
 };
 try{
  await import("../ops/console.js?secure-property-test");
  await new Promise(r=>setTimeout(r,60));
  const doc=win.document;
  doc.querySelector('[data-tab="properties"]').click();
  await new Promise(r=>setTimeout(r,20));
  doc.querySelector('[data-action="property-detail"]').click();
  await new Promise(r=>setTimeout(r,55));
  assert.match(doc.querySelector("#overlay").textContent,/Consignes de prestation/);
  assert.match(doc.querySelector("#overlay").textContent,/Photos et preuves des ménages/);
  assert.match(doc.querySelector("#overlay").textContent,/Draps blancs/);
  assert.equal(doc.querySelector("#overlay").textContent.includes("8426#"),false);
  assert.equal(requests.filter(x=>x.includes("resource=lock_code")).length,0);
  doc.querySelector('[data-action="reveal-lock"]').click();
  await new Promise(r=>setTimeout(r,50));
  assert.match(doc.querySelector("#lock-reveal").textContent,/8426#/);
  assert.equal(requests.filter(x=>x.includes("resource=lock_code")).length,1);
  doc.querySelector('[data-action="property"]').click();
  await new Promise(r=>setTimeout(r,20));
  assert.ok(doc.querySelector('form[data-form="property"]'));
  assert.ok(doc.querySelector('input[name="lock_code"]'));
  assert.ok(doc.querySelector('select[name="access_method"]'));
  assert.equal(doc.querySelector('input[name="lock_code"]').value,"");
 }finally{globalThis.document=prev.document;globalThis.window=prev.window;globalThis.FormData=prev.FormData;globalThis.fetch=prev.fetch;win.close()}
});
