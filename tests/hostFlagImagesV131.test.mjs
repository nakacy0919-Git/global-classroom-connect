import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {countries} from '../src/data/countries.js';
import {countryCodeForFlagV131,gccFlagCountriesV131} from '../src/lib/countryFlagCodeV131.js';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all 197 GCC countries and territories have locally bundled SVG flag artwork',()=>{
 assert.equal(countries.length,197);
 assert.equal(gccFlagCountriesV131.length,197);
 assert.equal(new Set(countries.map(c=>c.code)).size,197);
 for(const c of countries){
  const svg=read('src/assets/world-flags-v131/'+c.code.toLowerCase()+'.svg');
  assert.ok(svg.includes('<svg'),c.code);
  assert.ok(svg.includes('viewBox='),c.code);
  assert.doesNotMatch(svg,/<script[\s>]/i);
  assert.equal(countryCodeForFlagV131(c.name,c.code),c.code);
  assert.equal(countryCodeForFlagV131(c.name),c.code);
 }
});
test('all flags are loaded by Vite from local files, not dependent on browser emoji or remote CDN',()=>{
 const source=read('src/lib/countryFlagAssetsV131.js');
 assert.ok(source.includes('import.meta.glob'));
 assert.ok(source.includes('world-flags-v131/*.svg'));
 assert.ok(source.includes('countryCodeForFlagV131'));
 assert.ok(!source.includes('flagcdn'));
 assert.ok(!source.includes('countryFlagEmoji'));
 assert.ok(read('src/assets/world-flags-v131/LICENSE.txt').includes('MIT License'));
});
test('host registration, room planner and public room sheets use the same local image resolver',()=>{
 const host=read('src/pages/host/SimpleSessionsPage.js');
 const planner=read('src/components/RoomPlannerV9.js');
 const guest=read('src/pages/public/RoomPlanLookupPage.js');
 for(const code of [host,planner,guest]){
  assert.ok(code.includes('countryFlagAssetV131'));
  assert.ok(!code.includes('countryFlagEmoji'));
  assert.ok(!code.includes('flagcdn.com'));
 }
 assert.ok(host.includes('schoolFlagImageV131(s)'));
 assert.ok(planner.includes('plannerCountryFlagV115(st.country,st.countryCode)'));
 assert.ok(guest.includes('img.src=countryFlagAssetV131(country)'));
});
test('time zone cards and the world-country selector share bundled flags',()=>{
 assert.ok(read('src/lib/sessionClockUIV112.js').includes('countryFlagAssetV131(country)'));
 const world=read('src/components/WorldClockPanel.js');
 assert.ok(world.includes('countryFlagAssetV131(country.name,country.code)'));
 assert.ok(!world.includes('flagcdn'));
});
test('Indonesia, Kosovo, Taiwan, Palestine, and Holy See are among the 197 local flags',()=>{
 for(const code of ['ID','XK','TW','PS','VA','JP','PH','LK']){
  assert.equal(countryCodeForFlagV131('',code),code);
  assert.ok(read('src/assets/world-flags-v131/'+code.toLowerCase()+'.svg').includes('<svg'));
 }
 for(const unknown of ['ZZ','','<script>','99']){
  assert.equal(countryCodeForFlagV131('',unknown),'');
 }
});
