import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {regionForCountryV247} from '../src/lib/sessionRegionsV247.js';
import {filterSessionRecordsV213} from '../src/lib/sessionSearchV213.js';
test('regional classification matches every country in GCC master',()=>{
 const master=JSON.parse(readFileSync(new URL('../public/country-master.json',import.meta.url),'utf8'));
 for(const c of master.countries)assert.equal(regionForCountryV247(c.code),c.region);
 assert.equal(regionForCountryV247('ZZ'),'');
});
const records=[
 ['jp','JP','Japan','2027-01-02T00:00:00Z'],
 ['gr','GR','Greece','2027-01-01T08:00:00Z'],
 ['ph','PH','Philippines','2027-01-03T01:00:00Z'],
 ['au','AU','Australia','2027-01-01T01:00:00Z'],
 ['us','US','United States','2027-01-04T22:00:00Z']
].map(([id,country_code,country_name,start])=>({id,country_code,country_name,start,end:new Date(Date.parse(start)+3600000).toISOString(),source:'offer',details:{},partner_levels:[]}));
const find=(f)=>filterSessionRecordsV213(records,f,{timezone:'Asia/Tokyo'},Date.parse('2026-11-25')).map(r=>r.id);
test('region filter, chronological sort and local clock sort are independent',()=>{
 assert.deepEqual(find({region:'Asia',sort:'soonest'}),['jp','ph']);
 assert.deepEqual(find({region:'Europe'}),['gr']);
 assert.deepEqual(find({region:'Oceania'}),['au']);
 assert.deepEqual(find({sort:'soonest'}),['au','gr','jp','ph','us']);
 assert.deepEqual(find({sort:'clock'}),['us','jp','au','ph','gr']);
 assert.deepEqual(find({sort:'region'}),['us','jp','ph','gr','au']);
 assert.deepEqual(find({sort:'country'}),['au','gr','jp','ph','us']);
 assert.deepEqual(find({region:'Europe',country:'JP'}),[]);
});
