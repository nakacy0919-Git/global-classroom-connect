import {PRACTICE_STAGES,fillPracticePhrase,scorePracticePhrase} from '../../lib/practiceDataV169.js';
import {getPracticeItemsV171 as getPracticeItems,getPracticeTotalsV171 as getPracticeTotals} from '../../lib/practiceCurriculumV171.js';
import '../../styles/practiceStudioV170.css';
import '../../styles/practiceStudioV171.css';
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
const icons={student:'🎓',facilitator:'🎙️'};
const levelName={standard:'Standard',advanced:'Advanced',challenge:'Final Challenge'};
export function PracticePageV170(){return `
<main id="gcc170" class="gcc170">
 <header class="gcc170-top"><a href="#/welcome">← Global Classroom Connect</a><strong>🎤 PRACTICE MODE</strong><span class="gcc171-no-account">No account needed</span><div class="gcc171-language" role="group" aria-label="Language"><button type="button" data-ui-lang="en" aria-pressed="true">EN</button><button type="button" data-ui-lang="ja" aria-pressed="false">日本語</button></div></header>
 <section class="gcc170-overview" aria-label="My Practice Overview">
  <div class="gcc170-overview-title"><span>🏆 MY PRACTICE OVERVIEW</span><strong id="gcc170-overview-role">STUDENT</strong></div>
  <div class="gcc170-stat"><strong id="gcc170-progress">0%</strong><small>Progress</small></div>
  <div class="gcc170-stat"><strong id="gcc170-average">—</strong><small>Average Accuracy</small></div>
  <div class="gcc170-stat"><strong id="gcc170-completed">0 / 24</strong><small>Phrases practiced</small></div>
  <div class="gcc170-overview-bar"><div id="gcc170-progress-bar"></div></div>
 </section>
 <section class="gcc170-controls">
  <div class="gcc170-roles" role="group" aria-label="Choose your role"><button data-role="student" type="button">🎓 Student</button><button data-role="facilitator" type="button">🎙️ Host / Facilitator</button></div>
  <div class="gcc170-levels" role="group" aria-label="Practice difficulty"><button data-level="standard" type="button">⭐ Standard</button><button data-level="advanced" type="button">🚀 Advanced</button><button data-level="challenge" type="button">🏆 Challenge</button></div>
  <button class="gcc170-profile-button" id="gcc170-profile-open" type="button">⚙ My profile</button>
 </section>
 <section class="gcc170-choose"><div><span class="gcc170-kicker">PICK A SITUATION</span><h1>Choose a Stage <span id="gcc170-stage-total">8 stages</span></h1></div><p>Choose a scene and start your speaking adventure!</p></section>
 <section id="gcc170-stages" class="gcc170-stages" aria-label="Practice stages"></section>
 <footer class="gcc170-foot">🔒 Your practice scores are stored on this device only. · Speech-to-text accuracy is not a direct assessment of pronunciation.</footer>
 <dialog id="gcc170-profile-dialog" class="gcc170-dialog gcc170-profile-dialog" aria-label="Personalize your practice">
  <div class="gcc170-dialog-top"><strong>⚙ Make it yours</strong><button type="button" id="gcc170-profile-close">✕ Close</button></div>
  <div class="gcc170-profile-fields"><p id="gcc171-profile-guide">Welcome! Please enter your basic information before practicing. You can change it anytime in My Profile.<br><small lang="ja">ようこそ！まず基本情報を登録しましょう。後からいつでも変更できます。入力した固有名詞は採点しません。</small></p><label>Your name / 名前<input id="gcc170-name" maxlength="70" autocomplete="off" placeholder="Sara"></label><label>School / 学校名<input id="gcc170-school" maxlength="120" autocomplete="off" placeholder="Anjo Gakuen High School"></label><label>Hobby / 趣味<input id="gcc170-hobby" maxlength="80" autocomplete="off" placeholder="playing soccer"></label><label>Hometown / 出身地<input id="gcc170-hometown" maxlength="100" autocomplete="off" placeholder="Aichi, Japan"></label><label>About your school (optional) / 学校の特徴（任意）<textarea id="gcc170-schoolDescription" maxlength="220" rows="2" placeholder="students enjoy international exchanges"></textarea></label><button id="gcc171-profile-save" type="button">✓ Save & Start Practice / 保存して練習へ</button><button id="gcc170-reset" type="button">Reset all practice scores / 成績をリセット</button></div>
 </dialog>
 <dialog id="gcc170-stage-dialog" class="gcc170-dialog gcc170-stage-dialog" aria-label="Speaking practice">
  <div class="gcc170-dialog-top"><strong id="gcc170-dialog-heading">Practice</strong><button id="gcc170-dialog-close" type="button">✕ Close</button></div>
  <div class="gcc170-dialog-scroll">
   <div class="gcc170-scene"><div class="gcc170-scene-icon" id="gcc170-scene-icon">🎧</div><div><span id="gcc170-scene-level" class="gcc170-scene-level">STANDARD</span><h2 id="gcc170-scene-title"></h2><p id="gcc170-scene-hint"></p></div></div>
   <div class="gcc170-phrase-nav"><button type="button" id="gcc170-prev">← Previous</button><span id="gcc170-counter">1 / 3</span><button type="button" id="gcc170-next">Next →</button></div>
   <div class="gcc170-phrase"><div class="gcc171-phrase-top"><span>MODEL PHRASE</span><button id="gcc170-listen" class="gcc171-listen-icon" type="button" aria-label="Listen to the model phrase" title="Listen / お手本を聞く">🔊</button></div><p id="gcc170-prompt"></p><p id="gcc170-japanese" lang="ja"></p></div>
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
 const state=read();let uiLang='en',role='student',level='standard',stageIndex=0,itemIndex=0,recording=false,recognition=null,token=0,segments=[],interim='',ending=false,scoreTimer=null;
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const stages=()=>PRACTICE_STAGES[role],stage=()=>stages()[stageIndex],items=()=>getPracticeItems(role,stage().id,level);
 const profileDialog=$('profile-dialog'),stageDialog=$('stage-dialog');
 const save=()=>{if(!write(state))$('status').textContent='This browser could not save scores.';};
 const key=(r,l,s,i)=>r+'|'+l+'|'+s+'|'+i;
 const scoreFor=(r,l,s,i)=>state.scores[key(r,l,s,i)];
 const total=()=>getPracticeTotals(role,level);
 const allScores=()=>stages().flatMap(s=>getPracticeItems(role,s.id,level).map((_,i)=>scoreFor(role,level,s.id,i)).filter(Boolean));
 function updateOverview(){
  const scored=allScores(),completed=scored.length,progress=Math.round(completed/total()*100);
  $('progress').textContent=progress+'%';$('progress-bar').style.width=progress+'%';
  $('average').textContent=completed?Math.round(scored.reduce((n,x)=>n+x.best,0)/completed)+'%':'—';
  $('completed').textContent=completed+' / '+total();
  $('overview-role').textContent=icons[role]+' '+role.toUpperCase()+' · '+levelName[level].toUpperCase();
  $('stage-total').textContent=stages().length+' stages';
 }
 function paintStages(){
  const list=$('stages');list.replaceChildren();
  stages().forEach((s,i)=>{
   const done=getPracticeItems(role,s.id,level).filter((_,n)=>scoreFor(role,level,s.id,n)).length;
   const b=el('button','gcc170-stage');
   b.type='button';b.append(el('span','gcc170-stage-icon',s.icon));
   const text=el('span','gcc170-stage-text');text.append(el('strong','',String(i+1).padStart(2,'0')+' · '+s.title),el('small','',s.scene));b.append(text);
   const right=el('span','gcc170-stage-right');right.append(el('strong','',done+'/'+getPracticeItems(role,s.id,level).length),el('small','',done===getPracticeItems(role,s.id,level).length?'✓ Completed':'Tap to practice →'));b.append(right);
   b.addEventListener('click',()=>openStage(i));list.append(b);
  });
 }
 function paintScore(value,best){
  $('score-value').textContent=value==null?'—%':value+'%';
  $('score-fill').style.strokeDasharray=(value??0)+' 100';$('score-fill').closest('.gcc171-gauge').setAttribute('aria-valuenow',String(value??0));
  $('score-fill').classList.toggle('success',value>=80);
  $('score-value').classList.toggle('success',value>=80);
  $('best').textContent='Best Score: '+(best==null?'—':best+'%');
  $('score-message').textContent=value==null?'Aim for 80% or higher! 🎯':value>=80?'🎉 AWESOME! Stage star earned!':'🌱 Keep going! Listen and try again.';
 }
 function paintItem(){
  const s=stage(),arr=items(),item=arr[itemIndex],saved=scoreFor(role,level,s.id,itemIndex);
  $('dialog-heading').textContent=s.icon+' '+s.title;
  $('scene-icon').textContent=s.icon;$('scene-title').textContent=s.scene;$('scene-hint').textContent=s.hint;
  $('scene-level').textContent=levelName[level].toUpperCase();
  $('counter').textContent=(itemIndex+1)+' / '+arr.length;
  $('prev').disabled=itemIndex===0;$('next').textContent=itemIndex===arr.length-1?'Next stage →':'Next phrase →';
  $('prompt').textContent=fillPracticePhrase(item.text,state.profile);
  $('japanese').textContent=fillPracticePhrase(item.ja,state.profile);
  $('transcript').textContent=saved?.transcript||'Your words will appear here…';
  paintScore(saved?.last,saved?.best);
  $('status').textContent=SpeechRecognition?'':'Speech recognition unavailable. Try Chrome or Safari.';
  $('start').disabled=!SpeechRecognition;$('end').disabled=true;
  $('confetti').replaceChildren();
 }
 function stopRecognition(){token++;recording=false;ending=false;clearTimeout(scoreTimer);if(recognition){const r=recognition;recognition=null;try{r.abort();}catch{}}$('start').disabled=!SpeechRecognition;$('end').disabled=true;root.classList.remove('gcc170-recording');}
 function openStage(i){stopRecognition();stageIndex=i;itemIndex=0;paintItem();stageDialog.showModal();}
 function switchRole(r){stopRecognition();role=r;root.querySelectorAll('[data-role]').forEach(b=>{const on=b.dataset.role===r;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});updateOverview();paintStages();}
 function switchLevel(l){stopRecognition();level=l;root.querySelectorAll('[data-level]').forEach(b=>{const on=b.dataset.level===l;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});updateOverview();paintStages();}
 root.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>switchRole(b.dataset.role)));
 root.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>switchLevel(b.dataset.level)));
 $('profile-open').addEventListener('click',()=>profileDialog.showModal());
 $('profile-close').addEventListener('click',()=>profileDialog.close());
 for(const field of ['name','school','hobby','hometown','schoolDescription']){$(field).value=state.profile[field]||'';$(field).addEventListener('input',()=>{state.profile[field]=$(field).value.trim();save();if(stageDialog.open&&!recording)paintItem();});}
 document.getElementById('gcc171-profile-save').addEventListener('click',()=>{state.profile.onboarded=true;save();profileDialog.close();});
 $('reset').addEventListener('click',()=>{if(!confirm('Reset all practice scores on this device? / すべての成績を削除しますか？'))return;state.scores={};save();updateOverview();paintStages();if(stageDialog.open)paintItem();});
 $('dialog-close').addEventListener('click',()=>stageDialog.close());
 stageDialog.addEventListener('close',()=>stopRecognition());
 stageDialog.addEventListener('cancel',()=>stopRecognition());
 $('prev').addEventListener('click',()=>{stopRecognition();itemIndex=Math.max(0,itemIndex-1);paintItem();});
 $('next').addEventListener('click',()=>{stopRecognition();if(itemIndex<items().length-1)itemIndex++;else{stageIndex=(stageIndex+1)%stages().length;itemIndex=0;}paintItem();});
 $('listen').addEventListener('click',()=>{if(!window.speechSynthesis){$('status').textContent='Text-to-speech unavailable.';return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('prompt').textContent);u.lang='en-US';u.rate=.88;speechSynthesis.speak(u);});
 function playSuccess(){
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;const ctx=new Audio();[523.25,659.25,783.99,1046.5].forEach((hz,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.11;o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.12,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+.32);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.35);});setTimeout(()=>ctx.close().catch(()=>{}),1300);}catch{}
 }
 function celebrate(){
  const area=$('confetti');area.replaceChildren();
  for(let i=0;i<70;i++){const piece=el('i');piece.style.left=(Math.random()*100)+'%';piece.style.animationDelay=(Math.random()*.55)+'s';piece.style.background=['#ffd739','#16d5ae','#f96cab','#4aaaff','#ff963c'][i%5];piece.style.transform='rotate('+(Math.random()*360)+'deg)';area.append(piece);}
  setTimeout(()=>area.replaceChildren(),3000);playSuccess();
 }
 function updateLive(){
  $('transcript').textContent=(segments.join(' ')+' '+interim).trim()||'Listening…';
 }
 function begin(){
  if(!SpeechRecognition||recording)return;
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
  if(!text){$('status').textContent='No speech recognized. Please try again.';return;}
  const s=stage(),item=items()[itemIndex],result=scorePracticePhrase(item.text,text,state.profile),k=key(role,level,s.id,itemIndex),prev=state.scores[k];
  const best=Math.max(prev?.best||0,result.accuracy);
  state.scores[k]={best,last:result.accuracy,transcript:text,attempts:(prev?.attempts||0)+1};
  save();paintScore(result.accuracy,best);updateOverview();paintStages();
  $('status').textContent=result.accuracy>=80?'🎉 Excellent! 80% cleared! / 合格！':'💪 Almost there! Try again! / もう一度挑戦！';
  if(result.accuracy>=80)celebrate();
 }
 $('start').addEventListener('click',begin);
 $('end').addEventListener('click',()=>{
  if(!recording||ending)return;
  ending=true;$('end').disabled=true;$('status').textContent='Scoring your complete answer…';
  if(recognition){try{recognition.stop();}catch{finish();}scoreTimer=setTimeout(finish,1600);}else finish();
 });
 window.addEventListener('hashchange',stopRecognition,{once:true});
 root.querySelectorAll('[data-ui-lang]').forEach(b=>b.addEventListener('click',()=>{uiLang=b.dataset.uiLang;root.querySelectorAll('[data-ui-lang]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));const jp=uiLang==='ja';root.querySelector('.gcc170-choose h1').firstChild.textContent=jp?'ステージを選ぶ ':'Choose a Stage ';root.querySelector('.gcc170-kicker').textContent=jp?'シチュエーションを選ぼう':'PICK A SITUATION';root.querySelector('.gcc170-overview-title span').textContent=jp?'🏆 練習の記録':'🏆 MY PRACTICE OVERVIEW';root.querySelector('#gcc170-profile-open').textContent=jp?'⚙ マイプロフィール':'⚙ My profile';}));
 switchRole('student');switchLevel('standard');
 if(!state.profile.onboarded){setTimeout(()=>{if(root.isConnected&&!profileDialog.open)profileDialog.showModal();},120);}
}
