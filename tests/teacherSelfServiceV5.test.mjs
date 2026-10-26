import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const packageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sql=readFileSync(path.join(packageRoot,'supabase/migrations/20261015_teacher_self_service_v5.sql'),'utf8');
const portal=readFileSync(path.join(packageRoot,'src/pages/teacher/TeacherPortalPage.js'),'utf8');
const access=readFileSync(path.join(packageRoot,'src/pages/teacher/TeacherAccessPage.js'),'utf8');

test('invite activation requires code, matching verified email and host issued secret',()=>{
 assert.match(sql,/email_confirmed_at is not null/);
 assert.match(sql,/lower\(btrim\(t\.email\)\)=email_address/);
 assert.match(sql,/t\.auth_user_id is null or t\.auth_user_id=uid/);
 assert.match(sql,/i\.used_at is null/);
 assert.match(sql,/for update of i/);
});
test('private invite table is not directly readable by ordinary authenticated clients',()=>{
 assert.match(sql,/revoke all on public\.gcc_teacher_invites from anon, authenticated/);
 assert.match(sql,/enable row level security/);
 assert.doesNotMatch(sql,/create policy .* on public\.gcc_teacher_invites/i);
});
test('teacher write functions restrict ownership and self application',()=>{
 assert.match(sql,/a\.teacher_id=tid and r\.status='pending'/);
 assert.match(sql,/target=tid then raise exception/);
 assert.match(sql,/teacher_id=tid and status='open'/);
 assert.match(sql,/gcc_current_teacher_id\(\)/);
});
test('teacher browse feed excludes email and private notes',()=>{
 const q=sql.slice(sql.indexOf('create or replace function public.gcc_teacher_browse_sessions'),sql.indexOf('create or replace function public.gcc_teacher_register_session'));
 assert.doesNotMatch(q,/t\.email|a\.notes|auth\.users/);
 assert.match(q,/a\.status='open' or a\.teacher_id=tid/);
});
test('teacher workflow links own sessions, finding and inbound approval without direct table mutations',()=>{
 assert.match(portal,/data-gct-view="create"/);
 assert.match(portal,/data-gct-view="find"/);
 assert.match(portal,/data-gct-view="requests"/);
 assert.doesNotMatch(portal,/data-gct-tab=/);
 assert.match(portal,/teacherReview\(r\.id,decision\)/);
 assert.match(portal,/teacherApply\(o\.id,input\.value\.trim\(\)\)/);
 assert.match(access,/claimTeacherInvite/);
});
test('guarded V5 upgrade patches only the expected anchors',()=>{
 const fixture=mkdtempSync(path.join(tmpdir(),'gct-v5-test-'));
 try{
  mkdirSync(path.join(fixture,'src/components'),{recursive:true});
  const app=`import { supabase } from './services/supabase.js';
// GCC_JOIN_V4 // GCC_SESSION_SPLIT_V3
const routes={
  login: LoginPage,
};
const publicRoutes=new Set([
    'registration',
]);
function access(){if(!profile || profile.role !== 'host'){window.location.hash =\n        '#/login';}}
function layout(){if(route === 'login' ||\n    route === 'registration'){} return \`\n\${Sidebar(\n          route\n        )}\n\`;}
function bind(){\n  bindJoinRequestsPage(); // GCC_JOIN_V4\n}
`;
  writeFileSync(path.join(fixture,'src/app.js'),app);
  writeFileSync(path.join(fixture,'src/components/Sidebar.js'),"const menuItems=[\n  { key: 'join-requests', label: '✉ Join Requests' }, // GCC_JOIN_V4\n];");
  writeFileSync(path.join(fixture,'src/components/Header.js'),"const titles={\n  'join-requests': 'Join Requests', // GCC_JOIN_V4\n};");
  const before=readFileSync(path.join(fixture,'src/app.js'),'utf8');
  const result=spawnSync(process.execPath,[path.join(packageRoot,'scripts/gccTeacherV5Upgrade.cjs'),fixture],{encoding:'utf8'});
  if(result.status!==0){assert.fail(result.stderr||result.stdout);}
  const modified=readFileSync(path.join(fixture,'src/app.js'),'utf8');
  assert.match(modified,/teacher-portal.*TeacherPortalPage/);
  assert.match(modified,/route === 'teacher-portal' \? profile\.role !== 'teacher'/);
  assert.match(modified,/TeacherSidebar\(\) : Sidebar\(route\)/);
  assert.notEqual(modified,before);
  const again=spawnSync(process.execPath,[path.join(packageRoot,'scripts/gccTeacherV5Upgrade.cjs'),fixture],{encoding:'utf8'});
  assert.notEqual(again.status,0);
  assert.equal(readFileSync(path.join(fixture,'src/app.js'),'utf8'),modified);
 }finally{rmSync(fixture,{recursive:true,force:true});}
});
