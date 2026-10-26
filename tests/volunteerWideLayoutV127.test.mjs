import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const css=read('src/styles/volunteerFocusV123.css');
const appTheme=read('src/styles/academicPop.css');
const portal=read('src/pages/teacher/TeacherPortalPage.js');
const gallery=read('src/styles/volunteerGalleryV122.css');

test('V12.7 specifically overrides Academic Pop grid for the volunteer-only shell',()=>{
 assert.match(appTheme,/body:has\(\.app-shell\) \.app-shell\s*\{/);
 assert.match(css,/body:has\(\.app-shell\) \.app-shell\.gcc123-volunteer-focus\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\)/s);
 assert.match(css,/\.gcc123-volunteer-focus\s*>\s*\.main-shell|\.gcc123-volunteer-focus > \.main-shell/);
});
test('V12.7 content is full width, gallery stays within a centered 1320px container',()=>{
 assert.match(css,/\.gcc123-volunteer-focus \.gcc123-volunteer\s*\{[^}]*width:min\(100%,1320px\)/s);
 assert.match(css,/\.gcc123-volunteer-focus \.gcc123-volunteer > \.gcc122-team\s*\{[^}]*width:100%/s);
 assert.match(css,/\.gcc123-volunteer-focus \.page-content/);
});
test('the layout override is active only for the volunteer route',()=>{
 assert.match(portal,/classList\.toggle\('gcc123-volunteer-focus',id==='volunteer'\)/);
 assert.match(css,/\.gcc123-volunteer-focus/);
 // Only reject unscoped rules; rules scoped under .gcc123-volunteer-focus are intentional.
 assert.doesNotMatch(css,/^\s*\.(?:gct-portal|app-shell)\s*\{/m);
});
test('the compact photo gallery supports four responsive columns and mobile stacking',()=>{
 assert.match(gallery,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(gallery,/@media\(max-width:1080px\)/);
 assert.match(gallery,/@media\(max-width:420px\)/);
});
test('the original 3-step facilitator registration and security boundaries are untouched',()=>{
 const form=read('src/pages/teacher/VolunteerV117.js');
 const service=read('src/services/volunteerGalleryV122.js');
 assert.match(form,/data-gcc123-step="0"/);
 assert.match(form,/data-gcc123-step="1"/);
 assert.match(form,/data-gcc123-step="2"/);
 assert.match(form,/saveVolunteerV117/);
 assert.match(service,/gcc_v122_volunteer_gallery/);
});
