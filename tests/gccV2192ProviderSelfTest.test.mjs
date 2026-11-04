import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const edge=readFileSync(new URL('../supabase/functions/gcc-join-request-email/index.ts',import.meta.url),'utf8');
test('synthetic provider check cannot bypass private webhook authentication',()=>{
 const guard=edge.indexOf("matchingToken(token,Deno.env.get('GCC_MAIL_WEBHOOK_TOKEN')");
 const path=edge.indexOf("payload?.event==='resend_provider_test'");
 assert.ok(guard>0&&path>guard);
 assert.match(edge.slice(0,path),/if\(req\.method!=='POST'\)/);
});
test('test sends only to Resend sink and never accepts client-provided destination',()=>{
 const start=edge.indexOf("if(payload?.event==='resend_provider_test')");
 const end=edge.indexOf(" const supabase=createClient(",start);
 const sub=edge.slice(start,end);
 assert.match(sub,/to:\['delivered@resend\.dev'\]/);
 assert.match(sub,/Idempotency-Key/);
 assert.match(sub,/provider_test:'accepted'/);
 assert.doesNotMatch(sub,/payload\.to|payload\.email|payload\.recipient/);
 assert.doesNotMatch(sub,/console\.log|console\.error|\.text\(\)/);
});
