import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {countryIsoCode,countryFlagEmoji} from '../src/lib/roomCountryFlagsV104.js';
const page=readFileSync(new URL('../src/pages/public/RoomPlanLookupPage.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/sharePlanV104.css',import.meta.url),'utf8');

test('country identification uses GCC country catalog and common aliases',()=>{
  assert.equal(countryIsoCode('Japan'),'JP');
  assert.equal(countryIsoCode('Philippines'),'PH');
  assert.equal(countryIsoCode('Bangladesh'),'BD');
  assert.equal(countryIsoCode('United States'),'US');
  assert.equal(countryIsoCode('unknown'),'');
  assert.equal(countryFlagEmoji('Japan'),'🇯🇵');
  assert.equal(countryFlagEmoji('Bangladesh'),'🇧🇩');
  assert.equal(countryFlagEmoji('Philippines'),'🇵🇭');
});
test('students and facilitators both use role-specific decorated rows',()=>{
  assert.match(page,/students\.append\(identityRow\(person,'student'/);
  assert.match(page,/support\.append\(identityRow\(f,'teacher'/);
  assert.match(page,/countriesBySchool/);
  assert.match(page,/countryFlag\(country\)/);
  assert.match(page,/countryIsoCode\(country\)/);
  assert.match(css,/room-avatars\/student\.svg/);
  assert.match(css,/room-avatars\/teacher\.svg/);
  assert.doesNotMatch(page,/avatar\.textContent='●'/);
});
test('Zoom link retains strict https domain checking and safe target',()=>{
  assert.match(page,/u\.protocol==='https:'/);
  assert.match(page,/u\.hostname==='zoom\.us'/);
  assert.match(page,/noopener noreferrer/);
  assert.match(page,/gcc-v104-zoom-icon/);
  assert.match(css,/room-icons\/zoom-video\.svg/);
});
test('no student data is loaded until session access code succeeds',()=>{
  assert.match(page,/id="gcc-v104-chart" hidden/);
  assert.match(page,/openSharedRoomChart\(token,code\)/);
  assert.match(page,/if\(!data\|\|!Array\.isArray\(data\.rooms\)\)/);
  assert.match(page,/result\.hidden=false/);
  assert.doesNotMatch(page,/\.innerHTML|document\.write|localStorage|sessionStorage/);
});
test('search, original room list and responsive layout remain',()=>{
  assert.match(page,/for\(const room of rooms\)/);
  assert.match(page,/classList\.toggle\('gcc-v104-nonmatch'/);
  assert.match(css,/@media\(max-width:670px\)/);
  assert.match(css,/prefers-reduced-motion/);
});
test('three tested national flags are bundled locally, not fetched from trackers',()=>{
  for(const name of ['jp','bd','ph']){
    const asset=new URL(`../src/assets/room-flags/${name}.svg`,import.meta.url);
    assert.ok(existsSync(asset),`${name}.svg`);
    const svg=readFileSync(asset,'utf8');
    assert.match(svg,/<svg/);
    assert.doesNotMatch(svg,/https?:\/\/(?!www\.w3\.org)/);
  }
  assert.doesNotMatch(page,/flagcdn|twemoji|cdn\.jsdelivr/);
});
