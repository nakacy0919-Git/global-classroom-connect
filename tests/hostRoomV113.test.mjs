import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('host button and school-only teacher tools remain separated',()=>{
 const s=read('src/lib/roomToolsV106.js');
 assert.match(s,/button\('Host Mode'/);
 assert.match(s,/button\('Teacher Mode'/);
 assert.match(s,/mountHostRoomEditorV113/);
});
test('host uses independent protected RPCs, not school teacher RPC',()=>{
 const s=read('src/lib/hostRoomToolsV113.js');
 assert.match(s,/gcc_v113_host_open/);assert.match(s,/gcc_v113_host_move/);
 assert.doesNotMatch(s,/gcc_v108_edit_room/);
 assert.match(s,/p_expected_revision/);
});
test('room board maintains pairs and allows all schools in host mode',()=>{
 const s=read('src/lib/roomDragV111.js');
 assert.match(s,/boardRowsV111/);assert.match(s,/pairsById/);
 assert.match(s,/host\?null:moveWarningsV111/);
});
test('Sri Lanka flag is bundled, not an unreliable flag emoji',()=>{
 const s=read('src/pages/public/RoomPlanLookupPage.js');
 assert.match(s,/lkFlag/);assert.match(s,/LK:lkFlag/);
 const svg=read('src/assets/room-flags/lk.svg');assert.match(svg,/<svg/);
});
