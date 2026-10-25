import {supabase} from './supabase.js';
import {compressTeacherPhotoV116,webpPhotoPathV116} from '../lib/teacherWebpV116.js';
const client=()=>{if(!supabase)throw Error('Supabase is not configured.');return supabase;};
async function rpc(name,args={}){const {data,error}=await client().rpc(name,args);if(error)throw error;return data;}
export const myTeacherProfileV116=()=>rpc('gcc_v116_my_profile');
export const teacherDirectoryV116=()=>rpc('gcc_v117_teacher_directory');
export const saveTeacherProfileV116=profile=>rpc('gcc_v116_save_my_profile',{
  p_name:profile.name,p_job_title:profile.jobTitle,p_bio:profile.bio,
  p_languages:profile.languages,p_visible:profile.visible
});
export async function signedTeacherPhotoV116(path){
 if(!path)return null;
 const {data,error}=await client().storage.from('teacher-photos').createSignedUrl(path,600);
 if(error)throw error;return data?.signedUrl||null;
}
export async function uploadMyTeacherPhotoV116(teacherId,file){
 const webp=await compressTeacherPhotoV116(file);
 const path=webpPhotoPathV116(teacherId);
 const {error}=await client().storage.from('teacher-photos').upload(path,webp,{contentType:'image/webp',cacheControl:'3600',upsert:false});
 if(error)throw error;
 await rpc('gcc_v116_save_my_photo',{p_path:path});
 return {path,bytes:webp.size};
}
