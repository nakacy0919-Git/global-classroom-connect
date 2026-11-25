import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {providerAcceptanceV234,idempotencyKeyV219} from '../supabase/functions/gcc-join-request-email/requestEmailV219.mjs';
test('provider success is recorded only with a usable receipt',()=>{
 assert.deepEqual(providerAcceptanceV234({id:'receipt-123'}),{outcome:'sent',providerId:'receipt-123',failure:null});
 for(const value of [null,{}, {id:''},{id:'  '},{id:123},{id:'bad@example.invalid'},{id:'a'.repeat(161)}]){
  assert.deepEqual(providerAcceptanceV234(value),{outcome:'retry',providerId:null,failure:'provider_receipt_missing'});
 }
 const id='543184ab-29d9-467e-a8cd-8e0d49b4fe04';
 assert.equal(idempotencyKeyV219(id),idempotencyKeyV219(id.toUpperCase()));
});
test('contact panel clears private values on close and revalidates before writing',()=>{
 const ui=readFileSync(new URL('../src/lib/partnerContactsV218.js',import.meta.url),'utf8');
 assert.match(ui,/viewGeneration\+\+/);
 assert.match(ui,/clearPrivateView\(\)/);
 assert.match(ui,/value\.value=''/);
 assert.match(ui,/generation!==viewGeneration/);
 assert.match(ui,/if\(busy\|\|!loaded\|\|!details\.open\)return/);
 assert.match(ui,/Contact shared\./);
 assert.match(ui,/The contact view could not refresh/);
 assert.doesNotMatch(ui,/innerHTML|setInterval/);
});
