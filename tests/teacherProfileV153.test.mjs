import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/pages/teacher/TeacherProfileV153.js');
const portal=read('src/pages/teacher/TeacherPortalPage.js');
const sql=read('supabase/migrations/20261028_teacher_profile_edit_v153.sql');
const css=read('src/styles/teacherProfileV153.css');
test('approved teacher gets direct My Profile route from account and menu',()=>{
 assert.match(read('src/pages/public/WelcomeV117.js'),/view=profile"[^>]*>.*My profile/);
 assert.match(read('src/pages/teacher/TeacherSidebar.js'),/profile','✎ My Profile'/);
 assert.match(portal,/data-gct-view="profile"/);
 assert.match(portal,/mountTeacherProfileV153\(root/);
 assert.match(portal,/['"]profile['"]\]\.includes\(view\)/);
 assert.match(read('src/app.js'),/['"]profile['"]\]\.includes\(requested\)/);
 assert.match(read('src/components/Header.js'),/profile:'My Profile'/);
});
test('teacher edits name, job, bio, languages, HTTPS links and directory consent',()=>{
 for(const id of ['gcc153-name','gcc153-title','gcc153-bio','gcc153-languages',
  'gcc153-website','gcc153-instagram','gcc153-facebook','gcc153-other',
  'gcc153-visible','gcc153-save','gcc153-message'])assert.ok(ui.includes(id),id);
 assert.match(ui,/maxLength|maxlength="3000"/);
 assert.match(ui,/saveTeacherProfileV116/);
 assert.match(ui,/saveSocialV117/);
 assert.match(ui,/profile\.directory_visible/);
 assert.match(ui,/u\.protocol==='https:'/);
 assert.match(sql,/gcc_v116_save_my_profile/);
 assert.match(sql,/char_length\(coalesce\(p_bio,''\)\)>3000/);
 assert.doesNotMatch(ui,/\.from\('teachers'\)\.update/);
});
test('photo changes use existing private storage image compressor and old photo cleanup',()=>{
 const svc=read('src/services/teacherNetworkV116.js');
 assert.match(ui,/accept="image\/jpeg,image\/png,image\/webp"/);
 assert.match(ui,/uploadMyTeacherPhotoV116\(profile\.id,file\)/);
 assert.match(ui,/gcc_v153_clear_my_photo/);
 assert.match(ui,/signedTeacherPhotoV116/);
 assert.match(svc,/compressTeacherPhotoV116\(file\)/);
 assert.match(svc,/cacheControl:'3600',upsert:false/);
 assert.match(sql,/GCC V153 teacher own-photo cleanup/);
 assert.match(sql,/public\.gcc_v116_can_upload_photo\(name\)/);
 assert.match(sql,/gcc_v153_clear_my_photo/);
 assert.match(sql,/FOR DELETE TO authenticated/);
});
test('school registration edits are submitted for host verification, not directly changed by teachers',()=>{
 for(const id of ['gcc153-school-name','gcc153-school-city','gcc153-school-region',
  'gcc153-school-school_type','gcc153-school-school_level','gcc153-school-website_url'])assert.ok(ui.includes(id),id);
 assert.match(ui,/gcc_v153_request_school_edit/);
 assert.match(ui,/gcc_v153_my_school_edit/);
 assert.match(ui,/gcc_v153_my_school_details/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.gcc_v153_school_edit_requests/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE.*FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/public\.gcc_current_teacher_id\(\)/);
 assert.match(sql,/role='host'/);
 assert.match(sql,/p_accept THEN/);
 assert.match(sql,/UPDATE public\.schools/);
 assert.doesNotMatch(ui,/\.from\('schools'\)\.update/);
});
test('host approvals page can review school data differences and approve or decline',()=>{
 const host=read('src/pages/host/TeacherApprovalsV120.js');
 assert.match(host,/gcc_v153_host_school_edits/);
 assert.match(host,/gcc_v153_review_school_edit/);
 assert.match(host,/request\.current/);
 assert.match(host,/request\.requested/);
 assert.match(host,/All teachers linked to this school/);
});
test('mobile editor is responsive with large photo and touch-sized buttons',()=>{
 assert.match(css,/gcc153-photo-row/);
 assert.match(css,/gcc153-avatar img/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/font-size:16px/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/\.gcn116-layout>form#gcn116-profile\{display:none!important\}/);
});
