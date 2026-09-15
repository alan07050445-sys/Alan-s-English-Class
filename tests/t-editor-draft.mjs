/* t-editor-draft — v447 編輯到一半的東西不可以說不見就不見
 * Alan：「living in deserts 的分段不見了」
 * 查線上資料：G3 的 class/data 自 9/11 起沒被寫過，但 Storage 留著三組沒人認領的課文照片
 * （9/14 兩組各 11 張、9/15 一組 9 張）＝照片上傳好了、單元卻沒存進雲端。
 * 這支測「邊改邊留底」與「存檔失敗要一直講」。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const editor = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const app    = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const css    = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');
const fnEnd = (src, a) => { const i = src.indexOf(a); const j = src.indexOf('\n}\n', i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j + 2); };

/* 假的 localStorage（跟瀏覽器一樣：只吃字串、可以列舉） */
const store = new Map();
globalThis.localStorage = {
  get length() { return store.size; },
  key: (i) => [...store.keys()][i],
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { if (String(v).length > 400000) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
};
const src = ['const ED_DRAFT_PREFIX', 'const ED_DRAFT_KEEP_MS', 'const edDraftKey'].map(a => {
  const i = editor.indexOf(a); return editor.slice(i, editor.indexOf('\n', i) + 1);
}).join('');
const D = new Function(src +
  fnEnd(editor, 'function edDraftHasContent') + fnEnd(editor, 'function edDraftSave') + fnEnd(editor, 'function edDraftClear') +
  fnEnd(editor, 'function edDraftFind') + fnEnd(editor, 'function edDraftSummary') +
  '\nreturn { edDraftSave, edDraftClear, edDraftFind, edDraftSummary, edDraftKey };')();

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);

/* 他那一份的樣子：11 張課文照片、每段都有 OCR 文字 */
const desert = {
  id: 'r1789373467901nj59', type: 'guided-reading', title: 'Living in the desert', group: '',
  grSegments: Array.from({ length: 11 }, (_, i) => ({ i, photoUrl: 'https://…/' + i + '.jpg', text: 'Deserts are dry. '.repeat(20), questions: [] })),
  grFinal: [{ q: 'Where do camels live?', options: ['desert', 'sea'], answer: 0 }],
};

console.log('\n【1】邊改邊留底');
store.clear();
D.edDraftSave('2026F-W01', desert);
eq('留了一份', store.size, 1);
ok('key 帶著週次與單元 id', [...store.keys()][0] === 'alan-edraft:2026F-W01:r1789373467901nj59');
const back = JSON.parse(store.get([...store.keys()][0]));
eq('11 段課文都留著', back.form.grSegments.length, 11);
ok('照片網址也留著', /\.jpg$/.test(back.form.grSegments[0].photoUrl));
ok('有記時間', back.t > 0);
D.edDraftSave('2026F-W01', { ...desert, title: 'Living in the desert v2' });
eq('同一個單元只會有一份（覆蓋不是堆積）', store.size, 1);
ok('留的是最新的', JSON.parse(store.get([...store.keys()][0])).form.title === 'Living in the desert v2');
ok('沒有 id 的不留', (() => { const n = store.size; D.edDraftSave('w', { type: 'quiz' }); return store.size === n; })());
ok('⭐ 空白的新單元不留（不然下次會被問一個空的草稿）', (() => { const n = store.size; D.edDraftSave('2026F-W01', { id: 'blank', type: 'guided-reading', title: '', grSegments: [] }); return store.size === n; })());
ok('只打了標題就會留', (() => { D.edDraftSave('2026F-W01', { id: 'justtitle', type: 'quiz', title: 'Unit 9' }); const had = store.has('alan-edraft:2026F-W01:justtitle'); D.edDraftClear('2026F-W01', 'justtitle'); return had; })());
ok('⭐ localStorage 滿了也不能炸掉編輯器', (() => {
  try { D.edDraftSave('w', { id: 'big', type: 'quiz', blob: 'x'.repeat(500000) }); return true; } catch (e) { return false; }
})());

console.log('\n【2】下次打開問他要不要接回來');
store.clear();
D.edDraftSave('2026F-W01', desert);
const found = D.edDraftFind('2026F-W01', [], 'guided-reading');
eq('找得到', found.length, 1);
eq('⭐ 就是他那一份', found[0].form.title, 'Living in the desert');
eq('會講「11 段課文」', D.edDraftSummary(found[0].form).indexOf('11 段課文'), 0);
eq('⭐ 已經存進這一週了就不要再問', D.edDraftFind('2026F-W01', ['r1789373467901nj59'], 'guided-reading').length, 0);
ok('存過的草稿順手清掉', store.size === 0);
D.edDraftSave('2026F-W01', desert);
eq('別的週次不要拿出來問', D.edDraftFind('2026F-W02', [], 'guided-reading').length, 0);
eq('別的題型不要拿出來問', D.edDraftFind('2026F-W01', [], 'quiz').length, 0);
eq('不指定題型就全部給', D.edDraftFind('2026F-W01', [], null).length, 1);
D.edDraftClear('2026F-W01', desert.id);
eq('清掉就沒了', store.size, 0);

console.log('\n【3】太舊的草稿自己過期');
store.clear();
store.set('alan-edraft:2026F-W01:old1', JSON.stringify({ t: Date.now() - 20 * 24 * 3600 * 1000, weekId: '2026F-W01', form: { id: 'old1', type: 'quiz' } }));
store.set('alan-edraft:2026F-W01:new1', JSON.stringify({ t: Date.now(), weekId: '2026F-W01', form: { id: 'new1', type: 'quiz' } }));
const f2 = D.edDraftFind('2026F-W01', [], 'quiz');
eq('只剩沒過期的', f2.length, 1);
eq('過期的順手刪掉', store.size, 1);
store.set('alan-edraft:x:bad', '{壞掉的 JSON');
ok('壞掉的草稿不會讓整個功能爆掉', D.edDraftFind('2026F-W01', [], 'quiz').length === 1);

console.log('\n【4】畫面上真的接得回來');
ok('編輯器一開就找草稿', /edDraftFind\(weekId, ids, draft\.type\)/.test(editor));
ok('⭐ 不會把「正在編輯的這一份」當成草稿問', /filter\(d => d\.form\.id !== draft\.id\)/.test(editor));
ok('邊改邊存（700ms 才寫一次）', /setTimeout\(\(\) => edDraftSave\(weekId, form\), 700\)/.test(editor));
ok('存出去就清掉草稿', /edDraftClear\(weekId, form\.id\);\s*\/\/ v447/.test(editor));
ok('有「接回來繼續改」的按鈕', /接回來繼續改/.test(editor) && /ed-recover/.test(editor));
ok('接回來要當成新單元存（原本那個從來沒進雲端）', /setForm\(\{ \.\.\.recover\.form, _isNew: true \}\)/.test(editor));
ok('CSS 有樣式', /\.ed-recover/.test(css));

console.log('\n【5】存檔失敗不可以假裝成功');
ok('⭐ 失敗會掛在畫面上（不是只跳一次 alert）', /save-fail-bar/.test(app) && /剛剛那次變更沒有存進雲端/.test(app));
ok('可以「再存一次」', /再存一次/.test(app) && /saveWeeksSafe\(w\)/.test(app));
ok('⭐ 失敗的內容先寫進 localStorage（重新整理也還在）', /localStorage\.setItem\('alan-unsaved-weeks'/.test(app));
ok('成功之後要把失敗狀態與備份清掉', /setSaveFail\(null\)/.test(app) && /removeItem\('alan-unsaved-weeks'\)/.test(app));
ok('CSS 有樣式', /\.save-fail-bar/.test(css));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
