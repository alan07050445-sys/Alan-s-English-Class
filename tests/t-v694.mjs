/* t-v694 — iPad QA 第一批：上一頁／邊緣滑動返回不再把學生踢出網站
 * 把 app.jsx 的 alanNav 原文切出來，放進假的 history（pushState／go 會真的改歷史、go 會觸發一次 popstate）跑。 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const app = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const qm  = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

const i = app.indexOf('const alanNav = (() => {');
const j = app.indexOf('})();', i) + 5;
const src = app.slice(i, j);

const mkEnv = () => {
  /* 假瀏覽器歷史：entries[0] 是進站前的那一頁（上一個網站），entries[1] 是我們的大廳 */
  const env = { entries: ['外站', '大廳'], pos: 1, nav: null, left: false };
  const history = {
    pushState: (s) => { env.entries.splice(env.pos + 1); env.entries.push(s); env.pos++; },
    go: (n) => { const to = env.pos + n; if (to < 0) { env.left = true; return; } env.pos = to; setTimeout(() => env.fire && env.fire(), 0); },
  };
  env.nav = new Function('history', src + '\nreturn alanNav;')(history);
  env.fire = () => { if (env.entries[env.pos] === '外站') env.left = true; env.nav.onPopState(); };
  /* 使用者按上一頁（邊緣滑動）：位置往前一格，然後 popstate */
  env.userBack = () => { env.pos--; if (env.entries[env.pos] === '外站') { env.left = true; return; } env.nav.onPopState(); };
  return env;
};
const tick = () => new Promise(r => setTimeout(r, 15));

console.log('\n【1】大廳 → 類別 → 單元，上一頁一層一層退');
{ const e = mkEnv(); const log = [];
  const cat = e.nav.push(() => log.push('離開類別'));
  const unit = e.nav.push(() => log.push('離開單元'));
  e.userBack(); ok('⭐⭐ 第一次上一頁：只關單元（回單元列表），沒離開網站', log.join() === '離開單元' && !e.left);
  e.userBack(); ok('第二次上一頁：關類別（回大廳），沒離開網站', log.join() === '離開單元,離開類別' && !e.left);
  e.userBack(); ok('在大廳再按上一頁才真的離開（跟一般網站一樣）', e.left === true); }

console.log('\n【2】用畫面上的返回鈕關掉（不是上一頁）→ 多出來的歷史要退掉');
{ const e = mkEnv(); const cat = e.nav.push(() => {}); e.nav.release(cat); await tick();
  ok('⭐ 按「返回大廳」後歷史位置回到大廳（不是停在多出來的那一筆）', e.pos === 1 && e.entries[e.pos] === '大廳');
  e.userBack(); ok('這時按上一頁才是離開網站，不是「看起來沒反應」', e.left === true); }

console.log('\n【3】同一瞬間關兩層（單元＋類別一起收）只退一次 history.go(-2)');
{ const e = mkEnv(); let goCalls = 0; const origGo = e.nav;
  const cat = e.nav.push(() => {}), unit = e.nav.push(() => {});
  e.nav.release(unit); e.nav.release(cat); await tick();
  ok('⭐ 兩層都收掉之後歷史回到大廳（沒有多退、沒有少退）', e.pos === 1 && !e.left);
  ok('堆疊清空', e.nav.depth() === 0); }

console.log('\n【4】混合：上一頁彈掉單元之後，類別才用 UI 關掉');
{ const e = mkEnv(); const log = [];
  const cat = e.nav.push(() => log.push('cat')), unit = e.nav.push(() => log.push('unit'));
  e.userBack();                                  // 單元被彈掉
  e.nav.release(unit);                           // 單元的 effect cleanup（已經彈掉，要是 no-op）
  e.nav.release(cat); await tick();              // 使用者按「返回大廳」
  ok('單元 cleanup 不會多退一次，歷史剛好回到大廳', e.pos === 1 && !e.left && log.join() === 'unit'); }

console.log('\n【5】我們自己退的那一次不會被當成使用者按上一頁');
{ const e = mkEnv(); const log = [];
  const cat = e.nav.push(() => log.push('cat'));
  e.nav.release(cat); await tick();
  ok('⭐ release 之後的 popstate 被忽略（onPop 沒被呼叫）', log.length === 0); }

console.log('\n【6】接線');
ok('app：進類別就 push、上一頁→回大廳；離開類別 release', /const inCat = !!catView;/.test(app) && /alanNav\.push\(\(\) => setCatView\(null\)\)/.test(app) && /return \(\) => alanNav\.release\(e\)/.test(app));
ok('單元層：進單元 push、上一頁→回單元列表', /const inUnit = !!selectedItem;/.test(qm) && /window\.alanNav\.push\(\(\) => \{ setSelectedItem\(null\); \}\)/.test(qm));
ok('只註冊一個 popstate 監聽（不會每層各一個互相打架）', (app.match(/addEventListener\('popstate'/g) || []).length === 1 && !/popstate/.test(qm));

console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
