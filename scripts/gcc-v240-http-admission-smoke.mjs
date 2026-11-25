// Disposable PostgREST HTTP integration; real staged gates, synthetic legacy RPC.
import assert from 'node:assert/strict';
import {createHmac,createHash,randomUUID} from 'node:crypto';
const origin=process.env.GCC_TEST_POSTGREST_URL;
const secret=process.env.GCC_TEST_JWT_SECRET;
assert.equal(origin,'http://127.0.0.1:3400','CI loopback only');
assert.ok(secret?.startsWith('gcc-ephemeral-postgrest-ci-only-'),'Disposable JWT only');
function jwt(role,sub){
 const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const now=Math.floor(Date.now()/1000),a=enc({alg:'HS256',typ:'JWT'}),b=enc({role,sub,iat:now,exp:now+600});
 return a+'.'+b+'.'+createHmac('sha256',secret).update(a+'.'+b).digest('base64url');
}
const teacher=jwt('authenticated','10000000-0000-4000-8000-000000000002');
const host=jwt('authenticated','10000000-0000-4000-8000-000000000001');
const stranger=jwt('authenticated','90000000-0000-4000-8000-000000000001');
const service=jwt('service_role','90000000-0000-4000-8000-000000000002');
const event=n=>'a5000000-0000-4000-8000-00000000000'+n;
async function rpc(name,args,token){
 const r=await fetch(origin+'/rpc/'+name,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});
 return {ok:r.ok,status:r.status,value:await r.json().catch(()=>null)};
}
function accepted(r,label){assert.equal(r.ok,true,label+' HTTP '+r.status+' '+(r.value?.message||''));return r.value;}
function denied(r,label,message){assert.equal(r.ok,false,label+' unexpectedly succeeded');if(message)assert.equal(r.value?.message,message,label);return r;}
const args=n=>({p_event_id:event(n),p_teacher_name:'Guest Teacher',p_school_name:'Test Philippines School',p_country_code:'PH',p_country_name:'Philippines',p_students:[{name:'Synthetic Student'}],p_facilitators:[],p_pairs:[]});
const hash=()=>createHash('sha256').update(randomUUID()).digest('hex');
async function receipt(n){
 const challenge=hash();
 const body={p_event_id:event(n),p_challenge_hash:challenge};
 const value=accepted(await rpc('gcc_v239_issue_bot_receipt',body,service),'service issuer');
 assert.match(value,/^[a-f0-9]{64}$/);
 denied(await rpc('gcc_v239_issue_bot_receipt',body,service),'repeated provider digest');
 return value;
}
async function main(){
 for(let n=1;n<=6;n++){
  assert.equal(accepted(await rpc('gcc_v239_bot_policy',{p_event_id:event(n)}),'bot policy'),[2,5,6].includes(n));
  assert.equal(accepted(await rpc('gcc_v238_roster_policy',{p_event_id:event(n)}),'identity policy'),[4,5].includes(n));
 }
 for(const token of [null,teacher,stranger]){
  denied(await rpc('gcc_v239_issue_bot_receipt',{p_event_id:event(2),p_challenge_hash:hash()},token),'client receipt issuance');
  denied(await rpc('gcc_v237_issue_invite',{p_event_id:event(1)},token),'non-host invitation issuance');
  denied(await rpc('gcc_v238_require_verified',{p_event_id:event(1)},token),'non-host policy change');
 }
 assert.equal(accepted(await rpc('gcc_v237_invite_status',{p_event_id:event(3)},host),'host invite status'),true);
 assert.equal(accepted(await rpc('gcc_v238_my_roster_identity',{},teacher),'own identity').school,'Test Philippines School');
 assert.equal(accepted(await rpc('gcc_v238_my_roster_identity',{},stranger),'unlinked identity'),null);
 accepted(await rpc('gcc_v165_submit_roster',args(1)),'ordinary open registration');
 denied(await rpc('gcc_v165_submit_roster',args(2)),'bot legacy route','GCC_BOT_REQUIRED');
 const r2=await receipt(2);
 accepted(await rpc('gcc_v239_submit_protected_roster',{...args(2),p_receipt:r2,p_invite:''}),'bot-only registration');
 denied(await rpc('gcc_v239_submit_protected_roster',{...args(2),p_receipt:r2,p_invite:''}),'used receipt','GCC_BOT_INVALID');
 denied(await rpc('gcc_v165_submit_roster',args(3)),'invite legacy route','GCC_INVITE_REQUIRED');
 accepted(await rpc('gcc_v237_submit_invited_roster',{...args(3),p_invite:'d'.repeat(64)}),'invite only');
 denied(await rpc('gcc_v165_submit_roster',args(4)),'anonymous verified event','GCC_VERIFIED_TEACHER_REQUIRED');
 denied(await rpc('gcc_v165_submit_roster',{...args(4),p_school_name:'Other School'},teacher),'wrong school','GCC_ROSTER_IDENTITY_MISMATCH');
 accepted(await rpc('gcc_v165_submit_roster',args(4),teacher),'verified only');
 const r5=await receipt(5);
 const protectedArgs={...args(5),p_receipt:r5,p_invite:'e'.repeat(64)};
 denied(await rpc('gcc_v239_submit_protected_roster',{...protectedArgs,p_event_id:event(2)},teacher),'wrong event receipt','GCC_BOT_INVALID');
 denied(await rpc('gcc_v239_submit_protected_roster',protectedArgs),'all gates, anonymous','GCC_VERIFIED_TEACHER_REQUIRED');
 denied(await rpc('gcc_v239_submit_protected_roster',{...protectedArgs,p_school_name:'Wrong School'},teacher),'all gates, wrong school','GCC_ROSTER_IDENTITY_MISMATCH');
 denied(await rpc('gcc_v239_submit_protected_roster',{...protectedArgs,p_pairs:[1]},teacher),'all gates, rollback','Synthetic pair validation failure');
 // Two independent HTTP transactions race for the same receipt/invitation.
 const race=await Promise.all([rpc('gcc_v239_submit_protected_roster',protectedArgs,teacher),rpc('gcc_v239_submit_protected_roster',protectedArgs,teacher)]);
 assert.equal(race.filter(x=>x.ok).length,1,'exactly one concurrent redemption');
 denied(race.find(x=>!x.ok),'concurrent replay','GCC_BOT_INVALID');
 const two=await Promise.all([receipt(6),receipt(6)]);
 const limited=await Promise.all(two.map(p_receipt=>rpc('gcc_v239_submit_protected_roster',{...args(6),p_receipt,p_invite:''})));
 assert.equal(limited.filter(x=>x.ok).length,1,'one admitted under event cap');
 denied(limited.find(x=>!x.ok),'concurrent limit','GCC_ROSTER_BUSY');
 for(const token of [null,teacher]){
  const res=await fetch(origin+'/gcc_session_signups?select=id',{headers:token?{authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(10000)});
  assert.equal(res.ok,false,'direct roster read must be denied');
 }
 console.log('PASS: HTTP six event policies, service-only issuance, anonymous/host/teacher/stranger boundaries, rollback, concurrent redemption and event cap');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
