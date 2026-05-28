// data-g2.js — G2 grade data for Alan's English Class PWA
// Loaded after data.js; Firebase is already initialized.

/* ─── Firestore ─────────────────────────────────────────────────────────── */
const _dbG2       = firebase.firestore();
const _classDocG2 = _dbG2.collection('class').doc('data_g2');

/* ─── Storage keys ──────────────────────────────────────────────────────── */
const G2_STORAGE_KEY = 'alans-english-g2-data-v1';
const G2_ORDER_KEY   = 'alans-english-g2-order-v1';

/* ─── Categories ────────────────────────────────────────────────────────── */
const CATEGORIES_G2 = [
  { id:'vocab',   num:'01', title:'CET Vocabulary',        titleZh:'中師單字',  desc:'CET lesson vocabulary — flashcards and fill-in-the-blank practice.',         descZh:'本週中師課堂單字，透過字卡和填空練習建立字彙基礎。' },
  { id:'word',    num:'02', title:'FET Vocabulary',        titleZh:'外師單字',  desc:'FET lesson vocabulary — flashcards and fill-in-the-blank practice.',         descZh:'本週外師課堂單字，透過字卡和填空練習熟悉單字用法。' },
  { id:'grammar', num:'03', title:'Grammar',               titleZh:'文法',      desc:'Adjectives and adverbs — classification and identification practice.',       descZh:'本週文法重點：形容詞與副詞的辨別與分類練習。' },
  { id:'reading', num:'04', title:'Reading Comprehension', titleZh:'閱讀理解',  desc:'Short passages with comprehension questions.',                                descZh:'短文閱讀加上閱讀測驗，培養閱讀理解能力。' },
];

/* ─── Default week order ────────────────────────────────────────────────── */
const G2_DEFAULT_WEEK_ORDER = [
  'g2-2026-W10','g2-2026-W11','g2-2026-W12',
  'g2-2026-W13','g2-2026-W14','g2-2026-W15','g2-2026-W16',
];

/* ─── Grammar items (in W16 review) ─────────────────────────────────────── */
const GRAMMAR_ITEM_1 = {
  id: 'g2-gr-adv-classify',
  type: 'quiz',
  title: 'Adverbs: When / Where / How',
  zh: '副詞分類：時間 / 地點 / 方式',
  questions: [
    { id:'gr1-q1',  text:'The boy ran "quickly" to the classroom.',                     options:['When','Where','How'], answer:'How',   hint:'What type of adverb is the underlined word?', explain:'Quickly describes how the boy ran — a manner adverb.' },
    { id:'gr1-q2',  text:'She will visit her grandmother "tomorrow".',                  options:['When','Where','How'], answer:'When',  hint:'What type of adverb is the underlined word?', explain:'Tomorrow tells us when she will visit — a time adverb.' },
    { id:'gr1-q3',  text:'The cat is sleeping "outside".',                              options:['When','Where','How'], answer:'Where', hint:'What type of adverb is the underlined word?', explain:'Outside tells us where the cat is sleeping — a place adverb.' },
    { id:'gr1-q4',  text:'He speaks English very "clearly".',                           options:['When','Where','How'], answer:'How',   hint:'What type of adverb is the underlined word?', explain:'Clearly describes how he speaks — a manner adverb.' },
    { id:'gr1-q5',  text:'We play basketball "here" every afternoon.',                  options:['When','Where','How'], answer:'Where', hint:'What type of adverb is the underlined word?', explain:'Here tells us where we play — a place adverb.' },
    { id:'gr1-q6',  text:'The train leaves "soon".',                                    options:['When','Where','How'], answer:'When',  hint:'What type of adverb is the underlined word?', explain:'Soon tells us when the train leaves — a time adverb.' },
    { id:'gr1-q7',  text:'She "always" brushes her teeth before bed.',                  options:['When','Where','How'], answer:'When',  hint:'What type of adverb is the underlined word?', explain:'Always is a frequency adverb that tells us when/how often — a time adverb.' },
    { id:'gr1-q8',  text:'The bird flew "away" toward the big oak tree.',               options:['When','Where','How'], answer:'Where', hint:'What type of adverb is the underlined word?', explain:'Away tells us where the bird flew — a place adverb.' },
    { id:'gr1-q9',  text:'The teacher explained the lesson very "carefully".',          options:['When','Where','How'], answer:'How',   hint:'What type of adverb is the underlined word?', explain:'Carefully describes how the teacher explained — a manner adverb.' },
    { id:'gr1-q10', text:'We went to the park "yesterday" and had a picnic.',           options:['When','Where','How'], answer:'When',  hint:'What type of adverb is the underlined word?', explain:'Yesterday tells us when we went — a time adverb.' },
  ],
};

const GRAMMAR_ITEM_2 = {
  id: 'g2-gr-adj-adv-id',
  type: 'quiz',
  title: 'Adjective or Adverb?',
  zh: '判斷：形容詞還是副詞？',
  questions: [
    { id:'gr2-q1',  text:'The "careful" student checked her answer twice.',                                    options:['Adjective','Adverb'], answer:'Adjective', hint:'Is the underlined word an adjective or adverb?', explain:'Careful describes the noun student — it is an adjective.' },
    { id:'gr2-q2',  text:'She will bring her science project "tomorrow".',                                     options:['Adjective','Adverb'], answer:'Adverb',    hint:'Is the underlined word an adjective or adverb?', explain:'Tomorrow tells us when she will bring the project — it is a time adverb.' },
    { id:'gr2-q3',  text:'He is a "brave" firefighter who saved many lives.',                                  options:['Adjective','Adverb'], answer:'Adjective', hint:'Is the underlined word an adjective or adverb?', explain:'Brave describes the noun firefighter — it is an adjective.' },
    { id:'gr2-q4',  text:'Please put your backpack "there" before class starts.',                              options:['Adjective','Adverb'], answer:'Adverb',    hint:'Is the underlined word an adjective or adverb?', explain:'There tells us where to put the backpack — it is a place adverb.' },
    { id:'gr2-q5',  text:'My grandmother told us an "ancient" story last night.',                              options:['Adjective','Adverb'], answer:'Adjective', hint:'Is the underlined word an adjective or adverb?', explain:'Ancient describes the noun story — it is an adjective.' },
    { id:'gr2-q6',  text:'The children played "outside" after the rain stopped.',                              options:['Adjective','Adverb'], answer:'Adverb',    hint:'Is the underlined word an adjective or adverb?', explain:'Outside tells us where the children played — it is an adverb.' },
    { id:'gr2-q7',  text:'The "curious" monkey watched us from the top of the tree.',                         options:['Adjective','Adverb'], answer:'Adjective', hint:'Is the underlined word an adjective or adverb?', explain:'Curious describes the noun monkey — it is an adjective.' },
    { id:'gr2-q8',  text:'She finished her homework "early" so she could go outside.',                        options:['Adjective','Adverb'], answer:'Adverb',    hint:'Is the underlined word an adjective or adverb?', explain:'Early tells us when she finished her homework — it is an adverb.' },
    { id:'gr2-q9',  text:'The "old" library has thousands of books from many countries.',                      options:['Adjective','Adverb'], answer:'Adjective', hint:'Is the underlined word an adjective or adverb?', explain:'Old describes the noun library — it is an adjective.' },
    { id:'gr2-q10', text:'He looked "around" before crossing the busy street.',                               options:['Adjective','Adverb'], answer:'Adverb',    hint:'Is the underlined word an adjective or adverb?', explain:'Around tells us where he looked — it is an adverb.' },
  ],
};

/* ─── Seed weeks ─────────────────────────────────────────────────────────── */
const G2_SEED_WEEKS = {

  /* ── W10–W15 are empty shells; all review content is in W16 ── */
  'g2-2026-W10': { id:'g2-2026-W10', label:'G2 Week 10', dateRange:'—', theme:"Who Says Women Can't Be Doctors", themeZh:'女生也能當醫生', subtitle:'', subtitleZh:'', items:{ vocab:[], word:[], grammar:[], reading:[] } },
  'g2-2026-W11': { id:'g2-2026-W11', label:'G2 Week 11', dateRange:'—', theme:"Who Says Women Can't Be Doctors", themeZh:'女生也能當醫生', subtitle:'', subtitleZh:'', items:{ vocab:[], word:[], grammar:[], reading:[] } },
  'g2-2026-W12': { id:'g2-2026-W12', label:'G2 Week 12', dateRange:'—', theme:"Who Says Women Can't Be Doctors", themeZh:'女生也能當醫生', subtitle:'', subtitleZh:'', items:{ vocab:[], word:[], grammar:[], reading:[] } },
  'g2-2026-W13': { id:'g2-2026-W13', label:'G2 Week 13', dateRange:'—', theme:'I.M. Pei: Blending Past and Future', themeZh:'貝聿銘：融合古今', subtitle:'', subtitleZh:'', items:{ vocab:[], word:[], grammar:[], reading:[] } },
  'g2-2026-W14': { id:'g2-2026-W14', label:'G2 Week 14', dateRange:'—', theme:'I.M. Pei: Blending Past and Future', themeZh:'貝聿銘：融合古今', subtitle:'', subtitleZh:'', items:{ vocab:[], word:[], grammar:[], reading:[] } },
  'g2-2026-W15': { id:'g2-2026-W15', label:'G2 Week 15', dateRange:'—', theme:'I.M. Pei: Blending Past and Future', themeZh:'貝聿銘：融合古今', subtitle:'', subtitleZh:'', items:{ vocab:[], word:[], grammar:[], reading:[] } },

  /* ══════════════════════════════════════════════════════════════
     W16 — 總複習 (All CET W10–W16 · FET W10–W15 · Grammar)
  ══════════════════════════════════════════════════════════════ */
  'g2-2026-W16': {
    id: 'g2-2026-W16',
    label: 'G2 Week 16',
    dateRange: '—',
    theme: 'Volcano',
    themeZh: '火山',
    subtitle: '總複習',
    subtitleZh: '單字與文法總整理',
    items: {

      /* ── CET Vocabulary (中師單字) W10–W16 ── */
      vocab: [

        /* W10 · Who Says Women Can't Be Doctors */
        {
          id: 'g2-w10-cet-fc',
          type: 'flashcard',
          title: "W10 · Who Says Women Can't Be Doctors",
          color: 'indigo',
          cards: [
            { id:'c1',  term:'astronaut',  zh:'太空人' },
            { id:'c2',  term:'pilot',      zh:'飛行員' },
            { id:'c3',  term:'pioneer',    zh:'第一人' },
            { id:'c4',  term:'accomplish', zh:'完成' },
            { id:'c5',  term:'inspire',    zh:'啟發' },
            { id:'c6',  term:'mission',    zh:'任務' },
            { id:'c7',  term:'allow',      zh:'允許' },
            { id:'c8',  term:'bet',        zh:'打賭' },
            { id:'c9',  term:'challenge',  zh:'挑戰' },
            { id:'c10', term:'accept',     zh:'接受' },
          ],
        },
        {
          id: 'g2-w10-cet-fb',
          type: 'fillblank',
          title: "W10 · Who Says Women Can't Be Doctors",
          color: 'indigo',
          linkedFlashcardId: 'g2-w10-cet-fc',
          questions: [
            { id:'q1',  sentence:'Neil Armstrong was a brave _____ who walked on the moon in 1969.',                               answer:'astronaut',   explain:'Astronaut = 太空人🚀！Neil Armstrong 是第一個走在月球上的 astronaut，超厲害！' },
            { id:'q2',  sentence:'The _____ safely landed the plane during the heavy storm.',                                      answer:'pilot',       explain:'Pilot = 飛行員✈️！Pilot 就是開飛機的人，可以在暴風雨中安全著陸。' },
            { id:'q3',  sentence:"Marie Curie was a _____ in science who opened doors for women everywhere.",                     answer:'pioneer',     explain:'Pioneer = 先驅、第一人🌟！Marie Curie 是女性科學家的 pioneer，為後來的女生打開大門。' },
            { id:'q4',  sentence:'She worked for years to _____ her dream of becoming a doctor.',                                  answer:'accomplish',  explain:'Accomplish = 完成、達成✅！努力很多年終於 accomplished her dream，很不簡單！' },
            { id:'q5',  sentence:"The teacher's kind words _____ many students to work harder and never give up.",                answer:'inspire',     explain:'Inspire = 啟發、激勵💡！好老師的話可以 inspire students，讓他們更努力。' },
            { id:'q6',  sentence:'Their _____ was to help people in the mountain village get clean water.',                        answer:'mission',     explain:'Mission = 任務🎯！Mission 是一個重要的目標，就像超級英雄都有自己的 mission！' },
            { id:'q7',  sentence:'The school does not _____ students to use phones during class.',                                 answer:'allow',       explain:'Allow = 允許🚫！Not allow 表示「不准」，上課不可以用手機。' },
            { id:'q8',  sentence:'I _____ you can finish this puzzle in under five minutes if you try.',                           answer:'bet',         explain:'Bet = 打賭🎲！"I bet you can do it!" 表示我相信你一定可以！' },
            { id:'q9',  sentence:'Learning a new language is a big _____, but it becomes easier every day.',                       answer:'challenge',   explain:'Challenge = 挑戰💪！學新語言是個大 challenge，但每天都會更容易！' },
            { id:'q10', sentence:"She decided to _____ the invitation to join the school's science team.",                        answer:'accept',      explain:'Accept = 接受、答應🤝！She accepted the invitation，代表她說「好！我要加入！」' },
          ],
        },

        /* W11 · Who Says Women Can't Be Doctors */
        {
          id: 'g2-w11-cet-fc',
          type: 'flashcard',
          title: "W11 · Who Says Women Can't Be Doctors",
          color: 'indigo',
          cards: [
            { id:'c1',  term:'determine',  zh:'決定' },
            { id:'c2',  term:'definitely', zh:'一定' },
            { id:'c3',  term:'century',    zh:'世紀' },
            { id:'c4',  term:'college',    zh:'大學' },
            { id:'c5',  term:'society',    zh:'社會' },
            { id:'c6',  term:'patient',    zh:'病人' },
            { id:'c7',  term:'health',     zh:'健康' },
            { id:'c8',  term:'surgery',    zh:'手術' },
            { id:'c9',  term:'science',    zh:'科學' },
            { id:'c10', term:'examine',    zh:'檢查' },
          ],
        },
        {
          id: 'g2-w11-cet-fb',
          type: 'fillblank',
          title: "W11 · Who Says Women Can't Be Doctors",
          color: 'indigo',
          linkedFlashcardId: 'g2-w11-cet-fc',
          questions: [
            { id:'q1',  sentence:'Hard work and practice will _____ how good you become at any skill.',                                answer:'determine',   explain:'Determine = 決定、影響🔑！努力和練習 determines（決定）你能變多厲害！' },
            { id:'q2',  sentence:'This is _____ the best apple pie I have ever tasted in my life.',                                    answer:'definitely',  explain:'Definitely = 一定、絕對！Definitely 比 "yes" 更強烈，用來加強語氣。' },
            { id:'q3',  sentence:'The Eiffel Tower was built more than a _____ ago, in the year 1889.',                                answer:'century',     explain:'Century = 世紀 = 100 年📅！1889 年到現在超過一個 century（世紀）了！' },
            { id:'q4',  sentence:'My sister studies biology at _____ because she wants to become a nurse.',                            answer:'college',     explain:'College = 大學🎓！高中畢業後去 college 繼續讀書，學習專業知識。' },
            { id:'q5',  sentence:'A healthy _____ needs honest leaders, good schools, and safe streets for everyone.',                 answer:'society',     explain:'Society = 社會🏙️！Society 是我們大家一起生活的群體，需要好的規則和領導人。' },
            { id:'q6',  sentence:'The doctor spoke gently to the _____ and explained what the medicine was for.',                      answer:'patient',     explain:'Patient = 病人🏥！注意：patient 也可以是形容詞「有耐心的」，這裡是名詞「病人」。' },
            { id:'q7',  sentence:'Eating vegetables, sleeping well, and exercising every day are keys to good _____.',                 answer:'health',      explain:'Health = 健康💪！吃蔬菜、睡飽覺、每天運動都是維持 good health 的秘訣！' },
            { id:'q8',  sentence:'After the accident, the doctor said the boy needed _____ to fix his broken leg.',                    answer:'surgery',     explain:'Surgery = 手術🔬！骨頭斷掉有時候需要 surgery，醫生用手術刀幫助身體修復。' },
            { id:'q9',  sentence:'_____ helps us understand why stars shine, why rain falls, and how plants grow.',                    answer:'Science',     explain:'Science = 科學🔭！Science 幫我們理解世界的道理，為什麼星星閃光、為什麼下雨。' },
            { id:'q10', sentence:'The doctor will _____ your eyes and ears to make sure everything is working well.',                  answer:'examine',     explain:'Examine = 仔細檢查🩺！醫生會 examine 你的眼睛和耳朵，確認一切正常。' },
          ],
        },

        /* W12 · Who Says Women Can't Be Doctors */
        {
          id: 'g2-w12-cet-fc',
          type: 'flashcard',
          title: "W12 · Who Says Women Can't Be Doctors",
          color: 'indigo',
          cards: [
            { id:'c1',  term:'goal',         zh:'目標' },
            { id:'c2',  term:'courage',      zh:'勇氣' },
            { id:'c3',  term:'work hard',    zh:'努力工作' },
            { id:'c4',  term:'encourage',    zh:'鼓勵' },
            { id:'c5',  term:'dream',        zh:'做夢' },
            { id:'c6',  term:'prove',        zh:'證明' },
            { id:'c7',  term:'support',      zh:'支持' },
            { id:'c8',  term:'keep up',      zh:'跟上' },
            { id:'c9',  term:'be afraid of', zh:'害怕' },
            { id:'c10', term:'give up',      zh:'放棄' },
          ],
        },
        {
          id: 'g2-w12-cet-fb',
          type: 'fillblank',
          title: "W12 · Who Says Women Can't Be Doctors",
          color: 'indigo',
          linkedFlashcardId: 'g2-w12-cet-fc',
          questions: [
            { id:'q1',  sentence:'Her _____ is to run the school marathon next spring and finish in first place.',                      answer:'goal',        explain:'Goal = 目標🥅！Goal 是你努力想要達成的事，設定 goal 讓你更有方向！' },
            { id:'q2',  sentence:'It takes _____ to stand up and speak in front of the whole school.',                                 answer:'courage',     explain:'Courage = 勇氣🦁！站在全校面前講話需要很大的 courage，勇敢的人才做得到！' },
            { id:'q3',  sentence:'If you _____ every day, you will see great improvement in your English skills.',                     answer:'work hard',   explain:'Work hard = 努力💪！每天 work hard，英文就會越來越好！' },
            { id:'q4',  sentence:'Good friends _____ each other to keep trying even when things get difficult.',                       answer:'encourage',   explain:'Encourage = 鼓勵😊！好朋友會互相 encourage，遇到困難也不放棄。' },
            { id:'q5',  sentence:'She would often _____ about living on a farm and taking care of many animals.',                      answer:'dream',       explain:'Dream = 夢想（動詞）💭！Dream 可以是名詞也可以是動詞，這裡是「夢想著住在農場」。' },
            { id:'q6',  sentence:'He wanted to _____ to everyone that a quiet person can also be a great leader.',                     answer:'prove',       explain:'Prove = 證明✅！Prove 是用行動或事實讓別人相信，安靜的人也可以 prove they are great leaders！' },
            { id:'q7',  sentence:'Her parents always _____ her by coming to every game and cheering her on.',                          answer:'support',     explain:'Support = 支持👏！Support 是在旁邊幫忙和打氣，她的父母每場比賽都來 support 她！' },
            { id:'q8',  sentence:'Please read every night so you can _____ with the rest of the class.',                               answer:'keep up',     explain:'Keep up = 跟上🏃！Keep up 表示維持進度不落後，每天讀書才能 keep up with the class！' },
            { id:'q9',  sentence:'You should not _____ making mistakes, because mistakes help you learn and grow.',                    answer:'be afraid of', explain:'Be afraid of = 害怕😨！不要 be afraid of mistakes，犯錯是學習的一部分！' },
            { id:'q10', sentence:'No matter how hard it gets, never _____ on the things that matter most to you.',                    answer:'give up',     explain:'Give up = 放棄🚫！No matter how hard，永遠不要 give up on your dreams！' },
          ],
        },

        /* W13 · I.M. Pei: Blending Past and Future */
        {
          id: 'g2-w13-cet-fc',
          type: 'flashcard',
          title: 'W13 · I.M. Pei: Blending Past and Future',
          color: 'indigo',
          cards: [
            { id:'c1',  term:'architect',   zh:'建築師' },
            { id:'c2',  term:'design',      zh:'設計' },
            { id:'c3',  term:'creation',    zh:'創作' },
            { id:'c4',  term:'difference',  zh:'差異' },
            { id:'c5',  term:'influence',   zh:'影響' },
            { id:'c6',  term:'famous',      zh:'有名的' },
            { id:'c7',  term:'prize',       zh:'獎品' },
            { id:'c8',  term:'ancient',     zh:'古老的' },
            { id:'c9',  term:'hurt',        zh:'受傷的' },
            { id:'c10', term:'traditional', zh:'傳統的' },
          ],
        },
        {
          id: 'g2-w13-cet-fb',
          type: 'fillblank',
          title: 'W13 · I.M. Pei: Blending Past and Future',
          color: 'indigo',
          linkedFlashcardId: 'g2-w13-cet-fc',
          questions: [
            { id:'q1',  sentence:'The famous _____ designed a beautiful library that blends glass and stone.',                         answer:'architect',   explain:'Architect = 建築師🏛️！I.M. Pei 就是一位世界有名的 architect，設計過很多美麗建築。' },
            { id:'q2',  sentence:'She used colorful pencils to _____ a new pattern for the school flag.',                             answer:'design',      explain:'Design = 設計🎨！Design 可以當動詞，意思是「想出並畫出某個東西的樣子」。' },
            { id:'q3',  sentence:'The painting was a beautiful _____ that took the artist three months to finish.',                   answer:'creation',    explain:'Creation = 創作、作品🖼️！Creation 是某人用心做出來的東西，這幅畫花了三個月完成！' },
            { id:'q4',  sentence:'Can you spot the _____ between these two pictures? Look very carefully!',                           answer:'difference',  explain:'Difference = 差異、不同的地方🔍！Spot the difference 就是「找找看哪裡不一樣」的遊戲！' },
            { id:'q5',  sentence:"Music can greatly _____ a person's mood and help them feel calm or happy.",                        answer:'influence',   explain:'Influence = 影響🎵！音樂可以 influence 你的心情，讓你感到平靜或快樂。' },
            { id:'q6',  sentence:'Paris is _____ for its wonderful food, art museums, and the Eiffel Tower.',                         answer:'famous',      explain:'Famous = 有名的、著名的⭐！Paris is famous for... 是常用句型，表示「以...出名」。' },
            { id:'q7',  sentence:'She won first _____ in the national drawing competition and received a gold medal.',                 answer:'prize',       explain:'Prize = 獎品、獎項🏆！Win first prize 就是「得到第一名的獎」！' },
            { id:'q8',  sentence:'The _____ temple was built over two thousand years ago and still stands today.',                    answer:'ancient',     explain:'Ancient = 古老的🏺！Ancient 指超過幾百年甚至幾千年的東西，超有歷史感！' },
            { id:'q9',  sentence:'Be careful not to _____ yourself when you use sharp scissors or a knife.',                          answer:'hurt',        explain:'Hurt = 傷害、受傷🩹！Hurt yourself 就是「傷到自己」，用剪刀時要小心！' },
            { id:'q10', sentence:'Our school festival includes _____ dances, costumes, and food from our culture.',                   answer:'traditional', explain:'Traditional = 傳統的🎎！Traditional 是指代代相傳、有文化根源的東西。' },
          ],
        },

        /* W14 · I.M. Pei: Blending Past and Future */
        {
          id: 'g2-w14-cet-fc',
          type: 'flashcard',
          title: 'W14 · I.M. Pei: Blending Past and Future',
          color: 'indigo',
          cards: [
            { id:'c1',  term:'building',  zh:'建築物' },
            { id:'c2',  term:'museum',    zh:'博物館' },
            { id:'c3',  term:'library',   zh:'圖書館' },
            { id:'c4',  term:'structure', zh:'結構' },
            { id:'c5',  term:'glass',     zh:'玻璃' },
            { id:'c6',  term:'pyramid',   zh:'金字塔' },
            { id:'c7',  term:'shape',     zh:'形狀' },
            { id:'c8',  term:'arch',      zh:'拱門' },
            { id:'c9',  term:'style',     zh:'風格' },
            { id:'c10', term:'tower',     zh:'塔' },
          ],
        },
        {
          id: 'g2-w14-cet-fb',
          type: 'fillblank',
          title: 'W14 · I.M. Pei: Blending Past and Future',
          color: 'indigo',
          linkedFlashcardId: 'g2-w14-cet-fc',
          questions: [
            { id:'q1',  sentence:'The new _____ in the city center has sixty floors and a rooftop garden.',                           answer:'building',   explain:'Building = 建築物🏢！Building 是任何有屋頂和牆壁的大型建造物，60 層樓超高！' },
            { id:'q2',  sentence:'The art _____ is filled with paintings, sculptures, and photographs from many countries.',          answer:'museum',     explain:'Museum = 博物館🖼️！Museum 是展示藝術、歷史或科學的地方，通常可以免費欣賞。' },
            { id:'q3',  sentence:'You can borrow books, study quietly, and use computers at the school _____.',                       answer:'library',    explain:'Library = 圖書館📚！Library 是可以借書、安靜讀書的好地方，好好利用！' },
            { id:'q4',  sentence:'The engineer carefully checked the _____ of the bridge to make sure it was safe.',                  answer:'structure',  explain:'Structure = 結構🔧！Structure 是指一個東西的建造方式和骨架，確保橋樑安全非常重要。' },
            { id:'q5',  sentence:'The window is made of thick _____ so the wind cannot get inside the house.',                       answer:'glass',      explain:'Glass = 玻璃🪟！Glass 是透明的材料，讓光線進來又擋住風。' },
            { id:'q6',  sentence:'The ancient Egyptians built enormous _____ as tombs for their pharaohs and kings.',                 answer:'pyramid',    explain:'Pyramid = 金字塔🔺！古埃及的 pyramids 是法老王的墓，至今仍屹立不倒！' },
            { id:'q7',  sentence:'A circle, a triangle, and a square are all different types of _____.',                              answer:'shape',      explain:'Shape = 形狀📐！圓形 (circle)、三角形 (triangle)、正方形 (square) 都是不同的 shapes！' },
            { id:'q8',  sentence:'The stone _____ above the door has been there for hundreds of years.',                              answer:'arch',       explain:'Arch = 拱門🏛️！Arch 是弧形的建築結構，在很多古老的建築和橋樑上都看得到。' },
            { id:'q9',  sentence:'Her writing has a very creative _____ that makes every story interesting to read.',                 answer:'style',      explain:'Style = 風格🎭！Style 是一個人獨特的表達方式，她的寫作風格讓故事很有趣。' },
            { id:'q10', sentence:'From the top of the _____, we could see the whole city spread out below us.',                       answer:'tower',      explain:'Tower = 塔🗼！Tower 是高高的建築，站在頂端可以看到整個城市的景色！' },
          ],
        },

        /* W15 · I.M. Pei: Blending Past and Future */
        {
          id: 'g2-w15-cet-fc',
          type: 'flashcard',
          title: 'W15 · I.M. Pei: Blending Past and Future',
          color: 'indigo',
          cards: [
            { id:'c1',  term:'imagine',  zh:'想像' },
            { id:'c2',  term:'study',    zh:'學習' },
            { id:'c3',  term:'solve',    zh:'解決問題' },
            { id:'c4',  term:'practice', zh:'練習' },
            { id:'c5',  term:'create',   zh:'創造' },
            { id:'c6',  term:'project',  zh:'計畫' },
            { id:'c7',  term:'space',    zh:'空間' },
            { id:'c8',  term:'modern',   zh:'現代的' },
            { id:'c9',  term:'past',     zh:'過去的' },
            { id:'c10', term:'future',   zh:'未來的' },
          ],
        },
        {
          id: 'g2-w15-cet-fb',
          type: 'fillblank',
          title: 'W15 · I.M. Pei: Blending Past and Future',
          color: 'indigo',
          linkedFlashcardId: 'g2-w15-cet-fc',
          questions: [
            { id:'q1',  sentence:'Close your eyes and _____ you are walking through a magical forest full of colors.',                answer:'imagine',    explain:'Imagine = 想像💭！Imagine 是在腦海中創造畫面，閉上眼睛 imagine 一片神奇的森林！' },
            { id:'q2',  sentence:'She needs to _____ every day to prepare for the big English test next week.',                       answer:'study',      explain:'Study = 讀書、學習📖！Study every day 是準備考試最好的方法！' },
            { id:'q3',  sentence:'The math teacher showed the class three different ways to _____ the tricky problem.',               answer:'solve',      explain:'Solve = 解決、找到答案🧩！Solve a problem 就是「找出解決方法」。' },
            { id:'q4',  sentence:'You must _____ the piano for at least thirty minutes every evening before dinner.',                 answer:'practice',   explain:'Practice = 練習🎹！Practice makes perfect！每天練習鋼琴才會進步。' },
            { id:'q5',  sentence:'Students will use clay to _____ their own animals during the art class today.',                    answer:'create',     explain:'Create = 創造、製作✨！Create 是做出新的、獨特的東西，用黏土 create 動物！' },
            { id:'q6',  sentence:"Our team's _____ is to build a model of a solar system out of recycled items.",                   answer:'project',    explain:'Project = 計畫、作業📋！Project 是有目標的長期工作，用回收物做太陽系模型！' },
            { id:'q7',  sentence:'There is not enough _____ for all the boxes in the small storage room.',                            answer:'space',      explain:'Space = 空間📦！Space 可以是「外太空」，也可以是「地方、空間」，這裡是指儲藏室的空間。' },
            { id:'q8',  sentence:'The new _____ hospital has robots that help doctors perform difficult operations.',                  answer:'modern',     explain:'Modern = 現代的🤖！Modern 表示很新、很先進，modern hospital 有機器人幫助醫生！' },
            { id:'q9',  sentence:'In the _____, people had to write letters by hand when they wanted to send messages.',              answer:'past',       explain:'Past = 過去⏰！In the past 表示「以前」，以前沒有手機，所以要手寫信！' },
            { id:'q10', sentence:'Scientists are working hard to find clean energy sources for the _____ of our planet.',             answer:'future',     explain:'Future = 未來🚀！In the future 表示「未來」，科學家正在為地球的未來努力！' },
          ],
        },

        /* W16 · Volcano */
        {
          id: 'g2-w16-cet-fc',
          type: 'flashcard',
          title: 'W16 · Volcano',
          color: 'indigo',
          cards: [
            { id:'c1',  term:'volcano',      zh:'火山' },
            { id:'c2',  term:'erupt',        zh:'爆發' },
            { id:'c3',  term:'ash',          zh:'火山灰' },
            { id:'c4',  term:'steam',        zh:'蒸氣' },
            { id:'c5',  term:'fern',         zh:'蕨類' },
            { id:'c6',  term:'flow',         zh:'流動' },
            { id:'c7',  term:'caution',      zh:'小心' },
            { id:'c8',  term:'detour',       zh:'繞道' },
            { id:'c9',  term:'construction', zh:'建設' },
            { id:'c10', term:'Earth',        zh:'地球' },
          ],
        },
        {
          id: 'g2-w16-cet-fb',
          type: 'fillblank',
          title: 'W16 · Volcano',
          color: 'indigo',
          linkedFlashcardId: 'g2-w16-cet-fc',
          questions: [
            { id:'q1',  sentence:'The _____ has been quiet for one hundred years, but scientists watch it carefully.',                answer:'volcano',      explain:'Volcano = 火山🌋！Volcano 是地底岩漿噴出地表形成的山，就算安靜也要小心！' },
            { id:'q2',  sentence:'Scientists warned people to leave the area before the volcano could _____.',                        answer:'erupt',        explain:'Erupt = 爆發💥！Volcano erupts 就是「火山爆發」，岩漿和火山灰會噴出來！' },
            { id:'q3',  sentence:'After the volcano erupted, a thick layer of gray _____ covered the entire village.',               answer:'ash',          explain:'Ash = 火山灰🌫️！Ash 是火山爆發後噴出的灰塵，可以覆蓋整個村莊！' },
            { id:'q4',  sentence:'Hot _____ rose from the cracks in the ground near the edge of the volcano.',                       answer:'steam',        explain:'Steam = 蒸氣💨！Steam 是水加熱後變成的氣體，火山附近的地面也會冒 steam！' },
            { id:'q5',  sentence:'The _____ plants grew back quickly after the rain washed the ash from the soil.',                  answer:'fern',         explain:'Fern = 蕨類植物🌿！Ferns 是一種葉子像羽毛的植物，生命力很強，火山灰後還能長回來！' },
            { id:'q6',  sentence:'Lava began to _____ slowly down the side of the mountain toward the empty road.',                  answer:'flow',         explain:'Flow = 流動🌊！Flow 是液體慢慢移動的樣子，熔岩 (lava) 會 flow down the mountain。' },
            { id:'q7',  sentence:'The sign on the trail warned hikers to use _____ because the path was slippery.',                  answer:'caution',      explain:'Caution = 小心、謹慎⚠️！Use caution 表示「要特別小心」，路滑的時候一定要 caution！' },
            { id:'q8',  sentence:'Drivers had to take a _____ because the main road was blocked by fallen rocks.',                   answer:'detour',       explain:'Detour = 繞道🔄！Detour 是因為原本的路不通而改走的另一條路。' },
            { id:'q9',  sentence:'The noise from the _____ work kept the neighbors awake every morning.',                            answer:'construction',  explain:'Construction = 建設、施工🏗️！Construction work 是建造工程，噪音很大，鄰居都睡不著！' },
            { id:'q10', sentence:'The _____ is the only planet we know of that has liquid water and supports life.',                 answer:'Earth',        explain:'Earth = 地球🌍！Earth 是我們住的地方，也是目前唯一已知有液態水和生命的星球！' },
          ],
        },

      ], // end vocab

      /* ── FET Vocabulary (外師單字) W10–W15 ── */
      word: [

        /* W10 · One Plastic Bag */
        {
          id: 'g2-w10-fet-fc',
          type: 'flashcard',
          title: 'W10 · One Plastic Bag',
          color: 'green',
          cards: [
            { id:'c1', term:'scents',  zh:'氣味' },
            { id:'c2', term:'tumbles', zh:'滾落' },
            { id:'c3', term:'silky',   zh:'滑滑的' },
            { id:'c4', term:'crumble', zh:'碎掉' },
            { id:'c5', term:'useless', zh:'無用的' },
            { id:'c6', term:'plastic', zh:'塑膠的' },
            { id:'c7', term:'goats',   zh:'山羊' },
            { id:'c8', term:'garbage', zh:'垃圾' },
          ],
        },
        {
          id: 'g2-w10-fet-fb',
          type: 'fillblank',
          title: 'W10 · One Plastic Bag',
          color: 'green',
          linkedFlashcardId: 'g2-w10-fet-fc',
          questions: [
            { id:'q1', sentence:'The flowers in the garden filled the air with sweet _____ after the rain.',                           answer:'scents',      explain:'Scents = 氣味（複數）👃！Scent 是好聞的香氣，花朵下雨後會散發 sweet scents。' },
            { id:'q2', sentence:'The little kitten _____ off the couch and lands softly on the fluffy carpet.',                        answer:'tumbles',     explain:'Tumble = 翻滾、跌落🐾！Tumble 是指滾著掉下來，小貓從沙發 tumbles off 超可愛！' },
            { id:'q3', sentence:'The princess wore a _____ dress that shimmered like moonlight in the night.',                         answer:'silky',       explain:'Silky = 像絲一樣光滑的✨！Silky 形容觸感非常滑順，像絲綢一樣的感覺。' },
            { id:'q4', sentence:'Old bread will _____ into tiny pieces when you press it with your fingers.',                          answer:'crumble',     explain:'Crumble = 碎成小塊🍞！Crumble 是指東西容易碎掉，舊麵包一壓就 crumbles！' },
            { id:'q5', sentence:'Without batteries, the flashlight was completely _____ during the power cut.',                        answer:'useless',     explain:'Useless = 沒有用的❌！Useless = not useful，沒電池的手電筒完全 useless！' },
            { id:'q6', sentence:'Bring a reusable bag instead of a _____ bag to help protect the environment.',                        answer:'plastic',     explain:'Plastic = 塑膠♻️！Plastic bags 污染環境，用 reusable bag 代替！保護地球從小事做起。' },
            { id:'q7', sentence:'The farmer keeps _____ on the hillside because they eat almost any kind of plant.',                   answer:'goats',       explain:'Goats = 山羊🐐！Goats 幾乎什麼植物都吃，是農場上很好養的動物。' },
            { id:'q8', sentence:'Please put your empty bottles and food wrappers in the _____ bin.',                                   answer:'garbage',     explain:'Garbage = 垃圾🗑️！Garbage bin 就是垃圾桶，記得把空瓶子丟進垃圾桶！' },
          ],
        },

        /* W11 · One Plastic Bag */
        {
          id: 'g2-w11-fet-fc',
          type: 'flashcard',
          title: 'W11 · One Plastic Bag',
          color: 'green',
          cards: [
            { id:'c1', term:'crochet',   zh:'編織' },
            { id:'c2', term:'spools',    zh:'一綑線' },
            { id:'c3', term:'mock',      zh:'嘲笑' },
            { id:'c4', term:'blistered', zh:'起水泡的' },
            { id:'c5', term:'recycled',  zh:'回收的' },
            { id:'c6', term:'purse',     zh:'錢包' },
            { id:'c7', term:'rubbish',   zh:'垃圾' },
            { id:'c8', term:'beautiful', zh:'美麗的' },
          ],
        },
        {
          id: 'g2-w11-fet-fb',
          type: 'fillblank',
          title: 'W11 · One Plastic Bag',
          color: 'green',
          linkedFlashcardId: 'g2-w11-fet-fc',
          questions: [
            { id:'q1', sentence:'Grandma used a small hook to _____ a warm blanket for the new baby.',                                 answer:'crochet',     explain:'Crochet = 用鉤針編織🧶！Crochet 是用一根鉤針把毛線編成布料，奶奶用這個方法做毛毯！' },
            { id:'q2', sentence:'The seamstress kept rows of colorful _____ of thread on the shelf above her table.',                  answer:'spools',      explain:'Spools = 線捲🧵！Spool 是把線繞成的圓形捲，裁縫師會有很多不同顏色的 spools of thread。' },
            { id:'q3', sentence:'It is unkind to _____ others for making mistakes when they are trying their best.',                   answer:'mock',        explain:'Mock = 嘲笑、取笑😤！Mock 是用言語或動作嘲笑別人，這樣做很不好！' },
            { id:'q4', sentence:'After the long hike in new shoes, her feet were sore and _____.',                                     answer:'blistered',   explain:'Blistered = 起水泡的🩹！Blister 是皮膚因為摩擦產生的水泡，穿新鞋走長路容易 blistered！' },
            { id:'q5', sentence:'The park bench is made from _____ plastic bottles collected by students in the town.',                answer:'recycled',    explain:'Recycled = 回收再製的♻️！Recycled 表示把舊材料重新製成新東西，很環保！' },
            { id:'q6', sentence:'She kept her phone, keys, and some coins inside her small leather _____.',                            answer:'purse',       explain:'Purse = 小錢包👜！Purse 是用來放錢、鑰匙和手機的小包包。' },
            { id:'q7', sentence:'The street was covered in _____ after the storm blew trash bins over.',                               answer:'rubbish',     explain:'Rubbish = 垃圾🗑️！Rubbish 和 garbage 都是垃圾，但 rubbish 常在英式英文 (British English) 使用。' },
            { id:'q8', sentence:'The sunset painted the sky in _____ shades of pink, orange, and purple.',                            answer:'beautiful',   explain:'Beautiful = 美麗的😍！Beautiful 形容非常好看的事物，日落的天空真的很 beautiful！' },
          ],
        },

        /* W12 · Kids Can Be Big Helpers */
        {
          id: 'g2-w12-fet-fc',
          type: 'flashcard',
          title: 'W12 · Kids Can Be Big Helpers',
          color: 'green',
          cards: [
            { id:'c1', term:'helpers',        zh:'幫手' },
            { id:'c2', term:'citizen',        zh:'國家的人' },
            { id:'c3', term:'volunteers',     zh:'志工' },
            { id:'c4', term:'responsible',    zh:'負責任的' },
            { id:'c5', term:'skill',          zh:'技能' },
            { id:'c6', term:'problem solving',zh:'解決問題' },
            { id:'c7', term:'organizing',     zh:'整理' },
            { id:'c8', term:'event',          zh:'活動' },
          ],
        },
        {
          id: 'g2-w12-fet-fb',
          type: 'fillblank',
          title: 'W12 · Kids Can Be Big Helpers',
          color: 'green',
          linkedFlashcardId: 'g2-w12-fet-fc',
          questions: [
            { id:'q1', sentence:'The little _____ put away all the chairs and cleaned the tables after the party.',                    answer:'helpers',        explain:'Helpers = 幫手🙋！Helper 是幫忙的人，這些小 helpers 把椅子收好、把桌子清乾淨！' },
            { id:'q2', sentence:'A good _____ follows rules, helps others, and takes care of the neighborhood.',                       answer:'citizen',        explain:'Citizen = 公民🏙️！A good citizen 是好公民，遵守規則、幫助他人、照顧社區！' },
            { id:'q3', sentence:'Every Saturday, _____ come to plant trees and clean up the river bank.',                              answer:'volunteers',     explain:'Volunteers = 志工🤝！Volunteer 是自願幫忙的人，不拿錢但付出時間，非常偉大！' },
            { id:'q4', sentence:'A _____ student always hands in homework on time and takes care of classroom tools.',                 answer:'responsible',    explain:'Responsible = 負責任的✅！Responsible 表示做好自己的義務，準時交作業就是 responsible！' },
            { id:'q5', sentence:'Playing chess requires sharp thinking and is an important problem-solving _____.',                    answer:'skill',          explain:'Skill = 技能、能力🎯！Skill 是透過練習學會的本領，下棋需要很強的思考 skill！' },
            { id:'q6', sentence:'_____ is an important ability that helps you find answers when things go wrong.',                     answer:'Problem solving', explain:'Problem solving = 解決問題能力🧩！Problem solving 是遇到困難時找到解決方法的能力，很重要！' },
            { id:'q7', sentence:'She spent the afternoon _____ the books by color and size on the shelf.',                            answer:'organizing',     explain:'Organizing = 整理、排列📂！Organize 是把東西整齊排好，她按照顏色和大小整理書！' },
            { id:'q8', sentence:'The school is planning a special _____ to raise money for the new library books.',                   answer:'event',          explain:'Event = 活動🎉！Event 是特別舉辦的場合，學校辦 event 來募款買新書！' },
          ],
        },

        /* W13 · Kids Can Be Big Helpers */
        {
          id: 'g2-w13-fet-fc',
          type: 'flashcard',
          title: 'W13 · Kids Can Be Big Helpers',
          color: 'green',
          cards: [
            { id:'c1', term:'fun',         zh:'有趣的' },
            { id:'c2', term:'participate', zh:'參加' },
            { id:'c3', term:'donate',      zh:'捐' },
            { id:'c4', term:'drive',       zh:'募款' },
            { id:'c5', term:'shelter',     zh:'收容所' },
            { id:'c6', term:'courteous',   zh:'有禮貌的' },
            { id:'c7', term:'litter',      zh:'垃圾' },
            { id:'c8', term:'citizenship', zh:'公民身份' },
          ],
        },
        {
          id: 'g2-w13-fet-fb',
          type: 'fillblank',
          title: 'W13 · Kids Can Be Big Helpers',
          color: 'green',
          linkedFlashcardId: 'g2-w13-fet-fc',
          questions: [
            { id:'q1', sentence:'The treasure hunt game was so _____ that nobody wanted to stop and go home.',                         answer:'fun',          explain:'Fun = 有趣的😄！Fun 表示非常好玩，尋寶遊戲太 fun 所以大家都不想停！' },
            { id:'q2', sentence:'Every student is welcome to _____ in the school talent show this Friday.',                            answer:'participate',  explain:'Participate = 參加、參與🙋！Participate in 表示「參與某活動」，每個同學都可以參加才藝表演！' },
            { id:'q3', sentence:'Many families chose to _____ warm coats and blankets to the homeless shelter.',                      answer:'donate',       explain:'Donate = 捐贈💝！Donate 是把自己的東西送給需要的人，很有愛心的行動！' },
            { id:'q4', sentence:'The school organized a food _____ to collect canned goods for families in need.',                    answer:'drive',        explain:'Drive = 活動（這裡是名詞）📦！Food drive 是「食物募集活動」，school drive 就是學校辦的募集活動！' },
            { id:'q5', sentence:'During the heavy rain, the children ran into the _____ at the bus stop.',                            answer:'shelter',      explain:'Shelter = 遮蔽處、避難所🏠！Shelter 是提供保護的地方，下大雨時躲進 shelter！' },
            { id:'q6', sentence:'A _____ person always says thank you, holds the door, and listens carefully.',                       answer:'courteous',    explain:'Courteous = 有禮貌的🙏！Courteous 比 polite 更正式，說謝謝、幫人開門都是 courteous！' },
            { id:'q7', sentence:'Please do not _____ in the park. Use the bins to keep our neighborhood clean.',                      answer:'litter',       explain:'Litter = 亂丟垃圾🚫！Litter 當動詞是「亂丟垃圾」，請不要 litter，保持公園乾淨！' },
            { id:'q8', sentence:'Good _____ means caring about your community and treating everyone with respect.',                   answer:'citizenship',  explain:'Citizenship = 公民意識🌍！Good citizenship 是關心社區、尊重他人，做一個好公民！' },
          ],
        },

        /* W14 · Introducing Landforms */
        {
          id: 'g2-w14-fet-fc',
          type: 'flashcard',
          title: 'W14 · Introducing Landforms',
          color: 'green',
          cards: [
            { id:'c1', term:'continents', zh:'大陸' },
            { id:'c2', term:'landforms',  zh:'地形' },
            { id:'c3', term:'wind',       zh:'風' },
            { id:'c4', term:'cliff',      zh:'懸崖' },
            { id:'c5', term:'coast',      zh:'海岸' },
            { id:'c6', term:'river',      zh:'河流' },
            { id:'c7', term:'valley',     zh:'山谷' },
            { id:'c8', term:'mountain',   zh:'山' },
          ],
        },
        {
          id: 'g2-w14-fet-fb',
          type: 'fillblank',
          title: 'W14 · Introducing Landforms',
          color: 'green',
          linkedFlashcardId: 'g2-w14-fet-fc',
          questions: [
            { id:'q1', sentence:'There are seven _____ on Earth: Africa, Asia, Europe, North America, South America, Australia, and Antarctica.', answer:'continents', explain:'Continents = 大陸、洲🌍！地球有七大 continents：非洲、亞洲、歐洲、北美、南美、澳洲、南極洲！' },
            { id:'q2', sentence:'Mountains, valleys, and plains are all types of _____ found across the Earth.',                      answer:'landforms',   explain:'Landforms = 地形🗺️！Landform 是地球表面的各種形狀，山、谷、平原都是不同的 landforms！' },
            { id:'q3', sentence:'The strong _____ blew the autumn leaves off every tree in the park.',                                answer:'wind',        explain:'Wind = 風💨！Strong wind 是強風，可以把秋天的葉子全部吹落！' },
            { id:'q4', sentence:'Standing at the edge of the _____, we looked down at the waves crashing far below.',                answer:'cliff',       explain:'Cliff = 懸崖🏔️！Cliff 是陡峭的岩石壁，站在邊緣往下看會看到遠遠的海浪！' },
            { id:'q5', sentence:'The family built a small house along the _____ where they could hear the ocean every morning.',     answer:'coast',       explain:'Coast = 海岸線🏖️！Coast 是陸地和海洋交界的地方，住在 coast 每天都能聽到海浪聲！' },
            { id:'q6', sentence:'Children splashed in the shallow _____ while their parents sat on the grassy bank.',                answer:'river',       explain:'River = 河流🏞️！River 是在陸地上流動的水，孩子們在淺淺的 river 裡玩水！' },
            { id:'q7', sentence:'The little village sat peacefully in the _____ between two tall green mountains.',                   answer:'valley',      explain:'Valley = 山谷🏔️！Valley 是兩座山之間的低地，小村莊安靜地坐落在 valley 中！' },
            { id:'q8', sentence:'It took the hikers three days to climb to the top of the tall _____.',                               answer:'mountain',    explain:'Mountain = 山⛰️！Mountain 是很高的地形，登山者花了三天才爬到 mountain 的頂端！' },
          ],
        },

        /* W15 · Introducing Landforms */
        {
          id: 'g2-w15-fet-fc',
          type: 'flashcard',
          title: 'W15 · Introducing Landforms',
          color: 'green',
          cards: [
            { id:'c1', term:'plains',     zh:'平原' },
            { id:'c2', term:'grasslands', zh:'草原' },
            { id:'c3', term:'desert',     zh:'沙漠' },
            { id:'c4', term:'dunes',      zh:'沙丘' },
            { id:'c5', term:'mesas',      zh:'平頂山' },
            { id:'c6', term:'canyons',    zh:'峽谷' },
            { id:'c7', term:'lava',       zh:'岩漿' },
            { id:'c8', term:'volcano',    zh:'火山' },
          ],
        },
        {
          id: 'g2-w15-fet-fb',
          type: 'fillblank',
          title: 'W15 · Introducing Landforms',
          color: 'green',
          linkedFlashcardId: 'g2-w15-fet-fc',
          questions: [
            { id:'q1', sentence:'Buffalo once roamed the wide open _____ of North America in massive herds.',                         answer:'plains',      explain:'Plains = 平原🌾！Plains 是廣大平坦的土地，以前北美的野牛在 plains 上成群奔跑！' },
            { id:'q2', sentence:'Lions and elephants live in the African _____ where the grass grows tall.',                          answer:'grasslands',  explain:'Grasslands = 草原🌿！Grasslands 是長滿草的廣大土地，非洲的獅子和大象就住在這裡！' },
            { id:'q3', sentence:'The _____ receives very little rain each year, so only tough plants can survive there.',             answer:'desert',      explain:'Desert = 沙漠🏜️！Desert 雨量非常少，非常乾燥，只有特別堅強的植物能夠生存！' },
            { id:'q4', sentence:'The children raced up the steep sand _____ and slid back down on their sleds.',                     answer:'dunes',       explain:'Dunes = 沙丘🏜️！Sand dunes 是沙堆成的小山，孩子們衝上去再滑下來，超好玩！' },
            { id:'q5', sentence:'The flat-topped _____ rose sharply from the desert floor like giant stone tables.',                 answer:'mesas',       explain:'Mesas = 平頂山🏔️！Mesas 是頂部很平、四周很陡的岩石山，看起來像超大的石頭桌子！' },
            { id:'q6', sentence:'Deep _____ were carved over millions of been years by rivers cutting through the rock.',             answer:'canyons',     explain:'Canyons = 峽谷🏞️！Canyons 是河水花幾百萬年切過岩石形成的深谷，像美國的大峽谷 Grand Canyon！' },
            { id:'q7', sentence:'Red-hot _____ poured out of the volcano and slowly hardened into dark black rock.',                 answer:'lava',        explain:'Lava = 岩漿🌋！Lava 是從火山流出的超高溫熔化岩石，冷卻後就變成黑色的石頭！' },
            { id:'q8', sentence:'The island was formed thousands of years ago when an undersea _____ erupted.',                      answer:'volcano',     explain:'Volcano 再次出現！🌋 這次是海底火山 (undersea volcano)，爆發後冒出海面形成一座島！' },
          ],
        },

      ], // end word

      grammar: [GRAMMAR_ITEM_1, GRAMMAR_ITEM_2],
      reading: [],
    },
  },

}; // end G2_SEED_WEEKS

/* ─── Firestore functions ───────────────────────────────────────────────── */
const G2_DATA_VERSION = 5; // bump when seed data structure changes

function subscribeToClassDataG2(callback) {
  return _classDocG2.onSnapshot(snap => {
    if (snap.exists) {
      const d = snap.data();
      // If data version is outdated, force re-seed with corrected field names
      if (!d._version || d._version < G2_DATA_VERSION) {
        _classDocG2.set({ _version: G2_DATA_VERSION, weeks: G2_SEED_WEEKS, weekOrder: G2_DEFAULT_WEEK_ORDER }).catch(() => {});
        callback(G2_SEED_WEEKS, G2_DEFAULT_WEEK_ORDER.slice());
        return;
      }
      const w = d.weeks || G2_SEED_WEEKS;
      const o = Array.isArray(d.weekOrder) && d.weekOrder.length > 0
        ? d.weekOrder : Object.keys(w).sort();
      callback(w, o);
    } else {
      // Auto-seed on first open
      _classDocG2.set({ _version: G2_DATA_VERSION, weeks: G2_SEED_WEEKS, weekOrder: G2_DEFAULT_WEEK_ORDER }).catch(() => {});
      callback(G2_SEED_WEEKS, G2_DEFAULT_WEEK_ORDER.slice());
    }
  });
}

async function saveWeeksG2(weeks) { await _classDocG2.set({ weeks },        { merge: true }); }
async function saveWeekOrderG2(o) { await _classDocG2.set({ weekOrder: o }, { merge: true }); }

function loadWeeksG2() {
  try { const r = localStorage.getItem(G2_STORAGE_KEY); if (r) return JSON.parse(r); } catch(e) {}
  return G2_SEED_WEEKS;
}
function loadWeekOrderG2() {
  try { const r = localStorage.getItem(G2_ORDER_KEY); if (r) { const a = JSON.parse(r); if (Array.isArray(a) && a.length) return a; } } catch(e) {}
  return G2_DEFAULT_WEEK_ORDER.slice();
}

/* ─── Exports ───────────────────────────────────────────────────────────── */
Object.assign(window, {
  CATEGORIES_G2,
  G2_DEFAULT_WEEK_ORDER,
  subscribeToClassDataG2,
  saveWeeksG2,
  saveWeekOrderG2,
  loadWeeksG2,
  loadWeekOrderG2,
});
