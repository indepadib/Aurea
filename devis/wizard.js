// Auréa | Conversion funnel. No client information is stored in localStorage.
const byId=id=>document.getElementById(id);
const form=byId("quoteWizard");
const serviceConfigs={
 hosts:{
  label:"Auréa Hosts",profil:"Propriétaire Airbnb / Booking",service:"Préparation Airbnb / Booking",
  intro:"Préparons la rotation de vos logements entre deux voyageurs.",
  volumeLabel:"Type et nombre de logements",volumeExample:"Ex. 3 studios ou 2 appartements T2",
  frequencyLabel:"Rotations mensuelles estimées",
  frequency:["Je ne sais pas encore","1 à 3 rotations","4 à 8 rotations","9 à 15 rotations","Plus de 15 rotations"],
  options:["Ménage entre réservations","Linge hôtelier & blanchisserie","Réassort des consommables","Contrôle qualité et photos"]
 },
 home:{
  label:"Auréa Home",profil:"Particulier",service:"Ménage à domicile",
  intro:"Indiquez votre logement et le rythme qui vous conviendrait.",
  volumeLabel:"Type et surface approximative",volumeExample:"Ex. Appartement 75 m²",
  frequencyLabel:"Fréquence souhaitée",
  frequency:["Ponctuel","Chaque semaine","Deux fois par mois","Une fois par mois","À définir"],
  options:["Ménage ponctuel","Ménage récurrent","Nettoyage approfondi","Après travaux / emménagement"]
 },
 syndic:{
  label:"Auréa Résidences",profil:"Syndic / Gestionnaire de résidence",service:"Entretien de résidence / étude gardiennage",
  intro:"Présentez votre résidence pour étudier une organisation adaptée.",
  volumeLabel:"Nombre d'immeubles / entrées",volumeExample:"Ex. 3 bâtiments, 5 entrées",
  frequencyLabel:"Besoin envisagé",
  frequency:["Étude initiale","Entretien quotidien","Entretien périodique","Service de jour","Organisation de nuit / 24h"],
  options:["Entretien parties communes","Étude gardiennage","Contrôle des accès","Contrôle qualité et anomalies"]
 }
};
const allowedSource=/^[a-zA-Z0-9_.:-]{1,70}$/;
const params=new URLSearchParams(location.search);
const cleanSource=s=>allowedSource.test(String(s||""))?s:"";
const source=[cleanSource(params.get("utm_source")),cleanSource(params.get("utm_campaign"))].filter(Boolean).join(" / ");
form.elements.source_campagne.value=source||"Accès direct";
const metricSource=(cleanSource(params.get("utm_source"))||"direct")+"-"+(cleanSource(params.get("utm_campaign"))||"standard");
const metricSent=new Set();
function track(stage){
 if(metricSent.has(stage))return;
 metricSent.add(stage);
 const segment=choice==="hosts"?"HOSTS":choice==="home"?"HOME":choice==="syndic"?"SECURITE":"INCONNU";
 fetch("/api/aurea-funnel",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",keepalive:true,
  body:JSON.stringify({stage,segment,source:metricSource.slice(0,70)})}).catch(()=>{});
}
const sourceType=String(params.get("type")||"").toLowerCase();
let choice=serviceConfigs[sourceType]?sourceType:"";
let stage=1,submitting=false;
const steps={1:byId("step1"),2:byId("step2"),3:byId("step3"),success:byId("stepSuccess")};
const error=byId("wizardError"),next=byId("nextButton"),back=byId("backButton"),send=byId("submitButton");
const renderError=(message)=>{
 error.hidden=!message;error.textContent=message||"";
 if(message)error.scrollIntoView({behavior:"smooth",block:"nearest"});
};
const todayLocal=()=>{
 const date=new Date(),y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");
 return [y,m,d].join("-");
};
byId("date_souhaitee").min=todayLocal();
const renderStage=(value)=>{
 stage=value;renderError("");
 Object.entries(steps).forEach(([key,node])=>{
  const show=String(value)===key;node.hidden=!show;
  node.classList.toggle("active",show);
 });
 byId("wizardFooter").hidden=value==="success";
 byId("stepIndicator").textContent=value==="success"?"Demande transmise":"Étape "+value+" sur 3";
 byId("progressFill").style.width=value==="success"?"100%":(value/3*100)+"%";
 back.hidden=value<=1||value==="success";
 next.hidden=value===3||value==="success";
 send.hidden=value!==3;
 next.disabled=value===1&&!choice;
 if(value===3)byId("requestSummary").innerHTML="<strong>Votre demande</strong><p>"+serviceConfigs[choice].label+" · "+escapeText(byId("ville").value)+"<br>Nous vous recontacterons selon votre préférence.</p>";
 if(value==="success")window.scrollTo({top:0,behavior:"smooth"});
 else {
  const heading=steps[value]?.querySelector("h3");
  heading?.setAttribute("tabindex","-1");heading?.focus({preventScroll:true});
 }
};
function escapeText(v){
 return String(v||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function chooseService(type,advance=true){
 if(!serviceConfigs[type])return;
 choice=type;
 const cfg=serviceConfigs[type];
 form.elements.profil.value=cfg.profil;form.elements.service.value=cfg.service;form.elements.parcours.value=type;
 document.querySelectorAll("[data-type]").forEach(el=>el.setAttribute("aria-pressed",String(el.dataset.type===type)));
 byId("detailsDescription").textContent=cfg.intro;
 byId("volumeLabel").textContent=cfg.volumeLabel;
 byId("volume").placeholder=cfg.volumeExample;
 byId("frequencyLabel").textContent=cfg.frequencyLabel;
 byId("frequence").replaceChildren(new Option("Choisir...", ""),...cfg.frequency.map(item=>new Option(item,item)));
 byId("optionGrid").replaceChildren(...cfg.options.map(item=>{
   const label=document.createElement("label");label.className="option";
   const input=document.createElement("input");input.type="checkbox";input.value=item;input.className="service-option";
   label.append(input,document.createTextNode(item));return label;
 }));
 byId("securityNote").hidden=type!=="syndic";
 next.disabled=false;
 track("choix");
 if(advance)renderStage(2);
}
document.querySelectorAll("[data-type]").forEach(btn=>btn.addEventListener("click",()=>chooseService(btn.dataset.type)));
if(choice)chooseService(choice,false);
next.addEventListener("click",()=>{
 if(stage===1){if(!choice)return renderError("Choisissez votre type de projet.");renderStage(2);}
 else if(stage===2){
  if(!form.elements.ville.value.trim())return renderError("Précisez la ville et la résidence ou le quartier.");
  if(form.elements.ville.value.trim().length<3)return renderError("Renseignez une localisation suffisamment précise.");
  const selected=[...document.querySelectorAll(".service-option:checked")].map(el=>el.value);
  form.elements.options.value=selected.join(" ; ");
  track("besoin");renderStage(3);
 }
});
back.addEventListener("click",()=>renderStage(Math.max(1,stage-1)));
let contactStarted=false;
byId("step3").addEventListener("input",event=>{
 if(!contactStarted&&["nom","telephone","email"].includes(event.target.name)){
  contactStarted=true;track("contact");
 }
});
byId("preference_contact").addEventListener("change",()=>{
 const useEmail=form.elements.preference_contact.value==="Email";
 form.elements.email.required=useEmail;
 byId("email").closest(".field").querySelector("label").textContent=useEmail?"Adresse email *":"Adresse email";
});
form.addEventListener("submit",async e=>{
 e.preventDefault();if(submitting||stage!==3)return;
 if(!choice)return renderStage(1);
 if(!form.elements.nom.value.trim() || form.elements.nom.value.trim().length<2)return renderError("Indiquez votre nom ou le nom de votre entreprise.");
 const normalizedPhone=String(form.elements.telephone.value||"").replace(/[^\d]/g,"");
 if(normalizedPhone.length<9||normalizedPhone.length>15)return renderError("Vérifiez le numéro de téléphone.");
 if(form.elements.email.value&&!form.elements.email.checkValidity())return renderError("L'adresse email semble invalide.");
 if(form.elements.preference_contact.value==="Email"&&!form.elements.email.value.trim())return renderError("Précisez votre email si vous préférez être recontacté par email.");
 if(!form.elements.consentement_contact.checked)return renderError("Veuillez autoriser Auréa à vous répondre au sujet de votre demande.");
 if(!form.elements.request_id.value)form.elements.request_id.value=crypto?.randomUUID?.()||"";
 // Priority remains a service qualification detail, not an unverified SLA.
 const priority=byId("preferedChannelPreview").value;
 const extra="Priorité : "+priority;
 if(!byId("message").value.includes(extra)){
  const desc=byId("message").value.trim();
  byId("message").value=desc?desc+"\n"+extra:extra;
 }
 submitting=true;send.disabled=true;send.textContent="Envoi sécurisé…";renderError("");
 try{
  const result=await fetch("/",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(new FormData(form)).toString(),credentials:"same-origin"});
  if(!result.ok)throw new Error("La demande n'a pas été reçue. Veuillez réessayer.");
  track("soumis");
  renderStage("success");
 }catch(err){renderError("L'envoi a échoué. Vérifiez votre connexion et réessayez, sans créer une deuxième demande.");}
 finally{submitting=false;send.disabled=false;send.textContent="Envoyer ma demande →";}
});
renderStage(1);
track("vue");
