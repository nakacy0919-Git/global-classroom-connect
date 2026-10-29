// GCC V18.3: safe client-side photo resizing. Prefer WebP; use JPEG when a
// browser (including some managed/older Edge versions) cannot encode WebP.
// Keep uploaded files <=250 KB, 512 px max, and retain server-side validation.
export const TEACHER_WEBP_MAX_BYTES_V116=300000;
const SOURCE_TYPES=['image/jpeg','image/png','image/webp'];
const EXPORT_TYPES=['image/webp','image/jpeg'];
const QUALITIES=[.8,.68,.55,.42,.3];
const SCALES=[1,.82,.65,.5,.38];

function blobFromDataUrl(url){
 const match=/^data:(image\/(?:webp|jpeg));base64,(.+)$/.exec(url||'');
 if(!match)return null;
 const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
 return new Blob([bytes],{type:match[1]});
}
async function encodeCanvas(canvas,mime,quality){
 if(typeof canvas.toBlob==='function'){
  try{
   const blob=await new Promise((resolve,reject)=>{
    try{canvas.toBlob(resolve,mime,quality);}catch(e){reject(e);}
   });
   if(blob?.type===mime)return blob;
  }catch{/* Try another supported browser export path. */}
 }
 // Some browsers implement toDataURL but lack toBlob or WebP support.
 if(typeof canvas.toDataURL==='function'){
  try{return blobFromDataUrl(canvas.toDataURL(mime,quality));}catch{/* Next encoder. */}
 }
 return null;
}
async function decodePhoto(file){
 if(typeof createImageBitmap==='function'){
  try{
   const bitmap=await createImageBitmap(file);
   return {width:bitmap.width,height:bitmap.height,source:bitmap,close:()=>bitmap.close?.()};
  }catch{/* Fall back to HTMLImageElement. */}
 }
 if(typeof Image==='undefined'||!URL?.createObjectURL)throw Error('This browser cannot open the photo. Please use an up-to-date browser.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{
   img.onload=resolve;img.onerror=()=>reject(Error('This photo could not be opened. Choose a JPEG or PNG image.'));
   img.src=url;
  });
  return {width:img.naturalWidth,height:img.naturalHeight,source:img,close:()=>{}};
 }finally{URL.revokeObjectURL(url);}
}
export async function compressTeacherPhotoV116(file,{maxEdge=512,maxBytes=250000}={}){
 if(!file||!SOURCE_TYPES.includes(file.type))throw Error('Choose a JPEG, PNG or WebP photo.');
 if(file.size>5*1024*1024)throw Error('Choose a photo under 5 MB.');
 const photo=await decodePhoto(file);
 try{
  if(!photo.width||!photo.height)throw Error('This photo has invalid dimensions.');
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Your browser cannot resize this image. Please use an updated browser.');
  const base=Math.min(1,maxEdge/Math.max(photo.width,photo.height));
  for(const mime of EXPORT_TYPES){
   for(const scale of SCALES){
    canvas.width=Math.max(1,Math.round(photo.width*base*scale));
    canvas.height=Math.max(1,Math.round(photo.height*base*scale));
    // JPEG does not support transparency. Use white behind any source alpha.
    if(mime==='image/jpeg'){
     ctx.fillStyle='#ffffff';
     ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    ctx.drawImage(photo.source,0,0,canvas.width,canvas.height);
    for(const quality of QUALITIES){
     const blob=await encodeCanvas(canvas,mime,quality);
     if(blob?.type!==mime)break; // Unsupported codec (WebP on older browsers).
     if(blob.size>0&&blob.size<=maxBytes){
      const extension=mime==='image/webp'?'webp':'jpg';
      return new File([blob],'teacher-profile.'+extension,{type:mime});
     }
    }
   }
  }
  throw Error('The photo could not be compressed to 250 KB. Please use a simpler JPEG or PNG photo.');
 }finally{photo.close();}
}
export function webpPhotoPathV116(teacherId,mime='image/webp'){
 if(!/^[0-9a-f-]{36}$/i.test(teacherId))throw Error('Teacher account ID is invalid.');
 const extension=mime==='image/webp'?'webp':mime==='image/jpeg'?'jpg':null;
 if(!extension)throw Error('Unsupported processed photo format.');
 return `${teacherId}/${crypto.randomUUID()}.${extension}`;
}
