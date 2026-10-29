// v626 聊天室找組名：不必完全一樣（詞對上就算）、可跨週、AI 拿得到真實組名清單
import fs from 'fs';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {};
new Function('window', 'document', 'firebase', 'localStorage', 'fetch', data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem() {}, removeItem() {} }, fetch);
const g = (group, id) => ({ id, group, title: group + ' 單字卡' });
const weeks = {
  w1: { label: 'Week 1', items: { vocab: [g('Reaching For The Moon : Buzz Aldrin的單字！', 'a'), g('Rare Treasure : Mary Anning的單字！', 'b')], word: [g('G4 Word Study — VCe Words', 'c')] } },
  w2: { label: 'Week 2', items: { vocab: [g('Barbed Wire Baseball : Zeni的單字', 'd')] } },
};
const find = (n, cur) => W.askBestGroupAnyWeek(weeks, ['w1', 'w2'], cur || 'w1', n, (t) => String(t || '').toLowerCase());
console.log('\n【不必一樣】');
ok('完全一樣仍最優先', find('Rare Treasure : Mary Anning的單字！').items[0].id === 'b');
ok('只講人名：Mary Anning', find('Mary Anning').items[0].id === 'b');
ok('詞順序反過來：Anning Mary', find('Anning Mary').items[0].id === 'b');
ok('夾雜中文：Mary Anning 單字', find('Mary Anning 單字').items[0].id === 'b');
ok('VCe Words（跳過 G4 Word Study）', find('VCe Words').items[0].id === 'c');
ok('完全不相干 → null', find('Volcano Island') === null);
console.log('\n【跨週】');
ok('這週沒有就找別週，並說明在哪一週', (() => { const f = find('Barbed Wire Baseball', 'w1'); return f && f.weekId === 'w2' && f.items[0].id === 'd'; })());
ok('這週有的優先用這週的', find('Mary Anning', 'w2').weekId === 'w1' ? true : false);
console.log('\n【給 AI 的清單】');
const cat = W.askCatalog(weeks, ['w1', 'w2'], 'w2');
ok('現在這週排第一並標明', cat.split('\n')[0].startsWith('【他現在看的這一週】第 2 週：Barbed'));
ok('含別週的組名', cat.includes('Rare Treasure : Mary Anning的單字！') && cat.includes('第 1 週'));
ok('數量有上限', W.askCatalog(weeks, ['w1', 'w2'], 'w1', 2).split('｜').length + 0 <= 3);
console.log(fail ? `\n❌ t-v626：${pass} 過 / ${fail} 失敗` : `\n✅ t-v626：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
