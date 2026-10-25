// t-v599 — data.js 切成「學生包」與「老師包」：切得對不對、學生那邊有沒有用到老師包的東西
//   ⭐ 這支是整件事的安全網：名單（tools/teacher-data.json）是分析出來的，這裡**重新分析一次**，
//     名單裡任何一個名字如果現在在「學生會跑到的地方」被用到，就紅燈（否則學生那邊會 ReferenceError，整頁白掉）。
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = path.join(new URL('..', import.meta.url).pathname);
const sd = require(path.join(ROOT, 'tools/split-data.js'));
const list = JSON.parse(fs.readFileSync(sd.LIST, 'utf8'));
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const run = (code) => { const W = {}; new Function('window', 'document', 'firebase', 'localStorage', code)(W, { documentElement: { classList: { toggle: () => {} } } }, stub, { getItem: () => null, setItem: () => {}, removeItem: () => {} }); return W; };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

console.log('\n【1】名單還站得住（重新分析）');
const re = sd.analyze();
const stale = list.names.filter(n => !re.names.includes(n));
ok('⭐⭐ 名單裡的每一個名字，重新分析後仍然是老師專用' + (stale.length ? '：' + stale.slice(0, 8).join('、') : ''), stale.length === 0);
const leakSites = [];
list.names.forEach(n => (re.sites[n] || []).forEach(x => { const gated = sd.TEACHER_FILES.includes(x.file) || (x.file === 'app.jsx' && x.chain.some(c => sd.GATED_APP.includes(c))); if (!gated) leakSites.push(`${n} ← ${x.file}:${x.chain.join('>')}`); }));
ok('⭐⭐ 沒有任何一個老師專用的名字，被學生會跑到的地方用到' + (leakSites.length ? '：' + leakSites.slice(0, 5).join('；') : ''), leakSites.length === 0);
ok('名單夠大才有意義（至少搬走 200 個名字）', list.names.length >= 200);
ok('⭐ app.jsx 那份「只有老師才觸發」的處理函式名單，每一個都真的存在於 app.jsx', sd.GATED_APP.every(n => new RegExp('(const|function) ' + n + '\\b').test(read('app.jsx'))));

console.log('\n【2】切分本身');
const full = read('data.js');
const r = sd.partition(full, list.names);
ok('⭐⭐ 沒有任何問題（核心陳述式沒有用到老師專用的名字，匯出也沒有走鐘）', r.problems.length === 0);
ok('⭐ 兩半的語法都對', (() => { try { new Function(r.core); new Function(r.teacher); return true; } catch (e) { return false; } })());
const Wfull = run(full), Wcore = run(r.core), Wboth = run(r.core + '\n;\n' + r.teacher);
const keys = (o) => Object.keys(o).sort().join();
ok('⭐⭐ 核心＋老師 合起來掛到 window 上的東西，跟原本整份 data.js 一模一樣（一個不多一個不少）', keys(Wboth) === keys(Wfull));
ok('⭐ 只有核心（學生）：少掉的全部都是老師專用的', Object.keys(Wfull).filter(k => !(k in Wcore)).every(k => list.names.includes(k) || /^(rcNew|__)/.test(k) || r.teacherNames.includes(k)));
ok('⭐⭐ 學生那包夠小（核心 < 原本的 45%）', r.core.length < full.length * 0.45);
ok('同一個函式不會同時出現在兩半（切片不重疊）', (() => { const a = new Set((r.core.match(/^function (\w+)/gm) || [])); return (r.teacher.match(/^function (\w+)/gm) || []).every(x => !a.has(x)); })());
ok('⭐ 兩半加起來的字數 ≈ 原本（只多了匯出陳述式拆開的那幾行）', Math.abs(r.core.length + r.teacher.length - full.length) < 2000);

console.log('\n【3】學生必備的東西都還在核心');
const MUST = ['saveProgressItem', 'subscribeMyProgress', 'computeAutoStars', 'subscribeAuth', 'signInWithGoogle', 'isAdminUser', 'speakTTS', 'playSound', 'checkShortAnswer', 'checkWriting',
  'checkEssay', 'subscribeToClassData', 'loadWeeks', 'saveWeeks', 'saveWeekOrder', 'hwDoubleOn', 'weeksWithDeletes', 'noteCloudWeeks', 'examTotals'];
const missing = MUST.filter(k => !(k in Wcore));
ok('⭐ 學生每天會用的函式（進度、登入、語音、批改、星星、課程訂閱…）核心都有' + (missing.length ? '：缺 ' + missing.join('、') : ''), missing.length === 0);
console.log(fail ? `\n❌ t-v599：${pass} 過 / ${fail} 失敗` : `\n✅ t-v599：${pass} 過 / 0 失敗`);
process.exit(fail ? 1 : 0);
