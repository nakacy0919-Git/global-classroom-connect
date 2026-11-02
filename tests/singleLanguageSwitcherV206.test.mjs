import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LOCALES,translateUiText,setGccLanguage,getGccLanguage} from '../src/lib/i18nV157.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const header=read('src/components/Header.js');
const home=read('src/pages/public/WelcomeV117.js');
const i18n=read('src/lib/i18nV157.js');
const styles=read('src/styles/singleLanguageSwitcherV206.css');
test('all navigation surfaces render one selector and no duplicate language buttons',()=>{
 assert.equal((header.match(/data-lang-select/g)||[]).length,1);
 assert.equal((home.match(/data-lang-select/g)||[]).length,1);
 assert.doesNotMatch(header,/data-lang="en"|data-lang="ja"|id="current-language"|pill-label">Language/);
 assert.doesNotMatch(home,/gcc184-lang-menu|gcc184-lang-popup|data-lang="en"|data-lang="ja"/);
 const publicMarkup=i18n.match(/bar\.innerHTML='([^']*)';/)?.[1];
 assert.ok(publicMarkup);
 assert.equal((publicMarkup.match(/data-lang-select/g)||[]).length,1);
 assert.doesNotMatch(publicMarkup,/data-lang="en"|data-lang="ja"|<button|<span/);
 assert.match(i18n,/home\.replaceChildren\(\)/);
 assert.doesNotMatch(i18n,/root\.querySelectorAll\('\[data-lang\]'\)/);
});
test('one dropdown supports 8 languages and keeps the selected language after route updates',()=>{
 assert.deepEqual([...LOCALES],['en','ja','ko','vi','id','es','pt','zh']);
 for(const locale of LOCALES){
  setGccLanguage(locale);
  assert.equal(getGccLanguage(),locale);
 }
 assert.equal(translateUiText('Session type','ko'),'세션 유형');
 setGccLanguage('en');
 assert.match(i18n,/makeOptions\(select\)/);
 assert.match(i18n,/setGccLanguage\(select\.value\);refresh\(\)/);
 assert.match(i18n,/select\.value=locale/);
 assert.match(i18n,/localStorage\.setItem\(STORAGE_KEY,locale\)/);
});
test('single switch remains touch-friendly and stylesheet loads after older styles',()=>{
 const main=read('src/main.js');
 assert.match(styles,/min-height:42px/);
 assert.match(styles,/@media\(max-width:620px\)/);
 assert.match(styles,/#app \.gcc117-topbar \[data-lang-select\]/);
 assert.match(styles,/#app \.gcc157-public-lang \[data-lang-select\]/);
 assert.ok(main.indexOf('singleLanguageSwitcherV206.css')>main.indexOf('sessionFormWideV205.css'));
});
