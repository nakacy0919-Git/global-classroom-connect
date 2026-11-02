// GCC V20.7 — compress flyer images on the user's device, *before* any network upload.
// JPEG/PNG/WebP originals are never sent to Storage. The only output is image/webp.
// Images may be larger before conversion; server limits apply to the final WebP blob.
export const FLYER_ALLOWED_MIME_V207=Object.freeze(['image/jpeg','image/png','image/webp']);
export const FLYER_SOURCE_MAX_V207=24*1024*1024; // source file, before compression
export const FLYER_PIXELS_MAX_V207=32_000_000; // avoid decoding extreme images on tablets
export const FLYER_EDGE_MAX_V207=1800;
export const FLYER_TARGET_BYTES_V207=500*1024; // soft goal
export const FLYER_MAX_BYTES_V207=800*1024; // hard upload limit

export function flyerDimensionsV207(width,height,maxEdge=FLYER_EDGE_MAX_V207){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||
   width*height>FLYER_PIXELS_MAX_V207)throw Error('Flyer dimensions are too large. Please use an image up to 32 megapixels.');
 const factor=Math.min(1,maxEdge/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*factor)),height:Math.max(1,Math.round(height*factor))};
}
export function validateFlyerSourceV207(file){
 if(!file||!Number.isFinite(file.size)||file.size<=0)throw Error('Select a valid flyer image.');
 if(!FLYER_ALLOWED_MIME_V207.includes(file.type))throw Error('Choose a JPEG, PNG or WebP image.');
 if(file.size>FLYER_SOURCE_MAX_V207)throw Error('The original flyer is over 24 MB. Reduce its size before uploading.');
 return file;
}
export function flyerSizeLabelV207(bytes){
 if(!Number.isFinite(bytes)||bytes<0)return '0 KB';
 return bytes>=1024*1024?(bytes/1048576).toFixed(1)+' MB':Math.max(1,Math.ceil(bytes/1024))+' KB';
}
async function loadFlyerImageV207(file){
 // createImageBitmap honors EXIF orientation in modern Safari/Chrome. <img> provides
 // a fallback for Safari versions without createImageBitmap.
 if(typeof createImageBitmap==='function'){
  try{
   const bitmap=await createImageBitmap(file);
   return {image:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close?.()};
  }catch{/* decode with HTMLImageElement below; never upload uncompressed */}
 }
 if(typeof Image!=='function'||typeof URL?.createObjectURL!=='function')
  throw Error('Your browser cannot process this image. Try the latest Safari or Chrome.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{
   image.onload=resolve;image.onerror=()=>reject(Error('This flyer image cannot be decoded.'));
   image.src=url;
  });
  return {image,width:image.naturalWidth,height:image.naturalHeight,close:()=>{}};
 }finally{URL.revokeObjectURL(url);}
}
async function encodeFlyerV207(image,width,height,quality){
 if(typeof document==='undefined'||!document.createElement)
  throw Error('Image conversion needs a browser with Canvas support.');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d',{alpha:true});
 if(!context)throw Error('Image conversion is unavailable in this browser.');
 context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
 try{
  context.drawImage(image,0,0,width,height);
  const blob=await new Promise((resolve,reject)=>{
   canvas.toBlob(data=>data?resolve(data):reject(Error('Could not encode WebP. Update Safari or Chrome.')),'image/webp',quality);
  });
  // Some browsers silently fall back to PNG when WebP encoding is unsupported.
  if(blob.type!=='image/webp')throw Error('This browser does not support WebP export. Update Safari or Chrome.');
  return blob;
 }finally{
  // Release pixel memory quickly on iPad, even after encoding failure.
  canvas.width=0;canvas.height=0;
 }
}
export async function optimizeFlyerV207(file,{decode=loadFlyerImageV207,encode=encodeFlyerV207}={}){
 validateFlyerSourceV207(file);
 let source;
 try{
  source=await decode(file);
  const dimensions=flyerDimensionsV207(source.width,source.height);
  // First preserve readable flyer text. Only reduce resolution further if needed.
  const attempts=[
   [1,.83],[1,.75],[1,.66],[.88,.76],[.82,.68],[.72,.65],[.60,.58],[.52,.55]
  ];
  let smallest=null;
  for(const [fraction,quality] of attempts){
   const width=Math.max(1,Math.round(dimensions.width*fraction));
   const height=Math.max(1,Math.round(dimensions.height*fraction));
   const blob=await encode(source.image,width,height,quality);
   if(!blob||blob.type!=='image/webp'||!Number.isFinite(blob.size)||blob.size<1)
    throw Error('WebP conversion did not produce a valid image.');
   if(!smallest||blob.size<smallest.blob.size)smallest={blob,width,height,quality};
   if(blob.size<=FLYER_TARGET_BYTES_V207 &&
    (file.size<110*1024||blob.size<=file.size*.97))break;
  }
  if(!smallest||smallest.blob.size>FLYER_MAX_BYTES_V207)
   throw Error('This flyer is too complex to compress below 800 KB. Please simplify the image and try again.');
  return {
   blob:smallest.blob,mime:'image/webp',originalBytes:file.size,
   compressedBytes:smallest.blob.size,width:smallest.width,height:smallest.height,
   reductionPercent:Math.round((1-smallest.blob.size/file.size)*100)
  };
 }catch(error){
  if(error instanceof Error)throw error;
  throw Error('Flyer conversion failed. Please choose another JPEG, PNG or WebP image.');
 }finally{source?.close?.();}
}

// Shared by the upload service and the local preview: compress a selected File once.
const cachedFlyersV207=new WeakMap();
export function prepareFlyerOnceV207(file){
 if(!file)return Promise.reject(Error('Choose a flyer image.'));
 let task=cachedFlyersV207.get(file);
 if(!task){
  task=optimizeFlyerV207(file).catch(error=>{
   cachedFlyersV207.delete(file);
   throw error;
  });
  cachedFlyersV207.set(file,task);
 }
 return task;
}
export function describeFlyerV207(result){
 const saved=Math.max(0,result.reductionPercent);
 return 'WebP ready: '+flyerSizeLabelV207(result.originalBytes)+' → '+
  flyerSizeLabelV207(result.compressedBytes)+' ('+saved+'% smaller) · '+
  result.width+' × '+result.height+' px';
}
