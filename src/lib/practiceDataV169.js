// GCC Practice: role-based scenarios. Personal fields are placeholders and are never scored.
export const PRACTICE_STAGES={
 student:[
 {id:'audio',icon:'🎧',title:'Mic & audio check',scene:'Before joining the Zoom room',hint:'Check whether everyone can hear you.',lines:['Hello! Can you hear me clearly?','I can hear you, but your voice is a little quiet.','Could you please turn on your microphone?']},
 {id:'join',icon:'🚪',title:'Joining the room',scene:'You have just entered your breakout room',hint:'Greet the group and confirm you are in the right room.',lines:['Hi everyone! Is this the right breakout room?','Sorry I am late. May I join you?','Thank you for waiting for me.']},
 {id:'intro',icon:'👋',title:'Introduce yourself',scene:'Your first conversation with students overseas',hint:'Share your name and school confidently.',lines:['Hello! My name is {name}.','I am a student at {school}.','I am happy to meet everyone today.']},
 {id:'hobbies',icon:'🎨',title:'Hobbies & interests',scene:'Find something you have in common',hint:'Tell your new friends what you enjoy.',lines:['In my free time, I enjoy {hobby}.','What do you like to do after school?','That sounds interesting! Can you tell me more?']},
 {id:'school',icon:'🏫',title:'School & daily life',scene:'Compare school life around the world',hint:'Ask questions and give simple explanations.',lines:['What time does your school start?','My favorite subject is English because I enjoy talking with people.','What is a typical school day like in your country?']},
 {id:'culture',icon:'🌏',title:'Culture & curiosity',scene:'Discover differences with respect',hint:'Ask open questions without making assumptions.',lines:['What is something special about your culture?','That is different from my experience. Thank you for sharing.','Could you explain what that means?']},
 {id:'repair',icon:'💬',title:'When communication breaks down',scene:'The connection or English is difficult',hint:'Keep the conversation going politely.',lines:['Sorry, could you say that again more slowly?','I did not catch the last part.','Could you type that in the chat, please?']},
 {id:'closing',icon:'✨',title:'Wrap up & say goodbye',scene:'The breakout room is about to close',hint:'Finish positively and exchange thanks.',lines:['I really enjoyed talking with you today.','Thank you for teaching me about your country.','I hope we can meet again soon. Goodbye!']}
 ],
 facilitator:[
 {id:'welcome',icon:'🙌',title:'Welcome the group',scene:'You are facilitating a new breakout room',hint:'Help participants feel comfortable.',lines:['Welcome everyone! My name is {name}.','Let us start with a short introduction.','Please tell us your name and your school.']},
 {id:'audio',icon:'🎙️',title:'Technical support',scene:'Someone cannot hear or speak',hint:'Give calm, simple instructions.',lines:['Can everyone hear me clearly?','Please unmute your microphone when you are ready to speak.','If your audio is not working, please use the chat.']},
 {id:'turns',icon:'🔄',title:'Invite quieter students',scene:'Some participants have not spoken yet',hint:'Give everyone an opportunity.',lines:['Would anyone who has not spoken like to share?','Thank you. Let us hear from someone else now.','It is okay to take your time.']},
 {id:'questions',icon:'❓',title:'Guide the discussion',scene:'The conversation needs a new question',hint:'Use follow-up questions.',lines:['What do you think about this topic?','Could you give us an example?','Does anyone have a different experience?']},
 {id:'respect',icon:'🤝',title:'Respectful communication',scene:'A cultural misunderstanding happens',hint:'Keep the group safe and curious.',lines:['Let us listen respectfully to each other.','Different experiences are valuable.','Could you explain your perspective in another way?']},
 {id:'time',icon:'⏱️',title:'Manage time & transitions',scene:'You need to move to the next activity',hint:'Use clear time signals.',lines:['We have five minutes left for this topic.','Let us move on to the next question.','Please share one final thought.']},
 {id:'host',icon:'🧭',title:'Host announcements',scene:'You are giving instructions to several rooms',hint:'Give short, actionable directions.',lines:['Welcome to our Global Classroom session.','Please join your assigned breakout room now.','If you need help, please contact the host.']},
 {id:'end',icon:'🎉',title:'Close the session',scene:'The exchange is ending',hint:'Thank everyone and explain the next step.',lines:['Thank you all for participating today.','Please return to the main room now.','We hope to see you at our next Global Classroom session.']}
 ]
};
export const PRACTICE_VERSION='gcc-practice-v1';
export function fillPracticePhrase(phrase,profile){
 return phrase.replace(/\{(name|school|hobby)\}/g,(_,key)=>String(profile?.[key]||({name:'your name',school:'your school',hobby:'your hobby'}[key])).trim());
}
export function normalizePracticeWords(s){
 return String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9\s]/g,' ').trim().split(/\s+/).filter(Boolean);
}
// Speech recognition is not a phonetic pronunciation evaluator: this is word accuracy.
export function scorePracticePhrase(template,transcript,profile={}){
 const filled=fillPracticePhrase(template,profile);
 const parts=template.split(/(\{(?:name|school|hobby)\})/g);
 const expected=parts.flatMap(part=>/^\{(?:name|school|hobby)\}$/.test(part)?['__name__']:normalizePracticeWords(part));
 const heard=normalizePracticeWords(transcript);
 const n=expected.length,m=heard.length;
 const dp=Array.from({length:n+1},()=>Array(m+1).fill(Infinity));
 dp[0][0]=0;
 for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
  const cost=dp[i][j];if(!Number.isFinite(cost))continue;
  if(i<n&&expected[i]==='__name__'){
   // A proper noun can be skipped or recognized as up to five arbitrary words.
   for(let k=0;k<=Math.min(5,m-j);k++)dp[i+1][j+k]=Math.min(dp[i+1][j+k],cost);
  }else{
   if(i<n)dp[i+1][j]=Math.min(dp[i+1][j],cost+1);
   if(j<m)dp[i][j+1]=Math.min(dp[i][j+1],cost+1);
   if(i<n&&j<m)dp[i+1][j+1]=Math.min(dp[i+1][j+1],cost+(expected[i]===heard[j]?0:1));
  }
 }
 const total=expected.filter(w=>w!=='__name__').length;
 const accuracy=total?Math.max(0,Math.min(100,Math.round(100*(1-dp[n][m]/total)))):100;
 return {accuracy,expected:filled,transcript:String(transcript||''),scoredWords:total,method:'Speech-to-text word match (not phonetic pronunciation)'};
}
export function summarizePractice(scores,role){
 const stages=PRACTICE_STAGES[role]||PRACTICE_STAGES.student;
 const done=stages.map(stage=>{
  const vals=stage.lines.map((_,i)=>scores?.[role]?.[stage.id]?.[i]?.best).filter(v=>typeof v==='number');
  return {id:stage.id,title:stage.title,completed:vals.length,total:stage.lines.length,average:vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0};
 });
 const all=done.reduce((n,x)=>n+x.completed,0),total=done.reduce((n,x)=>n+x.total,0);
 return {stages:done,completed:all,total,progress:Math.round(100*all/total),average:all?Math.round(done.reduce((n,x)=>n+x.average*x.completed,0)/all):0};
}
