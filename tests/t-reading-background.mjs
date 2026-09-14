/* t-reading-background — v436 📖 閱讀理解「讀之前先知道」的互動背景知識
 * Alan：「還缺少了一開始的 background 給學生的背景知識…希望跟 grammar 一樣有互動式學習」
 * 不連網路：AI 的回答用假的，只測程式本身的把關。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data   = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const editor = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const qm     = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const app    = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };
const fnEnd = (src, a) => { const i = src.indexOf(a); const j = src.indexOf('\n}\n', i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j + 2); };

let aiQueue = []; const calls = [];
const _aiAsk = async (body, pickFn) => {
  calls.push(body);
  const next = aiQueue.shift();
  if (next instanceof Error) throw next;
  const got = pickFn({ content: [{ type: 'text', text: typeof next === 'string' ? next : JSON.stringify(next) }] });
  if (got == null) throw new Error('bad');
  return got;
};
// data.js 的閱讀背景知識用到 GN 那一區的驗證器與 _gnCall，一起載進來
const code = slice(data, 'const GN_MODEL', 'function grCountBlanks') + '\n' + slice(data, 'const RC_GRADES = {', 'const RC_QSKILLS = {');
const W = new Function('_aiAsk', '_aiStripFence', '_AI_MINIFY',
  code + '\nreturn { aiMakeReadingBackground, RC_BG_SYS, gnValidStep, gnValidLesson };')(
  _aiAsk, (t) => String(t).replace(/^```(json)?/, '').replace(/```$/, '').trim(), '');

globalThis.window = { gnValidStep: W.gnValidStep, RC_SKILLS: {}, RC_QSKILLS: {} };
const B = new Function('window', 'rcMcqOk', 'rcValidBlock', fnEnd(editor, 'function rcBuildItems') + '\nreturn rcBuildItems;')(
  globalThis.window, (q) => !!(q && q.q && (q.options || []).length >= 2), () => true);

let pass = 0, fail = 0; const log = [];
const ok = (n, c, e) => c ? (pass++, log.push('  ✅ ' + n)) : (fail++, log.push('  ❌ ' + n + (e ? '\n       ↳ ' + String(e) : '')));

const ART = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
const goodLesson = {
  lead: '這篇在講南極的企鵝', outro: '準備好就開始讀吧！',
  steps: [
    { kind: 'learn', say: '南極是地球最冷的地方', imgHint: 'antarctica ice penguins',
      examples: [{ en: 'Antarctica is very cold.', hl: ['cold'], zh: '南極非常冷' }] },
    { kind: 'pick', q: '南極的天氣是？', options: ['很冷', '很熱'], answer: 0, why: '南極終年結冰' },
    { kind: 'learn', say: '企鵝不會飛，但很會游泳',
      examples: [{ en: 'Penguins swim very fast.', hl: ['swim'], zh: '企鵝游得很快' }] },
    { kind: 'pick', q: 'Penguins cannot ________.', options: ['fly', 'swim'], answer: 0, why: '企鵝的翅膀用來游泳' },
  ],
};

log.push('\n【1】產生背景知識');
{
  aiQueue = [goodLesson];
  const l = await W.aiMakeReadingBackground({ passage: ART, title: 'Penguins', grade: 'g4' });
  ok('四步（學→選→學→選）都收下', l.steps.length === 4 && l.lead === '這篇在講南極的企鵝');
  ok('⭐ 老師建議放什麼圖有留著（imgHint）', l.steps[0].imgHint === 'antarctica ice penguins');
  ok('文章太短就直說（AI 不會白跑）', await W.aiMakeReadingBackground({ passage: 'too short', grade: 'g4' }).then(() => false, e => /至少要 40/.test(e.message)));
  ok('⭐ prompt 明講「不可以爆雷、不要說 the article says」', /Never give away the article's own comprehension answers/.test(W.RC_BG_SYS) && /the child has not read it yet/.test(W.RC_BG_SYS));
  ok('prompt 要求一學一測、3~4 回合', /3 or 4 rounds/.test(W.RC_BG_SYS) && /ONE "pick" that checks it/.test(W.RC_BG_SYS));
  ok('prompt 要 AI 建議配什麼圖（老師自己放）', /imgHint/.test(W.RC_BG_SYS) && /the teacher adds the photo/.test(W.RC_BG_SYS));
  aiQueue = [{ steps: [{ kind: 'learn', say: 'x', examples: [{ en: 'A b c.' }] }] }, goodLesson];
  const l2 = await W.aiMakeReadingBackground({ passage: ART, grade: 'g4' });
  ok('⭐ 步數不夠 → 把「哪一步不合格」餵回去重出', l2.steps.length === 4 && /REJECTED by the checker/.test(calls[calls.length - 1].messages[0].content));
  aiQueue = [new Error('x'), new Error('x'), new Error('x')];
  ok('三次都失敗 → 明確報錯（不要給半成品）', await W.aiMakeReadingBackground({ passage: ART, grade: 'g4' }).then(() => false, e => /背景知識/.test(e.message)));
}

log.push('\n【1b】（v436）AI 混進簡體字／講得像學生已經讀過');
{
  const st = W.gnValidStep({ kind: 'learn', say: '人類怎样第一次登陆月球', examples: [{ en: 'A b c.', zh: '这个问题' }] });
  ok('⭐ 簡體字自動轉成正體（實測 AI 真的會混進來）', st.say === '人類怎樣第一次登陸月球' && st.examples[0].zh === '這個問題', JSON.stringify(st));
  const pk = W.gnValidStep({ kind: 'pick', q: '这是什么？', options: ['问题', '答案'], answer: 0, why: '这样才对' });
  ok('選一選的題目、選項、解說也一起轉', pk.q === '這是什麼？' && pk.options[0] === '問題' && pk.why === '這樣才對', JSON.stringify(pk));
  ok('⭐ 一對多的字（发＝發/髮、后＝後/后、干＝乾/幹）用「詞」對，不逐字亂轉',
     W.gnValidStep({ kind: 'learn', say: '头发 以后 干净', examples: [{ en: 'A b.' }] }).say === '頭髮 以後 乾淨');
  ok('詞庫沒收的一對多字就維持原樣（寧可留簡體，也不要轉成錯字）',
     W.gnValidStep({ kind: 'learn', say: '干活', examples: [{ en: 'A b.' }] }).say === '干活');
  aiQueue = [{ ...goodLesson, steps: goodLesson.steps.map((x, i) => i === 1 ? { ...x, why: '課文提到他們留下國旗' } : x) }, goodLesson];
  const l3 = await W.aiMakeReadingBackground({ passage: ART, grade: 'g4' });
  ok('⭐ 講「課文提到…」＝爆雷（學生還沒讀）→ 退回重出', !JSON.stringify(l3).includes('課文') &&
     /it mentioned 課文\/文章/.test(calls[calls.length - 1].messages[0].content), JSON.stringify(l3.steps[1]));
  ok('prompt 也明講不要寫課文／文章、只用繁體', /Never write 課文 or 文章/.test(W.RC_BG_SYS) && /Never use simplified characters/.test(W.RC_BG_SYS));
}

log.push('\n【2】圖片（Alan：「我可以自己找圖片放上去」）');
{
  const st = W.gnValidStep({ kind: 'learn', say: '南極很冷', img: ' https://x/a.jpg ', imgHint: ' ice ',
    examples: [{ en: 'It is cold.', hl: ['cold'], zh: '很冷' }] });
  ok('⭐ learn 步驟可以帶圖片網址（前後空白會清掉）', st.img === 'https://x/a.jpg' && st.imgHint === 'ice');
  const st2 = W.gnValidStep({ kind: 'learn', say: '南極很冷', examples: [{ en: 'It is cold.' }] });
  ok('沒放圖就不要有 img 這個欄位（資料乾淨）', !('img' in st2));
  ok('⭐ 學生端會把圖畫出來', /cur\.img && <img className="gnl-img"/.test(qm));
  ok('老師端可以上傳圖片（沿用單字卡那一套）', /function BgStepsEditor/.test(editor) && /window\.uploadFlashcardImage\(file\)/.test(editor));
  ok('AI 建議的關鍵字會顯示給老師看', /st\.imgHint \|\| '（你自己決定）'/.test(editor));
}

log.push('\n【3】建立出來的單元');
{
  const items = B({ title: 'Penguins', passage: 'p', mcq: [{ q: 'a', options: ['x', 'y'], answer: 0 }], sa: [], blocks: [], skillQs: [], background: goodLesson });
  ok('⭐ 背景知識變成第一個單元（lesson）', items[0].type === 'lesson' && items[0].order === 0 && /讀之前先知道/.test(items[0].title));
  ok('步驟有帶過去', items[0].steps.length === 4 && items[0].lead === '這篇在講南極的企鵝');
  ok('⭐ 其他單元都要「學完才解鎖」（requires）', items.slice(1).every(it => it.requires === items[0].id) && items.length >= 2);
  const noBg = B({ title: 'Penguins', passage: 'p', mcq: [{ q: 'a', options: ['x', 'y'], answer: 0 }], sa: [], blocks: [], skillQs: [] });
  ok('沒有背景知識就不要鎖（不然永遠打不開）', noBg.every(it => !it.requires) && noBg[0].type === 'quiz');
  const emptyBg = B({ title: 'P', passage: 'p', mcq: [{ q: 'a', options: ['x', 'y'], answer: 0 }], sa: [], blocks: [], skillQs: [], background: { steps: [] } });
  ok('背景知識被刪光也不鎖', emptyBg.every(it => !it.requires));
}

log.push('\n【4】老師端的流程');
{
  ok('⭐ 背景知識跟題目同時產生，而且各自成敗（v429 的教訓）',
     /Promise\.all\(\[[\s\S]{0,400}aiMakeReadingBackground[\s\S]{0,120}then\(v => \(\{ v \}\), e => \(\{ e \}\)\)/.test(editor));
  ok('背景失敗只提示、題目照樣可以建立', /背景知識這次沒有產生成功——題目都好了/.test(editor));
  ok('校稿頁有「🧠 背景知識」分頁，而且排第一', /k: 'bg', name: '🧠 背景知識'/.test(editor) && editor.indexOf("k: 'bg'") < editor.indexOf("k: 'mcq'"));
  ok('可以單獨重新產生', /const redoBg = async/.test(editor) && /🔄 重新產生/.test(editor));
  ok('建立時會把背景知識送出去', /background: \(res\.background && \(res\.background\.steps \|\| \[\]\)\.length\) \? res\.background : null/.test(editor));
  ok('app.jsx 有把 background 傳給 rcBuildItems', /rcBuildItems\(\{ title, passage, mcq, sa, blocks, skillQs, background \}\)/.test(app));
  ok('沿用 ✏️ 出文法的播放器（不另外寫一套）', /window\.gnValidStep/.test(editor) && /type: 'lesson'/.test(editor));
}

log.push('\n【5】（v437）分段閱讀也能先教背景知識');
{
  const gr = slice(editor, 'function GuidedReadingEditor(', 'function GrRegionModal(');
  ok('⭐ 分段閱讀的編輯器有「🧠 讀之前先知道」', /🧠 讀之前先知道/.test(gr) && /const runBg = async/.test(gr));
  ok('⭐（v437b）照片段落的文字要用 grSegMainText 拿——Alan 上傳 11 張圖卻一直說「文字不夠」，'
     + '就是因為只讀 seg.text（照片的文字在 OCR 結果裡）',
     /const bgPassage = async \(\)/.test(gr) && /await grSegMainText\(sg\)/.test(gr));
  ok('跟 AI 出題走同一條路（同一個函式）', (gr.match(/grSegMainText/g) || []).length >= 3);
  ok('文字真的不夠時才擋，而且說得出下一步', gr.indexOf('至少 40 個英文字') > 0 && gr.indexOf('點字查義 ✓') > 0);
  ok('⭐ 產生的是一個 lesson 單元、掛在 __side（存檔時一起建立）',
     /type: 'lesson', group: itemGroup/.test(gr) && /讀之前先知道/.test(gr));
  ok('⭐ 分段閱讀本身帶 requires（學完才解鎖）', /onChangeRequires\(id\)/.test(gr));
  ok('⭐ 跟「必須先練完單字卡」那個鎖可以並存（兩個不同欄位）',
     /requiresId/.test(gr) && /linkedFcRequired/.test(gr) && !/linkedFcRequired.*requires =/.test(gr));
  ok('AI 出題做的「閱讀技巧」單元不會蓋掉背景知識（以前是整個換掉）',
     /onSideItems\(\(sideItems \|\| \[\]\)\.filter\(x => x && x\.type === 'lesson'\)\.concat/.test(gr));
  ok('刪光步驟＝取消（不會留一個空的 lesson）', /\(next\.steps \|\| \[\]\)\.length \? putBg\(next\) : removeBg\(\)/.test(gr));
  ok('已經存過的那一份認得出來，不會又生一份重複的', /const bgSaved = \(!bgItem && requiresId\)/.test(gr));
  ok('⭐ 步驟編輯器是共用的（兩邊行為一樣、改一次就好）',
     /function BgStepsEditor/.test(editor) && (editor.match(/<BgStepsEditor/g) || []).length === 2);
  ok('⚠ 變數沒有跟既有的背景 OCR（bgBusy ref）撞名', /const \[bknBusy, setBknBusy\]/.test(gr) && /const bgBusy = React\.useRef\(false\)/.test(gr));
  ok('EditorModal 有把 sideItems／requires 傳下去', /sideItems=\{form\.__side \|\| \[\]\}/.test(editor) && /onChangeRequires=\{v => update\("requires"/.test(editor));
}

console.log(log.join('\n'));
console.log(`\n${fail === 0 ? '🎉 全部通過' : '⚠️ 有失敗'}：${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
