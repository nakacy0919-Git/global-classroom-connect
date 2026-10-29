import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compressTeacherPhotoV116,webpPhotoPathV116} from '../src/lib/teacherWebpV116.js';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

const signedInAccount='12345678-1234-1234-1234-123456789012';
function mockBrowser({webp=true}={}){
 const oldDocument=globalThis.document,oldBitmap=globalThis.createImageBitmap;
 let calls=[];
 globalThis.createImageBitmap=async()=>({width:1600,height:900,close(){}});
 globalThis.document={createElement(kind){
  assert.equal(kind,'canvas');
  const canvas={width:0,height:0,getContext:()=>({drawImage(){},fillRect(){},set fillStyle(value){}}),
   toBlob(resolve,mime,quality){
    calls.push({mime,quality,width:canvas.width,height:canvas.height});
    resolve(new Blob(['small photo'],{type:mime==='image/webp'&&!webp?'image/png':mime}));
   }};
  return canvas;
 }};
 return {calls,restore(){
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=oldBitmap;
 }};
}
test('WebP-capable browsers keep existing private WebP upload behavior',async()=>{
 const env=mockBrowser();
 try{
  const output=await compressTeacherPhotoV116(new Blob(['source'],{type:'image/png'}));
  assert.equal(output.type,'image/webp');
  assert.equal(output.name,'teacher-profile.webp');
  assert.ok(output.size<=250000);
  assert.ok(env.calls[0].width<=512);
  assert.match(webpPhotoPathV116(signedInAccount,output.type),/\.webp$/);
 }finally{env.restore();}
});
test('browser without WebP support falls back to genuine JPEG with matching extension',async()=>{
 const env=mockBrowser({webp:false});
 try{
  const output=await compressTeacherPhotoV116(new Blob(['source'],{type:'image/png'}));
  assert.equal(output.type,'image/jpeg');
  assert.equal(output.name,'teacher-profile.jpg');
  assert.ok(env.calls.some(c=>c.mime==='image/webp'));
  assert.ok(env.calls.some(c=>c.mime==='image/jpeg'));
  assert.match(webpPhotoPathV116(signedInAccount,output.type),/\.jpg$/);
 }finally{env.restore();}
});
test('source validation, file size and untrusted MIME paths remain protected',async()=>{
 await assert.rejects(compressTeacherPhotoV116(new Blob(['svg'],{type:'image/svg+xml'})),/JPEG, PNG or WebP/);
 await assert.rejects(compressTeacherPhotoV116(new Blob([new Uint8Array(5*1024*1024+1)],{type:'image/jpeg'})),/under 5 MB/);
 assert.throws(()=>webpPhotoPathV116('not-an-id','image/jpeg'),/ID is invalid/);
 assert.throws(()=>webpPhotoPathV116(signedInAccount,'image/svg+xml'),/Unsupported processed/);
});
test('server rejects oversized, spoofed or owner-mismatched photos without changing approvals',()=>{
 const sql=read('sql/gcc_v183_teacher_photo_jpeg_fallback.sql');
 const svc=read('src/services/teacherOnboardingV120.js');
 const form=read('src/pages/teacher/TeacherJoinV120.js');
 assert.match(sql,/auth\.uid\(\) IS NOT NULL/);
 assert.match(sql,/a\.user_id=auth\.uid\(\) AND a\.status='draft'/);
 assert.match(sql,/\(webp\|jpg\)/);
 assert.match(sql,/lower\(storage\.extension\(name\)\) IN \('webp','jpg'\)/);
 assert.match(sql,/lower\(storage\.extension\(p_photo_path\)\)='webp'/);
 assert.match(sql,/lower\(storage\.extension\(p_photo_path\)\)='jpg'/);
 assert.match(sql,/image\/jpeg/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v120_submit_application/);
 assert.match(svc,/webpPhotoPathV116\(teacherId,processed\.type\)/);
 assert.match(svc,/contentType:processed\.type/);
 assert.match(form,/Works even when WebP export is unavailable/);
 assert.match(form,/assertEditableDraftV139/);
});
