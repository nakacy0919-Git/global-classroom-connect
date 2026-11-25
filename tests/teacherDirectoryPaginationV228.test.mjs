import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('src/app.js');
const page=read('src/pages/host/TeachersPage.js');
const pager=read('src/lib/teacherDirectoryPaginationV228.js');
const css=read('src/styles/teacherDirectoryPaginationV228.css');
test('host teacher directory binds one searchable paginated component',()=>{
 assert.match(app,/bindTeacherDirectoryPaginationV228\(document\)/);
 assert.match(pager,/pageSize:8/);
 assert.match(pager,/card\.hidden=!visible\.has\(card\)/);
 assert.match(pager,/found\.length/);
 assert.match(pager,/data.*teacherCountry/);
});
test('teacher cards have independently escaped country search metadata',()=>{
 assert.match(page,/data-teacher-country="/);
 assert.match(page,/data-teacher-country-name="/);
 assert.match(page,/escapeHtml\(school\?\.country_code/);
 assert.match(page,/escapeHtml\(school\?\.country_name/);
});
test('empty results, paging, keyboard focus and narrow layout work without CSS overflow',()=>{
 assert.match(pager,/No matching teachers/);
 assert.match(pager,/Page '\+state\.page\+' of '/);
 assert.match(pager,/setAttribute\('aria-label','Teacher directory pages'\)/);
 assert.match(css,/\[hidden\].*display:none!important/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:650px\)/);
});
