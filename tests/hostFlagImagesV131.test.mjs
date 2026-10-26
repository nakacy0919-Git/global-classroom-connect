import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('school cards contain real image elements, not regional indicator emoji text',()=>{
 const page=read('src/pages/host/SimpleSessionsPage.js');
 assert.match(page,/document\.createElement\('img'\)/);
 assert.match(page,/image\.src=localFlagsV131\[countryCode\]/);
 assert.match(page,/schoolFlagImageV131\(s\)/);
 assert.doesNotMatch(page,/el\('span','gcc-v130-school-flag',flagForCountryV130/);
 assert.match(page,/image\.alt='Flag of '/);
});
test('Indonesia, Philippines, Sri Lanka, Japan and Bangladesh flags are bundled locally',()=>{
 const page=read('src/pages/host/SimpleSessionsPage.js');
 for(const code of ['JP','PH','LK','ID','BD']){
  const file=code.toLowerCase();
  assert.match(page,new RegExp(file+'FlagV131'));
  const svg=read('src/assets/room-flags/'+file+'.svg');
  assert.match(svg,/<svg\s/);
  assert.match(svg,/viewBox=/);
 }
});
test('fallback is an SVG, remote optional flags are constrained to ISO-two-letter codes',()=>{
 const page=read('src/pages/host/SimpleSessionsPage.js');
 assert.match(page,/\^\[A-Z\]\{2\}\$/);
 assert.match(page,/flagcdn\.com\/w80\//);
 assert.match(page,/image\.onerror=\(\)=>\{image\.onerror=null;image\.src=unknownFlagV131;\}/);
 assert.match(read('src/assets/room-flags/unknown.svg'),/<svg\s/);
});
test('flag design is independent of operating system emoji fonts',()=>{
 const css=read('src/styles/hostBentoV130.css');
 assert.match(css,/\.gcc-v131-flag-img/);
 assert.match(css,/object-fit:contain/);
 assert.doesNotMatch(css,/Segoe UI Emoji/);
});
