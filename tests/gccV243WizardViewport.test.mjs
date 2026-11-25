import test from 'node:test';import assert from 'node:assert/strict';
import {wizardViewportV243} from '../src/lib/sessionWizardViewportV243.js';
test('iPad visual viewport keyboard shrink is recognized even when layout height is unchanged',()=>{
 const v=wizardViewportV243({width:1180,height:290,offsetTop:24,offsetLeft:0},{innerWidth:1180,innerHeight:820},true);
 assert.deepEqual(v,{width:1180,height:290,top:24,left:0,compact:true,gap:6,available:278});
});
test('normal size restored and no visualViewport fallback',()=>{
 assert.deepEqual(wizardViewportV243(undefined,{innerWidth:1180,innerHeight:820}),{height:820,width:1180,top:0,left:0,compact:false,gap:14,available:792});
 assert.equal(wizardViewportV243({height:600,width:800},{innerWidth:800,innerHeight:820},true).compact,true);
 assert.equal(wizardViewportV243({height:600,width:800},{innerWidth:800,innerHeight:820},false).compact,false);
});
test('short viewport remains scrollable and invalid values fall back safely',()=>{
 assert.equal(wizardViewportV243({height:170,width:400},{innerWidth:400,innerHeight:700},true).available,158);
 assert.equal(wizardViewportV243({height:0,width:NaN},{innerWidth:820,innerHeight:1180}).available,1152);
});
