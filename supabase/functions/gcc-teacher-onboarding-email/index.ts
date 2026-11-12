// GCC V22.0 — private teacher-onboarding email worker.
// Called only by Supabase cron/pg_net using a private Vault bearer token.
// Recipient addresses are fetched from Supabase Auth in a privileged RPC.
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';

const REVIEW_URL='https://gcc.pic-speak-story.com/#/teacher-approvals';
const TEACHER_LOGIN_URL='https://gcc.pic-speak-story.com/#/teacher-access';
const respond=(status,payload)=>new Response(JSON.stringify(payload),{
  status,headers:{'content-type':'application/json','cache-control':'no-store'}
});
const emailValid=s=>typeof s==='string'&&s.length<=254&&
  /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(s);
const safeLine=s=>String(s??'').replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,180);
const senderValid=s=>{
  const raw=String(s??'').trim();
  if(/[\r\n]/.test(raw))return false;
  const email=raw.match(/<([^<>]+)>\s*$/)?.[1]||raw;
  return emailValid(email);
};
async function tokenMatches(actual,expected){
  if(!actual||!expected||actual.length<32||expected.length<32)return false;
  const encoder=new TextEncoder();
  const [x,y]=await Promise.all([
    crypto.subtle.digest('SHA-256',encoder.encode(actual)),
    crypto.subtle.digest('SHA-256',encoder.encode(expected))
  ]);
  const a=new Uint8Array(x),b=new Uint8Array(y);
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
  return diff===0;
}
function buildEmail(from,job){
  if(!senderValid(from)||!emailValid(job.recipient_email))throw Error('invalid_sender_or_recipient');
  const name=safeLine(job.teacher_name)||'Teacher';
  const school=safeLine(job.school_name)||'Not specified';
  if(job.event_type==='admin_new_application'){
    if(!emailValid(job.applicant_email))throw Error('invalid_applicant_email');
    return {
      from,to:[job.recipient_email],
      subject:'GCC | New teacher registration awaiting approval',
      text:[
        'A new teacher has submitted an application to Global Classroom Connect.',
        '',
        'Teacher: '+name,
        'School / organization: '+school,
        'Country: '+(safeLine(job.country_name)||'Not specified'),
        'Email: '+job.applicant_email,
        '',
        'Review the application in the GCC administrator dashboard:',
        REVIEW_URL,
        '',
        'The teacher will not receive approved access until an administrator reviews the application.',
        '',
        'Global Classroom Connect',
        'Automated notification — please do not reply.'
      ].join('\n')
    };
  }
  if(job.event_type==='teacher_approved'){
    return {
      from,to:[job.recipient_email],
      subject:'Global Classroom Connect | Your teacher registration is approved',
      text:[
        'Dear '+name+',',
        '',
        'Welcome to Global Classroom Connect!',
        '',
        'Your teacher registration has been approved. You can now sign in using the email address and password you created.',
        '',
        'Sign in to Global Classroom Connect:',
        TEACHER_LOGIN_URL,
        '',
        'Once signed in, you can explore international exchange opportunities, connect with other teachers, and participate in Global Classroom sessions.',
        '',
        'School / organization: '+school,
        '',
        'Thank you for joining our global community. We look forward to connecting our classrooms!',
        '',
        'Best regards,',
        'Global Classroom Connect Team',
        '',
        'This is an automated email. Please do not reply.'
      ].join('\n')
    };
  }
  throw Error('invalid_email_event');
}
function errorCode(status,name){
  return 'http_'+status+'_'+String(name||'unknown').toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,35);
}
function classify(status,name){
  return status===408||status===425||status===429||status>=500||
    (status===409&&name==='concurrent_idempotent_requests')?'retry':'failed';
}
async function submitEmail(apiKey,body,idempotency){
  return fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{'Authorization':'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':idempotency},
    body:JSON.stringify(body),signal:AbortSignal.timeout(12000)
  });
}
Deno.serve(async(req)=>{
  if(req.method!=='POST')return respond(405,{error:'method_not_allowed'});
  const token=req.headers.get('Authorization')?.match(/^Bearer ([^\s]+)$/)?.[1]||'';
  if(!await tokenMatches(token,Deno.env.get('GCC_MAIL_WEBHOOK_TOKEN')||''))
    return respond(401,{error:'unauthorized'});
  const url=Deno.env.get('SUPABASE_URL');
  const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey=Deno.env.get('RESEND_API_KEY');
  const from=Deno.env.get('GCC_MAIL_FROM');
  if(!url||!serviceKey||!resendKey||!senderValid(from))
    return respond(503,{error:'email_service_not_configured'});

  const payload=await req.json().catch(()=>({}));
  // Test only the provider transport; never send test messages to real users.
  if(payload?.event==='provider_test'){
    try{
      const r=await submitEmail(resendKey,{
        from,to:['delivered@resend.dev'],subject:'GCC teacher email provider test',
        text:'Synthetic Global Classroom Connect teacher onboarding mail test. No teacher data.'
      },'gcc-v220-test-'+new Date().toISOString().slice(0,10));
      if(r.ok)return respond(200,{provider_test:'accepted',recipient:'resend_test_sink'});
      const e=await r.json().catch(()=>({}));
      return respond(502,{provider_test:'rejected',provider_status:r.status,code:errorCode(r.status,e?.name)});
    }catch(e){return respond(503,{provider_test:'unreachable',code:e?.name==='TimeoutError'?'timeout':'network_error'});}
  }
  if(payload?.event!=='process')return respond(400,{error:'invalid_event'});

  const db=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:jobs,error:claimError}=await db.rpc('gcc_v220_claim_teacher_emails',{p_limit:5});
  if(claimError){
    console.error('gcc_v220_claim_failed',claimError.code||'unknown');
    return respond(503,{error:'claim_failed'});
  }
  let accepted=0,retrying=0,failed=0,finished=0;
  for(const job of jobs||[]){
    let result='failed',failure='invalid_recipient',providerId=null;
    try{
      const email=buildEmail(from,job);
      const response=await submitEmail(resendKey,email,'gcc-teacher-onboarding-'+job.job_id);
      if(response.ok){
        const data=await response.json().catch(()=>({}));
        providerId=typeof data.id==='string'?data.id:null;
        result='sent';failure=null;accepted++;
      }else{
        const e=await response.json().catch(()=>({}));
        const name=String(e?.name||'');
        result=classify(response.status,name);
        failure=errorCode(response.status,name);
      }
    }catch(e){
      const message=String(e?.message||'');
      if(message==='invalid_sender_or_recipient'||message==='invalid_applicant_email'||message==='invalid_email_event'){
        result='failed';failure=message;
      }else{result='retry';failure=e?.name==='TimeoutError'?'timeout':'network_error';}
    }
    if(result==='failed')failed++;
    if(result==='retry')retrying++;
    const {data:ok,error:finishError}=await db.rpc('gcc_v220_finish_teacher_email',{
      p_job_id:job.job_id,p_lease_id:job.lease_id,
      p_outcome:result,p_provider_email_id:providerId,p_failure_code:failure
    });
    if(finishError||!ok)console.error('gcc_v220_finish_failed',finishError?.code||'lease_mismatch');
    else finished++;
  }
  return respond(200,{claimed:(jobs||[]).length,accepted,retrying,failed,finished});
});