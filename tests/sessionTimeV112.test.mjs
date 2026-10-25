import test from 'node:test';
import assert from 'node:assert/strict';
import {countryZoneV112,sessionClockZonesV112,clockAnglesV112,timePartsV112,timeRangeV112,durationMinutesV112} from '../src/lib/sessionTimeV112.js';
const start='2026-10-28T05:25:00.000Z';const end='2026-10-28T06:15:00.000Z';
test('Showa three-country international start times: JST14:25, PHT13:25, SLST10:55',()=>{
 assert.equal(timePartsV112(start,'Asia/Tokyo').time,'14:25');
 assert.equal(timePartsV112(start,'Asia/Manila').time,'13:25');
 assert.equal(timePartsV112(start,'Asia/Colombo').time,'10:55');
 assert.equal(timePartsV112(end,'Asia/Colombo').time,'11:45');
 assert.equal(durationMinutesV112(start,end),50);
});
test('country aliases are grounded in single-zone countries',()=>{
 assert.equal(countryZoneV112('Sri Lanka')[1],'Asia/Colombo');
 assert.equal(countryZoneV112('LK')[1],'Asia/Colombo');
 assert.equal(countryZoneV112('Philippines')[1],'Asia/Manila');
 assert.equal(countryZoneV112('United States'),null); // Multiple time zones: do not guess
});
test('clock hands include minute offset rather than rounding',()=>{
 assert.deepEqual(clockAnglesV112(start,'Asia/Colombo'),{hour:(10+55/60)*30,minute:330});
});
test('clock list derives countries exclusively from the chart and includes the host',()=>{
 const rooms=[{students:[{country:'Japan'},{country:'Philippines'}]},{students:[{country:'Sri Lanka'},{country:'Japan'}]}];
 assert.deepEqual(sessionClockZonesV112(rooms,'Asia/Tokyo').clocks.map(x=>x.country),['Japan','Philippines','Sri Lanka']);
});
test('DST conversion uses actual event date, not a fixed offset',()=>{
 assert.notEqual(timePartsV112('2026-01-12T12:00:00Z','Europe/London').time,timePartsV112('2026-07-12T12:00:00Z','Europe/London').time);
});
test('date rollover is visible on other-country calendar',()=>{
 const range=timeRangeV112('2026-10-28T14:30:00Z','2026-10-28T15:30:00Z','Asia/Tokyo');
 assert.match(range,/28 Oct/);assert.match(range,/29 Oct/);
});
test('unspecified end time is not invented',()=>{
 assert.match(timeRangeV112(start,null,'Asia/Tokyo'),/End time not set/);
});
