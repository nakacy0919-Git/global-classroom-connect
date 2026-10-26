import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('sql/gcc_v134_signup_overview.sql');
const page=read('src/pages/host/TeacherApprovalsV120.js');
const service=read('src/services/teacherOnboardingV120.js');
const header=read('src/components/Header.js');
test('new signup accounts are visible before email confirmation or review submission',()=>{
 assert.match(sql,/FROM auth\.users/);
 assert.match(sql,/LEFT JOIN public\.gcc_v120_applications/);
 assert.match(sql,/email_confirmed_at IS NULL THEN 'email_unconfirmed'/);
 assert.match(sql,/ELSE 'profile_incomplete'/);
 assert.match(sql,/WHEN a\.status IN \('approved','rejected','pending'\)/);
 assert.match(service,/rpc\('gcc_v134_signup_overview'\)/);
});
test('signup overview is read-only, host-authorized, and excludes anonymous RPC access',()=>{
 assert.match(sql,/PERFORM public\.gcc_v6_require_host\(\)/);
 assert.match(sql,/SECURITY DEFINER SET search_path TO ''/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v134_signup_overview\(\) FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v134_signup_overview\(\) TO authenticated/);
 assert.doesNotMatch(sql,/\b(?:UPDATE|DELETE FROM|INSERT INTO)\s+(?:public|auth)\./i);
 assert.match(sql,/LIMIT 200/);
});
test('admin interface shows lifecycle counts separately from actionable pending reviews',()=>{
 for(const s of ['gcc134-accounts','gcc134-counts','gcc134-refresh','Applications awaiting approval','No pending applications.']){
  assert.ok(page.includes(s),s);
 }
 assert.match(page,/pendingApprovalsV120\(\),signupOverviewV134\(\)/);
 assert.match(page,/reviewApplicationV120\(a\.id,decision,grantHost,school\)/);
 assert.match(page,/grantHost&&!confirm/);
});
test('admin live refresh polls every 15 seconds and catches focus/visibility transitions',()=>{
 assert.match(page,/window\.setInterval\(/);
 assert.match(page,/\},15000\)/);
 assert.match(page,/visibilitychange/);
 assert.match(page,/window\.addEventListener\('focus',onActive\)/);
 assert.match(page,/root\.isConnected/);
 assert.match(page,/lastQueueKey/);
 assert.match(page,/lastAccountKey/);
 assert.match(page,/loading/);
 assert.match(page,/Could not load registered accounts/);
});
test('approval route displays a real title, not undefined',()=>{
 assert.match(header,/'teacher-approvals': 'Teacher Applications'/);
});
