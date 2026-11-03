import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {countryFlagSrcV209,schoolLevelV209,sessionTimeLabelsV209} from '../src/lib/sessionVisualV209.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('flags always have an image source, including a local image for Japan',()=>{
 assert.equal(countryFlagSrcV209('JP'),'/assets/flags/jp.svg');
 assert.equal(countryFlagSrcV209('EG'),'https://flagcdn.com/w80/eg.png');
 assert.equal(countryFlagSrcV209('PH'),'https://flagcdn.com/w80/ph.png');
 assert.equal(countryFlagSrcV209('bad-input'),'');
 assert.match(read('public/assets/flags/jp.svg'),/<circle/);
 const component=read('src/lib/sessionVisualV209.js');
 assert.match(component,/img\.src=countryFlagSrcV209/);
 assert.match(component,/img\.onerror=/);
});
test('school level is based on host information, never accepted partner grades',()=>{
 assert.equal(schoolLevelV209({title:'Showa High School'}).label,'High School');
 assert.equal(schoolLevelV209({title:'City Middle School'}).label,'Middle School');
 assert.equal(schoolLevelV209({title:'Global Elementary School'}).label,'Elementary School');
 assert.equal(schoolLevelV209({age_band:'University'}).label,'College / University');
 assert.equal(schoolLevelV209({session_details:{target_levels:['University']},title:'Unspecified meeting'}).known,false);
});
test('date and hours use the teacher local zone, not unconverted UTC',()=>{
 const start='2026-11-09T04:10:00Z',end='2026-11-09T05:10:00Z';
 const jp=sessionTimeLabelsV209(start,end,'Asia/Tokyo'),eg=sessionTimeLabelsV209(start,end,'Africa/Cairo');
 assert.equal(jp.hours,'13:10–14:10');
 assert.notEqual(jp.hours,eg.hours);
 assert.match(jp.day,/Nov/);
});
test('find UI opens with a choice dialog and only reveals timing/map filters inside secondary dialog',()=>{
 const teacher=read('src/pages/teacher/TeacherPortalPage.js');
 assert.match(teacher,/id="gctp-search-choice"/);
 assert.match(teacher,/id="gctp-find-time-panel" class="gcs151-discover-panel gcs209-search-dialog"/);
 assert.match(teacher,/id="gctp-find-map-panel" class="gcs151-discover-panel gcs209-search-dialog/);
 assert.match(teacher,/openSearchModal\('gctp-search-choice'\)/);
 assert.match(teacher,/showModal\(\)/);
 assert.match(teacher,/gctp-apply-time/);assert.match(teacher,/gctp-apply-map/);
 assert.match(teacher,/filterSessionRecordsV213\(records,currentSearchFilters\(\),identity\)/);
});
test('request join remains an approval workflow, while managed event roster registration is not repurposed',()=>{
 const teacher=read('src/pages/teacher/TeacherPortalPage.js');
 assert.match(teacher,/🤝 Request Join/);
 assert.match(teacher,/await teacherApply\(o.id,message.value.trim\(\),number\)/);
 assert.match(teacher,/👩‍🏫 Register Students/);
 assert.match(teacher,/session-register\?session=/);
 assert.match(teacher,/🔎 View details/);
});
test('visual hierarchy hides duplicate teacher banner, shortens buttons and enlarges date/clock',()=>{
 const css=read('src/styles/sessionVisualV209.css');
 assert.match(css,/gcs209-finding>\.gct-banner\{display:none!important\}/);
 assert.match(css,/\.gcs209-hours\{font-size:1\.35rem/);
 assert.match(css,/max-width:100%!important;width:max-content!important/);
 assert.match(css,/\.gcs209-search-dialog::backdrop/);
 assert.match(css,/\.gcs209-flag-frame img/);
});
