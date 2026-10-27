import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/public/RoomPlanLookupPage.js');
const guide=read('src/lib/netiquetteGuideV145.js');
const css=read('src/styles/netiquetteGuideV145.css');
test('guide is a compulsory first-run gate before the six-digit room chart form',()=>{
 assert.match(page,/netiquetteGuideMarkupV145\(\)/);
 assert.match(page,/bindNetiquetteGuideV145\(root,Boolean\(token\)\)/);
 assert.match(page,/id="gcc-v145-room-access" hidden/);
 assert.match(guide,/access.hidden=true/);
 assert.match(guide,/gate.hidden=false/);
 for(const id of ['gcc-v104-code','gcc-v104-chart','gcc-v104-unlock'])assert.match(page,new RegExp(id));
});
test('five slides match the overview and four topic graphics',()=>{
 assert.equal((guide.match(/\{title:/g)||[]).length,5);
 for(const title of ['Zoom Netiquette','Camera & Sound','Your Zoom Name','Good Online Manners','How to Join a Breakout Room'])assert.ok(guide.includes(title));
 assert.match(css,/netiquette-desktop\.avif/);
 assert.match(css,/netiquette-mobile\.avif/);
 assert.match(css,/aspect-ratio:16\/9/);
 assert.match(css,/aspect-ratio:9\/16/);
});
test('repeat visitors may skip but first visitors cannot and per-browser confirmation is versioned',()=>{
 assert.match(guide,/gcc-netiquette-v145-confirmed/);
 assert.match(guide,/skip.hidden=!completed/);
 assert.match(guide,/if\(isGuideConfirmedV145\(storage\)\)finish\(\)/);
 assert.match(guide,/markGuideConfirmedV145\(storage\)/);
 assert.match(guide,/localStorage/);
});
test('invalid links fail immediately and original revocable code gate remains',()=>{
 assert.match(guide,/if\(!validInvitation\)\{gate.hidden=true;access.hidden=false;return;\}/);
 assert.match(page,/\^\[a-f0-9\]\{64\}\$/);
 assert.match(page,/\^\[0-9\]\{6\}\$/);
 assert.match(page,/openSharedRoomChart\(token,code\)/);
});

test('all ten optimized source images are bundled and have valid WEBP headers',()=>{
 for(const kind of ['mobile','desktop'])for(let i=1;i<=5;i++){
   const file=fs.readFileSync(new URL('../public/assets/netiquette/'+kind+'-'+String(i).padStart(2,'0')+'.webp',import.meta.url));
   assert.equal(file.toString('ascii',0,4),'RIFF');
   assert.equal(file.toString('ascii',8,12),'WEBP');
 }
});
