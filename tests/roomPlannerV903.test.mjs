import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {collectApproved,buildRoomDraft,moveStudent,setFacilitator,roomStatistics,exportRoomCSV} from '../src/lib/roomPlannerV9.js';
import {countryIsoCode,countryFlagEmoji} from '../src/lib/roomCountryFlagsV104.js';

class FakeElement {
  constructor(tag='div') {this.tagName=tag;this.className='';this.children=[];this.attributes={};this.listeners={};this._text='';this.value='';this.classList={toggle:(name,enabled)=>{const list=new Set(this.className.split(/\s+/).filter(Boolean));if(enabled)list.add(name);else list.delete(name);this.className=[...list].join(' ');}};}
  set textContent(x){this._text=String(x);this.children=[];}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];this._text='';}
  setAttribute(n,v){this.attributes[n]=String(v);}
  addEventListener(n,fn){this.listeners[n]=fn;}
  emit(n){return this.listeners[n]?.({preventDefault(){},currentTarget:this,target:this});}
  all(predicate){return [...(predicate(this)?[this]:[]),...this.children.flatMap(c=>c.all(predicate))];}
  querySelector(selector){if(selector==='[data-v9-message]')return this.all(x=>'data-v9-message'in x.attributes)[0]||null;throw Error(`Unexpected selector: ${selector}`);}
}
const source=fs.readFileSync(new URL('../src/components/RoomPlannerV9.js',import.meta.url),'utf8');
const transformed=source.replace(/^import .*?;\s*$/gm,'').replace('export function mountRoomPlannerV9','function mountRoomPlannerV9')+'\nmountRoomPlannerV9';
const plannerFlagMockV115 = {
  // The VM intentionally strips Vite imports; supply a mock local flag URL resolver.
  countryFlagAssetV131: (_country,code) => '/test-assets/'+String(code||'unknown').toLowerCase()+'.svg'
};
function mount(){
  const context={document:{createElement:tag=>new FakeElement(tag)},collectApproved,buildRoomDraft,moveStudent,setFacilitator,roomStatistics,exportRoomCSV,console,...plannerFlagMockV115};
  const f=vm.runInNewContext(transformed,context);
  const root=new FakeElement();
  f({root,event:{title:'Test'},settings:{breakout_rooms:2,facilitators_per_room:1},signups:[
    {id:'school1',status:'approved',school_name:'Sakura',country_name:'Japan',country_code:'JP',students:[{id:'st1',name:'Aiko Mori'},{id:'st2',name:'Ken Tanaka'}],facilitators:['Mika Ito']},
    {id:'school2',status:'approved',school_name:'Cebu',country_name:'Philippines',country_code:'PH',students:[{id:'st3',name:'Ana Reyes'},{id:'st4',name:'Maria Cruz'}],facilitators:['Maria Santos']},
  ]});
  return root;
}
const byClass=(root,cls)=>root.all(x=>x.className?.split(' ').includes(cls));
const byTag=(root,tag)=>root.all(x=>x.tagName===tag);
test('Step 1 gives exactly one strong primary generate action',()=>{
  const root=mount();assert.match(root.textContent,/STEP 1 OF 2/);
  assert.equal(byClass(root,'gcc-v9-main-action').length,1);
  assert.match(byClass(root,'gcc-v9-main-action')[0].textContent,/Generate rooms/);
});
test('Student rows stay clean; no repeated destination dropdown in normal preview',()=>{
  const root=mount();const form=byTag(root,'form')[0];form.emit('submit');
  assert.match(root.textContent,/STEP 2 OF 2/);
  assert.equal(byClass(root,'gcc-v9-student').length,4);
  assert.equal(byClass(root,'gcc-v9-move').length,0);
  assert.equal(byClass(root,'gcc-v9-move-button').length,0);
  assert.equal(byClass(root,'gcc-v9-main-action').length,1);
  assert.match(byClass(root,'gcc-v9-main-action')[0].textContent,/Save arrangement/);
  assert.ok(byClass(root,'gcc-v9-outline').some(b=>b.textContent.includes('Download CSV')));
});
test('Move controls appear only on demand, destination excludes the current room, and can move student',()=>{
  const root=mount();byTag(root,'form')[0].emit('submit');
  byClass(root,'gcc-v9-edit-toggle')[0].emit('click');
  assert.equal(byClass(root,'gcc-v9-move-button').length,4);
  assert.equal(byClass(root,'gcc-v9-move').length,0);
  byClass(root,'gcc-v9-move-button')[0].emit('click');
  assert.equal(byClass(root,'gcc-v9-move').length,1);
  const chooser=byClass(root,'gcc-v9-move')[0];
  const options=chooser.children;
  assert.equal(options.length,2,'placeholder and exactly one destination');
  assert.equal(options[0].textContent,'Move to…');
  chooser.value=options[1].value;chooser.emit('change');
  assert.equal(byClass(root,'gcc-v9-student').length,4);
  assert.equal(byClass(root,'gcc-v9-move').length,0);
  assert.match(root.textContent,/moved to Room/);
  byClass(root,'gcc-v9-edit-toggle')[0].emit('click');
  assert.equal(byClass(root,'gcc-v9-move-button').length,0);
});

test('Demo preview guides to a single primary Try moving students action',()=>{
 const context={document:{createElement:tag=>new FakeElement(tag)},collectApproved,buildRoomDraft,moveStudent,setFacilitator,roomStatistics,exportRoomCSV,console,...plannerFlagMockV115};
 const f=vm.runInNewContext(transformed,context);const root=new FakeElement();
 f({root,event:{title:'Demo'},settings:{breakout_rooms:4,facilitators_per_room:1},signups:[]});
 const sampleButton=byClass(root,'gcc-v9-outline').find(b=>b.textContent==='Try with sample students');
 assert.ok(sampleButton);sampleButton.emit('click');
 byTag(root,'form')[0].emit('submit');
 const main=byClass(root,'gcc-v9-main-action');assert.equal(main.length,1);
 assert.match(main[0].textContent,/Try moving students/);main[0].emit('click');
 assert.ok(byClass(root,'gcc-v9-move-button').length>0);
 assert.equal(byClass(root,'gcc-v9-edit-toggle').length,0);
});
