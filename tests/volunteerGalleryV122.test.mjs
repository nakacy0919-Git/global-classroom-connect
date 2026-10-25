import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/teacher/VolunteerV117.js');
const gallery=read('src/pages/teacher/VolunteerGalleryV122.js');
const service=read('src/services/volunteerGalleryV122.js');
const css=read('src/styles/volunteerGalleryV122.css');
const sql=read('sql/gcc_v122_volunteer_gallery.sql');

test('volunteer route has gallery, genuine opt-in form and a join-team CTA',()=>{
 assert.match(page,/volunteerGalleryMarkupV122\(\)/);
 assert.match(page,/mountVolunteerGalleryV122\(root,openTab\)/);
 assert.match(page,/id="gcc117-volunteer-form"/);
 assert.match(page,/id="gcc117-want-facilitator"/);
 assert.match(page,/id="gcc117-want-host"/);
 assert.match(page,/saveVolunteerV117/);
 assert.match(gallery,/id="gcc122-join-form"|href="#gcc122-join-form"/);
 assert.match(page,/id="gcc122-join-form"/);
});
test('private gallery includes only consented approved volunteers with photos',()=>{
 assert.match(sql,/gcc_current_teacher_id\(\)/);
 assert.match(sql,/t\.directory_visible IS TRUE/);
 assert.match(sql,/t\.is_active IS TRUE/);
 assert.match(sql,/s\.is_active IS TRUE/);
 assert.match(sql,/NULLIF\(btrim\(t\.photo_path\)/);
 assert.match(sql,/t\.volunteer_facilitator IS TRUE OR t\.volunteer_host IS TRUE/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v122_volunteer_gallery\(\) FROM PUBLIC,anon,authenticated/);
 assert.doesNotMatch(sql,/['"]email['"]|volunteer_note|auth_user_id/);
});
test('gallery fetches secure RPC and uses signed private photos',()=>{
 assert.match(service,/supabase\.rpc\('gcc_v122_volunteer_gallery'\)/);
 assert.match(gallery,/signedTeacherPhotoV116/);
 assert.match(gallery,/document\.createElement/);
 assert.doesNotMatch(gallery,/innerHTML\s*=/);
 assert.match(gallery,/noopener noreferrer/);
 assert.match(gallery,/u\.protocol==='https:'/);
});
test('volunteer team is filterable by role, country and school and has an honest empty state',()=>{
 assert.match(gallery,/id="gcc122-country"/);
 assert.match(gallery,/id="gcc122-role"/);
 assert.match(gallery,/id="gcc122-query"/);
 assert.match(gallery,/Your name could be here!/);
 assert.match(gallery,/Facilitator/);
 assert.match(gallery,/GC Session Host/);
 assert.match(gallery,/jp\.svg/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:610px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('team gallery does not assign administrators or publish private contact information',()=>{
 assert.doesNotMatch(sql,/UPDATE public\.profiles|grant_host|GRANT.*ON public\.teachers/);
 assert.doesNotMatch(gallery,/person\.email|volunteer_note/);
 assert.match(page,/To appear in the gallery/);
});
