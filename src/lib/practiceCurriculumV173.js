import {PRACTICE_STAGES} from './practiceDataV169.js';
import {getPracticeItemsV171} from './practiceCurriculumV171.js';
// Each situation is written for an actual international Zoom breakout-room exchange.
// Five progressive standard utterances: initiate → interact → clarify → respond → conclude.
export const PRACTICE_SCENES_V173={
student:{
 audio:{ja:'Zoomに入る前の音声チェック',goal:'Make sure you can hear and be heard.',goalJa:'マイク・スピーカーを確認して安心して参加する'},
 join:{ja:'ブレイクアウトルームに入室',goal:'Greet classmates and join smoothly.',goalJa:'初対面の相手にあいさつし、会話に加わる'},
 intro:{ja:'名前・出身地・学校の自己紹介',goal:'Introduce yourself and invite a response.',goalJa:'自分の情報を伝え、相手にも質問する'},
 hobbies:{ja:'趣味や好きなことを共有',goal:'Find shared interests through follow-up questions.',goalJa:'共通の趣味を見つけ、会話を広げる'},
 school:{ja:'学校生活や学校の特徴を伝える',goal:'Describe school life and compare routines.',goalJa:'学校の特色を紹介し、学校生活を比較する'},
 culture:{ja:'文化について敬意をもって質問',goal:'Ask respectfully and learn without assumptions.',goalJa:'違いを決めつけずに異文化を学ぶ'},
 repair:{ja:'聞き取れない・接続が悪いとき',goal:'Keep the conversation going through difficulties.',goalJa:'聞き返しや言い換えで会話を続ける'},
 closing:{ja:'交流の振り返りとお別れ',goal:'Express thanks and finish on a positive note.',goalJa:'学んだことを伝え、感謝して終える'}
},
facilitator:{
 welcome:{ja:'参加者を歓迎して交流を始める',goal:'Create a safe and welcoming atmosphere.',goalJa:'参加者が安心して話せる場をつくる'},
 audio:{ja:'マイク・カメラ・接続トラブル対応',goal:'Guide participants through technical problems.',goalJa:'短く明確な指示で音声トラブルを解決する'},
 turns:{ja:'全員に発言の機会をつくる',goal:'Invite contributions without pressure.',goalJa:'話していない人にも無理なく参加を促す'},
 questions:{ja:'質問でディスカッションを深める',goal:'Use open questions and follow-ups.',goalJa:'具体例や理由を聞いて議論を深める'},
 respect:{ja:'文化の違いを尊重する会話',goal:'Respond calmly to cultural misunderstandings.',goalJa:'意見の違いを尊重し安心できる場を守る'},
 time:{ja:'時間管理と話題の切り替え',goal:'Keep the exchange on schedule.',goalJa:'残り時間を知らせ、自然に次へ進む'},
 host:{ja:'全体アナウンスと部屋への案内',goal:'Communicate clear instructions to all rooms.',goalJa:'Zoomの操作と部屋移動を正確に案内する'},
 end:{ja:'交流を締めくくり参加者に感謝',goal:'Summarize learning and close warmly.',goalJa:'参加者に感謝し、振り返りへつなげる'}
}
};
// Standard phrases are short, practical, polite, and ordered like a real exchange.
const S={
student:{
audio:[
['Hi! Can you hear me clearly?','こんにちは！私の声ははっきり聞こえますか？'],
['Yes, I can hear you. Can you hear me?','はい、聞こえます。私の声も聞こえますか？'],
['Sorry, your voice is a little quiet.','すみません、声が少し小さいです。'],
['Could you check your microphone, please?','マイクを確認してもらえますか？'],
['Great, I can hear you now. Thank you!','よかった、今は聞こえます。ありがとう！']],
join:[
['Hello, everyone! May I join you?','みなさん、こんにちは！参加してもいいですか？'],
['Is this the right breakout room?','ここは正しいブレイクアウトルームですか？'],
['Sorry I am a little late.','少し遅れてすみません。'],
['What are you talking about right now?','今、何について話していますか？'],
['Thanks for welcoming me. I am ready!','迎えてくれてありがとう。準備できました！']],
intro:[
['Hi! My name is {name}.','こんにちは！私の名前は{name}です。'],
['I am from {hometown}.','私は{hometown}出身です。'],
['I go to {school}.','私は{school}に通っています。'],
['At my school, {schoolDescription}.','私の学校では{schoolDescription}。'],
['How about you? Where are you from?','あなたはどうですか？どこから来ましたか？']],
hobbies:[
['One of my hobbies is {hobby}.','私の趣味の一つは{hobby}です。'],
['What do you enjoy doing after school?','放課後は何をして楽しみますか？'],
['How did you get interested in that?','それに興味を持ったきっかけは何ですか？'],
['That sounds fun! I would like to try it.','楽しそうですね！私もやってみたいです。'],
['We have something in common!','私たちには共通点がありますね！']],
school:[
['My school is called {school}.','私の学校は{school}といいます。'],
['At my school, {schoolDescription}.','私の学校では{schoolDescription}。'],
['What time do your classes begin?','あなたの学校の授業は何時に始まりますか？'],
['Do you have any school clubs or activities?','学校に部活動や課外活動はありますか？'],
['That is similar to our school!','それは私たちの学校と似ていますね！']],
culture:[
['What is a popular food in your country?','あなたの国で人気の食べ物は何ですか？'],
['Could you tell me about a local tradition?','地元の伝統について教えてもらえますか？'],
['When do people usually celebrate it?','それは普段いつ祝いますか？'],
['I have never heard of that before.','それは初めて聞きました。'],
['Thank you for sharing your culture with me.','あなたの文化を教えてくれてありがとう。']],
repair:[
['Sorry, could you say that again?','すみません、もう一度言ってもらえますか？'],
['Could you speak a little more slowly?','もう少しゆっくり話してもらえますか？'],
['I missed the last word.','最後の単語が聞き取れませんでした。'],
['Could you type it in the chat?','チャットに入力してもらえますか？'],
['Oh, now I understand. Thank you!','ああ、今わかりました。ありがとう！']],
closing:[
['We have just a few minutes left.','残り数分ですね。'],
['I learned something new about your country.','あなたの国について新しいことを学びました。'],
['My favorite part was hearing your stories.','一番よかったのは、みなさんの話を聞けたことです。'],
['Thank you for talking with me today.','今日はお話ししてくれてありがとう。'],
['I hope we can meet again soon. Goodbye!','またすぐに会えるといいですね。さようなら！']]
},
facilitator:{
welcome:[
['Hello, everyone! Welcome to our breakout room.','みなさん、こんにちは！ブレイクアウトルームへようこそ。'],
['My name is {name}, and I will help guide our conversation.','私の名前は{name}です。会話の進行をお手伝いします。'],
['Let us begin with a quick introduction.','簡単な自己紹介から始めましょう。'],
['Please share your name, school, and country.','名前、学校、国を教えてください。'],
['Remember, everyone is welcome to speak.','誰でも発言してよいことを忘れないでください。']],
audio:[
['Can everyone hear me clearly?','みなさん、私の声ははっきり聞こえますか？'],
['Please unmute your microphone when you speak.','話すときはマイクのミュートを解除してください。'],
['Could you check your sound settings?','音声設定を確認してもらえますか？'],
['If your audio is not working, please use the chat.','音声が使えない場合はチャットを利用してください。'],
['Thank you for your patience. Let us continue.','お待ちいただきありがとうございます。続けましょう。']],
turns:[
['Let us hear from a different person now.','次は別の人の意見を聞きましょう。'],
['Would anyone else like to share?','ほかに意見を共有したい人はいますか？'],
['It is okay to take a moment to think.','少し考える時間をとっても大丈夫です。'],
['Thank you for sharing your idea.','考えを共有してくれてありがとう。'],
['Let us make sure everyone gets a turn.','全員に発言の順番が回るようにしましょう。']],
questions:[
['What do you think about this topic?','この話題についてどう思いますか？'],
['Why do you think so?','なぜそう思いますか？'],
['Could you give us an example?','具体例を挙げてくれますか？'],
['Does anyone have a different experience?','違う経験をした人はいますか？'],
['What have we learned from each other?','お互いから何を学びましたか？']],
respect:[
['Let us listen without interrupting.','途中でさえぎらずに話を聞きましょう。'],
['Different opinions are welcome here.','ここでは異なる意見も歓迎します。'],
['Could you explain what you mean?','どういう意味なのか説明してもらえますか？'],
['Let us ask questions instead of making assumptions.','決めつけずに質問しましょう。'],
['Thank you for helping us understand.','理解を深めるのに協力してくれてありがとう。']],
time:[
['We have five minutes left.','残り5分です。'],
['Please try to finish your current thought.','今話していることをまとめてください。'],
['Let us move to the next question.','次の質問に移りましょう。'],
['Would each person share one final idea?','一人ずつ最後の考えを共有してもらえますか？'],
['It is time to return to the main room.','メインルームに戻る時間です。']],
host:[
['Welcome to our Global Classroom session!','グローバルクラスルームへようこそ！'],
['Please check your assigned breakout room number.','割り当てられたブレイクアウトルーム番号を確認してください。'],
['If you need help, please contact the host.','助けが必要な場合はホストに連絡してください。'],
['We will send a message before the rooms close.','ルームが閉じる前にメッセージを送ります。'],
['Please return to the main room when prompted.','案内が表示されたらメインルームに戻ってください。']],
end:[
['Thank you, everyone, for participating.','みなさん、ご参加ありがとうございました。'],
['I really enjoyed hearing your different ideas.','さまざまな考えを聞けてとても楽しかったです。'],
['What is one thing you learned today?','今日学んだことを一つ挙げると何ですか？'],
['Please share your final thoughts in the chat.','最後の感想をチャットで共有してください。'],
['We hope to see you again at Global Classroom!','またグローバルクラスルームでお会いしましょう！']]
}
};
const advancedFix={
student:{
intro:{
0:['I am {name}, and I am joining from {hometown}.','私は{name}です。{hometown}から参加しています。'],
1:['I attend {school}, where {schoolDescription}.','{school}に通っており、そこでは{schoolDescription}。']
},
school:{
2:['One thing I appreciate about my school is that {schoolDescription}.','私の学校で気に入っていることの一つは{schoolDescription}ということです。']
},
repair:{
1:['Your audio is cutting out, so I may have missed a few words.','音声が途切れているため、いくつか聞き逃したかもしれません。']
}
},
facilitator:{
time:{3:['Before we move on, could everyone share one final thought?','次に移る前に、一人ずつ最後に一言お願いできますか？']},
host:{1:['Facilitators, please check that every participant knows their room assignment.','ファシリテーターは全員が部屋番号を把握しているか確認してください。']}
}
};
export function getPracticeItemsV173(role,stageId,level='standard'){
 const existing=getPracticeItemsV171(role,stageId,level);
 if(!PRACTICE_SCENES_V173[role]?.[stageId])return existing;
 if(level==='challenge'){
  const lines=S[role][stageId].slice(0,3);
  return [{id:'challenge',kind:'final',text:lines.map(x=>x[0]).join(' '),ja:lines.map(x=>x[1]).join(' ')}];
 }
 if(level==='standard')return S[role][stageId].map(([text,ja],i)=>({id:'standard-'+i,kind:'phrase',text,ja}));
 if(level==='advanced'){
  const repl=advancedFix[role]?.[stageId]||{};
  return existing.map((x,i)=>repl[i]?{...x,text:repl[i][0],ja:repl[i][1]}:x);
 }
 return existing;
}
export function getPracticeTotalsV173(role,level='standard'){return PRACTICE_STAGES[role]?.reduce((n,s)=>n+getPracticeItemsV173(role,s.id,level).length,0)||0;}
