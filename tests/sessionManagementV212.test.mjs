import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionReadinessV212,availableSeatsV212,canRequestV212,requestStatusLabelV212} from '../src/lib/sessionManagementV212.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261103_gcc_v212_teacher_session_management.sql');
const portal=read('src/pages/teacher/TeacherPortalPage.js');
const service=read('src/services/teacherSelfService.js');
const editor=read('src/lib/teacherSessionManagerV212.js');

test('old sessions reveal actual missing fields without fabricated session information',()=>{
 const old={title:'Nov 9 International Classroom Exchange',session_details:{host_country_code:'JP'}};
 const quality=sessionReadinessV212(old);
 assert.equal(quality.ready,false);
 assert.equal(quality.completed,1);
 assert.ok(quality.missing.includes('Educational format'));
 assert.ok(quality.missing.includes('Agenda (at least two activities)'));
 const full={session_details:{session_name:'Global Chat',session_type:'cultural_exchange',
  platform:'zoom',flow:[{time:'13:10',activity:'Welcome'},{time:'13:20',activity:'Chat'}],
  description:'A detailed learning objective for students around the world',
  max_participants:150,registration_closes_at:'2026-11-05T00:00:00Z',min_age:12,max_age:18}};
 assert.deepEqual(sessionReadinessV212(full),{missing:[],completed:8,total:8,ready:true,label:'Ready to host'});
});
test('unavailable capacity never permits sending a speculative request',()=>{
 assert.equal(availableSeatsV212({available_seats:4}),4);
 assert.equal(availableSeatsV212({available_seats:0}),0);
 assert.equal(availableSeatsV212({available_seats:null}),null);
 assert.equal(canRequestV212({status:'open',available_seats:9,is_mine:false}),true);
 assert.equal(canRequestV212({status:'open',available_seats:0,is_mine:false}),false);
 assert.equal(canRequestV212({status:'closed',available_seats:4,is_mine:false}),false);
 assert.equal(canRequestV212({status:'open',available_seats:4,is_mine:true}),false);
 assert.equal(requestStatusLabelV212({status:'approved',reconfirmation_required:true}), 'New schedule · confirmation needed');
});
test('teacher editing is host-scoped and manages all pedagogical session fields',()=>{
 assert.match(editor,/mountPlanFieldsV203\(planSlot,'gcs212plan'\)/);
 assert.match(editor,/teacherManageSession\(offer.id\)/);
 assert.match(editor,/data.teacher_id!==id.id/);
 assert.match(editor,/readPlanV203\(planSlot,'gcs212plan'/);
 assert.match(editor,/teacherEditSession\(\{offerId:current/);
 assert.match(editor,/target_levels:levels/);
 assert.match(editor,/registration deadline/i);
 assert.match(editor,/uploadSessionFlyerV203\(file\)/);
 assert.match(service,/gcc_v212_teacher_manage_session/);
 assert.match(service,/gcc_v212_teacher_edit_session/);
 assert.match(service,/gcc_v212_teacher_reopen_session/);
});
test('teacher join request includes student count and never approves own session',()=>{
 assert.match(portal,/count.type='number'/);
 assert.match(portal,/teacherApply\(o.id,input.value.trim\(\),number\)/);
 assert.match(portal,/if\(o.is_mine\)/);
 assert.match(portal,/canRequestV212\(o\)/);
 assert.match(portal,/Approve & reserve seats/);
 assert.match(portal,/teacherConfirmSchedule\(r.id\)/);
 assert.match(sql,/p_students NOT BETWEEN 1 AND 500/);
 assert.match(sql,/offer.teacher_id=tid THEN RAISE EXCEPTION 'You cannot request your own session'/);
});
test('capacity is guarded by a serialized host row and also by table triggers',()=>{
 assert.match(sql,/SELECT \* INTO offer FROM public.exchange_availability WHERE id=p_offer_id FOR UPDATE/);
 assert.match(sql,/SELECT \* INTO offer FROM public.exchange_availability WHERE id=r.offer_id FOR UPDATE/);
 assert.match(sql,/offer.student_count\+booked\+r.requested_students>max_seats/);
 assert.match(sql,/gcc_v212_approved_capacity_trg/);
 assert.match(sql,/gcc_v212_offer_capacity_guard_trg/);
 assert.match(sql,/requested_students integer NOT NULL DEFAULT 1/);
 assert.match(sql,/max_seats NOT BETWEEN p_student_count\+booked AND 2000/);
});
test('in-app notifications are teacher-scoped and private; external email is not claimed',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public.gcc_teacher_notifications_v212/);
 assert.match(sql,/ALTER TABLE public.gcc_teacher_notifications_v212 ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE public.gcc_teacher_notifications_v212 FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/WHERE teacher_id=tid ORDER BY created_at DESC LIMIT 60/);
 assert.match(sql,/WHERE id=p_notification_id AND teacher_id=tid/);
 assert.match(sql,/gcc_v212_request_notify_trg/);
 assert.match(sql,/gcc_v212_offer_notice_trg/);
 assert.match(sql,/reconfirmation_required=true/);
 assert.match(portal,/teacherNotifications\(\)/);
 assert.match(portal,/Mark read/);
 assert.match(portal,/Automated email is not yet enabled/);
 assert.doesNotMatch(sql,/http_post|resend\.com|smtp/);
});
test('legacy host-managed events show a precise missing-details checklist without inventing content',()=>{
 const editor=read('src/lib/hostPlanEditorV203.js');
 const host=read('src/pages/host/SimpleSessionsPage.js');
 assert.match(editor,/sessionReadinessV212\(event\)/);
 assert.match(editor,/Complete missing session details/);
 assert.match(editor,/readiness.missing.includes\('Agenda \(at least two activities\)'\)/);
 assert.match(editor,/form.querySelector\('#gcc203edit-'\+focus\)\?\.focus\(\)/);
 assert.match(host,/mountHostPlanEditorV203/);
});
test('published events and existing room plans are not modified by this migration',()=>{
 assert.doesNotMatch(sql,/(?:UPDATE|DELETE FROM)\s+public\.(?:events|gcc_v91_room_drafts|gcc_v102_shared_plans|gcc_v104_shared_access|gcc_session_signup_students)\b/i);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public.gcc_teacher_browse_sessions/);
 assert.match(sql,/\(a\.session_details-'meeting_url'\)/);
 assert.match(sql,/approved_guest_students/);
 assert.match(portal,/gcs212-notice-count-home/);
 assert.match(portal,/makeManageCard/);
 const css=read('src/styles/sessionManagementV212.css');
 assert.match(css,/gcs212-dialog/);
 assert.match(css,/max-width:700px/);
});
