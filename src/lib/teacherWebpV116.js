// WebP conversion happens in the browser, before upload. Images are not sent to third parties.
export const TEACHER_WEBP_MAX_BYTES_V116=300000;
export async function compressTeacherPhotoV116(file,{maxEdge=512,maxBytes=250000}={}) {
  if(!file || !['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPEG, PNG or WebP photo.');
  if(file.size>5*1024*1024)throw Error('Choose a photo under 5 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    const ratio=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));
    const width=Math.max(1,Math.round(bitmap.width*ratio));
    const height=Math.max(1,Math.round(bitmap.height*ratio));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Your browser cannot resize this image.');
    ctx.drawImage(bitmap,0,0,width,height);
    for(const quality of [.78,.67,.55,.42,.30]){
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
      if(!blob||blob.type!=='image/webp')throw Error('This browser does not support WebP export.');
      if(blob.size<=maxBytes)return new File([blob],'teacher-profile.webp',{type:'image/webp'});
    }
    throw Error('This photo could not be reduced enough. Choose a simpler image.');
  }finally{bitmap.close?.();}
}
export function webpPhotoPathV116(teacherId){
  if(!/^[0-9a-f-]{36}$/i.test(teacherId))throw Error('Teacher account ID is invalid.');
  return `${teacherId}/${crypto.randomUUID()}.webp`;
}
