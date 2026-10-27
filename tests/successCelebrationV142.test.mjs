import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const code=read('src/lib/successCelebrationV142.js');
const css=read('src/styles/successCelebrationV142.css');
const join=read('src/pages/teacher/TeacherJoinV120.js');
const host=read('src/pages/host/SimpleSessionsPage.js');
const room=read('src/components/RoomPlannerV9.js');
const vol=read('src/pages/teacher/VolunteerV117.js');
const portal=read('src/pages/teacher/TeacherPortalPage.js');

test('reusable completion overlay renders a green checkmark and accessible result',()=>{
 for(const s of ['gcc142-icon','gcc142-check','gcc142-title','gcc142-detail','aria-live','aria-atomic','3700']) assert.ok(code.includes(s),s);
 assert.match(code,/\.textContent=String\(title\)/);
 assert.match(code,/\.textContent=String\(detail\)/);
 assert.match(css,/@keyframes gcc142-bounce/);
 assert.match(css,/@keyframes gcc142-draw/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('short sound is generated locally, prepared during click, and optional with a persistent off switch',()=>{
 for(const s of ['export function prepareSuccessChime','audio.resume().catch','createOscillator()','localStorage.getItem','localStorage.setItem','Mute success sounds'])assert.ok(code.includes(s),s);
 assert.doesNotMatch(code,/new Audio\(/);
 assert.match(code,/\.045/);
});
test('status message is only shown after successful profile submission and never claims approval',()=>{
 assert.match(join,/const res=await submitApplicationV120\(payload,photo\.path\);notify\(''\);status\(res\.status\);/);
 assert.match(join,/if\(res.status==='pending'\)showSuccessCelebration/);
 assert.match(join,/will review your application before approval/);
 assert.doesNotMatch(join,/status\(kind\)[^\n]*showSuccessCelebration/);
});
test('host milestones only celebrate after backend completion',()=>{
 for(const text of ['Session created!','Session published!','Room chart published!','Registration approved!'])assert.ok(host.includes("title:'"+text+"'"),text);
 assert.match(host,/await addEvent\(/);
 assert.match(host,/await publishRoomShare\(/);
 assert.match(host,/if\(yes\)showSuccessCelebration/);
});
test('room plan, volunteer registration, and teacher portal milestones reuse the same module',()=>{
 assert.match(room,/await saveRoomDraft\(/);
 assert.match(room,/showSuccessCelebration\(\{title:'Breakout rooms saved!'/);
 assert.match(vol,/await saveVolunteerV117\(/);
 assert.match(vol,/showSuccessCelebration\(\{title:'Welcome to the Global Team!'/);
 for(const text of ['Session published!','Request sent!'])assert.ok(portal.includes("title:'"+text+"'"));
});
test('programmatic celebration shows text and a manual Done dismiss without user secrets',()=>{
 const selectors={};
 const fakeNode=()=>({textContent:'',listeners:{},setAttribute(){},addEventListener(type,cb){this.listeners[type]=cb;},remove(){this.removed=true;},getAttribute(){return null;}});
 const make=()=>{
  const node=fakeNode();
  node.querySelector=(selector)=>selectors[selector]||(selectors[selector]=fakeNode());
  return node;
 };
 const stored=new Map();
 const scope={window:{localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)}},document:{body:{append(node){this.node=node;}},createElement:make},setTimeout(fn){scope.callback=fn;return 1;},clearTimeout(){},AudioContext:undefined};
 const script=code.replace(/^import [^\n]+\n/,'').replaceAll('export function ','function ');
 const api=vm.runInNewContext(script+'\n;({prepareSuccessChime,showSuccessCelebration});',scope);
 api.prepareSuccessChime();
 api.showSuccessCelebration({title:'Application received!',detail:'Pending review'});
 assert.equal(selectors['.gcc142-title'].textContent,'Application received!');
 assert.equal(selectors['.gcc142-detail'].textContent,'Pending review');
 assert.equal(selectors['.gcc142-done'].listeners.click instanceof Function,false); // realm-safe
 assert.equal(typeof selectors['.gcc142-done'].listeners.click,'function');
 selectors['.gcc142-sound'].listeners.click();
 assert.equal(stored.get('gcc_success_sound_v142'),'off');
 scope.callback();
 assert.equal(scope.document.body.node.removed,true);
});
