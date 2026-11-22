const sanitize=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stages=[["vue","Vues du devis"],["choix","Service choisi"],["besoin","Besoin précisé"],["contact","Contact commencé"],["soumis","Demandes envoyées"]];
const groups=[["HOSTS","Airbnb / Hosts"],["HOME","Home"],["SECURITE","Syndics"]];
export function funnelCounts(rows=[]){
 const output={totals:{},bySegment:{}};
 for(const [id] of stages)output.totals[id]=0;
 for(const [id] of groups)output.bySegment[id]={vue:0,choix:0,besoin:0,contact:0,soumis:0};
 for(const row of rows){
  const stage=String(row.stage||""),segment=String(row.segment||"INCONNU"),hits=Number(row.hits||0);
  if(!Number.isSafeInteger(hits)||hits<0||!stages.some(s=>s[0]===stage))continue;
  output.totals[stage]+=hits;
  if(output.bySegment[segment])output.bySegment[segment][stage]+=hits;
 }
 return output;
}
export function renderFunnelDashboard(rows=[]){
 const counts=funnelCounts(rows);
 const values=stages.map(([key,label])=>({key,label,value:counts.totals[key]}));
 const max=Math.max(1,...values.map(x=>x.value));
 const stageHtml=values.map(x=>'<div class="acq-step"><div class="acq-label"><span>'+sanitize(x.label)+'</span><strong>'+x.value.toLocaleString("fr-FR")+'</strong></div><div class="acq-track"><div style="width:'+Math.min(100,Math.round(x.value/max*100))+'%"></div></div></div>').join("");
 const segmented=groups.map(([key,title])=>'<div class="acq-segment"><strong>'+sanitize(title)+'</strong><span>'+counts.bySegment[key].soumis.toLocaleString("fr-FR")+' demande(s)</span></div>').join("");
 return '<section class="panel acq-panel"><div class="acq-header"><div><h2>Performance des tunnels de devis</h2><p class="sub">Étapes réellement atteintes sur la nouvelle page de devis • 30 derniers jours.</p></div><span class="tag green">Sans cookies publicitaires</span></div>'+
  '<div class="acq-layout"><div class="acq-stages">'+stageHtml+'</div><div class="acq-side"><h3>Demandes par service</h3>'+segmented+
  '<p class="acq-disclaimer">Ces chiffres comptent des événements, pas des visiteurs uniques. Ils servent à repérer les abandons, pas à mesurer un taux de conversion exact.</p></div></div></section>';
}
export function renderCampaignLinks(){
 return '<section class="panel campaign-panel"><h2>Liens commerciaux prêts à partager</h2><p class="sub">Chaque lien ouvre directement le bon devis et identifie son canal d’origine dans Auréa.</p>'+
 '<div class="campaign-row"><label for="campaignChannel">Canal de diffusion</label><select id="campaignChannel" class="filter-select"><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="partenaire">Partenaire</option><option value="site">Site</option></select></div>'+
 '<div class="campaign-links">'+[["hosts","Hosts / Airbnb"],["home","Ménage à domicile"],["syndic","Syndics / Résidences"]].map(([type,label])=>'<button type="button" class="btn secondary small" data-action="copy-funnel" data-type="'+type+'">⧉ Copier '+sanitize(label)+'</button>').join("")+'</div>'+
 '<p class="acq-disclaimer">Le lien ouvre une demande de devis ; aucune réservation ou paiement n’est confirmé automatiquement.</p></section>';
}
export const publicFunnelLink=(type,channel)=>{
 const options=["hosts","home","syndic"];
 const sources=["facebook","instagram","whatsapp","email","partenaire","site"];
 const selected=options.includes(type)?type:"hosts",src=sources.includes(channel)?channel:"site";
 return "https://aurea-services.netlify.app/devis/?type="+selected+"&utm_source="+src+"&utm_campaign=aurea-growth";
};
