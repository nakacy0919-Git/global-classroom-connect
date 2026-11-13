import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyRegistrationSnapshotV226,GCC226_STAGES} from '../src/lib/registrationConsoleDataV226.js';

const rows=[
 {name:'Yuki',email:'yuki@example.jp',school:'Tokyo High',status:'approved',country:'Japan',country_code:'JP'},
 {name:'Ana',email:'ana@example.br',school:'Rio School',status:'pending',country:'Brazil',country_code:'BR'},
 {name:'Alex',email:'alex@example.com',school:'',status:'email_unconfirmed'},
 {name:'Ken',email:'ken@example.jp',school:'Nagoya High',status:'approved',country:'Japan',country_code:'JP'},
 {name:'Bea',email:'bea@example.br',school:'Sao Paulo School',status:'rejected',country:'Brazil',country_code:'BR'},
];
test('legacy 200-account fallback keeps precise status counts and does not mutate input',()=>{
 const clone=JSON.stringify(rows);
 const snapshot=legacyRegistrationSnapshotV226(rows);
 assert.equal(snapshot.stats.total,5);
 assert.equal(snapshot.stats.approved,2);
 assert.equal(snapshot.stats.pending,1);
 assert.equal(snapshot.stats.rejected,1);
 assert.equal(snapshot.stats.email_unconfirmed,1);
 assert.equal(JSON.stringify(rows),clone);
 assert.equal(snapshot.legacy,true);
 assert.equal(snapshot.countries[0].total,2);
});
test('case insensitive teacher, country, and school filters combine with pagination',()=>{
 const result=legacyRegistrationSnapshotV226(rows,{search:'HiGH',country:'JP',status:'approved',page:2,pageSize:1});
 assert.equal(result.total_matches,2);
 assert.equal(result.page,2);
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].name,'Ken');
});
test('unknown countries and invalid statuses are handled safely',()=>{
 const result=legacyRegistrationSnapshotV226(rows,{country:'__UNKNOWN',pageSize:8});
 assert.equal(result.items.length,1);
 assert.equal(result.items[0].name,'Alex');
 assert.equal(result.countries.find(c=>c.code==='').name,'Not provided');
 assert.ok('profile_incomplete' in GCC226_STAGES);
});
test('empty and late pages return sensible empty results',()=>{
 assert.deepEqual(legacyRegistrationSnapshotV226([],{}).items,[]);
 assert.deepEqual(legacyRegistrationSnapshotV226(rows,{page:25,pageSize:2}).items,[]);
});
