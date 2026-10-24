import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canRemoveSessionV105} from '../src/lib/sessionDeletionV105.js';
const ui=readFileSync(new URL('../src/pages/host/SimpleSessionsPage.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../sql/gcc_v105_delete_finished_session.sql',import.meta.url),'utf8');
const service=readFileSync(new URL('../src/services/sessionDeletionV105.js',import.meta.url),'utf8');
const now=Date.parse('2026-10-25T10:00:00Z');
function s(status,time){return {id:'test-id',status,starts_at:time};}
test('only drafts and finished published/completed sessions eligible',()=>{
  assert.equal(canRemoveSessionV105(s('draft','2026-11-01T10:00:00Z'),now),true);
  assert.equal(canRemoveSessionV105(s('published','2026-10-25T07:59:59Z'),now),true);
  assert.equal(canRemoveSessionV105(s('published','2026-10-25T08:01:00Z'),now),false);
  assert.equal(canRemoveSessionV105(s('published','2026-10-26T10:00:00Z'),now),false);
  assert.equal(canRemoveSessionV105(s('live','2026-10-20T10:00:00Z'),now),false);
  assert.equal(canRemoveSessionV105(s('completed','2026-10-23T10:00:00Z'),now),true);
  assert.equal(canRemoveSessionV105(s('completed',null),now),false);
  assert.equal(canRemoveSessionV105({},now),false);
});
test('UI has exact-title confirmation and a separate dangerous action',()=>{
  assert.match(ui,/id="gcc-v105-delete-form"/);
  assert.match(ui,/id="gcc-v105-delete-confirm"/);
  assert.match(ui,/typed!==selected.title/);
  assert.match(ui,/deleteFinishedSessionV105\(selected.id,selected.title\)/);
  assert.match(ui,/canRemoveSessionV105\(e\)/);
});
test('server checks host, title and age before archive/delete',()=>{
  assert.match(sql,/PERFORM public\.gcc_v6_require_host\(\)/);
  assert.match(sql,/v_event\.title IS DISTINCT FROM p_expected_title/);
  assert.match(sql,/interval '2 hours'/);
  assert.match(sql,/deleted_session_archives/);
  assert.match(sql,/DELETE FROM public\.gcc_session_signups/);
  assert.match(sql,/DELETE FROM public\.events/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.gcc_v105_delete_finished_session\(uuid,text\) TO authenticated/);
  assert.doesNotMatch(sql,/DELETE FROM public\.(schools|teachers|participants)\b/i);
});
test('client sends only id and title to protected RPC',()=>{
  assert.match(service,/supabase\.rpc\('gcc_v105_delete_finished_session'/);
  assert.match(service,/p_event_id:eventId,p_expected_title:exactTitle/);
});
