/* t-lesson-anim-kinds — v471 三種「會動的講解」
 *   ⏳ timeline 時態時間軸／🔀 forms 三種句型／📊 degree 比較級
 *
 * 它們沒有對錯（小朋友點哪個都不會錯），但**講錯的文法比答錯一題更糟**，
 * 所以程式還是要驗。真 AI 實測（2026-10-07）：
 *   過去簡單式 → timeline + forms（walked/walk/will walk；She ate/did not eat/Did she eat?）
 *   比較級     → degree ×2（tall/taller/tallest 與 beautiful/more/the most）
 *   什麼是名詞 → 三種都不提供（v443 的坑：不綁主題就會教名詞卻跑出時間軸）
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const css  = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');

const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
/* gnValidStep 會用到簡轉繁、去頭尾標點那幾個小工具（住在它上面），
   少切一個就整支 ReferenceError——跟 v469 修 t-grammar-notes 同一個坑。 */
const V = new Function('window',
  pick('const _ZH_S2T', '/* v471：哪些步驟是「講解」') +
  pick('/* v471：哪些步驟是「講解」', 'function gnValidLesson') +
  '\nreturn { gnValidStep, gnIsTeachStep, GN_TEACH_KINDS };')({});
const P = new Function(pick('const _GN_IDENTIFY_RE', '/* imgHint 要講的是')
  + '\nreturn _gnLessonPlan;')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】⏳ 時態時間軸');
const TL = { kind: 'timeline', q: '同一件事', why: '時間線索決定動詞長相', points: [
  { when: 'future', en: 'I will walk to school tomorrow.', hl: ['will walk'], zh: '我明天會走路去學校。' },
  { when: 'past',   en: 'I walked to school yesterday.',   hl: ['walked'],    zh: '我昨天走路去學校。' },
  { when: 'now',    en: 'I walk to school every day.',     hl: ['walk'],      zh: '我每天走路去學校。' }] };
const t1 = V.gnValidStep(TL);
ok('⭐ 程式自己排成 過去→現在→未來（不信任 AI 給的順序）',
   t1 && t1.points.map(p => p.when).join(',') === 'past,now,future');
ok('標重點的字一定要在句子裡（不在就丟掉）',
   V.gnValidStep({ ...TL, points: [{ when: 'past', en: 'I walked.', hl: ['ran'] }, { when: 'now', en: 'I walk.' }] })
     .points[0].hl.length === 0);
ok('⭐ 三個時間點講同一句話＝沒示範到變化，整步不要',
   V.gnValidStep({ kind: 'timeline', points: [{ when: 'past', en: 'I walk.' }, { when: 'now', en: 'I walk.' }] }) === null);
ok('只有一個時間點也不行（沒得比）',
   V.gnValidStep({ kind: 'timeline', points: [{ when: 'past', en: 'I walked.' }] }) === null);
ok('不認得的時間（"later"）當作沒給', V.gnValidStep({ kind: 'timeline', points: [
   { when: 'later', en: 'I will walk.' }, { when: 'past', en: 'I walked.' }, { when: 'now', en: 'I walk.' }] })
   .points.length === 2);

console.log('\n【2】🔀 肯定／否定／疑問');
const FM = { kind: 'forms', q: '三種長相', forms: [
  { type: 'question',    en: 'Did she eat an apple?',     hl: ['Did', 'eat'] },
  { type: 'affirmative', en: 'She ate an apple.',         hl: ['ate'] },
  { type: 'negative',    en: 'She did not eat an apple.', hl: ['did not eat'] }] };
const f1 = V.gnValidStep(FM);
ok('⭐ 排成 肯定→否定→疑問', f1 && f1.forms.map(f => f.type).join(',') === 'affirmative,negative,question');
ok('⭐ 疑問句沒有問號＝AI 根本沒改成疑問句，整步不要',
   V.gnValidStep({ kind: 'forms', forms: [
     { type: 'affirmative', en: 'She ate an apple.' }, { type: 'question', en: 'Did she eat an apple' }] }) === null);
ok('三句一模一樣也不要', V.gnValidStep({ kind: 'forms', forms: [
   { type: 'affirmative', en: 'She ate.' }, { type: 'negative', en: 'She ate.' }] }) === null);

console.log('\n【3】📊 比較級');
const DG = { kind: 'degree', q: '一個比一個更', levels: [
  { form: 'tall', en: 'Tom is tall.', zh: '高' },
  { form: 'taller', en: 'Amy is taller than Tom.', zh: '比較高' },
  { form: 'tallest', en: 'Ben is the tallest.', zh: '最高' }] };
ok('⭐ 正常的三級過得了', !!V.gnValidStep(DG));
ok('⭐ 例句裡沒有那個字＝等於沒示範，整步不要',
   V.gnValidStep({ ...DG, levels: [DG.levels[0], { form: 'taller', en: 'Amy is big than Tom.' }, DG.levels[2]] }) === null);
ok('⭐ 比較級那句要看得出在比較（than／-er／more）',
   V.gnValidStep({ kind: 'degree', levels: [
     { form: 'good', en: 'It is good.' }, { form: 'nice', en: 'It is nice.' }, { form: 'best', en: 'It is the best.' }] }) === null);
ok('長形容詞 more／the most 也要過得了', !!V.gnValidStep({ kind: 'degree', levels: [
   { form: 'beautiful', en: 'This flower is beautiful.' },
   { form: 'more beautiful', en: 'This flower is more beautiful than that one.' },
   { form: 'the most beautiful', en: 'This flower is the most beautiful in the garden.' }] }));
ok('不規則變化 good／better／best 也要過得了', !!V.gnValidStep({ kind: 'degree', levels: [
   { form: 'good', en: 'This book is good.' },
   { form: 'better', en: 'That book is better than this one.' },
   { form: 'best', en: 'That book is the best in the shop.' }] }));
ok('不是三級就不要（兩級沒東西比、四級太多）',
   V.gnValidStep({ kind: 'degree', levels: DG.levels.slice(0, 2) }) === null);

console.log('\n【4】綁主題——v443 的坑：不綁就會教名詞卻跑出時間軸');
const plan = (t, n) => P(t, n || '');
const past = plan('Simple Past Tense 過去簡單式',
  'Regular verbs add -ed. Negative: did not + base verb. Question: Did + subject?');
ok('⭐ 過去式 → 給時間軸與三種句型', past.anim.indexOf('timeline') >= 0 && past.anim.indexOf('forms') >= 0);
ok('   但不給比較級', past.ban.indexOf('degree') >= 0);
const cmp = plan('Comparative and Superlative 比較級與最高級', 'tall -> taller -> tallest. Use than.');
ok('⭐ 比較級 → 給長條圖', cmp.anim.indexOf('degree') >= 0);
ok('   但不給時間軸', cmp.ban.indexOf('timeline') >= 0);
const noun = plan('Nouns 名詞', 'A noun is a naming word. person, animal, place, thing.');
ok('⭐ 什麼是名詞 → 三種都不給（這就是 v443 那個坑）',
   noun.anim.length === 0 && ['timeline', 'forms', 'degree'].every(k => noun.ban.indexOf(k) >= 0));
ok('不適用的連提都不提（提示詞裡不出現，省 token 也少一輪重試）',
   P('Nouns 名詞', '').text.indexOf('ANIMATED EXPLANATIONS') < 0);
ok('適用的才把 JSON 格式放進提示詞', past.text.indexOf('"timeline"') > 0 && past.text.indexOf('"when":"past|now|future"') > 0);
ok('看的是主題＋筆記，不是只看標題',
   plan('Unit 5', 'We learn the simple past tense this week. yesterday, last night.').anim.indexOf('timeline') >= 0);

console.log('\n【5】「這一步是講解還是動手」只有一份判斷');
ok('⭐ 有共用的 gnIsTeachStep', typeof V.gnIsTeachStep === 'function');
ok('⭐ 四種都算講解', ['learn', 'timeline', 'forms', 'degree'].every(k => V.gnIsTeachStep({ kind: k })));
ok('動手的那些不算', ['pick', 'tap', 'sort', 'order', 'fix'].every(k => !V.gnIsTeachStep({ kind: k })));
ok('傳字串也認得（呼叫端寫法不一）', V.gnIsTeachStep('timeline') && !V.gnIsTeachStep('pick'));
ok('空的不會爆', !V.gnIsTeachStep(null) && !V.gnIsTeachStep(undefined));
// 散落的地方全部改用它了——漏一處，那一處就會把會動的講解當成「動手題」
ok('⭐ data.js 不再用 kind === \'learn\' 判斷出文法的教學步驟',
   (data.slice(data.indexOf('async function aiMakeGrammarLesson'), data.indexOf('async function aiMakeReadingBackground'))
     .match(/kind === 'learn'/g) || []).length === 0);
ok('⭐ 學生端也改用它（算題數／能不能按下一步／按鈕寫什麼）',
   (qm.match(/isTeach\(/g) || []).length >= 3 && /window\.gnIsTeachStep/.test(qm));

console.log('\n【6】老師看得到也改得動（不然 AI 出了什麼完全看不見）');
ok('⭐ 三種都有校稿欄位',
   /st\.kind === 'timeline' && </.test(ed) && /st\.kind === 'forms' && </.test(ed) && /st\.kind === 'degree' && </.test(ed));
ok('⭐ 側欄標籤有中文名字', /timeline: '⏳ 時態時間軸', forms: '🔀 三種句型', degree: '📊 比較級'/.test(ed));
ok('時間／句型用下拉選單（打錯字就整步失效）',
   /<option value="past">過去<\/option>/.test(ed) && /<option value="question">疑問<\/option>/.test(ed));

console.log('\n【7】畫面');
ok('⭐ 學生端三種都畫得出來',
   /cur\.kind === 'timeline' && \(\(\) =>/.test(qm) && /cur\.kind === 'forms' && \(\(\) =>/.test(qm) && /cur\.kind === 'degree' && \(\(\) =>/.test(qm));
ok('⭐ 換句子時 key 要換，不然變形動畫不會播（v470 學到的）',
   (qm.match(/<div key=\{at\} className="gnl-tl-say">/g) || []).length === 3);
ok('⭐ 長條包了一層格子（直接算 100% 會跟底下的字搶空間，最高那根被壓扁）',
   /<span className="gnl-bar-slot">/.test(qm) && /\.gnl-bar-slot \{ flex: 1 1 auto; min-height: 0;/.test(css));
ok('只用點、沒有拖曳（規格要求平板只用點）',
   !/onDragStart|draggable|onTouchMove/.test(qm.slice(qm.indexOf("cur.kind === 'timeline'"), qm.indexOf("cur.kind === 'fix'"))));
ok('窄螢幕有收一下（時間軸的字不要擠成兩行）', /@media \(max-width: 420px\)[\s\S]{0,400}\.gnl-tl-ico/.test(css));

console.log(`\n${fail ? '❌' : '✅'} t-lesson-anim-kinds：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
