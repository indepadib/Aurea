import { cp, mkdir, copyFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

// Whitelist the public assets: source, server code and migrations never enter dist.
const root=resolve(import.meta.dirname,"..");
const out=resolve(root,"dist");
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const filename of ["index.html","forms.html"]){
  await copyFile(resolve(root,filename),resolve(out,filename));
}
await cp(resolve(root,"assets"),resolve(out,"assets"),{recursive:true,force:true});
await cp(resolve(root,"admin"),resolve(out,"admin"),{recursive:true,force:true});
await cp(resolve(root,"devis"),resolve(out,"devis"),{recursive:true,force:true});
for(const directory of ["hosts","operations","ops"]){
 await cp(resolve(root,directory),resolve(out,directory),{recursive:true,force:true});
}
console.log("Auréa site generated: public vitrine preserved + private admin UI + Hosts & Operations.");
