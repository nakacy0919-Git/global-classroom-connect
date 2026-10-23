import {supabase} from './supabase.js';

async function runRpc(name,params){
 if(!supabase)throw Error('Supabase is not configured.');
 const {data,error}=await supabase.rpc(name,params);
 if(error)throw error;
 return data;
}
export const getRoomShareStatus=(eventId)=>runRpc('gcc_v102_host_share_status',{p_event_id:eventId});
export const publishRoomShare=(eventId,revision,zoomUrl)=>runRpc('gcc_v102_publish_room_plan',{
 p_event_id:eventId,p_expected_revision:revision,p_zoom_url:zoomUrl,
});
export const revokeRoomShare=(eventId)=>runRpc('gcc_v102_revoke_room_plan',{p_event_id:eventId});
export const findMyRoom=(token,name,school)=>runRpc('gcc_v102_find_my_room',{
 p_token:token,p_student_name:name,p_school_name:school,
});
