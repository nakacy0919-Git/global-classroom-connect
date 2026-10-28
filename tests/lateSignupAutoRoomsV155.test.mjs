import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261028_late_registration_auto_rooms_v155.sql');
const review=read('src/services/sessionRosterService.js');
const host=read('src/pages/host/SimpleSessionsPage.js');
test('late signups still require explicit host approval, and the approval is atomic',()=>{
 assert.match(review,/gcc_v155_review_signup_with_auto_rooms/);
 assert.match(sql,/PERFORM public\.gcc_v6_require_host\(\)/);
 assert.match(sql,/PERFORM public\.gcc_v6_review_signup\(p_signup_id,p_approve\)/);
 assert.match(sql,/IF p_approve THEN[\s\S]*gcc_v155_append_approved_rooms\(event_id\)/);
 assert.match(sql,/RAISE EXCEPTION 'Saved arrangement contains missing or unapproved students/);
 assert.match(sql,/Registration was not approved/);
});
test('confirmed room assignments only append newly approved IDs, never shuffle the full chart',()=>{
 assert.match(sql,/NOT EXISTS\([\s\S]*?member\.id=st\.id::text/);
 assert.match(sql,/SELECT min\(jsonb_array_length\(room\.data->'students'\)\)/);
 assert.match(sql,/ORDER BY random\(\)/);
 assert.match(sql,/IF random\(\)<1\.0\/v_ties/);
 assert.match(sql,/v_rooms:=jsonb_set\(v_rooms,ARRAY\[v_choice::text,'students'\]/);
 assert.match(sql,/v_added:=v_added\+1/);
 assert.doesNotMatch(sql,/DELETE FROM public\.gcc_v91_room_drafts/i);
 assert.doesNotMatch(sql,/UPDATE public\.participants\s+SET/i);
});
test('already seated facilitators remain unchanged; only empty slots may be filled',()=>{
 assert.match(sql,/IF jsonb_typeof\(v_rooms->v_index->'facilitators'->v_slot\)='null'/);
 assert.match(sql,/v_added_fac:=v_added_fac\+1/);
});
test('live share link and six-digit code remain valid after room revision increases',()=>{
 assert.match(sql,/gcc_v91_save_room_draft\(p_event_id/);
 assert.match(sql,/UPDATE public\.gcc_v102_shared_plans[\s\S]*SET revision=v_new_revision/);
 assert.match(sql,/UPDATE public\.gcc_v104_shared_access[\s\S]*SET revision=v_new_revision/);
 assert.doesNotMatch(sql,/SET\s+(token_hash|code_hash|publication_hash|zoom_url|expires_at)\s*=/i);
 assert.match(sql,/rev(ision)?=v_saved\.revision/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.gcc_v155_append_approved_rooms\(uuid\) FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v155_review_signup_with_auto_rooms\(uuid,boolean\) TO authenticated/);
});
test('host is told when new students were placed without moving any existing roommate',()=>{
 assert.match(host,/outcome\?\.auto_assigned===true/);
 assert.match(host,/existing rooms/);
 assert.match(host,/six-digit access code remain valid/);
 assert.match(host,/Existing classmates stayed in their assigned rooms/);
});
