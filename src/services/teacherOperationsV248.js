import {supabase} from './supabase.js';
export async function teacherOperationsV248(offerId,action='read',data={}){
 if(!supabase)throw Error('Supabase is not configured.');
 const {data:result,error}=await supabase.rpc('gcc_v248_session_operations',{p_offer_id:offerId,p_action:action,p_data:data});
 if(error)throw error;
 return result;
}
