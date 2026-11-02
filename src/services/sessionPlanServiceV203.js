import {supabase} from './supabase.js';
export async function uploadSessionFlyerV203(file){
 if(!file||!file.size)return '';
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3145728)
  throw Error('Flyer must be a JPG, PNG or WebP no larger than 3 MB.');
 if(!supabase)throw Error('GCC is not connected to Supabase.');
 const {data:auth,error:authError}=await supabase.auth.getUser();
 if(authError||!auth?.user?.id)throw Error('Sign in as a teacher or host to upload a flyer.');
 const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
 const key=auth.user.id+'/'+crypto.randomUUID()+'.'+ext;
 const {error}=await supabase.storage.from('gcc-session-flyers').upload(key,file,{contentType:file.type,upsert:false,cacheControl:'3600'});
 if(error)throw Error('Flyer upload failed: '+error.message);
 const {data}=supabase.storage.from('gcc-session-flyers').getPublicUrl(key);
 return data?.publicUrl||'';
}
export async function saveHostPlanV203(eventId,plan){
 if(!supabase)throw Error('Supabase is not configured.');
 const {data,error}=await supabase.rpc('gcc_v203_save_event_plan',{p_event_id:eventId,p_plan:plan});
 if(error)throw error;return data;
}
