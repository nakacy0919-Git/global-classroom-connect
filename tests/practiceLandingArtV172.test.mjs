import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const asset=readFileSync(new URL('../src/assets/landing-v118/practice-english.avif',import.meta.url));
const page=readFileSync(new URL('../src/pages/public/WelcomeV117.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/welcomePracticeV169.css',import.meta.url),'utf8');
test('user-supplied practice artwork is a valid nonempty AVIF image',()=>{
 assert.ok(asset.length>50000,'artwork should retain enough detail');
 assert.equal(asset.toString('ascii',4,12),'ftypavif');
});
test('fourth button uses actual imported artwork and opens account-free practice',()=>{
 assert.match(page,/import practiceEnglishArtwork from '\.\.\/\.\.\/assets\/landing-v118\/practice-english\.avif'/);
 assert.match(page,/src="\$\{practiceEnglishArtwork\}"/);
 assert.match(page,/href="#\/practice"/);
 assert.match(page,/gcc172-practice-artwork/);
 assert.doesNotMatch(page,/gcc169-landing-art/);
});
test('artwork preserves transparency and responsive one-to-one card positioning',()=>{
 assert.match(css,/background:transparent/);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/grid-template-columns:repeat\(4/);
 assert.match(css,/@media\(max-width:620px\)/);
});
