import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url));
const page=file('src/pages/public/PracticePageV170.js').toString();
const css=file('src/styles/practiceLevelArtworkV187.css').toString();
test('three accessible level choices retain their existing data-level and progression flow',()=>{
  for(const [id,label] of [['standard','Standard'],['advanced','Advanced'],['challenge','Challenge']]){
    assert.match(page,new RegExp('data-level="'+id+'" class="gcc187-level-card"'));
    assert.ok(page.includes('<strong>'+label+'</strong>'));
  }
  assert.match(page,/switchLevel\(b\.dataset\.level\)/);
  assert.match(page,/showProfile\(true\)/);
  assert.match(page,/gcc178-level-row gcc187-level-row/);
  assert.match(page,/practiceLevelArtworkV187\.css/);
});
test('each level uses high-resolution transparent WebP, not emoji',()=>{
  for(const level of ['standard','advanced','challenge']){
    const b=file('public/assets/practice-level-'+level+'-hd.webp');
    assert.ok(b.byteLength>25000 && b.byteLength<180000,level+' optimized WebP');
    assert.equal(b.toString('ascii',0,4),'RIFF');
    assert.equal(b.toString('ascii',8,12),'WEBP');
    assert.ok(page.includes('/assets/practice-level-'+level+'-hd.webp'));
  }
  assert.match(page,/width="580" height="579"/);
  assert.match(page,/width="580" height="576"/);
  assert.match(page,/width="580" height="545"/);
});
test('artwork rises outside the level cards, with large legible labels and mobile rules',()=>{
  assert.match(css,/#gcc178-level-step/);
  assert.match(css,/overflow:visible/);
  assert.match(css,/position:absolute/);
  assert.match(css,/bottom:-8px/);
  assert.match(css,/font-size:clamp\(1\.15rem/);
  assert.match(css,/@media\(max-width:740px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/#gcc178-role-step/);
});
