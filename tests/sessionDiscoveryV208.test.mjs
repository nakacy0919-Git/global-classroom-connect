import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hostCountryV208,hostEventsAsOffersV208,publishedByCountryV208,totalCapacityV208} from '../src/lib/sessionDiscoveryV208.js';
import {parseFlowV203} from '../src/lib/sessionPlannerV203.js';
import {toUtc,makeSlot} from '../src/lib/matching.js';
import {timeRangeV112} from '../src/lib/sessionTimeV112.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261103_gcc_v208_session_discovery_and_agenda.sql');

test('host country uses explicit organizer metadata, not participant countries or timezone',()=>{
 const japan={id:'a',status:'published',title:'School session',starts_at:'2026-11-09T04:10:00Z',
 ends_at:'2026-11-09T05:00:00Z',timezone:'Asia/Tokyo',
 countries:['Philippines','Korea'],session_details:{host_country_code:'JP',host_country_name:'Japan'}};
 assert.deepEqual(hostCountryV208(japan),{code:'JP',name:'Japan',flag:'🇯🇵'});
 assert.equal(publishedByCountryV208(japan,'JP'),true);
 assert.equal(publishedByCountryV208(japan,'PH'),false);
 assert.equal(hostEventsAsOffersV208([japan])[0].country_code,'JP');
 const unknown={timezone:'Asia/Tokyo',countries:['Japan'],session_details:{}};
 assert.equal(hostCountryV208(unknown).code,'');
 assert.equal(hostEventsAsOffersV208([unknown]).length,0);
});
test('total capacity includes host-school students, not only guest schools',()=>{
 const event={max_students:150,students:93,session_details:{}};
 assert.equal(totalCapacityV208(event),150);
 assert.equal(totalCapacityV208({session_details:{max_participants:80}}),80);
 assert.equal(totalCapacityV208({student_count:20}),null);
});
test('agenda accepts simple free-text timed stages, punctuation optional, first stage flexible',()=>{
 for(const agenda of [
  '13:20 Welcome and introductions\n13:40 Group discussion',
  '13:20 | Welcome and introductions\n13:40 | Group discussion',
  '13:20 - Welcome and introductions\n13:40 – Group discussion',
  '13:20：Welcome and introductions\n13:40 Group discussion',
  '9:05 Welcome and introductions\n9:40 Group discussion'
 ]){
  const morning=agenda.startsWith('9');
  const list=parseFlowV203(agenda,morning?'09:00':'13:10',morning?'10:00':'14:00');
  assert.equal(list.length,2);
  assert.ok(list[0].activity.startsWith('Welcome'));
 }
 assert.throws(()=>parseFlowV203('13:20 Opening activities','13:10','14:00'),/2–20/);
 assert.throws(()=>parseFlowV203('13:40 Group work\n13:20 Welcome','13:10','14:00'),/time order/);
 assert.throws(()=>parseFlowV203('13:20 Group work\n14:20 Closing','13:10','14:00'),/within the session/);
});
test('host and teacher flows now record one clear total capacity and no duplicate goals input',()=>{
 const teacher=read('src/pages/teacher/TeacherPortalPage.js');
 const host=read('src/pages/host/SimpleSessionsPage.js');
 const editor=read('src/lib/hostPlanEditorV203.js');
 assert.match(teacher,/id="gctp-capacity"/);
 assert.match(teacher,/Maximum total participants/);
 assert.doesNotMatch(teacher,/id="gctp-goals"/);
 assert.match(teacher,/max_participants/);
 assert.match(teacher,/scrollToCountryResultsV208/);
 assert.match(teacher,/hostEventsAsOffersV208\(hostEvents\)/);
 assert.match(teacher,/publishedByCountryV208/);
 assert.match(host,/Maximum total participants \(including the host school\)/);
 assert.match(host,/name="host-country"/);
 assert.match(host,/selectedHostCountryV208/);
 assert.match(editor,/max_participants\|\|plan\.preferred_students\|\|event\.max_students/);
 assert.match(sql,/host_country_code/);
 assert.match(sql,/max_students/);
});
test('international teacher accounts use their school timezone and never silently fall back to JST',()=>{
 const eg=makeSlot({date:'2026-11-12',startTime:'13:10',endTime:'14:00',timezone:'Africa/Cairo'});
 const jp=makeSlot({date:'2026-11-12',startTime:'13:10',endTime:'14:00',timezone:'Asia/Tokyo'});
 assert.equal(eg.error,undefined);assert.equal(jp.error,undefined);
 assert.notEqual(eg.startsAt,jp.startsAt);
 assert.match(timeRangeV112(eg.startsAt,eg.endsAt,'Africa/Cairo'),/13:10/);
 assert.match(timeRangeV112(jp.startsAt,jp.endsAt,'Asia/Tokyo'),/13:10/);
 assert.match(sql,/'timezone',s\.timezone/);
 assert.doesNotMatch(sql,/coalesce\(s\.timezone,'Asia\/Tokyo'\)/);
 assert.match(read('src/pages/teacher/TeacherPortalPage.js'),/if\(!identity\.timezone\)/);
});
test('cards are compact and accessible, with prominent flag and short CTA',()=>{
 const s=read('src/styles/findSessionCompactV208.css');
 const teacher=read('src/pages/teacher/TeacherPortalPage.js');
 const host=read('src/pages/host/FindSessionPage.js');
 assert.match(s,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(s,/max-width:100%/);
 assert.match(s,/width:max-content!important/);
 assert.match(s,/@media\(max-width:750px\)/);
 assert.match(teacher,/gcs208-host-country/);assert.match(host,/gcs208-host-country/);
 assert.match(teacher,/gcs208-compact-details/);
 assert.match(host,/publishedByCountryV208/);
});
