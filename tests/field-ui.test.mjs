import test from "node:test";
import assert from "node:assert/strict";
import {Window} from "happy-dom";
const jobId="f8a0741d-534a-4e91-a0ce-6ce304875f01";
test("field dashboard renders a daily assignment and private task detail",async()=>{
 const window=new Window({url:"https://example.test/field/"});
 window.document.body.innerHTML='<div id="field-app"></div>';
 const previous={window:globalThis.window,document:globalThis.document,FormData:globalThis.FormData,fetch:globalThis.fetch};
 globalThis.window=window;globalThis.document=window.document;globalThis.FormData=window.FormData;
 const now=new Date().toISOString(),requests=[];
 globalThis.fetch=async(url,opts={})=>{
  requests.push(String(url));let result={};
  if(String(url).includes("resource=session"))result={id:"a",name:"Sami Essai"};
  else if(String(url).includes("resource=overview"))result={name:"Sami Essai",jobs:[{id:jobId,property_name:"Studio des Arènes",address:"Zenata, Maroc",status:"assigned",team_name:"Équipe essai",start_at:now,end_at:new Date(Date.now()+2*3600000).toISOString(),notes:"Ménage de sortie",linen_notes:"Changer les draps",consumables_notes:"Savon",access_notes:"Instructions test sans code"}]};
  else if(String(url).includes("resource=history"))result={events:[],photos:[]};
  return {ok:true,status:200,json:async()=>result};
 };
 try{
  await import("../field/field.js?test-ui");
  await new Promise(res=>setTimeout(res,60));
  const doc=window.document;
  assert.match(doc.body.textContent,/Bonjour Sami/);
  assert.match(doc.body.textContent,/Studio des Arènes/);
  doc.querySelector('[data-action="detail"]').click();
  await new Promise(res=>setTimeout(res,40));
  assert.ok(doc.querySelector("#field-overlay"));
  assert.match(doc.querySelector("#field-overlay").textContent,/Consommables/);
  assert.ok(doc.querySelector('[data-action="start"]'));
  assert.ok(doc.querySelector('form[data-form="incident"]'));
  assert.ok(requests.some(s=>s.includes("resource=history")));
 }finally{
  globalThis.window=previous.window;globalThis.document=previous.document;globalThis.FormData=previous.FormData;globalThis.fetch=previous.fetch;window.close();
 }
});
