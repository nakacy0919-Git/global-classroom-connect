import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasUsefulSessionDetailsV203} from '../src/lib/sessionPlannerV203.js';

const page=readFileSync(new URL('../src/pages/public/RoomPlanLookupPage.js',import.meta.url),'utf8');

test('legacy room chart with only capacity and empty plan hides Session details',()=>{
 const legacy={session_type:'',platform:'',max_participants:140,preferred_students:140,flow:[]};
 assert.equal(hasUsefulSessionDetailsV203(legacy),false);
 assert.equal(hasUsefulSessionDetailsV203(null),false);
 assert.equal(hasUsefulSessionDetailsV203({}),false);
 assert.equal(hasUsefulSessionDetailsV203([]),false);
 assert.equal(hasUsefulSessionDetailsV203({max_participants:140}),false);
});

test('substantive session info remains available including the verified meeting link',()=>{
 assert.equal(hasUsefulSessionDetailsV203({session_type:'cultural_exchange',max_participants:140}),true);
 assert.equal(hasUsefulSessionDetailsV203({platform:'zoom'}),true);
 assert.equal(hasUsefulSessionDetailsV203({description:'Explore one another’s cultures'}),true);
 assert.equal(hasUsefulSessionDetailsV203({flow:[{time:'13:10',activity:'Welcome'}]}),true);
 assert.equal(hasUsefulSessionDetailsV203({meeting_url:'https://example.com/meeting'}),true);
 assert.equal(hasUsefulSessionDetailsV203({flyer_url:'https://example.com/flyer.webp'}),true);
 assert.equal(hasUsefulSessionDetailsV203({min_age:12,max_age:18}),true);
 assert.equal(hasUsefulSessionDetailsV203({flow:[]}),false);
});

test('room chart redraw is idempotent and hides placeholder-only details',()=>{
 const method=page.indexOf('function draw(data){');
 const next=page.indexOf('function applyFilter()',method);
 assert.ok(method>=0&&next>method);
 const draw=page.slice(method,next);
 const reset=draw.indexOf('plan.replaceChildren()');
 const conditional=draw.indexOf("if(hasDetails)renderSessionDetailsV203(plan,data.session_details,{privateLink:true})");
 assert.ok(reset>=0&&conditional>reset,'clear stale metadata before each render');
 assert.ok(draw.includes('hasUsefulSessionDetailsV203(data.session_details)'));
 assert.ok(draw.includes("$('gcc203-room-session-section').hidden=!hasDetails"));
 assert.ok(page.includes('id="gcc203-room-session-section"'));
 assert.ok(page.includes('aria-label="Session information" hidden'));
 assert.ok(draw.includes('list.replaceChildren()'),'breakout room list still redraws normally');
});
