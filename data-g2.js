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
    { id:'gr2-q2',  text:'She sings "beautifully" in the school choir.',                                       options:['Adjective','Adverb'], answer:'Adverb',    hint:'Is the underlined word an adjective or adverb?', explain:'Beautifully describes how she sings — it is an adverb.' },
    { id:'gr2-q3',  text:'He is a "brave" firefighter who saved many lives.',                                  options:['Adjective','Adverb'], answer:'Adjective', hint:'Is the underlined word an adjective or adverb?', explain:'Brave describes the noun firefighter — it is an adjective.' },
    { id:'gr2-q4',  text:'The dog barked "loudly" at the stranger near the gate.',                             options:['Adjective','Adverb'], answer:'Adverb',    hint:'Is the underlined word an adjective or adverb?', explain:'Loudly describes how the dog barked — it is an adverb.' },
    { id:'gr2-q5',  text:'My grandmother told us an "ancient" story last night.',                              options:['Adjective','Adverb'], answer:'Adjective', hint:'Is the underlined word an adjective or adverb?', explain:'Ancient describes the noun story — it is an adjective.' },
    { id:'gr2-q6',  text:'The children played "happily" in the rain.',                                        options:['Adjective','Adverb'], answer:'Adverb',    hint:'Is the underlined word an adjective or adverb?', explain:'Happily describes how the children played — it is an adverb.' },
    { id:'gr2-q7',  text:'The "curious" monkey watched us from the top of the tree.',                         options:['Adjective','Adverb'], answer:'Adjective', hint:'Is the underlined word an adjective or adverb?', explain:'Curious describes the noun monkey — it is an adjective.' },
    { id:'gr2-q8',  text:'She finished her homework "quickly" so she could go outside.',                      options:['Adjective','Adverb'], answer:'Adverb',    hint:'Is the underlined word an adjective or adverb?', explain:'Quickly describes how she finished — it is an adverb.' },
    { id:'gr2-q9',  text:'The "old" library has thousands of books from many countries.',                      options:['Adjective','Adverb'], answer:'Adjective', hint:'Is the underlined word an adjective or adverb?', explain:'Old describes the noun library — it is an adjective.' },
    { id:'gr2-q10', text:'He speaks "softly" so he does not wake his sleeping baby sister.',                  options:['Adjective','Adverb'], answer:'Adverb',    hint:'Is the underlined word an adjective or adverb?', explain:'Softly describes how he speaks — it is an adverb.' },
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
            { id:'q1',  sentence:'Neil Armstrong was a brave _____ who walked on the moon in 1969.',                               answer:'astronaut' },
            { id:'q2',  sentence:'The _____ safely landed the plane during the heavy storm.',                                      answer:'pilot' },
            { id:'q3',  sentence:"Marie Curie was a _____ in science who opened doors for women everywhere.",                     answer:'pioneer' },
            { id:'q4',  sentence:'She worked for years to _____ her dream of becoming a doctor.',                                  answer:'accomplish' },
            { id:'q5',  sentence:"The teacher's kind words _____ many students to work harder and never give up.",                answer:'inspire' },
            { id:'q6',  sentence:'Their _____ was to help people in the mountain village get clean water.',                        answer:'mission' },
            { id:'q7',  sentence:'The school does not _____ students to use phones during class.',                                 answer:'allow' },
            { id:'q8',  sentence:'I _____ you can finish this puzzle in under five minutes if you try.',                           answer:'bet' },
            { id:'q9',  sentence:'Learning a new language is a big _____, but it becomes easier every day.',                       answer:'challenge' },
            { id:'q10', sentence:"She decided to _____ the invitation to join the school's science team.",                        answer:'accept' },
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
            { id:'q1',  sentence:'Hard work and practice will _____ how good you become at any skill.',                                answer:'determine' },
            { id:'q2',  sentence:'This is _____ the best apple pie I have ever tasted in my life.',                                    answer:'definitely' },
            { id:'q3',  sentence:'The Eiffel Tower was built more than a _____ ago, in the year 1889.',                                answer:'century' },
            { id:'q4',  sentence:'My sister studies biology at _____ because she wants to become a nurse.',                            answer:'college' },
            { id:'q5',  sentence:'A healthy _____ needs honest leaders, good schools, and safe streets for everyone.',                 answer:'society' },
            { id:'q6',  sentence:'The doctor spoke gently to the _____ and explained what the medicine was for.',                      answer:'patient' },
            { id:'q7',  sentence:'Eating vegetables, sleeping well, and exercising every day are keys to good _____.',                 answer:'health' },
            { id:'q8',  sentence:'After the accident, the doctor said the boy needed _____ to fix his broken leg.',                    answer:'surgery' },
            { id:'q9',  sentence:'_____ helps us understand why stars shine, why rain falls, and how plants grow.',                    answer:'Science' },
            { id:'q10', sentence:'The doctor will _____ your eyes and ears to make sure everything is working well.',                  answer:'examine' },
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
            { id:'q1',  sentence:'Her _____ is to run the school marathon next spring and finish in first place.',                      answer:'goal' },
            { id:'q2',  sentence:'It takes _____ to stand up and speak in front of the whole school.',                                 answer:'courage' },
            { id:'q3',  sentence:'If you _____ every day, you will see great improvement in your English skills.',                     answer:'work hard' },
            { id:'q4',  sentence:'Good friends _____ each other to keep trying even when things get difficult.',                       answer:'encourage' },
            { id:'q5',  sentence:'She would often _____ about living on a farm and taking care of many animals.',                      answer:'dream' },
            { id:'q6',  sentence:'He wanted to _____ to everyone that a quiet person can also be a great leader.',                     answer:'prove' },
            { id:'q7',  sentence:'Her parents always _____ her by coming to every game and cheering her on.',                          answer:'support' },
            { id:'q8',  sentence:'Please read every night so you can _____ with the rest of the class.',                               answer:'keep up' },
            { id:'q9',  sentence:'You should not _____ making mistakes, because mistakes help you learn and grow.',                    answer:'be afraid of' },
            { id:'q10', sentence:'No matter how hard it gets, never _____ on the things that matter most to you.',                    answer:'give up' },
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
            { id:'q1',  sentence:'The famous _____ designed a beautiful library that blends glass and stone.',                         answer:'architect' },
            { id:'q2',  sentence:'She used colorful pencils to _____ a new pattern for the school flag.',                             answer:'design' },
            { id:'q3',  sentence:'The painting was a beautiful _____ that took the artist three months to finish.',                   answer:'creation' },
            { id:'q4',  sentence:'Can you spot the _____ between these two pictures? Look very carefully!',                           answer:'difference' },
            { id:'q5',  sentence:"Music can greatly _____ a person's mood and help them feel calm or happy.",                        answer:'influence' },
            { id:'q6',  sentence:'Paris is _____ for its wonderful food, art museums, and the Eiffel Tower.',                         answer:'famous' },
            { id:'q7',  sentence:'She won first _____ in the national drawing competition and received a gold medal.',                 answer:'prize' },
            { id:'q8',  sentence:'The _____ temple was built over two thousand years ago and still stands today.',                    answer:'ancient' },
            { id:'q9',  sentence:'Be careful not to _____ yourself when you use sharp scissors or a knife.',                          answer:'hurt' },
            { id:'q10', sentence:'Our school festival includes _____ dances, costumes, and food from our culture.',                   answer:'traditional' },
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
            { id:'q1',  sentence:'The new _____ in the city center has sixty floors and a rooftop garden.',                           answer:'building' },
            { id:'q2',  sentence:'The art _____ is filled with paintings, sculptures, and photographs from many countries.',          answer:'museum' },
            { id:'q3',  sentence:'You can borrow books, study quietly, and use computers at the school _____.',                       answer:'library' },
            { id:'q4',  sentence:'The engineer carefully checked the _____ of the bridge to make sure it was safe.',                  answer:'structure' },
            { id:'q5',  sentence:'The window is made of thick _____ so the wind cannot get inside the house.',                       answer:'glass' },
            { id:'q6',  sentence:'The ancient Egyptians built enormous _____ as tombs for their pharaohs and kings.',                 answer:'pyramid' },
            { id:'q7',  sentence:'A circle, a triangle, and a square are all different types of _____.',                              answer:'shape' },
            { id:'q8',  sentence:'The stone _____ above the door has been there for hundreds of years.',                              answer:'arch' },
            { id:'q9',  sentence:'Her writing has a very creative _____ that makes every story interesting to read.',                 answer:'style' },
            { id:'q10', sentence:'From the top of the _____, we could see the whole city spread out below us.',                       answer:'tower' },
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
            { id:'q1',  sentence:'Close your eyes and _____ you are walking through a magical forest full of colors.',                answer:'imagine' },
            { id:'q2',  sentence:'She needs to _____ every day to prepare for the big English test next week.',                       answer:'study' },
            { id:'q3',  sentence:'The math teacher showed the class three different ways to _____ the tricky problem.',               answer:'solve' },
            { id:'q4',  sentence:'You must _____ the piano for at least thirty minutes every evening before dinner.',                 answer:'practice' },
            { id:'q5',  sentence:'Students will use clay to _____ their own animals during the art class today.',                    answer:'create' },
            { id:'q6',  sentence:"Our team's _____ is to build a model of a solar system out of recycled items.",                   answer:'project' },
            { id:'q7',  sentence:'There is not enough _____ for all the boxes in the small storage room.',                            answer:'space' },
            { id:'q8',  sentence:'The new _____ hospital has robots that help doctors perform difficult operations.',                  answer:'modern' },
            { id:'q9',  sentence:'In the _____, people had to write letters by hand when they wanted to send messages.',              answer:'past' },
            { id:'q10', sentence:'Scientists are working hard to find clean energy sources for the _____ of our planet.',             answer:'future' },
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
            { id:'q1',  sentence:'The _____ has been quiet for one hundred years, but scientists watch it carefully.',                answer:'volcano' },
            { id:'q2',  sentence:'Scientists warned people to leave the area before the volcano could _____.',                        answer:'erupt' },
            { id:'q3',  sentence:'After the volcano erupted, a thick layer of gray _____ covered the entire village.',               answer:'ash' },
            { id:'q4',  sentence:'Hot _____ rose from the cracks in the ground near the edge of the volcano.',                       answer:'steam' },
            { id:'q5',  sentence:'The _____ plants grew back quickly after the rain washed the ash from the soil.',                  answer:'fern' },
            { id:'q6',  sentence:'Lava began to _____ slowly down the side of the mountain toward the empty road.',                  answer:'flow' },
            { id:'q7',  sentence:'The sign on the trail warned hikers to use _____ because the path was slippery.',                  answer:'caution' },
            { id:'q8',  sentence:'Drivers had to take a _____ because the main road was blocked by fallen rocks.',                   answer:'detour' },
            { id:'q9',  sentence:'The noise from the _____ work kept the neighbors awake every morning.',                            answer:'construction' },
            { id:'q10', sentence:'The _____ is the only planet we know of that has liquid water and supports life.',                 answer:'Earth' },
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
            { id:'q1', sentence:'The flowers in the garden filled the air with sweet _____ after the rain.',                           answer:'scents' },
            { id:'q2', sentence:'The little kitten _____ off the couch and lands softly on the fluffy carpet.',                        answer:'tumbles' },
            { id:'q3', sentence:'The princess wore a _____ dress that shimmered like moonlight in the night.',                         answer:'silky' },
            { id:'q4', sentence:'Old bread will _____ into tiny pieces when you press it with your fingers.',                          answer:'crumble' },
            { id:'q5', sentence:'Without batteries, the flashlight was completely _____ during the power cut.',                        answer:'useless' },
            { id:'q6', sentence:'Bring a reusable bag instead of a _____ bag to help protect the environment.',                        answer:'plastic' },
            { id:'q7', sentence:'The farmer keeps _____ on the hillside because they eat almost any kind of plant.',                   answer:'goats' },
            { id:'q8', sentence:'Please put your empty bottles and food wrappers in the _____ bin.',                                   answer:'garbage' },
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
            { id:'q1', sentence:'Grandma used a small hook to _____ a warm blanket for the new baby.',                                 answer:'crochet' },
            { id:'q2', sentence:'The seamstress kept rows of colorful _____ of thread on the shelf above her table.',                  answer:'spools' },
            { id:'q3', sentence:'It is unkind to _____ others for making mistakes when they are trying their best.',                   answer:'mock' },
            { id:'q4', sentence:'After the long hike in new shoes, her feet were sore and _____.',                                     answer:'blistered' },
            { id:'q5', sentence:'The park bench is made from _____ plastic bottles collected by students in the town.',                answer:'recycled' },
            { id:'q6', sentence:'She kept her phone, keys, and some coins inside her small leather _____.',                            answer:'purse' },
            { id:'q7', sentence:'The street was covered in _____ after the storm blew trash bins over.',                               answer:'rubbish' },
            { id:'q8', sentence:'The sunset painted the sky in _____ shades of pink, orange, and purple.',                            answer:'beautiful' },
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
            { id:'q1', sentence:'The little _____ put away all the chairs and cleaned the tables after the party.',                    answer:'helpers' },
            { id:'q2', sentence:'A good _____ follows rules, helps others, and takes care of the neighborhood.',                       answer:'citizen' },
            { id:'q3', sentence:'Every Saturday, _____ come to plant trees and clean up the river bank.',                              answer:'volunteers' },
            { id:'q4', sentence:'A _____ student always hands in homework on time and takes care of classroom tools.',                 answer:'responsible' },
            { id:'q5', sentence:'Playing chess requires sharp thinking and is an important problem-solving _____.',                    answer:'skill' },
            { id:'q6', sentence:'_____ is an important ability that helps you find answers when things go wrong.',                     answer:'Problem solving' },
            { id:'q7', sentence:'She spent the afternoon _____ the books by color and size on the shelf.',                            answer:'organizing' },
            { id:'q8', sentence:'The school is planning a special _____ to raise money for the new library books.',                   answer:'event' },
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
            { id:'q1', sentence:'The treasure hunt game was so _____ that nobody wanted to stop and go home.',                         answer:'fun' },
            { id:'q2', sentence:'Every student is welcome to _____ in the school talent show this Friday.',                            answer:'participate' },
            { id:'q3', sentence:'Many families chose to _____ warm coats and blankets to the homeless shelter.',                      answer:'donate' },
            { id:'q4', sentence:'The school organized a food _____ to collect canned goods for families in need.',                    answer:'drive' },
            { id:'q5', sentence:'During the heavy rain, the children ran into the _____ at the bus stop.',                            answer:'shelter' },
            { id:'q6', sentence:'A _____ person always says thank you, holds the door, and listens carefully.',                       answer:'courteous' },
            { id:'q7', sentence:'Please do not _____ in the park. Use the bins to keep our neighborhood clean.',                      answer:'litter' },
            { id:'q8', sentence:'Good _____ means caring about your community and treating everyone with respect.',                   answer:'citizenship' },
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
            { id:'q1', sentence:'There are seven _____ on Earth: Africa, Asia, Europe, North America, South America, Australia, and Antarctica.', answer:'continents' },
            { id:'q2', sentence:'Mountains, valleys, and plains are all types of _____ found across the Earth.',                      answer:'landforms' },
            { id:'q3', sentence:'The strong _____ blew the autumn leaves off every tree in the park.',                                answer:'wind' },
            { id:'q4', sentence:'Standing at the edge of the _____, we looked down at the waves crashing far below.',                answer:'cliff' },
            { id:'q5', sentence:'The family built a small house along the _____ where they could hear the ocean every morning.',     answer:'coast' },
            { id:'q6', sentence:'Children splashed in the shallow _____ while their parents sat on the grassy bank.',                answer:'river' },
            { id:'q7', sentence:'The little village sat peacefully in the _____ between two tall green mountains.',                   answer:'valley' },
            { id:'q8', sentence:'It took the hikers three days to climb to the top of the tall _____.',                               answer:'mountain' },
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
            { id:'q1', sentence:'Buffalo once roamed the wide open _____ of North America in massive herds.',                         answer:'plains' },
            { id:'q2', sentence:'Lions and elephants live in the African _____ where the grass grows tall.',                          answer:'grasslands' },
            { id:'q3', sentence:'The _____ receives very little rain each year, so only tough plants can survive there.',             answer:'desert' },
            { id:'q4', sentence:'The children raced up the steep sand _____ and slid back down on their sleds.',                     answer:'dunes' },
            { id:'q5', sentence:'The flat-topped _____ rose sharply from the desert floor like giant stone tables.',                 answer:'mesas' },
            { id:'q6', sentence:'Deep _____ were carved over millions of years by rivers cutting through the rock.',                 answer:'canyons' },
            { id:'q7', sentence:'Red-hot _____ poured out of the volcano and slowly hardened into dark black rock.',                 answer:'lava' },
            { id:'q8', sentence:'The island was formed thousands of years ago when an undersea _____ erupted.',                      answer:'volcano' },
          ],
        },

      ], // end word

      grammar: [GRAMMAR_ITEM_1, GRAMMAR_ITEM_2],
      reading: [],
    },
  },

}; // end G2_SEED_WEEKS

/* ─── Firestore functions ───────────────────────────────────────────────── */
const G2_DATA_VERSION = 3; // bump when seed data structure changes

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
