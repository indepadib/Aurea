import test from "node:test";
import assert from "node:assert/strict";
import {composeOutreach,contactLinks,createMailLinks} from "../admin/outreach.js";
import {renderLeadWorkspace,renderDossier,renderComposeModal,renderActivityModal} from "../admin/sales-ui.js";

const hosts={name:"KheirBnB",zone:"Casablanca / Zenata",segment:"Conciergerie",email:"contact@kheirbnb.com",service:"Turnover Airbnb"};
const syndic={name:"City Syndic",zone:"Casablanca",segment:"Syndic professionnel",email:"citysyndic@gmail.com"};
const inbound={name:"Client Test",segment:"HOSTS",zone:"Zenata",service:"Pack Airbnb / Booking",email:"client@example.com"};
test("first-contact email is complete, structured, personalized and ends with a clear meeting CTA",()=>{
 const draft=composeOutreach(hosts,"prospect","intro");
 assert.match(draft.body,/KheirBnB/);
 assert.match(draft.body,/ménage de sortie/i);
 assert.match(draft.body,/linge hôtelier/i);
 assert.match(draft.body,/réassort/i);
 assert.match(draft.body,/contrôle.*photos/i);
 assert.match(draft.body,/15 minutes/);
 assert.match(draft.body,/aurea-services.netlify.app/);
 assert.ok(draft.body.length>850);
});
test("syndic pitch does not claim an authorization already granted",()=>{
 const draft=composeOutreach(syndic,"prospect","intro");
 assert.match(draft.body,/autorisations.*légal/i);
 assert.match(draft.body,/visite technique/i);
 assert.match(draft.body,/copropriétés/i);
 assert.doesNotMatch(draft.body,/nous sommes agréés/i);
});
test("inbound client reply asks for actionable details instead of trying cold outreach",()=>{
 const draft=composeOutreach(inbound,"lead","intro");
 assert.match(draft.subject,/Suite à votre demande/);
 assert.match(draft.body,/Pack Airbnb/);
 assert.match(draft.body,/date souhaitée/);
 assert.match(draft.body,/proposition/);
});
test("follow-up, meeting and proposal drafts differ and preserve a clear customer journey",()=>{
 const follow=composeOutreach(hosts,"prospect","followup");
 const meeting=composeOutreach(hosts,"prospect","meeting");
 const proposal=composeOutreach({...inbound,quote:450,proposalScope:"Nettoyage complet, linge et réassort",proposalFrequency:"4 rotations par mois"},"lead","proposal");
 assert.match(follow.body,/précédent message/i);
 assert.match(meeting.body,/15 à 20 minutes/i);
 assert.match(proposal.body,/450 DH/);
 assert.match(proposal.body,/Nettoyage complet/);
 assert.match(proposal.body,/4 rotations par mois/);
});
test("editable draft links always encode user-selected subject and body",()=>{
 const x=createMailLinks("commercial@example.com","Objet € & plus","Bonjour,\nNotre proposition...");
 assert.match(x.mailto,/subject=Objet%20%E2%82%AC%20%26%20plus/);
 assert.match(x.gmail,/body=Bonjour%2C%0ANotre/);
 assert.equal(createMailLinks("bad\nCC:victime@test.fr","x","y").mailto,"");
});
test("Lead workspace can show confirmed clients separately",()=>{
 const items=[
  {id:"aaa",data:{name:"Client actif",status:"Client",segment:"HOSTS",quote:400}},
  {id:"bbb",data:{name:"Prospect non signé",status:"Nouveau",segment:"HOSTS"}}
 ];
 const html=renderLeadWorkspace(items,true);
 assert.match(html,/Client actif/);
 assert.doesNotMatch(html,/Prospect non signé/);
 assert.match(html,/Ouvrir le dossier/);
});
test("Dossier shows true chronology and does not report draft as sent",()=>{
 const h=renderDossier({id:"aaa",data:inbound},"lead",[
 {result:"email_envoye",channel:"email",note:"Envoyé après vérification",performed_at:"2026-11-22T01:00:00Z"}
 ]);
 assert.match(h,/Historique des échanges/);
 assert.match(h,/Envoyé après vérification/);
 assert.match(h,/Un devis enregistré dans le CRM n’est pas automatiquement envoyé/);
});
test("Composer lets user edit first and only offers follow-up after a logged contact",()=>{
 const without=renderComposeModal({id:"aaa",data:hosts},"prospect");
 const withContact=renderComposeModal({id:"bbb",data:{...hosts,contactedAt:"2026-11-22"}},"prospect");
 assert.doesNotMatch(without,/Relance après un premier message/);
 assert.match(withContact,/Relance après un premier message/);
 assert.match(without,/composerBody/);
 assert.match(without,/Ouvrir dans Gmail/);
});
test("Activity modal asks for actual outcome and next action",()=>{
 const m=renderActivityModal({id:"aaa",data:hosts},"prospect");
 assert.match(m,/Consigner un échange/);
 assert.match(m,/Date de prochaine action/);
 assert.match(m,/email envoyé.*envoi confirmé/i);
 assert.match(m,/value="note"/);
});
