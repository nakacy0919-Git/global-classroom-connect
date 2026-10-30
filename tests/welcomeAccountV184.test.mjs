import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'),nav=read('src/lib/welcomeAccountV184.js'),login=read('src/pages/teacher/TeacherAccessPage.js'),css=read('src/styles/welcomeAccountV184.css'),app=read('src/app.js');
test('auth verified before menu appears',()=>{assert.match(nav,/await getCurrentUser\(\)/);assert.match(nav,/getCurrentProfile\(\)/);assert.match(nav,/teacherIdentity\(\)/);assert.match(nav,/hostProfile\?\.role==='host'/);});
test('unified login handles both roles',()=>{assert.match(login,/hostProfile\?\.role==='host'/);assert.match(login,/await teacherIdentity\(\)/);assert.match(login,/#\/sessions/);});
test('signout and compact mobile nav wired',()=>{assert.match(nav,/await signOut\(\)/);assert.match(css,/@media\(max-width:620px\)/);assert.match(app,/bindWelcomeAccountNavV184\(\)/);});
