import test from 'node:test';
import assert from 'node:assert/strict';
import {isDiscoverableOfferV230,isDiscoverableEventV230} from '../src/lib/sessionAvailabilityV230.js';
import {activeCountriesV151} from '../src/lib/sessionCountryMapV151.js';
import {sessionSearchRecordsV213} from '../src/lib/sessionSearchV213.js';
const now=Date.parse('2026-11-17T12:00:00Z');
const base={id:'offer-1',status:'open',is_mine:true,country_code:'JP',country_name:'Japan',
 starts_at:'2026-12-12T10:00:00Z',ends_at:'2026-12-12T11:00:00Z',
 session_details:{session_name:'Culture',registration_closes_at:'2026-12-11T10:00:00Z'}};
test('own open offers are discoverable across search and map',()=>{
 assert.equal(isDiscoverableOfferV230(base,now),true);
 assert.deepEqual(activeCountriesV151([base],now).map(c=>c.code),['JP']);
 assert.deepEqual(sessionSearchRecordsV213([base],[],now).map(c=>c.id),['offer-1']);
});
test('past, closed, invalid or expired offers never appear on the country map or search',()=>{
 const rejected=[
  {...base,id:'closed',status:'closed'},
  {...base,id:'past',ends_at:'2026-11-16T10:00:00Z'},
  {...base,id:'invalid',starts_at:'not-a-date'},
  {...base,id:'bad-deadline',session_details:{registration_closes_at:'not-a-date'}},
  {...base,id:'deadline',session_details:{registration_closes_at:'2026-11-16T10:00:00Z'}}
 ];
 for(const offer of rejected)assert.equal(isDiscoverableOfferV230(offer,now),false,offer.id);
 assert.equal(activeCountriesV151(rejected,now).length,0);
 assert.equal(sessionSearchRecordsV213(rejected,[],now).length,0);
});
test('legacy missing deadlines remain eligible but an explicit invalid deadline is rejected',()=>{
 const old={...base,session_details:{session_name:'Legacy exchange'}};
 assert.equal(isDiscoverableOfferV230(old,now),true);
 assert.equal(isDiscoverableOfferV230({...old,session_details:{registration_closes_at:'NaN'}},now),false);
});
test('public host event has separate published status and the same clock rules',()=>{
 const event={...base,status:'published'};
 assert.equal(isDiscoverableEventV230(event,now),true);
 assert.equal(isDiscoverableEventV230({...event,status:'draft'},now),false);
});
