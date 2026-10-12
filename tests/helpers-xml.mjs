/* 測試用的極簡 DOMParser 替身。
   ⚠ 只做 pacingReadXlsx 真正用到的那幾件事：getElementsByTagName／getAttribute／textContent。
     瀏覽器裡用的是真的 DOMParser——所以改完一定要再到瀏覽器跑一次（不能只靠這支）。 */
function parseXML(src) {
  const root = { tag: '#doc', attrs: {}, kids: [] };
  const stack = [root];
  const re = /<([?!/]?)([A-Za-z0-9_:.-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src))) {
    const [, pre, tag, rawAttr, selfClose, text] = m;
    if (text !== undefined) { stack[stack.length - 1].kids.push({ text }); continue; }
    if (pre === '?' || pre === '!') continue;
    if (pre === '/') { if (stack.length > 1) stack.pop(); continue; }
    const attrs = {};
    (rawAttr.match(/([A-Za-z0-9_:.-]+)="([^"]*)"/g) || []).forEach(a => {
      const i = a.indexOf('='); attrs[a.slice(0, i)] = a.slice(i + 2, -1);
    });
    const node = { tag: tag.replace(/^.*:/, ''), attrs, kids: [] };
    stack[stack.length - 1].kids.push(node);
    if (!selfClose) stack.push(node);
  }
  const wrap = (n) => ({
    getAttribute: (k) => (n.attrs && k in n.attrs ? n.attrs[k] : null),
    get textContent() { return txt(n); },
    getElementsByTagName: (t) => find(n, t).map(wrap),
  });
  /* ⚠ 真的 DOMParser 會把 &amp; &lt; 這些還原，替身也要做，不然測出來的字跟瀏覽器不一樣 */
  const unesc = (t) => String(t).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');
  const txt = (n) => (n.text !== undefined ? unesc(n.text) : (n.kids || []).map(txt).join(''));
  const find = (n, t) => (n.kids || []).flatMap(k => (k.tag === t ? [k] : []).concat(k.text === undefined ? find(k, t) : []));
  return wrap(root);
}
export class DOMParser { parseFromString(s) { return parseXML(s); } }
