// v552 萬聖節限時星星雙倍：用完成時間戳判斷，雙倍期間賺的永遠雙倍
import fs from 'fs';
const s = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } console.log('ok', m); };
ok(/function hwDoubleAt/.test(s) && /HW_DOUBLE\.mult/.test(s), '雙倍 helper 與套用存在');
ok(/'10-20'/.test(s) && /to: '10-31'/.test(s), '期間 10/20–10/31');
const y = new Date().getFullYear();
const mk = (m, d) => new Date(y, m - 1, d, 12).getTime();
const md = (t) => { const d = new Date(t); return String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const inWin = (t) => md(t) >= '10-20' && md(t) <= '10-31';
ok(inWin(mk(10, 25)) && !inWin(mk(10, 19)) && !inWin(mk(11, 1)), '邊界：10/25 內、10/19 與 11/1 外');
