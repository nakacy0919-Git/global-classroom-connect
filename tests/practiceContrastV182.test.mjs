import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/public/PracticePageV170.js');
const css=read('src/styles/practiceContrastV182.css');
const fullscreen=read('src/styles/practiceFullscreenV181.css');

function luminance(hex) {
 const rgb=[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16)/255)
  .map(x=>x<=0.04045?x/12.92:((x+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
function contrast(a,b) {
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
test('high-contrast CSS is loaded last, after the single-viewport layout CSS',()=>{
 const layout=page.indexOf("import '../../styles/practiceFullscreenV181.css';");
 const theme=page.indexOf("import '../../styles/practiceContrastV182.css';");
 assert.ok(layout!==-1&&theme>layout);
 assert.match(fullscreen,/height:100dvh;min-height:0;max-height:100dvh/);
 assert.match(fullscreen,/overflow-y:auto;overscroll-behavior:contain/);
 for(const forbidden of [/grid-template-(?:columns|rows)\s*:/,/height\s*:\s*100dvh/,/min-height\s*:\s*51px/,/overflow\s*:\s*hidden/]) {
  assert.doesNotMatch(css,forbidden);
 }
});
test('contrast meets at least WCAG AA for text and buttons',()=>{
 for(const [foreground,background,name] of [
  ['#103d7c','#f7fbff','normal stage title'],
  ['#103d7c','#c9e2ff','selected stage title'],
  ['#3c5b7a','#f1f7ff','Japanese supporting text'],
  ['#ffffff','#0758c8','Start button'],
  ['#0e4e9d','#ffffff','navigation'],
  ['#133e70','#e7f2ff','mission text']
 ]){
  assert.ok(contrast(foreground,background)>=4.5,name+' failed: '+contrast(foreground,background).toFixed(2));
  assert.ok(css.includes(foreground)||css.includes(background),name+' style absent');
 }
});
test('all major Practice surfaces receive scoped, visible colors',()=>{
 for(const selector of [
  '.gcc173-explorer .gcc170-stage',
  '.gcc173-explorer .gcc170-stage.gcc173-selected',
  '.gcc173-explorer .gcc170-stage .gcc170-stage-text strong',
  '.gcc177-phrase-panel',
  '.gcc173-preview-badge',
  '.gcc180-mission',
  '.gcc180-mission-controls button[aria-pressed="true"]',
  '.gcc173-phrase-body strong',
  '.gcc173-phrase-body small',
  '.gcc178-accuracy-bar',
  '.gcc178-accuracy-fill',
  '.gcc173-phrase-result',
  '.gcc178-choice-row button',
  '.gcc170-dialog-top',
  '.gcc170-mic-actions #gcc170-start'
 ]){
  assert.ok(css.includes(selector),'missing styled surface '+selector);
 }
 assert.match(css,/@media \(prefers-contrast:more\)/);
 assert.match(css,/:focus-visible/);
});
test('new theme does not change user flow, scores, images or sound settings',()=>{
 for(const token of ["gcc-practice-v170-local","gcc178-practice-content","gcc178-profile-skip",
  "gcc178-stage-image","gcc173-phrase-list","scorePracticePhrase(item.text,text,state.profile)",
  "celebrate(result.accuracy)","gcc180-sound-toggle","gcc178-accuracy-bar"]){
  assert.ok(page.includes(token),token);
 }
 assert.doesNotMatch(css,/localStorage|fetch\(|addEventListener|@import|display\s*:\s*none/);
});
