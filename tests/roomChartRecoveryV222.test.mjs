import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/public/RoomPlanLookupPage.js');
const guide=read('src/lib/netiquetteGuideV145.js');
const service=read('src/services/sharePlanV102.js');

test('the same revocable token and six-digit code still gate private room data',()=>{
 assert.match(page,/\^\[a-f0-9\]\{64\}\$/);
 assert.match(page,/\^\[0-9\]\{6\}\$/);
 assert.match(service,/gcc_v112_open_room_chart/);
 assert.match(page,/if\(!data\|\|!Array\.isArray\(data\.rooms\)\)/);
 assert.match(page,/id="gcc-v104-chart" hidden/);
 assert.doesNotMatch(page,/localStorage|sessionStorage|\.innerHTML|document\.write/);
});

test('the server error and the post-verification guide error have different messages',()=>{
 assert.match(page,/const networkProblem=/);
 assert.match(page,/Could not connect to the room-chart service/);
 assert.match(page,/Your code has not been rejected/);
 assert.match(page,/The room-chart service could not complete verification/);
 assert.match(page,/Code not accepted or invitation expired/);
 assert.match(page,/Code verified, but the meeting guidelines could not open/);
 assert.doesNotMatch(page,/Could not open the room chart\. Please try again or contact the host/);
});

test('a failed guide launch can be retried without another authentication attempt',()=>{
 assert.match(page,/id="gcc-v222-guide-retry"[^>]*hidden/);
 assert.match(page,/let verifiedForGuide=null/);
 assert.match(page,/guideRetry\.addEventListener\('click',\(\)=>\{/);
 assert.match(page,/if\(verifiedForGuide\)openVerifiedGuide\(verifiedForGuide\)/);
 assert.match(page,/root\.querySelector\('#gcc-v145-guide'\)\.hidden=true/);
 assert.match(page,/root\.querySelector\('#gcc-v145-room-access'\)\.hidden=false/);
 assert.match(page,/netiquetteGuideV146\.show\(\(\)=>\{/);
 const verification=page.lastIndexOf('await openSharedRoomChart(token,code)');
 const gate=page.lastIndexOf('netiquetteGuideV146.show(');
 const render=page.lastIndexOf('draw(data);');
 assert.ok(verification<gate&&gate<render,'never show private room data before successful server verification and guide completion');
});

test('browser focus/scroll support is optional and cannot prevent guide launch',()=>{
 assert.match(guide,/gate\.scrollIntoView\?\.\(/);
 assert.match(guide,/focusGuideHeading\(\)/);
 assert.match(guide,/gate\.querySelector\('#gcc-v145-guide-title'\)\?\.focus\?\.\(/);
 assert.match(guide,/catch\{\/\* focus is optional/);
 assert.match(guide,/if\(confirm\.firstChild\?\.nodeType===3\)/);
 assert.match(guide,/document\.createTextNode\(buttonLabel\)/);
});

test('no route makes the chart public or weakens the teacher/host editing authorization',()=>{
 assert.match(page,/setupRoomToolsV106\(\{root,token/);
 assert.match(page,/getCode:\(\)=>\$\('gcc-v104-code'\)\.value\.trim\(\)/);
 assert.match(page,/roomFinderV161\.showStart\(\)/);
 assert.match(page,/bindNetiquetteGuideV145\(root,Boolean\(token\)\)/);
 assert.doesNotMatch(page,/skipGuide|bypass|forceOpen/);
});
