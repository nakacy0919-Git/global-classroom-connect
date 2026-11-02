import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 optimizeFlyerV207,flyerDimensionsV207,validateFlyerSourceV207,flyerSizeLabelV207,
 FLYER_ALLOWED_MIME_V207,FLYER_TARGET_BYTES_V207,FLYER_MAX_BYTES_V207
} from '../src/lib/flyerWebpV207.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=(size=3*1024*1024,type='image/png')=>({size,type,name:'lesson-flyer.png'});
test('JPEG, PNG and WebP are decoded and reduced to at most 1800px',()=>{
 for(const mime of ['image/jpeg','image/png','image/webp'])assert.doesNotThrow(()=>validateFlyerSourceV207(source(16*1024*1024,mime)));
 assert.deepEqual(flyerDimensionsV207(6000,4000),{width:1800,height:1200});
 assert.deepEqual(flyerDimensionsV207(700,1000),{width:700,height:1000});
 assert.deepEqual(flyerDimensionsV207(4000,6000),{width:1200,height:1800});
 assert.deepEqual([...FLYER_ALLOWED_MIME_V207],['image/jpeg','image/png','image/webp']);
});
test('large original files accepted for compression but extreme source rejected',()=>{
 assert.doesNotThrow(()=>validateFlyerSourceV207(source(15*1024*1024,'image/jpeg')));
 assert.throws(()=>validateFlyerSourceV207(source(25*1024*1024)),/24 MB/);
 assert.throws(()=>validateFlyerSourceV207(source(50000,'image/gif')),/JPEG, PNG or WebP/);
 assert.throws(()=>flyerDimensionsV207(9000,5000),/32 megapixels/);
});
test('adaptive compressor stops when WebP goal is met and reports measured reduction',async()=>{
 const calls=[];let closed=false;
 const result=await optimizeFlyerV207(source(),{
  decode:async()=>({image:{},width:6000,height:4000,close:()=>{closed=true}}),
  encode:async(image,width,height,quality)=>{
   calls.push({width,height,quality});
   return {size:calls.length===1?740*1024:420*1024,type:'image/webp'};
  }
 });
 assert.equal(result.compressedBytes,420*1024);
 assert.equal(result.mime,'image/webp');
 assert.ok(result.compressedBytes<=FLYER_TARGET_BYTES_V207);
 assert.ok(result.reductionPercent>80);
 assert.deepEqual(calls.map(x=>[x.width,x.height]),[[1800,1200],[1800,1200]]);
 assert.ok(closed,'decoded bitmap should always be closed');
});
test('low-size original still transcodes to WebP (never uploads JPEG)',async()=>{
 let attempts=0;
 const result=await optimizeFlyerV207(source(40000,'image/jpeg'),{
  decode:async()=>({image:{},width:800,height:500,close:()=>{}}),
  encode:async()=>{attempts++;return {size:28000,type:'image/webp'}}
 });
 assert.equal(attempts,1);
 assert.equal(result.compressedBytes,28000);
});
test('unsupported WebP encoder fails closed rather than uploading PNG or original',async()=>{
 await assert.rejects(optimizeFlyerV207(source(),{
  decode:async()=>({image:{},width:1000,height:700,close:()=>{}}),
  encode:async()=>({size:50000,type:'image/png'})
 }),/WebP conversion did not produce/);
 await assert.rejects(optimizeFlyerV207(source(),{
  decode:async()=>({image:{},width:3000,height:2000,close:()=>{}}),
  encode:async()=>({size:900*1024,type:'image/webp'})
 }),/below 800 KB/);
});
test('only optimized WebP Blob is passed to authenticated Supabase Storage',()=>{
 const service=read('src/services/sessionPlanServiceV203.js');
 assert.match(service,/const compressed=await prepareSessionFlyerV207\(file\)/);
 assert.match(service,/key=auth\.user\.id\+'\/'\+crypto\.randomUUID\(\)\+'\.webp'/);
 assert.match(service,/upload\([\s\S]*?compressed\.blob,\{contentType:'image\/webp'/);
 assert.doesNotMatch(service,/\.upload\([^)]*key,file,/);
 assert.match(service,/WeakMap\(\)/);
 const sql=read('supabase/migrations/20261103_gcc_v207_flyer_webp_only.sql');
 assert.match(sql,/allowed_mime_types=ARRAY\['image\/webp'\]/);
 assert.match(sql,/file_size_limit=819200/);
});
test('all 3 forms reuse compressed flyers, show clear preview and status',()=>{
 const planner=read('src/lib/sessionPlannerV203.js');
 const teacher=read('src/pages/teacher/TeacherPortalPage.js');
 const host=read('src/pages/host/SimpleSessionsPage.js');
 const editor=read('src/lib/hostPlanEditorV203.js');
 assert.match(planner,/prepareSessionFlyerV207\(original\)/);
 assert.match(planner,/describeSessionFlyerV207\(result\)/);
 assert.match(planner,/preview\.src=localUrl/);
 assert.match(planner,/flyer\.files\?\.\[0\]!==original/);
 for(const file of [teacher,host,editor])assert.match(file,/uploadSessionFlyerV203\(file|uploadSessionFlyerV203\(flyer/);
 const css=read('src/styles/sessionPlannerV203.css');
 assert.match(css,/gcc207-flyer-preview/);
 assert.match(css,/gcc207-flyer-error/);
 assert.equal(flyerSizeLabelV207(420*1024),'420 KB');
 assert.ok(FLYER_MAX_BYTES_V207===800*1024);
});
