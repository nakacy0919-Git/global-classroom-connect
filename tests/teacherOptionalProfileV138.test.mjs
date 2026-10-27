import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=read('src/pages/teacher/TeacherJoinV120.js');
const admin=read('src/pages/host/TeacherApprovalsV120.js');
const sql=read('sql/gcc_v138_optional_teacher_profile_fields.sql');

test('three website and region fields are optional while teacher identity and school details are required',()=>{
 for(const id of ['gcc120-website','gcc120-school-web','gcc120-region']){
  assert.match(ui,new RegExp('id="'+id+'"'));
  assert.doesNotMatch(ui,new RegExp('id="'+id+'"[^>]*required'));
 }
 for(const id of ['gcc120-name','gcc120-bio','gcc120-photo','gcc120-school','gcc120-type','gcc120-level','gcc120-country','gcc120-city','gcc120-timezone'])
  assert.match(ui,new RegExp('id="'+id+'"[^>]*required'),id);
 assert.match(ui,/websites, as well as region or state, are optional/);
});

test('frontend ignores blank links and validates submitted website URLs',()=>{
 assert.match(ui,/if\(!value\)continue/);
 assert.match(ui,/new URL\(value\)/);
 assert.match(ui,/url\.protocol!=='https:'/);
 assert.match(ui,/If provided, websites must/);
});

test('backend accepts empty links or region, still validates submitted links and stores absent fields as null',()=>{
 assert.equal((sql.match(/END \\$fn\\$;/g)||[]).length,1,'function body must have one terminator');
 assert.equal((sql.match(/UPDATE public\\.gcc_v120_applications SET/g)||[]).length,1,'one application update');
 assert.match(sql,/website<>'' AND \(/);
 assert.match(sql,/site<>'' AND \(/);
 assert.match(sql,/website !~\* '\^https:\/\//);
 assert.match(sql,/site !~\* '\^https:\/\//);
 assert.match(sql,/website ~ /);
 assert.match(sql,/site ~ /);
 assert.match(sql,/\(reg<>'' AND char_length\(reg\) NOT BETWEEN 2 AND 120\)/);
 assert.ok(sql.includes("teacher_website=nullif(website,'')"));
 assert.ok(sql.includes("school_website=nullif(site,'')"));
 assert.ok(sql.includes("school_region=nullif(reg,'')"));
});
test('auth, private photo upload and manual approval remain mandatory',()=>{
 assert.match(sql,/email_confirmed_at IS NOT NULL/);
 assert.match(sql,/a\.status<>'draft'/);
 assert.match(sql,/gcc_v120_can_upload_photo\(p_photo_path\)/);
 assert.match(sql,/Photo must be a valid WebP under 300 KB/);
 assert.match(sql,/status='pending'/);
 assert.doesNotMatch(sql,/gcc_v120_review_application\(/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v120_submit_application\(jsonb,text\) TO authenticated/);
});

test('reviewer confirms school details even without URLs and does not show duplicate commas',()=>{
 assert.match(admin,/any websites provided/);
 assert.match(admin,/any website provided \(if available\)/);
 assert.match(admin,/\[a\.city,a\.region,a\.country\]\.filter\(Boolean\)\.join\(', '\)/);
 assert.match(admin,/!faceBox\.checked\|\|!schoolBox\.checked/);
});
