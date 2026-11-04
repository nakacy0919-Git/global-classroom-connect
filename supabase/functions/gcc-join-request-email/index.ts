// GCC V21.9 — server-only, authenticated transactional mail worker.
// It is invoked by Supabase database scheduling/pg_net, not from the browser.
// Supabase Edge function: deploy with verify_jwt=false; enforce private webhook token here.
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {
 buildHostJoinRequestEmailV219,classifyResendFailureV219,errorCodeV219,idempotencyKeyV219
} from './requestEmailV219.mjs';

const respond=(status,payload)=>new Response(JSON.stringify(payload),{
 status,headers:{'content-type':'application/json','cache-control':'no-store'}
});
async function matchingToken(actual,expected){
 if(!actual||!expected||actual.length<32||expected.length<32)return false;
 const encoder=new TextEncoder();
 const [a,b]=await Promise.all([
  crypto.subtle.digest('SHA-256',encoder.encode(actual)),
  crypto.subtle.digest('SHA-256',encoder.encode(expected))
 ]);
 const aa=new Uint8Array(a),bb=new Uint8Array(b);
 let diff=0;for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];
 return diff===0;
}

Deno.serve(async(req)=>{
 if(req.method!=='POST')return respond(405,{error:'method_not_allowed'});
 const token=req.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1]||'';
 if(!await matchingToken(token,Deno.env.get('GCC_MAIL_WEBHOOK_TOKEN')||''))
  return respond(401,{error:'unauthorized'});

 const url=Deno.env.get('SUPABASE_URL');
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const resendKey=Deno.env.get('RESEND_API_KEY');
 const from=Deno.env.get('GCC_MAIL_FROM');
 if(!url||!serviceKey||!resendKey||!from)
  return respond(503,{error:'email_service_not_configured'});

 const supabase=createClient(url,serviceKey,{
  auth:{autoRefreshToken:false,persistSession:false}
 });
 const {data:jobs,error:claimError}=await supabase.rpc('gcc_v219_claim_request_emails',{p_limit:5});
 if(claimError){
  console.error('gcc_mail_claim_failed',claimError.code||'unknown');
  return respond(503,{error:'claim_failed'});
 }
 let accepted=0,retrying=0,failed=0,finished=0;
 for(const job of jobs||[]){
  let result='failed',failure='unverified_recipient',providerId=null;
  try{
   if(job.recipient_email){
    const email=buildHostJoinRequestEmailV219(from,job.recipient_email);
    const response=await fetch('https://api.resend.com/emails',{
     method:'POST',
     headers:{
      'Authorization':'Bearer '+resendKey,
      'Content-Type':'application/json',
      'Idempotency-Key':idempotencyKeyV219(job.request_id)
     },
     body:JSON.stringify(email),signal:AbortSignal.timeout(12000)
    });
    if(response.ok){
     const json=await response.json();
     providerId=typeof json?.id==='string'?json.id:null;
     result='sent';failure=null;accepted++;
    }else{
     // Never log provider response bodies: some responses could expose addresses.
     const json=await response.json().catch(()=>({}));
     const code=typeof json?.name==='string'?json.name:'';
     failure=errorCodeV219(response.status,code);
     result=classifyResendFailureV219(response.status,code);
    }
   }
  }catch(error){
   result='retry';
   failure=error?.name==='TimeoutError'?'timeout':'network_error';
  }
  if(result==='retry')retrying++;
  if(result==='failed')failed++;
  const {data:ok,error:finishError}=await supabase.rpc('gcc_v219_finish_request_email',{
   p_request_id:job.request_id,p_lease_token:job.lease_token,p_outcome:result,
   p_provider_email_id:providerId,p_failure_code:failure
  });
  if(finishError||!ok){
   console.error('gcc_mail_finish_failed',finishError?.code||'lease_mismatch');
   // The lease will expire: stable Resend idempotency avoids duplicates on retry.
  }else finished++;
 }
 return respond(200,{claimed:(jobs||[]).length,accepted,retrying,failed,finished});
});
