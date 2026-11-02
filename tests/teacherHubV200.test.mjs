import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const portal=read('src/pages/teacher/TeacherPortalPage.js'),sidebar=read('src/pages/teacher/TeacherSidebar.js');
test('teacher home has primary discovery and creation actions, live summary and a session list',()=>{
 for(const id of ['data-gct-view="home"','gctp-home-sessions-count','gctp-home-requests-count','gctp-home-mine'])assert.ok(portal.includes(id),id);
 assert.match(portal,/function renderHome\(\)/);
 assert.match(portal,/renderMine\(\);renderHome\(\)/);
 assert.ok(sidebar.includes("'requests'"));
 assert.doesNotMatch(sidebar,/\['find','Find a Session'\]|\['create','Host a Session'\]|\['home','Teacher Home'\]/);
 assert.match(sidebar,/GCC Home/);
});
test('advanced teacher links are collapsed under optional navigation',()=>{
 assert.match(sidebar,/gcc-teacher-more-v200/);
 for(const item of ['profile','network','volunteer'])assert.ok(sidebar.includes("'"+item+"'"),item);
 assert.doesNotMatch(sidebar,/teacher-approvals|teacher-invites|Teacher Database|Admin Mode/);
});
test('admin-only mode is hidden unless authenticated host and remains inaccessible from teacher routes',()=>{
 const nav=read('src/lib/welcomeAccountV184.js'),app=read('src/app.js'),welcome=read('src/pages/public/WelcomeV117.js');
 assert.match(nav,/hostProfile\?\.role==='host'/);
 assert.match(nav,/admin.hidden=!access.admin/);
 assert.match(welcome,/data-gcc-admin-mode[^>]*hidden/);
 assert.match(app,/profile\.role === 'host'/);
 assert.match(app,/if\(route === 'teacher-portal'\)/);
});
test('teacher entry defaults to home; git pushes cannot auto-deploy',()=>{
 const auth=read('src/pages/teacher/TeacherAccessPage.js');
 const config=JSON.parse(read('vercel.json'));
 assert.match(auth,/#\/teacher-portal\?view=home/);
 assert.match(read('src/components/Header.js'),/home:'Teacher Home'/);
 assert.equal(config.git.deploymentEnabled,false);
});
