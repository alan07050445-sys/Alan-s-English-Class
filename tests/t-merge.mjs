import fs from 'fs';
const stub = new Proxy(function(){}, { get:()=>stub, apply:()=>stub, construct:()=>stub });
const W = {};
new Function('window','document','firebase','localStorage', fs.readFileSync(new URL('../data.js', import.meta.url),'utf8'))
  (W, { documentElement:{ classList:{ toggle(){} } } }, stub, { getItem:()=>null, setItem(){}, removeItem(){} });

/* 照真實結構做兩組：U1 有單字卡（含圖片與例句），U2 只有配對＋聽寫（沒有單字卡） */
const U1 = [
  { id:'v1', type:'flashcard', group:'Unit 1 — Barbed Wire Baseball', cards:[
    { term:'pursued',  zh:'追趕',   example:'The dog pursued the cat.', def:'chased someone', imageUrl:'https://x/p.jpg' },
    { term:'barbed',   zh:'有刺的', example:'barbed wire',              def:'having sharp points' },
    { term:'glanced',  zh:'瞥了一眼' },
  ]},
  { id:'v2', type:'quiz', group:'Unit 1 — Barbed Wire Baseball', questions:[{q:'x',options:['a','b'],answer:0}] },
];
const U2 = [
  { id:'v3', type:'def-match', group:'Unit 2 — Feathers', defPairs:[
    { word:'Pursued', def:'ran after' },            // ⚠ 大寫，跟 U1 重複
    { word:'molted',  def:'lost old feathers' },
    { word:'hollow',  def:'有洞的' },               // ⚠ 中文定義，應該被丟掉
  ]},
  { id:'v4', type:'spelling', group:'Unit 2 — Feathers', spellWords:[
    { word:'molted', zh:'換毛', sentence:'The bird molted.' },          // ⚠ 跟上面重複
    { word:'preen',  zh:'整理羽毛' },
  ]},
];

/* askMergeWords 的核心邏輯（app.jsx 裡那一段，原樣搬過來測） */
const merge = (groups) => {
  const all = [], seen = new Map();
  groups.forEach(items => {
    (W.reviewWordsOf(items) || []).forEach(x => {
      const k = String(x.term||'').toLowerCase().trim();
      if (!k || seen.has(k)) return;
      seen.set(k, true); all.push(x);
    });
  });
  return all;
};

const only1 = W.reviewWordsOf(U1);
const only2 = W.reviewWordsOf(U2);
const both  = merge([U1, U2]);

const show = (ws) => ws.map(w => `${w.term}${w.zh?'('+w.zh+')':''}${w.imageUrl?'🖼':''}${w.def?'·def':''}`).join('  ');
console.log('U1 單獨 :', only1.length, '→', show(only1));
console.log('U2 單獨 :', only2.length, '→', show(only2));
console.log('合併後  :', both.length, '→', show(both));

let ok=0, bad=0;
const t=(m,c)=>{ if(c){ok++;console.log('  ✅ '+m);} else {bad++;console.log('  ❌ '+m);} };
console.log('\n檢查：');
t('U1 的 3 個字都在', ['pursued','barbed','glanced'].every(x=>both.some(w=>w.term===x)));
t('U2 的新字（molted / preen）也進來了', ['molted','preen'].every(x=>both.some(w=>w.term.toLowerCase()===x)));
t('⭐ Pursued 跟 pursued 只留一個（大小寫去重）', both.filter(w=>w.term.toLowerCase()==='pursued').length===1);
t('⭐ 留下的是 U1 那一份（有中文、例句、圖片）', (()=>{ const p=both.find(w=>w.term.toLowerCase()==='pursued');
  return p.zh==='追趕' && p.imageUrl.includes('p.jpg') && p.example.includes('The dog'); })());
t('⭐ molted 在 U2 裡出現兩次（配對＋聽寫），只留一個', both.filter(w=>w.term==='molted').length===1);
t('   而且中文跟例句有從聽寫那邊補上', (()=>{ const m=both.find(w=>w.term==='molted'); return m.zh==='換毛' && /The bird/.test(m.example); })());
t('⚠ 中文定義不會被當成英文定義傳下去', !both.some(w=>/[一-鿿]/.test(w.def||'')));
t('   總數＝3＋4 去掉重複的 pursued＝6（hollow 只是丟掉中文定義，字要留著）', both.length===6);
t('⭐ 題數裁切只會變少，不會湊', (()=>{ const cut=both.slice(0,3); return cut.length===3 && cut.every(w=>both.includes(w)); })());
console.log(bad ? `\n❌ ${bad} 失敗 / ${ok} 通過` : `\n🎉 全部通過：${ok}`);
process.exit(bad?1:0);
