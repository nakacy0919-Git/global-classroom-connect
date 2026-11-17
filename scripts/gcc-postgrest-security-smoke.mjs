// Disposable PostgREST/PG17 HTTP authorization check. No real Supabase keys or accounts.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';

const origin=process.env.GCC_TEST_POSTGREST_URL||'http://127.0.0.1:3400';
const secret=process.env.GCC_TEST_JWT_SECRET||'gcc-ephemeral-postgrest-ci-only-secret-2026';
const base64=data=>Buffer.from(JSON.stringify(data)).toString('base64url');
function jwt(sub){
 const now=Math.floor(Date.now()/1000);
 const a=base64({alg:'HS256',typ:'JWT'});
 const b=base64({role:'authenticated',sub,iat:now,exp:now+600});
 const sig=createHmac('sha256',secret).update(a+'.'+b).digest('base64url');
 return a+'.'+b+'.'+sig;
}
const account={
 host:'10000000-0000-4000-8000-000000000001',
 teacher:'10000000-0000-4000-8000-000000000002',
 stranger:'90000000-0000-4000-8000-000000000001'
};
async function request(name,body={},token=null){
 const abort=new AbortController();
 const timer=setTimeout(()=>abort.abort(),7000);
 try{
  const res=await fetch(origin+'/rpc/'+name,{
   method:'POST',headers:{
    'content-type':'application/json',
    ...(token?{authorization:'Bearer '+token}:{})
   },
   body:JSON.stringify(body),signal:abort.signal
  });
  const value=await res.json().catch(()=>null);
  return {status:res.status,ok:res.ok,value};
 }finally{clearTimeout(timer)}
}
async function assertRejected(name,token){
 const r=await request(name,{},token);
 assert.equal(r.ok,false,name+' unexpectedly callable: '+JSON.stringify(r.value).slice(0,250));
 assert.equal(Object.hasOwn(r.value||{},'items'),false,'Private session data returned on rejected request');
 assert.equal(Object.hasOwn(r.value||{},'stats'),false,'Admin stats returned on rejected request');
}
async function main(){
 const hostJwt=jwt(account.host),teacherJwt=jwt(account.teacher),strangerJwt=jwt(account.stranger);
 await assertRejected('gcc_v226_registration_console',null);
 await assertRejected('gcc_v226_registration_console',teacherJwt);
 await assertRejected('gcc_v226_registration_console',strangerJwt);
 await assertRejected('gcc_v231_teacher_browse_sessions_page',null);
 await assertRejected('gcc_v231_teacher_browse_sessions_page',strangerJwt);
 const accounts=await request('gcc_v226_registration_console',{
  p_page:1,p_page_size:25,p_status:'',p_country:'',p_search:''
 },hostJwt);
 assert.equal(accounts.ok,true,'Host admin route failed: '+JSON.stringify(accounts.value).slice(0,400));
 assert.equal(Number(accounts.value.stats.total),252);
 assert.equal(Number(accounts.value.total_matches),252);
 assert.equal(accounts.value.items.length,25);
 assert.equal(accounts.value.items.some(x=>x.email==='unrelated@example.invalid'),false);
 const unrelated=await request('gcc_v226_registration_console',{
  p_page:1,p_page_size:10,p_status:'',p_country:'',p_search:'unrelated@example.invalid'
 },hostJwt);
 assert.equal(unrelated.ok,true);
 assert.equal(Number(unrelated.value.total_matches),0);
 const sessions=[];
 let afterStart=null,afterId=null;
 for(let page=0;page<8;page++){
  const r=await request('gcc_v231_teacher_browse_sessions_page',{
   p_after_start:afterStart,p_after_id:afterId,p_limit:100
  },teacherJwt);
  assert.equal(r.ok,true,'Teacher session page failed: '+JSON.stringify(r.value).slice(0,400));
  assert.ok(Array.isArray(r.value.items));
  for(const entry of r.value.items){
   assert.equal(typeof entry.id,'string');
   assert.equal(entry.is_mine,true);
   assert.equal(Object.hasOwn(entry.session_details||{},'meeting_url'),false,'Meeting URL leaked');
   assert.notEqual(entry.id,'60000000-0000-4000-8000-000000000001','Other school closed session leaked');
   sessions.push(entry);
  }
  if(!r.value.has_more)break;
  assert.ok(r.value.items.length>0,'Empty cursor page');
  const last=r.value.items.at(-1);
  afterStart=last.starts_at;
  afterId=last.id;
 }
 assert.equal(sessions.length,327,'Expected 325 open + 2 own offers from the other school fixture');
 assert.equal(new Set(sessions.map(x=>x.id)).size,sessions.length);
 console.log('PASS: HTTP PostgREST anonymous, teacher, stranger and host RPC authorization');
 console.log('PASS: 252 GCC-only Auth accounts; 327 teacher-scoped paginated offers; no private meeting URL');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
