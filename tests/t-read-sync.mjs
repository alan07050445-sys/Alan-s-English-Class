/* t-read-sync — v453 分段閱讀：螢光要跟著聲音、年份要唸得出來、只重出一段
 * Alan：① AI 跑太慢、重新標框又要整份重跑 ② 螢光完全沒跟著語速 ③ 螢光要像螢光筆不是框
 *       ④ 數字（年份）會少唸，但不要跟段落編號搞混 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data   = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const qm     = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const editor = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const css    = fs.readFileSync(new URL('styles-quiz-mode.css', ROOT), 'utf8');
const slice = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('找不到 ' + a); return src.slice(i, j); };
const fnEnd = (src, a) => { const i = src.indexOf(a); const j = src.indexOf('\n}\n', i); return src.slice(i, j + 2); };

const W = new Function(slice(data, 'const _ONES', 'function speakSentences') +
  fnEnd(data, 'function grReadWordsFrom') + fnEnd(data, 'function grWordsText') +
  '\nreturn { grSayNumber, grSpeechChunks, grWordsBefore, grReadWordsFrom, grWordsText };')();

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  ✅ ' + n); } else { fail++; console.log('  ❌ ' + n); } };
const eq = (n, a, b) => ok(n + (a === b ? '' : ` — 得到 ${JSON.stringify(a)}，應該是 ${JSON.stringify(b)}`), a === b);

console.log('\n【1】數字要唸得出來（Alan：年份會少唸）');
eq('1799 → 年份唸法', W.grSayNumber('1799'), 'seventeen ninety-nine');
eq('1805 → eighteen oh five', W.grSayNumber('1805'), 'eighteen oh five');
eq('1900 → nineteen hundred', W.grSayNumber('1900'), 'nineteen hundred');
eq('2026 → twenty twenty-six', W.grSayNumber('2026'), 'twenty twenty-six');
eq('⭐ 長串數字一位一位唸（整串被跳過是老問題）', W.grSayNumber('12345678'), 'one two three four five six seven eight');
eq('⭐ 段落編號 1 不動它（別跟年份搞混）', W.grSayNumber('1'), '1');
eq('兩位數不動', W.grSayNumber('25'), '25');
eq('三位數不動（交給語音引擎）', W.grSayNumber('300'), '300');
eq('帶標點也處理得掉', W.grSayNumber('1799,'), 'seventeen ninety-nine,');
eq('純文字不動', W.grSayNumber('Mary'), 'Mary');

console.log('\n【2】朗讀分塊要記得「這一塊是第幾個字開始」');
const TXT = '1 In 1799, Mary Anning was born in Lyme Regis, a small English port.';
const ch = W.grSpeechChunks(TXT);
ok('切成好幾塊', ch.length >= 2);
eq('第一塊從第 0 個字開始', ch[0].w0, 0);
ok('每一塊都有字數', ch.every(c => c.wn > 0));
eq('⭐ 累加起來＝整段的字數', ch.reduce((n, c) => n + c.wn, 0), (TXT.match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length);
ok('⭐ 下一塊的起點＝上一塊的起點＋字數（中間不會漏字）',
  ch.every((c, i) => i === 0 || c.w0 === ch[i - 1].w0 + ch[i - 1].wn));
ok('要唸出來的那一份把年份換掉了', ch.some(c => /seventeen ninety-nine/.test(c.say)));
ok('⭐ 換完之後「字數」沒有變（不然高亮會歪掉）',
  ch.every(c => (c.say.match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length >= c.wn));

console.log('\n【3】字元位置 → 第幾個字');
eq('開頭是第 0 個字', W.grWordsBefore('Mary Anning was born', 0), 0);
eq('第二個字的位置', W.grWordsBefore('Mary Anning was born', 5), 1);
eq('中間也算得出來', W.grWordsBefore('Mary Anning was born', 12), 2);
ok('超過長度不會爆', W.grWordsBefore('Mary', 999) === 1);

console.log('\n【4】照片段落：朗讀文字與逐字高亮用同一份字清單');
const mk = (t, i) => ({ t, r: t, x: 0.1, y: 0.1 + i * 0.01, w: 0.05, h: 0.01 });
const d = { words: ['1', 'In', '1799,', 'Mary', 'coast-', 'line', 'was', 'here.'].map(mk) };
const words = W.grReadWordsFrom(d, 0, 1, null);
ok('⭐ 行尾斷詞接回成一個字（coastline）', words.some(w => w.t === 'coastline'));
ok('接回來之後就沒有半截的字了', !words.some(w => /-$/.test(w.t)));
const text = W.grWordsText(words);
eq('⭐ 朗讀文字的字數＝高亮框的數量（對得上才不會歪）',
  (text.match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g) || []).length, words.length);
ok('文字就是把字清單接起來', /coastline/.test(text));
ok('孤立的頁碼被濾掉了（1 前後都沒有字時）', W.grReadWordsFrom({ words: [mk('7', 0)] }, 0, 1, null).length === 0);

console.log('\n【5】播放器與編輯器接上了');
ok('⭐ 朗讀改用「第幾個字」回報', /onWord: \(i2\) => setActiveWord\(i2\)/.test(qm));
ok('speakSentences 收得到 onWord', /onDone, onProgress, onWord \} = \{\}/.test(data));
ok('onboundary 換算成字index', /reportWord\(\(c\.w0 \|\| 0\) \+ Math\.min\(\(c\.wn \|\| 1\) - 1, grWordsBefore/.test(data));
ok('iOS 沒有 onboundary 時也會逐字推進', /Math\.floor\(frac \* \(c\.wn \|\| 1\)\)/.test(data));
ok('⭐ 照片的朗讀文字改用字清單組出來', /window\.grWordsText\(ws\)/.test(qm));
ok('⭐ 每一段都有「只重出這段」', /runAiQuestions\(si\)/.test(editor) && /🤖 重出這段/.test(editor));
ok('只重出一段時不動綜合題與閱讀技巧', /finalMcq: one \? 0 : aiFinM/.test(editor) && /if \(!one && r\.blocks\.length/.test(editor));
ok('只重出一段時只改那一段', /if \(one && i !== onlySeg\) return sg;/.test(editor));
ok('出題平行度拉高（11 段少等一輪）', /\}, 8\);   \/\/ v453/.test(data));

console.log('\n【6】螢光筆的樣子（不要一個一個框）');
ok('⭐ 文字段落改成螢光筆漸層', /\.gr-hw-now \{[^}]*linear-gradient/.test(css.replace(/\n/g, ' ')));
ok('文字段落不再有外框陰影', /\.gr-hw-now \{[^}]*box-shadow: none/.test(css.replace(/\n/g, ' ')));
ok('⭐ 照片上的高亮改成螢光筆（multiply 疊色、沒有框）',
  /\.grd-hlbox \{[^}]*mix-blend-mode: multiply/.test(css.replace(/\n/g, ' ')) &&
  /\.grd-hlbox \{[^}]*border: 0/.test(css.replace(/\n/g, ' ')));

console.log(fail ? `\n❌ ${fail} failed, ${pass} passed` : `\n🎉 全部通過：${pass} passed, 0 failed`);
process.exit(fail ? 1 : 0);
