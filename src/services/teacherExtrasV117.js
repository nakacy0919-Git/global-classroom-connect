import {supabase} from './supabase.js';
const rpc=async(name,args={})=>{if(!supabase)throw Error('GCC is not connected.');const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data;};
export const myDetailsV117=()=>rpc('gcc_v117_my_details');
export const saveSocialV117=links=>rpc('gcc_v117_save_socials',{p_website:links.website||null,p_instagram:links.instagram||null,p_facebook:links.facebook||null,p_other:links.other||null});
export const saveVolunteerV117=state=>rpc('gcc_v117_save_volunteer',{p_facilitator:!!state.facilitator,p_host:!!state.host,p_note:state.note||''});
export const volunteersForHostV117=()=>rpc('gcc_v117_host_volunteers');
