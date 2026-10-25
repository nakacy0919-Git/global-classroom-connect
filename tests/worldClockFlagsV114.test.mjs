import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const clock=readFileSync(new URL('../src/lib/sessionClockUIV112.js',import.meta.url),'utf8');
const toolbar=readFileSync(new URL('../src/lib/roomToolsV106.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/roomToolbarV114.css',import.meta.url),'utf8');
test('world clocks use local SVG flags for Japan Philippines Sri Lanka Bangladesh',()=>{
 for(const flag of ['jp.svg','ph.svg','lk.svg','bd.svg'])assert.ok(clock.includes(flag),flag);
 assert.ok(clock.includes('clockCountryHeadingV114(item)'));
 assert.ok(clock.includes("img.alt=country+' flag'"));
});
test('world clocks still display original date and timezone conversion',()=>{
 assert.ok(clock.includes('timePartsV112(session.starts_at,item.zone)'));
 assert.ok(clock.includes('analogStartClockV112(session.starts_at,item.zone)'));
});
test('toolbar preserves all four live handlers with icons and split left/right grouping',()=>{
 for(const label of ['Compact overview','Print A4 landscape','Teacher Mode','Host Mode']) assert.ok(toolbar.includes(label));
 for(const icon of ['expand','print','settings'])assert.ok(toolbar.includes("toolbarIconV114('"+icon+"')"));
 assert.ok(toolbar.includes('viewActions.append(compact,print)'));
 assert.ok(toolbar.includes('editActions.append(teacher,hostMode)'));
 assert.ok(toolbar.includes('toolbar.append(viewActions,editActions)'));
});
test('A4 printing and mobile styles remain supported',()=>{
 assert.ok(css.includes('@media print'));
 assert.ok(css.includes('@media(max-width:840px)'));
});
