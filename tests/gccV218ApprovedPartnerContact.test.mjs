import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261104_gcc_v218_partner_contact.sql');
const portal=read('src/pages/teacher/TeacherPortalPage.js');
const svc=read('src/services/teacherSelfService.js');
const ui=read('src/lib/partnerContactsV218.js');

test('private contact table has RLS and cannot be read directly from browser',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.gcc_v218_partner_contacts/);
 assert.match(sql,/ALTER TABLE public\.gcc_v218_partner_contacts ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON public\.gcc_v218_partner_contacts FROM PUBLIC, anon, authenticated/);
 assert.match(sql,/ON DELETE CASCADE/);
 assert.match(sql,/SELECT a\.teacher_id, r\.requesting_teacher_id/);
 assert.match(sql,/r\.status = 'approved'/);
 assert.match(sql,/tid <> host_tid AND tid <> guest_tid/);
 assert.match(sql,/a\.ends_at >= now\(\) - INTERVAL '14 days'/);
 assert.match(sql,/FROM PUBLIC, anon/);
 assert.match(sql,/TO authenticated/);
 assert.doesNotMatch(sql,/GRANT SELECT ON public\.gcc_v218_partner_contacts TO (anon|authenticated)/);
});

test('voluntary contact is only shared through authenticated approved request endpoints',()=>{
 assert.match(svc,/gcc_v218_partner_contacts/);
 assert.match(svc,/gcc_v218_set_partner_contact/);
 assert.match(portal,/if\(r\.status==='approved'\)/);
 assert.match(portal,/mountApprovedPartnerContactV218\(handoff,r\.id\)/);
 assert.match(ui,/p\.textContent|partner\.textContent/);
 assert.match(ui,/Remove my shared contact/);
 assert.match(ui,/Share with this partner/);
 assert.match(ui,/setAttribute\('role','status'\)/);
 assert.doesNotMatch(ui,/innerHTML|setInterval|addEventListener\('message'/);
 assert.doesNotMatch(sql,/pg_cron|CREATE TRIGGER.*email/);
});

test('applicant data is explicitly supplied and existing seat locking stays in legacy function',()=>{
 assert.match(sql,/students_min_age integer/);
 assert.match(sql,/students_max_age integer/);
 assert.match(sql,/p_age_min > p_age_max/);
 assert.match(sql,/public\.gcc_v212_teacher_apply_to_session\(p_offer_id,p_message,p_students\)/);
 assert.match(sql,/LEFT JOIN public\.schools sg ON sg\.id=g\.school_id/);
 assert.match(sql,/sg\.country_name AS guest_country_name/);
 assert.match(sql,/sg\.school_level AS guest_school_level/);
 assert.match(portal,/Youngest participating student age/);
 assert.match(portal,/Oldest participating student age/);
 assert.match(portal,/Participating students: ages/);
 assert.match(svc,/gcc_v218_teacher_apply_to_session/);
 assert.match(portal,/teacherApply\(o\.id,message\.value\.trim\(\),number,minAge,maxAge\)/);
});
