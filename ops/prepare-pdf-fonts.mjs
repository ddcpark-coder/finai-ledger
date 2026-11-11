// Build-only: copy OFL-licensed Noto Sans subsets bundled via npm into
// FinAI's own static assets; no remote fetch and no shared hosting writes.
import {readFile,mkdir,copyFile} from "node:fs/promises";
import {join,resolve} from "node:path";

const root=resolve(process.cwd());
const packageFile=JSON.parse(await readFile(join(root,"package.json"),"utf8"));
if(packageFile.name!=="finai-ledger")
 throw new Error("PDF font preparation must run only inside the FinAI project.");
const dest=join(root,"public","fonts");
await mkdir(dest,{recursive:true});
for(const [source,name] of [
 ["noto-sans-latin-400-normal.woff","finai-noto-latin.woff"],
 ["noto-sans-latin-ext-400-normal.woff","finai-noto-latin-ext.woff"]
]){
 const path=join(root,"node_modules","@fontsource","noto-sans","files",source);
 await copyFile(path,join(dest,name));
}
