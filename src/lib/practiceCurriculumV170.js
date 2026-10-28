import {PRACTICE_STAGES} from './practiceDataV169.js';
export const PRACTICE_LEVELS=['standard','advanced','challenge'];
const japanese={
 student:{
 audio:['こんにちは！私の声ははっきり聞こえますか？','あなたの声は聞こえますが、少し小さいです。','マイクをオンにしていただけますか？'],
 join:['みなさん、こんにちは！ここは正しいブレイクアウトルームですか？','遅れてすみません。参加してもいいですか？','待ってくれてありがとうございます。'],
 intro:['こんにちは！私の名前は{name}です。','私は{school}の生徒です。','今日はみなさんに会えてうれしいです。'],
 hobbies:['自由時間には{hobby}を楽しんでいます。','放課後は何をするのが好きですか？','面白そうですね！もっと教えてくれますか？'],
 school:['あなたの学校は何時に始まりますか？','人と話すのが楽しいので、好きな科目は英語です。','あなたの国の一般的な学校生活はどんな感じですか？'],
 culture:['あなたの文化の特別なところは何ですか？','私の経験とは違いますね。教えてくれてありがとう。','それはどういう意味か説明してくれますか？'],
 repair:['すみません、もう少しゆっくり言ってもらえますか？','最後の部分が聞き取れませんでした。','チャットに入力してもらえますか？'],
 closing:['今日はお話しできて本当に楽しかったです。','あなたの国について教えてくれてありがとう。','また会えるといいですね。さようなら！']
 },
 facilitator:{
 welcome:['みなさん、ようこそ！私の名前は{name}です。','まず簡単な自己紹介から始めましょう。','名前と学校を教えてください。'],
 audio:['みなさん、私の声ははっきり聞こえますか？','話す準備ができたらマイクのミュートを解除してください。','音声が使えない場合はチャットを使ってください。'],
 turns:['まだ話していない人で発言したい人はいますか？','ありがとうございます。次は別の人の意見を聞きましょう。','ゆっくりで大丈夫ですよ。'],
 questions:['この話題についてどう思いますか？','具体例を挙げてもらえますか？','違う経験をした人はいますか？'],
 respect:['お互いの話を尊重して聞きましょう。','異なる経験には価値があります。','別の言い方であなたの考えを説明できますか？'],
 time:['この話題の残り時間は5分です。','次の質問に移りましょう。','最後に一言ずつお願いします。'],
 host:['グローバルクラスルームへようこそ。','割り当てられたブレイクアウトルームに入ってください。','困ったときはホストに連絡してください。'],
 end:['今日は参加してくれてありがとうございました。','メインルームに戻ってください。','次のグローバルクラスルームでも会いましょう。']
 }
};
const advanced={
 student:{
 audio:['I am having trouble hearing you. Could you check your microphone settings?','Your voice keeps cutting out, so I might have missed something.','Let me reconnect to the meeting and see if that solves the problem.'],
 join:['I have just joined the room. Could someone tell me what we are discussing?','I apologize for the delay. My internet connection was unstable.','Before we begin, shall we briefly introduce ourselves?'],
 intro:['I am {name}, and I attend {school} in Japan.','One thing I would like you to know about my school is our international exchange program.','I am looking forward to learning about your experiences and sharing mine.'],
 hobbies:['One of my favorite hobbies is {hobby}, because it helps me relax.','How did you first become interested in that activity?','Although our hobbies are different, I think we have a lot in common.'],
 school:['At my school, we usually take part in club activities after classes.','Could you describe a typical day at your school, including lunch and after-school activities?','I was surprised to learn how different our school schedules can be.'],
 culture:['I would love to hear about a tradition that is important to your community.','I do not want to make assumptions, so could you tell me more about that custom?','Even though our backgrounds are different, I can understand why it matters to you.'],
 repair:['I understood the main idea, but could you clarify the example you mentioned?','There seems to be a delay in the audio, so let us take turns speaking.','Would you mind rephrasing your question using simpler words?'],
 closing:['My favorite part of our discussion was discovering how much we have in common.','I appreciate everyone taking the time to share their ideas so openly.','I hope we can continue this conversation in another exchange soon.']
 },
 facilitator:{
 welcome:['Thank you for joining us from different parts of the world today.','Let us make sure everyone has a chance to introduce themselves.','We will begin with a short icebreaker before moving to our main topic.'],
 audio:['If your microphone is not working, please check the audio settings or rejoin the room.','I noticed some background noise. Could everyone mute their microphones when not speaking?','Please let me know in the chat if you are having technical difficulties.'],
 turns:['We have heard some great ideas. Would someone who has not spoken like to add a thought?','Let us pause for a moment so everyone has time to think.','Thank you for contributing. I would like to invite another perspective now.'],
 questions:['Could you expand on that idea by sharing a personal example?','What similarities and differences have you noticed between your experiences?','How might someone from a different background approach this question?'],
 respect:['We may have different opinions, but it is important to remain respectful.','Let us ask questions to understand rather than judge each other.','Thank you for clarifying your point. I think we can learn from this difference.'],
 time:['We have approximately three minutes left, so let us focus on our final question.','Before we move on, could each person share one key takeaway?','Please finish your current thought so we can return to the main room on time.'],
 host:['Please check the room number assigned to your school before joining.','Facilitators, kindly make sure every participant has an opportunity to speak.','We will send a message to all breakout rooms when five minutes remain.'],
 end:['I would like to thank all participants and facilitators for their thoughtful contributions.','Before leaving, please share one thing you learned from another culture.','We look forward to welcoming you to another international exchange soon.']
 }
};
const advancedJa={
 student:{
 audio:['声が聞こえにくいです。マイクの設定を確認してもらえますか？','声が途切れているので、聞き逃したかもしれません。','接続し直して問題が解決するか確認します。'],
 join:['今入室しました。何について話しているか教えてもらえますか？','遅れてすみません。ネット接続が不安定でした。','始める前に簡単に自己紹介しませんか？'],
 intro:['私は{name}で、日本の{school}に通っています。','私の学校の特徴の一つは国際交流プログラムです。','皆さんの経験を学び、自分の経験も伝えるのが楽しみです。'],
 hobbies:['私の好きな趣味は{hobby}で、リラックスできるからです。','その活動に興味を持ったきっかけは何ですか？','趣味は違っても、共通点がたくさんあると思います。'],
 school:['私の学校では授業後に部活動をすることが多いです。','昼食や放課後も含め、学校の一日を教えてもらえますか？','学校の時間割がこんなに違うことに驚きました。'],
 culture:['地域で大切にされている伝統について聞きたいです。','決めつけたくないので、その習慣についてもっと教えてください。','背景は違っても、それが大切な理由は理解できます。'],
 repair:['大体は分かりましたが、例についてもう少し説明してもらえますか？','音声に遅延があるようなので、順番に話しましょう。','もっと簡単な言葉で質問を言い換えてもらえますか？'],
 closing:['今日一番よかったのは、共通点を発見できたことです。','皆さんが率直に意見を共有してくれたことに感謝します。','また別の交流で話の続きをできるといいですね。']
 },
 facilitator:{
 welcome:['世界各地からご参加いただきありがとうございます。','全員が自己紹介できるようにしましょう。','本題の前に短いアイスブレイクから始めます。'],
 audio:['マイクが動かない場合は設定を確認するか再入室してください。','周囲の音が入っています。話さないときはミュートしてください。','技術的な問題があればチャットで知らせてください。'],
 turns:['素晴らしい意見が出ました。まだ話していない人はどうですか？','みんなが考えられるよう少し時間を取りましょう。','ありがとうございます。次は別の視点を聞きたいと思います。'],
 questions:['個人的な例を挙げてもう少し詳しく説明してもらえますか？','お互いの経験にどんな共通点と違いがありますか？','違う背景の人ならこの問題をどう考えるでしょうか？'],
 respect:['意見が違っても、互いを尊重することが大切です。','判断するのではなく理解するために質問しましょう。','説明してくれてありがとう。違いから学べると思います。'],
 time:['残り約3分なので、最後の質問に集中しましょう。','次に進む前に、一人ずつ学んだことを共有してください。','時間どおり戻れるよう、今の発言をまとめてください。'],
 host:['参加前に学校に割り当てられた部屋番号を確認してください。','ファシリテーターは全員に発言の機会を作ってください。','残り5分になったら全ルームにメッセージを送ります。'],
 end:['参加者とファシリテーターの皆さんに感謝します。','退出前に異文化から学んだことを一つ共有してください。','次回の国際交流でもお会いできることを楽しみにしています。']
 }
};
export function getPracticeItems(role,stage,level='standard'){
 const base=PRACTICE_STAGES[role]?.find(s=>s.id===stage);
 if(!base)return [];
 const en=level==='advanced'?advanced[role][stage]:base.lines;
 const ja=level==='advanced'?advancedJa[role][stage]:japanese[role][stage];
 if(level==='challenge'){
  const chunks=base.lines;
  return [{text:chunks.join(' '),ja:japanese[role][stage].join(' '),id:'challenge',kind:'final'}];
 }
 return en.map((text,i)=>({text,ja:ja[i],id:level+'-'+i,kind:'phrase'}));
}
export function getPracticeTotals(role,level='standard'){return PRACTICE_STAGES[role].reduce((n,s)=>n+getPracticeItems(role,s.id,level).length,0);}
