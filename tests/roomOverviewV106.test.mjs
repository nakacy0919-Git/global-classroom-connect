import test from 'node:test';
import assert from 'node:assert/strict';
import {overviewColumnsV106,buildEditorDiffV106,roomChoiceLabelV106} from '../src/lib/roomOverviewV106.js';
test('room overview supports 20 and 27 rooms',()=>{
 assert.equal(overviewColumnsV106(20),5);
 assert.equal(overviewColumnsV106(27),7);
 assert.equal(overviewColumnsV106(12),3);
});
test('the pair action requires different students',()=>{
 assert.throws(()=>buildEditorDiffV106('pair',{id:'a'},{id:'a'},null,2));
 assert.deepEqual(buildEditorDiffV106('pair',{id:'a'},{id:'b'},null,2),{action:'pair',a:'a',b:'b',revision:2});
});
test('move requires room and saved revision',()=>{
 assert.throws(()=>buildEditorDiffV106('move',{id:'a'},null,0,1));
 assert.throws(()=>buildEditorDiffV106('move',{id:'a'},null,1,0));
 assert.equal(buildEditorDiffV106('move',{id:'a'},null,8,4).room,8);
});
test('unique students can be shown with school and room',()=>{
 assert.match(roomChoiceLabelV106({name:'Airi',school:'Showa',room:3}),/Room 03/);
});
