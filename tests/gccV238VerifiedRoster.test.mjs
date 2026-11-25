import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rosterSubmissionErrorV236} from '../src/lib/rosterAdmissionV236.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('verified teacher errors preserve roster and offer profile recovery',()=>{
 for(const code of ['GCC_VERIFIED_TEACHER_REQUIRED','GCC_ROSTER_IDENTITY_MISMATCH']){
  const text=rosterSubmissionErrorV236({message:code});
  assert.match(text,/GCC profile|GCC teacher account/);
  assert.match(text,/roster is still here/);
 }
 const page=read('src/pages/public/SharedRegistrationPage.js');
 assert.match(page,/Use my GCC profile/);
 assert.match(page,/rosterIdentityV238\(\)/);
 assert.match(page,/target="_blank" rel="noopener noreferrer"/);
 assert.match(page,/generation!==policyGeneration/);
});
test('identity checks are database-authoritative and protect all new signup paths',()=>{
 const sql=read('sql/gcc_v238_verified_roster_guard.sql');
 for(const fragment of ['t.auth_user_id=auth.uid()','t.is_active=true','s.is_active=true','u.email_confirmed_at IS NOT NULL','u.deleted_at IS NULL','u.banned_until','v_count<>1','BEFORE INSERT ON public.gcc_session_signups','GCC_ROSTER_IDENTITY_MISMATCH','PERFORM public.gcc_v6_require_host()'])assert.ok(sql.includes(fragment),fragment);
 assert.doesNotMatch(sql,/raw_user_meta_data|user_metadata/);
 const host=read('src/lib/rosterInvitesV237.js');
 assert.match(host,/window.confirm\('Require verified GCC teacher accounts/);
 assert.match(host,/requireVerifiedRosterV238\(eventId\)/);
 const signup=read('src/pages/teacher/TeacherJoinV120.js');
 assert.match(signup,/Use a unique password of 12 or more characters/);
});
