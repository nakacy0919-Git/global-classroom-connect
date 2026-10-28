import {PRACTICE_STAGES} from './practiceDataV169.js';
import {PRACTICE_SCENES_V173,getPracticeItemsV173} from './practiceCurriculumV173.js';
// V17.4: authentic, inclusive Zoom exchange situations.
// Append only: existing phrase IDs and saved progress remain stable.
// Each new phrase is an independent speaking task with an English/Japanese prompt.
const additions={
 student:{
  audio:{
   standard:[
    ['You hear an echo','I can hear an echo. Should I use headphones?','音声が反響している','声が反響して聞こえます。ヘッドホンを使った方がいいですか？'],
    ['Your microphone is muted','I think my microphone was muted. Can you hear me now?','マイクがミュートだった','マイクがミュートになっていたようです。今は聞こえますか？'],
    ['The other person freezes','Your video seems to be frozen. Is your connection okay?','相手の映像が止まった','映像が止まっているようです。接続は大丈夫ですか？'],
    ['You need a moment','Just a second, please. I am checking my audio settings.','音声設定を確認する','少し待ってください。音声設定を確認しています。'],
    ['The audio works again','I can hear everyone now. Shall we get started?','音声が復旧した','今はみなさんの声が聞こえます。始めましょうか？']
   ],
   advanced:[
    ['There is background noise','There is some background noise on my end, so I will mute myself when I am not speaking.','周囲の雑音に対応する','こちらで周囲の雑音が入るので、話していないときはミュートにします。'],
    ['Audio and video are out of sync','Your voice and video seem slightly out of sync. Could you repeat the last sentence?','音声と映像がずれている','音声と映像が少しずれているようです。最後の文をもう一度言ってもらえますか？'],
    ['You cannot hear one participant','I can hear most people clearly, but I am having trouble hearing one participant. Could we check the microphone?','一人の声だけ聞こえない','ほとんどの人の声は聞こえますが、一人の声が聞き取りにくいです。マイクを確認できますか？']
   ],
   challenge:['A classmate cannot hear you and the sound echoes','You join a breakout room, but a classmate cannot hear you and there is an echo. Politely explain the problem, suggest one solution, and check that everyone is ready.','相手に声が届かず音声も反響している','音声の問題を丁寧に説明し、解決策を提案して、準備ができたか確認しましょう。']
  },
  join:{
   standard:[
    ['You arrive first','Hi! Am I the first person here?','一番乗りした','こんにちは！私が最初ですか？'],
    ['Someone new arrives','Welcome! We were just introducing ourselves.','新しい参加者が入った','ようこそ！ちょうど自己紹介をしていたところです。'],
    ['You need to check the topic','Could someone remind me what our topic is?','テーマを確認したい','今回のテーマを教えてもらえますか？'],
    ['You want to begin together','Shall we introduce ourselves one by one?','自己紹介を提案する','一人ずつ自己紹介しませんか？'],
    ['You do not know a name','Sorry, how should I pronounce your name?','名前の発音を確認する','すみません、お名前はどう発音すればいいですか？']
   ],
   advanced:[
    ['You are new to the group','I have just joined this room. Could someone briefly explain what you have discussed so far?','途中参加して話題を確認する','今この部屋に入りました。これまで話した内容を簡単に教えてもらえますか？'],
    ['A participant is nervous','It is nice to meet you. There is no need to be nervous; we are all here to learn from each other.','緊張している相手を安心させる','お会いできてうれしいです。緊張しなくて大丈夫です。お互いに学ぶために集まっています。'],
    ['You want to share the first turn','Would anyone like to go first, or shall I start with a quick introduction?','最初の発言を促す','どなたか最初に話しますか？それとも私が簡単に自己紹介しましょうか？']
   ],
   challenge:['You enter a room where no one has spoken yet','You enter a quiet breakout room. Greet the group, check that you are in the right place, and suggest a friendly way to begin.','誰も話していない部屋に入った','あいさつをし、部屋を確認して、会話の始め方を提案しましょう。']
  },
  intro:{
   standard:[
    ['Share your grade','I am in my final year of high school.','学年を伝える','私は高校の最終学年です。'],
    ['Describe your hometown','My hometown is known for its friendly people.','地元を紹介する','私の地元は親しみやすい人々で知られています。'],
    ['Ask about a partner school','What is your school like?','相手の学校について聞く','あなたの学校はどんなところですか？'],
    ['Mention a language goal','I want to become more confident speaking English.','英語学習の目標を伝える','もっと自信を持って英語を話せるようになりたいです。'],
    ['Invite another student','Would you like to introduce yourself next?','次の人に自己紹介を促す','次に自己紹介してもらえますか？']
   ],
   advanced:[
    ['Explain why you joined','I joined this exchange because I want to learn how students in other countries see the world.','交流への参加理由を述べる','ほかの国の生徒が世界をどう見ているか学びたくて参加しました。'],
    ['Connect your background to the topic','Growing up in {hometown} has shaped how I think about my community and its traditions.','自分の経験と文化を結びつける','{hometown}で育った経験が、地域や伝統についての考え方に影響しています。'],
    ['Make the introduction interactive','Rather than talking only about myself, I would love to hear what makes your school or hometown special.','相手にも話を振る','自分のことだけでなく、あなたの学校や地元の特別なところも聞きたいです。']
   ],
   challenge:['A student has never met anyone from your country','Introduce yourself to someone who has never met a student from your country. Share your school and hometown, explain why you joined, and ask one thoughtful question.','自分の国の生徒に初めて会う相手','学校と地元を紹介し、参加理由を伝えて、相手に質問しましょう。']
  },
  hobbies:{
   standard:[
    ['Ask a follow-up question','How often do you do that?','頻度を尋ねる','それはどれくらいの頻度でしますか？'],
    ['Ask about a favorite','What is your favorite movie or song?','好きな作品を尋ねる','好きな映画や曲は何ですか？'],
    ['Share a difference','I have not tried that, but it sounds interesting.','未経験の趣味に反応する','やったことはありませんが、面白そうですね。'],
    ['Ask for a recommendation','What would you recommend to a beginner?','初心者向けのおすすめを聞く','初心者には何がおすすめですか？'],
    ['Explain a personal reason','I enjoy {hobby} because it helps me relax.','趣味の理由を伝える','{hobby}が好きなのはリラックスできるからです。']
   ],
   advanced:[
    ['Explore how interests develop','Has your interest in that activity changed since you were younger?','趣味の変化を聞く','子どものころからその活動への興味は変わりましたか？'],
    ['Compare hobbies across cultures','I wonder whether students in our countries enjoy similar activities after school.','国を超えて放課後の過ごし方を比べる','私たちの国の生徒は放課後に似た活動を楽しんでいるのでしょうか。'],
    ['Invite a meaningful explanation','What do you enjoy most about that hobby, and what have you learned from it?','趣味から得た学びを聞く','その趣味の何が一番好きで、そこから何を学びましたか？']
   ],
   challenge:['You and your partner have very different hobbies','Your partner enjoys a hobby you know nothing about. Show genuine curiosity, ask two follow-up questions, and find one connection to your own interests.','知らない趣味について話している','興味を示し、追加の質問を二つして、共通点を見つけましょう。']
  },
  school:{
   standard:[
    ['Ask about the timetable','How many classes do you have each day?','一日の授業数を聞く','一日に何時間授業がありますか？'],
    ['Describe lunchtime','We usually eat lunch with our classmates.','昼食の様子を伝える','私たちは普段クラスメートと昼食を食べます。'],
    ['Ask about homework','Do you get a lot of homework?','宿題について尋ねる','宿題はたくさん出ますか？'],
    ['Ask about school events','What is the biggest event at your school?','学校行事を尋ねる','学校で一番大きな行事は何ですか？'],
    ['Compare routines','Our school day is a little different from yours.','学校生活の違いを伝える','私たちの学校生活はあなたの学校と少し違います。']
   ],
   advanced:[
    ['Explore the purpose of school rules','Our schools have different rules. What do you think those rules are trying to achieve?','校則の目的について考える','学校のルールは違いますが、それぞれ何を目指していると思いますか？'],
    ['Discuss learning styles','We sometimes work in groups during lessons. How do students usually learn in your classes?','授業の学び方を比較する','私たちは授業でグループ活動をすることがあります。あなたの授業では普段どのように学びますか？'],
    ['Move beyond a simple comparison','Even though our school schedules are different, it sounds as if we face some of the same challenges.','違いだけでなく共通の課題も探る','学校の時間割は違っても、同じような課題に直面しているようですね。']
   ],
   challenge:['Your partner has a very different school day','Compare a typical school day with a partner whose timetable is different. Describe one routine, ask why theirs works that way, and identify a shared challenge.','学校の一日の流れが大きく異なる','自分の学校生活を説明し、相手の事情を聞き、共通の課題を探しましょう。']
  },
  culture:{
   standard:[
    ['Avoid assuming everyone is the same','Is that common in your area, or does it vary?','地域による違いを確認する','それはあなたの地域で一般的ですか？それとも場所によって違いますか？'],
    ['Ask about personal experience','Have you ever taken part in that festival?','行事の体験を聞く','そのお祭りに参加したことはありますか？'],
    ['Ask about meaning','Why is that tradition important to you?','伝統の意味を尋ねる','その伝統があなたにとって大切なのはなぜですか？'],
    ['React with curiosity','That is different from my experience. Tell me more!','違いに興味を示す','私の経験とは違いますね。もっと教えてください！'],
    ['Check understanding','So people celebrate it with their families, right?','理解を確認する','つまり家族と一緒にお祝いするのですね？']
   ],
   advanced:[
    ['Ask without stereotyping','I know traditions can vary from person to person. What has your own experience been like?','固定観念を避けて聞く','伝統は人によって異なると思いますが、あなた自身はどんな経験をしましたか？'],
    ['Discuss change over time','Do you think younger generations celebrate this tradition differently from older generations?','世代による変化を考える','若い世代と年配の世代では、この伝統の祝い方が違うと思いますか？'],
    ['Reflect on learning','Hearing your experience reminds me that there is more than one way to understand a culture.','文化の多様性を振り返る','あなたの経験を聞いて、文化の理解にはさまざまな見方があると気づきました。']
   ],
   challenge:['A partner shares a tradition you have never heard of','A partner describes an unfamiliar tradition. Avoid generalizations, ask about their personal experience, and explain what surprised you respectfully.','初めて聞く伝統を教えてもらった','決めつけずに個人の経験を聞き、驚いたことを敬意をもって伝えましょう。']
  },
  repair:{
   standard:[
    ['You do not know a word','What does that word mean?','単語の意味がわからない','その単語はどういう意味ですか？'],
    ['Ask for an example','Could you give me a simple example?','具体例をお願いする','簡単な例を挙げてもらえますか？'],
    ['Check what you heard','Did you say fifteen or fifty?','聞き取った数字を確認する','15と言いましたか、それとも50ですか？'],
    ['Buy time to think','Let me think about that for a moment.','考える時間がほしい','少し考えさせてください。'],
    ['Try another explanation','Let me try saying that in a different way.','別の言い方で伝える','別の言い方で説明してみます。']
   ],
   advanced:[
    ['Paraphrase to confirm meaning','If I understood correctly, you are saying that students have different experiences depending on their schools.','要点を言い換えて確認する','正しく理解していれば、学校によって生徒の経験が違うということですね。'],
    ['Repair a misunderstanding politely','I think I may have explained that poorly. What I meant was that our experiences are different, not that one is better.','誤解を丁寧に修正する','説明がうまくできなかったかもしれません。どちらが優れているという意味ではなく、経験が違うという意味です。'],
    ['Handle a lost connection','I was disconnected for a moment and missed part of the discussion. Could someone summarize the last point?','接続が切れて話を聞き逃した','一時的に接続が切れて議論の一部を聞き逃しました。最後の点を要約してもらえますか？']
   ],
   challenge:['You missed an important point because of poor audio','The audio breaks up during an important explanation. Ask the speaker to repeat or rephrase it, check your understanding, and thank them for helping.','大切な説明の途中で音声が途切れた','聞き返し、理解を確認し、助けてくれたことに感謝しましょう。']
  },
  closing:{
   standard:[
    ['Mention something memorable','I will remember what you told me about your school.','印象に残ったことを伝える','あなたの学校について教えてくれたことを覚えておきます。'],
    ['Thank a patient listener','Thank you for listening even when I spoke slowly.','ゆっくり話した自分を聞いてくれたことに感謝','ゆっくり話しても聞いてくれてありがとう。'],
    ['Ask for a final comment','Before we leave, does anyone have a final thought?','最後の一言を促す','終わる前に、最後に何か伝えたい人はいますか？'],
    ['Wish someone well','I hope you have a wonderful rest of your day.','相手に良い一日を願う','この後も素敵な一日を過ごしてください。'],
    ['Say goodbye across time zones','It is evening here, but I hope you enjoy your day!','時差を意識してあいさつする','こちらは夜ですが、そちらも良い一日を！']
   ],
   advanced:[
    ['Summarize an unexpected insight','Before today, I had never thought about that issue from your perspective. Thank you for opening my mind.','新しい視点を得たことを伝える','今日まであなたの視点からその問題を考えたことがありませんでした。新しい見方を教えてくれてありがとう。'],
    ['Connect across differences','Although we live in different countries, I was surprised by how much we have in common.','国の違いを越えた共通点を伝える','違う国に住んでいるのに、共通点が多いことに驚きました。'],
    ['Encourage future learning','I would love to continue learning about your community, even after this exchange ends.','交流後も学び続ける姿勢を示す','この交流が終わっても、あなたの地域について学び続けたいです。']
   ],
   challenge:['Your exchange is ending in one minute','Your international exchange is ending. Mention one thing you learned, appreciate a partner’s contribution, and say goodbye warmly without rushing.','国際交流があと1分で終わる','学びを一つ伝え、相手に感謝し、落ち着いてお別れしましょう。']
  }
 },
 facilitator:{
  welcome:{
   standard:[
    ['Explain the purpose','Today we will learn about each other through conversation.','交流の目的を伝える','今日は会話を通してお互いを知りましょう。'],
    ['Set a supportive rule','It is okay to make mistakes in English.','安心して話せるルールを示す','英語で間違えても大丈夫です。'],
    ['Explain the first activity','We will start with one question for each person.','最初の活動を説明する','一人ずつ一つの質問から始めます。'],
    ['Welcome a late arrival','Welcome! We are glad you could join us.','遅れてきた人を迎える','ようこそ！参加してくれてうれしいです。'],
    ['Check readiness','Is everyone ready to begin?','準備を確認する','みなさん、始める準備はできましたか？']
   ],
   advanced:[
    ['Set a respectful tone','You do not have to represent your whole country; please feel free to speak from your own experience.','国全体を代表する必要がないと伝える','国全体を代表する必要はありません。ご自身の経験から自由に話してください。'],
    ['Make participation accessible','If you would rather type a response first, that is completely fine. We can read it together.','発言以外の参加方法を示す','まずチャットで回答しても大丈夫です。一緒に読んでみましょう。'],
    ['Introduce a clear discussion structure','We will begin with introductions, move to two discussion questions, and finish by sharing one thing we learned.','活動の流れを明確にする','自己紹介、二つの質問、最後に学びを一つ共有する流れで進めます。']
   ],
   challenge:['Your room has participants with different English levels','Welcome a group with different English levels. Explain that mistakes are welcome, give a simple plan, and invite everyone to participate in a comfortable way.','英語力の異なる参加者を迎える','安心できるルールを示し、活動の流れを説明し、無理のない参加を促しましょう。']
  },
  audio:{
   standard:[
    ['One participant is muted','I think your microphone is muted. Could you unmute it?','参加者がミュートのまま','マイクがミュートになっているようです。解除できますか？'],
    ['You hear feedback','There is some echo. Could we try using headphones?','ハウリングが起きている','少し音が反響しています。ヘッドホンを使ってみませんか？'],
    ['Someone loses connection','It looks like someone has disconnected. Let us wait a moment.','参加者の接続が切れた','誰かの接続が切れたようです。少し待ちましょう。'],
    ['You need to repeat an instruction','I will repeat the instructions slowly.','指示をゆっくり繰り返す','指示をゆっくり繰り返します。'],
    ['Check that the problem is solved','Can you hear us now? Great, welcome back!','復旧を確認する','今は聞こえますか？よかった、おかえりなさい！']
   ],
   advanced:[
    ['Offer an accessible alternative','If the microphone still does not work, you can write your answer in the chat and I will read it aloud.','音声が使えない人の参加を支援する','まだマイクが使えなければチャットに書いてください。私が読み上げます。'],
    ['Avoid blaming the participant','Technical problems happen to everyone. Take your time, and we will continue when you are ready.','トラブルを責めずに対応する','技術的な問題は誰にでも起こります。焦らず、準備ができたら再開しましょう。'],
    ['Coordinate support','Could the host help us check this participant’s connection while the rest of us continue with the first question?','ホストと連携する','私たちが最初の質問を進める間に、ホストがこの参加者の接続を確認してもらえますか？']
   ],
   challenge:['Two participants cannot hear each other','Two students cannot hear each other during the exchange. Give calm troubleshooting instructions, offer a chat alternative, and keep the rest of the group included.','二人の参加者がお互いの声を聞けない','落ち着いて確認手順を伝え、チャットを提案し、ほかの参加者も交流に参加できるようにしましょう。']
  },
  turns:{
   standard:[
    ['Invite a quiet student','Would you like to add anything? It is okay to pass.','静かな生徒に無理なく声をかける','何か付け加えたいことはありますか？パスしても大丈夫です。'],
    ['One person talks for a long time','Thank you! Let us hear from someone else now.','一人の発言が長くなった','ありがとう！次はほかの人の意見を聞きましょう。'],
    ['Give thinking time','Let us take ten seconds to think.','考える時間を設ける','10秒ほど考える時間をとりましょう。'],
    ['Invite a response in chat','You can also share your answer in the chat.','チャットでの回答を認める','チャットでも答えを共有できます。'],
    ['Thank an effort','Thank you for giving it a try.','挑戦を認める','挑戦してくれてありがとう。']
   ],
   advanced:[
    ['Avoid putting someone on the spot','I would love to hear your thoughts if you feel comfortable sharing, but there is no pressure.','発言を強制せずに促す','よければ考えを聞かせてください。でも無理に話す必要はありません。'],
    ['Balance the discussion','We have heard several interesting ideas. Let us make space for someone who has not spoken yet.','発言機会の偏りを調整する','興味深い意見が出ました。まだ話していない人にも機会をつくりましょう。'],
    ['Offer structured support','You can begin with a short sentence such as I agree because, and we can build on it together.','発話の足場かけをする','I agree because のような短い文から始めて大丈夫です。一緒に広げましょう。']
   ],
   challenge:['One student dominates while others are silent','One student has spoken for most of the time while others remain quiet. Thank that student, invite different voices without pressure, and offer a simple sentence starter.','一人が話し続け、ほかの生徒が黙っている','発言に感謝しつつ、ほかの人にも無理なく発言を促し、話し始める表現を示しましょう。']
  },
  questions:{
   standard:[
    ['Ask for a reason','What makes you think that?','理由を尋ねる','そう考えるのはなぜですか？'],
    ['Invite a concrete story','Has anyone experienced something similar?','似た経験を聞く','似た経験をした人はいますか？'],
    ['Connect two answers','How is your answer similar to theirs?','二人の答えをつなぐ','あなたの答えはその人の答えとどこが似ていますか？'],
    ['Check the group','Does anyone have a question about that?','質問を募集する','それについて質問がある人はいますか？'],
    ['Ask about change','Has your opinion changed during our discussion?','考えの変化を尋ねる','話し合いの中で考えは変わりましたか？']
   ],
   advanced:[
    ['Invite multiple perspectives','We have heard one perspective. What might this issue look like from a different community’s point of view?','別の立場から考えるよう促す','一つの視点を聞きました。別の地域の立場からはどう見えるでしょうか？'],
    ['Turn a generalization into a question','That is an interesting observation. Could we ask whether it is true for everyone, or whether experiences vary?','一般化を問い直す','興味深い気づきですね。全員に当てはまるのか、経験に違いがあるのか考えてみませんか？'],
    ['Invite reflection and synthesis','Looking back at our answers, what is one idea we agree on and one question we still have?','議論を振り返り整理する','これまでの答えを振り返って、一致した点とまだ残る疑問を一つずつ挙げましょう。']
   ],
   challenge:['The discussion has become a series of short answers','The group keeps giving one-word answers. Ask an open-ended question, invite a personal example, and connect two students’ contributions.','一言だけの回答が続いている','自由回答の質問をし、個人の例を引き出し、二人の意見をつなぎましょう。']
  },
  respect:{
   standard:[
    ['Stop an interruption politely','Let us allow them to finish their thought.','発言の途中で遮られた','その人が話し終わるまで待ちましょう。'],
    ['Respond to a different opinion','It is okay to disagree respectfully.','異なる意見を尊重する','敬意をもって意見が違うことを伝えても大丈夫です。'],
    ['Avoid a generalization','People can have different experiences within the same country.','同じ国内にも違いがあると伝える','同じ国の中でも人によって経験は異なります。'],
    ['Invite clarification','Could you tell us what you meant by that?','発言の意図を確認する','それはどういう意味だったのか教えてもらえますか？'],
    ['Reset the tone','Let us stay curious and kind.','対話の雰囲気を整える','好奇心と優しさを大切にしましょう。']
   ],
   advanced:[
    ['Address an uncomfortable comment','That comment may have sounded uncomfortable to some people. Let us rephrase the question more respectfully.','不快に感じる可能性のある発言に対応する','その発言を不快に感じた人がいるかもしれません。もっと敬意のある聞き方に直しましょう。'],
    ['Avoid speaking for a whole culture','Thank you for sharing your experience. We should remember that one person’s story does not represent everyone in a country.','個人の経験を国全体の代表にしない','経験を教えてくれてありがとう。一人の話が国の全員を代表するわけではないことを覚えておきましょう。'],
    ['Repair a misunderstanding','I think there may have been a misunderstanding. Could we pause and ask each person to explain what they intended?','誤解を落ち着いて解く','誤解があったかもしれません。少し止まって、それぞれの意図を説明してもらえますか？']
   ],
   challenge:['A student makes an unfair assumption about another country','A participant makes a broad assumption about another country. Respond without shaming anyone, invite a personal perspective, and restore a respectful discussion.','ある国について決めつけた発言があった','誰かを責めずに個人の経験を聞き、敬意ある対話に戻しましょう。']
  },
  time:{
   standard:[
    ['Announce the halfway point','We are halfway through our discussion.','時間の折り返しを伝える','話し合いの時間が半分過ぎました。'],
    ['Give a gentle reminder','We have two minutes for this question.','残り時間を知らせる','この質問にはあと2分あります。'],
    ['Move to another topic','Thank you! Let us try the next topic.','次の話題に移る','ありがとう！次の話題に進みましょう。'],
    ['Invite a final answer','One more person, and then we will move on.','最後の発言を促す','あと一人話したら次に進みましょう。'],
    ['Explain the next step','After this, we will return to the main room.','次の行動を説明する','この後、メインルームに戻ります。']
   ],
   advanced:[
    ['Protect equal speaking time','We have limited time left, so let us aim for one short contribution from each person.','残り時間で全員の発言を確保する','時間が限られているので、一人ずつ短く発言してもらいましょう。'],
    ['Transition without cutting someone off','That is an important point. Could you finish your sentence, and then we will move to the next question?','相手の話を尊重して切り替える','大切な点ですね。その文を最後まで話してもらったら、次の質問に進みましょう。'],
    ['Recover after technical delay','We lost a few minutes because of the connection issue, so I will shorten the next activity while keeping time for everyone to speak.','接続トラブルで遅れた時間を調整する','接続の問題で数分遅れたので、全員の発言時間を確保しつつ次の活動を短くします。']
   ],
   challenge:['Technical problems have left only three minutes','Your group lost time because of a connection problem. Explain the revised schedule, invite brief final contributions, and guide everyone back to the main room.','接続トラブルで残り3分になった','変更後の予定を伝え、最後の一言を促し、メインルームに戻るよう案内しましょう。']
  },
  host:{
   standard:[
    ['Explain breakout-room timing','The breakout rooms will open in one minute.','部屋の開始時刻を知らせる','ブレイクアウトルームは1分後に開きます。'],
    ['Check room numbers','Please make sure you know your room number.','部屋番号を確認させる','自分のルーム番号を確認してください。'],
    ['Give a help instruction','If you cannot find your room, please ask the host for help.','部屋が見つからない人を支援する','部屋が見つからなければホストに助けを求めてください。'],
    ['Explain the room activity','Please introduce yourselves before starting the topic.','ルーム内の活動を説明する','話題を始める前に自己紹介してください。'],
    ['Announce the return','The rooms will close soon. Please finish your conversation.','部屋の終了を知らせる','もうすぐルームが閉じます。会話をまとめてください。']
   ],
   advanced:[
    ['Explain the assignment clearly','You have been assigned to a breakout room with students from other schools. Please check the room number before joining.','国をまたぐ部屋割りを案内する','ほかの学校の生徒と同じ部屋に割り当てられています。入室前に部屋番号を確認してください。'],
    ['Support a participant in the wrong room','If you have entered the wrong room, please return to the main room and contact the host so we can help you move.','間違った部屋に入った参加者を案内する','違う部屋に入った場合はメインルームに戻ってホストに連絡してください。移動をお手伝いします。'],
    ['Clarify facilitator responsibilities','Facilitators, please help everyone understand the task and make sure each participant has an opportunity to speak.','ファシリテーターの役割を説明する','ファシリテーターは活動内容を確認し、全員に発言の機会があるよう支援してください。']
   ],
   challenge:['Several students cannot find their breakout rooms','Several students are unsure which room to join. Give clear room-number instructions, explain how to ask for help, and remind facilitators of their role.','複数の生徒が部屋番号を確認できない','部屋番号の確認方法と支援の求め方を伝え、進行役の役割を確認しましょう。']
  },
  end:{
   standard:[
    ['Thank all schools','Thank you to all the schools that joined us today.','参加校に感謝する','今日参加してくれたすべての学校に感謝します。'],
    ['Invite a learning point','What is one new thing you learned?','学びを一つ共有してもらう','新しく学んだことを一つ教えてください。'],
    ['Thank facilitators','Thank you to our facilitators for guiding the discussion.','進行役に感謝する','話し合いを進めてくれたファシリテーターのみなさん、ありがとう。'],
    ['Explain a final task','Please share your reflection with your teacher.','振り返りの提出を案内する','振り返りを先生に共有してください。'],
    ['Close the meeting','We will end the meeting now. Have a wonderful day!','会議を終了する','これでミーティングを終了します。よい一日を！']
   ],
   advanced:[
    ['Highlight mutual learning','Today we did more than practice English; we listened to different experiences and learned from one another.','英語練習以上の学びを伝える','今日は英語を練習するだけでなく、異なる経験に耳を傾け、お互いから学びました。'],
    ['Invite reflection on assumptions','As you reflect, think about whether anything you heard challenged an assumption you had before today.','先入観の変化を振り返る','振り返る際は、今日聞いたことで以前の思い込みが変わったことがないか考えてみてください。'],
    ['Encourage ongoing connections','I hope the curiosity and respect you showed today will continue in your conversations beyond this session.','交流後も続く姿勢を励ます','今日示してくれた好奇心と敬意を、このセッションの後の会話でも大切にしてほしいです。']
   ],
   challenge:['You are closing a session with students from many countries','Close a multicultural session. Thank students and facilitators, invite one reflection about a new perspective, and explain the next step clearly.','多国籍の参加者がいる交流を終了する','生徒と進行役に感謝し、新しい視点について振り返りを促し、次の行動を説明しましょう。']
  }
 }
};
// The opening five items per stage remain intact; advanced receives three extras.
// A scene now offers a specific task, not just a vague theme.
export const PRACTICE_SCENES_V174=Object.fromEntries(Object.entries(PRACTICE_SCENES_V173).map(([role,scenes])=>[
 role,Object.fromEntries(Object.entries(scenes).map(([id,scene])=>{
  const mission=additions[role][id].challenge;
  return [id,{...scene,scenario:mission[0],scenarioJa:mission[2],mission:mission[1],missionJa:mission[3]}];
 }))
]));
function append(role,stageId,level){
 const rows=additions[role]?.[stageId]?.[level]||[];
 return rows.map(([cue,text,cueJa,ja],i)=>({id:level+'-extra-'+i,kind:'phrase',text,ja,cue,cueJa}));
}
export function getPracticeItemsV174(role,stageId,level='standard'){
 const previous=getPracticeItemsV173(role,stageId,level);
 if(!additions[role]?.[stageId])return previous;
 if(level==='standard'||level==='advanced')return [...previous,...append(role,stageId,level)];
 if(level==='challenge'){
  const [cue,text,cueJa,ja]=additions[role][stageId].challenge;
  return [...previous,{id:'challenge-situation',kind:'final',text,ja,cue,cueJa}];
 }
 return previous;
}
export function getPracticeTotalsV174(role,level='standard'){
 return (PRACTICE_STAGES[role]||[]).reduce((total,s)=>total+getPracticeItemsV174(role,s.id,level).length,0);
}
