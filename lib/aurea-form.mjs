import { createHash } from "node:crypto";

const tidy=(v,max=900)=>typeof v==="string"?v.trim().slice(0,max):"";
export function mapFormSubmission(source){
 if(!source || typeof source!=="object" || Array.isArray(source))return null;
 const d=source;
 if(d["form-name"]&&d["form-name"]!=="demande-devis")return null;
 const consent=tidy(d.consentement_contact).toLowerCase();
 if(!["on","true","yes","oui","1"].includes(consent))return null;
 const name=tidy(d.nom,200),phone=tidy(d.telephone,80);
 if(name.length<2||phone.length<5)return null;
 const profile=tidy(d.profil,200);
 const service=tidy(d.service,200);
 const funnel=tidy(d.parcours,20).toLowerCase();
 const classifier=profile+" "+service;
 const segment=funnel==="syndic"||/syndic|gardiennage|copropri|sécurité|securite|résidence/i.test(classifier)
  ?"SECURITE":funnel==="hosts"||/airbnb|booking|conciergerie|hôtelier|linge/i.test(classifier)
  ?"HOSTS":funnel==="home"||/particulier|domicile/i.test(classifier)?"HOME":"AUTRE";
 const details=[
  tidy(d.message,2000),
  d.volume?"Volume : "+tidy(d.volume,200):"",
  d.frequence?"Fréquence : "+tidy(d.frequence,200):"",
  profile?"Profil : "+profile:"",
  d.options?"Prestations souhaitées : "+tidy(d.options,450):"",
  d.date_souhaitee?"Date souhaitée : "+tidy(d.date_souhaitee,35):"",
  d.preference_contact?"Contact souhaité : "+tidy(d.preference_contact,35):""
 ].filter(Boolean).join("\n");
 const data={
  name,phone,email:tidy(d.email,200),segment,zone:tidy(d.ville,150),
  service,status:"Nouveau",source:"Site Auréa",
  sourceCampaign:tidy(d.source_campagne,120),
  preferredContact:tidy(d.preference_contact,40),
  requestedDate:tidy(d.date_souhaitee,30),
  serviceOptions:tidy(d.options,450),
  funnel:tidy(d.parcours,25),
  nextAction:"Répondre à la demande et qualifier le besoin",
  consent:"Demande entrante",notes:details.slice(0,900)
 };
 const stable={
  name,phone,email:data.email,zone:data.zone,service:data.service,
  profile,message:tidy(d.message,2000),volume:tidy(d.volume,200),
  frequence:tidy(d.frequence,200)
 };
 // Every real submission receives an independent browser-generated id.
 // Keep a stable fallback for legacy forms sent before the request_id field existed.
 const requestId=tidy(d.request_id,64);
 const dedupe=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
  ? "uuid:"+requestId.toLowerCase()
  : "legacy:"+createHash("sha256").update(JSON.stringify(stable)).digest("hex");
 const sourceKey="netlify-form:"+dedupe;
 return {data,sourceKey};
}
