import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const form=read('src/pages/teacher/TeacherJoinV120.js');
const sql=read('sql/gcc_v138_optional_teacher_profile_fields.sql');
const input=id=>{
 const hit=form.match(new RegExp('<input id="'+id+'"[^>]*>'));
 assert.ok(hit,'Missing input: '+id);
 return hit[0];
};

test('teacher and school websites plus region are optional, not marked required in UI',()=>{
 for(const id of ['gcc120-website','gcc120-school-web','gcc120-region']){
  const tag=input(id);
  assert.doesNotMatch(tag,/\srequired(?:\s|>)/);
 }
 assert.match(form,/Personal website \(HTTPS, optional\)/);
 assert.match(form,/School website \(HTTPS, optional\)/);
 assert.match(form,/Region \/ prefecture \/ state \(optional\)/);
});

test('mandatory identity, biography, photograph and school fields remain required',()=>{
 for(const id of ['gcc120-name','gcc120-photo','gcc120-school','gcc120-city','gcc120-timezone']){
  assert.match(input(id),/\srequired(?:\s|>)/,'Required must remain: '+id);
 }
 for(const id of ['gcc120-country','gcc120-type','gcc120-level']){
  assert.match(form,new RegExp('<select id="'+id+'"[^>]*\\srequired'),id+' must remain required');
 }
 assert.match(form,/<textarea id="gcc120-bio"[^>]*\srequired/);
});

test('client skips empty optional URLs and still checks HTTPS for supplied links',()=>{
 assert.match(form,/const value=\$\(id\)\.value\.trim\(\);if\(!value\)continue;/);
 assert.match(form,/url\.protocol!=='https:'/);
 assert.match(form,/submitApplicationV120\(payload,photo\.path\)/);
 assert.match(form,/await uploadApplicationPhotoV120\(draft\.teacher_id,file\)/);
});

test('database accepts blank optional fields but rejects invalid supplied URLs',()=>{
 assert.match(sql,/\(reg<>'' AND char_length\(reg\) NOT BETWEEN 2 AND 120\)/);
 assert.match(sql,/\(website<>'' AND website !~\*/);
 assert.match(sql,/\(site<>'' AND site !~\*/);
 assert.match(sql,/teacher_website=nullif\(website,''\)/);
 assert.match(sql,/school_region=nullif\(reg,''\)/);
 assert.match(sql,/school_website=nullif\(site,''\)/);
 assert.match(sql,/Any provided website URL must be a valid HTTPS address/);
});

test('database still verifies identity, teacher draft, photo and status while preserving permissions',()=>{
 assert.match(sql,/auth\.uid\(\) IS NULL/);
 assert.match(sql,/email_confirmed_at IS NOT NULL/);
 assert.match(sql,/a\.status<>'draft'/);
 assert.match(sql,/gcc_v120_can_upload_photo\(p_photo_path\)/);
 assert.match(sql,/Photo must be a valid WebP under 300 KB/);
 assert.match(sql,/status='pending'/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v120_submit_application\(jsonb,text\) FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v120_submit_application\(jsonb,text\) TO authenticated/);
 assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE|DELETE FROM|ALTER TABLE/i);
});

test('reviewers may approve verified schools that lack personal and school websites',()=>{
 const admin=read('src/pages/host/TeacherApprovalsV120.js');
 assert.match(admin,/school details, and any websites provided/);
 assert.match(admin,/school details and any website provided \(if available\)/);
 assert.match(admin,/\[a\.city,a\.region,a\.country\]\.filter\(Boolean\)\.join\(', '\)/);
 assert.match(admin,/!faceBox\.checked\|\|!schoolBox\.checked/);
});
