import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Phase 2 pilot tracker has ten anonymized and structurally consistent slots',()=>{
 const csv=read('docs/phase2/participant-tracker-template.csv').trim().split(/\r?\n/);
 assert.equal(csv.length,11);
 const count=csv[0].split(',').length;
 assert.equal(count,18);
 for(let i=1;i<=10;i++){
  const cells=csv[i].split(',');
  assert.equal(cells.length,count);
  assert.equal(cells[0],`P${String(i).padStart(2,'0')}`);
  assert.equal(cells.at(-1),'');
 }
});

test('pilot materials use canonical signup route and explain not-yet-live features',()=>{
 const guide=read('docs/phase2/teacher-guide-en.md');
 const invite=read('docs/phase2/pilot-invitation-en.md');
 const runbook=read('docs/phase2/coordinator-runbook.md');
 for(const str of [guide,invite])assert.match(str,/https:\/\/gcc\.pic-speak-story\.com\/#\/teacher-access/);
 assert.match(guide,/Automatic email notification to hosts is not available/);
 assert.match(invite,/built-in GCC chat are not yet available/);
 assert.match(runbook,/approved-partner-only contact exchange/i);
 assert.match(runbook,/\*\*\[PILOT\]\*\*/);
});
