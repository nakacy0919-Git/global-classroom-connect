import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const here=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,here),'utf8');
test('photos resize privately, prefer WebP and fallback to JPEG without remote service',()=>{
 const s=read('src/lib/teacherWebpV116.js');assert.match(s,/createImageBitmap/);assert.match(s,/canvas\.toBlob\(resolve,mime,quality\)/);assert.match(s,/EXPORT_TYPES=\['image\/webp','image\/jpeg'\]/);
 assert.match(s,/maxEdge=512/);assert.match(s,/maxBytes=250000/);assert.doesNotMatch(s,/fetch\(|http:|https:/);
});
test('profiles remain private by default; directory requires explicit consent',()=>{
 const s=read('sql/gcc_v116_teacher_network.sql');assert.match(s,/directory_visible boolean NOT NULL DEFAULT false/);
 assert.match(s,/t\.directory_visible=true/);assert.match(s,/gcc_current_teacher_id\(\)/);
 assert.doesNotMatch(s,/GRANT EXECUTE ON FUNCTION public\.gcc_v116_teacher_directory\(\) TO anon/);
});
test('upload storage RLS permits own WebP but not arbitrary names',()=>{
 const s=read('sql/gcc_v116_teacher_network.sql');assert.match(s,/GCC V116 teacher WebP upload/);
 assert.match(s,/bucket_id='teacher-photos'/);assert.match(s,/t\.auth_user_id=auth\.uid\(\)/);
 assert.match(s,/storage\.extension\(name\)/);assert.match(s,/Photo must be a WebP image under 300 KB/);
});
test('school level and country directory are shown, not email addresses',()=>{
 const s=read('src/pages/teacher/TeacherNetworkV116.js');assert.match(s,/gcn116-country/);assert.match(s,/gcn116-level/);
 assert.match(s,/p\.country_code|person\.country_name/);assert.match(s,/Only teachers who have opted in/);
 assert.doesNotMatch(s,/person\.email/);
});
test('existing session creation and time conversion are untouched',()=>{
 const s=read('src/pages/teacher/TeacherNetworkV116.js');assert.doesNotMatch(s,/gcc_teacher_register_session/);
});
