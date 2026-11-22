// Compose locally in the browser: no message is transmitted until the user sends it.
const isMail=(value)=>/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(String(value||"").trim());
export const isSecurityTarget=(data)=>{
 const label=String(data?.segment||"")+" "+String(data?.service||"");
 return /syndic|copropri|r[eé]sidence|gardiennage|s[eé]curit[eé]/i.test(label);
};
export const normalizedPhone=(value)=>{
 let s=String(value||"").replace(/[\s().-]/g,"");
 if(!s)return "";
 if(s.startsWith("00212"))s="+212"+s.slice(5);
 else if(s.startsWith("0"))s="+212"+s.slice(1);
 if(!/^\+?[0-9]{9,15}$/.test(s))return "";
 return s;
};
export function composeOutreach(data={},kind="prospect"){
 const company=String(data.name||"").trim().slice(0,140);
 const security=isSecurityTarget(data);
 const partner=kind==="partner" && /blanchisserie|pressing/i.test(data.segment||"");
 let subject,body;
 if(security){
  subject="Collaboration possible — entretien et gardiennage à Zenata | Auréa";
  body=[
   "Bonjour,",
   "",
   "Je vous contacte au nom d’Auréa, société implantée à Zenata et spécialisée dans les services aux résidences et à l’immobilier.",
   "",
   "Nous souhaitons échanger avec votre équipe au sujet des besoins des copropriétés à Zenata : entretien des parties communes, accueil et organisation du gardiennage / contrôle des accès.",
   "",
   "La partie gardiennage serait naturellement envisagée uniquement dans le cadre des autorisations et obligations réglementaires applicables.",
   "",
   "Pourrions-nous convenir d’un court échange afin de connaître les besoins des résidences que vous gérez ?",
   "",
   "Bien cordialement,",
   "L’équipe Auréa",
   "https://aurea-services.netlify.app/"
  ].join("\n");
 }else if(partner){
  subject="Partenariat local linge hôtelier — Auréa Zenata";
  body=[
   "Bonjour,",
   "",
   "Je vous contacte au nom d’Auréa, société de services pour locations courte durée à Zenata.",
   "",
   "Nous recherchons un partenaire professionnel pour la rotation régulière de linge hôtelier : lavage, séchage, contrôle qualité, conditionnement et délais fiables entre deux séjours.",
   "",
   "Pourrions-nous échanger sur vos capacités, vos délais et vos conditions pour une collaboration B2B ?",
   "",
   "Bien cordialement,",
   "L’équipe Auréa",
   "https://aurea-services.netlify.app/"
  ].join("\n");
 }else{
  subject="Partenariat préparation de logements à Zenata — Auréa";
  body=[
   "Bonjour,",
   "",
   "Je vous contacte au nom d’Auréa, une équipe locale spécialisée dans la préparation de logements Airbnb et Booking à Zenata.",
   "",
   "Nous proposons aux propriétaires et gestionnaires locatifs le ménage entre deux voyageurs, la préparation du linge hôtelier, le réassort des consommables et un contrôle qualité avec photos.",
   "",
   "Notre objectif est de simplifier vos rotations, notamment pendant les pics d’activité. Seriez-vous disponible pour un bref échange afin d’explorer une collaboration à Zenata ?",
   "",
   "Bien cordialement,",
   "L’équipe Auréa",
   "https://aurea-services.netlify.app/"
  ].join("\n");
 }
 return {company,subject,body,security,partner};
}
export function contactLinks(data={},kind="prospect"){
 const email=String(data.email||"").trim(),phone=normalizedPhone(data.phone);
 const draft=composeOutreach(data,kind);
 const q=(s)=>encodeURIComponent(s);
 return {
  ...draft,email:isMail(email)?email:"",phone,
  mailto:isMail(email)?"mailto:"+email+"?subject="+q(draft.subject)+"&body="+q(draft.body):"",
  gmail:isMail(email)?"https://mail.google.com/mail/?view=cm&fs=1&to="+q(email)+"&su="+q(draft.subject)+"&body="+q(draft.body):"",
  telephone:phone?"tel:"+phone:"",
  website:/^https?:\/\/[^\s]+$/i.test(String(data.sourceUrl||""))?data.sourceUrl:"",
 };
}
