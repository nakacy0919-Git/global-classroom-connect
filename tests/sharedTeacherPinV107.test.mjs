// V10.7 regression: the old shared-code migration is preserved for history,
// but a V10.8 school-specific PIN must now be the only editing route.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('historical V10.7 migration remains intact and documents previous shared-code behavior',()=>{
 const sql=read('sql/gcc_v107_shared_teacher_pin.sql');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.gcc_v107_shared_teacher_codes/);
 assert.match(sql,/gcc_v107_edit_room/);
 assert.match(sql,/extensions\.crypt/);
});
test('V10.8 no longer exposes the shared PIN editing flow',()=>{
 const sql=read('sql/gcc_v108_school_scoped_teacher_codes.sql');
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v107_edit_room/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v107_open_editor/);
 const ui=read('src/lib/roomToolsV106.js');
 assert.match(ui,/Your own 4-digit code/);
 assert.doesNotMatch(ui,/Shared 4-digit Teacher Mode code/);
 assert.doesNotMatch(ui,/Your name \(recorded in the edit history\)/);
});
test('V10.8 server derives editor identity from approved signup, not user input',()=>{
 const service=read('src/services/teacherRoomEditV106.js');
 assert.match(service,/gcc_v108_open_editor/);
 assert.match(service,/gcc_v108_edit_room/);
 assert.doesNotMatch(service,/p_editor_name/);
});
test('V10.8 host issues distinct codes and can revoke school editing access',()=>{
 const host=read('src/lib/hostRoomAuditV106.js');
 assert.match(host,/Generate missing teacher codes/);
 assert.match(host,/Regenerate code/);
 assert.match(host,/Disable/);
});
