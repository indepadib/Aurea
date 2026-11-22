import test from "node:test";
import assert from "node:assert/strict";
import {composeOutreach,contactLinks,isSecurityTarget,normalizedPhone} from "../admin/outreach.js";

test("Host contact prepares correct personalized commercial draft",()=>{
 const x=contactLinks({name:"KheirBnB",segment:"Conciergerie",email:"contact@kheirbnb.com",phone:"+212 663 460 745",sourceUrl:"https://kheirbnb.com/"});
 assert.equal(x.email,"contact@kheirbnb.com");
 assert.equal(x.phone,"+212663460745");
 assert.match(x.mailto,/^mailto:contact@kheirbnb.com\?subject=/);
 assert.match(x.gmail,/^https:\/\/mail.google.com\/mail\/\?/);
 assert.match(x.body,/linge hôtelier/);
 assert.equal(x.security,false);
});
test("Syndic receives guarding-focused draft with legal qualification",()=>{
 const d={name:"City Syndic",segment:"Syndic professionnel",email:"citysyndic@gmail.com"};
 assert.equal(isSecurityTarget(d),true);
 const draft=composeOutreach(d);
 assert.match(draft.subject,/gardiennage/);
 assert.match(draft.body,/autorisation/i);
 assert.doesNotMatch(draft.body,/autorisation obtenue/i);
});
test("Inbounds are treated as replies, not cold prospecting",()=>{
 const draft=composeOutreach({name:"Client Auréa",segment:"HOME",email:"client@example.com"},"lead");
 assert.match(draft.subject,/Suite à votre demande/);
 assert.doesNotMatch(draft.body,/sous-traiter/i);
});
test("Laundry partners receive relevant B2B proposal",()=>{
 const draft=composeOutreach({name:"Pressing",segment:"Blanchisserie"},"partner");
 assert.match(draft.body,/lavage/);
 assert.match(draft.subject,/linge/);
});
test("Invalid email never results in untrusted mailto or Gmail URI",()=>{
 const result=contactLinks({name:"Example",email:"hi@site.com\nBCC:bad@evil.com",phone:"not a number",sourceUrl:"javascript:alert(1)"});
 assert.equal(result.mailto,"");
 assert.equal(result.gmail,"");
 assert.equal(result.telephone,"");
 assert.equal(result.website,"");
});
test("Morocco phone format normalized for click to call",()=>{
 assert.equal(normalizedPhone("06 63 21 56 26"),"+212663215626");
 assert.equal(normalizedPhone("0522 99 06 90"),"+212522990690");
 assert.equal(normalizedPhone("+212 717 576 411"),"+212717576411");
});
