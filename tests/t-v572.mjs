// v572：單一單元換類別、考卷字體放大
import fs from 'fs'; import vm from 'vm';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const qm = fs.readFileSync(new URL('../components-quiz-mode.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles-quiz-mode.css', import.meta.url), 'utf8');
let fail = 0; const ok = (m, c) => { console.log(c ? '  ✅' : '  ❌', m); if (!c) fail++; };
const a = data.indexOf('function moveGroupCatInWeek'), b = data.indexOf('Object.assign(window, { askBestGroup');
const sb = {}; vm.createContext(sb); vm.runInContext(data.slice(a, b) + '\nthis.mv = moveGroupCatInWeek;', sb);
const wk = () => ({ items: { vocab: [{ id: 'a', group: 'G' }, { id: 'b', group: 'G' }], ltvocab: [] }, groupRes: { 'vocab::G': { x: 1 } } });
let w = wk(); sb.mv(w, 'vocab', ['a'], 'ltvocab', 'G');
ok('單一單元搬過去，其他留著', w.items.ltvocab.length === 1 && w.items.vocab.length === 1 && w.items.vocab[0].id === 'b');
ok('原類別還有同組 → 參考資料兩邊都有', !!w.groupRes['vocab::G'] && !!w.groupRes['ltvocab::G']);
w = wk(); sb.mv(w, 'vocab', ['a', 'b'], 'ltvocab', 'G');
ok('整組搬 → 參考資料換 key', !w.groupRes['vocab::G'] && !!w.groupRes['ltvocab::G']);
ok('單元列有 🔀 按鈕與類別選單', /'item:' \+ item\.id/.test(qm) && /onMoveGroupCat\(cat\.id, String\(item\.group/.test(qm));
ok('考卷內文字放大（passage ≥ 20px、題目 ≥ 18px）', /\.ex-passage \{[^}]*font-size: 2\d/.test(css) && /\.ex-part-h b \{[^}]*font-size: 19px/.test(css));
process.exit(fail ? 1 : 0);
