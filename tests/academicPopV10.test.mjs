import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=(p)=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const host=get('src/pages/host/SimpleSessionsPage.js');
const teacher=get('src/pages/public/SharedRegistrationPage.js');
const main=get('src/main.js');
const css=get('src/styles/academicPop.css');
const room=get('src/components/RoomPlannerV9.js');
const teacherSvg=get('src/assets/room-avatars/teacher.svg');
const studentSvg=get('src/assets/room-avatars/student.svg');
test('global design token CSS loads after app import',()=>{
 assert.match(main,/import '\.\/styles\/academicPop\.css'/);
 assert.ok(main.indexOf("import './styles/academicPop.css'")>main.indexOf("import { renderApp } from './app'"));
});
test('V8 host remains one work step at a time',()=>{
 assert.match(host,/dataset\.popStep=String\(activeStage\)/);
 assert.match(host,/gcc-v8-host-panel/);
 assert.match(host,/gcc-v8-host-back/);
 assert.match(host,/gcc-v8-host-next/);
 assert.match(css,/#gcc-v8-create-wrap:not\(\[hidden\]\)/);
});
test('advanced limits remain editable via a real details element',()=>{
 assert.match(host,/el\('details','gcc-v8-config'\)/);
 assert.match(host,/el\('summary','','Edit room settings'\)/);
 assert.match(host,/saveSessionSettings/);
});
test('teacher form is still a private four-step registration',()=>{
 assert.match(teacher,/dataset\.popStep=String\(n\)/);
 for(const id of ['gcc-v8-event','gcc-v8-country','gcc-v8-school','gcc-v8-roster','gcc-v8-submit'])assert.ok(teacher.includes(id));
 assert.match(teacher,/submitSharedRoster/);
 assert.doesNotMatch(teacher,/Invitation code|invitation code/);
});
test('Room Planner V9.1 save/load continues intact',()=>{
 for(const word of ['saveRoomDraft','fetchRoomDraft','Continue saved plan','Move students'])assert.ok(room.includes(word),word);
});
test('posterity: avoid displaying redundant per-student room selectors',()=>{
 assert.match(room,/if\(moveMode\)/);
 assert.match(room,/gcc-v9-move-button/);
 assert.match(css,/\.gcc-v9-student>/);
});
test('SVG role avatars are local editable vector illustrations',()=>{
 assert.match(teacherSvg,/<svg/);assert.match(studentSvg,/<svg/);
 assert.match(teacherSvg,/glasses|circle cx="44"/i);
 assert.match(studentSvg,/backpack|path d="M20 81/i);
 assert.doesNotMatch(teacherSvg,/href="https?:/);
 assert.doesNotMatch(studentSvg,/href="https?:/);
});
test('Academic Pop inherits Shout Spot palette, without whole-screen animation',()=>{
 for(const p of ['--gpop-coral','--gpop-mint','--gpop-paper','--gpop-navy'])assert.ok(css.includes(p));
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/focus-visible/);
 assert.match(css,/body:has\(\.app-shell\)/);
});
