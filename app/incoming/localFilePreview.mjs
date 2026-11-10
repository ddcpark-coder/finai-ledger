// Browser-only guidance for a synthetic document preview. Validation of a name,
 // MIME and length is not actual malware scanning or proof of file contents.
const TYPES=new Map([
 ["image/jpeg",["jpg","jpeg"]],
 ["image/png",["png"]],
 ["application/pdf",["pdf"]]
]);
export const MAX_LOCAL_PREVIEW_BYTES=10*1024*1024;
export function validateLocalPreviewFile(file){
 if(!file||typeof file.name!=="string"||typeof file.type!=="string"||
    !Number.isSafeInteger(file.size))throw new Error("Izberi veljavno vzorčno datoteko.");
 const type=file.type.toLowerCase();
 if(!TYPES.has(type))throw new Error("Lokalni predogled podpira samo JPG, PNG in PDF.");
 if(file.size<1||file.size>MAX_LOCAL_PREVIEW_BYTES)
   throw new Error("Datoteka mora biti velika med 1 B in 10 MB.");
 const name=file.name.trim();
 const match=name.match(/^([^\\/\x00-\x1f]{1,140})\.([A-Za-z]{3,4})$/);
 if(!match||!TYPES.get(type).includes(match[2].toLowerCase()))
   throw new Error("Ime, končnica in vrsta vzorčne datoteke se ne ujemajo.");
 return {name,type,size:file.size,image:type.startsWith("image/")};
}
