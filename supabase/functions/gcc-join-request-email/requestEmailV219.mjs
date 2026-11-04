// Shared, pure email policy for GCC V21.9 (testable in Node and Supabase Deno).
export const REVIEW_URL_V219='https://gcc.pic-speak-story.com/#/teacher-portal?view=requests';
export const NOTIFICATION_SUBJECT_V219='GCC | New session join request';
export function buildHostJoinRequestEmailV219(from,to){
 const addr=String(to??'').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr))throw Error('unverified_recipient_email');
 if(!String(from??'').includes('@')||/[\r\n]/.test(from))throw Error('invalid_verified_sender');
 const message='A teacher has requested to join a session you host on Global Classroom Connect.\n\n'+
   'Please sign in to GCC and open Join Requests to review the school, country, student ages and number of participating students.\n\n'+
   REVIEW_URL_V219+'\n\nThis is an automated notification. Do not reply to this email.';
 return {
  from:String(from).trim(),to:[addr],subject:NOTIFICATION_SUBJECT_V219,text:message
 };
}
export function classifyResendFailureV219(status,code=''){
 if(status===429||status===408||status===425||status>=500||
  (status===409&&code==='concurrent_idempotent_requests'))
  return 'retry';
 return 'failed';
}
export function errorCodeV219(status,code=''){
 const norm=String(code||'unknown').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,32);
 return 'http_'+String(status)+'_'+norm;
}
export function idempotencyKeyV219(requestId){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))
  throw Error('invalid_request_id');
 return 'gcc-join-request-'+requestId.toLowerCase();
}
