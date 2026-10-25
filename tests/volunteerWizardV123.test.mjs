import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/teacher/VolunteerV117.js');
const cards=read('src/pages/teacher/VolunteerGalleryV122.js');
const css=read('src/styles/volunteerFocusV123.css');
const sql=read('sql/gcc_v123_founder_gallery.sql');
const portal=read('src/pages/teacher/TeacherPortalPage.js');
test('dedicated volunteer page hides other workspace tabs without deleting routes',()=>{
 assert.match(portal,/gcc123-volunteer-focus/);
 assert.match(css,/\.gcc123-volunteer-focus \.gct-portal>\.gct-tabs/);
 assert.match(css,/\.gcc123-volunteer-focus>\.sidebar/);
 assert.match(page,/#\/welcome/);
 assert.match(page,/id="gcc123-profile"/);
});
test('wizard contains 3 accessible steps, no long signup form below the gallery',()=>{
 for(const n of ['0','1','2'])assert.match(page,new RegExp('data-gcc123-step="'+n+'"'));
 assert.match(page,/role="dialog" aria-modal="true"/);
 assert.match(page,/event\.key==='Escape'/);
 assert.match(page,/id="gcc117-want-facilitator"/);
 assert.match(page,/id="gcc117-want-host"/);
 assert.match(page,/id="gcc123-next"/);
 assert.match(page,/id="gcc123-back"/);
 assert.match(page,/id="gcc123-visible"/);
 assert.match(css,/\.gcc123-modal\{position:fixed/);
 assert.doesNotMatch(page,/scrollIntoView/);
});
test('registration reuses approved profile, explicit consent, and existing volunteer save RPC',()=>{
 assert.match(page,/myTeacherProfileV116/);
 assert.match(page,/saveTeacherProfileV116/);
 assert.match(page,/saveVolunteerV117/);
 assert.match(page,/if\(!\$\('gcc123-visible'\)\.checked\)/);
 assert.match(page,/if\(!profile\?\.photo_path\)/);
 assert.match(page,/if\(!profile\?\.bio\?\.trim\(\)\)/);
 assert.match(page,/extras\?\.website_url/);
 assert.match(page,/await refreshGallery\(\)/);
 assert.match(page,/id="gcc117-volunteer-profile"/);
});
test('founder card appears for one verified real account and never fabricates a person',()=>{
 assert.match(sql,/matches<>1/);
 assert.match(sql,/p\.role='host'/);
 assert.match(sql,/t\.photo_path IS NOT NULL/);
 assert.match(sql,/s\.country_code='JP'/);
 assert.match(sql,/gcc_founder=true,directory_visible=true/);
 assert.match(cards,/Founder · Global Classroom/);
 assert.match(cards,/person\.founder/);
 assert.doesNotMatch(cards,/fake|demo@|example\.com/i);
});
test('gallery stays consented and private, no new privileged role assignments',()=>{
 assert.match(sql,/PERFORM public\.gcc_current_teacher_id\(\)/);
 assert.match(sql,/t\.directory_visible IS TRUE/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v122_volunteer_gallery\(\) FROM PUBLIC,anon,authenticated/);
 assert.doesNotMatch(sql,/UPDATE public\.profiles|grant_host|role='teacher'/);
 assert.doesNotMatch(cards,/person\.email|volunteer_note/);
});
