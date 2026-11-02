import {supabase} from './supabase.js';
import {prepareFlyerOnceV207,describeFlyerV207} from '../lib/flyerWebpV207.js';
export const prepareSessionFlyerV207=prepareFlyerOnceV207;
export const describeSessionFlyerV207=describeFlyerV207;
export async function uploadSessionFlyerV203(file){
 if(!file)return '';
 if(!supabase)throw Error('GCC is not connected to Supabase.');
 const {data:auth,error:authError}=await supabase.auth.getUser();
 if(authError||!auth?.user?.id)throw Error('Sign in as a teacher or host to upload a flyer.');
 const compressed=await prepareSessionFlyerV207(file);
 // Never use the original File in Storage.upload().
 if(compressed.blob.type!=='image/webp'||compressed.compressedBytes>800*1024)
  throw Error('Cannot upload this flyer without WebP compression.');
 const key=auth.user.id+'/'+crypto.randomUUID()+'.webp';
 const {error}=await supabase.storage.from('gcc-session-flyers').upload(
  key,compressed.blob,{contentType:'image/webp',upsert:false,cacheControl:'3600'}
 );
 if(error)throw Error('Flyer upload failed: '+error.message);
 const {data}=supabase.storage.from('gcc-session-flyers').getPublicUrl(key);
 return data?.publicUrl||'';
}
export async function saveHostPlanV203(eventId,plan){
 if(!supabase)throw Error('Supabase is not configured.');
 const {data,error}=await supabase.rpc('gcc_v203_save_event_plan',{p_event_id:eventId,p_plan:plan});
 if(error)throw error;return data;
}
