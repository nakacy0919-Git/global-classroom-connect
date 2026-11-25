import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rosterSubmissionErrorV236} from '../src/lib/rosterAdmissionV236.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('invitation errors retain the roster and offer host-assisted recovery',()=>{
 for(const code of ['GCC_INVITE_REQUIRED','GCC_INVITE_INVALID']){
  const message=rosterSubmissionErrorV236({message:code});
  assert.match(message,/host/);
  assert.match(message,/roster is still here/);
  assert.doesNotMatch(message,/GCC_INVITE/);
 }
 const page=read('src/pages/public/SharedRegistrationPage.js');
 assert.match(page,/id="gcc-v237-invite" type="password"/);
 assert.match(page,/GCC_INVITE_REQUIRED','GCC_INVITE_INVALID/);
 assert.match(page,/show\(1\);message\(rosterSubmissionErrorV236/);
});
test('invitation admission is server-side, event-specific, one-use and not silently bypassed',()=>{
 const sql=read('sql/gcc_v237_event_invitation_guard.sql');
 assert.match(sql,/BEFORE INSERT ON public\.gcc_session_signups/);
 assert.match(sql,/transaction_id=txid_current\(\)/);
 assert.match(sql,/event_id=p_event_id AND token_hash=encode\(sha256/);
 assert.match(sql,/expires_at>now\(\) AND revoked_at IS NULL AND redeemed_at IS NULL/);
 assert.match(sql,/PERFORM public\.gcc_v6_require_host/);
 assert.match(sql,/REVOKE ALL ON gcc_roster_guard\.invite_required/);
 const service=read('src/services/simpleSessionService.js');
 assert.match(service,/p\.invite\s*\?rpc\('gcc_v237_submit_invited_roster'/);
 assert.match(service,/:rpc\('gcc_v165_submit_roster'/);
 const host=read('src/lib/rosterInvitesV237.js');
 assert.match(host,/window\.confirm\('Switch this session to invitation-only/);
 assert.match(host,/Revoke all unused invitations/);
 assert.doesNotMatch(host,/localStorage|sessionStorage|console\./);
});
