import {supabase} from './supabase.js';

async function runRpc(name,params){
 if(!supabase)throw Error('Supabase is not configured.');
 const {data,error}=await supabase.rpc(name,params);
 if(error)throw error;
 return data;
}
// Host publication from V10.2 is preserved and still guarded server-side.
export const getRoomShareStatus=(eventId)=>runRpc('gcc_v102_host_share_status',{p_event_id:eventId});
export const publishRoomShare=(eventId,revision,zoomUrl)=>runRpc('gcc_v102_publish_room_plan',{
 p_event_id:eventId,p_expected_revision:revision,p_zoom_url:zoomUrl,
});
export const revokeRoomShare=(eventId)=>runRpc('gcc_v102_revoke_room_plan',{p_event_id:eventId});
// GCC V10.4: a single code for the entire published session. Never list raw registrations publicly.
export const getSharedCodeStatus=eventId=>runRpc('gcc_v104_code_status',{p_event_id:eventId});
export const issueSharedCode=eventId=>runRpc('gcc_v104_issue_shared_code',{p_event_id:eventId});
export const disableSharedCode=eventId=>runRpc('gcc_v104_disable_shared_code',{p_event_id:eventId});
export const openSharedRoomChart=(token,code)=>runRpc('gcc_v104_open_room_chart',{
 p_token:token,p_access_code:code,
});
