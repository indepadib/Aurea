import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {webcrypto} from "node:crypto";
import {Window} from "happy-dom";

test("real three-step browser-like quote flow sends one consented Netlify form", async()=>{
 const html=await readFile(new URL("../devis/index.html",import.meta.url),"utf8");
 const window=new Window({url:"https://aurea-services.netlify.app/devis/?type=hosts&utm_source=facebook&utm_campaign=black-friday"});
 window.document.write(html);
 const previous={window:globalThis.window,document:globalThis.document,location:globalThis.location,Option:globalThis.Option,FormData:globalThis.FormData,fetch:globalThis.fetch,crypto:globalThis.crypto};
 const submissions=[],events=[];
 try{
  globalThis.window=window;
  globalThis.document=window.document;
  globalThis.location=window.location;
  globalThis.Option=window.Option;
  globalThis.FormData=window.FormData;
  Object.defineProperty(globalThis,"crypto",{configurable:true,writable:true,value:webcrypto});
  globalThis.fetch=async(url,options)=>{
   if(String(url)==="/api/aurea-funnel")events.push(JSON.parse(options.body));
   if(String(url)==="/")submissions.push(new URLSearchParams(options.body));
   return {ok:true,json:async()=>({recorded:true})};
  };
  await import("../devis/wizard.js?ui-smoke");
  assert.equal(window.document.getElementById("step1").hidden,false);
  const button=window.document.querySelector('[data-type="hosts"]');
  button.click();
  assert.equal(window.document.getElementById("step2").hidden,false);
  const form=window.document.getElementById("quoteWizard");
  form.elements.namedItem("ville").value="Zenata, Les Arènes";
  form.elements.namedItem("volume").value="2 studios";
  const boxes=window.document.querySelectorAll(".service-option");
  assert.ok(boxes.length>=3);
  boxes[0].checked=true;
  window.document.getElementById("nextButton").click();
  assert.equal(window.document.getElementById("step3").hidden,false);
  form.elements.namedItem("nom").value="Prospect Test";
  form.elements.namedItem("telephone").value="0612345678";
  form.elements.namedItem("email").value="test@example.com";
  form.elements.namedItem("consentement_contact").checked=true;
  form.dispatchEvent(new window.Event("submit",{bubbles:true,cancelable:true}));
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(submissions.length,1,"Netlify Form must be submitted only once");
  assert.equal(submissions[0].get("parcours"),"hosts");
  assert.equal(submissions[0].get("ville"),"Zenata, Les Arènes");
  assert.equal(submissions[0].get("consentement_contact"),"on");
  assert.match(submissions[0].get("options")||"",/Ménage entre réservations/);
  assert.equal(submissions[0].get("source_campagne"),"facebook / black-friday");
  assert.equal(window.document.getElementById("stepSuccess").hidden,false);
  assert.ok(events.some(x=>x.stage==="vue"));
  assert.ok(events.some(x=>x.stage==="soumis"));
  assert.equal(events.every(x=>x.email===undefined&&x.phone===undefined),true);
 }finally{
  globalThis.window=previous.window;
  globalThis.document=previous.document;
  globalThis.location=previous.location;
  globalThis.Option=previous.Option;
  globalThis.FormData=previous.FormData;
  globalThis.fetch=previous.fetch;
  Object.defineProperty(globalThis,"crypto",{configurable:true,writable:true,value:previous.crypto});
  window.close();
 }
});
