import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PIN codes are generated server-side for approved registrations and never returned by status',()=>{
 const sql=read('sql/gcc_v108_school_scoped_teacher_codes.sql');
 assert.match(sql,/extensions\.gen_random_bytes/);
 assert.match(sql,/status='approved'/);
 assert.match(sql,/pin_hash=EXCLUDED\.pin_hash/);
 assert.match(sql,/v_new:=v_new\|\|jsonb_build_array/);
 const status=sql.split('FUNCTION public.gcc_v108_host_status',2)[1].split('END \$fn\$;',1)[0];
 assert.doesNotMatch(status,/pin_hash|pin_lookup|'code',v_pin/);
});
test('PIN resolves one signup and teacher editor returns only its student IDs',()=>{
 const sql=read('sql/gcc_v108_school_scoped_teacher_codes.sql');
 assert.match(sql,/pin_lookup=v_lookup AND c\.enabled/);
 const open=sql.split('FUNCTION public.gcc_v108_open_editor',2)[1].split('END \$fn\$;',1)[0];
 assert.match(open,/s\.id=\(v_auth->>'signup_id'\)::uuid/);
 assert.match(open,/teacher',v_auth->>'teacher'/);
 assert.match(open,/school',v_auth->>'school'/);
});
test('both edited students must belong to the PIN owner on the server',()=>{
 const sql=read('sql/gcc_v108_school_scoped_teacher_codes.sql');
 const edit=sql.split('FUNCTION public.gcc_v108_edit_room',2)[1].split('END \$fn\$;',1)[0];
 assert.match(edit,/st\.id=p_student_a AND st\.signup_id=v_signup/);
 assert.match(edit,/st\.id=p_student_b AND st\.signup_id=v_signup/);
 assert.match(edit,/st\.id=v_partner AND st\.signup_id=v_signup/);
 assert.match(edit,/revision=revision\+1/);
 assert.match(edit,/v_teacher:=v_auth->>'teacher'/);
});
test('old shared PIN routes are revoked and new internal validator is private',()=>{
 const sql=read('sql/gcc_v108_school_scoped_teacher_codes.sql');
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v107_edit_room/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v107_open_editor/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v108_check_teacher/);
 assert.match(sql,/REVOKE ALL ON public\.gcc_v108_teacher_codes/);
});
test('UI identifies teacher automatically, offers clear pair and move actions, no arbitrary identity field',()=>{
 const js=read('src/lib/roomToolsV106.js');
 assert.match(js,/editorData\.teacher/);
 assert.match(js,/students\.length} students you can edit/);
 assert.match(js,/Keep two together/);
 assert.match(js,/Move to a room/);
 assert.doesNotMatch(js,/self-reported name|editorName|Student A.*Student B/);
 const host=read('src/lib/hostRoomAuditV106.js');
 assert.match(host,/Generate missing teacher codes/);
 assert.match(host,/Regenerate code/);
 assert.match(host,/issuedList\.replaceChildren/);
});
