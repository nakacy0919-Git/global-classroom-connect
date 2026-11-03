import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('src/styles/volunteerGalleryV122.css');
const gallery=read('src/pages/teacher/VolunteerGalleryV122.js');
const v211=css.slice(css.indexOf('/* GCC V21.1'));

test('every facilitator picture is a uniform true square with edge-to-edge cover',()=>{
 assert.match(v211,/\.gcc133-person-open \.gcc122-person-photo\s*\{[^}]*aspect-ratio:1\s*\/\s*1;/s);
 assert.match(v211,/\.gcc133-person-open \.gcc122-person-photo img\s*\{[^}]*inset:0;[^}]*width:100%;[^}]*height:100%;[^}]*object-fit:cover;/s);
 assert.match(v211,/object-position:center top;/);
 assert.match(v211,/\.gcc133-person-open \.gcc122-person-photo::after/);
 assert.doesNotMatch(v211,/object-fit:fill/);
});

test('corporate directory layout uses restrained card shadows, typography and hover feedback',()=>{
 assert.match(v211,/\.gcc122-team\s*\{[^}]*background:linear-gradient/s);
 assert.match(v211,/\.gcc122-team \.gcc122-person\s*\{[^}]*border-radius:19px;/s);
 assert.match(v211,/\.gcc122-team \.gcc133-person-open \.gcc122-person-body\s*\{[^}]*display:flex;[^}]*flex-direction:column;/s);
 assert.match(v211,/\.gcc122-team \.gcc133-person-open \.gcc122-person-name\s*\{[^}]*font-weight:850;/s);
 assert.match(v211,/\.gcc122-team \.gcc133-open-hint\s*\{[^}]*margin-top:auto;/s);
 assert.match(v211,/@media\(hover:hover\)/);
});

test('flag and profile details remain usable, with full uncropped picture in the modal',()=>{
 assert.match(v211,/\.gcc122-person-location img\s*\{[^}]*width:38px;[^}]*height:27px;/s);
 assert.match(v211,/\.gcc133-detail-photo img\s*\{[^}]*object-fit:contain;/s);
 assert.match(gallery,/countryFlagAssetV131\(person.country,person.country_code\)/);
 assert.match(gallery,/signedTeacherPhotoV116\(path\)/);
});

test('photo placeholders are centered, focus is visible and motion preferences respected',()=>{
 assert.match(v211,/\.gcc122-person-placeholder\s*\{[^}]*display:grid;[^}]*place-items:center;/s);
 assert.match(v211,/\.gcc133-person-open:focus-visible/);
 assert.match(v211,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(v211,/@media\(max-width:610px\)/);
 assert.match(css,/@media\(max-width:760px\)\{\.gcc122-cards\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
