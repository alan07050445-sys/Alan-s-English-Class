import fs from 'fs';
const stub = new Proxy(function(){}, { get:()=>stub, apply:()=>stub, construct:()=>stub });
const W = {};
new Function('window','document','firebase','localStorage', fs.readFileSync(new URL('../data.js', import.meta.url),'utf8'))
  (W, { documentElement:{ classList:{ toggle(){} } } }, stub, { getItem:()=>null, setItem(){}, removeItem(){} });

let ok=0,bad=0; const t=(m,c)=>{ if(c){ok++;console.log('  ✅ '+m);} else {bad++;console.log('  ❌ '+m);} };
const D=(y,m,d,h=14)=>new Date(y,m-1,d,h,0);
const wd=['日','一','二','三','四','五','六'];
const say=(iso)=>{ const [y,m,d]=iso.split('-').map(Number); const dt=new Date(y,m-1,d); return `${iso}(週${wd[dt.getDay()]})`; };

console.log('\n📌 設定期限 — 釘住「今天是 2026-10-21（週三）」，不然每天跑結果都不一樣');
const now = D(2026,10,21);
[['today','今天'],['tomorrow','明天'],['+3d','三天後'],
 ['this-fri','這週五'],['this-wed','這週三'],['next-mon','下週一'],['next-wed','下週三'],
 ['2026-11-05','講明確日期']].forEach(([h,zh])=>{
  console.log(`  · ${zh.padEnd(6)} → ${say(W.askDueDate(h, now))}`);
});
t('⭐ 今天＝10/21', W.askDueDate('today',now)==='2026-10-21');
t('⭐ 明天＝10/22', W.askDueDate('tomorrow',now)==='2026-10-22');
t('⭐⭐「這週三」當今天就是週三時＝下一個週三（10/28），不是今天也不是上週',
  W.askDueDate('this-wed',now)==='2026-10-28');
t('⭐ 這週五＝10/23', W.askDueDate('this-fri',now)==='2026-10-23');
t('⭐ 下週一＝10/26', W.askDueDate('next-mon',now)==='2026-10-26');
t('⭐ 下週三＝10/28（下一個日曆週的週三）', W.askDueDate('next-wed',now)==='2026-10-28');
t('⭐⭐ 那個星期幾這週已經過了的話，「這週X」與「下週X」會是同一天', (()=>{
   /* 今天週三：「這週一」跟「下週一」都是 10/26——中文本來就這樣講。 */
   return W.askDueDate('this-mon',now)===W.askDueDate('next-mon',now); })());
t('⭐⭐ 還沒到的那一天，兩者要差一週', (()=>{
   /* 今天週三：「這週五」10/23、「下週五」10/30。 */
   return W.askDueDate('this-fri',now)==='2026-10-23' && W.askDueDate('next-fri',now)==='2026-10-30'; })());
t('⭐⭐ 用講的跟用按的預設要同一天（QuickSetModal 是「這個週日」）', (()=>{
   const d=new Date(now); d.setHours(0,0,0,0);
   d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
   const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
   return W.askDueDefault(now)===iso; })());
t('   週日當天講「預設」＝下一個週日，不是今天', W.askDueDefault(D(2026,10,25))==='2026-11-01');
t('   +3d＝10/24', W.askDueDate('+3d',now)==='2026-10-24');
t('   明確日期原樣收下', W.askDueDate('2026-11-05',now)==='2026-11-05');
t('⭐ 沒講＝沒有期限（空字串，畫面才知道要用預設）', W.askDueDate('',now)==='');
t('⭐ none＝不要當作業', W.askDueDate('none',now)==='');
t('⭐ 亂填的詞不會變成日期', W.askDueDate('someday',now)==='' && W.askDueDate('下禮拜',now)==='');
t('⭐ 預設（沒特別講）＝下一個週日 10/25', W.askDueDefault(now)==='2026-10-25');
t('⚠ 跨月也要對：10/30 說「下週一」＝11/02', W.askDueDate('next-mon', D(2026,10,30))==='2026-11-02');
t('⚠ 跨年也要對：12/30 說「下週五」', (()=>{ const r=W.askDueDate('next-fri', D(2026,12,30)); return /^202[67]-/.test(r) && r>'2026-12-30'; })());
t('⚠ 晚上 11 點講「明天」不可以跳成後天（不能用 UTC）',
  W.askDueDate('tomorrow', D(2026,10,21,23))==='2026-10-22');

console.log('\n📌 路由層：plan → 真的寫進 week.homework');
/* 照 app.jsx 那段邏輯重跑一次 */
const runAssign = (plan, items, nowD) => {
  const due = plan.due==='none' ? '' : (W.askDueDate(plan.due, nowD) || W.askDueDefault(nowD) || '');
  const hw = {};
  items.forEach(id => { if (due) hw[id] = { dueDate: due }; });
  return { due, hw, cleared: !due };
};
const items=['i1','i2','i3'];
const r1=runAssign({due:'next-wed'},items,now);
t('⭐ 整組三個單元都設到同一個期限', Object.keys(r1.hw).length===3 && r1.hw.i1.dueDate==='2026-10-28');
const r2=runAssign({due:'none'},items,now);
t('⭐「不要當作業」＝全部清掉，不是設一個日期', r2.cleared && Object.keys(r2.hw).length===0);
const r3=runAssign({due:''},items,now);
t('⭐ 沒講日期＝用預設的下週日', r3.hw.i1.dueDate==='2026-10-25');

console.log('\n📢 發公告 — 驗證層');
const V=o=>W.askVerify(o,{roster:[{name:'Eric',email:'e@t.com'}]});
const cases=[
  ['全班', {intent:'notify',text:'這週三停課一次',target:'all'}],
  ['指定年級', {intent:'notify',text:'G4 本週考試',target:'grade',gradeId:'g4'}],
  ['沒講年級', {intent:'notify',text:'x',target:'grade'}],
  ['亂填對象', {intent:'notify',text:'x',target:'everyone'}],
  ['亂填年級', {intent:'notify',text:'x',target:'grade',gradeId:'g9'}],
];
cases.forEach(([zh,o])=>{ const r=V(o); console.log(`  · ${zh.padEnd(6)} → intent=${r.intent} target=${r.target} grade=${r.gradeId||'—'} ${r.ask?'｜問：'+r.ask:''}`); });
t('⭐ 全班公告原文照收', V(cases[0][1]).text==='這週三停課一次');
t('⭐ 指定年級過得了', (()=>{const r=V(cases[1][1]); return r.intent==='notify'&&r.gradeId==='g4';})());
t('⭐⭐ 說要發給某年級卻沒講哪一個 → 退回去問，不會亂發', V(cases[2][1]).intent==='unknown');
t('⭐ 亂填的對象退回「全班」而不是炸掉', V(cases[3][1]).target==='all');
t('⭐⭐ 亂填的年級不會被當成真的年級', (()=>{const r=V(cases[4][1]); return r.gradeId===''&&r.intent==='unknown';})());
t('⚠ 公告內容是空的就不可以放行', V({intent:'notify',text:''}).intent==='unknown');
t('⭐⭐ 長度有上限（避免貼一整篇文章進 LINE）', V({intent:'notify',text:'字'.repeat(20000)}).text.length<=12000);

console.log(bad?`\n❌ ${bad} 失敗 / ${ok} 通過`:`\n🎉 全部通過：${ok}`);
process.exit(bad?1:0);
