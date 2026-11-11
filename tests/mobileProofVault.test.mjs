import test from "node:test";
import assert from "node:assert/strict";
import {deliverySample,finalizeDemoDelivery} from "../app/documents/demoDeliveryProof.mjs";
import {encryptDemoProof,decryptDemoProof} from "../app/documents/mobileProofVault.mjs";
const signature="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xz9sAAAAASUVORK5CYII=";
const passphrase="demo-test-secret-do-not-use";
async function example(){
 return finalizeDemoDelivery({companyId:1,document:deliverySample(1),signer:"Sintetična oseba",
   signature,accepted:true,signedAt:new Date("2026-11-11T12:00:00Z")});
}
test("PBKDF2/AES-GCM seals and restores synthetic company evidence",async()=>{
 const original=await example();
 const cipher=await encryptDemoProof(original,1,passphrase);
 assert.equal(cipher.version,1);
 assert.equal(cipher.iterations,250000);
 assert.equal(cipher.companyId,1);
 assert.ok(cipher.ciphertext.length>100);
 assert.ok(!JSON.stringify(cipher).includes(original.signer));
 assert.ok(!JSON.stringify(cipher).includes("signatureDataUrl"));
 assert.deepEqual(await decryptDemoProof(cipher,1,passphrase),original);
});
test("wrong password, company, altered ciphertext and altered metadata fail closed",async()=>{
 const original=await example();
 const envelope=await encryptDemoProof(original,1,passphrase);
 await assert.rejects(decryptDemoProof(envelope,1,"a-different-password"),/Obnova ni uspela/);
 await assert.rejects(decryptDemoProof(envelope,2,passphrase),/izbranemu podjetju/);
 await assert.rejects(decryptDemoProof({...envelope,ciphertext:envelope.ciphertext.slice(0,-4)+"AAAA"},1,passphrase),/Obnova ni uspela/);
 await assert.rejects(decryptDemoProof({...envelope,iterations:1},1,passphrase),/izbranemu podjetju/);
 await assert.rejects(encryptDemoProof(original,2,passphrase),/ne pripada/);
 await assert.rejects(encryptDemoProof(original,1,"short"),/12–128/);
});
