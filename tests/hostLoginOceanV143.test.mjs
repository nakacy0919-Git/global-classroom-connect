import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const page=read('src/pages/auth/LoginPage.js');
const css=read('src/styles/hostLoginV143.css');
const app=read('src/app.js');
const asset=fs.readFileSync(new URL('../src/assets/landing-v118/ocean-islands.webp',import.meta.url));
test('host sign-in uses the existing bundled GCC ocean photograph rather than an external URL',()=>{
 assert.match(page,/import '..\/..\/styles\/hostLoginV143.css'/);
 assert.match(css,/url\('\.\.\/assets\/landing-v118\/ocean-islands\.webp'\)/);
 assert.equal(asset.toString('ascii',0,4),'RIFF');
 assert.equal(asset.toString('ascii',8,12),'WEBP');
 assert.doesNotMatch(css,/@import|https:\/\//);
});
test('host credentials and original auth binding IDs remain identical',()=>{
 for(const id of ['login-form','login-email','login-password','login-message'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/type="email"/);
 assert.match(page,/type="password"/);
 assert.match(page,/type="submit"/);
 assert.match(app,/document.querySelector\(\s*'#login-form'/);
 assert.match(app,/document.querySelector\(\s*'#login-email'/);
 assert.match(app,/document.querySelector\(\s*'#login-password'/);
 assert.match(app,/await signIn\(/);
 assert.match(app,/'#\/sessions'/);
});
test('compact desktop action with comfortable mobile touch width',()=>{
 assert.doesNotMatch(page,/primary-button full-width/);
 assert.match(page,/primary-button gcc143-login-submit/);
 assert.match(css,/\.gcc143-login-submit\s*\{[^}]*width: auto/s);
 assert.match(css,/\.gcc143-login-actions\s*\{[^}]*justify-content: flex-end/s);
 assert.match(css,/@media \(max-width: 540px\)/);
 assert.match(css,/\.gcc143-login-submit\s*\{ width: 100%; \}/);
});
test('scenic background is legible, responsive and does not alter non-host pages',()=>{
 assert.match(page,/aria-labelledby="gcc143-host-heading"/);
 assert.match(page,/href="#\/welcome"/);
 assert.match(page,/aria-live="polite"/);
 assert.match(css,/backdrop-filter: blur\(17px\)/);
 assert.match(css,/rgba\(255,253,249,\.91\)/);
 assert.match(css,/@media \(max-width: 850px\)/);
 assert.match(css,/prefers-reduced-motion: reduce/);
 assert.ok(!css.includes('body {'));
 assert.ok(!css.includes('#app {'));
});
