import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const host=read('src/pages/host/SimpleSessionsPage.js');
const page=read('src/pages/public/RoomPlanLookupPage.js');
const css=read('src/styles/sharePlanV104.css');
test('host defaults to a single strong primary action per stage',()=>{
 assert.match(host,/sectionOne/);
 assert.match(host,/sectionTwo/);
 assert.match(host,/gcc-v104-secondary-details/);
 assert.match(host,/Copy invitation \(link \+ code\)/);
});
test('room list is full by default, filter only emphasizes results',()=>{
 assert.match(page,/for\(const room of rooms\)/);
 assert.match(page,/classList\.toggle\('gcc-v104-nonmatch'/);
 assert.doesNotMatch(page,/card\.hidden\s*=/);
});
test('Zoom link host validation and DOM safety',()=>{
 assert.match(page,/u\.hostname==='zoom\.us'/);
 assert.match(page,/noopener noreferrer/);
 assert.doesNotMatch(page,/\.innerHTML|document\.write|localStorage/);
});
test('responsive layout and reduced motion',()=>{
 assert.match(css,/@media\(max-width:670px\)/);
 assert.match(css,/prefers-reduced-motion/);
});
