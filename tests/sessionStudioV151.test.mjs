import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {activeCountriesV151,worldPathV151} from '../src/lib/sessionCountryMapV151.js';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const portal=read('src/pages/teacher/TeacherPortalPage.js');
const css=read('src/styles/sessionStudioV151.css');
const countryMaster=JSON.parse(read('public/country-master.json'));
const sample=JSON.parse(read('public/world.geojson'));
test('Create Session is a guided four-step process without redundant progress bars',()=>{
 assert.match(portal,/data-gctp-form-section="0"/);
 assert.match(portal,/data-gctp-form-section="1"/);
 assert.match(portal,/data-gctp-form-section="2"/);
 assert.match(portal,/data-gctp-form-section="3"/);
 assert.match(portal,/id="gctp-form-step" aria-live="polite"/);
 assert.doesNotMatch(portal,/id="gctp-form-progress"/);
 assert.match(portal,/showFormStep\(Math\.min\(3,formStep\+1\)\)/);
 assert.match(portal,/validateFormStep\(formStep\)/);
 assert.match(portal,/identity\.school/);
 assert.match(portal,/identity\.country/);
 assert.match(portal,/teacherCreateSession\(slot,data\)/);
 assert.match(portal,/\$\('gctp-create'\)\.reset\(\)/);
});
test('Find Session has two clear discovery paths without an inert duplicate search button',()=>{
 assert.match(portal,/id="gctp-discover-time"/);
 assert.match(portal,/id="gctp-discover-map"/);
 assert.match(portal,/id="gctp-find-time-panel"/);
 assert.match(portal,/id="gctp-find-map-panel"/);
 assert.match(portal,/data-gcs151-discovery="time"/);
 assert.match(portal,/data-gcs151-discovery="map"/);
 assert.match(portal,/countryExplorer\.load\(\)/);
 assert.match(portal,/discoverMode==='time'\?from:''/);
 assert.match(portal,/discoverMode==='map'\?\$\('gctp-find-country'\)\.value:''/);
 assert.doesNotMatch(portal,/id="gctp-find-button"/);
 assert.match(portal,/gctp-reset-filters/);
});
test('active country pins are grounded only in published future partner offers',()=>{
 const t=Date.parse('2026-10-28T00:00:00Z');
 const iso='2026-11-12T12:00:00Z';
 const countries=activeCountriesV151([
  {country_code:'PH',country_name:'Philippines',status:'open',ends_at:iso,is_mine:false},
  {country_code:'PH',country_name:'Philippines',status:'open',ends_at:iso,is_mine:false},
  {country_code:'JP',country_name:'Japan',status:'open',ends_at:iso,is_mine:true},
  {country_code:'LK',country_name:'Sri Lanka',status:'closed',ends_at:iso,is_mine:false},
  {country_code:'MY',country_name:'Malaysia',status:'open',ends_at:'2026-01-01T00:00:00Z',is_mine:false},
  {country_code:'INVALID',country_name:'Invalid',status:'open',ends_at:iso,is_mine:false}
 ],t);
 assert.deepEqual(countries,[{code:'PH',name:'Philippines',count:2}]);
 assert.ok(countryMaster.countries.some(c=>c.code==='PH'&&Number.isFinite(c.lat)&&Number.isFinite(c.lon)));
});
test('world map renders grounded GeoJSON, clickable pins and an accessible country list',()=>{
 assert.equal(sample.type,'FeatureCollection');
 assert.ok(sample.features.length>100);
 const first=sample.features.find(f=>f.geometry?.type==='Polygon');
 assert.match(worldPathV151(first.geometry),/^M/);
 assert.match(worldPathV151(first.geometry),/L/);
 assert.equal(worldPathV151({type:'Point',coordinates:[1,2]}),'');
 const module=read('src/lib/sessionCountryMapV151.js');
 assert.match(module,/fetch\('\/world\.geojson'/);
 assert.match(module,/fetch\('\/country-master\.json'/);
 assert.match(module,/aria-pressed/);
 assert.match(module,/ev\.key!=='Enter'/);
 assert.match(module,/countryChip/);
 assert.match(module,/No open sessions/);
 assert.match(css,/gcs151-world-pin/);
 assert.match(css,/@media\(max-width:540px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
