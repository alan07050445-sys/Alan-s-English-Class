/* t-grammar-review — v469（Alan：「所以單字已經可以在原本的一整組上面再出給
 *   隔一週或是之後的哪一週，或是文法，可以當作複習？」）
 *
 * v466 只做了單字（選單的條件是「這一組有單字卡」），文法組沒有單字卡＝選單不出現。
 * 這一支守的是文法那一半。
 *
 * 真 AI 實測（同一個 Simple Past 出兩次，第二次把第一次的句子當 avoid）：
 *   第一次答案：went、finished、bought、liked、walked、ate、went、bought
 *   複習的答案：ate、visited、saw、lent、rode、played、visited、made
 *   一模一樣的句子 0/8，答案重複 1/8（ate，但在完全不同的句子裡）。
 * ⚠ 不要用「用字重疊率」當指標——時間線索（yesterday / two days ago）正是
 *   這一課的考點，本來就必須重複出現，算進去會得到看起來很糟但沒意義的數字。
 *   要量的是「背過答案的小朋友能不能不看題目就寫對」＝答案與句子本身。
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');

const pick = (a, b) => data.slice(data.indexOf(a), data.indexOf(b));
const R = new Function(pick('function reviewGrammarOf', 'function collectWrongQuestions')
  + '\nreturn { reviewGrammarOf, reviewSeenSentences };')();

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const NOTES = 'Simple Past. Regular verbs add -ed. Irregular: go->went, eat->ate.';
const WITH_NOTES = [
  { type: 'lesson', srcTopic: 'Simple Past Tense', srcNotes: NOTES,
    lead: '今天學過去式', steps: [{ say: '動詞加 -ed', examples: [{ en: 'I walked home.' }] }] },
  { type: 'quiz', questions: [{ q: 'I ___ to school yesterday.' }] },
];
const OLD_UNIT = [   // v466 之前出的：有互動教學但沒有 srcNotes
  { type: 'lesson', group: 'Simple Past · 第三課', lead: '過去發生的事要用過去式',
    steps: [{ say: '規則動詞加 -ed', examples: [{ en: 'She played outside.' }], q: '選出正確的', why: '因為是昨天' }] },
];

console.log('\n【1】教學重點從哪來——沒有它，重出的題目會教錯東西');
const g1 = R.reviewGrammarOf(WITH_NOTES);
ok('⭐ v466 之後出的，直接用老師原本的教學重點', g1 && g1.notes === NOTES && g1.fromNotes === true);
ok('⭐ 題目主題也拿得到', g1 && g1.topic === 'Simple Past Tense');

const g2 = R.reviewGrammarOf(OLD_UNIT);
ok('⭐ v466 之前出的沒有 srcNotes → 從互動教學反推（不是直接放棄）', g2 && g2.fromNotes === false && !!g2.notes);
ok('反推的內容包含講解與例句', g2 && /規則動詞加 -ed/.test(g2.notes) && /She played outside/.test(g2.notes));
ok('組名的「· 第三課」要去掉（那不是文法主題）', g2 && g2.topic === 'Simple Past');
ok('畫面要能看出是反推的（老實告訴老師）', /gram\.fromNotes/.test(ed) && /反推/.test(ed));

console.log('\n【2】不是文法組就不要裝成文法組');
ok('沒有互動教學 → null', R.reviewGrammarOf([{ type: 'quiz', questions: [] }]) === null);
ok('互動教學是空的 → null', R.reviewGrammarOf([{ type: 'lesson', steps: [] }]) === null);
ok('空陣列／undefined 不會爆', R.reviewGrammarOf([]) === null && R.reviewGrammarOf(undefined) === null);

console.log('\n【3】上次出過的句子要抓得到（這是「不能背答案」的唯一來源）');
const seen = R.reviewSeenSentences(WITH_NOTES);
ok('⭐ 抓得到上次的題幹', seen.includes('I ___ to school yesterday.'));

console.log('\n【4】AI 那一端：同一個教學重點＋avoid');
ok('⭐ aiMakeGrammarPack 收 avoid', /function aiMakeGrammarPack\(\{[^}]*avoid/s.test(data));
/* 切出 aiMakeGrammarPack 的函式本體再比——不然「檔案裡某處有 _aiAvoidNote」
   連單字那邊的呼叫都會算進來，等於什麼都沒守到。 */
const packBody = data.slice(data.indexOf('function aiMakeGrammarPack'),
                            data.indexOf('function grCountBlanks'));
ok('⭐ avoid 真的接到 prompt 的 base 上（不是收了不用）',
   packBody.length > 500 && /\+\s*_aiAvoidNote\(avoid\)/.test(packBody));
ok('跟單字複習共用同一個 _aiAvoidNote（同一件事只有一份邏輯）', /function _aiAvoidNote\(avoid\)/.test(data));
ok('reviewGrammarOf 有掛出去給畫面用', /reviewGrammarOf,/.test(data));

console.log('\n【5】互動教學不重出——那一課教的東西沒變');
ok('⭐ app.jsx 的文法複習傳 lesson: null', /gnBuildItems\(\{[^)]*lesson:\s*null/s.test(app));
ok('⭐ gnBuildItems 沒有 steps 就不做教學單元，也就不會有 requires',
   /const lessonId = steps\.length \? /.test(ed) && /const req = lessonId \? \{ requires: lessonId \} : \{\};/.test(ed));
ok('畫面有講清楚（老師才不會以為壞了）', /互動教學不會重出/.test(ed));

console.log('\n【6】整條路有接起來——少一段，按鈕按下去就沒反應');
ok('⭐ 側欄選單：有單字卡**或**有互動教學都要出現',
   /window\.reviewGrammarOf\(g\.items\)\)\) && \(/.test(qm));
ok('⭐ 彈窗分得出是單字還是文法', /const isGram = !!gram;/.test(ed));
ok('⭐ 文法有自己的題數選單', /\['📝 整段改錯', 'nEdit'/.test(ed));
ok('⭐ 送出時帶 grammar 與 topic', /onCreate\(\{ targetWeekId: week, catId, groupName, grammar: pack, topic: gram\.topic/.test(ed));
ok('⭐ app.jsx 收得到並分流到 gnBuildItems', /handleCreateReview = \(\{[^}]*grammar, topic \}\)/s.test(app));
ok('文法組不應該被「找不到單字卡」擋住', /disabled=\{!week \|\| \(!isGram && w\.length < 2\)/.test(ed));

console.log(`\n${fail ? '❌' : '✅'} t-grammar-review：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
