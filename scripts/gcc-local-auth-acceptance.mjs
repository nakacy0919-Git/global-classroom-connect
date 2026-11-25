// Real local GoTrue + Mailpit + PostgREST. No hosted project credentials or external mail.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const auth='http://127.0.0.1:9999',rest='http://127.0.0.1:3400',mail='http://127.0.0.1:8025';
assert.equal(process.env.CI,'true');assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.PGDATABASE,'gcc_auth_ci');assert.equal(process.env.PGHOST,'127.0.0.1');
const email='gcc-teacher@example.com',hostEmail='gcc-host@example.com';
const original='Gcc-CI-Only-Passphrase-01!',updated='Gcc-CI-Only-Passphrase-02!';
const event='ba000000-0000-4000-8000-000000000002';
const school='ba000000-0000-4000-8000-000000000001';
async function json(url,{method='GET',body,token}={}){
 const r=await fetch(url,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000),redirect:'manual'});
 return {ok:r.ok,status:r.status,data:await r.json().catch(()=>null)};
}
function ok(r,label){assert.equal(r.ok,true,label+' status '+r.status);return r.data;}
function no(r,label,message){assert.equal(r.ok,false,label+' unexpectedly succeeded');if(message)assert.equal(r.data?.message,message,label);}
function db(sql){execFileSync('psql',['-X','-v','ON_ERROR_STOP=1','-q','-c',sql],{stdio:['ignore','ignore','pipe']});}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const inbox=()=>json(mail+'/api/v1/messages');
async function confirmLink(recipient,kind,excluded=new Set()){
 for(let i=0;i<35;i++){
  const v=ok(await inbox(),'local mailbox');
  for(const m of v.messages||[]){
   if(excluded.has(m.ID)||!m.To?.some(t=>t.Address.toLowerCase()===recipient))continue;
   const full=ok(await json(mail+'/api/v1/message/'+encodeURIComponent(m.ID)),'local message');
   const sources=[full.HTML||'',full.Text||''].join(' ');
   for(const match of sources.matchAll(/https?:\/\/[^\s<>"']+/g)){
    let u;try{u=new URL(match[0].replaceAll('&amp;','&'));}catch{continue;}
    if(u.origin!==auth||u.pathname!=='/verify'||u.searchParams.get('type')!==kind||!u.searchParams.has('token'))continue;
    excluded.add(m.ID);
    // Never follow redirect to a real web site and never print token or link.
    const verified=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(10000)});
    assert.ok([302,303].includes(verified.status),'verification did not redirect');
    const location=verified.headers.get('location');
    assert.ok(location,'missing redirect');
    const target=new URL(location);
    assert.equal(target.origin,'http://127.0.0.1:3000');
    const hash=new URLSearchParams(target.hash.slice(1));
    assert.equal(hash.has('error'),false,'verification error');
    return hash;
   }
  }
  await sleep(400);
 }
 throw Error('Expected local '+kind+' email not found');
}
const signup=(email,password)=>json(auth+'/signup',{method:'POST',body:{email,password,data:{gcc_registration_source:'global-classroom-connect',role:'host'}}});
const login=(email,password)=>json(auth+'/token?grant_type=password',{method:'POST',body:{email,password}});
const rpc=(name,body,token)=>json(rest+'/rpc/'+name,{method:'POST',body,token});
const identity=token=>rpc('gcc_v238_my_roster_identity',{},token);
const register=(token,schoolName='Test Philippines School')=>rpc('gcc_ci_register',{p_event:event,p_teacher:'Test Teacher',p_school:schoolName,p_country:'PH'},token);
async function main(){
 const seen=new Set();
 ok(await signup(email,original),'teacher signup');
 no(await login(email,original),'unconfirmed login');
 await confirmLink(email,'signup',seen);
 let teacher=ok(await login(email,original),'confirmed login').access_token;
 assert.ok(teacher);
 assert.equal(ok(await identity(teacher),'unapproved own identity'),null);
 no(await rpc('gcc_v238_require_verified',{p_event_id:event},teacher),'metadata host escalation','Host access required');
 ok(await signup(hostEmail,original),'host signup');
 await confirmLink(hostEmail,'signup',seen);
 const host=ok(await login(hostEmail,original),'host login').access_token;
 // Simulate authorized approval in disposable fixture only; Auth user IDs
 // come from GoTrue's own email-confirmed auth.users, never from JWT metadata.
 db(`INSERT INTO public.profiles SELECT id,'host' FROM auth.users WHERE email='${hostEmail}' AND email_confirmed_at IS NOT NULL;
 INSERT INTO public.profiles SELECT id,'teacher' FROM auth.users WHERE email='${email}' AND email_confirmed_at IS NOT NULL;
 INSERT INTO public.teachers(auth_user_id,display_name,school_id,is_active) SELECT id,'Test Teacher','${school}',true FROM auth.users WHERE email='${email}' AND email_confirmed_at IS NOT NULL;`);
 assert.equal(ok(await rpc('gcc_v238_require_verified',{p_event_id:event},host),'approved host policy'),true);
 no(await register(null),'anonymous protected registration','GCC_VERIFIED_TEACHER_REQUIRED');
 const own=ok(await identity(teacher),'approved teacher identity');
 assert.deepEqual(own,{teacher:'Test Teacher',school:'Test Philippines School',country_code:'PH',country_name:'Philippines'});
 no(await register(teacher,'Other School'),'wrong school','GCC_ROSTER_IDENTITY_MISMATCH');
 ok(await register(teacher),'approved registration');
 db(`UPDATE public.schools SET is_active=false WHERE id='${school}';`);
 assert.equal(ok(await identity(teacher),'inactive school identity'),null);
 no(await register(teacher),'inactive school with existing JWT','GCC_VERIFIED_TEACHER_REQUIRED');
 db(`UPDATE public.schools SET is_active=true WHERE id='${school}';`);
 // Real recovery email through local SMTP, no real mailbox.
 ok(await json(auth+'/recover',{method:'POST',body:{email}}),'password recovery request');
 const recovery=await confirmLink(email,'recovery',seen);
 const recoveryToken=recovery.get('access_token');
 assert.ok(recoveryToken,'recovery access token absent');
 ok(await json(auth+'/user',{method:'PUT',body:{password:updated},token:recoveryToken}),'password update');
 no(await login(email,original),'old password');
 teacher=ok(await login(email,updated),'new password login').access_token;
 assert.equal(ok(await identity(teacher),'identity after recovery').school,'Test Philippines School');
 const direct=await json(rest+'/gcc_session_signups?select=id',{token:teacher});
 no(direct,'direct roster read');
 console.log('PASS: actual local Auth signup, confirmation SMTP, login, metadata escalation denial, teacher-school gate, live deactivation, recovery email and password change');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
