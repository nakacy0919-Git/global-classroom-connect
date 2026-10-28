import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/public/WelcomeV117.js');
const css=read('src/styles/welcomeArtV118.css');
test('gateway keeps three photo buttons plus Practice and routes',()=>{
 assert.equal((page.match(/class="gcc117-choice gcc117-choice-/g)||[]).length,4);
 for(const r of ['create','find','volunteer'])assert.match(page,new RegExp('href="#/teacher-portal\\?view='+r+'"'));
 assert.match(page,/aria-label="Host a Session/);
 assert.match(page,/aria-label="Find a Session/);
 assert.match(page,/aria-label="Be a Facilitator or GC Host/);
 assert.match(page,/My profile/);
});
test('illustrations are real bundled WebP files, not external lookups',()=>{
 const images=['ocean-islands.webp','host-session.webp','find-session.webp','facilitator-host.webp'];
 for(const image of images){
  const data=fs.readFileSync(new URL('../src/assets/landing-v118/'+image,import.meta.url));
  assert.equal(data.toString('ascii',0,4),'RIFF',image);
  assert.equal(data.toString('ascii',8,12),'WEBP',image);
  assert.ok(data.length<350_000,'WebP exceeds 350kB: '+image);
 }
 assert.match(page,/src="\$\{hostIllustration\}"/);
 assert.match(page,/src="\$\{findIllustration\}"/);
 assert.match(page,/src="\$\{volunteerIllustration\}"/);
});
test('full-bleed island background and rounded square clickable cards remain accessible',()=>{
 assert.match(css,/url\('\.\.\/assets\/landing-v118\/ocean-islands\.webp'\)/);
 assert.match(css,/aspect-ratio:1\/1/);
 assert.match(css,/border-radius:clamp/);
 assert.match(css,/focus-visible/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/@media\(max-width:920px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/@import|https:\/\//);
});
test('real teacher auth routes and old reduced-motion CSS remain intact',()=>{
 assert.match(page,/teacher-portal\?view=create/);
 assert.match(page,/teacher-portal\?view=find/);
 assert.match(page,/teacher-portal\?view=volunteer/);
 const prev=read('src/styles/welcomeV117.css');
 assert.match(prev,/prefers-reduced-motion:no-preference/);
 assert.match(page,/import '\.\.\/\.\.\/styles\/welcomeV117\.css'/);
});
