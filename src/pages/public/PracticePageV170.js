import {PRACTICE_STAGES,fillPracticePhrase,scorePracticePhrase} from '../../lib/practiceDataV169.js';
import {getPracticeItemsV174 as getPracticeItems,PRACTICE_SCENES_V174} from '../../lib/practiceCurriculumV174.js';
import {getPracticeItemsV171} from '../../lib/practiceCurriculumV171.js';
import '../../styles/practiceStudioV170.css';
import '../../styles/practiceStudioV171.css';
import '../../styles/practiceExplorerV173.css';
import '../../styles/practiceSituationsV174.css';
import '../../styles/practicePopupV175.css';
import '../../styles/practiceSidebarV177.css';
import '../../styles/practiceGuidedV178.css';
import '../../styles/practiceAcademicV179.css';
import '../../styles/practiceFlowV180.css';
import '../../styles/practiceFullscreenV181.css';
import '../../styles/practiceContrastV182.css';
import '../../styles/practiceRoleArtworkV185.css';
import '../../styles/practiceLevelArtworkV187.css';
import {getGccLanguage} from '../../lib/i18nV157.js';
const KEY='gcc-practice-v170-local';
const el=(tag,cls='',text='')=>{const x=document.createElement(tag);if(cls)x.className=cls;x.textContent=text;return x;};
const read=()=>{try{
 const stored=localStorage.getItem(KEY);
 if(stored){const x=JSON.parse(stored);return {profile:x.profile||{},scores:x.scores||{}};}
 // Preserve existing V16.9 student/facilitator scores when moving to the new studio.
 const previous=JSON.parse(localStorage.getItem('gcc-practice-v1-local')||'{}');
 const scores={};
 for(const role of ['student','facilitator'])for(const stage of PRACTICE_STAGES[role])for(let i=0;i<stage.lines.length;i++){
  const old=previous.scores?.[role]?.[stage.id]?.[i];if(old&&typeof old.best==='number')
   scores[role+'|standard|'+stage.id+'|'+i]={best:old.best,last:old.last??old.best,transcript:old.transcript||'',attempts:old.attempts||1};
 }
 return {profile:previous.profile||{},scores};
}catch{return {profile:{},scores:{}};}};
const write=s=>{try{localStorage.setItem(KEY,JSON.stringify(s));return true;}catch{return false;}};
const levelName={standard:'Standard',advanced:'Advanced',challenge:'Final Challenge'};
const stageArt=(role,index)=>'/practice-stages/stage-'+String(role==='student'?index+1:[3,1,4,6,7,8,2,8][index]).padStart(2,'0')+'.webp';
export function PracticePageV170(){return `
<main id="gcc170" class="gcc170">
 <header class="gcc170-top gcc180-minimal-top"><a href="#/welcome" class="gcc179-back-home">← Back to Home</a></header>
 <section id="gcc178-setup" class="gcc178-setup" aria-label="Practice setup">
  <div id="gcc178-role-step" class="gcc178-step">
   <span class="gcc178-step-label">STEP 1 / 3</span><h1>How would you like to practice?</h1><p>Choose your role for a real international Zoom exchange.<span lang="ja">オンライン国際交流での役割を選びましょう。</span></p>
   <div class="gcc178-choice-row gcc185-role-row" role="group" aria-label="Choose your role">
      <button data-role="student" class="gcc185-role-card" type="button">
        <span class="gcc185-role-art" aria-hidden="true"><img src="/assets/practice-role-student.webp" alt="" width="520" height="387" decoding="async" /></span>
        <span class="gcc185-role-copy"><strong>Student</strong><small>Practice as a student / 生徒として練習</small></span>
      </button>
      <button data-role="facilitator" class="gcc185-role-card" type="button">
        <span class="gcc185-role-art" aria-hidden="true"><img src="/assets/practice-role-facilitator.webp" alt="" width="520" height="410" decoding="async" /></span>
        <span class="gcc185-role-copy"><strong>Host / Facilitator</strong><small>Guide an exchange / 進行役として練習</small></span>
      </button>
    </div>
  </div>
  <div id="gcc178-level-step" class="gcc178-step" hidden>
   <span class="gcc178-step-label">STEP 2 / 3</span><h1>Choose your practice level</h1><p>Pick the challenge that is right for you.<span lang="ja">練習するレベルを選びましょう。</span></p>
   <div class="gcc178-choice-row gcc178-level-row gcc187-level-row" role="group" aria-label="Practice difficulty">
    <button data-level="standard" class="gcc187-level-card" type="button">
      <span class="gcc187-level-art" aria-hidden="true"><img src="/assets/practice-level-standard-hd.webp" alt="" width="580" height="579" decoding="async" /></span>
      <span class="gcc187-level-copy"><span class="gcc187-level-tag">LEVEL 01</span><strong>Standard</strong><small>Useful everyday phrases / 基本表現</small></span>
    </button>
    <button data-level="advanced" class="gcc187-level-card" type="button">
      <span class="gcc187-level-art" aria-hidden="true"><img src="/assets/practice-level-advanced-hd.webp" alt="" width="580" height="576" decoding="async" /></span>
      <span class="gcc187-level-copy"><span class="gcc187-level-tag">LEVEL 02</span><strong>Advanced</strong><small>Deeper conversation / 発展表現</small></span>
    </button>
    <button data-level="challenge" class="gcc187-level-card" type="button">
      <span class="gcc187-level-art" aria-hidden="true"><img src="/assets/practice-level-challenge-hd.webp" alt="" width="580" height="545" decoding="async" /></span>
      <span class="gcc187-level-copy"><span class="gcc187-level-tag">LEVEL 03</span><strong>Challenge</strong><small>Real-world missions / 実践課題</small></span>
    </button>
   </div>
   <button id="gcc178-role-back" class="gcc178-back" type="button">← Back to roles / 役割を選び直す</button>
  </div>
 </section>
 <div id="gcc178-practice-content" class="gcc178-practice-content" hidden>
 <section class="gcc170-choose"><div class="gcc179-stage-heading"><button class="gcc179-change-role" id="gcc178-change" type="button" hidden>← Change role / level</button><span class="gcc170-kicker">YOUR ZOOM CONVERSATION TOOLKIT</span><h1>Choose a Stage <span id="gcc170-stage-total">8 stages</span></h1></div><div class="gcc180-practice-actions"><button class="gcc170-profile-button gcc179-profile-access" id="gcc170-profile-open" type="button" hidden>⚙ My Profile</button><button id="gcc180-sound-toggle" type="button" aria-pressed="true" aria-label="Toggle practice sounds" title="Toggle practice sounds">♪ Sound On</button></div></section>
 <section id="gcc173-explorer" class="gcc173-explorer" aria-label="Speaking stages and practice phrase list">
   <nav id="gcc170-stages" class="gcc170-stages" aria-label="Practice stages"></nav>
   <section id="gcc173-preview" class="gcc173-preview gcc177-phrase-panel" aria-labelledby="gcc173-preview-title">
    <header class="gcc173-preview-header"><span class="gcc173-preview-badge">MODEL PHRASES / モデルフレーズ</span><span class="gcc177-preview-guide">Choose a stage on the left / 左のステージを選択</span></header>
    <div class="gcc173-preview-intro"><span id="gcc173-preview-icon" aria-hidden="true"></span><div class="gcc178-scene-copy"><h2 id="gcc173-preview-title"></h2><p id="gcc173-preview-ja" lang="ja"></p><p id="gcc173-preview-goal"></p><small id="gcc173-preview-goal-ja" lang="ja"></small></div><img id="gcc178-stage-image" class="gcc178-stage-image" src="/practice-stages/stage-01.webp" alt="Zoom situation illustration"></div>
    <div class="gcc174-mission gcc180-mission">
  <div class="gcc180-mission-heading"><span>🎯 REAL-LIFE MISSION / 実践ミッション</span><div class="gcc180-mission-controls" role="group" aria-label="Mission language"><button type="button" data-mission-lang="en" aria-pressed="true">EN</button><button type="button" data-mission-lang="ja" aria-pressed="false">日本語</button><button id="gcc180-mission-more" type="button" aria-expanded="false">More ↓</button></div></div>
  <strong id="gcc174-mission-en" lang="en"></strong><small id="gcc174-mission-ja" lang="ja" hidden></small>
 </div>
    <div id="gcc173-phrase-list" class="gcc173-phrase-list"></div>
    <p class="gcc173-preview-hint">Select a model phrase to open Read This Aloud. / モデルフレーズを選ぶと音読画面が開きます。</p>
   </section>
 </section>
 <footer class="gcc170-foot">🔒 Your practice scores are stored on this device only. · Speech-to-text accuracy is not a direct assessment of pronunciation.</footer>
 </div>
 <dialog id="gcc170-profile-dialog" class="gcc170-dialog gcc170-profile-dialog" aria-label="Personalize your practice">
  <div class="gcc170-dialog-top"><strong>⚙ My Profile / マイプロフィール</strong><button type="button" id="gcc170-profile-close">✕ Close</button></div>
  <div class="gcc170-profile-fields"><p id="gcc171-profile-guide">Welcome! Please enter your basic information before practicing. You can change it anytime in My Profile.<br><small lang="ja">ようこそ！まず基本情報を登録しましょう。後からいつでも変更できます。入力した固有名詞は採点しません。</small></p><label>Your name / 名前<input id="gcc170-name" maxlength="70" autocomplete="off" placeholder="Sara"></label><label>School / 学校名<input id="gcc170-school" maxlength="120" autocomplete="off" placeholder="Cedarbrook Ridge High School"></label><label>Hobby / 趣味<input id="gcc170-hobby" maxlength="80" autocomplete="off" placeholder="playing soccer"></label><label>Hometown / 出身地<input id="gcc170-hometown" maxlength="100" autocomplete="off" placeholder="Aichi, Japan"></label><label>About your school (optional) / 学校の特徴（任意）<textarea id="gcc170-schoolDescription" maxlength="220" rows="2" placeholder="students enjoy international exchanges"></textarea></label></div><footer class="gcc180-profile-footer"><div class="gcc178-profile-actions"><button id="gcc178-profile-back" type="button">← Back / 戻る</button><button id="gcc178-profile-skip" type="button">Skip / スキップ</button><button id="gcc171-profile-save" type="button">✓ Save & Start Practice / 保存して練習へ</button></div><button id="gcc170-reset" class="gcc180-reset-button" type="button">Reset all practice scores / 成績をリセット</button></footer>
 </dialog>
 <dialog id="gcc170-stage-dialog" class="gcc170-dialog gcc170-stage-dialog" aria-label="Speaking practice">
  <div class="gcc170-dialog-top"><strong id="gcc170-dialog-heading">Practice</strong><button id="gcc170-dialog-close" type="button">✕ Close</button></div>
  <div class="gcc170-dialog-scroll">
   <div class="gcc170-scene"><div class="gcc170-scene-icon" id="gcc170-scene-icon">🎧</div><div><span id="gcc170-scene-level" class="gcc170-scene-level">STANDARD</span><h2 id="gcc170-scene-title"></h2><p id="gcc170-scene-hint"></p></div><img id="gcc178-dialog-image" src="/practice-stages/stage-01.webp" alt="Zoom practice situation"></div>
   <div class="gcc170-phrase-nav"><button type="button" id="gcc170-prev">← Previous</button><span id="gcc170-counter">1 / 3</span><button type="button" id="gcc170-next">Next →</button></div>
   <div class="gcc174-dialog-cue" id="gcc174-dialog-cue" hidden><span>📍 SITUATION / 場面</span><strong id="gcc174-dialog-cue-en"></strong><small id="gcc174-dialog-cue-ja" lang="ja"></small></div>
   <div class="gcc170-phrase"><div class="gcc171-phrase-top"><span class="gcc175-read-label">📣 READ THIS ALOUD <small lang="ja">ここを声に出して読もう</small></span><button id="gcc170-listen" class="gcc171-listen-icon" type="button" aria-label="Listen to the model phrase" title="Listen / お手本を聞く">🔊</button></div><p id="gcc170-prompt"></p><p id="gcc170-japanese" lang="ja"></p></div>
   <div class="gcc170-mic-actions"><button id="gcc170-start" type="button">🎙️ Start Speaking</button><button id="gcc170-end" type="button" disabled>■ End & Score</button></div>
   <p id="gcc170-status" class="gcc170-status" role="status"></p>
   <div class="gcc171-results"><div class="gcc170-transcript"><span>YOUR SPEECH / 文字起こし</span><p id="gcc170-transcript">Your words will appear here…</p></div><div class="gcc170-score-panel"><div class="gcc170-score-heading"><span>ACCURACY</span><span id="gcc170-best">Best: —</span></div><div class="gcc171-gauge" role="meter" aria-label="Accuracy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><svg viewBox="0 0 200 112" aria-hidden="true"><path class="gcc171-gauge-base" d="M 18 100 A 82 82 0 0 1 182 100" pathLength="100"/><path id="gcc170-score-fill" class="gcc171-gauge-fill" d="M 18 100 A 82 82 0 0 1 182 100" pathLength="100"/></svg><div class="gcc170-score-value" id="gcc170-score-value">—%</div></div><p id="gcc170-score-message">Aim for 80%! 🎯</p></div></div>
   
  </div>
  <div class="gcc170-confetti" id="gcc170-confetti" aria-hidden="true"></div>
 </dialog>
</main>`;}
export function bindPracticePageV170(){
 const root=document.getElementById('gcc170');if(!root)return;
 const $=id=>document.getElementById('gcc170-'+id);
 const state=read();let role='student',level='standard',stageIndex=0,itemIndex=0,recording=false,recognition=null,token=0,segments=[],interim='',ending=false,scoreTimer=null,setupStep='role',profileFromSetup=false,missionLanguage=getGccLanguage()==='ja'?'ja':'en',missionExpanded=false;
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const stages=()=>PRACTICE_STAGES[role],stage=()=>stages()[stageIndex],items=()=>getPracticeItems(role,stage().id,level);
 const profileDialog=$('profile-dialog'),stageDialog=$('stage-dialog');
 const save=()=>{if(!write(state))$('status').textContent='This browser could not save scores.';};
 const key=(r,l,s,i)=>r+'|'+l+'|'+s+'|'+i;
 const scoreFor=(r,l,s,i)=>{const saved=state.scores[key(r,l,s,i)];if(!saved)return null;const currentText=getPracticeItems(r,s,l)[i]?.text;if(saved.template)return saved.template===currentText?saved:null;const previousText=getPracticeItemsV171(r,s,l)[i]?.text;return currentText===previousText?saved:null;};
 function updateStageCount(){
  $('stage-total').textContent=stages().length+' stages';
 }
 function paintStages(){
  const list=$('stages');list.replaceChildren();
  stages().forEach((s,i)=>{
   const done=getPracticeItems(role,s.id,level).filter((_,n)=>scoreFor(role,level,s.id,n)).length;
   const b=el('button','gcc170-stage'+(stageIndex===i?' gcc173-selected':''));
   b.type='button';b.setAttribute('aria-pressed',String(stageIndex===i));b.append(el('span','gcc170-stage-icon',s.icon));
   const text=el('span','gcc170-stage-text');text.append(el('strong','',String(i+1).padStart(2,'0')+' · '+s.title),el('small','',s.scene),el('em','gcc173-stage-ja',PRACTICE_SCENES_V174[role][s.id].ja));b.append(text);
   const right=el('span','gcc170-stage-right');right.append(el('strong','',done+'/'+getPracticeItems(role,s.id,level).length),el('small','',done===getPracticeItems(role,s.id,level).length?'✓ Completed':'See phrases →'));b.append(right);
   b.addEventListener('click',()=>selectStage(i));list.append(b);
  });
 }
 function paintScore(value,best){
  $('score-value').textContent=value==null?'—%':value+'%';
  $('score-fill').style.strokeDasharray=(value??0)+' 100';$('score-fill').closest('.gcc171-gauge').setAttribute('aria-valuenow',String(value??0));
  $('score-fill').classList.toggle('success',value>=80);
  $('score-value').classList.toggle('success',value>=80);
  $('best').textContent='Best Score: '+(best==null?'—':best+'%');
  $('score-message').textContent=value==null?'Aim for 80% or higher! 🎯':value===100?'🏆 PERFECT! 100% accuracy!':value>=90?'🌟 Excellent! 90%+ achieved!':value>=80?'🎉 Great! 80%+ achieved!':'🌱 Keep going! Listen and try again.';
 }
 function paintItem(){
  const s=stage(),arr=items(),item=arr[itemIndex],saved=scoreFor(role,level,s.id,itemIndex);
  $('dialog-heading').textContent=s.icon+' '+s.title;
  $('scene-icon').textContent=s.icon;$('scene-title').textContent=s.scene;$('scene-hint').textContent=s.hint;document.getElementById('gcc178-dialog-image').src=stageArt(role,stageIndex);
  $('scene-level').textContent=levelName[level].toUpperCase();
  $('counter').textContent=(itemIndex+1)+' / '+arr.length;
  $('prev').disabled=itemIndex===0;$('next').textContent=itemIndex===arr.length-1?'Next stage →':'Next phrase →';
  const cue=document.getElementById('gcc174-dialog-cue');
  cue.hidden=!(item.cue||item.context);
  document.getElementById('gcc174-dialog-cue-en').textContent=item.cue||item.context||'';
  document.getElementById('gcc174-dialog-cue-ja').textContent=item.cueJa||item.contextJa||'';
  $('prompt').textContent=fillPracticePhrase(item.text,state.profile);
  $('japanese').textContent=fillPracticePhrase(item.ja,state.profile);
  $('transcript').textContent=saved?.transcript||'Your words will appear here…';
  paintScore(saved?.last,saved?.best);
  $('status').textContent=SpeechRecognition?'':'Speech recognition unavailable. Try Chrome or Safari.';
  $('start').disabled=!SpeechRecognition;$('end').disabled=true;
  $('confetti').replaceChildren();
 }
 function stopRecognition(){token++;recording=false;ending=false;clearTimeout(scoreTimer);if(recognition){const r=recognition;recognition=null;try{r.abort();}catch{}}$('start').disabled=!SpeechRecognition;$('end').disabled=true;root.classList.remove('gcc170-recording');}
 function paintPreview(){
  const s=stage(),scene=PRACTICE_SCENES_V174[role][s.id];
  document.getElementById('gcc173-preview-icon').textContent=s.icon;
  document.getElementById('gcc173-preview-title').textContent=s.title;
  document.getElementById('gcc173-preview-ja').textContent=scene.ja;
  document.getElementById('gcc173-preview-goal').textContent=scene.goal;
  document.getElementById('gcc173-preview-goal-ja').textContent=scene.goalJa;
  const art=document.getElementById('gcc178-stage-image');art.src=stageArt(role,stageIndex);art.alt='Zoom scenario: '+s.title;
  document.getElementById('gcc174-mission-en').textContent=scene.scenario+' — '+scene.mission;
  document.getElementById('gcc174-mission-ja').textContent=scene.scenarioJa+'：'+scene.missionJa;
  applyMissionLanguage();
  const list=document.getElementById('gcc173-phrase-list');list.replaceChildren();
  items().forEach((item,i)=>{
    const score=scoreFor(role,level,s.id,i);
    const button=el('button','gcc173-phrase-row');button.type='button';
    const number=el('span','gcc173-phrase-number',String(i+1).padStart(2,'0'));
    const body=el('span','gcc173-phrase-body');
    if(item.cue)body.append(el('span','gcc174-cue',item.cue),el('span','gcc174-cue-ja',item.cueJa||''));
    body.append(el('strong','',fillPracticePhrase(item.text,state.profile)),el('small','',fillPracticePhrase(item.ja,state.profile)));
    const metrics=el('span','gcc178-phrase-metrics');
  const attempts=el('small','gcc178-attempts',(score?.attempts||0)+' tries');
  const accuracy=el('strong','gcc178-accuracy',score?score.best+'%':'—%');
  const bar=el('span','gcc178-accuracy-bar');
  bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','Best accuracy');
  bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
  const value=Math.max(0,Math.min(100,Number(score?.best)||0));
  bar.setAttribute('aria-valuenow',String(value));
  const fill=el('span','gcc178-accuracy-fill');fill.style.width=value+'%';
  bar.append(fill);metrics.append(attempts,accuracy,bar);
  const result=el('span','gcc173-phrase-result',score?'Practice ↗':'Start ↗');
  if(score?.best>=80)result.classList.add('gcc173-phrase-passed');
  metrics.append(result);button.append(number,body,metrics);
  button.addEventListener('click',()=>openStage(stageIndex,i));
    list.append(button);
  });
 }
 function selectStage(i){
  tone();stopRecognition();stageIndex=i;itemIndex=0;
  paintStages();paintPreview();
  document.getElementById('gcc173-phrase-list').scrollTop=0;
 }
 function openStage(i,index=0){
  tone('next');stopRecognition();stageIndex=i;itemIndex=index;
  paintItem();stageDialog.showModal();
 }
 function switchRole(r){stopRecognition();role=r;stageIndex=0;root.querySelectorAll('[data-role]').forEach(b=>{const on=b.dataset.role===r;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});updateStageCount();paintStages();paintPreview();}
 function switchLevel(l){stopRecognition();level=l;root.querySelectorAll('[data-level]').forEach(b=>{const on=b.dataset.level===l;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});updateStageCount();paintStages();paintPreview();}
 const setup=document.getElementById('gcc178-setup'),practice=document.getElementById('gcc178-practice-content');
 const roleStep=document.getElementById('gcc178-role-step'),levelStep=document.getElementById('gcc178-level-step');
 const changeButton=document.getElementById('gcc178-change'),profileButton=$('profile-open');
 const profileSkip=document.getElementById('gcc178-profile-skip'),profileBack=document.getElementById('gcc178-profile-back');
 const missionEn=document.getElementById('gcc174-mission-en'),missionJa=document.getElementById('gcc174-mission-ja');
 const missionMore=document.getElementById('gcc180-mission-more'),missionPanel=root.querySelector('.gcc180-mission');
 const soundToggle=document.getElementById('gcc180-sound-toggle');
 let soundEnabled=true,audioContext=null,confettiTimer=null;
 try{soundEnabled=localStorage.getItem('gcc-practice-sounds')!=='off';}catch{}
 function tone(kind='tap'){
  if(!soundEnabled)return;
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   if(!audioContext)audioContext=new Audio();
   if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
   const notes=kind==='100'?[523,659,784,1046,1318]:kind==='90'?[493,659,880]:kind==='80'?[440,554,659]:kind==='retry'?[392,440]:kind==='next'?[587,784]:[523,659];
   const gain=kind==='100'?.049:kind==='tap'?.025:.032;
   notes.forEach((hz,i)=>{
    const t=audioContext.currentTime+i*(kind==='tap'?.055:.093),osc=audioContext.createOscillator(),vol=audioContext.createGain();
    osc.type='sine';osc.frequency.value=hz;
    vol.gain.setValueAtTime(.0001,t);vol.gain.exponentialRampToValueAtTime(gain,t+.017);
    vol.gain.exponentialRampToValueAtTime(.0001,t+(kind==='tap'?.13:.22));
    osc.connect(vol);vol.connect(audioContext.destination);osc.start(t);osc.stop(t+.24);
   });
  }catch{/* Sound is an enhancement; it must never interrupt the activity. */}
 }
 function applyMissionLanguage(){
  missionEn.hidden=missionLanguage!=='en';missionJa.hidden=missionLanguage!=='ja';
  missionPanel.classList.toggle('gcc180-mission-expanded',missionExpanded);
  missionEn.title=missionEn.textContent;missionJa.title=missionJa.textContent;
  missionMore.textContent=missionExpanded?'Less ↑':'More ↓';missionMore.setAttribute('aria-expanded',String(missionExpanded));
  root.querySelectorAll('[data-mission-lang]').forEach(b=>{
   const on=b.dataset.missionLang===missionLanguage;b.setAttribute('aria-pressed',String(on));b.classList.toggle('active',on);
  });
 }
 root.querySelectorAll('[data-mission-lang]').forEach(b=>b.addEventListener('click',()=>{missionLanguage=b.dataset.missionLang;missionExpanded=false;applyMissionLanguage();tone();}));
 missionMore.addEventListener('click',()=>{missionExpanded=!missionExpanded;applyMissionLanguage();tone();});
 soundToggle.addEventListener('click',()=>{
  soundEnabled=!soundEnabled;soundToggle.textContent=soundEnabled?'♪ Sound On':'♪ Sound Off';
  soundToggle.setAttribute('aria-pressed',String(soundEnabled));
  try{localStorage.setItem('gcc-practice-sounds',soundEnabled?'on':'off');}catch{}
  if(soundEnabled)tone();
 });
 soundToggle.textContent=soundEnabled?'♪ Sound On':'♪ Sound Off';soundToggle.setAttribute('aria-pressed',String(soundEnabled));
 function showSetup(step){
  setupStep=step;setup.hidden=false;practice.hidden=true;
  roleStep.hidden=step!=='role';levelStep.hidden=step!=='level';
  changeButton.hidden=true;profileButton.hidden=true;
 }
 function showPractice(){
  setupStep='practice';setup.hidden=true;practice.hidden=false;
  changeButton.hidden=false;profileButton.hidden=false;
  updateStageCount();paintStages();paintPreview();
 }
 function showProfile(fromSetup){
  profileFromSetup=fromSetup;
  profileBack.hidden=!fromSetup;profileSkip.hidden=!fromSetup;
  document.getElementById('gcc171-profile-guide').hidden=!fromSetup;
  profileDialog.showModal();
 }
 root.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>{tone('next');switchRole(b.dataset.role);showSetup('level');}));
 root.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>{tone('next');switchLevel(b.dataset.level);showProfile(true);}));
 document.getElementById('gcc178-role-back').addEventListener('click',()=>{tone();showSetup('role');});
 changeButton.addEventListener('click',()=>{tone();showSetup('role');});
 profileButton.addEventListener('click',()=>{tone();showProfile(false);});
 $('profile-close').addEventListener('click',()=>{tone();profileDialog.close();if(profileFromSetup)showSetup('level');});
 profileBack.addEventListener('click',()=>{tone();profileDialog.close();showSetup('level');});
 profileSkip.addEventListener('click',()=>{tone('next');profileDialog.close();showPractice();});
 for(const field of ['name','school','hobby','hometown','schoolDescription']){$(field).value=state.profile[field]||'';$(field).addEventListener('input',()=>{state.profile[field]=$(field).value.trim();save();if(stageDialog.open&&!recording)paintItem();paintPreview();});}
 document.getElementById('gcc171-profile-save').addEventListener('click',()=>{tone('next');state.profile.onboarded=true;save();profileDialog.close();if(profileFromSetup)showPractice();});
 $('reset').addEventListener('click',()=>{if(!confirm('Reset all practice scores on this device? / すべての成績を削除しますか？'))return;state.scores={};save();updateStageCount();paintStages();paintPreview();if(stageDialog.open)paintItem();});
 $('dialog-close').addEventListener('click',()=>stageDialog.close());
 stageDialog.addEventListener('close',()=>{
  stopRecognition();
  // Keep the selected sidebar stage and its phrase list visible after speaking.
  if(root.isConnected){paintStages();paintPreview();}
 });
 stageDialog.addEventListener('cancel',()=>stopRecognition());
 $('prev').addEventListener('click',()=>{tone();stopRecognition();itemIndex=Math.max(0,itemIndex-1);paintItem();});
 $('next').addEventListener('click',()=>{tone();stopRecognition();if(itemIndex<items().length-1)itemIndex++;else{stageIndex=(stageIndex+1)%stages().length;itemIndex=0;}paintItem();});
 $('listen').addEventListener('click',()=>{if(!window.speechSynthesis){$('status').textContent='Text-to-speech unavailable.';return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('prompt').textContent);u.lang='en-US';u.rate=.88;speechSynthesis.speak(u);});
 function playSuccess(accuracy){tone(accuracy===100?'100':accuracy>=90?'90':'80');}
 function celebrate(accuracy){
  const area=$('confetti');area.replaceChildren();clearTimeout(confettiTimer);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const amount=accuracy===100?130:accuracy>=90?70:28;
  if(!reduced){
   for(let i=0;i<amount;i++){
    const piece=el('i');piece.style.left=(Math.random()*100)+'%';
    piece.style.animationDelay=(Math.random()*.65)+'s';
    piece.style.background=['#d6b257','#2c89ba','#75c2a1','#b7a5dc','#f2c780'][i%5];
    piece.style.transform='rotate('+(Math.random()*360)+'deg)';
    if(accuracy===100)piece.style.width='11px';
    area.append(piece);
   }
   confettiTimer=setTimeout(()=>area.replaceChildren(),3200);
  }
  playSuccess(accuracy);
 }
 function updateLive(){
  $('transcript').textContent=(segments.join(' ')+' '+interim).trim()||'Listening…';
 }
 function begin(){
  if(!SpeechRecognition||recording)return;
  tone('tap');
  window.speechSynthesis?.cancel();stopRecognition();recording=true;ending=false;segments=[];interim='';const myToken=token;
  $('start').disabled=true;$('end').disabled=false;$('status').textContent='🔴 Listening… Press End & Score when you finish. / 終了ボタンまで採点しません。';
  $('transcript').textContent='Listening…';root.classList.add('gcc170-recording');
  // Browser speech APIs can auto-end after a pause. Restart recognition while Start is active;
  // only the learner's explicit End button triggers scoring.
  const listen=()=>{
   if(!recording||ending||token!==myToken||!stageDialog.open)return;
   let rec;try{rec=new SpeechRecognition();recognition=rec;rec.lang='en-US';rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=1;}catch(e){$('status').textContent='Microphone unavailable: '+e.message;stopRecognition();return;}
   rec.onresult=ev=>{if(token!==myToken||!recording)return;let latest='';for(let i=ev.resultIndex;i<ev.results.length;i++){const result=ev.results[i];if(result.isFinal){segments.push(result[0].transcript.trim());}else latest+=result[0].transcript+' ';}interim=latest.trim();updateLive();};
   rec.onerror=ev=>{if(token!==myToken)return;if(['not-allowed','service-not-allowed','audio-capture','language-not-supported'].includes(ev.error)){stopRecognition();$('status').textContent='Microphone error: '+ev.error+'. Please check permission / settings.';}else if(ev.error!=='no-speech'&&ev.error!=='aborted')$('status').textContent='Recognition interrupted ('+ev.error+'). Reconnecting…';};
   rec.onend=()=>{if(token!==myToken)return;recognition=null;if(recording&&!ending){setTimeout(listen,250);}else if(ending)finish();};
   try{rec.start();}catch(e){stopRecognition();$('status').textContent='Could not start microphone: '+e.message;}
  };
  listen();
 }
 function finish(){
  if(!ending)return;
  ending=false;recording=false;root.classList.remove('gcc170-recording');$('start').disabled=!SpeechRecognition;$('end').disabled=true;
  const text=(segments.join(' ')+' '+interim).trim();$('transcript').textContent=text||'No speech was recognized.';
  if(!text){$('status').textContent='No speech recognized. Please try again.';tone('retry');return;}
  const s=stage(),item=items()[itemIndex],result=scorePracticePhrase(item.text,text,state.profile),k=key(role,level,s.id,itemIndex),prev=state.scores[k];
  const best=Math.max(prev?.best||0,result.accuracy);
  state.scores[k]={best,last:result.accuracy,transcript:text,template:item.text,attempts:(prev?.attempts||0)+1};
  save();paintScore(result.accuracy,best);updateStageCount();paintStages();paintPreview();
  $('status').textContent=result.accuracy===100?'🏆 Perfect! 100% / 満点！':result.accuracy>=90?'🌟 Excellent! 90%+ / 素晴らしい！':result.accuracy>=80?'🎉 Great! 80%+ / 合格！':'💪 Almost there! Try again! / もう一度挑戦！';
  if(result.accuracy>=80)celebrate(result.accuracy);else tone('retry');
 }
 $('start').addEventListener('click',begin);
 $('end').addEventListener('click',()=>{
  if(!recording||ending)return;
  tone('tap');ending=true;$('end').disabled=true;$('status').textContent='Scoring your complete answer…';
  if(recognition){try{recognition.stop();}catch{finish();}scoreTimer=setTimeout(finish,1600);}else finish();
 });
 window.addEventListener('hashchange',stopRecognition,{once:true});
 switchRole('student');switchLevel('standard');showSetup('role');
}
