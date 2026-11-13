import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/host/TeacherApprovalsV120.js');
const consoleUi=read('src/lib/registrationConsoleV226.js');
const sql=read('sql/gcc_v226_registration_console.sql');
const teacherHome=read('src/pages/teacher/TeacherPortalPage.js');
const vercel=JSON.parse(read('vercel.json'));

test('registration console is host-only and never grants direct table access',()=>{
  assert.match(sql,/PERFORM public\.gcc_v6_require_host\(\)/);
  assert.match(sql,/SECURITY DEFINER SET search_path TO ''/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v226_registration_console/);
  assert.match(sql,/FROM PUBLIC,anon,authenticated/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v226_registration_console/);
  assert.doesNotMatch(sql,/\b(?:INSERT INTO|UPDATE|DELETE FROM)\s+(?:public|auth)\./i);
  assert.doesNotMatch(sql,/LIMIT 200/);
  assert.match(sql,/FROM auth\.users u/);
});

test('all-account country totals and server pagination remain separate from filtered results',()=>{
  assert.match(sql,/WITH accounts AS MATERIALIZED/);
  assert.match(sql,/country_groups AS/);
  assert.match(sql,/COUNT\(\*\) FILTER \(WHERE status='pending'\)/);
  assert.match(sql,/COUNT\(\*\) FILTER \(WHERE status='approved'\)/);
  assert.match(sql,/LIMIT page_size OFFSET/);
  assert.match(sql,/STRPOS\(LOWER\(CONCAT_WS/);
  assert.doesNotMatch(sql,/EXECUTE\s+format\(/i);
});

test('admin uses four tabbed views and paginates approvals as well as account rows',()=>{
  for(const tag of ['registrations','countries','applications','corrections']){
    assert.match(page,new RegExp('data-gcc226-tab="'+tag+'"'));
    assert.match(page,new RegExp('data-gcc226-view="'+tag+'"'));
  }
  assert.match(page,/mountRegistrationConsoleV226\(root\)/);
  assert.match(page,/updateReviewPager/);
  assert.match(page,/updateSchoolPager/);
  assert.match(page,/gcc226-review-disclosure/);
  assert.match(consoleUi,/p_page:options\.page/);
  assert.match(consoleUi,/p_country:options\.country/);
  assert.match(consoleUi,/p_status:options\.status/);
  assert.match(consoleUi,/signupOverviewV134\(\)/);
  assert.match(consoleUi,/latest 200 accounts only/);
});

test('teacher registration PII uses textContent and browser-built table cells',()=>{
  assert.match(consoleUi,/node\.textContent=label/);
  assert.match(consoleUi,/country_code/);
  assert.doesNotMatch(consoleUi,/\.innerHTML\s*=/);
  assert.match(consoleUi,/new Option/);
});

test('beginner guidance is optional, and production deployment remains disabled',()=>{
  assert.match(teacherHome,/First time using GCC\? See the 3-step guide/);
  assert.match(teacherHome,/Never include students’ private contact details/);
  assert.equal(vercel.git.deploymentEnabled,false);
});
