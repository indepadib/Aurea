import { isSecurityTarget, contactLinks } from "./outreach.js";
import { renderScopeTabs, renderContactDirectory } from "./outreach-view.js";
import { composeOutreach, createMailLinks } from "./outreach.js";
import { renderLeadWorkspace, renderDossier, renderComposeModal, renderActivityModal } from "./sales-ui.js";
const sections={
  prospect:{title:"Prospects B2B",subtitle:"Conciergeries, syndics, résidences et contacts B2B qualifiés pour Zenata.",singular:"prospect",icon:"◎",columns:["name","segment","zone","priority","status","sourceUrl","nextAction"],fields:[
    ["name","Entreprise / prospect","text",true],["segment","Segment","select",false,["Conciergerie","Hôte multi-logements","Agence immobilière","Gestionnaire de résidence","Syndic professionnel","Résidence / promoteur","Autre"]],
    ["zone","Zone / résidence"],["priority","Priorité","select",false,["A","B","C"]],
    ["status","Statut","select",false,["À qualifier","Qualifié","Contact autorisé","Contacté","Rendez-vous","Devis envoyé","Client","Sans suite"]],
    ["evidence","Pourquoi ce prospect ?","textarea"],["source","Source identifiée"],["sourceUrl","URL de source","url"],
    ["nextAction","Prochaine action"],["nextDate","Date de relance","date"],["owner","Responsable"],
    ["email","E-mail professionnel","email"],["phone","Téléphone professionnel","tel"],
    ["contactedAt","Dernier contact (date)","date"],["lastContactChannel","Canal du dernier contact"],
    ["consent","Base de contact","select",false,["À déterminer","Demande entrante","Contact professionnel autorisé","Ne pas solliciter"]],
    ["notes","Notes","textarea"]]},
  lead:{title:"Demandes & réservations",subtitle:"Des premiers messages jusqu'aux clients actifs et à leur marge.",singular:"demande",icon:"◉",columns:["name","segment","zone","source","status","quote","nextAction"],fields:[
    ["name","Nom client / entreprise","text",true],["segment","Service","select",false,["HOSTS","HOME","SECURITE","AUTRE"]],
    ["zone","Résidence / zone"],["service","Besoin détaillé","textarea"],["status","Statut","select",false,["Nouveau","À qualifier","Contacté","Qualifié","En discussion","Rendez-vous","Devis envoyé","Négociation","Réservé","Client","Perdu"]],
    ["source","Origine","select",false,["Messenger","WhatsApp","Site Auréa","Instagram","Groupe Facebook","Partenaire","Prospection B2B","Autre"]],
    ["nextAction","Prochaine action"],["nextDate","Date prévue","date"],["owner","Responsable"],
    ["email","E-mail","email"],["phone","Téléphone","tel"],
    ["quote","Devis (DH)","number"],["revenue","CA réalisé (DH)","number"],["variableCost","Coût variable (DH)","number"],
    ["consent","Base de contact","select",false,["À déterminer","Demande entrante","Consentement obtenu","Ne pas solliciter"]],
    ["securityCompliance","Vérification gardiennage","select",false,["Non vérifié","En cours","Autorisations vérifiées"]],
    ["complianceEvidence","Justificatifs / autorisations vérifiées","textarea"],
    ["notes","Notes","textarea"]]},
  partner:{title:"Partenaires",subtitle:"Pressings, agents immobiliers, blanchisseries et apporteurs d'affaires.",singular:"partenaire",icon:"◇",columns:["name","segment","zone","status","nextAction"],fields:[
    ["name","Nom de l'entreprise","text",true],["segment","Type de partenariat","select",false,["Blanchisserie","Pressing","Agence immobilière","Conciergerie","Apporteur d'affaires","Autre"]],
    ["zone","Zone"],["status","Statut","select",false,["À qualifier","Contacté","En négociation","En test","Actif","Écarté"]],
    ["source","Source"],["sourceUrl","Lien professionnel","url"],["nextAction","Prochaine action"],
    ["nextDate","Date de suivi","date"],["owner","Responsable"],["email","E-mail professionnel","email"],
    ["phone","Téléphone professionnel","tel"],["contactedAt","Dernier contact (date)","date"],["lastContactChannel","Canal du dernier contact"],["consent","Base de contact","select",false,["À déterminer","Contact professionnel autorisé","Ne pas solliciter"]],
    ["notes","Notes","textarea"]]},
  content:{title:"Calendrier éditorial",subtitle:"Une seule équipe de contenu pour Facebook, Instagram, Auréa Hosts et Home.",singular:"contenu",icon:"▦",columns:["name","segment","channel","format","date","status"],fields:[
    ["name","Titre du contenu","text",true],["segment","Univers","select",false,["HOSTS","HOME","MARQUE"]],
    ["channel","Canal","select",false,["Facebook","Instagram","Facebook + Instagram","Groupes locaux","Autre"]],
    ["format","Format","select",false,["Post","Reel","Carrousel","Story","Vidéo","Autre"]],
    ["date","Date prévue","date"],["status","Statut","select",false,["Idée","À produire","En validation","Validé","Programmé","Publié"]],
    ["cta","Appel à l'action"],["copy","Caption / script","textarea"],["owner","Responsable"],["notes","Notes","textarea"]]},
  task:{title:"Plan d'action",subtitle:"Toutes les tâches Growth, Sales et opérations, avec un responsable et une échéance.",singular:"tâche",icon:"☑",columns:["name","segment","priority","dueDate","owner","status"],fields:[
    ["name","Action à réaliser","text",true],["segment","Équipe","select",false,["Prospection","Marketing","Création","Sales","Opérations","Direction"]],
    ["priority","Priorité","select",false,["Urgent","Haute","Moyenne","Basse"]],
    ["dueDate","Date limite","date"],["owner","Responsable"],["status","Statut","select",false,["À faire","En cours","Terminée","Bloquée"]],
    ["notes","Instructions / livrable","textarea"]]}
};
const keys=Object.keys(sections);
const fieldsMap={};for(const [k,section] of Object.entries(sections))fieldsMap[k]=Object.fromEntries(section.fields.map(f=>[f[0],f[1]]));
const app=document.getElementById("app");
const state={authenticated:false,configured:false,current:"dashboard",cache:{prospect:[],lead:[],partner:[],content:[],task:[]},search:"",status:"",scope:"all",busy:false,error:""};
const html=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtNum=(v)=>Number(v||0).toLocaleString("fr-FR");
const formatted=(v)=>v?new Date(v).toLocaleDateString("fr-FR"):"—";
const money=(v)=>Number.isFinite(Number(v))&&v!==undefined&&v!==""?fmtNum(v)+" DH":"—";
const badge=(v)=>{
 const value=String(v||"—");
 let type="";
 if(/^(Client|Actif|Publié|Terminée|Réservé|Validé)$/.test(value))type="green";
 else if(/^(Rendez-vous|Devis envoyé|Programmé|En cours|En négociation)$/.test(value))type="blue";
 else if(/^(A|Urgent|Bloquée|À qualifier|À produire)$/.test(value))type="amber";
 return '<span class="tag '+type+'">'+html(value)+'</span>';
};
async function api(path,options={}){
 const r=await fetch(path,{credentials:"same-origin",cache:"no-store",...options});
 const body=await r.json().catch(()=>({}));
 if(!r.ok){
  if(r.status===401&&path.includes("aurea-crm")){state.authenticated=false;showLogin();throw Error("Session expirée");}
  throw Error(body.error||"Une erreur est survenue");
 }
 return body;
}
function showLogin(message=""){
 app.innerHTML='<div class="login-screen"><div class="login-art"><img src="../assets/logo-symbol-clean.png" alt="Auréa"><div><small>Auréa • Gestion interne</small><h1>Votre activité.<br>En un seul endroit.</h1><p>Pilotez vos prospects, vos demandes, vos campagnes et vos opérations commerciales de Zenata.</p></div><small>Espace réservé à l’équipe Auréa</small></div><div class="login-side"><form id="loginForm" class="login-card"><span class="eyebrow">Accès privé</span><h2>Bienvenue chez Auréa.</h2><p>Connectez-vous pour accéder à votre espace commercial.</p>'+(message?'<div class="alert">'+html(message)+'</div>':'')+(!state.configured?'<div class="alert info">L’accès privé n’est pas encore configuré. Définissez les secrets Netlify avant la mise en service.</div>':'')+'<div class="field" style="margin-top:28px"><label for="password">Mot de passe administrateur</label><input id="password" type="password" name="password" autocomplete="current-password" minlength="16" required placeholder="Votre mot de passe"></div><button class="btn" '+(!state.configured?'disabled':'')+' type="submit">Accéder à mon espace →</button><div class="login-meta">Accès chiffré · Données non publiques</div></form></div></div>';
}
function shell(){
 app.innerHTML='<div class="shell"><aside class="sidebar"><a class="brand" href="../"><img src="../assets/logo-symbol-clean.png" alt=""><div><strong>AURÉA</strong><small>GROWTH CONSOLE</small></div></a><div class="nav-label">Votre activité</div><nav class="nav-menu" id="nav"><button class="nav-item" data-view="dashboard"><span class="symbol">▤</span>Vue d’ensemble</button><button class="nav-item" data-view="clients"><span class="symbol">♙</span>Clients & contrats</button>'+keys.map(k=>'<button class="nav-item" data-view="'+k+'"><span class="symbol">'+sections[k].icon+'</span>'+html(sections[k].title)+'</button>').join("")+'</nav><div class="side-foot">Auréa · Zenata<br>CRM interne • v1<button data-action="logout">Se déconnecter ↗</button></div></aside><div class="main"><div class="topbar"><div class="crumb">Auréa / <span id="crumb">Vue d’ensemble</span></div><div class="team">● &nbsp; Espace privé</div></div><main class="page" id="page"></main></div></div>';
}
function layoutTitle(title,description,button){
 return '<div class="page-header"><div><span class="eyebrow">Auréa · Zenata</span><h1>'+html(title)+'</h1><p>'+html(description)+'</p></div>'+(button||"")+'</div>';
}
function dashboard(){
 const prospects=state.cache.prospect,leads=state.cache.lead,content=state.cache.content,tasks=state.cache.task;
 const active=leads.filter(x=>["Client","Réservé"].includes(x.data.status)).length;
 const quotes=leads.filter(x=>x.data.status==="Devis envoyé").length;
 const ca=leads.reduce((s,x)=>s+Number(x.data.revenue||0),0);
 const margin=leads.reduce((s,x)=>s+Number(x.data.revenue||0)-Number(x.data.variableCost||0),0);
 const siteNew=leads.filter(x=>x.data.source==="Site Auréa"&&x.data.status==="Nouveau");
 const kpis=[
  ["Prospects B2B",prospects.length,"Base commerciale"],["Demandes entrantes",leads.length,"Hosts, Home et Sécurité"],
  ["Demandes du site à traiter",siteNew.length,"À qualifier et rappeler"],["CA déclaré",money(ca),"Marge estimée "+money(margin)]
 ];
 const statuses=["Nouveau","Qualifié","Devis envoyé","Réservé","Client"];
 const counts=statuses.map(s=>leads.filter(x=>x.data.status===s).length);
 const max=Math.max(...counts,1);
 const next=[...state.cache.prospect,...leads,...tasks].filter(x=>x.data.nextAction||x.data.name&&(x.kind==="task")).map(x=>({
  id:x.id,kind:x.kind,name:x.data.name,action:x.data.nextAction||x.data.name,date:x.data.nextDate||x.data.dueDate||""
 })).sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999")).slice(0,6);
 return layoutTitle("Vue d’ensemble","Une vision claire de votre activité commerciale et de la prochaine action à entreprendre.",'<button class="btn green" data-action="add" data-kind="lead">+ Nouvelle demande</button>')+
 (siteNew.length?'<section class="site-alert"><div><strong>'+siteNew.length+' demande(s) reçue(s) via le site à traiter</strong><p>Ouvrez les demandes, vérifiez le besoin et préparez un devis. Aucun message n’est envoyé automatiquement.</p></div><button class="btn green small" data-view="lead">Traiter les demandes →</button></section>':'')+
 '<div class="grid4">'+kpis.map(k=>'<article class="kpi"><span class="klabel">'+html(k[0])+'</span><span class="number">'+html(k[1])+'</span><small>'+html(k[2])+'</small></article>').join("")+'</div>'+
 '<div class="dash-grid"><section class="panel"><h2>Pipeline de conversion</h2><p class="sub">Demandes par étape, mises à jour depuis les fiches clients.</p><div class="pipeline">'+statuses.map((s,i)=>'<div class="pipeline-row"><span>'+html(s)+'</span><div class="bar"><i style="width:'+counts[i]/max*100+'%"></i></div><strong>'+counts[i]+'</strong></div>').join("")+'</div><p class="section-caption">Un client apparaît dans son statut actuel, pas dans toutes les étapes précédentes.</p></section>'+
 '<section class="panel"><h2>Prochaines actions</h2><p class="sub">Relances, rendez-vous et tâches prioritaires.</p>'+
 (next.length?next.map(x=>'<div class="next-item"><div><b>'+html(x.name)+'</b><small>'+html(x.action)+'</small></div><span class="pill-date">'+html(x.date||"À planifier")+'</span></div>').join(""):'<div class="empty"><div class="empty-icon">✦</div><h3>Tout commence ici</h3><p>Ajoutez un prospect ou une tâche pour préparer vos premières actions commerciales.</p><button class="btn secondary" data-action="add" data-kind="prospect">+ Ajouter un prospect</button></div>')+
 '</section></div><div class="dash-grid"><section class="panel"><h2>Contenus marketing</h2><p class="sub">Suivi des campagnes Facebook, Instagram et groupes de Zenata.</p><div style="display:flex;gap:12px;margin-top:22px;flex-wrap:wrap">'+badge(content.filter(x=>x.data.status==="Publié").length+" publiés")+badge(content.filter(x=>x.data.status==="Programmé").length+" programmés")+badge(content.filter(x=>x.data.status==="À produire").length+" à produire")+'</div><button style="margin-top:20px" class="btn secondary small" data-view="content">Ouvrir le calendrier →</button></section><section class="panel"><h2>Actions d’équipe</h2><p class="sub">Le suivi opérationnel des tâches.</p><span class="number" style="display:block;font-size:33px;font-weight:750;color:var(--navy2);margin:20px 0 6px">'+tasks.filter(x=>x.data.status==="Terminée").length+' / '+tasks.length+'</span><small class="muted">Tâches terminées</small><div style="margin-top:20px"><button class="btn secondary small" data-view="task">Ouvrir le plan →</button></div></section></div>';
}
function fieldText(key,value){
 if(key==="status"||key==="priority"||key==="segment")return badge(value);
 if(["revenue","quote","variableCost"].includes(key))return html(money(value));
 if(key==="date"||key==="dueDate"||key==="nextDate")return html(formatted(value));
 if(key==="sourceUrl")return /^https?:\/\//i.test(String(value||""))?'<a target="_blank" rel="noopener noreferrer" href="'+html(value)+'">Voir la source ↗</a>':"—";
 return html(value||"—");
}
function clientsView(){
 return layoutTitle("Clients & contrats","Retrouvez les dossiers avec une réservation ou une collaboration réellement confirmée.",'<button class="btn green" data-action="add" data-kind="lead">+ Nouvelle demande</button>')+
  renderLeadWorkspace(state.cache.lead,true);
}
function sectionView(kind){
 const meta=sections[kind],rows=state.cache[kind]||[];
 const query=state.search.trim().toLowerCase();
 const statuses=[...new Set(rows.map(r=>r.data.status).filter(Boolean))];
 const filtered=rows.filter(x=>(!query||Object.values(x.data).some(v=>String(v).toLowerCase().includes(query)))&&(!state.status||x.data.status===state.status)&&(state.scope==="all"||(state.scope==="security"&&isSecurityTarget(x.data))||(state.scope==="hosts"&&!isSecurityTarget(x.data))))
 .sort((a,b)=>{
  if(kind==="prospect") return ({A:0,B:1,C:2}[a.data.priority]??3)-({A:0,B:1,C:2}[b.data.priority]??3);
  if(kind==="lead"){
   const rank=x=>x.data.status==="Nouveau"&&x.data.source==="Site Auréa"?0:x.data.status==="Nouveau"?1:2;
   return rank(a)-rank(b);
  }
  return 0;
 });
 const cols=meta.columns;
 const toolbar='<div class="toolbar"><div class="left"><input class="search-input" id="searchInput" type="search" placeholder="Rechercher dans '+html(meta.title.toLowerCase())+'..." value="'+html(state.search)+'" aria-label="Rechercher"><select class="filter-select" id="statusFilter"><option value="">Tous les statuts</option>'+statuses.map(s=>'<option value="'+html(s)+'" '+(state.status===s?'selected':'')+'>'+html(s)+'</option>').join("")+'</select></div><span class="muted">'+filtered.length+' résultat(s)</span></div>';
 const tip=kind==="lead"?'<div class="inline-guide">⌁ Les demandes du formulaire Auréa arrivent ici après validation par Netlify. Cliquez sur « Qualifier » ou « Modifier » pour préparer la suite.</div>':kind==="prospect"?'<div class="inline-guide">Base issue de sources professionnelles publiques. « À qualifier » signifie qu’aucun contact n’a été établi. La couverture Zenata est à confirmer avant proposition.</div>':'';
 const list=(kind==="prospect"||kind==="partner")?renderContactDirectory(kind,filtered):kind==="lead"?renderLeadWorkspace(filtered):filtered.length?'<div class="table-wrap"><table><thead><tr>'+cols.map(col=>'<th>'+html(fieldsMap[kind][col]||col)+'</th>').join("")+'<th>Actions</th></tr></thead><tbody>'+
 filtered.map(x=>'<tr>'+cols.map(col=>'<td class="'+(col==="name"?"strong":"")+'">'+fieldText(col,x.data[col])+'</td>').join("")+
 '<td><div class="cell-actions">'+(kind==="prospect"?'<button class="btn small secondary" data-action="convert" data-kind="prospect" data-id="'+html(x.id)+'">Créer une demande →</button>':kind==="lead"&&x.data.status==="Nouveau"?'<button class="btn small green" data-action="qualify" data-kind="lead" data-id="'+html(x.id)+'">Qualifier</button>':'')+'<button class="icon-button" aria-label="Modifier" data-action="edit" data-kind="'+kind+'" data-id="'+html(x.id)+'">Modifier</button><button class="icon-button" aria-label="Supprimer" data-action="delete" data-kind="'+kind+'" data-id="'+html(x.id)+'">✕</button></div></td></tr>').join("")+'</tbody></table></div>':
 '<div class="table-wrap empty"><div class="empty-icon">◎</div><h3>'+(query||state.status?'Aucun résultat pour ce filtre':'Aucune donnée pour le moment')+'</h3><p>'+(query||state.status?'Changez votre recherche pour afficher vos fiches.':'Créez votre première fiche pour structurer votre activité. Les données seront enregistrées dans la base Auréa.')+'</p><button class="btn secondary" data-action="add" data-kind="'+kind+'">+ Ajouter '+html(meta.singular)+'</button></div>';
 return layoutTitle(meta.title,meta.subtitle,'<div class="header-actions"><button class="btn secondary" data-action="refresh">↻ Actualiser</button><button class="btn green" data-action="add" data-kind="'+kind+'">+ Nouveau '+html(meta.singular)+'</button></div>')+tip+(kind==="prospect"?renderScopeTabs(state.scope):"")+toolbar+list;
}
function render(){
 if(!state.authenticated)return;
 document.querySelectorAll(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.view===state.current));
 document.getElementById("crumb").textContent=state.current==="dashboard"?"Vue d’ensemble":state.current==="clients"?"Clients & contrats":sections[state.current].title;
 document.getElementById("page").innerHTML=state.current==="dashboard"?dashboard():state.current==="clients"?clientsView():sectionView(state.current);
}
function navigate(view){
 if(view!=="dashboard"&&view!=="clients"&&!sections[view])return;
 state.current=view;state.search="";state.status="";state.scope="all";
 history.replaceState(null,"","#"+view);
 render();
}
function toast(message,error=false){
 document.querySelectorAll(".toast").forEach(t=>t.remove());
 const n=document.createElement("div");n.className="toast"+(error?" error":"");n.textContent=message;
 document.body.append(n);setTimeout(()=>n.remove(),4500);
}
async function loadAll(){
 try{
  const rows=await Promise.all(keys.map(async kind=>({kind,...await api("/api/aurea-crm?kind="+kind)})));
  for(const r of rows)state.cache[r.kind]=r.items||[];
  state.error="";
 }catch(e){state.error=e.message; if(state.authenticated)toast("Données indisponibles : "+e.message,true);}
 if(state.authenticated)render();
 if(state.error&&state.authenticated){
  const p=document.getElementById("page");
  p.insertAdjacentHTML("afterbegin",'<div class="alert">Impossible de charger les données. '+html(state.error)+' Vérifiez la configuration Netlify Database avant utilisation.</div>');
 }
}
function openModal(kind,item=null,defaults={}){
 const meta=sections[kind];if(!meta)return;
 const title=(item?"Modifier ":"Ajouter ")+meta.singular;
 const all=meta.fields.map(f=>{
  const [key,label,type="text",required=false,choices]=f,val=item?.data?.[key]??defaults[key]??"";
  const id="f_"+key,attrs='id="'+id+'" name="'+key+'" '+(required?"required":"");
  let input;
  if(type==="select")input='<select '+attrs+'><option value="">Sélectionner…</option>'+choices.map(opt=>'<option value="'+html(opt)+'" '+(val===opt?'selected':'')+'>'+html(opt)+'</option>').join("")+'</select>';
  else if(type==="textarea")input='<textarea '+attrs+' rows="'+(key==="copy"?5:3)+'">'+html(val)+'</textarea>';
  else input='<input '+attrs+' type="'+type+'" '+(type==="number"?'min="0" step="0.01"':'')+' value="'+html(val)+'" autocomplete="off">';
  return '<div class="field '+(type==="textarea"?"wide":"")+'"><label for="'+id+'">'+html(label)+(required?" *":"")+'</label>'+input+'</div>';
 }).join("");
 const overlay=document.createElement("div");overlay.className="modal-overlay";overlay.id="modalOverlay";
 overlay.innerHTML='<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><div><span class="eyebrow">Auréa · '+html(meta.title)+'</span><h2 id="modalTitle">'+html(title)+'</h2><p class="desc">Enregistrement privé dans votre espace Auréa.</p></div><button type="button" class="x" aria-label="Fermer" data-action="close">×</button></div><form id="recordForm" data-kind="'+kind+'" data-id="'+html(item?.id||"")+'" data-origin-prospect="'+html(defaults.originProspectId||"")+'"><div class="formgrid">'+all+'</div><div class="modal-footer"><button type="button" class="btn secondary" data-action="close">Annuler</button><button type="submit" class="btn green" id="saveButton">Enregistrer →</button></div></form></div>';
 document.body.append(overlay);overlay.querySelector("input,select,textarea")?.focus();
}
async function onFormSubmit(event){
 if(event.target.id==="loginForm"){
  event.preventDefault();
  const button=event.target.querySelector("button");button.disabled=true;button.textContent="Connexion…";
  try{
   await api("/api/aurea-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"login",password:new FormData(event.target).get("password")})});
   state.authenticated=true;shell();navigate(location.hash.slice(1)||"dashboard");await loadAll();
  }catch(e){showLogin(e.message);}
  return;
 }
 if(event.target.id!=="recordForm")return;
 event.preventDefault();
 const form=event.target,kind=form.dataset.kind,id=form.dataset.id,data={};
 for(const [name,value] of new FormData(form)){
  if(["quote","revenue","variableCost"].includes(name)){
   if(value!=="")data[name]=Number(value);
  }else data[name]=String(value);
 }
 if(kind==="lead" && form.dataset.originProspect)data.originProspectId=form.dataset.originProspect;
 const button=document.getElementById("saveButton");button.disabled=true;button.textContent="Enregistrement…";
 try{
  const endpoint="/api/aurea-crm?kind="+kind+(id?"&id="+encodeURIComponent(id):"");
  const saved=await api(endpoint,{method:id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data})});
  if(kind==="lead" && !id && data.originProspectId && saved.item?.id){
   const prospect=state.cache.prospect.find(x=>x.id===data.originProspectId);
   if(prospect){
    try{
     await api("/api/aurea-crm?kind=prospect&id="+encodeURIComponent(prospect.id),{
      method:"PUT",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({data:{name:prospect.data.name,linkedLeadId:saved.item.id}})});
    }catch(err){toast("Opportunité créée, lien retour du prospect non synchronisé : "+err.message,true);}
   }
  }
  document.getElementById("modalOverlay")?.remove();
  toast("Fiche enregistrée");if(kind==="lead"&&state.current==="prospect")navigate("lead");await loadAll();
 }catch(e){button.disabled=false;button.textContent="Enregistrer →";toast(e.message,true);}
}
async function onClick(event){
 const el=event.target.closest("[data-action],[data-view]");if(!el)return;
 if(el.dataset.view){navigate(el.dataset.view);return;}
 const {action,kind,id}=el.dataset;
 if(action==="refresh"){await loadAll();toast("Données actualisées");return;}
 if(action==="scope"){state.scope=el.dataset.scope||"all";render();return;}
 if(action==="contacted"){
  const item=state.cache[kind]?.find(x=>x.id===id);
  if(!item || !confirm("Confirmez-vous avoir réellement contacté "+item.data.name+" ? Ouvrir un brouillon ne compte pas comme un envoi."))return;
  try{
   const today=new Date().toISOString().slice(0,10);
   await api("/api/aurea-crm?kind="+kind+"&id="+encodeURIComponent(id),{method:"PUT",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({data:{...item.data,status:"Contacté",contactedAt:today,lastContactChannel:"Saisie manuelle",nextAction:"Prévoir un suivi uniquement si approprié"}})});
   toast("Contact enregistré");await loadAll();
  }catch(e){toast(e.message,true);}
  return;
 }
 if(action==="add"){openModal(kind,null,kind==="lead"?{status:"Nouveau",source:"Autre"}:kind==="prospect"?{status:"À qualifier",consent:"À déterminer"}:{});return;}
 if(action==="convert"){
  const prospect=state.cache.prospect.find(x=>x.id===id);if(!prospect)return;
   const existing=state.cache.lead.find(x=>x.data.originProspectId===prospect.id||(x.data.source==="Prospection B2B"&&x.data.name.toLowerCase()===prospect.data.name.toLowerCase()));
   if(existing){navigate("lead");openModal("lead",existing);toast("Cette entreprise a déjà une demande : fiche existante ouverte");return;}
  openModal("lead",null,{
   name:prospect.data.name,segment:isSecurityTarget(prospect.data)?"SECURITE":"HOSTS",zone:prospect.data.zone,
   originProspectId:prospect.id,
   service:isSecurityTarget(prospect.data)?"Entretien et gardiennage (autorisation à vérifier)":"Ménage et linge pour locations saisonnières",
   source:"Prospection B2B",status:"Nouveau",
   consent:prospect.data.consent==="Demande entrante"?"Demande entrante":"À déterminer",
   nextAction:"Qualifier l’intérêt B2B avant proposition",
   notes:"Créée depuis le prospect B2B : "+prospect.data.name+"\n"+(prospect.data.evidence||""),
   email:prospect.data.email||"",phone:prospect.data.phone||""
  });
  return;
 }
 if(action==="qualify"){
  const lead=state.cache.lead.find(x=>x.id===id);if(!lead)return;
  try{
   await api("/api/aurea-crm?kind=lead&id="+encodeURIComponent(id),{
    method:"PUT",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({data:{...lead.data,status:"Qualifié",nextAction:"Préparer le devis et confirmer la disponibilité opérationnelle"}})
   });
   toast("Demande qualifiée");await loadAll();
  }catch(err){toast(err.message,true);}
  return;
 }
 if(action==="edit"){openModal(kind,state.cache[kind].find(x=>x.id===id));return;}
 if(action==="close"){document.getElementById("modalOverlay")?.remove();return;}
 if(action==="delete"){
  const item=state.cache[kind].find(x=>x.id===id);
  if(!item||!confirm('Supprimer définitivement la fiche « '+item.data.name+' » ?'))return;
  try{await api("/api/aurea-crm?kind="+kind+"&id="+encodeURIComponent(id),{method:"DELETE"});toast("Fiche supprimée");await loadAll();}
  catch(e){toast(e.message,true);}
 }
 if(action==="logout"){
  try{await api("/api/aurea-auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})});}
  catch{}
  state.authenticated=false;showLogin();
 }
}
document.addEventListener("submit",onFormSubmit);
document.addEventListener("click",onClick);
document.addEventListener("input",e=>{
 if(e.target.id==="searchInput"){const pos=e.target.selectionStart;state.search=e.target.value;render();const input=document.getElementById("searchInput");input.focus();input.setSelectionRange(pos,pos);}
});
document.addEventListener("change",e=>{
 if(e.target.id==="statusFilter"){state.status=e.target.value;render();}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.getElementById("modalOverlay")?.remove();});
async function init(){
 try{
  const session=await api("/api/aurea-auth");
  state.configured=!!session.configured;state.authenticated=!!session.authenticated;
  if(!state.authenticated)showLogin();else{shell();navigate(location.hash.slice(1)||"dashboard");await loadAll();}
 }catch(e){state.configured=false;showLogin("Connexion au service indisponible : "+e.message);}
}
init();
// Keep incoming requests visible without manual reload; no messaging or posting is triggered.
setInterval(()=>{if(state.authenticated&&!document.hidden&&!document.getElementById("modalOverlay"))loadAll();},90000);
