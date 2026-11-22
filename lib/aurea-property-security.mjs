import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";

function lockKey(){
 const root=(typeof Netlify!=="undefined"&&Netlify?.env?.get?.("AUREA_LOCK_ENCRYPTION_KEY"))||process.env.AUREA_LOCK_ENCRYPTION_KEY||
 (typeof Netlify!=="undefined"&&Netlify?.env?.get?.("AUREA_SESSION_SECRET"))||process.env.AUREA_SESSION_SECRET||"";
 if(root.length<32)throw Error("Clé de chiffrement non configurée");
 return createHash("sha256").update("aurea:lock-code:aes256gcm:v1:", "utf8").update(root,"utf8").digest();
}
export function validLockCode(value){
 return typeof value==="string"&&value.trim().length>=3&&value.trim().length<=64&&
  !/[\x00-\x1f\x7f]/.test(value)&&value.trim()===value;
}
export function encryptLockCode(value){
 if(!validLockCode(value))throw Error("Code de serrure invalide");
 const nonce=randomBytes(12),cipher=createCipheriv("aes-256-gcm",lockKey(),nonce);
 const body=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
 return ["v1",nonce.toString("base64url"),body.toString("base64url"),cipher.getAuthTag().toString("base64url")].join(".");
}
export function decryptLockCode(value){
 if(!value)return null;
 const parts=String(value).split(".");
 if(parts.length!==4||parts[0]!=="v1")throw Error("Format de code non reconnu");
 const nonce=Buffer.from(parts[1],"base64url"),payload=Buffer.from(parts[2],"base64url"),tag=Buffer.from(parts[3],"base64url");
 if(nonce.length!==12||tag.length!==16||payload.length<3||payload.length>256)throw Error("Code chiffré invalide");
 const decipher=createDecipheriv("aes-256-gcm",lockKey(),nonce);
 decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(payload),decipher.final()]).toString("utf8");
}
export function validPhotoType(value){return ["before","after","incident"].includes(value)}
export function canCountAsAfterPhoto(photoType,uploadedAt,startedAt){
 return photoType==="after"&&Boolean(startedAt)&&Date.parse(uploadedAt)>=Date.parse(startedAt);
}
