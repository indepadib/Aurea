import {getDatabase} from "@netlify/database";
import {mapFormSubmission} from "../../lib/aurea-form.mjs";

// Netlify verifies the platform-event signature before invoking this handler.
// No public HTTP endpoint is exposed for adding CRM records.
export default {
 async formSubmitted(event){
  const result=mapFormSubmission(event?.data);
  if(!result)return;
  const db=getDatabase();
  await db.sql`
   insert into aurea_crm_records (kind,data,source_key)
   values ('lead',${JSON.stringify(result.data)}::jsonb,${result.sourceKey})
   on conflict (source_key) where source_key is not null do nothing
  `;
  console.log("Auréa CRM: verified Netlify form received.");
 }
};
