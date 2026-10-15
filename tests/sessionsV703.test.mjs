import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../src/pages/host/SessionsPage.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/sessionsV7.css',import.meta.url),'utf8');
// Evaluate only the template-producing module code, with imports removed.
const htmlSource=code.replace(/^import .*;\s*$/gm,'').replace('export function SessionsPage()', 'function SessionsPage()').replace('export function bindSessionsPage()', 'function bindSessionsPage()')+'\nSessionsPage()';
const html=vm.runInNewContext(htmlSource);
test('single session selector replaces duplicate event card listing',()=>{
  assert.match(html,/id="gcc-s7-picker"/);
  assert.doesNotMatch(html,/id="gcc-s7-events"/);
  assert.match(code,/picker\.value=selectedEventId/);
});
test('four guided steps keep their original route handlers',()=>{
  for(const key of ['prepare','registrations','rooms','share'])assert.match(html,new RegExp(`data-s7-tab="${key}"`));
  for(const fn of ['paintPrepare','paintRegistrations','paintRooms','paintShare','openEditor'])assert.match(code,new RegExp(`function ${fn}\\(`));
});
test('all bound form elements remain available',()=>{
  const ids=new Set([...html.matchAll(/\bid="(gcc-s7-[\w-]+)"/g)].map(x=>x[1]));
  // Elements created when a tab is opened are deliberately not in the template.
  for(const id of ['gcc-s7-new','gcc-s7-create-form','gcc-s7-picker','gcc-s7-selected','gcc-s7-panel','gcc-s7-metrics','gcc-s7-edit-wrap','gcc-s7-edit-teacher'])assert.ok(ids.has(id),id);
  assert.match(code,/gcc-s7-new-secret/);
  assert.match(code,/reviewSessionSignup/);
  assert.match(code,/updateRegistrationNames/);
});
test('only Sessions route gets global theme and mobile adapts',()=>{
  assert.match(css,/body:has\(\.gcc-s7\)/);
  assert.match(css,/\.gcc-s7-session-strip/);
  assert.match(css,/@media\(max-width:520px\)/);
  assert.doesNotMatch(code,/function paintShare Plan|function paintSchools & Students/);
});
