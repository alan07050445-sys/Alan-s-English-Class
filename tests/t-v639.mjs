// v639：前端不可以把種子資料整份寫回雲端（2026-11-21 G4 被蓋成 8 個空週）
import fs from 'fs';
let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅', m); } else { fail++; console.log('  ❌', m); } };
for (const f of ['data-g1.js','data-g2.js','data-g4.js','data-g5.js','data-g6.js','data-grammar.js']) {
  const s = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  ok(f + ' 沒有 .set({…SEED_WEEKS…}) 整份覆蓋', !/\.set\(\{[^}]*weeks: *[A-Z0-9_]+SEED_WEEKS/.test(s));
}
{ const s = fs.readFileSync(new URL('../data-summer.js', import.meta.url), 'utf8'); ok('data-summer.js 沒有 _libDoc.set({ weeks: _libSeed()… 整份覆蓋', !/_libDoc\.set\(\{ *weeks: *_libSeed/.test(s)); }
console.log(`\n${pass} pass, ${fail} fail`); process.exit(fail ? 1 : 0);
