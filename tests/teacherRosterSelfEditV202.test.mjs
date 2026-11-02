import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261102_gcc_v202_teacher_roster_self_edit.sql');
const screen=read('src/lib/roomToolsV106.js');
const service=read('src/services/teacherRoomEditV106.js');
const registration=read('src/pages/public/SharedRegistrationPage.js');
const css=read('src/styles/teacherStudentNamesV196.css');

test('registration does not permit unauthenticated overwrite of another school',()=>{
 assert.match(migration,/public\.gcc_v108_check_teacher\(p_token,p_code,p_pin\)/);
 assert.match(migration,/id=v_signup AND event_id=v_event AND status='approved'/);
 assert.match(migration,/st\.id=p_student_id AND st\.signup_id=v_signup FOR UPDATE/);
 assert.match(migration,/p_action IS NULL OR p_action NOT IN/);
 assert.match(migration,/s\.event_id=v_event AND s\.status='approved'/);
 assert.match(migration,/SET search_path TO ''/);
 assert.match(migration,/REVOKE ALL ON FUNCTION public\.gcc_v202_edit_student/);
 assert.match(migration,/REVOKE ALL ON public\.gcc_v202_roster_audit/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
});

test('teacher can add, correct grade/name and remove students from their own list',()=>{
 assert.match(migration,/p_action IN \('add','edit'\)/);
 assert.match(migration,/p_action='remove' AND v_count<=1/);
 assert.match(migration,/UPDATE public\.participants SET display_name=v_name,grade=nullif/);
 assert.match(migration,/INSERT INTO public\.gcc_session_signup_students/);
 assert.match(migration,/DELETE FROM public\.gcc_session_signup_students/);
 assert.match(migration,/DELETE FROM public\.event_participants WHERE event_id=v_event/);
 assert.match(migration,/NOT EXISTS\(SELECT 1 FROM public\.event_participants WHERE participant_id=v_participant\)/);
 assert.match(migration,/lower\(btrim\(display_name\)\)=lower\(v_name\)/);
 assert.match(migration,/char_length\(v_grade\)>40/);
});

test('changes preserve original room assignments, links, codes, and pair safety',()=>{
 assert.match(migration,/v_rooms:=jsonb_set\(v_rooms,ARRAY\[v_target::text,'students'\]/);
 assert.match(migration,/IF v_member<>v_student_id::text THEN/);
 assert.match(migration,/DELETE FROM public\.gcc_v106_locked_pairs/);
 assert.match(migration,/DELETE FROM public\.gcc_v165_pair_requests/);
 assert.match(migration,/v_saved\.revision<>v_share\.revision/);
 assert.match(migration,/v_saved\.revision<>v_access\.revision/);
 assert.match(migration,/UPDATE public\.gcc_v102_shared_plans SET revision=v_new_revision/);
 assert.match(migration,/UPDATE public\.gcc_v104_shared_access SET revision=v_new_revision/);
 assert.doesNotMatch(migration,/UPDATE public\.gcc_v102_shared_plans SET token_hash/);
 assert.doesNotMatch(migration,/UPDATE public\.gcc_v104_shared_access SET code_hash/);
 assert.match(migration,/Room chart is out of sync/);
});

test('mobile teacher UI offers add, update, remove, and refresh',()=>{
 assert.match(screen,/Manage your student list/);
 assert.match(screen,/saveStudentChange\('add'/);
 assert.match(screen,/saveStudentChange\('edit'/);
 assert.match(screen,/saveStudentChange\('remove'/);
 assert.match(screen,/changeTeacherStudentV202\(credentials/);
 assert.match(screen,/editorData=await openTeacherEditorV106\(credentials\)/);
 assert.match(screen,/const fresh=await onRefresh\(getCode\(\)\)/);
 assert.match(service,/gcc_v202_edit_student/);
 assert.match(css,/\.gcc-v202-add-form/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(registration,/Already registered\? Need to add or correct students\?/);
 assert.match(registration,/Teacher Mode with your personal 4-digit code/);
});
