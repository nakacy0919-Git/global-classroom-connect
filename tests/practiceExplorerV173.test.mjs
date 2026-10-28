import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRACTICE_STAGES} from '../src/lib/practiceDataV169.js';
import {PRACTICE_SCENES_V173,getPracticeItemsV173,getPracticeTotalsV173} from '../src/lib/practiceCurriculumV173.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const welcome=read('src/pages/public/WelcomeV117.js');
const homeCss=read('src/styles/welcomeButtonsV173.css');
const practice=read('src/pages/public/PracticePageV170.js');
const exploreCss=read('src/styles/practiceExplorerV173.css');
test('homepage keeps all four named routes and the four existing image assets',()=>{
 const cardNames=['gcc117-choice-create','gcc117-choice-find','gcc117-choice-join','gcc117-choice-practice'];
 for(const name of cardNames)assert.match(welcome,new RegExp('class="gcc117-choice '+name+'"'));
 for(const image of ['hostIllustration','findIllustration','volunteerIllustration','practiceEnglishArtwork'])assert.match(welcome,new RegExp('src="\\$\\{'+image+'\\}"'));
 assert.equal((welcome.match(/class="gcc118-choice-image/g)||[]).length,4);
 assert.match(welcome,/#\/practice/);
 assert.match(homeCss,/grid-template-columns:repeat\(4/);
 assert.match(homeCss,/visibility:visible!important/);
 assert.match(read('src/main.js'),/welcomeButtonsV173.css/);
 assert.match(read('src/app.js'),/bindWelcomeArtV173\(\)/);
});
test('all 16 bilingual scene descriptions are relevant to Zoom exchanges',()=>{
 for(const role of ['student','facilitator'])for(const stage of PRACTICE_STAGES[role]){
  const scene=PRACTICE_SCENES_V173[role][stage.id];
  assert.ok(scene?.ja&&scene?.goal&&scene?.goalJa,role+':'+stage.id);
 }
});
test('standard and advanced have five natural phrases per stage and challenge has a short connected speech',()=>{
 for(const role of ['student','facilitator']){
  for(const st of PRACTICE_STAGES[role]){
   for(const lvl of ['standard','advanced']){
    const items=getPracticeItemsV173(role,st.id,lvl);
    assert.equal(items.length,5);
    assert.ok(items.every(x=>x.text&&x.ja&&/\p{Script=Hiragana}|\p{Script=Han}/u.test(x.ja)));
   }
   const finale=getPracticeItemsV173(role,st.id,'challenge');
   assert.equal(finale.length,1);
   assert.ok(finale[0].text.length>65);
  }
  assert.equal(getPracticeTotalsV173(role,'standard'),40);
  assert.equal(getPracticeTotalsV173(role,'advanced'),40);
  assert.equal(getPracticeTotalsV173(role,'challenge'),8);
 }
});
test('stage selection opens phrase overview, then only phrase click opens speech practice dialog',()=>{
 assert.match(practice,/id="gcc173-explorer"/);
 assert.match(practice,/id="gcc173-preview"/);
 assert.match(practice,/id="gcc173-phrase-list"/);
 assert.match(practice,/function selectStage\(i\)/);
 assert.match(practice,/button.addEventListener\('click',\(\)=>openStage\(stageIndex,i\)\)/);
 assert.match(practice,/b.addEventListener\('click',\(\)=>selectStage\(i\)\)/);
 assert.match(practice,/getPracticeItemsV171/);
 assert.match(practice,/English for Real Zoom Exchanges/);
 assert.match(practice,/Zoom入室/);
 assert.match(exploreCss,/grid-template-columns:minmax\(220px,285px\)/);
 assert.match(exploreCss,/gcc173-reveal/);
 assert.match(exploreCss,/overflow-y:auto/);
});
