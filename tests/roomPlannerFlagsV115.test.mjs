import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/components/RoomPlannerV9.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles/roomPlannerV9.css',import.meta.url),'utf8');
test('host planner uses bundled local country flag assets',()=>{
 assert.ok(source.includes('countryFlagAssetV131(country,countryCode)'));
 const helper=fs.readFileSync(new URL('../src/lib/countryFlagAssetsV131.js',import.meta.url),'utf8');
 assert.ok(helper.includes('world-flags-v131/*.svg'));
});
test('flag and country text are both shown for student',()=>{
 assert.ok(source.includes('metadata.append(plannerCountryFlagV115(st.country,st.countryCode)'));
 assert.ok(source.includes('`${st.country} · ${st.school}`'));
});
test('student flag is decorative and styled',()=>{
 assert.ok(source.includes("flag.alt=''"));
 assert.ok(source.includes("flag.setAttribute('aria-hidden','true')"));
 assert.ok(css.includes('gcc-v115-country-flag'));
});
test('existing planner actions remain intact',()=>{
 for(const label of ['Shuffle again','Move students','Download CSV','Save arrangement','renderPreview'])assert.ok(source.includes(label),label);
});
