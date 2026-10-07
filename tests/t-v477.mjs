/* t-v477 — Alan 回報五件
 *   1. 出錯 week 了，想整組調整到 week6 → 本來只有「沿用」（複製），沒有「搬過去」
 *   2. 配對間隔再開一點、整體再置中
 *   3. 字義選擇與測驗順序顛倒（先測驗再字義選擇）
 *   4. 一整組完成並通過門檻有沒有額外加分 → 本來沒有，只有「整週作業」獎金
 *   5. 吉祥物再智能化一點，跟我的舉動互動，不要固定幾套台詞
 */
import fs from 'fs';
const ROOT = new URL('..', import.meta.url);
const data = fs.readFileSync(new URL('data.js', ROOT), 'utf8');
const app  = fs.readFileSync(new URL('app.jsx', ROOT), 'utf8');
const qm   = fs.readFileSync(new URL('components-quiz-mode.jsx', ROOT), 'utf8');
const ed   = fs.readFileSync(new URL('components-editor.jsx', ROOT), 'utf8');
const fx   = fs.readFileSync(new URL('components-fx.jsx', ROOT), 'utf8');
const tune = fs.readFileSync(new URL('styles-tune.css', ROOT), 'utf8');

const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const W = {};
new Function('window', 'document', 'firebase', 'localStorage', data)(W, stub, stub, stub);

let pass = 0, fail = 0;
const ok = (m, c) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

console.log('\n【1】整組搬到別週（不是複製）');
ok('⭐ 畫面有「搬過去」可以選', /📦 搬過去（出錯週了）/.test(qm) && /📄 沿用一份過去/.test(qm));
ok('⭐ 搬只能搬到一個地方', /copyMove \? \[wc\.id\] : \[\.\.\.s, wc\.id\]/.test(qm));
ok('⭐ 搬之前要問清楚（原本那一週就沒有了）', /這一週就不會再有這一組了/.test(qm));
ok('⭐ 搬＝複製完把原本那一週的拿掉', /if \(move\) stripItemsFrom\(w\[weekId\]/.test(app));
ok('⭐ 而且是同一個 w 做完再存一次（不是複製存一次、刪除再存一次）',
   /同一個 w 上做完再存一次/.test(app)
   && app.indexOf('if (move) stripItemsFrom') < app.indexOf('saveWeeksSafe(w);\n    const toLabel'));
ok('⭐ 跟「整組刪掉」共用同一份清理（孤兒作業＋練習鎖）',
   /const stripItemsFrom = \(wk, ids\)/.test(app)
   && /stripItemsFrom\(w\[weekId\], ids\)/.test(app)          // 刪整組
   && /if \(move\) stripItemsFrom\(w\[weekId\]/.test(app));   // 搬過去
ok('搬過去不要順便設成作業（那是沿用才有的選項）', /copyMove \? '' : \(grpDue \|\| ''\)/.test(qm));
ok('搬完的提示要講搬去哪一週', /已搬到「\$\{toLabel\}」/.test(app));

console.log('\n【2】配對：間隔再開、整體置中');
ok('⭐ 右欄改成照內容收（本來吃掉 1.45fr，右邊永遠空一塊）',
   /grid-template-columns: minmax\(262px, max-content\) minmax\(0, max-content\)/.test(tune));
ok('⭐ 兩欄一起置中', /justify-content: center;/.test(tune.slice(tune.indexOf('@media (min-width: 761px)'))));
ok('⭐ 間隔又拉開了（220 → 340）', /column-gap: clamp\(110px, 20vw, 340px\)/.test(tune));
ok('左欄的最小寬度要留著（不然長單字換行）', /minmax\(262px,/.test(tune));

console.log('\n【3】先測驗，再字義選擇');
ok('⭐ 測驗排在字義選擇前面（側欄順序＝push 的順序）',
   ed.indexOf("kinds.indexOf('quiz') >= 0") < ed.indexOf("kinds.indexOf('sense') >= 0 && (sense"));
ok('有寫下為什麼（字義選擇要讀短文、比較難）', /排在一般測驗後面比較合理/.test(ed));

console.log('\n【4】整組完成的額外加分');
const mk = (id, type, group) => ({ id, type, group, title: id });
const six = ['a','b','c','d','e','f'].map((id, i) => mk(id, i === 0 ? 'flashcard' : 'quiz', 'G'));
const prog = (ids) => Object.fromEntries(ids.map(id => ['W1_' + id,
  id === 'a' ? { modes: { learn: true, test: true }, itemType: 'flashcard' } : { score: 8, total: 8, itemType: 'quiz' }]));
const run = (items, done) => W.computeAutoStars({ W1: { label: 'W1', items: { vocab: items } } }, ['W1'], prog(done));
const grp = (r) => r.entries.filter(e => /整組完成/.test(e.note));
ok('⭐ 3 個單元全過 → +10', grp(run(six.slice(0, 3), ['a','b','c']))[0]?.amount === 10);
ok('⭐ 6 個單元全過 → +15', grp(run(six, ['a','b','c','d','e','f']))[0]?.amount === 15);
ok('⭐ 少一個沒過就不給（是「通過門檻」不是「做完」）', grp(run(six, ['a','b','c','d','e'])).length === 0);
ok('⭐ 兩個單元不算一組（太好賺）', grp(run(six.slice(0, 2), ['a','b'])).length === 0);
ok('⭐ 沒有 group 的單元不會被硬湊成一組',
   grp(run([mk('x','quiz',''), mk('y','quiz',''), mk('z','quiz','')], ['x','y','z'])).length === 0);
ok('⭐ 用的是跟作業獎金同一把尺（autoStarItemOk）', /gItems\.every\(it => autoStarItemOk\(/.test(data));
ok('整週作業獎金還在（沒有被我弄壞）',
   run(six, ['a','b','c','d','e','f']).entries.length >= 1 && /作業全部完成/.test(data));

console.log('\n【5】吉祥物看情況說話');
const L = W.mxSmartLine;
ok('⭐ 有這個函式，而且掛出去了', typeof L === 'function');
ok('⭐ 連對會講真實數字', /連對 7|7 題/.test(L({ streak: 7 }).text));
ok('⭐ 連對 10 題以上更誇張一點', L({ streak: 12 }).act === 'cheer');
ok('⭐ 連錯三題是安慰，不是提醒', /陪你|沒關係|深呼吸/.test(L({ wrongRun: 3 }).text));
ok('⭐ 快完成整組會講「剩幾個」', /剩|最後/.test(L({ groupLeft: 1 }).text) && L({ groupLeft: 1 }).act === 'jump');
ok('⭐ 星星快夠會講「再幾顆就買得起什麼」',
   /再 20 顆|只差 20|存到 300/.test(L({ stars: 280, nearBuy: { label: '🐰 小兔', need: 20 } }).text));
ok('   太遠的就不要提（不然每次都在講買不起的東西）',
   L({ stars: 10, nearBuy: { label: 'x', need: 500 } }) === null);
ok('⭐ 連續簽到會講天數', /5 天/.test(L({ firstToday: true, checkinDays: 5 }).text));
ok('⭐ 久沒來會講幾天沒見', /9 天/.test(L({ firstToday: true, daysAway: 9 }).text));
ok('⭐ 訂正錯題會被看見', /4 題/.test(L({ fixedToday: 4 }).text));
ok('⭐ 沒事發生就回 null（退回原本的固定台詞）', L({}) === null && L(null) === null);
ok('⭐ 同一件事不要連講兩次', L({ streak: 7, lastKey: 'streak5' })?.key !== 'streak5');
ok('⭐ 兩句之間至少隔 25 秒（「很懂你」跟「很吵」只差在頻率）',
   /Date\.now\(\) - smartAtRef\.current < \(minGap == null \? 25000 : minGap\)/.test(fx));
ok('⭐ 答錯的當下不要插話，連錯三題才開口（而且間隔拉到一分鐘）',
   /wrongRunRef\.current >= 3 && wrongRunRef\.current % 3 === 0/.test(fx) && /smartSay\(\{ wrongRun: wrongRunRef\.current \}, 60000\)/.test(fx));
ok('⭐ 講不出東西時照原本的語音包走（不是變成沒反應）',
   /if \(smartSay\(\{\}, 0\)\) return;/.test(fx) && /mxLine\('win'/.test(fx));
ok('⭐ 網站把真實狀況餵給牠', /window\.__mxCtx = Object\.assign/.test(app) && /window\.__mxCtx = Object\.assign/.test(qm));
ok('⭐ 簽到／訂正變了要重算', /myCheckin, myFixed\]\);/.test(app));
ok('⭐ 「剩幾個整組完成」只有單元列表知道，由它自己寫',
   /groupLeft: best/.test(qm) && /if \(its\.length < 3\) return;/.test(qm));
ok('   老師編輯時不要被鼓勵', /if \(editMode\) return;/.test(qm));

console.log(`\n${fail ? '❌' : '✅'} t-v477：${pass} 過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
