import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const gallery=read('src/pages/teacher/VolunteerGalleryV122.js');
const css=read('src/styles/volunteerGalleryV122.css');
const form=read('src/pages/teacher/VolunteerV117.js');
test('compact four-column cards keep names and roles but exclude expanded descriptions',()=>{
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/\.gcc122-person-photo\{height:144px/);
 assert.match(css,/@media\(max-width:760px\)/);assert.match(css,/@media\(max-width:420px\)/);
 const card=gallery.slice(gallery.indexOf('for(const person of visible)'),gallery.indexOf('cards.replaceChildren(list);'));
 assert.match(card,/gcc133-person-open/);assert.match(card,/roleBadges\(person\)/);assert.match(card,/placeFlag\(person\)/);
 assert.doesNotMatch(card,/gcc122-person-bio|person\.bio|person\.website|person\.instagram|person\.facebook/);
});
test('each card opens a modal with full biography, school, roles and safe social links',()=>{
 assert.match(gallery,/role="dialog" aria-modal="true"/);
 assert.match(gallery,/aria-labelledby="gcc133-profile-title"/);
 assert.match(gallery,/aria-haspopup','dialog'/);
 assert.match(gallery,/open\.addEventListener\('click',\(\)=>openProfile\(person,open\)\)/);
 assert.match(gallery,/person\.bio/);assert.match(gallery,/person\.school/);
 for(const field of ['website','instagram','facebook'])assert.ok(gallery.includes("'"+field+"'"));
 assert.match(gallery,/validHttps\(person\[key\]\)/);
 assert.match(gallery,/noopener noreferrer/);
 assert.doesNotMatch(gallery,/innerHTML\s*=/);
});
test('modal can close by escape, close button or backdrop, traps tab and restores focus',()=>{
 assert.match(gallery,/event\.key==='Escape'/);
 assert.match(gallery,/event\.key!=='Tab'/);
 assert.match(gallery,/event\.shiftKey/);
 assert.match(gallery,/data-gcc133-close/);
 assert.match(gallery,/returnFocus\.focus\(\)/);
 assert.match(css,/\.gcc133-profile-modal\[hidden\]\{display:none!important\}/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/focus-visible/);
});
test('gallery still uses consented read-only data and signed photos',()=>{
 assert.match(gallery,/volunteerGalleryV122\(\)/);
 assert.match(gallery,/signedTeacherPhotoV116/);
 assert.match(gallery,/photoCache/);
 assert.match(gallery,/countryFlagAssetV131/);
 assert.doesNotMatch(gallery,/person\.email|volunteer_note|auth_user_id/);
 assert.match(form,/saveVolunteerV117/);
});
