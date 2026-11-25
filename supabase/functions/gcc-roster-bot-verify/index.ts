import {createBotVerifierV239} from './verifyV239.mjs';
// Public challenge endpoint: the provider validation is the authorization.
// Deploy this function only with explicit operator review, no JWT gate, and exact origins.
const allowedOrigins=(Deno.env.get('GCC_ROSTER_ALLOWED_ORIGINS')||'').split(',').map(x=>x.trim()).filter(x=>{
 try{const u=new URL(x);return u.protocol==='https:'&&u.origin===x;}catch{return false;}
});
const url=Deno.env.get('SUPABASE_URL')||'';
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const issueReceipt=url&&key?async(eventId:string,hash:string)=>{
 const response=await fetch(new URL('/rest/v1/rpc/gcc_v239_issue_bot_receipt',url),{
  method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({p_event_id:eventId,p_challenge_hash:hash}),redirect:'error',signal:AbortSignal.timeout(5000)
 });
 if(!response.ok)throw Error('Receipt issuance failed');
 return await response.json();
}:null;
Deno.serve(createBotVerifierV239({allowedOrigins,secret:Deno.env.get('GCC_ROSTER_TURNSTILE_SECRET')||'',issueReceipt}));
