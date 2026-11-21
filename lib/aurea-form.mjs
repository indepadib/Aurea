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
 const segment=/airbnb|booking|conciergerie/i.test(profile)?"HOSTS":/particulier/i.test(profile)?"HOME":"AUTRE";
 const details=[
  tidy(d.message,2000),
  d.volume?"Volume : "+tidy(d.volume,200):"",
  d.frequence?"Fréquence : "+tidy(d.frequence,200):"",
  profile?"Profil : "+profile:""
 ].filter(Boolean).join("\n");
 const data={
  name,phone,email:tidy(d.email,200),segment,zone:tidy(d.ville,150),
  service:tidy(d.service,200),status:"Nouveau",source:"Site Auréa",
  nextAction:"Qualifier la demande reçue sur le site",
  consent:"Demande entrante",notes:details.slice(0,900)
 };
 const stable={
  name,phone,email:data.email,zone:data.zone,service:data.service,
  profile,message:tidy(d.message,2000),volume:tidy(d.volume,200),
  frequence:tidy(d.frequence,200)
 };
 const sourceKey="netlify-form:"+createHash("sha256").update(JSON.stringify(stable)).digest("hex");
 return {data,sourceKey};
}
