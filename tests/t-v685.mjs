/* t-v685 — 小助手「一句話處理兌換，先問我再執行」
 * 把 app.jsx 裡 redeem 那一段原文切出來、用假的 confirm / addStarEntry / setRedeemStatus 真的跑一遍。
 * 重點：① 取消就什麼都不改 ② 先扣點再標已給 ③ 指到多筆又沒說「全部」不猜 ④ 沒有待兌換不憑空扣 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {}; new Function('window', 'document', 'firebase', 'localStorage',
  data)(W, { documentElement: { classList: { toggle: () => {} } } }, stub,
  { getItem: () => null, setItem: () => {}, removeItem: () => {} });

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】router／verify');
ok('ASK_JOBS 有 redeem、router 允許 redeem', /redeem:\s+\{ zh: '處理兌換/.test(data) && /stars redeem roster/.test(data));
const ver = (o) => W.askVerify(o, { categories: [], roster: [{ name: 'Nick', email: 'g4nick@t' }] });
ok('askVerify 保留 redeem、item、all', (() => { const p = ver({ intent: 'redeem', student: 'Nick', item: '魔擦筆', all: true }); return p.intent === 'redeem' && p.item === '魔擦筆' && p.all === true; })());
ok('all 只有 true 才算（字串 "yes" 不算）', ver({ intent: 'redeem', all: 'yes' }).all === false);
ok('說了不存在的學生 → 不處理、改成問', ver({ intent: 'redeem', student: 'Zed' }).intent === 'unknown');

console.log('\n【2】實際跑 redeem 那一段');
const i = app.indexOf("} else if (plan.intent === 'redeem') {");
const j = app.indexOf("} else if (plan.intent === 'roster') {");
const body = app.slice(i + "} else if (plan.intent === 'redeem') {".length, j);
const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
const make = () => {
  const log = { star: [], status: [], toast: [], confirm: [], miss: 0, closed: 0 };
  const win = {
    confirm: (m) => { log.confirm.push(m); return log.answer !== false; },
    addStarEntry: async (e, o) => { if (log.failStar) throw new Error('x'); log.star.push([e, o.amount, o.note]); },
    setRedeemStatus: async (id, st) => { if (log.failStatus) throw new Error('y'); log.status.push([id, st]); },
    askFindStudent: (n, roster) => { const r = roster.find(x => x.name === n); return r ? { email: r.email, name: r.name } : null; },
    askLoadQueryData: async () => ({ students: [], gradeData: {}, stars: {}, redeems: [] }),
    askQueryAnswer: (p) => ({ head: p.student === 'Nick' ? 'Nick 現在有 3,500🌟' : 'Eric 現在有 100🌟' }),
    dashCurrentWeekId: () => null,
  };
  const reqs = [
    { id: 'r1', email: 'g4nick@t', name: 'Nick', itemName: 'Pilot 魔擦筆', cost: 1200, status: 'pending' },
    { id: 'r2', email: 'g4eric@t', name: 'Eric', itemName: '皮卡丘娃娃', cost: 3000, status: 'pending' },
  ];
  const roster = [{ name: 'Nick', email: 'g4nick@t' }, { name: 'Eric', email: 'g4eric@t' }];
  const run = async (plan) => {
    const fn = new AsyncFn('plan', 'window', 'redeemReqs', 'askRoster', 'showToast', 'askStudentMiss', 'setAskOpen',
      `const f = () => {${body.replace(/\n    \} else if[\s\S]*$/, '')}\n}; f(); await new Promise(r => setTimeout(r, 30));`);
    await fn(plan, win, reqs, roster, (t) => log.toast.push(t), () => { log.miss++; }, () => { log.closed++; });
  };
  return { log, run, win, reqs };
};

{ const t = make(); await t.run({ intent: 'redeem', student: 'Nick', item: '', all: false, email: 'g4nick@t' });
  ok('指定 Nick：只處理他那一筆（魔擦筆 −1200），Eric 的不動', t.log.star.length === 1 && t.log.star[0][0] === 'g4nick@t' && t.log.star[0][1] === -1200);
  ok('扣點備註是「兌換：商品名」（吉祥物帽子要靠它認）', t.log.star[0][2] === '兌換：Pilot 魔擦筆');
  ok('同一筆標成 done', t.log.status.length === 1 && t.log.status[0][0] === 'r1' && t.log.status[0][1] === 'done');
  ok('⭐ 動手之前一定先問過（confirm 被呼叫、內容寫出誰／什麼／扣多少／他現在有多少）',
     t.log.confirm.length === 1 && /Nick/.test(t.log.confirm[0]) && /魔擦筆/.test(t.log.confirm[0]) && /1,200/.test(t.log.confirm[0]) && /3,500/.test(t.log.confirm[0]));
  ok('面板會收起來', t.log.closed === 1); }

{ const t = make(); t.log.answer = false; await t.run({ intent: 'redeem', all: true });
  ok('⭐⭐ 按取消 → 什麼都沒扣、什麼都沒標', t.log.star.length === 0 && t.log.status.length === 0);
  ok('取消有講一聲', t.log.toast.some(x => /沒有動/.test(x))); }

{ const t = make(); await t.run({ intent: 'redeem', all: true });
  ok('說「全部」→ 兩筆都處理', t.log.star.length === 2 && t.log.status.length === 2);
  ok('不夠的人（Eric 只有 100，要 3000）在確認視窗裡標「⚠ 不夠」', /Eric[\s\S]*不夠/.test(t.log.confirm[0]) && !/Nick[^\n]*不夠/.test(t.log.confirm[0]));
  ok('先扣點、再標已給（順序）', t.log.star.length === t.log.status.length); }

{ const t = make(); await t.run({ intent: 'redeem' });
  ok('⭐ 兩筆在等、他沒說是誰也沒說「全部」→ 不猜、不扣、也不跳確認', t.log.star.length === 0 && t.log.confirm.length === 0 && t.log.toast.some(x => /說是誰的|全部/.test(x))); }

{ const t = make(); await t.run({ intent: 'redeem', item: '娃娃' });
  ok('用商品名指：只有皮卡丘娃娃那一筆', t.log.star.length === 1 && t.log.star[0][0] === 'g4eric@t'); }

{ const t = make(); t.reqs.length = 0; await t.run({ intent: 'redeem', all: true });
  ok('⭐ 沒有待兌換 → 不憑空扣星星、不跳確認', t.log.star.length === 0 && t.log.confirm.length === 0 && t.log.toast.some(x => /沒有人在等/.test(x))); }

{ const t = make(); await t.run({ intent: 'redeem', item: '不存在的東西' });
  ok('商品名對不到 → 說現在在等的是什麼，不扣', t.log.star.length === 0 && t.log.toast.some(x => /沒有符合/.test(x))); }

{ const t = make(); t.log.failStatus = true; await t.run({ intent: 'redeem', student: 'Nick', email: 'g4nick@t' });
  ok('⭐ 扣了點但標狀態失敗 → 老實說「可能已經扣了，不要重複扣」', t.log.star.length === 1 && t.log.toast.some(x => /不要重複扣/.test(x))); }

{ const t = make(); t.log.failStar = true; await t.run({ intent: 'redeem', student: 'Nick', email: 'g4nick@t' });
  ok('扣點就失敗 → 沒有標已給（不會「標了卻沒扣」）', t.log.status.length === 0); }

ok('卡片寫清楚「先列出、再按確定才扣點」，不是「不會自己存」', /m\.plan\.intent === 'redeem' \? '按下去只會先列出要做的事/.test(fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8')));
console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
