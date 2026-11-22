const root=document.getElementById("field-app");
const state={name:"",jobs:[],current:null,busy:false};
const h=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const labels={assigned:"À démarrer",in_progress:"En cours",qa:"En contrôle",completed:"Terminée"};
const clock=(d,opts={})=>d?new Intl.DateTimeFormat("fr-FR",{timeZone:"Africa/Casablanca",...opts}).format(new Date(d)):"—";
const day=d=>clock(d,{weekday:"long",day:"numeric",month:"long"});
const hour=d=>clock(d,{hour:"2-digit",minute:"2-digit"});
const dateKey=d=>clock(d,{year:"numeric",month:"2-digit",day:"2-digit"});
const todayKey=dateKey(Date.now());
function toast(message,error=false){document.querySelector(".toast")?.remove();const x=document.createElement("div");x.className="toast"+(error?" bad":"");x.textContent=message;document.body.append(x);setTimeout(()=>x.remove(),5200)}
async function api(url,options={}){
 const r=await fetch(url,{credentials:"same-origin",cache:"no-store",...options});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(data.error||"Service momentanément indisponible");
 return data;
}
const post=(action,detail={})=>api("/api/aurea-field",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...detail})});
function login(message=""){
 root.innerHTML=`<div class="field-login"><a class="logo field-login-brand" href="../"><img src="../assets/logo-symbol-clean.png" alt=""> AURÉA <span class="eyebrow">FIELD</span></a><form class="login-panel" data-form="login"><span class="eyebrow">Espace privé · Intervenants</span><h2>Bienvenue sur le terrain.</h2><p>Votre planning, vos consignes et vos preuves de qualité réunis dans un espace simple, accessible sur téléphone.</p>${message?'<div class="error">'+h(message)+'</div>':""}<div class="field"><label for="field-email">Votre adresse e-mail</label><input id="field-email" name="email" type="email" autocomplete="username" required></div><div class="field"><label for="field-password">Mot de passe</label><input id="field-password" name="password" type="password" autocomplete="current-password" minlength="16" required></div><button class="btn" type="submit">Accéder à mes missions →</button><p class="hint">Accès individuel attribué par votre responsable Auréa.</p></form></div>`;
}
function jobCard(job){
 return `<button class="field-job" data-action="detail" data-id="${h(job.id)}"><div><time>${h(day(job.start_at))} · ${h(hour(job.start_at))} — ${h(hour(job.end_at))}</time><b>${h(job.property_name)}</b><p>${h(job.address)}</p></div><span class="status ${h(job.status)}">${h(labels[job.status]||job.status)}</span></button>`;
}
function dashboard(){
 const list=state.jobs,active=list.filter(j=>j.status==="in_progress"),current=list.filter(j=>dateKey(j.start_at)===todayKey && j.status!=="completed"),done=list.filter(j=>j.status==="completed");
 const upcoming=list.filter(j=>dateKey(j.start_at)!==todayKey && j.status!=="completed");
 const log=done.slice(-10).reverse();
 root.innerHTML=`<header class="field-top"><a class="logo" href="../"><img src="../assets/logo-symbol-clean.png" alt=""> AURÉA <span class="eyebrow">FIELD</span></a><button class="btn secondary tiny field-logout" data-action="logout">Se déconnecter</button></header><main class="field-page"><section class="field-hero"><small>MISSIONS TERRAIN · ZENATA & CASABLANCA</small><h1>Bonjour ${h(state.name.split(/\s+/)[0]||"")}</h1><p>Votre travail, les bonnes informations, la qualité vérifiée. Chaque intervention compte.</p></section><section class="field-stats"><div class="field-stat"><strong>${current.length}</strong><small>Aujourd’hui</small></div><div class="field-stat"><strong>${active.length}</strong><small>En cours</small></div><div class="field-stat"><strong>${done.length}</strong><small>Terminées (7 j)</small></div></section><section><div class="field-section"><div><h2>Missions du jour</h2><p>Les étapes sont horodatées automatiquement.</p></div></div><div class="field-list">${current.length?current.map(jobCard).join(""):'<div class="field-empty"><h3>Aucune mission prévue aujourd’hui</h3><p>Vos affectations apparaissent dès que le planning est confirmé.</p></div>'}</div></section><section><div class="field-section"><div><h2>Prochaines interventions</h2><p>Les adresses et consignes sont réservées à votre équipe.</p></div></div><div class="field-list">${upcoming.length?upcoming.map(jobCard).join(""):'<div class="field-empty">Aucune autre intervention affectée.</div>'}</div></section>${log.length?`<section><div class="field-section"><h2>Historique récent</h2></div><div class="field-list">${log.map(jobCard).join("")}</div></section>`:""}<footer class="foot">Auréa Services · Espace interne sécurisé · Les preuves sont accessibles uniquement aux personnes autorisées</footer></main>`;
}
async function refresh({openId=null}={}){
 const d=await api("/api/aurea-field?resource=overview");
 state.name=d.name||state.name;state.jobs=d.jobs||[];dashboard();
 if(openId)await detail(openId);
}
function check(label,name,checked,disabled=false){
 return `<label class="check"><input type="checkbox" name="${h(name)}" ${checked?"checked":""} ${disabled?"disabled":""}><span>${h(label)}</span></label>`;
}
async function detail(id){
 const job=state.jobs.find(j=>j.id===id);
 if(!job){toast("Cette mission n’est plus accessible",true);return}
 state.current=id;
 let history={events:[],photos:[]};
 try{history=await api("/api/aurea-field?resource=history&job="+encodeURIComponent(id))}catch(e){toast(e.message,true)}
 const checks=job.checklist||{};
 const editable=job.status==="in_progress";
 const evidence=history.photos?.length?`<div class="field-picture">${history.photos.map(p=>`<a href="/api/aurea-ops-photo?job=${encodeURIComponent(id)}&photo=${encodeURIComponent(p.id)}" target="_blank" rel="noopener noreferrer"><img src="/api/aurea-ops-photo?job=${encodeURIComponent(id)}&photo=${encodeURIComponent(p.id)}" loading="lazy" alt="Photo de contrôle"><small>${h(p.photo_type==="after"?"Après ménage":p.photo_type==="before"?"Avant ménage":p.photo_type==="incident"?"Incident":"Photo historique")} · ${h(p.caption||"Preuve d’intervention")}</small></a>`).join("")}</div>`:'<p class="hint">Aucune photo enregistrée.</p>';
 const afterCount=(history.photos||[]).filter(x=>x.photo_type==="after").length;
 const proofNotice=`<div class="field-alert">${afterCount?afterCount+" photo(s) après ménage enregistrée(s).":"Photo APRÈS ménage manquante : la mission ne peut pas être validée."}</div>`;
 const route=encodeURIComponent(job.latitude!==null&&job.longitude!==null?job.latitude+","+job.longitude:job.address);
 const quality=`<section class="field-qa"><h3>Checklist qualité</h3><p class="hint">Cochez uniquement les contrôles que vous avez réellement réalisés.</p><form data-form="quality" data-id="${h(id)}">${check("Nettoyage complet et surfaces vérifiées","cleaning",checks.cleaning,!editable)}${check("Linge et literie conformes","linen",checks.linen,!editable)}${check("Consommables réapprovisionnés","consumables",checks.consumables,!editable)}${check("Logement fermé et clés sécurisées","secure",checks.secure,!editable)}<div class="field"><label for="quality-note">Remarques ou anomalies</label><textarea id="quality-note" name="note" maxlength="1200" ${editable?"":"disabled"}>${h(job.quality_notes||"")}</textarea></div>${editable?'<button class="btn" type="submit">Enregistrer les contrôles</button>':""}</form></section>`;
 const upload=editable?`<section class="field-qa field-photos"><h3>Photos APRÈS ménage — obligatoires</h3><p class="field-alert">Impossible de soumettre ou faire valider ce ménage sans au moins une photo après nettoyage, horodatée après le démarrage de la mission.</p><form data-form="photo" data-id="${h(id)}"><div class="field"><label>Type de photo *</label><select name="photoType" required><option value="after" selected>APRÈS ménage (obligatoire)</option><option value="before">Avant ménage</option><option value="incident">Incident</option></select></div><div class="field"><label>Prendre ou choisir la photo (3 Mo maximum)</label><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" capture="environment" required></div><div class="field"><label>Légende</label><input name="caption" maxlength="100" placeholder="Ex. Salle de bain après nettoyage"></div><button class="btn secondary" type="submit">Enregistrer la preuve photographique</button></form></section>`:"";
 const incidents=job.status!=="completed"?`<section class="field-qa"><h3>Signaler un incident</h3><p class="hint">Retard, dégât, linge manquant, accès bloqué, consommables manquants…</p><form data-form="incident" data-id="${h(id)}"><div class="field"><label>Gravité</label><select name="severity" required><option value="low">Mineure</option><option value="medium">Modérée</option><option value="high">Importante</option><option value="critical">Critique</option></select></div><div class="field"><label>Description factuelle</label><textarea name="note" minlength="10" maxlength="1400" required placeholder="Décrivez le problème et l’action déjà entreprise."></textarea></div><button class="btn secondary" type="submit">Enregistrer l’incident</button></form></section>`:"";
 const events=history.events?.length?history.events.map(ev=>`<article><b>${h(ev.event==="incident_reported"?"Incident signalé":ev.event.replaceAll("_"," "))}</b><small>${h(clock(ev.created_at,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))} · ${h(ev.actor==="field"?"Terrain":ev.actor==="admin"?"Coordination Auréa":"Conciergerie")}</small>${ev.detail?.note?'<p class="hint">'+h(ev.detail.note)+'</p>':""}</article>`).join(""):'<p class="hint">Aucun historique.</p>';
 const currentActions=job.status==="assigned"?`<div class="field-sticky"><button class="btn" data-action="start" data-id="${h(id)}">Je suis sur place · Démarrer</button></div>`:editable?`<div class="field-sticky"><button class="btn" data-action="submit-qa" data-id="${h(id)}">Soumettre au contrôle qualité →</button></div>`:"";
 const markup=`<div class="field-details"><div class="meta"><span class="status ${h(job.status)}">${h(labels[job.status]||job.status)}</span><span class="hint">${h(day(job.start_at))} · ${h(hour(job.start_at))} — ${h(hour(job.end_at))}</span></div><h2 style="color:var(--forest);font-size:26px;letter-spacing:-.04em">${h(job.property_name)}</h2><p class="subtitle">${h(job.address)}</p><a class="btn secondary" href="https://www.google.com/maps/search/?api=1&query=${route}" target="_blank" rel="noopener noreferrer">Itinéraire vers le logement ↗</a><h3>Instructions d’intervention</h3><div class="detail-group"><small>Consignes du ménage</small><p>${h(job.notes||"Aucune instruction complémentaire")}</p></div><div class="detail-group"><small>Linge et literie</small><p>${h(job.linen_notes||"Suivre le protocole habituel Auréa")}</p></div><div class="detail-group"><small>Consommables</small><p>${h(job.consumables_notes||"Vérifier le réassort prévu")}</p></div>${job.access_notes?`<div class="detail-group"><small>Accès au logement · confidentiel</small><p>${h(job.access_notes)}</p></div>`:""}${job.lock_configured&&["assigned","in_progress","qa"].includes(job.status)?`<div class="detail-group"><small>Code serrure · confidentiel</small><p>Le code est masqué et accessible uniquement pendant une mission active.</p><button class="btn secondary tiny" data-action="reveal-lock" data-id="${h(id)}">Afficher le code temporairement</button><div class="secret" id="field-lock-reveal" hidden aria-live="polite"></div></div>`:""}${job.started_at?`<div class="detail-group"><small>Heure réelle de démarrage</small><p>${h(clock(job.started_at,{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}))}</p></div>`:""}${quality}${proofNotice}${upload}<section class="section"><h3>Photos enregistrées</h3>${evidence}</section>${incidents}<section class="section"><h3>Historique</h3><div class="field-timeline">${events}</div></section>${currentActions}</div>`;
 document.body.insertAdjacentHTML("beforeend",`<div class="overlay" id="field-overlay"><div class="dialog wide" role="dialog" aria-modal="true" aria-label="Dossier d’intervention"><div class="dialog-head"><div><span class="eyebrow">Auréa Field · Dossier privé</span><h2>Votre intervention</h2><p>Consignes, preuves et contrôle qualité.</p></div><button class="close" data-action="close" aria-label="Fermer">×</button></div>${markup}</div></div>`);
 document.getElementById("field-overlay")?.addEventListener("click",e=>{if(e.target.id==="field-overlay")e.target.remove()});
}
async function action(el){
 const name=el.dataset.action,id=el.dataset.id;
 if(name==="logout"){await api("/api/aurea-field-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})});state.name="";state.jobs=[];login();return}
 if(name==="close"){document.getElementById("field-overlay")?.remove();state.current=null;return}
 if(name==="detail")return detail(id);
 if(name==="reveal-lock"){
  const box=document.getElementById("field-lock-reveal");
  if(!box)return;
  const data=await api("/api/aurea-field?resource=lock_code&job="+encodeURIComponent(id));
  box.textContent="Code de serrure : "+data.code;box.hidden=false;
  const lockTimer=setTimeout(()=>{if(box.isConnected){box.textContent="";box.hidden=true}},30000);
  lockTimer.unref?.();
  return;
 }
 if(name==="start"){await post("start",{jobId:id});document.getElementById("field-overlay")?.remove();await refresh({openId:id});toast("Début de mission horodaté");return}
 if(name==="submit-qa"){await post("submit_qa",{jobId:id});document.getElementById("field-overlay")?.remove();await refresh({openId:id});toast("Preuves envoyées à Auréa pour validation");return}
}
async function submit(form){
 const fd=new FormData(form),kind=form.dataset.form;
 if(kind==="login"){
  await api("/api/aurea-field-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"login",email:fd.get("email"),password:fd.get("password")})});
  await refresh();toast("Bienvenue dans votre espace");
  return;
 }
 const id=form.dataset.id;
 if(kind==="quality"){
  const checklist=Object.fromEntries(["cleaning","linen","consumables","secure"].map(k=>[k,form.elements.namedItem(k)?.checked===true]));
  await post("quality",{jobId:id,checklist,note:String(fd.get("note")||"")});toast("Contrôles enregistrés");
 }
 if(kind==="incident"){await post("incident",{jobId:id,severity:fd.get("severity"),note:String(fd.get("note")||"")});toast("Incident enregistré dans le dossier");}
 if(kind==="photo"){
  if(fd.get("photo")?.size>3145728)throw Error("Photo de 3 Mo maximum");
  fd.set("jobId",id);
  await api("/api/aurea-ops-photo",{method:"POST",body:fd});toast("Photo enregistrée");
 }
 document.getElementById("field-overlay")?.remove();await refresh({openId:id});
}
document.addEventListener("click",async e=>{
 const el=e.target.closest("[data-action]");if(!el||state.busy)return;
 state.busy=true;try{await action(el)}catch(err){toast(err.message,true)}finally{state.busy=false}
});
document.addEventListener("submit",async e=>{
 const form=e.target.closest("form[data-form]");if(!form)return;
 e.preventDefault();if(state.busy)return;state.busy=true;
 const button=form.querySelector("button[type=submit]");if(button)button.disabled=true;
 try{await submit(form)}catch(err){toast(err.message,true);if(button)button.disabled=false}finally{state.busy=false}
});
(async()=>{try{await api("/api/aurea-field?resource=session");await refresh()}catch{login()}})();
