import { contactLinks, isSecurityTarget } from "./outreach.js";
const h=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export function renderScopeTabs(scope){
 const tabs=[["all","Tous les prospects"],["hosts","Airbnb / conciergeries"],["security","Syndics & gardiennage"]];
 return '<nav class="scope-switch" aria-label="Segment commercial">'+tabs.map(([id,label])=>'<button type="button" class="'+(scope===id?"selected":"")+'" data-action="scope" data-scope="'+id+'">'+label+'</button>').join("")+'</nav>';
}
export function renderContactDirectory(kind,items){
 const hasEmail=items.filter(i=>contactLinks(i.data,kind).email).length;
 const contacted=items.filter(i=>i.data.status==="Contacté").length;
 const counts='<div class="contact-summary"><span><strong>'+items.length+'</strong> fiches</span><span><strong>'+hasEmail+'</strong> emails vérifiés ou renseignés</span><span><strong>'+contacted+'</strong> contacts effectués</span></div>';
 if(!items.length)return counts+'<div class="empty panel"><h3>Aucun résultat</h3><p>Modifiez la recherche ou le filtre, puis réessayez.</p></div>';
 return counts+'<div class="outreach-grid">'+items.map(item=>renderCard(kind,item)).join("")+'</div>';
}
function renderCard(kind,item){
 const d=item.data||{},id=h(item.id),l=contactLinks(d,kind),security=isSecurityTarget(d);
 const status='<span class="tag '+(d.status==="Contacté"?"green":"")+'">'+h(d.status||"À qualifier")+'</span>';
 const priority=d.priority?'<span class="tag">'+h("Priorité "+d.priority)+'</span>':"";
 const securityChip=kind==="prospect"&&security?'<span class="tag amber">Syndic / résidence</span>':"";
 const emailText=l.email?'<b>'+h(l.email)+'</b>':'<span class="muted">Email non identifié</span>';
 const phoneText=l.phone?'<b>'+h(d.phone)+'</b>':'<span class="muted">Téléphone à rechercher</span>';
 const mail=l.email?'<button class="btn small green" data-action="compose" data-kind="'+kind+'" data-id="'+id+'">✉ Rédiger une proposition</button>':'';
 const phone=l.phone?'<a class="btn small secondary" href="'+h(l.telephone)+'">☎ Appeler</a>':'';
 const convert=kind==="prospect"?'<button class="btn small secondary" data-action="convert" data-kind="prospect" data-id="'+id+'">Créer une opportunité</button>':'';
 const dossier='<button class="btn small secondary" data-action="dossier" data-kind="'+kind+'" data-id="'+id+'">Dossier & historique</button>';
 const source=/^https?:\/\//i.test(d.contactSource||"")?d.contactSource:l.website;
 const sourceLink=source?'<a target="_blank" rel="noopener noreferrer" href="'+h(source)+'">Source de contact ↗</a>':'<span>Source à compléter</span>';
 const contacted='<button class="text-action" data-action="activity" data-kind="'+kind+'" data-id="'+id+'">+ Consigner un échange réel</button>';
 return '<article class="outreach-card">'+
  '<div class="outreach-head"><div><div class="outreach-badges">'+status+priority+securityChip+'</div><h3>'+h(d.name)+'</h3><p>'+h(d.segment||"Professionnel")+' · '+h(d.zone||"Zone à vérifier")+'</p></div></div>'+
  '<p class="outreach-context">'+h(d.evidence||d.notes||"Vérifier le besoin et les coordonnées professionnelles.")+'</p>'+
  '<div class="outreach-contact"><div><small>EMAIL</small>'+emailText+'</div><div><small>TÉLÉPHONE</small>'+phoneText+'</div></div>'+
  '<div class="outreach-buttons">'+mail+phone+dossier+convert+'<button class="btn small secondary" data-action="edit" data-kind="'+kind+'" data-id="'+id+'">Modifier</button></div>'+
  '<div class="outreach-footer"><div>'+sourceLink+(d.contactVerifiedAt?'<span> · vérifié le '+h(d.contactVerifiedAt)+'</span>':"")+'</div><div class="outreach-actions-follow"><small>'+h(d.nextAction||"Prochaine action à planifier")+'</small>'+contacted+'</div></div>'+
 '</article>';
}
