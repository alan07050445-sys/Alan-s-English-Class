// t-css-sane — 每一份 CSS 都要能被瀏覽器完整解析
//
// 🔴 v549 我在 styles-fx.css 寫了一段說明，裡面為了舉例引用了一個完整的 CSS 註解，
//   裡面那個「結束符號」把整段註解提早結束，後面的說明文字變成亂碼
//   → 瀏覽器默默丟掉之後所有規則（一份幾千行的檔案只解析出 7 條）。
//   沒有任何錯誤訊息；jsxcheck 不看 CSS；其他測試都是「在原始碼裡找字串」所以全部通過
//   ——只有真的在瀏覽器裡開起來才發現。
//
// 另一種同類：v459 把註解插在選擇器與大括號之間，吃掉上一條規則（Alan 的「蝙蝠多一格」）。
// ⭐ 這支做兩件**不需要瀏覽器**就判得出來的事：
//    ① 註解區塊結束之後不可以還有落單的結束符號，也不可以有沒關的開始符號
//    ② 去掉註解之後大括號要配對，而且「註解卡在選擇器中間」要是 0
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.css'));
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; } else { fail++; console.log('  ❌ ' + m); } };

files.forEach(f => {
  const src = fs.readFileSync(new URL(f, ROOT), 'utf8');
  // 照瀏覽器的規則：註解從開始符號開到「第一個」結束符號
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '');
  ok(`${f}：註解結束之後還有落單的 */（註解裡引用了 */ 把它提早結束了）`, stripped.indexOf('*/') < 0);
  ok(`${f}：有沒關起來的 /*`, stripped.indexOf('/*') < 0);
  // 大括號配對（字串先拿掉，保險）
  const noStr = stripped.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  let depth = 0, neg = false;
  for (const ch of noStr) { if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth < 0) neg = true; } }
  ok(`${f}：大括號不配對（depth=${depth}）`, depth === 0 && !neg);
  // 註解卡在選擇器中間：註解前面是選擇器文字、後面接的也是選擇器文字
  const bad = [];
  for (const m of src.matchAll(/\/\*[\s\S]*?\*\//g)) {
    let i = m.index - 1; while (i >= 0 && /\s/.test(src[i])) i--;
    const prev = i >= 0 ? src[i] : '{';
    if ('{};,'.includes(prev) || (i >= 1 && src.slice(i - 1, i + 1) === '*/')) continue;
    let j = m.index + m[0].length; while (j < src.length && /\s/.test(src[j])) j++;
    if (!'{,'.includes(src[j] || '')) bad.push(src.slice(0, m.index).split('\n').length);
  }
  ok(`${f}：註解卡在選擇器中間（行 ${bad.join(',')}）`, bad.length === 0);
});
// 這一支本身要抓得到那個壞法——造一份壞的給它
const evil = '.a { color: red; }\n/* 說明：像這樣 /* 巢狀 */ 就爛了 */\n.b { color: blue; }';
ok('（自我檢查）巢狀 */ 這種壞法真的抓得到', evil.replace(/\/\*[\s\S]*?\*\//g, '').indexOf('*/') >= 0);

console.log(fail ? `\n❌ t-css-sane：${pass} 過 / ${fail} 失敗` : `\n✅ t-css-sane：${pass} 過 / 0 失敗（${files.length} 份 CSS）`);
process.exit(fail ? 1 : 0);
