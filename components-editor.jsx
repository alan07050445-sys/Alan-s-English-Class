// components-editor.jsx — Editor modal for adding/editing items

const { useState: useS, useEffect: useE } = React;

const TYPE_OPTIONS = [
  { id: "quizlet",  label: "Quizlet",  hint: "Embed link from Quizlet" },
  { id: "wordwall", label: "Wordwall", hint: "Embed link from Wordwall" },
  { id: "youtube",  label: "YouTube",  hint: "Paste any YouTube URL" },
  { id: "form",     label: "Google Form", hint: "Embed link from Google Form" },
  { id: "pdf",      label: "PDF",      hint: "Upload a PDF or paste a link" },
  { id: "note",     label: "Notes",    hint: "Write your own notes" },
  { id: "quiz",     label: "Quiz",     hint: "Build a multiple-choice quiz with explanations" },
];

function EditorModal({ open, draft, weekId, onClose, onSave, onDelete }) {
  const [form, setForm] = useS(draft);

  useE(() => { setForm(draft); }, [draft]);

  if (!open || !form) return null;

  const isNew = !!form._isNew;
  const meta = TYPE_OPTIONS.find(t => t.id === form.type) || TYPE_OPTIONS[0];

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const extractSrc = (raw) => {
    if (!raw) return raw;
    const m = raw.match(/src\s*=\s*["']([^"']+)["']/i);
    return m ? m[1] : raw;
  };
  const updateEmbed = (v) => update("embed", extractSrc(v.trim()));

  const handleSave = () => {
    if (!form.title?.trim()) { alert("Please enter a title"); return; }
    onSave(form);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={"modal " + (form.type === "quiz" ? "wide" : "")} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isNew ? "Add" : "Edit"} <em>item</em></h3>
          <button className="modal-close" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="field-label">Resource Type · 類型</label>
            <div className="type-picker">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={form.type === opt.id ? "active" : ""}
                  onClick={() => update("type", opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="field-help">{meta.hint}</div>
          </div>

          <div className="field">
            <label className="field-label">Title · 英文標題</label>
            <input
              value={form.title || ""}
              onChange={e => update("title", e.target.value)}
              placeholder="e.g. Animals & Habitats — Set A"
            />
          </div>

          <div className="field">
            <label className="field-label">中文說明</label>
            <input
              value={form.zh || ""}
              onChange={e => update("zh", e.target.value)}
              placeholder="例：20 個本週核心單字"
            />
          </div>

          <div className="field">
            <label className="field-label">Duration · 預估時長</label>
            <input
              value={form.duration || ""}
              onChange={e => update("duration", e.target.value)}
              placeholder="e.g. 15 min"
            />
          </div>

          {form.type === "note" ? (
            <div className="field">
              <label className="field-label">Notes Body · 筆記內容</label>
              <textarea
                value={form.body || ""}
                onChange={e => update("body", e.target.value)}
                placeholder="Write your notes here..."
                rows={6}
              />
            </div>
          ) : form.type === "quiz" ? (
            <>
              <div className="field">
                <label className="field-label">Options · 設定</label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={form.shuffle !== false}
                    onChange={e => update("shuffle", e.target.checked)}
                  />
                  <span>
                    <b>Shuffle options each time · 每次作答随機打亂選項</b>
                    <span style={{display: "block", color: "var(--ink-muted)", fontSize: 12, marginTop: 2}}>
                      學生沒辦法背 「A 是答案」。關闭則保持原始順序。
                    </span>
                  </span>
                </label>
              </div>
              <div className="field">
                <label className="field-label">Questions · 題目</label>
                <window.QuizEditor
                  questions={form.questions || []}
                  onChange={(qs) => update("questions", qs)}
                />
              </div>
            </>
          ) : form.type === "pdf" ? (
            <PdfUpload
              file={form.fileData ? { name: form.fileName, dataUrl: form.fileData, size: form.fileSize } : null}
              url={form.url || ""}
              weekId={weekId}
              itemId={form.id}
              onUrl={(v) => update("url", v)}
              onFile={(f) => setForm(prev => ({
                ...prev,
                fileName: f?.name || "",
                fileSize: f?.size || 0,
                fileData: f?.dataUrl || "",
                url: f ? "" : prev.url,
              }))}
            />
          ) : (
            <>
              <div className="field">
                <label className="field-label">Link · 連結網址</label>
                <input
                  value={form.url || ""}
                  onChange={e => update("url", e.target.value)}
                  placeholder={
                    form.type === "youtube" ? "https://www.youtube.com/watch?v=..." :
                    "Public URL to the resource"
                  }
                />
              </div>

              <div className="field">
                <label className="field-label">Embed URL · 嵌入連結 (optional)</label>
                <input
                  value={form.embed || ""}
                  onChange={e => updateEmbed(e.target.value)}
                  placeholder={
                    form.type === "quizlet" ? "https://quizlet.com/XXX/match/embed" :
                    form.type === "wordwall" ? "https://wordwall.net/embed/XXX" :
                    form.type === "form" ? "https://docs.google.com/forms/.../viewform?embedded=true" :
                    "Leave blank for YouTube — auto-detected"
                  }
                />
                <div className="field-help">
                  {form.type === "youtube" ? "Auto-generated from YouTube URL — leave blank." :
                   "Paste the full <iframe…> embed code OR just the src URL — we'll auto-extract it."}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-foot">
          {!isNew ? (
            <button className="btn danger" onClick={() => { if (confirm("Delete this item?")) onDelete(form.id); }}>
              Delete
            </button>
          ) : <span/>}
          <div style={{display: "flex", gap: 10}}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={handleSave}>
              {isNew ? "Add Item" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── PDF upload — uploads to Firebase Storage ───── */
function PdfUpload({ file, url, weekId, itemId, onUrl, onFile }) {
  const [drag, setDrag] = useS(false);
  const [uploading, setUploading] = useS(false);
  const [err, setErr] = useS("");
  const inputRef = React.useRef(null);

  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (Firebase Storage, no localStorage limit)

  const handleFile = async (f) => {
    setErr("");
    if (!f) return;
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) {
      setErr("請上傳 PDF 檔 · Please upload a PDF file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setErr(`檔案太大 (${formatBytes(f.size)}) · 上限 ${formatBytes(MAX_BYTES)}。請壓縮 PDF。`);
      return;
    }
    setUploading(true);
    try {
      const downloadUrl = await window.uploadPdfToStorage(weekId, itemId, f);
      onFile({ name: f.name, size: f.size, dataUrl: downloadUrl });
    } catch (e) {
      setErr("上傳失敗 · Upload failed. 請再試一次。");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="field">
      <label className="field-label">PDF File · 練習卷</label>

      {file?.dataUrl ? (
        <div className="pdf-uploaded">
          <div className="pdf-uploaded-icon">PDF</div>
          <div className="pdf-uploaded-info">
            <div className="pdf-uploaded-name">{file.name || "document.pdf"}</div>
            <div className="pdf-uploaded-meta mono">{formatBytes(file.size)} · stored in cloud ☁</div>
          </div>
          <div className="pdf-uploaded-tools">
            <a className="item-action ghost" href={file.dataUrl} target="_blank" rel="noopener">Preview</a>
            <button className="item-action ghost" onClick={() => onFile(null)}>Remove</button>
          </div>
        </div>
      ) : (
        <div
          className={"pdf-drop " + (drag ? "drag" : "") + (uploading ? " reading" : "")}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            style={{display: "none"}}
            onChange={e => handleFile(e.target.files?.[0])}
          />
          {uploading ? (
            <div className="pdf-drop-status">Uploading to cloud… ☁</div>
          ) : (
            <>
              <div className="pdf-drop-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>
                </svg>
              </div>
              <div className="pdf-drop-title serif">
                {drag ? "Drop your PDF here" : "Drag a PDF here, or click to choose"}
              </div>
              <div className="pdf-drop-sub mono">
                拖曳檔案到這裡，或點選檔 · PDF · max 10 MB
              </div>
            </>
          )}
        </div>
      )}

      {err && <div className="pdf-err mono">⚠ {err}</div>}

      <div className="pdf-or">
        <span/><span className="mono">OR · 或</span><span/>
      </div>
      <label className="field-label">Link to PDF · 貼上外部連結 (optional)</label>
      <input
        value={url}
        onChange={e => onUrl(e.target.value)}
        placeholder="https://drive.google.com/… or any public PDF URL"
      />
      <div className="field-help">If you have a Google Drive / Dropbox link, paste it here — no upload needed.</div>
    </div>
  );
}

function formatBytes(b) {
  if (!b) return "0 B";
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / 1024 / 1024).toFixed(2) + " MB";
}

/* Footer */
function Footer() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <div className="footer-mark">Alan<em>'s</em></div>
            <p className="footer-tagline">
              A weekly English programme for young learners — built around four foundations: vocabulary, grammar, word study, and reading.
            </p>
          </div>
          <div className="footer-col">
            <h4>Class</h4>
            <ul>
              <li><a href="#">This Week</a></li>
              <li><a href="#">Past Weeks</a></li>
              <li><a href="#">Resources</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li><a href="#">Email Alan</a></li>
              <li><a href="#">Subscribe</a></li>
              <li><a href="#">LINE</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-baseline">
          <span>© 2025 Alan's English Class</span>
          <span>Made with care · 用心製作</span>
        </div>
      </div>
    </footer>
  );
}

/* ───── Week Modal ───── */
function WeekModal({ open, existingIds, onClose, onSave }) {
  const [form, setForm] = useS(null);

  useE(() => {
    if (open) {
      setForm({
        id: window.suggestNextWeekId(existingIds || []),
        label: "",
        dateRange: "",
        theme: "",
        themeZh: "",
      });
    }
  }, [open]);

  if (!open || !form) return null;

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const autoLabel = () => {
    const m = form.id.match(/W(\d{1,2})/i);
    return m ? `Week ${parseInt(m[1], 10)}` : form.id;
  };

  const handleSave = () => {
    const payload = { ...form, label: form.label?.trim() || autoLabel() };
    onSave(payload);
  };

  const conflict = existingIds?.includes(form.id);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Add <em>new week</em></h3>
          <button className="modal-close" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="field-label">Week ID · 週次代碼</label>
            <input
              value={form.id}
              onChange={e => update("id", e.target.value.trim())}
              placeholder="e.g. 2025-W16"
              style={{fontFamily: "var(--font-mono, monospace)"}}
            />
            <div className="field-help">
              格式：<code>YYYY-WNN</code>（例 <code>2025-W16</code>）。用來排序與識別。
              {conflict && <span style={{color: "#c0392b", display: "block", marginTop: 4}}>⚠ 這個 ID 已經存在</span>}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Label · 顯示名稱</label>
            <input
              value={form.label}
              onChange={e => update("label", e.target.value)}
              placeholder={autoLabel()}
            />
            <div className="field-help">留空會自動用「{autoLabel()}」</div>
          </div>

          <div className="field">
            <label className="field-label">Date Range · 日期區間</label>
            <input
              value={form.dateRange}
              onChange={e => update("dateRange", e.target.value)}
              placeholder="e.g. Apr 14 – Apr 20"
            />
          </div>

          <div className="field">
            <label className="field-label">Theme · 本週主題 (English)</label>
            <input
              value={form.theme}
              onChange={e => update("theme", e.target.value)}
              placeholder="e.g. Food & Cooking"
            />
          </div>

          <div className="field">
            <label className="field-label">中文主題</label>
            <input
              value={form.themeZh}
              onChange={e => update("themeZh", e.target.value)}
              placeholder="例：食物與料理"
            />
          </div>
        </div>

        <div className="modal-foot">
          <span/>
          <div style={{display: "flex", gap: 10}}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={handleSave} disabled={conflict || !form.id}>
              Add Week
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── Export Modal ───── */
function ExportModal({ open, weeks, weekOrder, onClose, showToast }) {
  const [mode, setMode] = useS("dataJs");
  const [copied, setCopied] = useS(false);

  useE(() => { if (open) { setMode("dataJs"); setCopied(false); } }, [open]);

  if (!open) return null;

  const jsonPayload = { weekOrder, weeks };
  const jsonStr = JSON.stringify(jsonPayload, null, 2);

  const seedJs = JSON.stringify(weeks, null, 2);
  const orderJs = JSON.stringify(weekOrder);

  const dataJsSnippet =
`// data.js — Seed content + storage helpers
// Generated by Teacher Export on ${new Date().toISOString().slice(0, 19).replace("T", " ")}
// Drop in to replace the entire file.

const CATEGORIES = [
  {
    id: "vocab",
    num: "01",
    title: "FET Vocabulary",
    titleZh: "外師單字",
    desc: "Build vocabulary through Quizlet flashcards and Wordwall games — words from this week's FET lesson.",
    descZh: "本週外師課堂單字練習，透過 Quizlet 與 Wordwall 反覆練習，建立紮實的字彙基礎。",
  },
  {
    id: "grammar",
    num: "02",
    title: "Grammar",
    titleZh: "文法",
    desc: "Sentence patterns and grammar drills. Watch the explanation, then practice.",
    descZh: "本週文法重點：例句說明、影片解析、線上練習與評量。",
  },
  {
    id: "word",
    num: "03",
    title: "Word Study",
    titleZh: "字根字首",
    desc: "Roots, prefixes, suffixes — learn how words are built so you can decode unfamiliar ones.",
    descZh: "從字根字首認識單字結構，學會自己拆解陌生單字。",
  },
  {
    id: "reading",
    num: "04",
    title: "Reading Comprehension",
    titleZh: "閱讀理解",
    desc: "Short passages with comprehension questions. Read first, then answer.",
    descZh: "短文閱讀加上閱讀測驗題目，培養閱讀理解的速度與準確度。",
  },
];

// ───── Weeks (exported from teacher edits) ─────
const SEED_WEEKS = ${seedJs};

const DEFAULT_WEEK_ORDER = ${orderJs};

const WEEK_ORDER_KEY = "alans-english-week-order-v1";

function loadWeekOrder() {
  try {
    const raw = localStorage.getItem(WEEK_ORDER_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch (e) {}
  return DEFAULT_WEEK_ORDER.slice();
}
function saveWeekOrder(order) {
  try { localStorage.setItem(WEEK_ORDER_KEY, JSON.stringify(order)); } catch (e) {}
}

function suggestNextWeekId(existingIds) {
  const parsed = existingIds
    .map(id => {
      const m = String(id).match(/^(\\d{4})-W(\\d{1,2})$/i);
      return m ? { year: +m[1], week: +m[2], id } : null;
    })
    .filter(Boolean);
  if (parsed.length === 0) {
    const d = new Date();
    return \`\${d.getFullYear()}-W01\`;
  }
  parsed.sort((a, b) => a.year - b.year || a.week - b.week);
  const last = parsed[parsed.length - 1];
  let nextYear = last.year, nextWeek = last.week + 1;
  if (nextWeek > 53) { nextYear += 1; nextWeek = 1; }
  return \`\${nextYear}-W\${String(nextWeek).padStart(2, "0")}\`;
}

const TYPE_META = {
  quizlet:  { label: "Quizlet",  zh: "字卡",   embed: true,  cta: "Close ×" },
  wordwall: { label: "Wordwall", zh: "遊戲",   embed: true,  cta: "Play →" },
  youtube:  { label: "Video",    zh: "影片",   embed: true,  cta: "Watch →" },
  form:     { label: "Quiz",     zh: "小考",   embed: true,  cta: "Take →" },
  pdf:      { label: "PDF",      zh: "練習卷", embed: false, cta: "Download ↓" },
  note:     { label: "Notes",    zh: "筆記",   embed: false, cta: "Read →" },
  image:    { label: "Image",    zh: "圖片",   embed: false, cta: "View →" },
  quiz:     { label: "Quiz",     zh: "測驗",   embed: false, cta: "Start →" },
};

const STORAGE_KEY = "alans-english-data-v3";
const PROGRESS_KEY = "alans-english-progress-v1";

function dedupeDoubled(s) {
  if (typeof s !== "string" || s.length < 4) return s;
  const half = s.length / 2;
  if (Number.isInteger(half) && s.slice(0, half) === s.slice(half)) return s.slice(0, half);
  return s;
}
function cleanWeeks(weeks) {
  try {
    const out = JSON.parse(JSON.stringify(weeks));
    Object.values(out).forEach(w => {
      ;["theme", "themeZh", "subtitle", "subtitleZh", "label", "dateRange"].forEach(k => {
        if (w && typeof w[k] === "string") w[k] = dedupeDoubled(w[k]);
      });
    });
    return out;
  } catch (e) { return weeks; }
}

function loadWeeks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return cleanWeeks(JSON.parse(raw));
  } catch (e) {}
  return SEED_WEEKS;
}
function saveWeeks(weeks) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(weeks)); } catch (e) {}
}
function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}
function saveProgress(prog) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(prog)); } catch (e) {}
}

function toYouTubeEmbed(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return "https://www.youtube.com/embed" + u.pathname;
    const v = u.searchParams.get("v");
    if (v) return "https://www.youtube.com/embed/" + v;
  } catch (e) {}
  return url;
}

Object.assign(window, {
  CATEGORIES, SEED_WEEKS, DEFAULT_WEEK_ORDER, TYPE_META,
  loadWeeks, saveWeeks, loadProgress, saveProgress, toYouTubeEmbed,
  loadWeekOrder, saveWeekOrder, suggestNextWeekId,
});
`;

  const content = mode === "dataJs" ? dataJsSnippet : jsonStr;
  const filename = mode === "dataJs" ? "data.js" : "weeks.json";

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast && showToast("Downloaded " + filename);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 1500); }
      catch (e2) { showToast && showToast("Copy failed"); }
      document.body.removeChild(ta);
    }
  };

  const weekCount = weekOrder.length;
  let itemCount = 0;
  Object.values(weeks).forEach(w => {
    if (!w?.items) return;
    Object.values(w.items).forEach(arr => { itemCount += arr?.length || 0; });
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Export <em>data</em></h3>
          <button className="modal-close" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        <div className="modal-body">
          <div style={{
            padding: "12px 14px", background: "var(--bg-cream, #f7f3eb)",
            border: "1px solid var(--rule, #e6e0d2)", borderRadius: 3,
            fontSize: 13, lineHeight: 1.55, marginBottom: 18
          }}>
            <strong>{weekCount} weeks</strong> · <strong>{itemCount} items</strong> 目前儲存在雲端。<br/>
            <span style={{color: "var(--ink-muted)"}}>
              這份 JSON 備份可用來還原資料，或在新的 Firebase 專案重新匯入。
            </span>
          </div>

          <div className="field">
            <label className="field-label">Format · 格式</label>
            <div className="type-picker">
              <button className={mode === "dataJs" ? "active" : ""} onClick={() => setMode("dataJs")}>
                data.js (legacy)
              </button>
              <button className={mode === "json" ? "active" : ""} onClick={() => setMode("json")}>
                Raw JSON
              </button>
            </div>
            <div className="field-help">
              {mode === "dataJs"
                ? "舊版靜態 data.js 格式（不含 Firebase sync）— 純備份用。"
                : "純資料 JSON — 備份或之後匯入用。"}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Preview · 預覽</label>
            <textarea
              readOnly
              value={content}
              rows={12}
              style={{
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                fontSize: 11.5, lineHeight: 1.5,
                background: "#1a1a1a", color: "#e8e4d8",
                border: "1px solid #2a2a2a", borderRadius: 3,
                padding: 12, whiteSpace: "pre", width: "100%",
                resize: "vertical",
              }}
              onClick={e => e.target.select()}
            />
          </div>
        </div>

        <div className="modal-foot">
          <span style={{fontSize: 11, color: "var(--ink-muted)", fontFamily: "var(--mono, monospace)"}}>
            {filename}
          </span>
          <div style={{display: "flex", gap: 10}}>
            <button className="btn ghost" onClick={handleCopy}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
            <button className="btn primary" onClick={handleDownload}>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EditorModal, Footer, WeekModal, ExportModal });
