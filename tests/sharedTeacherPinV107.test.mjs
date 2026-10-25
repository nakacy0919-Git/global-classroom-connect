import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('teacher unlock requires one shared code, not an email or identity',()=>{
 const file=read('src/lib/roomToolsV106.js');
 assert.match(file,/Shared 4-digit Teacher Mode code/);
 assert.doesNotMatch(file,/const nameLabel=/);
 assert.match(file,/const candidate=\{token,code:getCode\(\),pin:pin.value\}/);
 assert.match(file,/Your name \(recorded in the edit history\)/);
});
test('server saves edited name only for the audit, not for unlocking',()=>{
 const file=read('src/services/teacherRoomEditV106.js');
 assert.match(file,/gcc_v107_open_editor/);
 assert.match(file,/p_editor_name:change.editorName/);
 assert.doesNotMatch(file,/p_name:credentials.name/);
});
test('SQL hashes the session code and revokes old editing functions',()=>{
 const file=read('sql/gcc_v107_shared_teacher_pin.sql');
 assert.match(file,/extensions\.crypt\(p_pin,extensions\.gen_salt\('bf',10\)\)/);
 assert.match(file,/REVOKE ALL ON FUNCTION public\.gcc_v106_edit_room/);
 assert.match(file,/gcc_v106_editor_attempts/);
 assert.match(file,/gcc_v107_host_set_shared_pin/);
});
test('host can configure or disable code and sees self-reported audit attribution',()=>{
 const file=read('src/lib/hostRoomAuditV106.js');
 assert.match(file,/Save shared code/);
 assert.match(file,/Disable teacher edits/);
 assert.match(file,/Self-reported name/);
});
