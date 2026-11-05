import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/lib/sessionCalendarV166.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/sessionCalendarV166.css',import.meta.url),'utf8');
const moduleCode=source.replace(/^import '..\\/styles\\/sessionCalendarV166\\.css';\\s*/,'');
const {mountSessionCalendarV166,sessionDayV166}=await import('data:text/javascript;base64,'+Buffer.from(moduleCode).toString('base64'));

class FakeNode {
 constructor(tag){
  this.tag=tag;this.children=[];this.attributes={};this.className='';this.handlers={};this.textContent='';
  this.classList={add:(name)=>{this.className=(this.className+' '+name).trim();}};
 }
 append(...elements){this.children.push(...elements);}
 replaceChildren(...elements){this.children=[...elements];}
 setAttribute(name,value){this.attributes[name]=value;}
 addEventListener(type,fn){this.handlers[type]=fn;}
 dispatch(type){this.handlers[type]?.();}
}
const originalDocument=globalThis.document;
test('calendar initially opens in viewer current month, not the month of the oldest session',()=>{
 globalThis.document={createElement:tag=>new FakeNode(tag)};
 try{
  const root=new FakeNode('main');
  const date=sessionDayV166(new Date().toISOString(),'Asia/Tokyo');
  const [year,month,day]=date.split('-').map(Number);
  const calendar=mountSessionCalendarV166(root,{zone:'Asia/Tokyo',events:[
   {id:'archived',title:'Archived session',status:'published',starts_at:'2000-01-03T00:00:00Z'}
  ]});
  const shell=root.children[0];
  const caption=shell.children[0].children[1].children[1];
  const expected=new Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:'UTC'})
   .format(new Date(Date.UTC(year,month-1,1)));
  assert.equal(caption.textContent,expected);
  const grid=shell.children[2];
  const todayCells=grid.children.filter(cell=>cell.attributes['aria-current']==='date');
  assert.equal(todayCells.length,1);
  assert.match(todayCells[0].className,/gcc-v166-current-day/);
  assert.equal(todayCells[0].children[0].textContent,String(day));
  calendar.showMonth('2000-01');
  assert.equal(grid.children.some(cell=>cell.attributes['aria-current']==='date'),false);
  const todayButton=shell.children[0].children[1].children[3];
  todayButton.dispatch('click');
  assert.equal(caption.textContent,expected);
  assert.equal(grid.children.filter(cell=>cell.attributes['aria-current']==='date').length,1);
 }finally{globalThis.document=originalDocument;}
});
test('today marker has visible styling, accessibility and timezone-specific date matching',()=>{
 assert.match(source,/aria-current','date'/);
 assert.match(css,/\\.gcc-v166-cell\\.gcc-v166-current-day\\{[^}]*background:/);
 assert.match(css,/\\.gcc-v166-current-day \\.gcc-v166-day\\{[^}]*color:#fff/);
 assert.equal(sessionDayV166('2026-11-04T15:30:00Z','Asia/Tokyo'),'2026-11-05');
});
