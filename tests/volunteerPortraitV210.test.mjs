import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/styles/volunteerGalleryV122.css');
const gallery=read('src/pages/teacher/VolunteerGalleryV122.js');
const compression=read('src/lib/teacherWebpV116.js');

test('volunteer photos have a square frame and never crop teacher faces',()=>{
 const rule=css.slice(css.indexOf('/* GCC V21.0'));
 assert.match(rule,/\.gcc133-person-open \.gcc122-person-photo\s*\{[^}]*aspect-ratio:1\s*\/\s*1;/s);
 assert.match(rule,/\.gcc133-person-open \.gcc122-person-photo img\s*\{[^}]*object-fit:contain;/s);
 assert.match(rule,/object-position:center center/);
 assert.match(rule,/background:radial-gradient/);
 assert.doesNotMatch(rule,/object-fit:cover/);
});
test('profile detail photo also shows the entire portrait instead of cropping it',()=>{
 const rule=css.slice(css.indexOf('/* GCC V21.0'));
 assert.match(rule,/\.gcc133-detail-photo img\s*\{[^}]*object-fit:contain;/s);
 assert.match(gallery,/signedTeacherPhotoV116/);
});
test('country flags are larger and remain bundled local assets rather than external images',()=>{
 assert.match(gallery,/countryFlagAssetV131\(person.country,person.country_code\)/);
 assert.match(gallery,/img\.width=38;img\.height=27/);
 assert.match(css.slice(css.indexOf('/* GCC V21.0')),/\.gcc122-person-location img\s*\{[^}]*width:38px;[^}]*height:27px;/s);
});
test('source teacher photos preserve aspect ratio during original WebP upload',()=>{
 assert.match(compression,/Math\.min\(1,maxEdge\/Math\.max\(photo.width,photo.height\)\)/);
 assert.match(compression,/canvas\.width=Math\.max\(1,Math\.round\(photo.width\*base\*scale\)\)/);
 assert.match(compression,/canvas\.height=Math\.max\(1,Math\.round\(photo.height\*base\*scale\)\)/);
});
