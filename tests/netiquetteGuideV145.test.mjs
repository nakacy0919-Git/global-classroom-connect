import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/public/RoomPlanLookupPage.js');
const guide=read('src/lib/netiquetteGuideV145.js');
const css=read('src/styles/netiquetteGuideV145.css');
test('the six-digit code is verified BEFORE the guide, while private chart rendering waits',()=>{
 assert.match(page,/netiquetteGuideMarkupV145\(\)/);
 assert.match(page,/bindNetiquetteGuideV145\(root,Boolean\(token\)\)/);
 assert.match(page,/id="gcc-v145-room-access">/);
 assert.match(guide,/id="gcc-v145-guide"[^>]*hidden/);
 assert.match(guide,/gate.hidden=true;\s*access.hidden=false/);
 assert.match(page,/if\(!data\|\|!Array\.isArray\(data\.rooms\)\)/);
 const verify=page.lastIndexOf('await openSharedRoomChart(token,code)');
 const guideCall=page.lastIndexOf('netiquetteGuideV146.show(');
 const draw=page.lastIndexOf('draw(data);');
 assert.ok(verify>=0&&verify<guideCall&&guideCall<draw,'API verification precedes guide and chart draw');
 for(const id of ['gcc-v104-code','gcc-v104-chart','gcc-v104-unlock'])assert.match(page,new RegExp(id));
});
test('five slides match the overview and four topic graphics',()=>{
 assert.equal((guide.match(/\{title:/g)||[]).length,5);
 for(const title of ['Zoom Netiquette','Camera & Sound','Your Zoom Name','Good Online Manners','How to Join a Breakout Room'])assert.ok(guide.includes(title));
 assert.match(guide,/desktop-\$\{number\}\.webp/);
 assert.match(guide,/mobile-\$\{number\}\.webp/);
 assert.match(css,/aspect-ratio:16\/9/);
 assert.match(css,/aspect-ratio:9\/16/);
});
test('repeat visitors may skip but first visitors cannot and per-browser confirmation is versioned',()=>{
 assert.match(guide,/gcc-netiquette-v145-confirmed/);
 assert.match(guide,/skip.hidden=!isGuideConfirmedV145\(storage\)/);
 assert.match(guide,/isGuideConfirmedV145\(storage\)\)finish\(\)/);
 assert.match(guide,/markGuideConfirmedV145\(storage\)/);
 assert.match(guide,/localStorage/);
});
test('invalid links fail immediately and original revocable code gate remains',()=>{
 assert.match(guide,/if\(!validInvitation\)return \{show:\(\)=>false\}/);
 assert.match(page,/\^\[a-f0-9\]\{64\}\$/);
 assert.match(page,/\^\[0-9\]\{6\}\$/);
 assert.match(page,/openSharedRoomChart\(token,code\)/);
});

test('per-slide confirmation animation advances and renders the chart only after all five slides',()=>{
 assert.match(guide,/id="gcc-v146-complete"/);
 assert.match(guide,/completedBadge.hidden=false/);
 assert.match(guide,/completedBadge.classList.add\('gcc-v146-pop'\)/);
 assert.match(guide,/confirm.disabled=true/);
 assert.match(guide,/index===NETIQUETTE_SLIDES_V145.length-1/);
 assert.match(guide,/index\+\+;\s*draw\(\)/);
 assert.match(guide,/markGuideConfirmedV145\(storage\);\s*finish\(\)/);
 assert.match(guide,/callback\?\.\(\)/);
 assert.match(css,/@keyframes gcc-v146-confirm-pop/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('all ten optimized source images are bundled and have valid WEBP headers',()=>{
 for(const kind of ['mobile','desktop'])for(let i=1;i<=5;i++){
   const file=fs.readFileSync(new URL('../public/assets/netiquette/'+kind+'-'+String(i).padStart(2,'0')+'.webp',import.meta.url));
   assert.equal(file.toString('ascii',0,4),'RIFF');
   assert.equal(file.toString('ascii',8,12),'WEBP');
 }
});
