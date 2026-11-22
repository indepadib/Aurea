// Auréa sales copy — editable drafts, never auto-sent.
const isMail = value => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(String(value||"").trim());
const tidy = (value,max=200) => String(value||"").replace(/[\r\n]+/g," ").trim().slice(0,max);
const domain = "https://aurea-services.netlify.app/";
const closing=["","Bien cordialement,","L’équipe Auréa","Services aux logements et résidences • Zenata",domain].join("\n");
export const isSecurityTarget = data => /syndic|copropri|résidence|residence|gardiennage|sécurité|securite/i.test(String(data?.segment||"")+" "+String(data?.service||""));
export const normalizedPhone = value => {
 let s=String(value||"").replace(/[\s().-]/g,"");
 if(!s)return "";
 if(s.startsWith("00212"))s="+212"+s.slice(5);
 else if(s.startsWith("0"))s="+212"+s.slice(1);
 return /^\+?[0-9]{9,15}$/.test(s)?s:"";
};
const brand={title:"Auréa",website:domain};

export const outreachModes = [
 {value:"intro",label:"Premier contact — proposition de valeur"},
 {value:"followup",label:"Relance après un premier message"},
 {value:"meeting",label:"Proposer / confirmer un échange"},
 {value:"proposal",label:"Après échange — préparer une proposition"}
];

function introHosts(company,local){
 const qualification=local
 ?"Nous cherchons à accompagner les professionnels qui gèrent des logements en location courte durée à Zenata."
 :"Je souhaitais savoir si vous gérez déjà des logements en location courte durée à Zenata ou si cette zone fait partie de votre développement.";
 return {
  subject:"Zenata | Une solution locale pour les rotations Airbnb / Booking — Auréa",
  body:[
   "Bonjour à l’équipe "+company+",","",
   "Je me permets de vous contacter au nom d’Auréa. "+qualification,
   "",
   "Entre deux réservations, le vrai enjeu est de remettre le logement en état dans un délai court, sans multiplier les interlocuteurs ni sacrifier l’expérience du voyageur.",
   "",
   "Auréa propose un dispositif opérationnel adaptable à vos appartements :",
   "• ménage de sortie et préparation avant l’arrivée ;",
   "• lits préparés, linge hôtelier et blanchisserie selon le besoin ;",
   "• réassort des essentiels (papier toilette, savon, gel douche, eau, café) ;",
   "• contrôle de fin d’intervention, photos et signalement des anomalies.",
   "",
   "Nous pouvons étudier une organisation à la prestation ou récurrente, selon vos rotations et les délais à couvrir. Le périmètre et le prix sont définis après échange, en tenant compte de la surface et du niveau de service.",
   "",
   "Seriez-vous disponible pour un échange de 15 minutes cette semaine ? Nous pourrions identifier 1 ou 2 logements pilotes à Zenata et étudier une première prestation test, sans engagement de volume.",
   closing
  ].join("\n")
 };
}
function introSyndic(company,local){
 return {
  subject:"Résidences à Zenata | Entretien des parties communes & étude gardiennage — Auréa",
  body:[
   "Bonjour à l’équipe "+company+",","",
   "Je vous contacte au nom d’Auréa pour échanger sur les besoins d’exploitation et de qualité de service des résidences à Zenata.",
   "",
   local?"Votre activité à Zenata nous a amenés à identifier une possibilité de collaboration.":"Nous cherchons à identifier les syndics et responsables de résidences ayant un portefeuille ou des projets à Zenata.",
   "",
   "Notre proposition s’articule autour des besoins concrets des copropriétés :",
   "• entretien programmé des halls, escaliers, ascenseurs et espaces communs ;",
   "• contrôles qualité, remontée d’anomalies et interlocuteur opérationnel ;",
   "• étude des besoins d’accueil, de contrôle des accès et de gardiennage selon les horaires et le niveau de service attendu.",
   "",
   "Le gardiennage est une activité réglementée : une éventuelle prestation ne serait envisagée qu’après vérification des autorisations et des conditions légales applicables, directement ou avec un opérateur habilité.",
   "",
   "Pourrions-nous échanger 15 minutes avec le responsable syndic / exploitation ? L’objectif serait de comprendre le nombre de bâtiments, les plages horaires et les prestations en place avant de construire une proposition et, si pertinent, organiser une visite technique.",
   closing
  ].join("\n")
 };
}
function introLinen(company){
 return {
  subject:"Partenariat linge hôtelier et blanchisserie à Zenata — Auréa",
  body:[
   "Bonjour à l’équipe "+company+",","",
   "Je vous contacte pour le compte d’Auréa, une structure qui accompagne les propriétaires et gestionnaires de logements en location courte durée à Zenata.",
   "",
   "Nous cherchons un partenaire blanchisserie fiable pour la rotation de linge hôtelier (draps, taies, serviettes) entre deux séjours, avec un niveau de qualité constant.",
   "",
   "Avant de travailler ensemble, nous aimerions comprendre :",
   "• vos prestations de lavage, séchage, repassage et conditionnement ;",
   "• les délais et modalités de collecte / livraison à Zenata ;",
   "• les tarifs professionnels, minima de volume et conditions de traitement des pièces tachées ou manquantes ;",
   "• les possibilités de test qualité sur un petit lot de linge.",
   "",
   "Seriez-vous disponible pour un bref échange ou pour nous communiquer votre grille professionnelle ? Nous souhaitons sélectionner un partenaire local sur des critères opérationnels clairs.",
   closing
  ].join("\n")
 };
}
function replyLead(data){
 const service=tidy(data.service,120),zone=tidy(data.zone,100);
 return {
  subject:"Suite à votre demande Auréa — précisions et prochaines étapes",
  body:[
   "Bonjour "+tidy(data.name,80)+",","",
   "Merci d’avoir contacté Auréa. Nous avons bien pris connaissance de votre demande"+(service?" concernant « "+service+" »":"")+(zone?" à "+zone:"")+".",
   "",
   "Pour vous proposer une prestation réellement adaptée, pourriez-vous nous confirmer :",
   "• l’adresse ou la résidence et le type d’espace concerné ;",
   "• la surface et, pour une location courte durée, le nombre de logements et les rotations estimées ;",
   "• la date souhaitée, la fréquence et les éventuelles contraintes horaires ;",
   "• les options attendues (linge, consommables, entretien régulier, etc.) ?",
   "",
   "Une fois ces éléments clarifiés et la disponibilité de l’équipe vérifiée, nous pourrons établir une proposition détaillant le périmètre, le prix et les conditions.",
   "",
   "Préférez-vous nous répondre par email ou convenir d’un court appel ?",
   closing
  ].join("\n")
 };
}
function followup(company,security){
 return {
  subject:"Suivi de notre proposition Auréa — "+(security?"résidences à Zenata":"gestion de logements à Zenata"),
  body:[
   "Bonjour à l’équipe "+company+",","",
   "Je me permets de revenir vers vous à la suite de mon précédent message au sujet d’une éventuelle collaboration à Zenata.",
   "",
   security
    ?"Auréa souhaite échanger avec les gestionnaires de copropriétés sur l’entretien des parties communes et, sous réserve des autorisations requises, les besoins de gardiennage et de contrôle des accès."
    :"Auréa pourrait compléter votre organisation lors des rotations Airbnb/Booking : ménage entre séjours, préparation du linge, consommables et contrôle qualité avec photos.",
   "",
   "Je ne sais pas si le sujet est d’actualité pour vous. Si oui, un échange de 15 minutes nous permettrait de comprendre votre fonctionnement et de déterminer s’il existe un intérêt concret des deux côtés.",
   "",
   "Dans le cas contraire, n’hésitez pas à me l’indiquer ; je n’insisterai pas.",
   closing
  ].join("\n")
 };
}
function followupLead(data){
 const name=tidy(data.name,80),service=tidy(data.service,100);
 return {
  subject:"Auréa — suivi de votre demande"+(service?" (« "+service+" »)":""),
  body:[
   "Bonjour "+name+",","",
   "Je reviens vers vous concernant votre demande auprès d’Auréa"+(service?" pour « "+service+" »":"")+".",
   "",
   "Nous pouvons avancer dès que nous aurons confirmé ensemble la localisation exacte, le périmètre souhaité et le calendrier d’intervention.",
   "",
   "Votre projet est-il toujours d’actualité ? Si oui, vous pouvez simplement nous préciser votre créneau de disponibilité pour un court échange, ou nous répondre directement avec les informations manquantes.",
   "",
   "Si votre besoin a évolué ou n’est plus d’actualité, n’hésitez pas à nous le signaler.",
   closing
  ].join("\n")
 };
}
function meetingLead(data){
 const name=tidy(data.name,80);
 return {
  subject:"Auréa — convenons d’un échange sur votre demande",
  body:[
   "Bonjour "+name+",","",
   "Merci pour votre retour. Pour préparer une proposition adaptée, je vous propose un appel de 15 minutes afin de confirmer le logement ou la résidence concernée, les services attendus et les dates souhaitées.",
   "",
   "Pourriez-vous m’indiquer deux créneaux qui vous conviendraient ? Nous vous confirmerons l’horaire retenu après vérification de nos disponibilités.",
   closing
  ].join("\n")
 };
}
function meeting(company,security){
 return {
  subject:"Échange Auréa / "+company+" — besoins à Zenata",
  body:[
   "Bonjour à l’équipe "+company+",","",
   "Merci pour votre intérêt et nos premiers échanges.",
   "",
   "Pour avancer utilement, je vous propose un échange de 15 à 20 minutes afin de préciser :",
   security
    ?"• les résidences concernées, le nombre de bâtiments et les plages horaires ;"
    :"• le nombre de logements, leurs typologies et la fréquence de rotation ;",
   "• les prestations aujourd’hui réalisées en interne ou sous-traitées ;",
   "• les difficultés opérationnelles à résoudre et les critères de choix d’un prestataire ;",
   "• les prochaines étapes pour évaluer une éventuelle collaboration.",
   "",
   "Pouvez-vous me communiquer deux créneaux qui vous conviendraient ? Nous confirmerons ensemble l’horaire et le format.",
   closing
  ].join("\n")
 };
}
function proposal(data,kind,security,partner){
 const company=tidy(data.name,80);
 const amount=(typeof data.quote==="number"||typeof data.quote==="string")&&Number(data.quote)>0
  ?"Le budget indicatif saisi au dossier est de "+Number(data.quote).toLocaleString("fr-FR")+" DH ; le montant et les conditions définitives restent à valider."
  :"Le montant et les conditions seront définis après validation du périmètre et des coûts.";
 return {
  subject:"Suite à notre échange — cadrage d’une collaboration Auréa / "+company,
  body:[
   (kind==="lead"?"Bonjour "+company+",":"Bonjour à l’équipe "+company+","),"",
   "À la suite de nos échanges, voici les points que nous proposons de valider avant d’établir une offre définitive :",
   "",
   security
    ?"• résidences et espaces concernés, entretien des parties communes, fréquences, éventuel besoin de gardiennage ;"
    :partner
    ?"• volume de linge concerné, qualité attendue, collecte / livraison et délais de traitement ;"
    :"• logements concernés, typologies, fréquences de rotation et niveau de prestation attendu ;",
   "• calendrier et contraintes d’intervention ;",
   "• responsabilités respectives, points de contrôle et procédure de retour qualité ;",
   "• modalités de facturation et de suivi.",
   "",
   data.proposalScope?"Périmètre envisagé : "+tidy(data.proposalScope,900):"",
   data.proposalFrequency?"Fréquence prévue : "+tidy(data.proposalFrequency,180):"",
   amount,
   data.proposalConditions?"Conditions envisagées : "+tidy(data.proposalConditions,600):"",
   data.proposalValidUntil?"Validité indicative de la proposition jusqu’au "+tidy(data.proposalValidUntil,30):"",
   security?"Toute offre de gardiennage est subordonnée à la vérification des autorisations réglementaires.":"",
   "",
   "Si ce cadrage vous convient, pourriez-vous confirmer les éléments ci-dessus ou nous proposer une visite de site ? Nous finaliserons alors une proposition chiffrée.",
   closing
  ].filter(x=>x!=="").join("\n")
 };
}
export function composeOutreach(data={},kind="prospect",mode="intro"){
 const company=tidy(data.name,90)||"votre équipe";
 const partner=kind==="partner" && /blanchisserie|pressing/i.test(data.segment||"");
 const security=isSecurityTarget(data),local=/zenata/i.test(data.zone||"")&&!/non confirm|à confirmer|hors cible/i.test(data.zone||"");
 let draft;
 if(kind==="lead"&&mode==="intro")draft=replyLead(data);
 else if(kind==="lead"&&mode==="followup")draft=followupLead(data);
 else if(kind==="lead"&&mode==="meeting")draft=meetingLead(data);
 else if(mode==="followup")draft=followup(company,security);
 else if(mode==="meeting")draft=meeting(company,security);
 else if(mode==="proposal")draft=proposal(data,kind,security,partner);
 else draft=security?introSyndic(company,local):partner?introLinen(company):introHosts(company,local);
 return {...draft,company,security,partner,mode};
}
export function createMailLinks(email,subject,body){
 const recipient=tidy(email,254);
 if(!isMail(recipient))return {mailto:"",gmail:""};
 const q=encodeURIComponent;
 return {
  mailto:"mailto:"+recipient+"?subject="+q(subject)+"&body="+q(body),
  gmail:"https://mail.google.com/mail/?view=cm&fs=1&to="+q(recipient)+"&su="+q(subject)+"&body="+q(body)
 };
}
export function contactLinks(data={},kind="prospect",mode="intro"){
 const email=tidy(data.email,254),phone=normalizedPhone(data.phone),draft=composeOutreach(data,kind,mode);
 const links=createMailLinks(email,draft.subject,draft.body);
 return {...draft,email:isMail(email)?email:"",phone,...links,
  telephone:phone?"tel:"+phone:"",
  whatsapp:(kind==="lead"&&phone&&["Demande entrante","Consentement obtenu"].includes(data.consent||""))
   ?"https://wa.me/"+phone.replace(/\D/g,"")+"?text="+q("Bonjour "+tidy(data.name,70)+", merci d’avoir contacté Auréa"+(data.service?" concernant "+tidy(data.service,80):"")+". Pour préparer une proposition adaptée, pourriez-vous nous préciser vos besoins et vos disponibilités pour un échange ? L’équipe Auréa."): "",
  website:/^https?:\/\/[^\s]+$/i.test(String(data.sourceUrl||""))?data.sourceUrl:"",
 };
}
