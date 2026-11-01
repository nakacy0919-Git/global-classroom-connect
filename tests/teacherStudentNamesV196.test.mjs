import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanStudentNameV196} from '../src/lib/teacherStudentNamesV196.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261101_teacher_student_name_edit_v196.sql');
const ui=read('src/lib/roomToolsV106.js');
const service=read('src/services/teacherRoomEditV106.js');
const css=read('src/styles/teacherStudentNamesV196.css');

test('English names are validated identically to the existing server rule',()=>{
 for(const name of ['Amy Smith',"O'Connor",'Maria-Jose','A. B.','Li'])
  assert.equal(cleanStudentNameV196(' '+name+' '),name);
 for(const name of ['', 'A','123 Joe','Amy<svg>', '太郎 山田', 'Anna_Lee','A'.repeat(121)])
  assert.throws(()=>cleanStudentNameV196(name),/English letters/);
});

test('teacher mode shows current school roster with inline Save and Cancel',()=>{
 assert.match(ui,/Correct student names/);
 assert.match(ui,/for\(const student of students\)/);
 assert.match(ui,/Edit student name:/);
 assert.match(ui,/renameTeacherStudentV196\(credentials,studentId,expectedName,newName\)/);
 assert.match(ui,/const fresh=await onRefresh\(getCode\(\)\)/);
 assert.match(ui,/row\.replaceChildren\(input,confirm,cancel\)/);
 assert.match(ui,/textContent=String\(label\)/);
});

test('school scope is enforced server-side using the 4-digit PIN and approved signup',()=>{
 assert.match(sql,/public\.gcc_v108_check_teacher\(p_token, p_code, p_pin\)/);
 assert.match(sql,/st\.id=p_student_id AND st\.signup_id=v_signup/);
 assert.match(sql,/s\.event_id=v_event AND s\.status='approved'/);
 assert.match(sql,/FOR UPDATE OF st/);
 assert.match(sql,/v_old IS DISTINCT FROM p_expected_name/);
 assert.match(sql,/public\.gcc_v7_english_name\(v_new\)/);
 assert.match(sql,/lower\(btrim\(st\.display_name\)\)=lower\(v_new\)/);
});

test('changes preserve student IDs, room drafts, protected pairs and other sessions',()=>{
 assert.match(sql,/UPDATE public\.gcc_session_signup_students\s+SET display_name=v_new\s+WHERE id=p_student_id AND signup_id=v_signup/);
 assert.doesNotMatch(sql,/UPDATE public\.gcc_v91_room_drafts/i);
 assert.doesNotMatch(sql,/UPDATE public\.gcc_v106_locked_pairs/i);
 assert.doesNotMatch(sql,/UPDATE public\.participants/i);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.gcc_v196_student_name_audit/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.gcc_v196_student_name_audit/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v196_rename_student/);
 assert.match(service,/gcc_v196_rename_student/);
 assert.match(service,/p_expected_name:previousName,p_new_name:newName/);
});

test('mobile name correction remains accessible without altering printed chart',()=>{
 assert.match(css,/min-height:44px/);
 assert.match(css,/font-size:16px/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/@media print/);
});
