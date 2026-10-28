import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const v6=read('src/pages/public/SessionSignupPage.js');
const v8=read('src/pages/public/SharedRegistrationPage.js');
const gate=read('src/lib/registrationDeviceGateV158.js');
const css=read('src/styles/registrationDeviceGateV158.css');

test('every session registration opens with device requirement before any form step',()=>{
 for(const page of [v6,v8]){
  assert.match(page,/deviceRequirementMarkupV158\(\)/);
  assert.match(page,/bindDeviceRequirementV158\(root\)/);
  assert.match(page,/id="gcc158-register-form" hidden/);
  assert.ok(page.indexOf('deviceRequirementMarkupV158()}')<page.indexOf('id="gcc158-register-form" hidden'));
 }
 assert.doesNotMatch(gate,/localStorage|sessionStorage/);
 assert.match(gate,/form\.hidden=true/);
 assert.match(gate,/if\(completed\|\|gate\.hidden\)return/);
 assert.match(gate,/form\.hidden=false/);
});
test('landscape and portrait infographics show the device rule in clear English',()=>{
 assert.match(gate,/id="gcc158-device-gate"/);
 assert.match(gate,/One student = one device/);
 assert.match(gate,/I Understand — Continue to Registration/);
 assert.match(gate,/type="image\/svg\+xml"/);
 assert.match(gate,/max-width: 800px/);
 for(const filename of ['desktop','mobile']){
  const svg=read('public/assets/device-confirmation/'+filename+'.svg');
  assert.match(svg,/<svg /);
  assert.match(svg,/Before You/);
  assert.match(svg,/Correct/);
  assert.match(svg,/Not correct/);
  assert.match(svg,/Each student/);
  assert.match(svg,/device/);
 }
});
test('tap triggers real existing GCC chime and prominent confirmation pop then registration',()=>{
 assert.match(gate,/playSuccessChime\(\)/);
 assert.match(gate,/gcc158-complete-pop/);
 assert.match(gate,/OK! Confirmed/);
 assert.match(gate,/setTimeout\(/);
 assert.match(gate,/prefers-reduced-motion: reduce/);
 assert.match(gate,/if\(!root\.isConnected\)return/);
 assert.match(gate,/setAttribute\('tabindex','-1'\)/);
});
test('confirmation is on-screen without scrolling on iPhone and Android',()=>{
 assert.match(css,/position:fixed;inset:0/);
 assert.match(css,/100dvh/);
 assert.match(css,/grid-template-rows:auto minmax\(0,1fr\) auto/);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/@media\(max-width:800px\) and \(orientation:portrait\)/);
 assert.match(css,/min-height:50px/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/gcc158-gate\[hidden\]/);
});
test('existing registration RPC and roster validation remain in place',()=>{
 assert.match(v8,/submitSharedRoster\(/);
 assert.match(v8,/parseSimpleRoster\(/);
 assert.match(v6,/submitSessionSignup\(/);
 assert.match(v6,/parseRoster\(/);
});
