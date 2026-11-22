const app=document.getElementById("app");
const mode=document.body.dataset.mode;
const isOps=mode==="operations";
const state={session:null,data:{companies:[],properties:[],teams:[],jobs:[]},tab:"planning",weekOffset:0,filter:"all",search:"",company:"all",busy:false,modal:null};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statusLabels={requested:"Demandé",confirmed:"Confirmé",assigned:"Équipe affectée",in_progress:"En cours",qa:"Contrôle qualité",completed:"Terminé",cancelled:"Annulé"};
const fmt=(value,opts={})=>value?new Intl.DateTimeFormat("fr-FR",{timeZone:"Africa/Casablanca",...opts}).format(new Date(value)):"—";
const localDay=(d)=>{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Casablanca",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(d));const o=Object.fromEntries(parts.map(p=>[p.type,p.value]));return o.year+"-"+o.month+"-"+o.day;};
const two=n=>String(n).padStart(2,"0");
const weekStart=()=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7)+7*state.weekOffset);return d;};
const dates=()=>Array.from({length:7},(_,i)=>{const d=weekStart();d.setDate(d.getDate()+i);return d;});
const toast=(msg,bad=false)=>{document.querySelector(".toast")?.remove();const div=document.createElement("div");div.className="toast"+(bad?" bad":"");div.textContent=msg;document.body.append(div);setTimeout(()=>div.remove(),4800);};
async function api(url,options={}){
 const customHeaders={...(options.headers||{}),"X-Aurea-Space":isOps?"operations":"hosts"};
 const r=await fetch(url,{credentials:"same-origin",cache:"no-store",...options,headers:customHeaders});
 const obj=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(obj.error||"Service indisponible");
 return obj;
}
const post=(action,body={})=>api("/api/aurea-ops",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...body})});
function login(message=""){
 const title=isOps?"Le centre de contrôle Auréa.":"Vos rotations, enfin sans friction.";
 const subtitle=isOps?"Planning multi-conciergeries, équipes, qualité et preuves d’exécution.":"Programmez chaque ménage, suivez son avancement et retrouvez vos preuves de qualité.";
 app.innerHTML=`<div class="login"><div class="login-hero"><div class="logo"><img src="../assets/logo-symbol-clean.png" alt=""> AURÉA</div><div><span class="eyebrow" style="color:#B3DCC4">${isOps?"AURÉA OPERATIONS":"AURÉA HOSTS"}</span><h1>${title}</h1><p>${subtitle}</p></div><small>SERVICE PREMIUM · ZENATA · CASABLANCA</small></div><div class="login-right"><form class="login-panel" data-form="login"><span class="eyebrow">Espace privé</span><h2>Bienvenue.</h2><p>${isOps?"Connectez-vous avec vos identifiants administrateur Auréa.":"Saisissez les accès transmis par votre coordinateur Auréa."}</p>${message?'<div class="error">'+esc(message)+'</div>':""}
 ${!isOps?'<div class="field"><label for="email">Adresse e-mail de la conciergerie</label><input type="email" name="email" id="email" autocomplete="username" required></div>':""}
 <div class="field"><label for="password">Mot de passe</label><input type="password" name="password" id="password" minlength="16" autocomplete="current-password" required></div><button class="btn" type="submit">Accéder à mon espace <span aria-hidden="true">→</span></button><p class="hint">Les interventions et informations d’accès aux logements restent privées.</p></form></div></div>`;
}
async function init(){
 try{
  const session=await api("/api/aurea-ops?resource=session");
  if((isOps&&session.role!=="admin")||(!isOps&&session.role!=="concierge"))throw Error("Ce compte n'a pas accès à cet espace");
  state.session=session;await refresh();
 }catch(err){login();}
}
async function refresh(){
 const data=await api("/api/aurea-ops?resource=overview");
 state.data=data;render();
}
function filtered(){
 return state.data.jobs.filter(j=>{
  if(state.filter!=="all"&&j.status!==state.filter)return false;
  if(isOps&&state.company!=="all"&&j.company_id!==state.company)return false;
  const q=state.search.toLocaleLowerCase("fr");
  return !q||[j.property_name,j.company_name,j.team_name,j.property_address].some(v=>String(v||"").toLocaleLowerCase("fr").includes(q));
 });
}
function buttons(){
 const acts=isOps?'<button class="btn secondary" data-action="create-team">+ Équipe</button><button class="btn secondary" data-action="create-company">+ Conciergerie</button>':"";
 return acts+'<button class="btn light" data-action="create-job">+ Demander un ménage</button>';
}
function render(){
 const jobs=state.data.jobs,pending=jobs.filter(j=>j.status==="requested").length,active=jobs.filter(j=>["assigned","in_progress","qa"].includes(j.status)).length;
 const today=jobs.filter(j=>localDay(j.start_at)===localDay(new Date())&&j.status!=="cancelled").length;
 const done=jobs.filter(j=>j.status==="completed").length;
 app.innerHTML=`<div class="app"><header class="top"><a class="logo" href="../"><img src="../assets/logo-symbol-clean.png" alt=""> AURÉA <span class="eyebrow" style="margin-left:4px">${isOps?"OPERATIONS":"HOSTS"}</span></a><div class="top-right"><small>${esc(state.session?.name||"Espace privé")}</small><button class="btn secondary tiny" data-action="logout">Déconnexion</button></div></header><div class="container">
 <section class="hero"><div><span class="eyebrow">${isOps?"Pilotage opérationnel":"Votre conciergerie en un seul endroit"}</span><h1>${isOps?"Chaque intervention, sous contrôle.":"Votre planning. Notre engagement."}</h1><p>${isOps?"Anticipez les rotations, affectez les équipes et sécurisez la qualité de chaque prestation.":"Réservez vos ménages et suivez leur préparation, leur exécution et leurs contrôles en toute transparence."}</p></div><div class="flex">${buttons()}</div></section>
 <section class="metrics"><div class="metric"><label>Demandes à confirmer</label><strong>${pending}</strong><span>Action de coordination</span></div><div class="metric"><label>Rotations aujourd’hui</label><strong>${today}</strong><span>Fuseau Casablanca</span></div><div class="metric"><label>Interventions actives</label><strong>${active}</strong><span>En affectation ou exécution</span></div><div class="metric"><label>Interventions terminées</label><strong>${done}</strong><span>Sur la période chargée</span></div></section>
 <div class="toolbar"><div class="tabs"><button class="tab ${state.tab==="planning"?"active":""}" data-action="tab" data-tab="planning">Planning</button><button class="tab ${state.tab==="properties"?"active":""}" data-action="tab" data-tab="properties">Logements</button>${isOps?'<button class="tab '+(state.tab==="companies"?"active":"")+'" data-action="tab" data-tab="companies">Conciergeries</button><button class="tab '+(state.tab==="teams"?"active":"")+'" data-action="tab" data-tab="teams">Équipes</button>':""}</div><div class="toolbar-side"><input class="search" type="search" id="search" placeholder="Rechercher…" value="${esc(state.search)}" aria-label="Rechercher"><select id="filter" class="filter" aria-label="Filtrer le statut"><option value="all">Tous les statuts</option>${Object.entries(statusLabels).map(([k,v])=>'<option value="'+k+'" '+(state.filter===k?"selected":"")+'>'+v+'</option>').join("")}</select>
 ${isOps?'<select id="company-filter" class="filter" aria-label="Filtrer conciergerie"><option value="all">Tous les clients</option>'+state.data.companies.map(c=>'<option value="'+esc(c.id)+'" '+(state.company===c.id?"selected":"")+'>'+esc(c.name)+'</option>').join("")+'</select>':""}</div></div>
 <div id="main-content">${content()}</div>
 <footer class="foot">Auréa Services · Les demandes sont confirmées après validation de disponibilité · Horaires Afrique/Casablanca</footer></div></div>`;
}
function content(){
 if(state.tab==="properties")return propertiesView();
 if(state.tab==="companies"&&isOps)return companiesView();
 if(state.tab==="teams"&&isOps)return teamsView();
 return planningView();
}
function planningView(){
 const week=dates(),items=filtered(),start=week[0],end=week[6];
 const weekMarkup=week.map(d=>{const date=localDay(d),dayjobs=items.filter(j=>localDay(j.start_at)===date);
  return `<div class="day ${date===localDay(new Date())?"today":""}"><div class="day-head"><span>${new Intl.DateTimeFormat("fr-FR",{weekday:"short"}).format(d)}</span><strong>${d.getDate()}</strong></div>${dayjobs.map(j=>`<button class="job ${esc(j.status)}" data-action="job" data-id="${esc(j.id)}"><time>${fmt(j.start_at,{hour:"2-digit",minute:"2-digit"})}</time><b>${esc(j.property_name)}</b><small>${isOps?esc(j.company_name)+" · ":""}${esc(statusLabels[j.status]||j.status)}</small></button>`).join("")||'<span class="hint">Libre</span>'}</div>`;}).join("");
 return `<div class="panel"><div class="panel-head"><div><h2>Calendrier des ménages</h2><p>Demande → confirmation → équipe → intervention → qualité</p></div><div class="controls"><button class="btn secondary tiny" data-action="previous" aria-label="Semaine précédente">‹</button><strong>${fmt(start,{day:"numeric",month:"short"})} — ${fmt(end,{day:"numeric",month:"short",year:"numeric"})}</strong><button class="btn secondary tiny" data-action="next" aria-label="Semaine suivante">›</button><button class="btn secondary tiny" data-action="today">Aujourd’hui</button></div></div><div class="week">${weekMarkup}</div></div><section class="panel activity"><div class="panel-head"><div><h2>Toutes les interventions</h2><p>${items.length} intervention(s) visibles · cliquez pour ouvrir le dossier</p></div></div><div class="list">${items.length?items.slice(0,160).map(j=>`<div class="line"><div><b>${esc(j.property_name)}</b><small>${isOps?esc(j.company_name)+" · ":""}${esc(j.property_address)}</small></div><div class="time-info"><b>${fmt(j.start_at,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</b><small>à ${fmt(j.end_at,{hour:"2-digit",minute:"2-digit"})}</small></div><div class="secondary-info"><b>${esc(j.team_name||"Équipe à affecter")}</b><small>${esc(j.notes||"")}</small></div><span class="status ${esc(j.status)}">${esc(statusLabels[j.status]||j.status)}</span><button class="btn secondary tiny" data-action="job" data-id="${esc(j.id)}">Dossier →</button></div>`).join(""):'<div class="list empty"><h3>Aucune intervention</h3><p>Les prochaines réservations apparaîtront ici.</p><button class="btn" data-action="create-job">Faire une demande</button></div>'}</div></section>`;
}
function propertiesView(){
 const data=isOps&&state.company!=="all"?state.data.properties.filter(p=>p.company_id===state.company):state.data.properties;
 return `<section class="panel"><div class="panel-head"><div><h2>Parc de logements</h2><p>Adresses, consignes d’accès, linge et consommables par appartement.</p></div><button class="btn" data-action="create-property">+ Ajouter un logement</button></div><div class="cards">${data.length?data.map(p=>`<article class="entity"><div><h3>${esc(p.name)}</h3><p>${esc(p.address)}</p>${isOps?'<small>'+esc(p.company_name)+'</small>':""}</div><div class="flex"><span class="status">${Number(p.bedrooms)} chambre(s)</span><span class="status">${Number(p.bathrooms)} salle(s) d’eau</span></div><div class="actions flex"><button class="btn secondary tiny" data-action="property" data-id="${esc(p.id)}">Modifier la fiche</button><a class="btn secondary tiny" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.latitude!==null&&p.longitude!==null?p.latitude+","+p.longitude:p.address)}" target="_blank" rel="noopener noreferrer">Voir sur carte ↗</a></div></article>`).join(""):'<div class="empty"><h3>Ajoutez votre premier appartement</h3><p>Enregistrez les adresses et consignes de ménage avant de programmer vos rotations.</p></div>'}</div></section>`;
}
function companiesView(){
 return `<section class="panel"><div class="panel-head"><div><h2>Conciergeries partenaires</h2><p>Accès strictement séparés : un partenaire ne voit jamais les autres.</p></div><button class="btn" data-action="create-company">+ Nouvelle conciergerie</button></div><div class="cards">${state.data.companies.length?state.data.companies.map(c=>`<article class="entity"><div><h3>${esc(c.name)}</h3><p>${esc(c.email)}</p><small>${esc(c.contact_name||"")} ${esc(c.phone||"")}</small></div><div class="flex"><span class="status ${c.active?"completed":"cancelled"}">${c.active?"Actif":"Suspendu"}</span><span class="status">${state.data.properties.filter(p=>p.company_id===c.id).length} logement(s)</span></div><div class="actions flex"><button class="btn secondary tiny" data-action="reset-company" data-id="${esc(c.id)}">Réinitialiser l’accès</button></div></article>`).join(""):'<div class="empty"><h3>Premier partenaire à créer</h3></div>'}</div></section>`;
}
function teamsView(){
 return `<section class="panel"><div class="panel-head"><div><h2>Équipes opérationnelles</h2><p>Une même équipe ne peut pas avoir deux affectations qui se chevauchent.</p></div><button class="btn" data-action="create-team">+ Ajouter une équipe</button></div><div class="cards">${state.data.teams.length?state.data.teams.map(t=>`<article class="entity"><div><h3>${esc(t.name)}</h3><p>${t.active?"Disponible pour affectation":"Équipe inactive"}</p></div><div class="flex"><span class="status">${state.data.jobs.filter(j=>j.team_id===t.id&&!["completed","cancelled"].includes(j.status)).length} intervention(s) actives</span></div></article>`).join(""):'<div class="empty"><h3>Créez vos équipes</h3><p>L’affectation intervient après confirmation d’une demande.</p></div>'}</div></section>`;
}
function field(label,name,type="text",value="",extra=""){
 return '<div class="field"><label for="'+esc(name)+'">'+esc(label)+'</label>'+ (type==="textarea"?'<textarea id="'+esc(name)+'" name="'+esc(name)+'" '+extra+'>'+esc(value)+'</textarea>':'<input id="'+esc(name)+'" name="'+esc(name)+'" type="'+esc(type)+'" value="'+esc(value)+'" '+extra+'>')+'</div>';
}
function options(name,labels,value="",required=true){
 return '<div class="field"><label for="'+esc(name)+'">'+(name==="companyId"?"Conciergerie":"Logement")+'</label><select id="'+esc(name)+'" name="'+esc(name)+'" '+(required?"required":"")+'><option value="">Sélectionner…</option>'+labels.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===value?"selected":"")+'>'+esc(x.name)+'</option>').join("")+'</select></div>';
}
function frame(title,subtitle,inside,wide=false){
 return `<div class="overlay" id="overlay"><div class="dialog ${wide?"wide":""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="dialog-head"><div><span class="eyebrow">Auréa · ${isOps?"Operations":"Hosts"}</span><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="close" data-action="close" aria-label="Fermer">×</button></div>${inside}</div></div>`;
}
function modal(kind,entity={}){
 let inside="";
 if(kind==="company")inside=`<form data-form="company"><div class="form-grid">${field("Nom de la conciergerie *","name","text","","required minlength=2")}${field("E-mail professionnel *","email","email","","required")}${field("Contact","contact_name")}${field("Téléphone professionnel","phone","tel")}</div><div class="dialog-footer"><span class="hint">Le mot de passe sera généré et affiché une seule fois.</span><button class="btn">Créer les accès</button></div></form>`;
 if(kind==="team")inside=`<form data-form="team"><div class="form-grid">${field("Nom de l’équipe *","name","text","","required minlength=2")}</div><div class="dialog-footer"><button class="btn">Ajouter l’équipe</button></div></form>`;
 if(kind==="property"){
  const p=entity,org=isOps?options("companyId",state.data.companies.map(c=>({id:c.id,name:c.name})),p.company_id):"";
  inside=`<form data-form="property" data-id="${esc(p.id||"")}"><div class="form-grid">${org}${field("Nom du logement *","name","text",p.name,"required minlength=2")}<div class="full">${field("Adresse complète *","address","text",p.address,"required minlength=8")}</div>${field("Latitude GPS","latitude","number",p.latitude??"",'step="any"')}${field("Longitude GPS","longitude","number",p.longitude??"",'step="any"')}${field("Chambres","bedrooms","number",p.bedrooms??1,'min="0" max="40"')}${field("Salles de bain","bathrooms","number",p.bathrooms??1,'min="0" max="40"')}${field("Surface en m²","surface_m2","number",p.surface_m2??"",'min="1"')}<div class="full">${field("Accès et consignes (privé)","access_notes","textarea",p.access_notes)}</div><div class="full">${field("Linge et changements de draps","linen_notes","textarea",p.linen_notes)}</div><div class="full">${field("Consommables attendus","consumables_notes","textarea",p.consumables_notes)}</div></div><div class="dialog-footer"><span class="hint">Les codes et consignes ne sont visibles que par Auréa et votre conciergerie.</span><button class="btn">${p.id?"Enregistrer les modifications":"Ajouter le logement"}</button></div></form>`;
 }
 if(kind==="job"){
  const editing=Boolean(entity.id);
  const propertyOptions=options("propertyId",state.data.properties.map(p=>({id:p.id,name:p.name+(isOps?" · "+(p.company_name||""):"")})),entity.property_id||"");
  inside=`<form data-form="job" data-id="${esc(entity.id||"")}"><div class="form-grid"><div class="full">${propertyOptions}</div>${field("Début du ménage *","start","datetime-local","","required")}${field("Fin estimée *","end","datetime-local","","required")}${field("Départ des voyageurs (facultatif)","checkout","datetime-local")}${field("Prochaine arrivée (facultatif)","checkin","datetime-local")}<div class="full">${field("Instructions particulières","notes","textarea",entity.notes||"")}</div></div><div class="notice">${editing?"Les modifications sont possibles uniquement avant la confirmation par Auréa.":"Cette demande est envoyée à Auréa. Elle ne sera confirmée qu’après vérification de la disponibilité."} Heures locales de Casablanca.</div><div class="dialog-footer"><button class="btn">${editing?"Enregistrer le nouveau créneau":"Envoyer la demande de ménage"}</button></div></form>`;
 }
 if(kind==="secret"){
  inside=`<div class="notice">Le compte est créé. Transmettez l’adresse e-mail et le mot de passe au partenaire par un canal sécurisé.</div><div class="secret"><small>Accès Auréa Hosts</small><p>${esc(entity.email||"")}</p><code id="password-once">${esc(entity.password)}</code><button class="btn secondary tiny" data-action="copy-password">Copier le mot de passe</button></div><div class="dialog-footer"><span class="hint">Ce secret ne sera pas récupérable après fermeture.</span><button class="btn" data-action="close">J’ai sauvegardé les accès</button></div>`;
 }
 const titles={company:"Créer une conciergerie",team:"Nouvelle équipe",property:entity.id?"Modifier un logement":"Ajouter un logement",job:entity.id?"Modifier une demande":"Demander une intervention",secret:"Accès partenaire créé"};
 document.body.insertAdjacentHTML("beforeend",frame(titles[kind],"Une organisation fiable, des informations claires.",inside,kind==="property"));
 const overlay=document.getElementById("overlay");overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
 if(kind==="job"){const d=new Date();d.setHours(d.getHours()+24,0,0,0);const end=new Date(d.getTime()+2*3600000);const val=v=>v.getFullYear()+"-"+two(v.getMonth()+1)+"-"+two(v.getDate())+"T"+two(v.getHours())+":"+two(v.getMinutes());for(const [name,value] of [["start",entity.start_at||d],["end",entity.end_at||end],["checkout",entity.checkout_at],["checkin",entity.next_checkin_at]]){if(value)overlay.querySelector(`[name="${name}"]`).value=val(new Date(value));}}
}
async function jobDetails(id){
 const job=state.data.jobs.find(j=>j.id===id);
 if(!job)return toast("Intervention introuvable",true);
 let history={events:[],photos:[]};
 try{history=await api("/api/aurea-ops?resource=history&job="+encodeURIComponent(id));}catch(e){toast(e.message,true);}
 const allowedStates={requested:["confirmed","cancelled"],confirmed:["assigned","cancelled"],assigned:["in_progress","cancelled"],in_progress:["qa"],qa:["in_progress","completed"],completed:[],cancelled:[]};
 const next=isOps?allowedStates[job.status]||[]:job.status==="requested"?["cancelled"]:[];
 const teamSelect=`<div class="field"><label>Équipe opérationnelle</label><select id="team-for-job"><option value="">Choisir une équipe</option>${state.data.teams.filter(t=>t.active).map(t=>'<option value="'+esc(t.id)+'" '+(job.team_id===t.id?"selected":"")+'>'+esc(t.name)+'</option>').join("")}</select></div>`;
 const checklist=job.checklist||{};
 const quality=isOps&&["in_progress","qa"].includes(job.status)?`<section class="section"><h3>Contrôle qualité</h3><form data-form="quality" data-id="${esc(job.id)}">${[["cleaning","Surfaces, salle de bain et cuisine vérifiées"],["linen","Linge et literie conformes"],["consumables","Consommables réapprovisionnés"],["secure","Logement refermé, clés et accès contrôlés"]].map(([k,v])=>'<label class="check"><input type="checkbox" name="'+k+'" '+(checklist[k]?"checked":"")+'>'+esc(v)+'</label>').join("")}${field("Remarques et anomalies","notes","textarea",job.quality_notes||"")}<button class="btn">Enregistrer le contrôle</button></form><form data-form="photo" data-id="${esc(job.id)}" class="section"><h3>Photos d’intervention</h3><div class="field"><label>Photo de contrôle (3 Mo maximum)</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></div>${field("Légende (avant, après, anomalie…)","caption")}<button class="btn secondary">Ajouter la preuve photo</button></form></section>`:"";
 const reschedule=job.status==="requested"?`<div class="section"><button class="btn secondary tiny" data-action="reschedule" data-id="${esc(job.id)}">Modifier le créneau et les horaires</button></div>`:"";
 const controls=next.length?`<div class="section"><h3>Faire avancer l’intervention</h3>${next.includes("confirmed")?teamSelect:""}<div class="flex">${next.map(n=>'<button class="btn '+(n==="cancelled"?"danger":"secondary")+' tiny" data-action="transition" data-id="'+esc(job.id)+'" data-status="'+esc(n)+'">'+esc(n==="cancelled"?"Annuler":statusLabels[n])+'</button>').join("")}</div><p class="hint">Les étapes sont historisées. Une équipe ne peut pas être affectée à deux interventions qui se chevauchent.</p></div>`:"";
 const reassign=isOps&&["confirmed","assigned"].includes(job.status)?`<div class="section"><h3>Changer d’équipe</h3>${teamSelect.replace('id="team-for-job"','id="team-reassign"')}<button class="btn secondary tiny" data-action="reassign" data-id="${esc(job.id)}">Réaffecter</button></div>`:"";
 const evidence=history.photos?.length?`<div class="photo-list">${history.photos.map(p=>`<a href="/api/aurea-ops-photo?job=${encodeURIComponent(id)}&photo=${encodeURIComponent(p.id)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" alt="Photo de contrôle" src="/api/aurea-ops-photo?job=${encodeURIComponent(id)}&photo=${encodeURIComponent(p.id)}"><small>${esc(p.caption||"Preuve qualité")}</small></a>`).join("")}</div>`:'<p class="hint">Aucune photo de contrôle enregistrée.</p>';
 const logs=history.events?.length?history.events.map(e=>`<div class="event"><b>${esc(e.event==="incident_reported"?"Incident signalé":statusLabels[e.event]||e.event.replaceAll("_"," "))}</b><small>${fmt(e.created_at,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})} · ${esc(e.actor==="admin"?"Équipe Auréa":"Conciergerie")}</small>${e.detail?.note?`<p class="subtitle">${esc(e.detail?.severity||"")} · ${esc(e.detail.note)}</p>`:""}</div>`).join(""):'<p class="hint">Aucun événement enregistré.</p>';
 const mapQuery=encodeURIComponent(job.latitude!==null&&job.longitude!==null?job.latitude+","+job.longitude:job.property_address);
 const markup=`<div class="flex"><span class="status ${esc(job.status)}">${esc(statusLabels[job.status])}</span><span class="hint">${fmt(job.start_at,{weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"})} — ${fmt(job.end_at,{hour:"2-digit",minute:"2-digit"})}</span></div><div class="section"><b>${esc(job.property_name)}</b><p class="subtitle">${esc(job.property_address)} · ${isOps?esc(job.company_name)+" · ":""}${esc(job.team_name||"Équipe non encore affectée")}</p><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&query=${mapQuery}" class="btn secondary tiny">Localiser le logement ↗</a><p>${esc(job.notes||"Aucune consigne complémentaire")}</p></div>${reschedule}${controls}${reassign}${quality}<section class="section"><h3>Signaler une anomalie ou un incident</h3><p class="hint">Les signalements sont enregistrés et visibles dans la chronologie par Auréa et la conciergerie.</p><form data-form="incident" data-id="${esc(job.id)}"><div class="field"><label for="severity">Gravité</label><select id="severity" name="severity" required><option value="low">Mineure</option><option value="medium">Modérée</option><option value="high">Importante</option><option value="critical">Critique</option></select></div><div class="field"><label for="incident-note">Description de l’incident</label><textarea id="incident-note" name="note" minlength="10" maxlength="1400" required placeholder="Ex. Consommable manquant, dégât, retard, accès indisponible…"></textarea></div><button class="btn secondary tiny">Enregistrer l’incident</button></form></section><section class="section"><h3>Preuves photographiques</h3>${evidence}</section><section class="section"><h3>Historique de l’intervention</h3><div class="timeline">${logs}</div></section>`;
 document.body.insertAdjacentHTML("beforeend",frame("Dossier intervention","Une chronologie vérifiable, de la demande à la validation.",markup,true));
 const ov=document.getElementById("overlay");ov.addEventListener("click",e=>{if(e.target===ov)ov.remove()});
}
async function action(name,el){
 if(name==="logout"){
  await api(isOps?"/api/aurea-auth":"/api/aurea-host-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})});
  state.session=null;login();return;
 }
 if(name==="close"){document.getElementById("overlay")?.remove();return;}
 if(name==="tab"){state.tab=el.dataset.tab;render();return;}
 if(name==="previous"||name==="next"||name==="today"){state.weekOffset=name==="today"?0:state.weekOffset+(name==="next"?1:-1);render();return;}
 if(name==="create-job"){if(!state.data.properties.length)return toast("Ajoutez d’abord un logement",true);return modal("job");}
 if(name==="create-property")return modal("property");
 if(name==="create-company")return modal("company");
 if(name==="create-team")return modal("team");
 if(name==="property"){const p=state.data.properties.find(x=>x.id===el.dataset.id);if(p)return modal("property",p);}
 if(name==="job")return jobDetails(el.dataset.id);
 if(name==="copy-password"){const p=document.getElementById("password-once")?.textContent;if(p){await navigator.clipboard.writeText(p);toast("Mot de passe copié")};return;}
 if(name==="reset-company"){
  if(!confirm("Réinitialiser le mot de passe de cette conciergerie ? L’ancien mot de passe ne fonctionnera plus."))return;
  const x=await post("reset_company_access",{companyId:el.dataset.id});
  modal("secret",{email:x.company.email,password:x.temporaryPassword});return;
 }
 if(name==="reschedule"){
  const job=state.data.jobs.find(x=>x.id===el.dataset.id);
  document.getElementById("overlay")?.remove();
  if(job&&job.status==="requested")return modal("job",job);
  return toast("Cette intervention n’est plus modifiable",true);
 }
 if(name==="transition"){
  if(el.dataset.status==="cancelled"&&!confirm("Confirmer l’annulation de cette intervention ?"))return;
  const teamId=document.getElementById("team-for-job")?.value;
  await post("change_job",{jobId:el.dataset.id,status:el.dataset.status,teamId});
  document.getElementById("overlay")?.remove();await refresh();toast("Intervention mise à jour");return;
 }
 if(name==="reassign"){
  const teamId=document.getElementById("team-reassign")?.value;
  await post("reassign_job",{jobId:el.dataset.id,teamId});
  document.getElementById("overlay")?.remove();await refresh();toast("Équipe réaffectée");return;
 }
}
async function submit(form){
 const type=form.dataset.form,f=Object.fromEntries(new FormData(form).entries());
 if(type==="login"){
  if(isOps)await api("/api/aurea-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"login",password:f.password})});
  else await api("/api/aurea-host-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"login",email:f.email,password:f.password})});
  const session=await api("/api/aurea-ops?resource=session");
  if((isOps&&session.role!=="admin")||(!isOps&&session.role!=="concierge"))throw Error("Compte non autorisé pour cet espace");
  state.session=session;await refresh();toast("Connexion réussie");return;
 }
 if(type==="company"){
  const data=await post("create_company",f);
  document.getElementById("overlay")?.remove();await refresh();modal("secret",{email:data.company.email,password:data.temporaryPassword});return;
 }
 if(type==="team"){await post("create_team",f);}
 if(type==="property"){
  const old=form.dataset.id;
  await post(old?"update_property":"create_property",{...f,...(old?{propertyId:old}:{})});
 }
 if(type==="job"){
  const toISO=k=>f[k]?new Date(f[k]).toISOString():"";
  const jobId=form.dataset.id;
  await post(jobId?"reschedule_job":"request_job",{jobId,propertyId:f.propertyId,start:toISO("start"),end:toISO("end"),checkout:toISO("checkout"),checkin:toISO("checkin"),notes:f.notes});
 }
 if(type==="incident"){
  await post("report_incident",{jobId:form.dataset.id,severity:f.severity,note:f.note});
 }
 if(type==="quality"){
  const checklist=Object.fromEntries(["cleaning","linen","consumables","secure"].map(k=>[k,form.elements.namedItem(k)?.checked===true]));
  await post("quality",{jobId:form.dataset.id,checklist,notes:f.notes});
 }
 if(type==="photo"){
  const payload=new FormData(form);payload.set("jobId",form.dataset.id);
  await api("/api/aurea-ops-photo",{method:"POST",body:payload});
 }
 document.getElementById("overlay")?.remove();await refresh();toast("Modifications enregistrées");
}
document.addEventListener("click",async e=>{
 const el=e.target.closest("[data-action]");if(!el)return;
 if(state.busy)return;
 state.busy=true;
 try{await action(el.dataset.action,el);}catch(err){toast(err.message,true)}finally{state.busy=false;}
});
document.addEventListener("submit",async e=>{
 const form=e.target.closest("form[data-form]");if(!form)return;
 e.preventDefault();if(state.busy)return;
 state.busy=true;
 const button=form.querySelector('button[type="submit"],button.btn:not([type])');if(button)button.disabled=true;
 try{await submit(form);}catch(err){
  if(form.dataset.form==="login"){login(err.message);}else{toast(err.message,true);if(button)button.disabled=false;}
 }finally{state.busy=false;}
});
document.addEventListener("change",e=>{
 if(e.target.id==="filter"){state.filter=e.target.value;render();}
 if(e.target.id==="company-filter"){state.company=e.target.value;render();}
});
document.addEventListener("input",e=>{
 if(e.target.id==="search"){state.search=e.target.value;const keepFocus=e.target.selectionStart;render();const inp=document.getElementById("search");inp?.focus();try{inp?.setSelectionRange(keepFocus,keepFocus)}catch{}}
});
init();
