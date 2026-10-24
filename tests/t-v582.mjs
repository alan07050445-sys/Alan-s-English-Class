// v582：G4 Formative 2——跨頁的填空／選擇題／自己出問題、沒列母音組合的圈字
import fs from 'fs'; import vm from 'vm';
const data = fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8');
let fail = 0; const ok = (m, c) => { console.log(c ? '  ✅' : '  ❌', m); if (!c) fail++; };
const g = (a, b) => data.slice(data.indexOf(a), data.indexOf(b, data.indexOf(a)));
const sb = {}; sb.window = sb; vm.createContext(sb);
vm.runInContext(g('const WS_FALSE_PREFIX', '/* 🔴 v484') + '\nthis.t = (w, a) => WS_CHECKS.team(w, a); this.d = (w, a) => WS_CHECKS.digraph(w, a);', sb);
const yes = ['train', 'creek', 'coat', 'rain', 'deep', 'boulder', 'clean', 'neat', 'sweet', 'day'];
const no = ['hunt', 'fossils', 'old', 'warm', 'light', 'shape', 'pressed', 'Sam', 'put'];
ok('沒列母音組合時用常見組合：train／creek／coat… 都算', yes.every(w => sb.t(w, '')));
ok('沒有母音組合的字不算：hunt／fossils／shape…', no.every(w => !sb.t(w, '')));
ok('有指定時仍照指定（ai 只算 ai）', sb.t('rain', 'ai') && !sb.t('creek', 'ai'));
ok('子音雙字母沒指定 → ch sh th…；有指定照指定', sb.d('chip', '') && sb.d('ship', '') && !sb.d('cat', '') && sb.d('chip', 'ch') && !sb.d('ship', 'ch'));
ok('續頁：填空沒詞庫會收下來標 _cont、自己出問題沒文章也收下', /_cont: 'bank'/.test(data) && /_cont: 'passage'/.test(data));
ok('沒有名字的段落接在前一個 Section 後面', /key \? secs\.find\(x => x\.key === key\) : \(secs\.length \? secs\[secs\.length - 1\] : null\)/.test(data));
ok('續頁填空併回前面那個，答案不在詞庫就照詞庫重選', /prev\._fixAns = true/.test(data) && /WORD BANK: /.test(data));
ok('續頁的自己出問題，文章用同一個 Section 讀到的那一篇', /pt\.passage = src/.test(data));
process.exit(fail ? 1 : 0);
