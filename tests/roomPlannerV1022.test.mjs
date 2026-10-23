import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const host = readFileSync(new URL('../src/components/RoomPlannerV9.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles/academicPop.css', import.meta.url), 'utf8');
test('demo uses one clear notice and a way back to registrations', () => {
  assert.match(host, /Demo mode — practice only/);
  assert.match(host, /Review registrations/);
  assert.match(host, /getElementById\('gcc-v8-host-back'\)/);
  assert.match(host, /if\(sample\)\{shell\.append\(demoNotice\(\)\);\}/);
  assert.match(host, /if\(sample\)shell\.append\(demoNotice\(true\)\);/);
});
test('Step 3 host Next is hidden and footer does not cover Generate', () => {
  assert.match(styles, /\[data-pop-step="2"\] \.gcc-v8-footer\s*\{\s*position:\s*static\s*!important/);
  assert.match(styles, /\[data-pop-step="2"\] #gcc-v8-host-next\s*\{\s*display:\s*none\s*!important/);
  assert.match(host, /Generate rooms →/);
});
test('share becomes the primary action only after a real save', () => {
  assert.match(host, /if\(!sample\)\{\s*if\(dirty\)\{/);
  assert.match(host, /Save arrangement →/);
  assert.match(host, /Continue to Share →/);
  assert.match(host, /getElementById\('gcc-v8-host-next'\)\?\.click\(\)/);
  assert.match(host, /data-v91-save/);
});
test('the planner keeps facilitator, move and CSV controls', () => {
  for (const marker of ['setFacilitator(plan','moveStudent(plan','exportRoomCSV(','fetchRoomDraft(','saveRoomDraft(','gcc-v9-rooms']) {
    assert.ok(host.includes(marker), marker);
  }
});
