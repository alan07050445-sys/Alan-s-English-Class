// components-editor.jsx — Editor modal for adding/editing items

const { useState: useS, useEffect: useE } = React;

const TYPE_OPTIONS = [
  { id: "youtube",   label: "YouTube",    hint: "Paste any YouTube URL" },
  { id: "pdf",       label: "PDF",        hint: "Upload a PDF or paste a link" },
  { id: "note",      label: "Notes",      hint: "Write your own notes" },
  { id: "quiz",      label: "Quiz",       hint: "Build a multiple-choice quiz with explanations" },
  { id: "flashcard", label: "Flashcard",  hint: "自製單字卡組 — 支援圖片搜尋、匯入、三種練習模式" },
  { id: "fillblank",        label: "Fill Blank",       hint: "填空題 — 自訂句子填空，支援主題換色" },
  { id: "writing-practice", label: "Writing Practice", hint: "✍ AI 造句批改 — 學生逐題造句，AI 給星評分" },
  { id: "type-answer",      label: "Type Answer",      hint: "⌨ 看提示打答案 — 例：base form → past tense，老師自訂題目與答案" },
  { id: "spelling",         label: "Spelling 聽寫",     hint: "🔊 聽單字拼出來 — 匯入單字清單，學生聽發音自己拼字，自動批改" },
  { id: "short-answer",     label: "Short Answer",     hint: "📖 閱讀理解短答題 — 貼文章，學生逐題打字回答，AI 批改 0–3 星" },
  { id: "syllable-div",     label: "Syllable Cut",     hint: "✂️ 切音節練習 — 輸入單字與切法，學生點擊字母縫隙自己切，系統自動批改" },
  { id: "word-sort",        label: "Word Sort",        hint: "🗂 分類排序 — 設定分類欄位，學生把單字拖進正確欄位，系統自動批改" },
  { id: "essay",            label: "Opinion Essay",    hint: "✍ 意見文寫作 — 學生寫 opinion essay，AI 依照 7 項標準批改（Claim / Reasons / Examples / Explanation / Conclusion / Organization / Grammar）" },
  { id: "story-mountain",   label: "Story Mountain",   hint: "🏔 故事山脈 — 逐步填寫 Introduction → Rising Action → Climax → Falling Action → Resolution，AI 批改結構與文法（10 分制）" },
  { id: "cloze",            label: "Cloze Test",       hint: "📝 段落填空 — 貼入完整文章，用 [答案] 或 [答案](提示) 標記空格，學生一次看整段填空並打字作答" },
  { id: "circle-answer",    label: "Circle Answer",    hint: "⭕ 圈出答案 — 學生點選句子中的正確單字，可選擇再回答分類題" },
];

function EditorModal({ open, draft, weekId, catItems, onClose, onSave, onDelete }) {
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
      <div className={"modal " + ((form.type === "quiz" || form.type === "flashcard" || form.type === "fillblank" || form.type === "type-answer" || form.type === "spelling" || form.type === "cloze" || form.type === "circle-answer") ? "wide" : "")} onClick={e => e.stopPropagation()}>
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
            <label className="field-label">分組 · Group（文章名，選填）</label>
            <input
              value={form.group || ""}
              onChange={e => update("group", e.target.value)}
              placeholder="例：Emotional Blackmail — 同組單元會收在一起"
              list="qm-group-datalist"
            />
            <datalist id="qm-group-datalist">
              {Array.from(new Set((catItems || []).map(it => String(it.group || '').trim()).filter(Boolean))).map(g => (
                <option key={g} value={g}/>
              ))}
            </datalist>
            <div className="field-help">學生任務清單與題庫側欄會依這個名字分組；留空＝依標題自動歸戶。</div>
          </div>

          <div className="field">
            <label className="field-label">Duration · 預估時長</label>
            <input
              value={form.duration || ""}
              onChange={e => update("duration", e.target.value)}
              placeholder="e.g. 15 min"
            />
          </div>

          {form.type === "flashcard" ? (
            <window.FlashcardEditor
              cards={form.cards || []}
              onChange={cards => update("cards", cards)}
            />
          ) : form.type === "fillblank" ? (
            <>
              {((catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0)).length > 0 && (
                <div className="field">
                  <label className="field-label">Linked Flashcard · 綁定單字卡</label>
                  <select
                    value={form.linkedFlashcardId || ""}
                    onChange={e => update("linkedFlashcardId", e.target.value || undefined)}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",background:"var(--bg)",color:"var(--ink)",borderRadius:2,fontSize:14}}
                  >
                    <option value="">— 不綁定 (None) —</option>
                    {(catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0).map(fc => (
                      <option key={fc.id} value={fc.id}>{fc.title} ({(fc.cards||[]).length} 張)</option>
                    ))}
                  </select>
                  <div className="field-help">學生進入測驗前會直接看到這組單字卡，不用自己選。</div>
                </div>
              )}
              <window.FillBlankEditor
                questions={form.questions || []}
                onChange={questions => update("questions", questions)}
              />
            </>
          ) : form.type === "writing-practice" ? (
            <WritingPracticeEditor
              catItems={catItems || []}
              linkedFlashcardId={form.linkedFlashcardId || ''}
              prompts={form.writingPrompts || []}
              onChangeLinkedFlashcardId={v => update("linkedFlashcardId", v || undefined)}
              onChangePrompts={prompts => update("writingPrompts", prompts)}
            />
          ) : form.type === "spelling" ? (
            <>
              <div className="field">
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={form.spellShowZh !== false}
                    onChange={e => update("spellShowZh", e.target.checked)}
                  />
                  <span>
                    <b>顯示中文提示 · 聽寫時同時顯示中文意思</b>
                    <span style={{display: "block", color: "var(--ink-muted)", fontSize: 12, marginTop: 2}}>
                      關閉＝純聽力拼寫，難度更高。
                    </span>
                  </span>
                </label>
              </div>
              <div className="field">
                <label className="field-label">Words · 聽寫單字</label>
                <SpellingEditor
                  words={form.spellWords || []}
                  onChange={ws => update("spellWords", ws)}
                />
              </div>
            </>
          ) : form.type === "type-answer" ? (
            <TypeAnswerEditor
              pairs={form.pairs || []}
              instruction={form.instruction || ''}
              onChangePairs={pairs => update("pairs", pairs)}
              onChangeInstruction={v => update("instruction", v)}
            />
          ) : form.type === "short-answer" ? (
            <ShortAnswerEditor
              passage={form.passage || ''}
              questions={form.saQuestions || []}
              saYoutube={form.saYoutube || ''}
              onChangePassage={v => update("passage", v)}
              onChangeQuestions={qs => update("saQuestions", qs)}
              onChangeSaYoutube={v => update("saYoutube", v)}
            />
          ) : form.type === "syllable-div" ? (
            <SyllableDivEditor
              words={form.sdWords || []}
              onChangeWords={ws => update("sdWords", ws)}
            />
          ) : form.type === "word-sort" ? (
            <WordSortEditor
              categories={form.sortCategories || []}
              words={form.sortWords || []}
              suffixMode={!!form.sortSuffixMode}
              onChangeCategories={cats => update("sortCategories", cats)}
              onChangeWords={ws => update("sortWords", ws)}
              onChangeSuffixMode={v => update("sortSuffixMode", v)}
            />
          ) : form.type === "essay" ? (
            <EssayEditor
              prompt={form.essayPrompt || ''}
              scaffold={form.essayScaffold || ''}
              onChangePrompt={v => update("essayPrompt", v)}
              onChangeScaffold={v => update("essayScaffold", v)}
            />
          ) : form.type === "cloze" ? (
            <ClozeEditor
              passage={form.passage || ''}
              onChangePassage={v => update("passage", v)}
            />
          ) : form.type === "circle-answer" ? (
            <CircleAnswerEditor
              questions={form.circleQuestions || []}
              instruction={form.circleInstruction || ''}
              labels={form.circleLabels || []}
              onChangeQuestions={questions => update("circleQuestions", questions)}
              onChangeInstruction={v => update("circleInstruction", v)}
              onChangeLabels={labels => update("circleLabels", labels)}
            />
          ) : form.type === "story-mountain" ? (
            <StoryMountainEditor
              prompt={form.smPrompt || ''}
              passage={form.smPassage || ''}
              hints={form.smHints || {}}
              onChangePrompt={v => update("smPrompt", v)}
              onChangePassage={v => update("smPassage", v)}
              onChangeHints={h => update("smHints", h)}
            />
          ) : form.type === "note" ? (
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
              {((catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0)).length > 0 && (
                <div className="field">
                  <label className="field-label">Linked Flashcard · 綁定單字卡</label>
                  <select
                    value={form.linkedFlashcardId || ""}
                    onChange={e => update("linkedFlashcardId", e.target.value || undefined)}
                    style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",background:"var(--bg)",color:"var(--ink)",borderRadius:2,fontSize:14}}
                  >
                    <option value="">— 不綁定 (None) —</option>
                    {(catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0).map(fc => (
                      <option key={fc.id} value={fc.id}>{fc.title} ({(fc.cards||[]).length} 張)</option>
                    ))}
                  </select>
                  <div className="field-help">學生進入測驗前會直接看到這組單字卡，不用自己選。</div>
                </div>
              )}
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
            <button className="btn danger" onClick={() => onDelete(form.id)}>
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
function Footer({ onOpenGuide }) {
  const gmailUrl = "https://mail.google.com/mail/?view=cm&fs=1&to=alan07050445%40gmail.com";
  const lineUrl = "https://line.me/R/ti/p/~9161791608";

  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <div className="footer-mark">Alan<em>'s</em> English Class</div>
            <p className="footer-tagline">
              對齊康橋國際學校每週進度的英文練習平台。<br/>
              單字、文法、字根字首、閱讀寫作，<br/>
              在家練的就是學校在教的。
            </p>
          </div>
          <div className="footer-col">
            <h4>學習項目</h4>
            <ul>
              <li><span className="footer-static">單字</span></li>
              <li><span className="footer-static">文法</span></li>
              <li><span className="footer-static">字根字首</span></li>
              <li><span className="footer-static">閱讀寫作</span></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>聯絡老師</h4>
            <ul>
              <li>
                <a href={gmailUrl} target="_blank" rel="noopener noreferrer" aria-label="使用 Gmail 聯絡 Alan 老師">
                  Email 聯絡
                </a>
              </li>
              <li>
                <a href={lineUrl} target="_blank" rel="noopener noreferrer" aria-label="使用 LINE 聯絡 Alan 老師">
                  LINE 諮詢
                </a>
              </li>
              {onOpenGuide && (
                <li>
                  <button className="footer-guide-btn" onClick={onOpenGuide}>新手教學</button>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="footer-baseline">
          <span>© {new Date().getFullYear()} Alan's English Class</span>
          <span>對齊康橋國際學校每週進度 · 用心製作</span>
        </div>
      </div>
    </footer>
  );
}

/* ───── Week Modal ───── */
function WeekModal({ open, existingIds, onClose, onSave, editWeek }) {
  // editWeek = { id, label, dateRange, theme, themeZh } for editing existing week
  const isEdit = !!editWeek;
  const [form, setForm] = useS(null);

  useE(() => {
    if (open) {
      setForm(isEdit ? { ...editWeek } : {
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
    onSave(payload, isEdit ? editWeek.id : null); // pass oldId when renaming
  };

  const conflict = !isEdit && existingIds?.includes(form.id);
  const idChanged = isEdit && form.id !== editWeek.id;
  // Exclude the week's own current ID so renaming to a truly new ID never false-fires
  const otherIds = (existingIds || []).filter(id => id !== (editWeek?.id || ''));
  const idConflict = idChanged && otherIds.includes(form.id);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isEdit ? 'Edit' : 'Add'} <em>{isEdit ? 'week' : 'new week'}</em></h3>
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
              格式：<code>YYYY-WNN</code>（例 <code>2026-W16</code>）。用來排序與識別。
              {(conflict || idConflict) && <span style={{color: "#c0392b", display: "block", marginTop: 4}}>⚠ 這個 ID 已經存在</span>}
              {idChanged && !idConflict && <span style={{color: "#b45309", display: "block", marginTop: 4}}>⚠ 將會把所有資料搬到新 ID「{form.id}」並刪除舊的</span>}
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
            <button className="btn primary" onClick={handleSave} disabled={conflict || idConflict || !form.id}>
              {isEdit ? 'Save Changes' : 'Add Week'}
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
  "circle-answer": { label: "Circle Answer", zh: "圈選題", embed: false, cta: "Start →" },
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

/* ── WritingPracticeEditor ── */
function WritingPracticeEditor({ catItems, linkedFlashcardId, prompts, onChangeLinkedFlashcardId, onChangePrompts }) {
  const [importing, setImporting] = useS(false);
  const [importText, setImportText] = useS('');
  const [importErr, setImportErr] = useS('');
  const flashcards = (catItems || []).filter(it => it.type === 'flashcard' && (it.cards || []).length > 0);

  const addPrompt = () => onChangePrompts([
    ...prompts,
    { id: 'wp' + Date.now() + Math.random().toString(36).slice(2, 5), word: '', zh: '', instruction: '' }
  ]);
  const updatePrompt = (id, field, value) => onChangePrompts(
    prompts.map(p => p.id === id ? { ...p, [field]: value } : p)
  );
  const deletePrompt = (id) => onChangePrompts(prompts.filter(p => p.id !== id));

  const doImport = () => {
    const parsed = [];
    importText.split('\n').map(line => line.trim()).filter(Boolean).forEach((line, index) => {
      // v251: 統一分隔符——Tab／|／「 - 」都吃
      const cols = (line.includes('\t') ? line.split('\t')
        : line.includes('|') ? line.split('|')
        : /\s+-\s+/.test(line) ? line.split(/\s+-\s+/)
        : [line]).map(c => c.trim().replace(/^"|"$/g, ''));
      const word = cols[0] || '';
      if (!word) return;
      parsed.push({
        id: 'wp' + Date.now() + index + Math.random().toString(36).slice(2, 4),
        word,
        zh: cols[1] || '',
        instruction: cols[2] || ''
      });
    });
    if (!parsed.length) {
      setImportErr('沒有可匯入的題目。格式：造句要求 [Tab] 中文提示（選填） [Tab] 補充規則（選填）');
      return;
    }
    onChangePrompts([...prompts, ...parsed]);
    setImportText('');
    setImportErr('');
    setImporting(false);
  };

  return (
    <div>
      <div className="field">
        <label className="field-label">Mode · 出題方式</label>
        <div className="field-help" style={{marginBottom:8}}>
          可以綁定單字卡，也可以在下方直接新增造句題；兩種可以同時存在。
        </div>
        <select
          value={linkedFlashcardId || ''}
          onChange={e => onChangeLinkedFlashcardId(e.target.value)}
          style={{width:"100%",padding:"9px 12px",border:"1px solid var(--border)",background:"var(--bg)",color:"var(--ink)",borderRadius:2,fontSize:14}}
        >
          <option value="">— 不綁定單字卡，使用自訂題目 —</option>
          {flashcards.map(fc => (
            <option key={fc.id} value={fc.id}>{fc.title} ({(fc.cards||[]).length} 張)</option>
          ))}
        </select>
        <div className="field-help">若有綁定單字卡，學生會先做單字卡造句；下方自訂題會接在後面。</div>
      </div>

      <div className="field">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <label className="field-label" style={{margin:0}}>Custom writing prompts · 自訂造句題 ({prompts.length})</label>
          <div style={{display:'flex',gap:6}}>
            <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}}
              onClick={() => { setImporting(v => !v); setImportErr(''); }}>
              {importing ? '✕ 取消' : '⬇ Import'}
            </button>
            <button className="btn primary" style={{fontSize:11,padding:'5px 12px'}} onClick={addPrompt}>+ Add</button>
          </div>
        </div>

        {importing && (
          <div style={{marginBottom:12,padding:'12px 14px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-paper)'}}>
            <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-muted)',marginBottom:8,lineHeight:1.7}}>
              每行一題。可從試算表貼上：造句要求 / 中文提示 / 補充規則。
            </div>
            <textarea
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportErr(''); }}
              placeholder={'because\t因為\tWrite a sentence using because.\nmy favorite animal\t我最喜歡的動物\tWrite at least 8 words.'}
              rows={7}
              style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:13,fontFamily:'var(--mono)',resize:'vertical',boxSizing:'border-box'}}
            />
            {importErr && <div style={{color:'#dc2626',fontSize:12,marginTop:5}}>{importErr}</div>}
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
              <button className="btn primary" style={{fontSize:12,padding:'6px 16px'}} onClick={doImport} disabled={!importText.trim()}>
                Import prompts
              </button>
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'0.8fr 0.8fr 1.2fr auto',gap:'6px 8px',alignItems:'center'}}>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)'}}>Prompt / Word</div>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)'}}>中文提示</div>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)'}}>Instruction（選填）</div>
          <div/>
          {prompts.map(p => (
            <React.Fragment key={p.id}>
              <input value={p.word || ''} onChange={e => updatePrompt(p.id, 'word', e.target.value)}
                placeholder="because / my favorite animal" style={{fontSize:13}} />
              <input value={p.zh || ''} onChange={e => updatePrompt(p.id, 'zh', e.target.value)}
                placeholder="因為 / 我最喜歡的動物" style={{fontSize:13}} />
              <input value={p.instruction || ''} onChange={e => updatePrompt(p.id, 'instruction', e.target.value)}
                placeholder="Write at least 8 words." style={{fontSize:13}} />
              <button onClick={() => deletePrompt(p.id)}
                style={{padding:'7px 10px',border:'1px solid var(--border)',borderRadius:2,background:'none',cursor:'pointer',color:'var(--ink-3)',fontSize:13}}
                title="Delete">✕</button>
            </React.Fragment>
          ))}
        </div>
        {prompts.length === 0 && (
          <div style={{padding:16,textAlign:'center',color:'var(--ink-faint)',fontSize:13}}>
            尚未新增自訂題。若不綁單字卡，請至少新增一題。
          </div>
        )}
      </div>
    </div>
  );
}

/* ── v254: SpellingEditor —— 聽寫單字清單（匯入 Tab/|/「 - 」＋逐列編輯＋試聽）── */
function SpellingEditor({ words, onChange }) {
  const [importing, setImporting] = useS(false);
  const [importText, setImportText] = useS('');

  const upd = (id, field, val) => onChange(words.map(w => w.id === id ? { ...w, [field]: val } : w));
  const del = (id) => onChange(words.filter(w => w.id !== id));
  const add = () => onChange([...words, { id: 'sp' + Date.now() + Math.random().toString(36).slice(2, 4), word: '', zh: '' }]);
  const doImport = () => {
    const parsed = importText.split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
      const cols = (line.includes('\t') ? line.split('\t')
        : line.includes('|') ? line.split('|')
        : /\s+-\s+/.test(line) ? line.split(/\s+-\s+/)
        : [line]).map(c => c.trim().replace(/^"|"$/g, ''));
      return { id: 'sp' + Date.now() + i + Math.random().toString(36).slice(2, 4), word: cols[0] || '', zh: cols[1] || '' };
    }).filter(w => w.word);
    if (!parsed.length) return;
    onChange([...words, ...parsed]);
    setImportText(''); setImporting(false);
  };
  const hear = (w) => { if (window.speakText && w.word) window.speakText(w.word, { lang: 'en-US', rate: 0.82 }); };

  return (
    <div className="spe">
      <div className="spe-bar">
        <span className="mono" style={{fontSize:10, color:"var(--ink-muted)"}}>{words.length} 個單字</span>
        <div style={{display:"flex", gap:8}}>
          <button type="button" className={"btn ghost"+(importing?" active":"")} style={{padding:"6px 12px",fontSize:11}} onClick={() => setImporting(v=>!v)}>⬇ Import</button>
          <button type="button" className="btn primary" style={{padding:"6px 12px",fontSize:11}} onClick={add}>+ 加一個</button>
        </div>
      </div>
      {importing && (
        <div className="fc-import-box">
          <div className="mono" style={{fontSize:10,color:"var(--ink-muted)",marginBottom:8}}>
            每行一個單字，欄位用 Tab（試算表直貼）、| 或「 - 」分隔：英文／中文提示（中文可省略）
          </div>
          <textarea className="fc-import-ta" rows={7} value={importText} onChange={e=>setImportText(e.target.value)}
            placeholder={"apple - 蘋果\nqueen - 女王\nbeautiful"}/>
          <div style={{display:"flex",gap:8,marginTop:8,justifyContent:"flex-end"}}>
            <button type="button" className="btn ghost" onClick={()=>{setImporting(false);setImportText('');}}>Cancel</button>
            <button type="button" className="btn primary" onClick={doImport} disabled={!importText.trim()}>Import</button>
          </div>
        </div>
      )}
      {words.length === 0 && !importing && (
        <div className="fc-card-empty mono">還沒有單字 — 點「+ 加一個」或 Import 匯入</div>
      )}
      {words.map((w, i) => (
        <div className="spe-row" key={w.id}>
          <span className="spe-num mono">{i + 1}</span>
          <input className="spe-word" value={w.word} placeholder="英文單字" onChange={e => upd(w.id, 'word', e.target.value)}/>
          <input className="spe-zh" value={w.zh || ''} placeholder="中文提示（選填）" onChange={e => upd(w.id, 'zh', e.target.value)}/>
          <button type="button" className="btn ghost spe-hear" title="試聽發音" onClick={() => hear(w)}>🔊</button>
          <button type="button" className="btn ghost spe-del" title="刪除" onClick={() => del(w.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

/* ── TypeAnswerEditor ── */
function TypeAnswerEditor({ pairs, instruction, onChangePairs, onChangeInstruction }) {
  const [importing, setImporting] = useS(false);
  const [importText, setImportText] = useS('');
  const [importErr,  setImportErr]  = useS('');

  const addPair  = () => onChangePairs([...pairs, { id: Date.now().toString(), prompt: '', answer: '', explain: '' }]);
  const delPair  = (id) => onChangePairs(pairs.filter(p => p.id !== id));
  const updPair  = (id, field, val) => onChangePairs(pairs.map(p => p.id === id ? {...p, [field]: val} : p));

  const doImport = () => {
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];
    const bad = [];
    lines.forEach((line, i) => {
      // v251: 統一分隔符——Tab／|／「 - 」，最後才試逗號（舊格式相容）
      const cols = (line.includes('\t') ? line.split('\t')
        : line.includes('|') ? line.split('|')
        : /\s+-\s+/.test(line) ? line.split(/\s+-\s+/)
        : line.split(',')).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2 || !cols[0] || !cols[1]) { bad.push(i + 1); return; }
      parsed.push({ id: Date.now().toString() + i, prompt: cols[0], answer: cols[1], explain: cols[2] || '' });
    });
    if (parsed.length === 0) { setImportErr('沒有可匯入的資料，請確認格式（每行：題目 TAB 答案）'); return; }
    onChangePairs([...pairs, ...parsed]);
    setImportText('');
    setImporting(false);
    setImportErr('');
  };

  return (
    <div>
      <div className="field">
        <label className="field-label">Instruction · 指示（選填）</label>
        <input
          value={instruction}
          onChange={e => onChangeInstruction(e.target.value)}
          placeholder="e.g. Type the irregular past tense"
          style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:14}}
        />
        <div className="field-help">學生作答時會看到這行說明（不填則只顯示題目）。</div>
      </div>

      <div className="field">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <label className="field-label" style={{margin:0}}>題目 · Pairs ({pairs.length})</label>
          <button
            className="btn ghost"
            style={{fontSize:11,padding:'4px 10px'}}
            onClick={() => { setImporting(i => !i); setImportErr(''); }}
          >
            {importing ? '✕ 取消' : '📋 貼上匯入'}
          </button>
        </div>

        {importing && (
          <div style={{marginBottom:12,padding:'12px 14px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-cream,#f7f3eb)'}}>
            <div style={{fontSize:12,fontFamily:'var(--mono)',color:'var(--ink-3)',marginBottom:8}}>
              從 Excel / Google Sheets 複製，貼上後按「匯入」。<br/>
              格式：<strong>第一欄 = Prompt</strong>，<strong>第二欄 = Answer</strong>，<strong>第三欄 = Explain（選填）</strong>，Tab 分隔。
            </div>
            <textarea
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportErr(''); }}
              placeholder={'go\twent\nThe dog ____ fast. (run)\truns\t"The dog" is singular → runs'}
              rows={6}
              style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:13,fontFamily:'var(--mono)',resize:'vertical',boxSizing:'border-box'}}
            />
            {importErr && <div style={{color:'#dc2626',fontSize:12,marginTop:4}}>{importErr}</div>}
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button className="btn primary" style={{fontSize:12,padding:'6px 16px'}} onClick={doImport} disabled={!importText.trim()}>
                匯入 {importText.trim() ? `(${importText.split('\n').filter(l=>l.trim()).length} 行)` : ''}
              </button>
              <button className="btn ghost" style={{fontSize:12,padding:'6px 14px'}} onClick={() => { setImporting(false); setImportErr(''); }}>
                取消
              </button>
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 0.7fr 1.2fr auto',gap:'6px 8px',alignItems:'center',marginBottom:8}}>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)',paddingLeft:2}}>Prompt（題目）</div>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)',paddingLeft:2}}>Answer（答案）</div>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)',paddingLeft:2}}>Explain（詳解，選填）</div>
          <div/>
          {pairs.map(p => (
            <React.Fragment key={p.id}>
              <input
                value={p.prompt}
                onChange={e => updPair(p.id, 'prompt', e.target.value)}
                placeholder="The dog ____ fast. (run)"
                style={{padding:'7px 10px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:13}}
              />
              <input
                value={p.answer}
                onChange={e => updPair(p.id, 'answer', e.target.value)}
                placeholder="runs"
                style={{padding:'7px 10px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:13}}
              />
              <input
                value={p.explain || ''}
                onChange={e => updPair(p.id, 'explain', e.target.value)}
                placeholder="e.g. singular subject → verb+s"
                style={{padding:'7px 10px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink-soft)',borderRadius:2,fontSize:12,fontStyle:'italic'}}
              />
              <button
                onClick={() => delPair(p.id)}
                style={{padding:'7px 10px',border:'1px solid var(--border)',borderRadius:2,background:'none',cursor:'pointer',color:'var(--ink-3)',fontSize:13}}
                title="Delete"
              >✕</button>
            </React.Fragment>
          ))}
        </div>
        <button className="btn ghost" style={{fontSize:12,padding:'6px 14px'}} onClick={addPair}>
          ＋ Add pair
        </button>
        <div className="field-help">Explain 欄（選填）：答題後顯示給學生，說明語法規則或答題邏輯。</div>
      </div>
    </div>
  );
}

/* ── ShortAnswerEditor ── */
function ShortAnswerEditor({ passage, questions, saYoutube, onChangePassage, onChangeQuestions, onChangeSaYoutube }) {
  const [importing, setImporting] = useS(false);
  const [importText, setImportText] = useS('');
  const [importErr, setImportErr] = useS('');

  const addQ = () => {
    const id = 'sa' + Date.now() + Math.random().toString(36).slice(2,5);
    onChangeQuestions([...questions, { id, question: '', keyPoints: '' }]);
  };
  const updateQ = (id, patch) => onChangeQuestions(questions.map(q => q.id === id ? {...q,...patch} : q));
  const deleteQ = (id) => onChangeQuestions(questions.filter(q => q.id !== id));

  const doImport = () => {
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { setImportErr('沒有內容可匯入'); return; }
    const parsed = lines.map((line, i) => {
      const parts = line.split('\t');
      const question  = parts[0]?.trim() || '';
      const keyPoints = parts[1]?.trim() || '';
      if (!question) return null;
      return { id: 'sa' + Date.now() + i + Math.random().toString(36).slice(2,4), question, keyPoints };
    }).filter(Boolean);
    if (!parsed.length) { setImportErr('請確認格式：每行至少一欄（問題）'); return; }
    onChangeQuestions([...questions, ...parsed]);
    setImportText(''); setImporting(false); setImportErr('');
  };

  return (
    <div>
      {/* YouTube URL for intro review */}
      <div className="field">
        <label className="field-label">▶ 複習影片 YouTube URL（選填）</label>
        <input
          value={saYoutube || ''}
          onChange={e => onChangeSaYoutube(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',
            background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:14,boxSizing:'border-box'}}
        />
        <div className="field-help">
          填入後，學生在開始測驗前的「準備」畫面可以先看這支影片複習。進入作答後影片不會再顯示。
        </div>
      </div>

      <div className="field">
        <label className="field-label">📄 AI 參考文章 Passage（學生不可見）</label>
        <textarea
          value={passage}
          onChange={e => onChangePassage(e.target.value)}
          placeholder="貼上文章文字，AI 批改時會參考這段內容判斷答案是否正確…"
          rows={8}
          style={{width:'100%',fontFamily:'var(--sans)',fontSize:14,padding:'10px 12px',
            border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',
            borderRadius:2,resize:'vertical',lineHeight:1.7,boxSizing:'border-box'}}
        />
        <div className="field-help">⚠ 這段文字只供 AI 批改用，學生作答時不會看到。</div>
      </div>

      <div className="field">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <label className="field-label" style={{margin:0}}>問題 Questions ({questions.length})</label>
          <div style={{display:'flex',gap:6}}>
            <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}}
              onClick={() => { setImporting(v=>!v); setImportErr(''); }}>
              {importing ? '✕ 取消' : '⬇ Import'}
            </button>
            <button className="btn primary" style={{fontSize:11,padding:'5px 12px'}} onClick={addQ}>+ Add</button>
          </div>
        </div>

        {importing && (
          <div style={{marginBottom:12,padding:'12px 14px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-paper)'}}>
            <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-muted)',marginBottom:8}}>
              從 Excel / Google Sheets 複製貼上：
              <code style={{background:'var(--border-soft)',padding:'1px 4px',borderRadius:2,marginLeft:4}}>
                問題 [Tab] 答案要點（選填）
              </code>
              <span style={{display:'block',marginTop:4,color:'var(--ink-faint)'}}>
                · 每行一題，答案要點那欄可以留空
              </span>
            </div>
            <textarea
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportErr(''); }}
              placeholder={"What did the boy do when he saw the fire?\tHe called 119 / He ran for help\nWhere did the family go after the flood?\tThey went to a shelter\nWhy was the dog barking?"}
              rows={6}
              style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',
                background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:12,
                fontFamily:'var(--mono)',resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}
            />
            {importErr && <div style={{color:'#dc2626',fontSize:12,marginTop:4}}>{importErr}</div>}
            <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'flex-end'}}>
              <button className="btn ghost" style={{fontSize:12,padding:'6px 14px'}}
                onClick={() => { setImporting(false); setImportText(''); setImportErr(''); }}>
                取消
              </button>
              <button className="btn primary" style={{fontSize:12,padding:'6px 16px'}}
                onClick={doImport} disabled={!importText.trim()}>
                匯入 {importText.trim() ? `(${importText.split('\n').filter(l=>l.trim()).length} 題)` : ''}
              </button>
            </div>
          </div>
        )}

        <div className="fc-card-list">
          {questions.length === 0 && (
            <div className="fc-card-empty mono">尚未新增問題 — 點選右上方 Add</div>
          )}
          {questions.map((q, i) => (
            <div key={q.id} className="fc-card-row open">
              <div className="fc-card-row-head" style={{cursor:'default'}}>
                <span className="mono" style={{color:'var(--ink-faint)',fontSize:10,minWidth:18,flexShrink:0}}>{i+1}</span>
                <span className="fc-row-term" style={{fontSize:13}}>
                  {q.question || <em style={{color:'var(--ink-faint)'}}>未填寫</em>}
                </span>
                <button
                  onClick={() => { if(confirm('Delete?')) deleteQ(q.id); }}
                  style={{color:'var(--accent)',background:'none',border:'none',cursor:'pointer',fontSize:13,flexShrink:0}}
                >✕</button>
              </div>
              <div className="fc-card-row-body" style={{gridTemplateColumns:'1fr'}}>
                <div className="fc-card-fields">
                  <div className="field">
                    <label className="field-label">問題 Question</label>
                    <input
                      value={q.question}
                      onChange={e => updateQ(q.id, {question: e.target.value})}
                      placeholder="What did the boy do when he saw the fire?"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">
                      答案要點 Key Points
                      <span style={{fontWeight:400,textTransform:'none',color:'var(--ink-muted)',marginLeft:6}}>(AI 評分依據，選填)</span>
                    </label>
                    <input
                      value={q.keyPoints || ''}
                      onChange={e => updateQ(q.id, {keyPoints: e.target.value})}
                      placeholder="He called 119 / He ran to get help / He stayed calm"
                    />
                    <div className="field-help">用 / 分隔多個要點。AI 會參考這些要點決定給幾顆星。</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── SyllableDivEditor ── */
function SyllableDivEditor({ words, onChangeWords }) {
  const [importing, setImporting] = useS(false);
  const [importText, setImportText] = useS('');
  const [importErr, setImportErr] = useS('');

  const addWord  = () => onChangeWords([...words, { id: Date.now().toString(), word: '', answer: '' }]);
  const delWord  = (id) => onChangeWords(words.filter(w => w.id !== id));
  const updWord  = (id, field, val) => onChangeWords(words.map(w => w.id === id ? {...w, [field]: val} : w));

  const doImport = () => {
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];
    lines.forEach((line, i) => {
      const parts = line.split('\t');
      const word   = parts[0]?.trim() || '';
      const answer = parts[1]?.trim() || '';
      if (!word) return;
      parsed.push({ id: Date.now().toString() + i, word, answer });
    });
    if (!parsed.length) { setImportErr('沒有可匯入的資料，請確認格式'); return; }
    onChangeWords([...words, ...parsed]);
    setImportText(''); setImporting(false); setImportErr('');
  };

  return (
    <div>
      <div className="field">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <label className="field-label" style={{margin:0}}>單字 Words ({words.length})</label>
          <div style={{display:'flex',gap:6}}>
            <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}}
              onClick={() => { setImporting(v=>!v); setImportErr(''); }}>
              {importing ? '✕ 取消' : '⬇ Import'}
            </button>
            <button className="btn primary" style={{fontSize:11,padding:'5px 12px'}} onClick={addWord}>+ Add</button>
          </div>
        </div>

        {importing && (
          <div style={{marginBottom:12,padding:'12px 14px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-paper,#f9f7f2)'}}>
            <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-muted)',marginBottom:8}}>
              從 Excel / Google Sheets 複製貼上：<br/>
              <code style={{background:'rgba(0,0,0,0.06)',padding:'1px 5px',borderRadius:2}}>
                單字 [Tab] 切法（例 sur/prise）
              </code>
              <span style={{display:'block',marginTop:4,color:'var(--ink-faint)'}}>
                · 切法欄可以先留空，之後在表格裡補上<br/>
                · 用 / 標示切割點：con/tract、mon/ster
              </span>
            </div>
            <textarea
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportErr(''); }}
              placeholder={'surprise\tsur/prise\nmonster\tmon/ster\nhundred\thun/dred\ncontract\tcon/tract'}
              rows={6}
              style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',
                background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:12,
                fontFamily:'var(--mono)',resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}
            />
            {importErr && <div style={{color:'#dc2626',fontSize:12,marginTop:4}}>{importErr}</div>}
            <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'flex-end'}}>
              <button className="btn ghost" style={{fontSize:12,padding:'6px 14px'}}
                onClick={() => { setImporting(false); setImportText(''); setImportErr(''); }}>取消</button>
              <button className="btn primary" style={{fontSize:12,padding:'6px 16px'}}
                onClick={doImport} disabled={!importText.trim()}>
                匯入 {importText.trim() ? `(${importText.split('\n').filter(l=>l.trim()).length} 個)` : ''}
              </button>
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'6px 8px',alignItems:'center',marginBottom:8}}>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)',paddingLeft:2}}>Word（單字）</div>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)',paddingLeft:2}}>Answer（切法 · 用 / 分隔）</div>
          <div/>
          {words.map(w => (
            <React.Fragment key={w.id}>
              <input
                value={w.word}
                onChange={e => updWord(w.id, 'word', e.target.value)}
                placeholder="surprise"
                style={{padding:'7px 10px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:14}}
              />
              <input
                value={w.answer}
                onChange={e => updWord(w.id, 'answer', e.target.value)}
                placeholder="sur/prise"
                style={{padding:'7px 10px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:14,fontFamily:'var(--mono)'}}
              />
              <button
                onClick={() => delWord(w.id)}
                style={{padding:'7px 10px',border:'1px solid var(--border)',borderRadius:2,background:'none',cursor:'pointer',color:'var(--ink-3)',fontSize:13}}
              >✕</button>
            </React.Fragment>
          ))}
        </div>
        {words.length === 0 && (
          <div style={{padding:'12px',textAlign:'center',color:'var(--ink-faint)',fontStyle:'italic',fontSize:13}}>
            尚未新增單字 — 點選右上方 Add 或 Import
          </div>
        )}
        <div className="field-help">
          Answer 欄位用 / 標示切割點，例如：<code>sur/prise</code>、<code>mon/ster</code>、<code>hun/dred</code>。可有多個切割點：<code>ath/let/ic</code>。
        </div>
      </div>
    </div>
  );
}

/* ── WordSortEditor ── */
function WordSortEditor({ categories, words, suffixMode, onChangeCategories, onChangeWords, onChangeSuffixMode }) {
  const [catInput, setCatInput] = useS(categories.join(', '));
  const [importing, setImporting] = useS(false);
  const [importText, setImportText] = useS('');
  const [importErr, setImportErr]   = useS('');

  // Sync catInput → categories on blur
  const commitCats = () => {
    const cats = catInput.split(/[,\n]+/).map(c => c.trim()).filter(Boolean);
    onChangeCategories(cats);
  };

  const addWord  = () => onChangeWords([...words, { id: Date.now().toString(), word: '', category: categories[0] || '' }]);
  const delWord  = (id) => onChangeWords(words.filter(w => w.id !== id));
  const updWord  = (id, field, val) => onChangeWords(words.map(w => w.id === id ? {...w, [field]: val} : w));

  const doImport = () => {
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = [];
    lines.forEach((line, i) => {
      const parts = line.split('\t');
      const word     = parts[0]?.trim() || '';
      const category = parts[1]?.trim() || '';
      if (!word) return;
      parsed.push({ id: Date.now().toString() + i, word, category });
    });
    if (!parsed.length) { setImportErr('請確認格式'); return; }
    onChangeWords([...words, ...parsed]);
    setImportText(''); setImporting(false); setImportErr('');
  };

  return (
    <div>
      {/* Categories */}
      <div className="field">
        <label className="field-label">分類欄位 Categories</label>
        <input
          value={catInput}
          onChange={e => setCatInput(e.target.value)}
          onBlur={commitCats}
          placeholder="-le, -ture, -ive, -ize"
          style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:14}}
        />
        <div className="field-help">
          用逗號分隔每個分類名稱，例如：<code>-le, -ture, -ive, -ize</code> 或 <code>VV, VCV, VCCV</code>
        </div>
      </div>

      {/* Suffix Mode Toggle */}
      <div className="field">
        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',userSelect:'none'}}>
          <input
            type="checkbox"
            checked={suffixMode}
            onChange={e => onChangeSuffixMode(e.target.checked)}
            style={{width:16,height:16,accentColor:'var(--accent)',cursor:'pointer'}}
          />
          <span style={{fontSize:14,fontWeight:600}}>字尾組合模式 Suffix Mode</span>
        </label>
        {suffixMode ? (
          <div className="field-help" style={{marginTop:6}}>
            ✅ 已開啟：單字填入<strong>字根</strong>（不含底線），例如 <code>final</code>、<code>cap</code>。<br/>
            分類名稱設定字尾，例如 <code>-le, -ture</code>。<br/>
            學生看到 <code>final_</code>，放進 <code>-le</code> 欄後自動顯示 <code>finale</code>。
          </div>
        ) : (
          <div className="field-help" style={{marginTop:6}}>
            關閉：單字原樣顯示（一般分類模式）。開啟後可做字尾拼接練習。
          </div>
        )}
      </div>

      {/* Words */}
      <div className="field">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
          <label className="field-label" style={{margin:0}}>單字 Words ({words.length})</label>
          <div style={{display:'flex',gap:6}}>
            <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}}
              onClick={() => { setImporting(v=>!v); setImportErr(''); }}>
              {importing ? '✕ 取消' : '⬇ Import'}
            </button>
            <button className="btn primary" style={{fontSize:11,padding:'5px 12px'}} onClick={addWord}>+ Add</button>
          </div>
        </div>

        {importing && (
          <div style={{marginBottom:12,padding:'12px 14px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-paper,#f9f7f2)'}}>
            <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-muted)',marginBottom:8}}>
              從 Excel / Google Sheets 複製貼上：<br/>
              <code style={{background:'rgba(0,0,0,0.06)',padding:'1px 5px',borderRadius:2}}>
                {suffixMode ? '字根 [Tab] 分類名稱' : '單字 [Tab] 分類名稱'}
              </code>
              <span style={{display:'block',marginTop:4,color:'var(--ink-faint)'}}>
                分類名稱要和上方的欄位名稱完全一致，例如：<code>{suffixMode ? 'final [Tab] -le' : 'candle [Tab] -le'}</code>
              </span>
            </div>
            <textarea
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportErr(''); }}
              placeholder={suffixMode ? 'final\t-le\ncap\t-ture\nposit\t-ive\nvisual\t-ize' : 'candle\t-le\ncreature\t-ture\nactive\t-ive\nfinalize\t-ize'}
              rows={6}
              style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',
                background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:12,
                fontFamily:'var(--mono)',resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}
            />
            {importErr && <div style={{color:'#dc2626',fontSize:12,marginTop:4}}>{importErr}</div>}
            <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'flex-end'}}>
              <button className="btn ghost" style={{fontSize:12,padding:'6px 14px'}}
                onClick={() => { setImporting(false); setImportText(''); setImportErr(''); }}>取消</button>
              <button className="btn primary" style={{fontSize:12,padding:'6px 16px'}}
                onClick={doImport} disabled={!importText.trim()}>
                匯入 {importText.trim() ? `(${importText.split('\n').filter(l=>l.trim()).length} 個)` : ''}
              </button>
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'6px 8px',alignItems:'center',marginBottom:8}}>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)',paddingLeft:2}}>{suffixMode ? '字根 Stem（不含底線）' : 'Word（單字）'}</div>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)',paddingLeft:2}}>Category（分類）</div>
          <div/>
          {words.map(w => (
            <React.Fragment key={w.id}>
              <input
                value={w.word}
                onChange={e => updWord(w.id, 'word', e.target.value)}
                placeholder={suffixMode ? "final（字根，不含底線）" : "candle"}
                style={{padding:'7px 10px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:14}}
              />
              {categories.length > 0 ? (
                <select
                  value={w.category}
                  onChange={e => updWord(w.id, 'category', e.target.value)}
                  style={{padding:'7px 10px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:14}}
                >
                  <option value="">— 選分類 —</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              ) : (
                <input
                  value={w.category}
                  onChange={e => updWord(w.id, 'category', e.target.value)}
                  placeholder="先輸入上方分類欄位"
                  style={{padding:'7px 10px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:14}}
                />
              )}
              <button
                onClick={() => delWord(w.id)}
                style={{padding:'7px 10px',border:'1px solid var(--border)',borderRadius:2,background:'none',cursor:'pointer',color:'var(--ink-3)',fontSize:13}}
              >✕</button>
            </React.Fragment>
          ))}
        </div>
        {words.length === 0 && (
          <div style={{padding:'12px',textAlign:'center',color:'var(--ink-faint)',fontStyle:'italic',fontSize:13}}>
            尚未新增單字 — 點選右上方 Add 或 Import
          </div>
        )}
        <div className="field-help">
          預覽：學生將看到所有單字打亂後，逐一點選分到正確欄位。
        </div>
      </div>
    </div>
  );
}

/* ── EssayEditor ── */
function EssayEditor({ prompt, scaffold, onChangePrompt, onChangeScaffold }) {
  return (
    <div>
      {/* Essay prompt */}
      <div className="field">
        <label className="field-label">✍ 作文題目 Essay Prompt</label>
        <textarea
          value={prompt}
          onChange={e => onChangePrompt(e.target.value)}
          placeholder="例：Do you think students should have less homework? Give your opinion with reasons and examples."
          rows={4}
          style={{width:'100%',fontFamily:'var(--sans)',fontSize:14,padding:'10px 12px',
            border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',
            borderRadius:2,resize:'vertical',lineHeight:1.7,boxSizing:'border-box'}}
        />
        <div className="field-help">學生作答時會看到這個題目。請用完整英文句子描述題目。</div>
      </div>

      {/* Scaffold / hint */}
      <div className="field">
        <label className="field-label">📋 寫作架構提示 Scaffold（選填）</label>
        <textarea
          value={scaffold}
          onChange={e => onChangeScaffold(e.target.value)}
          placeholder={`例：\nClaim → Reason 1 → Example 1 → Reason 2 → Example 2 → Conclusion\n\nUseful words: First, Also, For example, That is why, In conclusion`}
          rows={5}
          style={{width:'100%',fontFamily:'var(--mono)',fontSize:13,padding:'10px 12px',
            border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',
            borderRadius:2,resize:'vertical',lineHeight:1.7,boxSizing:'border-box'}}
        />
        <div className="field-help">
          選填。學生作答頁面會顯示這段架構提示，幫助他們組織文章。
          可以列出結構、有用的連接詞或評分標準。
        </div>
      </div>

      <div style={{padding:'12px 16px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:6,fontSize:13,color:'#166534',lineHeight:1.7}}>
        <strong>AI 批改標準（自動套用）：</strong><br/>
        Claim · Reasons · Examples · Explanation · Conclusion · Organization · Grammar<br/>
        AI 會給出 Score ⭐⭐⭐⭐⭐、Good Job（客觀優點）、To Improve（客觀改進點）、Better Version。
      </div>
    </div>
  );
}

/* ── StoryMountainEditor ── */
const SM_STAGE_KEYS = ['intro','rising','climax','falling','resolution'];
const SM_STAGE_LABELS = { intro:'Introduction', rising:'Rising Action', climax:'Climax', falling:'Falling Action', resolution:'Resolution' };
const SM_STAGE_EMOJIS = { intro:'🏠', rising:'📈', climax:'⭐', falling:'📉', resolution:'🏁' };

function StoryMountainEditor({ prompt, passage, hints, onChangePrompt, onChangePassage, onChangeHints }) {
  const updateHint = (key, val) => onChangeHints({ ...hints, [key]: val });
  return (
    <div>
      {/* Writing topic */}
      <div className="field">
        <label className="field-label">🏔 寫作題目 Writing Topic</label>
        <textarea
          value={prompt}
          onChange={e => onChangePrompt(e.target.value)}
          placeholder="例：Write a story about a brave student who faced a big challenge at school."
          rows={3}
          style={{width:'100%',fontFamily:'var(--sans)',fontSize:14,padding:'10px 12px',
            border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',
            borderRadius:2,resize:'vertical',lineHeight:1.7,boxSizing:'border-box'}}
        />
        <div className="field-help">學生作答時看到的題目。如果是閱讀分析（學生根據文章填寫），可以不填。</div>
      </div>

      {/* Reference story/passage */}
      <div className="field">
        <label className="field-label">📄 參考文章文字稿（選填）</label>
        <textarea
          value={passage}
          onChange={e => onChangePassage(e.target.value)}
          placeholder="貼上課堂故事或閱讀文章。AI 批改時會用這篇文章判斷學生的 Story Mountain 是否正確..."
          rows={6}
          style={{width:'100%',fontFamily:'var(--sans)',fontSize:13,padding:'10px 12px',
            border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',
            borderRadius:2,resize:'vertical',lineHeight:1.7,boxSizing:'border-box'}}
        />
        <div className="field-help">
          ✅ <strong>閱讀分析</strong>：貼上文章，AI 比對學生的 Story Mountain 是否符合原文<br/>
          ✅ <strong>創意寫作</strong>：不填，AI 直接根據故事本身判斷邏輯
        </div>
      </div>

      {/* Per-stage hints */}
      <div className="field">
        <label className="field-label">💡 各階段提示（選填）</label>
        <div className="field-help" style={{marginBottom:10}}>每個階段可設定提示語，引導學生知道要寫什麼。</div>
        {SM_STAGE_KEYS.map(key => (
          <div key={key} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:8}}>
            <span style={{fontSize:13,fontWeight:700,width:130,flexShrink:0,paddingTop:9,color:'var(--ink)'}}>
              {SM_STAGE_EMOJIS[key]} {SM_STAGE_LABELS[key]}
            </span>
            <input
              value={hints[key] || ''}
              onChange={e => updateHint(key, e.target.value)}
              placeholder={
                key==='intro' ? 'Who are the main characters? Where does the story happen?' :
                key==='rising' ? 'What problem or challenge starts to appear?' :
                key==='climax' ? 'What is the most exciting or most difficult moment?' :
                key==='falling' ? 'How does the character start to deal with the problem?' :
                'How does the story end? What did the character learn?'
              }
              style={{flex:1,padding:'7px 10px',border:'1px solid var(--border)',
                background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:13}}
            />
          </div>
        ))}
      </div>

      <div style={{padding:'12px 16px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:6,fontSize:13,color:'#166534',lineHeight:1.7}}>
        <strong>AI 批改標準（自動套用）：</strong><br/>
        Score ⭐⭐⭐⭐⭐ · Good Job（客觀優點）· To Improve（客觀改進點）· Better Version
      </div>
    </div>
  );
}

/* ── CircleAnswerEditor ── */
function CircleAnswerEditor({ questions, instruction, labels, onChangeQuestions, onChangeInstruction, onChangeLabels }) {
  const [labelText, setLabelText] = useS((labels || []).join(', '));
  const [importing, setImporting] = useS(false);
  const [importText, setImportText] = useS('');
  const [importErr, setImportErr] = useS('');

  useE(() => { setLabelText((labels || []).join(', ')); }, [JSON.stringify(labels || [])]);

  const commitLabels = (raw = labelText) => {
    const next = raw.split(/[,\n]+/).map(v => v.trim()).filter(Boolean);
    onChangeLabels([...new Set(next)]);
  };
  const addQuestion = () => onChangeQuestions([
    ...questions,
    { id: 'circle' + Date.now() + Math.random().toString(36).slice(2, 5), sentence: '', answer: '', label: '' }
  ]);
  const updateQuestion = (id, field, value) => onChangeQuestions(
    questions.map(q => q.id === id ? { ...q, [field]: value } : q)
  );
  const deleteQuestion = (id) => onChangeQuestions(questions.filter(q => q.id !== id));

  const doImport = () => {
    const parsed = [];
    const foundLabels = [];
    importText.split('\n').map(line => line.trim()).filter(Boolean).forEach((line, index) => {
      const separator = line.includes('\t') ? '\t' : line.includes('|') ? '|' : null;
      if (!separator) return;
      const cols = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
      if (!cols[0] || !cols[1]) return;
      parsed.push({
        id: 'circle' + Date.now() + index + Math.random().toString(36).slice(2, 4),
        sentence: cols[0],
        answer: cols[1],
        label: cols[2] || ''
      });
      if (cols[2]) foundLabels.push(cols[2]);
    });
    if (!parsed.length) {
      setImportErr('沒有可匯入的題目。請使用：句子 [Tab] 要圈的答案 [Tab] 分類答案（選填）');
      return;
    }
    onChangeQuestions([...questions, ...parsed]);
    if (foundLabels.length) {
      const nextLabels = [...new Set([...(labels || []), ...foundLabels])];
      onChangeLabels(nextLabels);
      setLabelText(nextLabels.join(', '));
    }
    setImportText('');
    setImportErr('');
    setImporting(false);
  };

  return (
    <div>
      <div className="field">
        <label className="field-label">Instruction · 作答指示</label>
        <input
          value={instruction}
          onChange={e => onChangeInstruction(e.target.value)}
          placeholder="Circle the adjective or adverb in the sentence."
        />
      </div>

      <div className="field">
        <label className="field-label">Optional classification choices · 第二步分類選項（選填）</label>
        <input
          value={labelText}
          onChange={e => setLabelText(e.target.value)}
          onBlur={() => commitLabels()}
          placeholder="adjective, adverb"
        />
        <div className="field-help">
          留空時學生只要圈答案；填入選項後，學生還需要完成第二步分類。
        </div>
      </div>

      <div className="field">
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
          <label className="field-label" style={{margin:0}}>Questions · 題目 ({questions.length})</label>
          <div style={{display:'flex', gap:6}}>
            <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}}
              onClick={() => { setImporting(v => !v); setImportErr(''); }}>
              {importing ? '✕ 取消' : '⬇ Import'}
            </button>
            <button className="btn primary" style={{fontSize:11,padding:'5px 12px'}} onClick={addQuestion}>+ Add</button>
          </div>
        </div>

        {importing && (
          <div style={{marginBottom:12,padding:'12px 14px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-paper)'}}>
            <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-muted)',marginBottom:8,lineHeight:1.7}}>
              從 Excel / Google Sheets 貼上三欄：句子、要圈的答案、分類答案（選填）。
            </div>
            <textarea
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportErr(''); }}
              placeholder={'The tiny bird sat on the tree.\ttiny\tadjective\nWe will clean the room soon.\tsoon\tadverb'}
              rows={7}
              style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:13,fontFamily:'var(--mono)',resize:'vertical',boxSizing:'border-box'}}
            />
            {importErr && <div style={{color:'#dc2626',fontSize:12,marginTop:5}}>{importErr}</div>}
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
              <button className="btn primary" style={{fontSize:12,padding:'6px 16px'}} onClick={doImport} disabled={!importText.trim()}>
                Import questions
              </button>
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1.8fr .55fr .65fr auto',gap:'6px 8px',alignItems:'center'}}>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)'}}>Sentence · 句子</div>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)'}}>Circle · 圈出</div>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-3)'}}>Classify · 分類</div>
          <div/>
          {questions.map(q => (
            <React.Fragment key={q.id}>
              <input value={q.sentence || ''} onChange={e => updateQuestion(q.id, 'sentence', e.target.value)}
                placeholder="The tiny bird sat on the tree." style={{fontSize:13}} />
              <input value={q.answer || ''} onChange={e => updateQuestion(q.id, 'answer', e.target.value)}
                placeholder="tiny" style={{fontSize:13}} />
              <input value={q.label || ''} onChange={e => updateQuestion(q.id, 'label', e.target.value)}
                placeholder="optional" list="circle-label-options" style={{fontSize:13}} />
              <button onClick={() => deleteQuestion(q.id)}
                style={{padding:'7px 10px',border:'1px solid var(--border)',borderRadius:2,background:'none',cursor:'pointer',color:'var(--ink-3)',fontSize:13}}
                title="Delete">✕</button>
            </React.Fragment>
          ))}
        </div>
        <datalist id="circle-label-options">
          {(labels || []).map(label => <option key={label} value={label}/>)}
        </datalist>
        {questions.length === 0 && (
          <div style={{padding:16,textAlign:'center',color:'var(--ink-faint)',fontSize:13}}>
            尚未新增題目 — 使用 Add 或 Import
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ClozeEditor ── */
function ClozeEditor({ passage, onChangePassage }) {
  const [importing,    setImporting]    = useS(false);
  const [importPassage, setImportPassage] = useS('');
  const [importAnswers, setImportAnswers] = useS('');
  const [importErr,    setImportErr]    = useS('');

  const blankCount = (passage.match(/\[[^\]]+\]/g) || []).length;

  const doImport = () => {
    setImportErr('');
    const passageText = importPassage.trim();
    if (!passageText) { setImportErr('請貼上文章內容'); return; }

    // Find all ___ (with optional hint like (have))
    const blankRegex = /___(?:\s*\(([^)]*)\))?/g;
    const blanksFound = [...passageText.matchAll(blankRegex)];
    if (blanksFound.length === 0) { setImportErr('在文章中找不到 ___ 空格，請確認格式'); return; }

    // Parse answers (one per line, ignore empty lines)
    const answers = importAnswers.split('\n').map(l => l.trim()).filter(Boolean);
    if (answers.length === 0) { setImportErr('請在右欄填入答案（每行一個）'); return; }
    if (answers.length !== blanksFound.length) {
      setImportErr(`空格數 (${blanksFound.length}) 與答案數 (${answers.length}) 不符，請確認`);
      return;
    }

    // Replace each ___ with [answer](hint) or [answer]
    let idx = 0;
    const result = passageText.replace(/___(?:\s*\(([^)]*)\))?/g, (match, hint) => {
      const ans = answers[idx++] || '';
      return hint ? `[${ans}](${hint})` : `[${ans}]`;
    });

    onChangePassage(result);
    setImporting(false);
    setImportPassage('');
    setImportAnswers('');
  };

  return (
    <div>
      {/* Import panel */}
      <div className="field">
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
          <label className="field-label" style={{margin:0}}>文章內容 Passage</label>
          <button
            className={"btn ghost" + (importing ? " active" : "")}
            style={{fontSize:11, padding:'4px 12px'}}
            onClick={() => { setImporting(v => !v); setImportErr(''); }}
          >
            {importing ? '✕ 取消' : '⬇ Import'}
          </button>
        </div>

        {importing && (
          <div style={{marginBottom:14, padding:'14px 16px', border:'1px solid var(--border)', borderRadius:6, background:'var(--bg-paper)'}}>
            <div style={{fontSize:12, fontFamily:'var(--mono)', color:'var(--ink-muted)', marginBottom:12, lineHeight:1.7}}>
              左欄貼入原始文章（用 <code style={{background:'rgba(0,0,0,0.06)',padding:'1px 4px',borderRadius:2}}>___</code> 當空格，括號提示保留）；
              右欄每行貼一個答案，順序需與空格一致。
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              <div>
                <div style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-muted)', marginBottom:4}}>
                  文章（___ 當空格）
                </div>
                <textarea
                  value={importPassage}
                  onChange={e => { setImportPassage(e.target.value); setImportErr(''); }}
                  rows={10}
                  placeholder={"Two summers ago we ___ (have) a holiday in Scotland. We ___ (drive) there from London, but our car ___ (break) down on the motorway and we ___ (spend) the first night in Birmingham."}
                  style={{width:'100%', fontFamily:'var(--sans)', fontSize:13, padding:'9px 10px',
                    border:'1px solid var(--border)', background:'var(--bg)', color:'var(--ink)',
                    borderRadius:2, resize:'vertical', lineHeight:1.8, boxSizing:'border-box'}}
                />
              </div>
              <div>
                <div style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--ink-muted)', marginBottom:4}}>
                  答案（每行一個，照順序）
                </div>
                <textarea
                  value={importAnswers}
                  onChange={e => { setImportAnswers(e.target.value); setImportErr(''); }}
                  rows={10}
                  placeholder={"had\ndrove\nbroke\nspent"}
                  style={{width:'100%', fontFamily:'var(--mono)', fontSize:14, padding:'9px 10px',
                    border:'1px solid var(--border)', background:'var(--bg)', color:'var(--ink)',
                    borderRadius:2, resize:'vertical', lineHeight:1.9, boxSizing:'border-box'}}
                />
              </div>
            </div>
            {importErr && (
              <div style={{color:'var(--accent)', fontSize:12, marginTop:8, fontFamily:'var(--mono)'}}>⚠ {importErr}</div>
            )}
            {importPassage && importAnswers && (() => {
              const blanks = [...importPassage.matchAll(/___(?:\s*\([^)]*\))?/g)].length;
              const ans    = importAnswers.split('\n').filter(l => l.trim()).length;
              return blanks > 0 && (
                <div style={{fontSize:12, color: blanks === ans ? 'var(--moss)' : 'var(--accent)', marginTop:6, fontFamily:'var(--mono)'}}>
                  {blanks === ans ? `✅ ${blanks} 個空格 · ${ans} 個答案 — 可以匯入` : `⚠ ${blanks} 個空格 vs ${ans} 個答案 — 數量不符`}
                </div>
              );
            })()}
            <div style={{display:'flex', gap:8, marginTop:10, justifyContent:'flex-end'}}>
              <button className="btn ghost" style={{fontSize:12, padding:'6px 14px'}}
                onClick={() => { setImporting(false); setImportPassage(''); setImportAnswers(''); setImportErr(''); }}>
                取消
              </button>
              <button className="btn primary" style={{fontSize:12, padding:'6px 16px'}}
                onClick={doImport} disabled={!importPassage.trim() || !importAnswers.trim()}>
                匯入 →
              </button>
            </div>
          </div>
        )}

        {/* Main passage editor */}
        <textarea
          value={passage}
          onChange={e => onChangePassage(e.target.value)}
          rows={10}
          placeholder={"Two summers ago we [had](have) a holiday in Scotland. We [drove](drive) there from London...\n\n（也可以用上方 Import 按鈕，分別貼入文章和答案，自動合成格式）"}
          style={{width:'100%', fontFamily:'var(--sans)', fontSize:14, padding:'10px 12px',
            border:'1px solid var(--border)', background:'var(--bg)', color:'var(--ink)',
            borderRadius:2, resize:'vertical', lineHeight:1.9, boxSizing:'border-box'}}
        />
        {blankCount > 0 ? (
          <div className="field-help" style={{marginTop:6, color:'var(--moss)'}}>
            ✅ 已偵測到 <strong>{blankCount}</strong> 個空格
          </div>
        ) : passage.trim() ? (
          <div className="field-help" style={{marginTop:6, color:'var(--accent)'}}>
            ⚠ 尚未偵測到空格，請用 [答案] 標記，或使用上方 Import
          </div>
        ) : null}
      </div>
    </div>
  );
}

Object.assign(window, { EditorModal, Footer, WeekModal, ExportModal });
