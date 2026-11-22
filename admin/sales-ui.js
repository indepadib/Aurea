import {contactLinks,isSecurityTarget,composeOutreach,outreachModes} from "./outreach.js";
const h=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatDay=(date)=>{
 if(!date)return "—";
 const d=new Date(String(date).slice(0,10)+"T12:00:00Z");
 return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("fr-FR");
};
const labelResult={
 email_envoye:"Email envoyé (confirmé)",appel_effectue:"Appel effectué",reponse_recue:"Réponse reçue",
 rendezvous_confirme:"Rendez-vous confirmé",devis_transmis:"Devis réellement transmis",
 vente_conclue:"Contrat / prestation confirmé(e)",non_interesse:"Pas intéressé / refus",note:"Note interne"
};
const labelChannel={email:"Email",telephone:"Téléphone",whatsapp:"WhatsApp",reunion:"Réunion",interne:"Interne",autre:"Autre"};
export function renderLeadWorkspace(items,onlyClients=false){
 const filtered=onlyClients?items.filter(x=>["Client","Réservé"].includes(x.data.status)):items;
 const stages=[["Nouveau","Nouveau"],["Contacté","Premier contact"],["Qualifié","Besoin qualifié"],["Rendez-vous","Rendez-vous"],["Devis envoyé","Devis envoyé"],["Négociation","Négociation"],["Réservé","Réservé"],["Client","Client"]];
 const counts=stages.map(([status,label])=>({status,label,count:items.filter(x=>x.data.status===status).length}));
 const stagesMarkup='<div class="journey-stages">'+counts.map(x=>'<div class="journey-step"><strong>'+x.count+'</strong><span>'+h(x.label)+'</span></div>').join("")+'</div>';
 const cards=filtered.map(record=>{
  const d=record.data||{},links=contactLinks(d,"lead");
  const address=[d.zone,d.service].filter(Boolean).join(" · ");
  return '<article class="lead-card"><div class="lead-card-top"><div><div class="lead-tags"><span class="tag">'+h(d.status||"Nouveau")+'</span><span class="tag">'+h(d.segment||"AUTRE")+'</span><span class="tag">'+h(d.source||"Saisie")+'</span></div><h3>'+h(d.name)+'</h3><p>'+h(address||"Besoin à préciser")+'</p></div><div class="lead-amount">'+(Number(d.quote||0)>0?Number(d.quote).toLocaleString("fr-FR")+" DH":"Devis à établir")+'</div></div>'+
  '<div class="lead-next"><strong>Prochaine étape</strong><span>'+h(d.nextAction||"Qualifier et convenir d’une action")+'</span>'+(d.nextDate?'<small>Pour le '+h(formatDay(d.nextDate))+'</small>':"")+'</div>'+
  '<div class="lead-buttons"><button class="btn green small" data-action="dossier" data-kind="lead" data-id="'+h(record.id)+'">Ouvrir le dossier →</button>'+(links.email?'<button class="btn secondary small" data-action="compose" data-kind="lead" data-id="'+h(record.id)+'">✉ Email</button>':'')+(links.whatsapp?'<a class="btn secondary small" href="'+h(links.whatsapp)+'" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>':'')+'<button class="btn secondary small" data-action="edit" data-kind="lead" data-id="'+h(record.id)+'">Modifier</button></div></article>';
 }).join("");
 return (onlyClients?"":stagesMarkup)+(filtered.length?'<div class="lead-cards">'+cards+'</div>':'<div class="panel empty"><h3>Aucun '+(onlyClients?"client confirmé":"dossier pour cette recherche")+'</h3><p>Les prospects deviennent des clients après qualification, proposition et confirmation réelle.</p></div>');
}
export function renderDossier(record,kind,activities=[]){
 const d=record.data||{},links=contactLinks(d,kind),security=isSecurityTarget(d),isClient=["Client","Réservé","Actif"].includes(d.status);
 const details=[
  ["Statut",d.status||"À qualifier"],["Segment",d.segment||"À définir"],["Origine",d.source||"À préciser"],
  ["Zone",d.zone||"À préciser"],["Email",links.email||"Non identifié"],["Téléphone",d.phone||"Non identifié"],
  ["Responsable",d.owner||"Non affecté"],["Prochaine action",d.nextAction||"À déterminer"],
  ["Relance prévue",formatDay(d.nextDate)],...(security?[["Autorisation gardiennage",d.securityCompliance||"À vérifier"]]:[])
 ];
 const history=activities.length?activities.map(a=>'<div class="activity-row"><span class="activity-dot"></span><div><strong>'+h(labelResult[a.result]||a.result)+'</strong><small>'+h(labelChannel[a.channel]||a.channel)+' • '+h(new Date(a.performed_at).toLocaleDateString("fr-FR"))+'</small><p>'+h(a.note||"")+'</p>'+(a.next_action?'<small>Suivi : '+h(a.next_action)+(a.next_date?' — '+formatDay(a.next_date):'')+'</small>':"")+'</div></div>').join(""):'<div class="empty-history">Aucune activité consignée. La préparation d’un email ne constitue pas un contact.</div>';
 return '<div class="sales-dossier">'+
 '<div class="sales-metrics">'+details.map(([a,b])=>'<div><small>'+h(a)+'</small><strong>'+h(b)+'</strong></div>').join("")+'</div>'+
 (security?'<p class="legal-hint">Gardiennage : l’engagement contractuel nécessite la vérification des autorisations et des garanties réglementaires.</p>':"")+
 '<div class="dossier-toolbar"><button class="btn green small" data-action="compose" data-kind="'+kind+'" data-id="'+h(record.id)+'" '+(!links.email?'disabled title="Email non connu"':'')+'>✉ Préparer un email</button>'+(links.whatsapp?'<a class="btn secondary small" target="_blank" rel="noopener noreferrer" href="'+h(links.whatsapp)+'">WhatsApp ↗</a>':'')+'<button class="btn secondary small" data-action="activity" data-kind="'+kind+'" data-id="'+h(record.id)+'">+ Consigner un échange</button><button class="btn secondary small" data-action="edit" data-kind="'+kind+'" data-id="'+h(record.id)+'">Modifier la fiche</button></div>'+
 (kind==="lead"?'<div class="sales-quote"><strong>Devis</strong><span>'+(Number(d.quote||0)>0?Number(d.quote).toLocaleString("fr-FR")+" DH":"Montant à définir")+'</span><small>'+h(d.proposalScope||"Périmètre à préciser")+'. Un devis enregistré dans le CRM n’est pas automatiquement envoyé.</small></div>':"")+
 '<div class="activity-section"><h3>Historique des échanges</h3>'+history+'</div>'+
 '</div>';
}
export function renderComposeModal(record,kind,mode="intro"){
 const d=record.data||{},links=contactLinks(d,kind,mode);
 const pastContact=Boolean(d.contactedAt || ["Contacté","En échange","Rendez-vous","Devis envoyé","Client"].includes(d.status));
 const modes=outreachModes.filter(m=>m.value!=="followup"||pastContact);
 return '<div class="modal-overlay" id="composeOverlay"><section class="modal composer-modal" role="dialog" aria-modal="true" aria-labelledby="composerTitle"><div class="modal-head"><div><span class="eyebrow">Auréa · Prospection commerciale</span><h2 id="composerTitle">Rédiger pour '+h(d.name)+'</h2><p class="desc">Vérifiez les informations, personnalisez le message et choisissez votre messagerie.</p></div><button class="x" type="button" data-action="close-compose" aria-label="Fermer">×</button></div>'+
 '<div class="composer-grid"><label class="field"><span>Étape du parcours</span><select id="composerMode">'+modes.map(m=>'<option value="'+m.value+'" '+(m.value===mode?'selected':'')+'>'+h(m.label)+'</option>').join("")+'</select></label><label class="field"><span>Destinataire</span><input id="composerEmail" type="email" value="'+h(links.email)+'" placeholder="Adresse professionnelle à confirmer"></label></div>'+
 '<label class="field"><span>Objet de l’email</span><input id="composerSubject" value="'+h(links.subject)+'" required></label><label class="field"><span>Message personnalisé</span><textarea id="composerBody" rows="17">'+h(links.body)+'</textarea></label>'+
 '<div class="composer-advice"><strong>Avant envoi :</strong> vérifiez que le prospect intervient bien à Zenata, confirmez l’interlocuteur, adaptez le premier paragraphe au contexte et ne promettez ni disponibilité ni autorisation de gardiennage non vérifiées.</div>'+
 '<div class="composer-foot"><button class="btn secondary" data-action="copy-email">Copier le texte</button><button class="btn secondary" data-action="open-mailto">Ouvrir ma messagerie</button><button class="btn green" data-action="open-gmail">Ouvrir dans Gmail</button></div>'+
 '<p class="hint">Ces boutons ouvrent un brouillon. Après l’envoi réel, consignez l’activité dans le dossier pour suivre la relance.</p>'+
 '</section></div>';
}
export function renderActivityModal(record,kind){
 const d=record.data||{};
 const results=[["note",labelResult.note],...Object.entries(labelResult).filter(([k])=>k!=="note")];
 const channels=Object.entries(labelChannel);
 return '<div class="modal-overlay" id="activityOverlay"><section class="modal activity-modal" role="dialog" aria-modal="true" aria-labelledby="activityTitle">'+
 '<div class="modal-head"><div><span class="eyebrow">Auréa · Historique CRM</span><h2 id="activityTitle">Consigner un échange</h2><p class="desc">'+h(d.name)+' — uniquement des actions réellement effectuées</p></div><button class="x" type="button" data-action="close-activity">×</button></div>'+
 '<form id="activityForm" data-id="'+h(record.id)+'" data-kind="'+h(kind)+'" class="activity-form">'+
 '<div class="formgrid"><div class="field"><label for="activityResult">Résultat réel</label><select required name="result" id="activityResult">'+results.map(([key,name])=>'<option value="'+key+'">'+h(name)+'</option>').join("")+'</select></div>'+
 '<div class="field"><label for="activityChannel">Canal</label><select required name="channel" id="activityChannel">'+channels.map(([key,name])=>'<option value="'+key+'">'+h(name)+'</option>').join("")+'</select></div>'+
 '<div class="field wide"><label for="activityNote">Compte rendu factuel</label><textarea required id="activityNote" name="note" maxlength="1500" rows="4" placeholder="Ex. Email envoyé à l’adresse professionnelle, demande d’un échange 15 min."></textarea></div>'+
 '<div class="field"><label for="activityDate">Date de prochaine action</label><input type="date" id="activityDate" name="nextDate"></div>'+
 '<div class="field"><label for="activityNext">Prochaine action</label><input id="activityNext" name="nextAction" maxlength="400" placeholder="Ex. Relance par téléphone si absence de réponse"></div></div>'+
 '<p class="legal-hint">N’enregistrez « email envoyé » qu’après l’envoi confirmé dans votre messagerie. Pour un gardiennage, aucun contrat ne peut être déclaré gagné avant vérification des autorisations.</p>'+
 '<div class="modal-footer"><button type="button" class="btn secondary" data-action="close-activity">Annuler</button><button type="submit" id="activitySave" class="btn green">Enregistrer l’activité</button></div></form></section></div>';
}
