import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {collectApproved,buildRoomDraft,moveStudent,setFacilitator,roomStatistics,exportRoomCSV} from '../src/lib/roomPlannerV9.js';

class E {
 constructor(tag='div'){
   this.tagName=tag;this.className='';this.children=[];this.attributes={};this.listeners={};this._text='';this.value='';
   this.classList={toggle:(name,on)=>{const s=new Set(this.className.split(/\s+/).filter(Boolean));if(on)s.add(name);else s.delete(name);this.className=[...s].join(' ');}};
 }
 set textContent(s){this._text=String(s);this.children=[];}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 append(...els){this.children.push(...els);}
 replaceChildren(...els){this.children=[...els];this._text='';}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(k,fn){this.listeners[k]=fn;}
 fire(k){return this.listeners[k]?.({preventDefault(){},target:this,currentTarget:this});}
 find(fn){return [...(fn(this)?[this]:[]),...this.children.flatMap(x=>x.find(fn))];}
 querySelector(selector){if(selector==='[data-v9-message]')return this.find(x=>'data-v9-message' in x.attributes)[0]||null;throw new Error(`Unrecognized selector: ${selector}`);}
}
const source=readFileSync(new URL('../src/components/RoomPlannerV9.js',import.meta.url),'utf8');
const modified=source.replace(/^import .*?;\s*$/gm,'').replace('export function mountRoomPlannerV9','function mountRoomPlannerV9')+'\nmountRoomPlannerV9';
const mountFunction=vm.runInNewContext(modified,{document:{createElement:t=>new E(t)},collectApproved,buildRoomDraft,moveStudent,setFacilitator,roomStatistics,exportRoomCSV,console});
const all=(root,cls)=>root.find(x=>x.className.split(/\s+/).includes(cls));
function preview(facsPerRoom=2){
 const root=new E();mountFunction({root,event:{title:'Sample session'},settings:{breakout_rooms:2,facilitators_per_room:facsPerRoom},signups:[
  {id:'one',status:'approved',school_name:'Sakura',country_name:'Japan',country_code:'JP',students:[{id:'1',name:'Aiko Mori'},{id:'2',name:'Ken Tanaka'}],facilitators:['Mika Ito','Daiki Ono']},
  {id:'two',status:'approved',school_name:'Cebu',country_name:'Philippines',country_code:'PH',students:[{id:'3',name:'Maria Cruz'},{id:'4',name:'Ana Reyes'}],facilitators:['Maria Santos','Ben Cruz']},
 ]});
 const form=root.find(x=>x.tagName==='form')[0];assert.ok(form);form.fire('submit');return root;
}
test('Teacher and student avatars appear in every actual room and person row',()=>{
 const root=preview();
 const cards=all(root,'gcc-v9-room');assert.equal(cards.length,2);
 for(const card of cards){
   assert.equal(all(card,'gcc-v9-person-heading').length,2);
   assert.equal(all(card,'gcc-v9-fac-row').length,2);
   assert.equal(all(card,'gcc-v9-avatar-teacher').length,3,'one header plus two facilitators');
   assert.equal(all(card,'gcc-v9-avatar-student').length,3,'one header plus two students');
 }
 assert.equal(all(root,'gcc-v9-move').length,0,'no room dropdown per student in normal preview');
});
test('Avatars are decorative; people names still plain text and screenreader selects retain labels',()=>{
 const root=preview(1);
 for(const icon of all(root,'gcc-v9-avatar'))assert.equal(icon.attributes['aria-hidden'],'true');
 assert.match(root.textContent,/Aiko Mori/);assert.match(root.textContent,/Maria Cruz/);
 for(const field of all(root,'gcc-v9-fac-row')){
   assert.equal(field.find(x=>x.tagName==='select').length,1);
   assert.ok(field.find(x=>x.tagName==='select')[0].attributes['aria-label']?.includes('facilitator'));
 }
});
test('Avatars remain present when optional move controls are displayed',()=>{
 const root=preview(1);
 all(root,'gcc-v9-edit-toggle')[0].fire('click');
 assert.equal(all(root,'gcc-v9-student').length,4);
 assert.equal(all(root,'gcc-v9-avatar-student').length,6);
 assert.equal(all(root,'gcc-v9-move-button').length,4);
});
test('Vector artwork stays bundled locally and does not require a network request',()=>{
 for(const role of ['teacher','student']){
   const url=new URL(`../src/assets/room-avatars/${role}.svg`,import.meta.url);
   assert.ok(existsSync(url));
   const data=readFileSync(url,'utf8');
   assert.match(data,/^<svg/);assert.match(data,/viewBox="0 0 (64 64|100 100)"/);
   assert.doesNotMatch(data,/<image|<script|href=["']https?:/i);
 }
 const css=readFileSync(new URL('../src/styles/roomPlannerV9.css',import.meta.url),'utf8');
 assert.match(css,/url\('\.\.\/assets\/room-avatars\/teacher\.svg'\)/);
 assert.match(css,/url\('\.\.\/assets\/room-avatars\/student\.svg'\)/);
});
