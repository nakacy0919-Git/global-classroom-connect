import {supabase} from './supabase.js';
import {compressTeacherPhotoV116,webpPhotoPathV116} from '../lib/teacherWebpV116.js';
const api=()=>{if(!supabase)throw Error('Global Classroom database connection is unavailable.');return supabase;};
const rpc=async(name,args={})=>{const {data,error}=await api().rpc(name,args);if(error)throw error;return data;};
export async function signupAccountV120(email,password){
 const {data,error}=await api().auth.signUp({email:email.trim().toLowerCase(),password});if(error)throw error;return data;
}
export async function signinAccountV120(email,password){
 const {data,error}=await api().auth.signInWithPassword({email:email.trim().toLowerCase(),password});if(error)throw error;return data;
}
export async function currentUserV120(){const {data,error}=await api().auth.getUser();if(error)return null;return data?.user||null;}
export const beginApplicationV120=()=>rpc('gcc_v120_begin_application');
export const submitApplicationV120=(form,path)=>rpc('gcc_v120_submit_application',{p_data:form,p_photo_path:path});
export const pendingApprovalsV120=()=>rpc('gcc_v120_admin_applications');
export const signupOverviewV134=()=>rpc('gcc_v134_signup_overview');
export const reviewApplicationV120=(id,decision,grantHost,schoolId=null)=>rpc('gcc_v120_review_application',{
 p_id:id,p_decision:decision,p_grant_host:grantHost,p_existing_school_id:schoolId
});
export async function uploadApplicationPhotoV120(teacherId,file){
 const webp=await compressTeacherPhotoV116(file,{maxEdge:512,maxBytes:250000});
 const path=webpPhotoPathV116(teacherId);
 const {error}=await api().storage.from('teacher-photos').upload(path,webp,{contentType:'image/webp',cacheControl:'3600',upsert:false});
 if(error)throw error;return {path,bytes:webp.size};
}
export async function previewApplicationPhotoV120(path){
 if(!path)return null;
 const {data,error}=await api().storage.from('teacher-photos').createSignedUrl(path,300);
 if(error)throw error;return data.signedUrl;
}
export async function hasApprovedTeacherV120(){
 const {error}=await api().rpc('gcc_teacher_identity');return !error;
}
