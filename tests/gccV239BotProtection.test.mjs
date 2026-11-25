import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBotVerifierV239} from '../supabase/functions/gcc-roster-bot-verify/verifyV239.mjs';
const origin='https://gcc.example.com',eventId='a4000000-0000-4000-8000-000000000001';
const request=(body={eventId,token:'synthetic-provider-token'},o=origin)=>new Request('https://example.invalid/verify',{method:'POST',headers:{origin:o,'content-type':'application/json'},body:JSON.stringify(body)});
const expected={success:true,hostname:'gcc.example.com',action:'gcc_roster',cdata:eventId};
test('server validates provider hostname, action and event, and forwards only digest',async()=>{
 let calls=0;
 const handler=createBotVerifierV239({allowedOrigins:[origin],secret:'synthetic-server-secret',
 fetcher:async(url,options)=>{assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(options.body.get('response'),'synthetic-provider-token');return Response.json(expected);},
 issueReceipt:async(id,digest)=>{calls++;assert.equal(id,eventId);assert.match(digest,/^[a-f0-9]{64}$/);return 'a'.repeat(64);}});
 const r=await handler(request());assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{receipt:'a'.repeat(64)});assert.equal(calls,1);
});
test('failed provider, wrong hostname/action/event and provider outages fail closed',async()=>{
 for(const result of [{success:false},{...expected,hostname:'wrong.example.com'},{...expected,action:'login'},{...expected,cdata:'wrong'}]){
  const handler=createBotVerifierV239({allowedOrigins:[origin],secret:'test',fetcher:async()=>Response.json(result),issueReceipt:async()=>{assert.fail('issued for invalid challenge');}});
  assert.equal((await handler(request())).status,400);
 }
 const outage=createBotVerifierV239({allowedOrigins:[origin],secret:'test',fetcher:async()=>{throw Error('provider down');},issueReceipt:async()=>assert.fail()});
 assert.equal((await outage(request())).status,503);
});
test('requests cannot pass roster data, unexpected origins, or oversized tokens',async()=>{
 const handler=createBotVerifierV239({allowedOrigins:[origin],secret:'test',fetcher:async()=>assert.fail(),issueReceipt:async()=>assert.fail()});
 assert.equal((await handler(request({eventId,token:'token',students:[]}))).status,400);
 assert.equal((await handler(request({eventId,token:'x'.repeat(2049)}))).status,400);
 assert.equal((await handler(request(undefined,'https://wrong.example.com'))).status,403);
});
test('protected registration uses a server receipt and does not retry through open RPC',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const sql=read('sql/gcc_v239_bot_receipt_guard.sql');
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v239_issue_bot_receipt\(uuid,text\) TO service_role/);
 assert.match(sql,/challenge_hash text NOT NULL UNIQUE/);
 assert.match(sql,/BEFORE INSERT ON public\.gcc_session_signups/);
 assert.match(sql,/used_at IS NULL/);
 assert.match(read('src/pages/public/SharedRegistrationPage.js'),/await verifyRosterBotV239\(eventId,botWidget\.takeToken\(eventId\)\)/);
 assert.match(read('src/services/simpleSessionService.js'),/p\.botReceipt\s*\?rpc\('gcc_v239_submit_protected_roster'/);
 const widget=read('src/lib/rosterBotWidgetV239.js');assert.doesNotMatch(widget,/localStorage|sessionStorage|secret/i);
});
