// components-editor.jsx — Editor modal for adding/editing items

const { useState: useS, useEffect: useE } = React;

/* v377（Alan：「太多 item、太多沒什麼用的功能、也很亂」）
   拉了線上真實資料來看：248 個單元裡，單字卡 72／填空 53／選擇題 28／聽寫 23
   ＝ 這 4 種就佔 71%；其餘 12 種加起來只有 14 次，「圈出答案」一次都沒用過。
   → 一個都不刪（之後想用還在），但把常用的 4 種放最上面，其餘收進「更多題型」。
   zh = 中文名（原本清單一半英文一半中文，掃過去認不出來）。 */
const TYPE_COMMON = ['flashcard', 'fillblank', 'quiz', 'spelling'];
const TYPE_ZH = {
  flashcard: '單字卡', fillblank: '填空', quiz: '選擇題', spelling: '聽寫',
  'writing-practice': 'AI 造句批改', 'type-answer': '打答案', 'guided-reading': '分段閱讀',
  upload: '上傳作業', 'short-answer': '閱讀簡答', cloze: '段落填空', 'def-match': '配對連線', lesson: '教學卡',
  'reading-skill': '閱讀技巧',
  essay: '意見文寫作', 'syllable-div': '切音節', 'word-sort': '分類排序',
  'story-mountain': '故事山脈', 'circle-answer': '圈出答案',
};
const TYPE_OPTIONS = [
  { id: "quiz",      label: "Quiz",       hint: "Build a multiple-choice quiz with explanations" },
  { id: "flashcard", label: "Flashcard",  hint: "自製單字卡組 — 支援圖片搜尋、匯入、三種練習模式" },
  { id: "fillblank",        label: "Fill Blank",       hint: "填空題 — 自訂句子填空，支援主題換色" },
  { id: "writing-practice", label: "Writing Practice", hint: "✍ AI 造句批改 — 學生逐題造句，AI 給星評分" },
  { id: "type-answer",      label: "Type Answer",      hint: "⌨ 看提示打答案 — 例：base form → past tense，老師自訂題目與答案" },
  { id: "spelling",         label: "Spelling 聽寫",     hint: "🔊 聽單字拼出來 — 匯入單字清單，學生聽發音自己拼字，自動批改" },
  { id: "short-answer",     label: "Short Answer",     hint: "📖 閱讀理解短答題 — 貼文章，學生逐題打字回答，AI 批改 0–3 星" },
  { id: "guided-reading",   label: "分段閱讀 📖",       hint: "📖 分段閱讀 — 匯入掃描 PDF（每頁一段）／上傳照片／貼文字，✂ 可自動裁切分段；長文切小段、每讀完一小段馬上答題（選擇＋簡答），小朋友不放空；短文一段搞定。" },
  { id: "syllable-div",     label: "Syllable Cut",     hint: "✂️ 切音節練習 — 輸入單字與切法，學生點擊字母縫隙自己切，系統自動批改" },
  { id: "word-sort",        label: "Word Sort",        hint: "🗂 分類排序 — 設定分類欄位，學生把單字拖進正確欄位，系統自動批改" },
  { id: "essay",            label: "Opinion Essay",    hint: "✍ 意見文寫作 — 學生寫 opinion essay，AI 依照 7 項標準批改（Claim / Reasons / Examples / Explanation / Conclusion / Organization / Grammar）" },
  { id: "story-mountain",   label: "Story Mountain",   hint: "🏔 故事山脈 — 逐步填寫 Introduction → Rising Action → Climax → Falling Action → Resolution，AI 批改結構與文法（10 分制）" },
  { id: "cloze",            label: "Cloze Test",       hint: "📝 段落填空 — 貼入完整文章，用 [答案] 或 [答案](提示) 標記空格，學生一次看整段填空並打字作答" },
  { id: "circle-answer",    label: "Circle Answer",    hint: "⭕ 圈出答案 — 學生點選句子中的正確單字，可選擇再回答分類題" },
  { id: "def-match",        label: "配對連線 🔗",       hint: "🔗 配對連線 — 左邊單字、右邊解釋（自動打亂），學生點一點連起來，系統自動批改" },
  { id: "lesson",           label: "教學卡 📘",        hint: "📘 教學卡 — 單元開頭的「先教再練」：這是什麼／什麼時候用／形式表／常見錯誤／老師示範／小試身手" },
  { id: "reading-skill",    label: "閱讀技巧 🔍",       hint: "🔍 閱讀技巧 — 學校會考的 Cause & Effect／Problem & Solution／Sequencing／Compare & Contrast（Venn 圖）。點一下卡片、再點格子放進去，自動批改。" },
  { id: "upload",           label: "上傳作業 📎",       hint: "📎 紙本作業拍照上傳 — 學生拍照繳交（可多張），老師在後台看照片打分數" },
];

function EditorModal({ open, draft, weekId, catItems, weekItems, groupOptions, onClose, onSave, onDelete }) {
  const [form, setForm] = useS(draft);
  const [moreTypes, setMoreTypes] = useS(false);

  useE(() => { setForm(draft); }, [draft]);
  // 編輯既有單元、而且它不是那 4 種常用題型 → 直接把「更多題型」展開，不然會找不到自己
  useE(() => {
    if (draft && draft.type && TYPE_COMMON.indexOf(draft.type) < 0) setMoreTypes(true);
  }, [draft && draft.type]);

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
    // v260: 空單元防呆——存檔時 0 題（學生頁不會顯示），先問一聲；upload 例外（本身就是任務）
    if (form.type !== 'upload' && window.getQuizItems && window.getQuizItems([form]).length === 0) {
      if (!window.confirm('⚠ 這個單元目前是 0 題，儲存後學生頁「不會顯示」它。\n\n（題目清單會標「⚠ 沒有題目」提醒你補題）\n\n仍要儲存嗎？')) return;
    }
    onSave(form);
  };

  return (
    // v261: 點到編輯器外面「不再」直接關閉——出到一半的題目會全部不見（Alan 踩過）。
    // 要離開請按右上 ✕ 或 Cancel。
    <div className="modal-backdrop">
      <div className={"modal " + ((form.type === "quiz" || form.type === "flashcard" || form.type === "fillblank" || form.type === "type-answer" || form.type === "spelling" || form.type === "cloze" || form.type === "circle-answer" || form.type === "guided-reading" || form.type === "def-match" || form.type === "reading-skill") ? "wide" : "")} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isNew ? "Add" : "Edit"} <em>item</em></h3>
          <button className="modal-close" aria-label="關閉" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="field-label">題型</label>
            <div className="type-picker">
              {TYPE_OPTIONS.filter(o => TYPE_COMMON.indexOf(o.id) >= 0)
                .sort((a, b) => TYPE_COMMON.indexOf(a.id) - TYPE_COMMON.indexOf(b.id))
                .map(opt => (
                  <button key={opt.id}
                    className={'tp-big' + (form.type === opt.id ? " active" : "")}
                    onClick={() => update("type", opt.id)}>
                    {TYPE_ZH[opt.id] || opt.label}
                  </button>
                ))}
            </div>
            <button type="button" className="tp-more-toggle" onClick={() => setMoreTypes(v => !v)}>
              {moreTypes ? '▾ 收起其他題型' : '▸ 更多題型（12 種）'}
            </button>
            {moreTypes && (
              <div className="type-picker tp-more">
                {TYPE_OPTIONS.filter(o => TYPE_COMMON.indexOf(o.id) < 0).map(opt => (
                  <button key={opt.id}
                    className={form.type === opt.id ? "active" : ""}
                    onClick={() => update("type", opt.id)}>
                    {TYPE_ZH[opt.id] || opt.label}
                  </button>
                ))}
              </div>
            )}
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
              {/* v374(#5): 在某位學生的篩選底下出題時，只列他有的那幾組（groupOptions）；
                  沒有傳進來才退回「整個分類的所有分組」 */}
              {(groupOptions && groupOptions.length
                ? groupOptions
                : Array.from(new Set((catItems || []).map(it => String(it.group || '').trim()).filter(Boolean)))
              ).map(g => <option key={g} value={g}/>)}
            </datalist>
            <div className="field-help">
              學生任務清單與題庫側欄會依這個名字分組；留空＝依標題自動歸戶。
              {groupOptions && groupOptions.length ? `（目前只列出這位學生的 ${groupOptions.length} 組）` : ''}
            </div>
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
          ) : form.type === "upload" ? (
            /* v263: 上傳作業——只需要一段給學生看的說明 */
            <div className="field">
              <label className="field-label">作業說明 · Instruction</label>
              <textarea
                value={form.instruction || ""}
                onChange={e => update("instruction", e.target.value)}
                rows={4}
                placeholder={"例：完成講義 p.12–13，寫完整頁拍照上傳（字要拍清楚喔！）"}
                style={{width:'100%',padding:'10px 12px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:4,fontSize:14,fontFamily:'inherit',resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}
              />
              <div className="field-help">
                學生會在上傳頁看到這段說明，拍照（可多張）送出後你就能在後台「學生詳情」看照片、打分數。
                截止日一樣用題目清單上的 📌 設定。
              </div>
            </div>
          ) : form.type === "guided-reading" ? (
            <GuidedReadingEditor
              itemId={form.id}
              itemTitle={form.title || ''}
              itemGroup={form.group || ''}
              /* v407：AI 出題若順便做了「閱讀技巧」，它是另一個型別的單元、
                 塞不進分段閱讀的資料結構 → 掛在 __side，存檔時由 app.jsx 一起建立。 */
              onSideItems={items => update("__side", items)}
              catItems={catItems || []}
              weekItems={weekItems || []}
              linkedFlashcardId={form.linkedFlashcardId || ''}
              onChangeLinked={v => update("linkedFlashcardId", v || undefined)}
              linkedFcRequired={!!form.linkedFcRequired}
              onChangeRequired={v => update("linkedFcRequired", v || undefined)}
              audioUrl={form.grAudioUrl || ''}
              onChangeAudio={v => update("grAudioUrl", v || undefined)}
              segments={form.grSegments || []}
              onChange={segs => update("grSegments", segs)}
              finalQs={form.grFinal || []}
              onChangeFinal={qs => update("grFinal", qs)}
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
          ) : form.type === "def-match" ? (
            <DefMatchEditor
              pairs={form.defPairs || []}
              onChangePairs={ps => update("defPairs", ps)}
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
          ) : form.type === "reading-skill" ? (
        /* v386: 閱讀技巧。跟 ReadingGenModal 的校稿頁用同一組 RsBlockEditor，兩邊一定一致。 */
        <ReadingSkillEditor
          passage={form.rsPassage || ''}
          blocks={form.rsBlocks || []}
          onChangePassage={v => update('rsPassage', v)}
          onChangeBlocks={b => update('rsBlocks', b)}
        />
      ) : form.type === "lesson" ? (
            /* v383: 教學卡。前兩欄常改，其餘用 JSON 一次editing（老師很少動，動了也看得懂）。 */
            <>
              <div className="field">
                <label className="field-label">一句話說明（學生第一眼看到的）</label>
                <input value={form.lead || ''} onChange={e => update('lead', e.target.value)}
                  placeholder="例：學現在簡單式，說出每天做的事和事實。"/>
              </div>
              <div className="field">
                <label className="field-label">最後鼓勵的話</label>
                <input value={form.outro || ''} onChange={e => update('outro', e.target.value)}
                  placeholder="例：太好了！接下來用練習把它練熟。"/>
              </div>
              <div className="field">
                <label className="field-label">內容（什麼時候用／形式表／提示詞／常見錯誤／示範題／小試身手）</label>
                <textarea rows={16} style={{ fontFamily: 'var(--mono, monospace)', fontSize: 13, lineHeight: 1.8 }}
                  value={JSON.stringify({
                    uses: form.uses || [], forms: form.forms || [], clues: form.clues || [],
                    mistakes: form.mistakes || [], examples: form.examples || [], check: form.check || [],
                  }, null, 2)}
                  onChange={e => {
                    try {
                      const o = JSON.parse(e.target.value);
                      setForm(prev => ({ ...prev, ...o }));
                    } catch (err) { /* 打到一半還不是合法 JSON——先不動，不會存壞 */ }
                  }}/>
                <div className="field-help">
                  格式不對時不會存進去（畫面上的字照樣可以繼續打）。<br/>
                  <code>uses</code> 什麼時候用 · <code>forms</code> 形式表 · <code>clues</code> 提示詞 ·
                  <code>mistakes</code> 常見錯誤 · <code>examples</code> 老師示範 · <code>check</code> 小試身手（answer 是選項的序號，0 開始）
                </div>
              </div>
            </>
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

/* Footer — v275: 跟行銷頁同一套 .ll-foot2 樣式（styles-auth.css 全站都有載） */
function Footer({ onOpenGuide }) {
  const gmailUrl = "https://mail.google.com/mail/?view=cm&fs=1&to=alan07050445%40gmail.com";
  const lineUrl = "https://line.me/R/ti/p/~9161791608";

  return (
    <footer className="ll-foot2 app-foot2">
      <div className="ll-foot2-top">
        <div className="ll-foot2-brand">
          <b>Alan’s English Class<i>.</i></b>
          <p>對齊康橋國際學校每週進度的英文練習平台——在家練的就是學校在教的。</p>
        </div>
        <div className="ll-foot2-cols">
          <div className="ll-foot2-col">
            <b>學習項目</b>
            <span>單字</span>
            <span>文法</span>
            <span>字根字首</span>
            <span>閱讀寫作</span>
          </div>
          <div className="ll-foot2-col">
            <b>使用說明</b>
            {onOpenGuide && <button onClick={onOpenGuide}>新手教學</button>}
          </div>
        </div>
        <div className="ll-foot2-contact">
          <b>聯絡 Alan 老師</b>
          <a className="ll-foot2-btn" href={gmailUrl} target="_blank" rel="noopener noreferrer" aria-label="使用 Gmail 聯絡 Alan 老師">✉️ Email 聯絡</a>
          <a className="ll-foot2-btn ll-foot2-btn-line" href={lineUrl} target="_blank" rel="noopener noreferrer" aria-label="加 Alan 老師的 LINE 好友">💬 LINE 加好友</a>
        </div>
      </div>
      <div className="ll-foot2-bar">
        <span>© {new Date().getFullYear()} Alan’s English Class</span>
        <span className="ll-foot2-mini">對齊康橋國際學校每週進度 · 用心製作</span>
      </div>
    </footer>
  );
}

/* ───── Week Modal ───── */
/* ══════════════════════════════════════════════════════════════
   v377 ③：貼一次單字 → 一次做出整套練習
   為什麼要有這個：線上資料顯示 72 份單字卡、881 張卡，而且有 76 個單元是
   「綁在單字卡上的」——Alan 實際的做法就是「一份單字，再配上填空／聽寫／測驗」，
   但現在得一個一個手動建。這裡把它變成一次完成。
   同時也讓別的老師不用搞懂 16 種題型，只要會貼單字就能開一個班。
   ══════════════════════════════════════════════════════════════ */
const QS_KINDS = [
  { id: 'flashcard', zh: '單字卡',   note: '翻卡片記單字（含學習與測驗模式）', always: true },
  { id: 'def-match', zh: '配對連線', note: '左邊英文、右邊解釋，連連看' },
  { id: 'spelling',  zh: '聽寫',     note: '聽發音把單字拼出來' },
  { id: 'quiz',      zh: '選擇題',   note: '看中文選英文' },
  { id: 'fillblank', zh: '填空',     note: '情境句子挖空＋中文解說' },
  /* v406（Alan：學校作業右半邊的 Part B 就長這樣）：一篇小故事，
     把這一課的每個單字各挖一格，學生讀上下文填回去。只有開 AI 才生得出來。 */
  { id: 'story',     zh: '短文填空', note: '一篇小故事，每個單字各挖一格（像作業紙的 Part B）', ai: true },
];

/* 一行一個字：英文 [Tab | ｜ | 逗號 | " - "] 中文 [同樣分隔] 例句 */
function qsParseWords(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map((line, i) => {
    const cols = (line.includes('\t') ? line.split('\t')
      : line.includes('|') ? line.split('|')
      : /\s+-\s+/.test(line) ? line.split(/\s+-\s+/)
      : line.includes(',') ? line.split(',')
      : [line]).map(c => c.trim().replace(/^["']|["']$/g, ''));
    return { term: cols[0] || '', zh: cols[1] || '', example: cols[2] || '', _i: i };
  }).filter(w => w.term);
}

/* 把例句裡的那個單字挖成空格（認得 -s/-ed/-ing 等字尾變化） */
function qsBlank(example, term) {
  const t = String(term || '').trim();
  if (!t || !example) return '';
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b' + esc + '(s|es|ed|ing|d)?\\b', 'i');
  return re.test(example) ? example.replace(re, '_____') : '';
}

/* ══════════════════════════════════════════════════════════════
   v382：五大時態核心題庫的出題工具
   一次出一個時態：Type A 幾組×10 題 + Type B 幾篇短文 → 校稿 → 建立成多個單元。
   Type A → type-answer（打字作答）；Type B → cloze（[答案](原形)）。
   ══════════════════════════════════════════════════════════════ */
function GrammarGenModal({ open, defaultTense, onClose, onCreate }) {
  const T = window.GR_TENSES || {};
  const [tense, setTense]   = useS(defaultTense || 't1');
  const [aG, setAG]         = useS(3);
  const [bC, setBC]         = useS(5);
  const [wantLesson, setWantLesson] = useS(true);   // v383: 單元開頭的教學卡
  const [wantCheck, setWantCheck]   = useS(true);   // v383: 單元最後的驗收
  const [busy, setBusy]     = useS(null);    // { done, total, label }
  const [err, setErr]       = useS('');
  const [res, setRes]       = useS(null);    // { A:[[…]], B:[…] }
  const [tab, setTab]       = useS(0);       // 校稿頁：看第幾個單元

  useE(() => { if (open) { setTense(defaultTense || 't1'); setAG(3); setBC(5); setBusy(null); setErr(''); setRes(null); setTab(0);
    setWantLesson(true); setWantCheck(true); } }, [open]);
  if (!open) return null;

  const meta = T[tense] || {};
  const totalUnits = (wantLesson ? 1 : 0) + (+aG) + (+bC) + (wantCheck ? 1 : 0);
  const run = async () => {
    setErr('');
    let done = 0;
    const tick = (label) => { done++; setBusy({ done, total: totalUnits, label }); };
    setBusy({ done: 0, total: totalUnits, label: '準備中' });
    try {
      let lesson = null;
      if (wantLesson) { lesson = await window.aiMakeLesson({ tense }); tick('教學卡'); }
      const r = await window.aiMakeGrammarSet({          // 驗收＝多出一組，最後改名
        tense, aGroups: (+aG) + (wantCheck ? 1 : 0), bCount: +bC,
        onProgress: (_d, _t, label) => tick(label),
      });
      const check = wantCheck ? r.A.pop() : null;
      setRes({ lesson, A: r.A, B: r.B, check }); setTab(0);
    } catch (e) { setErr((e && e.message) || 'AI 出題失敗，請再試一次。'); }
    setBusy(null);
  };

  const updA = (g, i, k, v) => setRes(r => ({ ...r, A: r.A.map((grp, gi) => gi !== g ? grp : grp.map((x, xi) => xi !== i ? x : { ...x, [k]: v })) }));
  const updC = (i, k, v) => setRes(r => ({ ...r, check: r.check.map((x, xi) => xi !== i ? x : { ...x, [k]: v }) }));
  const updAny = (cur, i, k, v) => (cur.kind === 'C' ? updC(i, k, v) : updA(cur.i, i, k, v));
  const updB = (i, k, v) => setRes(r => ({ ...r, B: r.B.map((x, xi) => xi !== i ? x : { ...x, [k]: v }) }));

  /* ── 第 1 步：設定 ── */
  if (!res) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <h3>出<em>時態題目</em></h3>
            <button className="modal-close" aria-label="關閉" onClick={onClose}><Icon name="close" size={14}/></button>
          </div>
          <div className="modal-body">
            <div className="field">
              <label className="field-label">哪一個時態</label>
              <div className="gr-tense-pick">
                {Object.keys(T).map(k => (
                  <button key={k} className={tense === k ? 'active' : ''} onClick={() => setTense(k)}>{T[k].zh}</button>
                ))}
              </div>
              <div className="field-help">{meta.en}</div>
            </div>
            <div className="gr-num-row">
              <div className="field">
                <label className="field-label">單句填空</label>
                <select value={aG} onChange={e => setAG(+e.target.value)}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} 組 · 共 {n*10} 題</option>)}
                </select>
                <div className="field-help">一組 10 題＝一個單元</div>
              </div>
              <div className="field">
                <label className="field-label">短文填空</label>
                <select value={bC} onChange={e => setBC(+e.target.value)}>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} 篇</option>)}
                </select>
                <div className="field-help">一篇 5–8 個空＝一個單元</div>
              </div>
            </div>
            <div className="gr-extra">
              <label className={wantLesson ? 'on' : ''}>
                <input type="checkbox" checked={wantLesson} onChange={e => setWantLesson(e.target.checked)}/>
                <span><b>📘 教學卡（放最前面）</b>這是什麼／什麼時候用／形式表／常見錯誤／老師示範／小試身手</span>
              </label>
              <label className={wantCheck ? 'on' : ''}>
                <input type="checkbox" checked={wantCheck} onChange={e => setWantCheck(e.target.checked)}/>
                <span><b>🏁 驗收（放最後面）</b>再 10 題混合練習，80 分才算過關</span>
              </label>
            </div>
            <div className="field-help" style={{ marginTop: 10 }}>
              會建立 <b>{totalUnits}</b> 個單元，順序是「先教 → 再練 → 最後驗收」。出完先讓你逐題校稿，確認了才寫進題庫。
              AI 出的題目一定要看過——語意、介系詞、時間提示都可能有小問題。
            </div>
            {err && <div className="notify-msg err" style={{ marginTop: 10 }}>⚠️ {err}</div>}
            {busy && (
              <div className="gr-busy">
                <div className="gr-busy-bar"><i style={{ width: (busy.done / busy.total * 100) + '%' }}/></div>
                <span>出題中… {busy.done}/{busy.total} · {busy.label}</span>
              </div>
            )}
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={onClose}>取消</button>
            <button className="btn primary" disabled={!!busy} onClick={run}>
              {busy ? '出題中…' : `✨ 開始出題（${totalUnits} 個單元）→`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── 第 2 步：校稿 ── */
  const units = (res.lesson ? [{ kind: 'L', i: 0, n: (res.lesson.check || []).length, name: '📘 教學卡' }] : [])
    .concat(res.A.map((g, i) => ({ kind: 'A', i, n: g.length, name: `單句填空 ${i + 1}` })))
    .concat(res.B.map((b, i) => ({ kind: 'B', i, n: window.grCountBlanks(b.passage), name: `短文 ${i + 1}` })))
    .concat(res.check ? [{ kind: 'C', i: 0, n: res.check.length, name: '🏁 驗收' }] : []);
  const cur = units[Math.min(tab, units.length - 1)];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>校稿 · <em>{meta.zh}</em></h3>
          <button className="modal-close" aria-label="關閉" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>
        <div className="modal-body">
          <div className="gr-tabs">
            {units.map((u, i) => (
              <button key={i} className={i === tab ? 'active' : ''} onClick={() => setTab(i)}>
                {u.name}<em>{u.n}</em>
              </button>
            ))}
          </div>

          {cur.kind === 'L' ? (
            <div className="gr-proof">
              <div className="field-help" style={{ marginBottom: 10 }}>
                這是學生按進單元第一眼看到的教學頁。文字都可以直接改；空白的區塊不會顯示。
              </div>
              <div className="field">
                <label className="field-label">一句話說明</label>
                <input value={res.lesson.lead || ''} onChange={e => setRes(r => ({ ...r, lesson: { ...r.lesson, lead: e.target.value } }))}/>
              </div>
              <div className="field">
                <label className="field-label">最後鼓勵的話</label>
                <input value={res.lesson.outro || ''} onChange={e => setRes(r => ({ ...r, lesson: { ...r.lesson, outro: e.target.value } }))}/>
              </div>
              <div className="field">
                <label className="field-label">其餘內容（什麼時候用／形式表／提示詞／常見錯誤／示範題／小試身手）</label>
                <textarea className="gr-passage" rows={14}
                  value={JSON.stringify({ uses: res.lesson.uses, forms: res.lesson.forms, clues: res.lesson.clues,
                    mistakes: res.lesson.mistakes, examples: res.lesson.examples, check: res.lesson.check }, null, 2)}
                  onChange={e => {
                    try { const o = JSON.parse(e.target.value); setRes(r => ({ ...r, lesson: { ...r.lesson, ...o } })); }
                    catch (err) { /* 打到一半還不是合法 JSON——先不動 */ }
                  }}/>
                <div className="field-help">改壞了也不要緊：格式不對就不會存進去，回上一步重出一次即可。</div>
              </div>
            </div>
          ) : (cur.kind === 'A' || cur.kind === 'C') ? (
            <div className="gr-proof">
              {(cur.kind === 'C' ? res.check : res.A[cur.i]).map((x, i) => {
                const ok = window.grValidA(x);
                return (
                  <div key={i} className={'gr-q' + (ok ? '' : ' bad')}>
                    <span className="gr-q-n">{i + 1}</span>
                    <div className="gr-q-f">
                      <textarea rows={2} value={x.prompt} onChange={e => updAny(cur, i, 'prompt', e.target.value)}/>
                      <div className="gr-q-2">
                        <div><label>答案</label><input value={x.answer} onChange={e => updAny(cur, i, 'answer', e.target.value)}/></div>
                        <div><label>中文解說</label><input value={x.explain} onChange={e => updAny(cur, i, 'explain', e.target.value)}/></div>
                      </div>
                      {!ok && <div className="gr-warn">⚠ 這題不符合規則：一句只能一個 ________、句尾要有 (原形動詞)、答案不能含 already/never/not 這類詞</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="gr-proof">
              <div className="field">
                <label className="field-label">標題</label>
                <input value={res.B[cur.i].title} onChange={e => updB(cur.i, 'title', e.target.value)}/>
              </div>
              <div className="field">
                <label className="field-label">
                  短文（空格寫成 <code>[答案](原形動詞)</code>，括號會顯示在空格旁邊當提示）
                </label>
                <textarea className="gr-passage" rows={11} value={res.B[cur.i].passage}
                  onChange={e => updB(cur.i, 'passage', e.target.value)}/>
                <div className="field-help">
                  目前 <b>{window.grCountBlanks(res.B[cur.i].passage)}</b> 個空格
                  {window.grValidB(res.B[cur.i]) ? ' ✓' : ' ⚠ 建議 5–8 個，且 [ ] 裡不要包含 already／never 這類副詞'}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={() => setRes(null)}>← 重新設定</button>
          <button className="btn primary" onClick={() => onCreate({ tense, zh: meta.zh, lesson: res.lesson, A: res.A, B: res.B, check: res.check })}>
            建立 {units.length} 個單元 →
          </button>
        </div>
      </div>
    </div>
  );
}

/* 把校稿完的結果變成真正的單元（Type A → type-answer；Type B → cloze） */
function grBuildItems({ tense, zh, lesson, A, B, check }) {
  const stamp = Date.now();
  const rnd = () => Math.random().toString(36).slice(2, 5);
  const out = [];
  if (lesson) {
    out.push({ id: 'gr' + stamp + 'ls' + rnd(), type: 'lesson', group: zh,
      title: `${zh} · 先看這裡`, zh: '這是什麼、怎麼用、常見錯誤、小試身手',
      order: 0,
      lead: lesson.lead || '', uses: lesson.uses || [], forms: lesson.forms || [],
      clues: lesson.clues || [], mistakes: lesson.mistakes || [],
      examples: lesson.examples || [], check: lesson.check || [], outro: lesson.outro || '' });
  }
  (A || []).forEach((grp, g) => {
    const items = (grp || []).filter(x => x.prompt && x.answer);
    if (!items.length) return;
    out.push({
      id: 'gr' + stamp + 'a' + g + rnd(), type: 'type-answer', group: zh, order: 1 + g / 100,
      title: `${zh} · 單句填空 ${g + 1}`, zh: `${items.length} 題 · 看句子打出正確的動詞形式`,
      pairs: items.map((x, i) => ({ id: 'p' + stamp + g + i + rnd(), prompt: x.prompt, answer: x.answer, explain: x.explain || '' })),
    });
  });
  if (check && check.length) {
    out.push({ id: 'gr' + stamp + 'ck' + rnd(), type: 'type-answer', group: zh, order: 9,
      title: `${zh} · 🏁 驗收`, zh: `${check.length} 題混合 · 80 分過關`,
      pairs: check.filter(x => x.prompt && x.answer).map((x, i) => ({
        id: 'p' + stamp + 'c' + i + rnd(), prompt: x.prompt, answer: x.answer, explain: x.explain || '' })) });
  }
  (B || []).forEach((p, i) => {
    if (!p || !p.passage) return;
    out.push({
      id: 'gr' + stamp + 'b' + i + rnd(), type: 'cloze', group: zh, order: 2 + i / 100,
      title: `${zh} · 短文填空 ${i + 1}${p.title ? `（${p.title}）` : ''}`,
      zh: `${window.grCountBlanks(p.passage)} 個空格 · 讀短文填動詞`,
      passage: p.passage,
    });
  });
  return out;
}

function QuickSetModal({ open, categories, defaultCat, existingGroups, roster, perStudent, onClose, onCreate }) {
  const [text, setText]   = useS('');
  const [title, setTitle] = useS('');
  const [cat, setCat]     = useS(defaultCat || 'vocab');
  const [picked, setPicked] = useS({ flashcard: true, 'def-match': true, spelling: true, quiz: true, fillblank: true, story: true });
  /* v379：AI 出題。Alan 的配對連線是「英文單字 → 英文定義」、填空是「情境例句＋中文解說」，
     不是單字表就能生出來的東西——他本來都貼給 ChatGPT 再匯入。
     出完先進「校稿」畫面，每一格都可以改，確認了才寫進週次。 */
  const [useAI, setUseAI]   = useS(true);
  const [busy, setBusy]     = useS(0);       // 0=沒在跑，否則是已完成的字數
  const [aiErr, setAiErr]   = useS('');
  const [rows, setRows]     = useS(null);    // AI 回來的結果（校稿中）
  const [story, setStory]   = useS(null);    // v406: AI 出的短文填空（校稿中一起改）
  const [reStory, setReStory] = useS(false); // v407: 校稿頁單獨重生短文（不用整組重出）
  /* v380（Alan：「不用一整包要一份一份指定」）：建立的同時就指派出去。
     學期＝整組設為本週作業（含截止日）；暑假題庫＝勾選要給哪些學生。 */
  const [assign, setAssign] = useS(true);
  const [due, setDue]       = useS('');
  const [who, setWho]       = useS([]);       // 只有 perStudent 模式用得到
  useE(() => {
    if (open) { setText(''); setTitle(''); setCat(defaultCat || 'vocab'); setRows(null); setStory(null); setReStory(false); setAiErr(''); setBusy(0); setUseAI(true);
      setAssign(true); setWho([]);
      // 預設截止日＝這個週日（大部分作業都是一週）
      const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
      setDue(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
      setPicked({ flashcard: true, 'def-match': true, spelling: true, quiz: true, fillblank: true, story: true }); }
  }, [open]);
  if (!open) return null;

  const words = qsParseWords(text);
  const withZh = words.filter(w => w.zh);
  const withEx = words.filter(w => qsBlank(w.example, w.term));
  /* ⚠ 開了 AI 就不需要自己先寫中文／例句——句子和定義都是 AI 出的。
     沒開 AI 才需要：配對要有中文、填空要有例句。 */
  const canDo = {
    flashcard: words.length >= 1,
    'def-match': (useAI ? words.length : withZh.length) >= 2,
    spelling: words.length >= 1,
    quiz: (useAI ? words.length : withZh.length) >= 2,
    fillblank: (useAI ? words.length : withEx.length) >= 2,
    // v406: 短文填空一定要 AI（要寫一整篇故事），而且太少字寫不成故事
    story: useAI && words.length >= 3,
  };
  const chosen = QS_KINDS.filter(k => picked[k.id] && canDo[k.id]);
  const ready = title.trim() && words.length >= 1 && chosen.length >= 1;
  const wantAI = useAI && (picked['def-match'] || picked.fillblank || picked.story);

  const runAI = async () => {
    setAiErr(''); setBusy(0.0001);
    try {
      /* v406：單字題目與短文同時送出去（兩個獨立請求）。
         AI 的延遲幾乎全是「吐字時間」，並行送出總時間就是比較慢的那一個，
         不是兩個相加。短文失敗不影響單字題目——它只是少一個練習。
         v407：短文的第三層保底要用到「填空題」的例句，所以把同一個 promise
         當 rescue 傳進去——它只在真的漏字時才會 await，並行完全沒被打斷。 */
      const exP = window.aiMakeVocabExercises(words, { hint: title.trim(), onProgress: (done) => setBusy(done) });
      const stP = (picked.story && canDo.story && window.aiMakeVocabStory)
        ? window.aiMakeVocabStory(words, { hint: title.trim(), rescue: () => exP }).catch(() => null)
        : Promise.resolve(null);
      const [r, st] = await Promise.all([exP, stP]);
      setRows(r);
      setStory(st);
    } catch (e) { setAiErr((e && e.message) || 'AI 出題失敗，請再試一次。'); }
    setBusy(0);
  };
  const updRow = (i, k, v) => setRows(rs => rs.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const payload = (extra) => ({ words, title: title.trim(), cat, kinds: chosen.map(k => k.id), story,
    assign: assign ? (perStudent ? { students: who } : { dueDate: due }) : null, ...extra });

  /* ⚠ 不要寫成 `const AssignBox = () => …` 再用 <AssignBox/> 那種寫法：
     那樣每次重繪都是一個新的元件型別，React 會把整段拆掉重掛，
     勾第二個學生時第一個已經被換成新的 DOM 節點＝點不到（實測踩過）。
     這裡是「回傳 JSX 的普通函式」，等同直接內嵌。 */
  const assignBox = () => (
    <div className={'qs-assign' + (assign ? ' on' : '')}>
      <label className="qs-assign-head">
        <input type="checkbox" checked={assign} onChange={e => setAssign(e.target.checked)}/>
        <span>建立後<b>整組直接指派</b>（{chosen.length} 個練習一次派出去，不用一份一份設）</span>
      </label>
      {assign && (perStudent ? (
        <div className="qs-who">
          <div className="qs-who-bar">
            <span>指派給（{who.length}/{(roster || []).length}）</span>
            <button type="button" onClick={() => setWho((roster || []).map(r => r.email))}>全選</button>
            <button type="button" onClick={() => setWho([])}>全不選</button>
          </div>
          <div className="qs-who-list">
            {(roster || []).map(r => (
              <label key={r.email} className={'qs-who-item' + (who.indexOf(r.email) >= 0 ? ' on' : '')}>
                <input type="checkbox" checked={who.indexOf(r.email) >= 0}
                  onChange={e => setWho(w => e.target.checked ? w.concat(r.email) : w.filter(x => x !== r.email))}/>
                {r.name || r.email}
              </label>
            ))}
            {!(roster || []).length && <span className="qs-who-empty">名單還沒載入</span>}
          </div>
        </div>
      ) : (
        <div className="qs-due">
          <label>截止日</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)}/>
          <span className="qs-due-n">整組會出現在學生的「今天的任務」</span>
        </div>
      ))}
    </div>
  );

  /* ── 第 2 步：AI 出完了，逐題校稿 ── */
  if (rows) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal wide" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <h3>校稿 · <em>{title}</em></h3>
            <button className="modal-close" aria-label="關閉" onClick={onClose}><Icon name="close" size={14}/></button>
          </div>
          <div className="modal-body">
            <div className="field-help" style={{ marginBottom: 10 }}>
              AI 出好了 <b>{rows.length}</b> 個字。<b>每一格都可以直接改</b>，確認沒問題再建立。
              空白的欄位會自動跳過那一題。
            </div>
            {assignBox()}
            {/* v406：短文填空的校稿。AI 生出來的東西一律用程式驗一次再讓老師看
                （這個專案吃過「AI 說有就當作有」的虧）——漏字／挖錯字／答案寫在
                括號外面都直接標出來，老師改完就能用。 */}
            {picked.story && canDo.story && (
              <div className="qs-story">
                <div className="qs-story-head">
                  <b>📖 短文填空</b>
                  {story ? <span className="qs-story-n">{(story.check || {}).blanks || 0} 個空格</span>
                         : <span className="qs-story-n warn">這次沒生出來</span>}
                  <span style={{flex:1}}/>
                  {/* v407（Alan：「這個新增題型我要百分之百能夠成功」）：
                      前面已經有三層（程式修 → 最多重生 3 輪 → 用填空題例句保底），
                      這顆是最後的人工開關——真的很不滿意就再來一次，不用整組重出。 */}
                  <button type="button" className="qs-story-re" disabled={!!reStory}
                    onClick={async () => {
                      setReStory(true);
                      try {
                        const st2 = await window.aiMakeVocabStory(words, { hint: title.trim(), rescue: () => rows });
                        if (st2) setStory(st2);
                      } catch (e) { /* 失敗就維持原本那一篇，不要把老師手上的東西弄不見 */ }
                      setReStory(false);
                    }}>{reStory ? '生成中…' : '🔁 換一篇'}</button>
                </div>
                {!story && (
                  <div className="qs-story-warn">
                    ⚠ 這次沒生出來（其他 {chosen.length - 1} 個練習不受影響）——按右上角的
                    <b> 🔁 換一篇 </b>再試一次，或直接建立、之後再補。
                  </div>
                )}
                {story && (
                  <>
                    <label className="qs-story-lab">標題</label>
                    <input value={story.title || ''}
                      onChange={e => setStory(s2 => ({ ...s2, title: e.target.value }))}/>
                    <label className="qs-story-lab">
                      短文（<code>[答案]</code> 是空格，後面可以加 <code>(提示)</code>，
                      例：<code>[soaring](ing)</code>）
                    </label>
                    <textarea rows={8} value={story.passage || ''}
                      onChange={e => setStory(s2 => ({
                        ...s2, passage: e.target.value,
                        check: window.storyCheck ? window.storyCheck(e.target.value, words) : s2.check,
                      }))}/>
                    {(() => {
                      const c = story.check || {};
                      const bad = [];
                      if ((c.missing || []).length) bad.push(`漏了：${c.missing.join('、')}`);
                      if ((c.extra || []).length)   bad.push(`挖到不是這一課的字：${c.extra.join('、')}`);
                      if ((c.leaked || []).length)  bad.push(`答案出現在括號外面：${c.leaked.join('、')}`);
                      return bad.length
                        ? <div className="qs-story-warn">⚠ {bad.join('；')}</div>
                        : <div className="qs-story-ok">✓ 每個單字都各挖了一格，沒有洩漏答案</div>;
                    })()}
                    {/* v407：程式自動修過的地方要講出來，老師才知道這篇被動過哪裡 */}
                    {(story.fixes || []).length > 0 && (
                      <div className="qs-story-fix">🔧 已自動修好：{story.fixes.join('；')}</div>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="qs-proof" style={{ marginTop: 12 }}>
              {rows.map((r, i) => (
                <div key={i} className="qs-proof-row">
                  <div className="qs-proof-w">
                    <input value={r.word} onChange={e => updRow(i, 'word', e.target.value)}/>
                    <input className="qs-proof-zhin" value={r.zh} placeholder="中文意思"
                      onChange={e => updRow(i, 'zh', e.target.value)}/>
                  </div>
                  <div className="qs-proof-f">
                    <label>英文定義（配對連線用）</label>
                    <textarea rows={2} value={r.def} onChange={e => updRow(i, 'def', e.target.value)}/>
                    <label>情境例句（填空用，空格請留 <code>___</code>）</label>
                    <textarea rows={2} value={r.sentence} onChange={e => updRow(i, 'sentence', e.target.value)}/>
                    <div className="qs-proof-2">
                      <div><label>答案</label><input value={r.answer} onChange={e => updRow(i, 'answer', e.target.value)}/></div>
                      <div><label>中文解說</label><textarea rows={2} value={r.explain} onChange={e => updRow(i, 'explain', e.target.value)}/></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setRows(null)}>← 回上一步</button>
            <button className="btn ghost" onClick={runAI} disabled={!!busy}>{busy ? '重新出題中…' : '↻ 重新出一次'}</button>
            <button className="btn primary" onClick={() => onCreate(payload({ ai: rows }))}>
              建立 {chosen.length} 個練習{assign ? '並指派' : ''} →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>貼一次單字，<em>一次建立整套練習</em></h3>
          <button className="modal-close" aria-label="關閉" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        <div className="modal-body">
          <div className="qs-grid">
            <div>
              <div className="field">
                <label className="field-label">單字清單</label>
                <textarea className="qs-ta" rows={11} value={text} onChange={e => setText(e.target.value)}
                  placeholder={"一行一個字：英文 - 中文 - 例句（中文、例句可省略）\n也可以直接從 Excel／Google 試算表整段貼過來\n\npharaoh - 法老 - The pharaoh ruled ancient Egypt.\npyramid - 金字塔 - They built a huge pyramid.\ntomb - 墳墓"}/>
                <div className="field-help">
                  分隔符號 Tab／<code>|</code>／逗號／<code> - </code> 都吃。
                  目前 <b>{words.length}</b> 個字（有中文 {withZh.length}、有例句 {withEx.length}）。
                </div>
              </div>
            </div>

            <div>
              <div className="field">
                <label className="field-label">這一組叫什麼</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="例：Unit 5 · Ancient Egypt"/>
                <div className="field-help">所有練習都會用這個名字，並自動歸成同一組。</div>
              </div>
              <div className="field">
                <label className="field-label">放在哪一類</label>
                <select className="qs-sel" value={cat} onChange={e => setCat(e.target.value)}>
                  {(categories || []).map(c => <option key={c.id} value={c.id}>{c.zh || c.titleZh || c.title || c.id}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">要建立哪些練習</label>
                <div className="qs-kinds">
                  {QS_KINDS.map(k => {
                    const ok = canDo[k.id];
                    return (
                      <label key={k.id} className={'qs-kind' + (picked[k.id] && ok ? ' on' : '') + (ok ? '' : ' off')}>
                        <input type="checkbox" disabled={!ok} checked={!!picked[k.id] && ok}
                          onChange={e => setPicked(p => ({ ...p, [k.id]: e.target.checked }))}/>
                        <span className="qs-kind-zh">{k.zh}</span>
                        <span className="qs-kind-note">{ok ? k.note : '資料不夠：' + k.note}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <label className={'qs-ai' + (useAI ? ' on' : '')}>
            <input type="checkbox" checked={useAI} onChange={e => setUseAI(e.target.checked)}/>
            <span className="qs-ai-t">✨ 用 AI 出題（配對連線的<b>英文定義</b>、填空的<b>情境例句＋中文解說</b>）</span>
            <span className="qs-ai-n">
              出完會先讓你逐題校稿再建立。不勾的話：配對＝單字對中文、填空＝把你貼的例句挖空。
            </span>
          </label>
          {aiErr && <div className="notify-msg err" style={{ marginTop: 8 }}>⚠️ {aiErr}</div>}
          {!wantAI && assignBox()}
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>取消</button>
          {wantAI ? (
            <button className="btn primary" disabled={!ready || !!busy} onClick={runAI}>
              {busy ? `AI 出題中… ${Math.floor(busy)}/${words.length}`
                    : ready ? `✨ AI 出題（${words.length} 個字）→` : '先貼單字並取個名字'}
            </button>
          ) : (
            <button className="btn primary" disabled={!ready} onClick={() => onCreate(payload())}>
              {ready ? `建立 ${chosen.length} 個練習${assign ? '並指派' : ''} →` : '先貼單字並取個名字'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* 真正產生各個單元的資料。抽出來是為了好測。 */
function qsBuildItems({ words, title, kinds, ai, story }) {
  const aiOf = (term) => (ai || []).find(r => r.term === term) || null;
  const rnd = () => Math.random().toString(36).slice(2, 6);
  const stamp = Date.now();
  const out = [];
  const fcId = 'qs' + stamp + 'fc';
  const base = { group: title, zh: '', duration: '' };

  if (kinds.indexOf('flashcard') >= 0) {
    out.push({ ...base, id: fcId, type: 'flashcard', title,
      cards: words.map((w, i) => {
        const a = aiOf(w.term);
        return { id: 'c' + stamp + i + rnd(), term: w.term, zh: w.zh || (a && a.zh) || '',
                 example: w.example || ((a && a.sentence) ? a.sentence.replace('___', w.term) : '') };
      }) });
  }
  if (kinds.indexOf('def-match') >= 0) {
    // 有 AI 出的英文定義就用它（Alan 的風格），沒有才退回「單字 → 中文」
    const pairs = words.map((w, i) => {
      const a = aiOf(w.term);
      const def = (a && a.def) || w.zh;
      return def ? { id: 'p' + stamp + i + rnd(), word: (a && a.word) || w.term, def } : null;
    }).filter(Boolean);
    if (pairs.length >= 2) out.push({ ...base, id: 'qs' + stamp + 'dm', type: 'def-match', title, linkedFlashcardId: fcId, defPairs: pairs });
  }
  if (kinds.indexOf('fillblank') >= 0) {
    const qs = words.map((w, i) => {
      const a = aiOf(w.term);
      // AI 的情境例句優先；沒有才把老師貼的例句挖空
      const sentence = (a && a.sentence && a.sentence.indexOf('___') >= 0) ? a.sentence : qsBlank(w.example, w.term);
      if (!sentence) return null;
      const answer  = (a && a.answer) || w.term;
      const explain = (a && a.explain) || (w.zh ? `${w.term} = ${w.zh}` : '');
      return { id: 'q' + stamp + i + rnd(), sentence, answer, explain };
    }).filter(Boolean);
    if (qs.length >= 2) out.push({ ...base, id: 'qs' + stamp + 'fb', type: 'fillblank', title, linkedFlashcardId: fcId, questions: qs });
  }
  if (kinds.indexOf('quiz') >= 0) {
    const pool = words.map(w => ({ ...w, zh: w.zh || ((aiOf(w.term) || {}).zh || '') })).filter(w => w.zh);
    const qs = pool.map((w, i) => {
      const others = pool.filter(x => x.term !== w.term).map(x => x.term);
      // 洗牌後取 3 個當誘答
      for (let j = others.length - 1; j > 0; j--) { const k = Math.floor(Math.random() * (j + 1)); const t = others[j]; others[j] = others[k]; others[k] = t; }
      const opts = [w.term].concat(others.slice(0, 3));
      if (opts.length < 2) return null;
      return { id: 'q' + stamp + i + rnd(), q: `「${w.zh}」的英文是哪一個？`, options: opts, answer: 0, explain: w.example || '' };
    }).filter(Boolean);
    if (qs.length >= 2) out.push({ ...base, id: 'qs' + stamp + 'qz', type: 'quiz', title, linkedFlashcardId: fcId, questions: qs });
  }
  /* v406: 短文填空 → cloze 題型。passage 裡的 [答案](提示) 就是空格，
     格式跟 components-quiz-mode.jsx 的 parseClozePassage 完全一致。 */
  if (kinds.indexOf('story') >= 0 && story && String(story.passage || '').indexOf('[') >= 0) {
    const nBlank = ((story.passage || '').match(/\[[^\]]+\]/g) || []).length;
    out.push({ ...base, id: 'qs' + stamp + 'st', type: 'cloze', title: `${title} · 短文填空`,
      zh: `${nBlank} 個空格 · 讀短文把單字填回去`,
      linkedFlashcardId: fcId, passage: story.passage });
  }
  if (kinds.indexOf('spelling') >= 0) {
    out.push({ ...base, id: 'qs' + stamp + 'sp', type: 'spelling', title, linkedFlashcardId: fcId,
      spellWords: words.map((w, i) => ({ id: 'sp' + stamp + i + rnd(), word: w.term, zh: w.zh || ((aiOf(w.term) || {}).zh || '') })) });
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════
   v377：一鍵建立一整個學期的週次（Alan：8/31 開學、連續 20 週到寒假）
   一週一週手動開太慢，而且 dateRange 要打成 bestWeekIdx 讀得懂的格式
   （"Aug 31 – Sep 6"）才會自動跳到「這一週」。這裡統一產生。
   ⚠ 只會「補上不存在的」週次，已經有的一律不動（不覆蓋任何內容）。
   ══════════════════════════════════════════════════════════════ */
const TERM_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* 依「開學日 + 第幾週」算出這一週的 id／名稱／日期範圍 */
function termWeekPlan(startISO, count, prefix, tag) {
  const out = [];
  const [y, m, d] = String(startISO || '').split('-').map(Number);
  if (!y || !m || !d) return out;
  const base = new Date(y, m - 1, d);
  for (let i = 0; i < count; i++) {
    const s = new Date(base.getTime()); s.setDate(base.getDate() + i * 7);
    const e = new Date(s.getTime());    e.setDate(s.getDate() + 6);
    const nn = String(i + 1).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      id: `${prefix}${y}${tag}-W${nn}`,
      label: `Week ${i + 1}`,
      dateRange: `${TERM_MON[s.getMonth()]} ${s.getDate()} – ${TERM_MON[e.getMonth()]} ${e.getDate()}`,
      zhRange: `${s.getMonth() + 1}/${s.getDate()}–${e.getMonth() + 1}/${e.getDate()}`,
      /* ⚠ 一定要存真正的日期：週次 id 只有「學期開始的年份」（2026F），
         但第 19、20 週其實是 2027 年 1 月——只靠 id 推年份會把它算成 2026/1，
         變成「已經過去的一週」，一進來就跳到第 20 週。 */
      startISO: iso(s), endISO: iso(e),
      n: i + 1,
    });
  }
  return out;
}

function TermSetupModal({ open, existingIds, gradeLabel, prefix, categories, onClose, onCreate }) {
  const [start, setStart] = useS('2026-08-31');
  const [count, setCount] = useS(20);
  const [tag, setTag]     = useS('F');     // F = 上學期(Fall)，S = 下學期(Spring)
  useE(() => { if (open) { setStart('2026-08-31'); setCount(20); setTag('F'); } }, [open]);
  if (!open) return null;

  const plan = termWeekPlan(start, Math.max(1, Math.min(40, +count || 0)), prefix || '', tag);
  const have = new Set(existingIds || []);
  const fresh = plan.filter(p => !have.has(p.id));
  const dup   = plan.length - fresh.length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>建立<em>一整個學期</em>的週次 · {gradeLabel}</h3>
          <button className="modal-close" aria-label="關閉" onClick={onClose}><Icon name="close" size={14}/></button>
        </div>

        <div className="modal-body">
          <div className="term-row">
            <div className="field">
              <label className="field-label">開學日（第 1 週的星期一）</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">總共幾週</label>
              <input type="number" min="1" max="40" value={count} onChange={e => setCount(e.target.value)}/>
            </div>
            <div className="field">
              <label className="field-label">學期</label>
              <select value={tag} onChange={e => setTag(e.target.value)}>
                <option value="F">上學期（秋）</option>
                <option value="S">下學期（春）</option>
              </select>
            </div>
          </div>

          <div className="field-help" style={{ marginBottom: 10 }}>
            會建立 <b>{plan.length}</b> 週
            {dup > 0 && <> · 其中 <b>{dup}</b> 週已經存在（<b>不會動到</b>，只補上缺的 {fresh.length} 週）</>}
            {plan.length > 0 && <> · {plan[0].zhRange} 到 {plan[plan.length - 1].zhRange}</>}
          </div>

          <div className="term-preview">
            {plan.map(p => (
              <div key={p.id} className={'term-chip' + (have.has(p.id) ? ' dup' : '')}>
                <b>第 {p.n} 週</b>
                <span>{p.zhRange}</span>
                {have.has(p.id) && <em>已存在</em>}
              </div>
            ))}
          </div>

          <div className="field-help" style={{ marginTop: 12 }}>
            💡 週次先開好、內容慢慢補就好——<b>還沒放東西的週次，學生端不會看到</b>，
            所以不會出現一整排空白。（老師模式看得到全部。）
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>取消</button>
          <button className="btn primary" disabled={fresh.length === 0}
            onClick={() => onCreate(fresh, categories)}>
            {fresh.length === 0 ? '沒有需要新增的週次' : `建立 ${fresh.length} 週 →`}
          </button>
        </div>
      </div>
    </div>
  );
}

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
          <button className="modal-close" aria-label="關閉" onClick={onClose}><Icon name="close" size={14}/></button>
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
  /* v398：預設改成 Raw JSON。這顆的用途是「期末備份」，而 data.js (legacy) 那個
     格式裡的 CATEGORIES／helper 是寫死的舊版樣板，拿去覆蓋現在的 data.js 會壞。
     備份要的是純資料，所以一打開就停在 JSON。 */
  const [mode, setMode] = useS("json");
  const [copied, setCopied] = useS(false);

  useE(() => { if (open) { setMode("json"); setCopied(false); } }, [open]);

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
          <button className="modal-close" aria-label="關閉" onClick={onClose}><Icon name="close" size={14}/></button>
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

/* ── 分段閱讀共用 helpers（v281 抽出：段落題與綜合題共用同一套題目編輯/匯入）── */
const grMkId = (p) => p + Date.now() + Math.random().toString(36).slice(2, 5);

/* v290: OCR 的「行」是否落在框內——y 中心在框的縱向範圍且 x 有重疊（舊資料沒 x 就只看 y） */
function grLineInRect(l, r) {
  if (l.y < r.y || l.y > r.y + r.h) return false;
  if (l.x == null) return true;
  return (l.x + (l.w || 0)) > r.x && l.x < r.x + r.w;
}

/* v287: OCR——照片/PDF 的「點字查義＋朗讀」資料來源。Tesseract.js 用到才從 CDN 載。 */
const loadTesseract = () => new Promise((resolve, reject) => {
  if (window.Tesseract) return resolve(window.Tesseract);
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js';
  s.onload = () => resolve(window.Tesseract);
  s.onerror = () => reject(new Error('OCR 元件載入失敗，請確認網路'));
  document.head.appendChild(s);
});
async function grOcrWorker() {
  const T = await loadTesseract();
  const worker = await T.createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  return worker;
}
// 座標一律存成整張圖的比例（0~1）——裁切段落顯示時換算成該帶內位置
async function grOcrCanvas(worker, cv) {
  const { data } = await worker.recognize(cv);
  const W = cv.width, H = cv.height;
  const r4 = (n) => Math.round(n * 10000) / 10000;
  const words = (data.words || [])
    .filter(w => w.confidence > 50 && w.bbox && /[A-Za-z]/.test(w.text))
    .map(w => ({
      t: String(w.text).replace(/^[^A-Za-z'’-]+|[^A-Za-z'’-]+$/g, ''),
      r: String(w.text).trim().replace(/[|_~•·¤©®°§\\<>{}*#@^=+]+/g, ''), // v292: 含標點原文（朗讀用）
      x: r4(w.bbox.x0 / W), y: r4(w.bbox.y0 / H),
      w: r4((w.bbox.x1 - w.bbox.x0) / W), h: r4((w.bbox.y1 - w.bbox.y0) / H),
    }))
    .filter(w => w.t.length > 1);
  const lines = (data.lines || [])
    .filter(l => l.bbox && String(l.text || '').trim())
    .map(l => ({
      t: String(l.text).trim(),
      y: r4(((l.bbox.y0 + l.bbox.y1) / 2) / H),
      x: r4(l.bbox.x0 / W), w: r4((l.bbox.x1 - l.bbox.x0) / W), // v290: 朗讀區域框選需要水平位置
    }));
  return { words, lines };
}

// v299: OCR 移到背景跑——共用一個「暖」worker（15MB 模型只載一次，不再每次匯入重載）；
// OCR 前把 canvas 縮到 1200px（座標存 0~1 比例，縮圖不影響定位）＝辨識更快。
let _grWarmWorkerP = null;
function grWarmWorker() {
  if (!_grWarmWorkerP) _grWarmWorkerP = grOcrWorker().catch(e => { _grWarmWorkerP = null; throw e; });
  return _grWarmWorkerP;
}
function grOcrScaled(cv) {
  const MAX = 1200, k = Math.min(1, MAX / Math.max(cv.width, cv.height));
  if (k >= 1) return cv;
  const c2 = document.createElement('canvas');
  c2.width = Math.round(cv.width * k); c2.height = Math.round(cv.height * k);
  c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height);
  return c2;
}

/* v387（Alan：「分段閱讀上傳 PDF 太久了」）——記憶體那一半的修法。
   原本 srcCache 存的是「整張已解碼的畫布」：1600×2264 × 4 bytes ＝ 一頁 14.5MB，
   20 頁就 290MB，40 頁 580MB。iPad 上會 GC 抖動、畫布被系統回收、甚至整頁掛掉，
   而且越後面的頁越慢——這正是「太久」的體感來源之一。
   改成存壓好的 JPEG blob（一頁約 0.5MB，少 24 倍），
   背景 OCR 要用的時候再解碼，而且直接解到 1200px（OCR 本來就只吃這個大小）。 */
async function grDecodeScaled(blob, MAX) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('圖片解碼失敗'));
      i.src = url;
    });
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const k = Math.min(1, (MAX || 1200) / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

// 匯入解析——沿用測驗題慣例「第一個選項＝正解」；0–1 個選項欄＝簡答題；
// 分段閱讀作答時不洗牌，所以匯入當下就把選項打散。
function grParseImport(text) {
  const lines = String(text || '').split('\n').map(l => l.replace(/\r/g, '')).filter(l => l.trim());
  const errs = [], adds = [];
  lines.forEach((line, li) => {
    const cols = line.split('\t').map(c => c.trim());
    const q = cols[0] || '';
    if (!q) { errs.push(`第 ${li + 1} 行：沒有題目文字`); return; }
    const rest = cols.slice(1).filter(Boolean);
    if (rest.length >= 2) {
      const options = rest.slice(0, 4);
      const correctText = options[0];
      for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
      const answer = options.indexOf(correctText);
      while (options.length < 4) options.push('');
      adds.push({ id: grMkId('gq'), kind: 'mc', q, options, answer });
    } else {
      adds.push({ id: grMkId('gq'), kind: 'short', q, keyPoints: rest[0] || '' });
    }
  });
  return { errs, adds };
}

/* 題目清單編輯器——段落題與綜合題共用：題目卡＋新增＋⬇ 匯入面板 */
function GrQuestionsEditor({ qs, onChange, impOpen, onToggleImp, impText, onImpText, previewLabel, inputStyle, aiHint }) {
  const addQ = (kind) => onChange([...qs, kind === 'short'
    ? { id: grMkId('gq'), kind: 'short', q: '', keyPoints: '' }
    : { id: grMkId('gq'), kind: 'mc', q: '', options: ['', '', '', ''], answer: 0 }]);
  const updQ = (qi, patch) => onChange(qs.map((q, i) => i === qi ? { ...q, ...patch } : q));
  const delQ = (qi) => onChange(qs.filter((_, i) => i !== qi));
  const { errs, adds } = impOpen ? grParseImport(impText) : { errs: [], adds: [] };
  const mcN = adds.filter(a => a.kind === 'mc').length;
  const doImp = () => {
    if (errs.length || !adds.length) return;
    onChange([...qs, ...adds]);
    onImpText(''); onToggleImp();
  };

  return (
    <>
      {qs.map((q, qi) => (
        <div key={q.id || qi} style={{border:'1px dashed var(--border)',borderRadius:6,padding:'10px 12px',marginTop:8,background:'var(--bg)'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
            <span style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-muted)'}}>{q.kind === 'short' ? '✍ 簡答' : '🅰 選擇'} Q{qi + 1}</span>
            <span style={{flex:1}}/>
            <button onClick={() => { if (confirm('刪除這一題？')) delQ(qi); }}
              style={{color:'var(--accent)',background:'none',border:'none',cursor:'pointer',fontSize:13}}>✕</button>
          </div>
          <input value={q.q || ''} onChange={e => updQ(qi, { q: e.target.value })}
            placeholder={q.kind === 'short' ? 'Why did the fox let the balloon go?' : 'What did the fox find in the forest?'}
            style={inputStyle}/>
          {q.kind === 'short' ? (
            <>
              <input value={q.keyPoints || ''} onChange={e => updQ(qi, { keyPoints: e.target.value })}
                placeholder="答案要點（AI 評分依據，用 / 分隔，選填）"
                style={{...inputStyle,marginTop:6}}/>
              <div className="field-help" style={{marginTop:4}}>{aiHint || 'AI 會拿「這一段的文字＋答案要點」批改，給 1–5 星。'}</div>
            </>
          ) : (
            <div style={{marginTop:6,display:'grid',gap:6}}>
              {(q.options || ['', '', '', '']).map((opt, oi) => (
                <label key={oi} style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="radio" checked={(q.answer || 0) === oi} onChange={() => updQ(qi, { answer: oi })} title="正確答案"/>
                  <input value={opt}
                    onChange={e => { const os = [...(q.options || ['', '', '', ''])]; os[oi] = e.target.value; updQ(qi, { options: os }); }}
                    placeholder={`選項 ${['A', 'B', 'C', 'D'][oi]}${oi >= 2 ? '（選填）' : ''}`}
                    style={inputStyle}/>
                </label>
              ))}
              <div className="field-help" style={{margin:0}}>點左邊圓圈＝正確答案。至少填 A、B 兩個選項；選項照你排的順序顯示（不洗牌）。</div>
            </div>
          )}
        </div>
      ))}

      <div style={{display:'flex',gap:6,marginTop:8}}>
        <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}} onClick={() => addQ('mc')}>＋ 選擇題</button>
        <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}} onClick={() => addQ('short')}>＋ 簡答題</button>
        <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}} onClick={() => { onImpText(''); onToggleImp(); }}>
          {impOpen ? '✕ 取消' : '⬇ 匯入'}
        </button>
      </div>

      {impOpen && (
        <div style={{marginTop:8,padding:'10px 12px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg)'}}>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-muted)',marginBottom:6,lineHeight:1.8}}>
            從 Excel / Google Sheets 複製貼上，每行一題：<br/>
            選擇題：<code style={{background:'var(--border-soft)',padding:'1px 4px',borderRadius:2}}>題目 [Tab] 正解 [Tab] 其他選項…</code>（跟測驗題一樣<b>第一個＝正解</b>，最多 4 個，匯入時自動打散順序）<br/>
            簡答題：<code style={{background:'var(--border-soft)',padding:'1px 4px',borderRadius:2}}>題目 [Tab] 答案要點（選填，用 / 分隔）</code>——選項欄只有 0–1 個就算簡答
          </div>
          <textarea
            value={impText}
            onChange={e => onImpText(e.target.value)}
            rows={5}
            placeholder={"What did the fox find?\tA red balloon\tA kite\tA hat\nWhy was the fox happy?\tHe found a balloon / He liked red"}
            style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:2,fontSize:12,fontFamily:'var(--mono)',resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}
          />
          {errs.length > 0 && (
            <div style={{color:'#dc2626',fontSize:12,marginTop:4,whiteSpace:'pre-line'}}>{errs.slice(0, 5).join('\n')}</div>
          )}
          <div style={{display:'flex',gap:8,marginTop:6,alignItems:'center'}}>
            <span style={{fontSize:12,color:'var(--ink-muted)'}}>
              {adds.length ? `${previewLabel}：${mcN} 題選擇＋${adds.length - mcN} 題簡答` : ''}
            </span>
            <span style={{flex:1}}/>
            <button className="btn ghost" style={{fontSize:12,padding:'5px 12px'}}
              onClick={() => { onImpText(''); onToggleImp(); }}>取消</button>
            <button className="btn primary" style={{fontSize:12,padding:'5px 14px'}}
              onClick={doImp} disabled={!adds.length || errs.length > 0}>
              匯入{adds.length ? `（${adds.length} 題）` : ''}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── GuidedReadingEditor 分段閱讀（v276；v277 照片＋裁切；v278 PDF；v281 綜合題）──
   段落 = { id, text, img?:{url, ar, y0, y1}, questions:[{kind:'mc',q,options[4],answer} | {kind:'short',q,keyPoints}] }
   grFinal = 全部讀完後的整篇綜合題（同題目格式）；img 只存裁切範圍，不產生新圖檔 */
function GuidedReadingEditor({ itemId, itemTitle, itemGroup, onSideItems, catItems, weekItems, linkedFlashcardId, onChangeLinked, linkedFcRequired, onChangeRequired, audioUrl, onChangeAudio, segments, onChange, finalQs, onChangeFinal }) {
  // v364: 單字卡多半在「單字」分類，只找同分類會找不到 → 改看整週所有分類
  const fcOptions = (((weekItems && weekItems.length) ? weekItems : (catItems || []))
    .filter(it => it.type === 'flashcard' && (it.cards || []).length > 0));
  const [pasting, setPasting] = useS(false);
  const [pasteText, setPasteText] = useS('');
  const [uploading, setUploading] = useS('');
  const [upErr, setUpErr] = useS('');
  const [cropSeg, setCropSeg] = useS(null); // 開啟裁切視窗的段落
  /* v407（Alan：「能夠根據每一段自動生成題目」）——AI 自動出題的設定 */
  const [aiOpen,  setAiOpen]  = useS(false);
  const [aiGrade, setAiGrade] = useS('g4');
  const [aiPerM,  setAiPerM]  = useS(2);   // 每段幾題選擇
  const [aiPerS,  setAiPerS]  = useS(1);   // 每段幾題簡答
  const [aiFinM,  setAiFinM]  = useS(3);   // 整篇綜合幾題選擇
  const [aiFinS,  setAiFinS]  = useS(1);   // 整篇綜合幾題簡答
  const [aiSkills, setAiSkills] = useS([]);
  const [aiReplace, setAiReplace] = useS(false);
  const [aiRun,   setAiRun]   = useS('');  // 進度文字（空字串＝沒在跑）
  const [aiErr,   setAiErr]   = useS('');
  const [aiInfo,  setAiInfo]  = useS('');  // 跑完的回報（出了幾題、跳過哪幾段、擋掉幾題）
  const [bulkOpen, setBulkOpen] = useS(false);   // v387: 一次匯入所有段落的題目
  const [bulkText, setBulkText] = useS('');
  const [bulkReplace, setBulkReplace] = useS(false);
  const [impSeg, setImpSeg] = useS(null);   // 哪個匯入面板打開（段索引 | 'final'）
  const [impText, setImpText] = useS('');
  const [reOcrSeg, setReOcrSeg] = useS(null); // v288: 等老師重選原始檔辨識的段落
  const [regSeg, setRegSeg] = useS(null);     // v290: 開啟「朗讀區域」框選的段落
  const fileRef = React.useRef(null);
  const pdfRef = React.useRef(null);
  const reOcrRef = React.useRef(null);
  const audioRef = React.useRef(null);
  // v299: OCR 不再卡住匯入——背景跑。canvasCache 留著剛匯入的畫布（避開 Storage CORS）；
  // segRef 永遠指向最新 segments，背景回填才不會蓋掉老師同時在改的內容。
  const canvasCache = React.useRef(new Map()); // v387: img.url -> 壓好的 JPEG blob（本來存整張畫布，太吃記憶體）
  const segRef = React.useRef(segments); segRef.current = segments;
  const bgBusy = React.useRef(false);
  const [ocrStatus, setOcrStatus] = useS(''); // 非阻塞的小提示（不 disable 匯入鈕）
  const queueBgOcr = async () => {
    if (bgBusy.current) return; // 已有一個背景任務在跑；它會邊跑邊撿新加進來的
    bgBusy.current = true;
    let worker = null;
    try {
      while (true) {
        const cur = (segRef.current || []).find(s => s.img && s.img.url && !s.img.wordsId && canvasCache.current.has(s.img.url));
        if (!cur) break;
        const left = (segRef.current || []).filter(s => s.img && s.img.url && !s.img.wordsId && canvasCache.current.has(s.img.url)).length;
        setOcrStatus(`背景辨識單字中…還有 ${left} 張（可繼續編輯）`);
        if (!worker) { try { worker = await grWarmWorker(); } catch (e) { break; } } // 載不動就跳過，閱讀本身不受影響
        const src = canvasCache.current.get(cur.img.url);
        let wordsId;
        try {
          // v387: 快取存的是 blob → 現解碼成 OCR 要的大小（1200px）；舊路徑若還是畫布也照吃
          const cv = (src && src.getContext) ? grOcrScaled(src) : await grDecodeScaled(src, 1200);
          wordsId = await ocrAndSave(worker, cv);
        } catch (e) {}
        canvasCache.current.delete(cur.img.url); // 不論成功都移除，避免卡死迴圈
        if (wordsId) onChange((segRef.current || []).map(s => (s.img && s.img.url === cur.img.url) ? { ...s, img: { ...s.img, wordsId } } : s));
      }
    } finally { bgBusy.current = false; setOcrStatus(''); }
  };

  /* v387（Alan：「12 頁我就要上傳 12 次題目，想用匯入的方式一次搞定」）
   ── 一次匯入所有段落的題目 ──
   行格式在原本的基礎上，最前面多一欄「段號」：
       段號 [Tab] 題目 [Tab] 正解 [Tab] 其他選項…
   段號寫 0 / final / 綜合 ＝ 放到「整篇綜合題」。
   選擇題／簡答的判斷、第一個選項＝正解、匯入時打散、補滿 4 格——
   全部沿用 grParseImport 的規則（同一套，不另立門戶）。 */
function grParseBulk(text, segCount) {
  const lines = String(text || '').split('\n').map(l => l.replace(/\r/g, '')).filter(l => l.trim());
  const errs = [], bySeg = {}, finalAdds = [];
  let total = 0;
  lines.forEach((line, li) => {
    const cols = line.split('\t').map(c => c.trim());
    const tag = (cols[0] || '').trim();
    const q = cols[1] || '';
    if (!tag) { errs.push(`第 ${li + 1} 行：最前面要先寫段號`); return; }
    if (!q) { errs.push(`第 ${li + 1} 行：沒有題目文字`); return; }
    const isFinal = /^(0|final|綜合|整篇)$/i.test(tag);
    let idx = -1;
    if (!isFinal) {
      const m = tag.match(/\d+/);                       // 「第3段」「P3」「3.」都吃
      if (!m) { errs.push(`第 ${li + 1} 行：看不懂段號「${tag}」`); return; }
      idx = parseInt(m[0], 10) - 1;
      if (idx < 0 || idx >= segCount) { errs.push(`第 ${li + 1} 行：沒有第 ${m[0]} 段（目前只有 ${segCount} 段）`); return; }
    }
    const rest = cols.slice(2).filter(Boolean);
    let item;
    if (rest.length >= 2) {
      const options = rest.slice(0, 4);
      const correctText = options[0];
      for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [options[i], options[j]] = [options[j], options[i]]; }
      const answer = options.indexOf(correctText);
      while (options.length < 4) options.push('');
      item = { id: grMkId('gq'), kind: 'mc', q, options, answer };
    } else {
      item = { id: grMkId('gq'), kind: 'short', q, keyPoints: rest[0] || '' };
    }
    total++;
    if (isFinal) finalAdds.push(item);
    else (bySeg[idx] = bySeg[idx] || []).push(item);
  });
  return { errs, bySeg, finalAdds, total };
}

// v290: 取一段的「主文」文字——有框選就只拿主文框內的行；沒框就整個裁切帶
  const grSegMainText = async (s) => {
    if ((s.text || '').trim()) return s.text.trim();
    if (!s.img || !s.img.wordsId) return '';
    const d = await window.fetchReadingWords(s.img.wordsId);
    if (!d) return '';
    const zy0 = s.img.y0 || 0, zy1 = s.img.y1 == null ? 1 : s.img.y1;
    const main = (s.img.readRects || []).find(r => r.kind === 'main');
    // v292: 字層級過濾——OCR 的行會跨欄黏到圖說，行過濾擋不乾淨
    return window.grReadTextFrom(d, zy0, zy1, main || null);
  };

  // v290: AI 產生自然朗讀——每段產生一個 MP3（seg.audioUrl），只餵主文
  const genAiAudio = async () => {
    setUpErr('');
    const targets = segments.map((s, i) => ({ s, i })).filter(({ s }) => (s.text || '').trim() || (s.img && s.img.wordsId));
    if (!targets.length) { setUpErr('沒有可朗讀的內容——請先加文字，或幫照片「🔍 辨識單字」。'); return; }
    try {
      const out = [...segments];
      for (let k = 0; k < targets.length; k++) {
        const { s, i } = targets[k];
        setUploading(`AI 產生朗讀 ${k + 1}/${targets.length}…`);
        const text = await grSegMainText(s);
        if (!text.trim()) continue;
        const blob = await window.generateTtsAudio(text);
        const url = await window.uploadReadingAudio(itemId || 'gr', new File([blob], `seg${i + 1}.mp3`, { type: 'audio/mpeg' }));
        out[i] = { ...out[i], audioUrl: url };
      }
      onChange(out);
    } catch (err) {
      const msg = String((err && err.message) || err);
      setUpErr(msg === 'tts-missing'
        ? '🗣 AI 語音還沒開通——需要在你的 Cloudflare Worker 貼一小段程式（步驟我已經給你，照著做一次就永久有效）。'
        : 'AI 朗讀產生失敗：' + msg);
    }
    setUploading('');
  };


  /* ══ v407：AI 依「每一段」自動出題 ═══════════════════════════════════════
     Alan：「分段閱讀我希望我匯入圖片或是文字或是檔案，能夠根據每一段自動生成題目。
             先從 reading comprehension 出題就好。最後統整…配合 reading skill 也很好，
             但不能亂出，要真的符合文章」

     文字從哪裡來：直接用 grSegMainText——貼的文字就用文字，照片就用 OCR 的結果
     （跟「AI 產生朗讀」同一條路，所以照片段落只要背景辨識跑完就有文字，
       不用再多做一次 OCR）。還沒有文字的段落會被跳過，而且會明確報段號。

     「不能亂出」是 data.js 那邊用程式擋的（rcGroundedMcq / rcGroundedSa /
     rcGroundedBlock：AI 引用的線索句必須真的在文章裡）——這裡只負責把
     「擋掉了幾題」誠實回報，不要讓老師以為每次都剛好出滿。 */
  const AI_SKILL_LIST = Object.keys(window.RC_SKILLS || {});
  const runAiQuestions = async () => {
    setAiErr(''); setAiInfo(''); setAiRun('讀取每一段的文字…');
    try {
      const list = segRef.current || [];
      const texts = [];
      for (let i = 0; i < list.length; i++) {
        let t = '';
        try { t = await grSegMainText(list[i]); } catch (e) { t = ''; }
        texts.push({ i, text: t });
      }
      const r = await window.aiMakeGuidedQuestions({
        segments: texts, title: itemTitle || '', grade: aiGrade,
        perMcq: aiPerM, perSa: aiPerS, finalMcq: aiFinM, finalSa: aiFinS, skills: aiSkills,
        onProgress: (d, tot, label) => setAiRun(`出題中 ${d}/${tot}${label ? ' · ' + label : ''}`),
      });

      // 寫回段落（segRef 永遠是最新的——老師在等待時可能又改了東西）
      onChange((segRef.current || []).map((sg, i) => {
        const adds = r.bySeg[i];
        if (!adds) return aiReplace ? { ...sg, questions: [] } : sg;
        return { ...sg, questions: (aiReplace ? [] : (sg.questions || [])).concat(adds) };
      }));
      if (r.final.length || aiReplace) onChangeFinal((aiReplace ? [] : (finalQs || [])).concat(r.final));

      /* 閱讀技巧是另一個型別的單元，塞不進分段閱讀 → 交給 EditorModal 掛在 __side，
         存檔時跟這一份分段閱讀一起建立（同一週、同一個分組）。 */
      if (r.blocks.length && onSideItems) {
        const nChips = r.blocks.reduce((n, b) => n + (b.chips || []).length, 0);
        onSideItems([{
          id: 'gr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + 'rs',
          type: 'reading-skill', group: itemGroup || undefined,
          title: (itemTitle || '分段閱讀') + ' · 閱讀技巧',
          zh: `${r.blocks.length} 種技巧 · ${nChips} 張卡片`,
          rsPassage: r.passage || '', rsBlocks: r.blocks,
        }]);
      }

      const bits = [`出了 ${r.made} 題`];
      if (r.blocks.length) bits.push(`另外做了一份「閱讀技巧」單元（${r.blocks.length} 種，存檔時一起建立）`);
      if (aiSkills.length && !r.blocks.length) bits.push('閱讀技巧這次對不上文章，沒有硬做（寧可不出）');
      if (r.skipped.length) bits.push(`第 ${r.skipped.map(i => i + 1).join('、')} 段字太少或還沒辨識出文字，已跳過`);
      if (r.dropped) bits.push(`另有 ${r.dropped} 題因為「文章裡找不到根據」被程式擋掉`);
      setAiInfo(bits.join('；') + '。題目都在下面，可以直接改。');
      setAiOpen(false);
    } catch (e) {
      setAiErr(String((e && e.message) || e));
    }
    setAiRun('');
  };

  const mkId = grMkId;

  // 照片縮到最長邊 1600px JPEG（同上傳作業的做法），順便量長寬比
  const shrinkPhoto = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1600;
      const k = Math.min(1, MAX / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * k));
      cv.height = Math.max(1, Math.round(img.height * k));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => b ? resolve({ blob: b, ar: cv.height / cv.width, cv }) : reject(new Error('無法處理這張圖片')), 'image/jpeg', 0.85);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('圖片讀取失敗')); };
    img.src = URL.createObjectURL(file);
  });

  // v287: 上傳後順手 OCR（點字查義＋朗讀用）——失敗不擋上傳，之後可按「🔍 辨識單字」補
  // v288: 改存 Firestore（Storage 下載沒有 CORS 標頭，學生端 fetch 會被瀏覽器擋）
  const ocrAndSave = async (worker, cv) => {
    try {
      const wl = await grOcrCanvas(worker, cv);
      if (!wl.words.length) return undefined;
      return await window.saveReadingWords(wl);
    } catch (e) { return undefined; }
  };

  const pickPhotos = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => /^image\//.test(f.type));
    e.target.value = '';
    if (!files.length) return;
    setUpErr('');
    const added = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setUploading(`上傳中 ${i + 1}/${files.length}…`);
        const { blob, ar } = await shrinkPhoto(files[i]);
        const url = await window.uploadReadingPhoto(itemId || 'gr', blob);
        canvasCache.current.set(url, blob); // v299/v387: 留著給背景 OCR（避開下載 CORS）；存 blob 不存畫布
        added.push({ id: mkId('gs'), text: '', img: { url, ar, y0: 0, y1: 1 }, questions: [] });
      }
    } catch (err) {
      setUpErr('上傳失敗：' + ((err && err.message) || err) + '——請確認你是用老師帳號登入。');
    }
    if (added.length) { onChange([...segRef.current, ...added]); queueBgOcr(); } // 段落立刻出現，OCR 背景跑
    setUploading('');
  };

  // v278: 匯入掃描 PDF——pdf.js（用到才從 CDN 載）把每頁畫成 1600px JPEG，
  // 之後跟照片完全同一條路：一頁＝一段，太長再 ✂ 裁切
  const loadPdfJs = () => new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } catch (e) {}
      resolve(window.pdfjsLib);
    };
    s.onerror = () => reject(new Error('PDF 元件載入失敗，請確認網路'));
    document.head.appendChild(s);
  });

  const pickPdf = async (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    setUpErr('');
    const added = [];
    const pageErrs = [];
    try {
      setUploading('讀取 PDF…');
      const pdfjs = await loadPdfJs();
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      const N = pdf.numPages;
      /* v387（Alan：「上傳 PDF 太久了」）——原本是「算圖→上傳→算圖→上傳」整條都是序列的，
         而上傳（含 getDownloadURL 那一趟）才是最花時間的一段，網路等待期間 CPU 完全閒著。
         改成「一次算 3 頁 → 這 3 頁同時上傳 → 再算下 3 頁」。
         為什麼是分批而不是全開：全部一起丟會同時佔住記憶體與頻寬，
         而且錯誤處理很難寫對；分批的順序天然是對的（組內再依頁碼排一次）。
         單一頁失敗不再讓整份匯入前功盡棄——記下來，其他頁照樣建立。 */
      const LIMIT = 3;
      for (let start = 1; start <= N; start += LIMIT) {
        const group = [];
        for (let p = start; p < start + LIMIT && p <= N; p++) {
          setUploading(`轉換第 ${p}/${N} 頁…`);
          const page = await pdf.getPage(p);
          const vp1 = page.getViewport({ scale: 1 });
          // v387: 1600 → 1400。OCR 本來就只吃 1200px，1600 純粹是多算多傳；
          //       1400 仍比 OCR 需要的大，學生放大看也還夠清楚。
          const vp = page.getViewport({ scale: Math.min(3, 1400 / vp1.width) });
          const cv = document.createElement('canvas');
          cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
          await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
          const blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('頁面轉檔失敗')), 'image/jpeg', 0.85));
          const ar = cv.height / cv.width;
          cv.width = cv.height = 0;                 // 立刻把這張畫布的記憶體還回去
          try { page.cleanup(); } catch (e2) {}     // pdf.js 也會留著解碼後的影像
          group.push({ p, blob, ar });
        }
        const last = Math.min(start + LIMIT - 1, N);
        setUploading(`上傳第 ${start}${last > start ? '–' + last : ''}/${N} 頁…`);
        const done = await Promise.all(group.map(async (g) => {
          try {
            const url = await window.uploadReadingPhoto(itemId || 'gr', g.blob);
            canvasCache.current.set(url, g.blob);   // v387: 存 blob 給背景 OCR
            return { p: g.p, seg: { id: mkId('gs'), text: '', img: { url, ar: g.ar, y0: 0, y1: 1 }, questions: [] } };
          } catch (err) { pageErrs.push(g.p); return null; }
        }));
        done.filter(Boolean).sort((a, b) => a.p - b.p).forEach(r => added.push(r.seg));
      }
      try { pdf.destroy(); } catch (e2) {}
    } catch (err) {
      setUpErr('PDF 匯入失敗：' + ((err && err.message) || err));
    }
    if (pageErrs.length) setUpErr(`第 ${pageErrs.join('、')} 頁上傳失敗（其餘 ${added.length} 頁已建立），可以再匯入一次補這幾頁。`);
    if (added.length) { onChange([...segRef.current, ...added]); queueBgOcr(); } // 頁面立刻出現，OCR 背景跑
    setUploading('');
  };

  // v287: 舊照片（還沒有單字資料的）補辨識——同一張照片的所有段落共用同一份
  // v288: Storage 檔案下載沒有 CORS 標頭→雲端照片讀不到像素。先試一次（帶 cache-buster），
  //       失敗就請老師重選「原始照片檔」在本機辨識（只辨識、不重新上傳照片）。
  const finishOcr = async (seg, cv) => {
    let worker = null;
    try {
      worker = await grOcrWorker();
      const wl = await grOcrCanvas(worker, cv);
      if (!wl.words.length) throw new Error('辨識不到英文字（照片太模糊或沒有英文）');
      const wordsId = await window.saveReadingWords(wl);
      onChange(segments.map(s => (s.img && s.img.url === seg.img.url) ? { ...s, img: { ...s.img, wordsId } } : s));
      setReOcrSeg(null);
    } finally {
      if (worker) { try { await worker.terminate(); } catch (e2) {} }
    }
  };

  const ocrExisting = async (seg) => {
    setUpErr('');
    try {
      setUploading('辨識單字中…（第一次會多等幾秒）');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('cors')); img.src = seg.img.url + '&r=' + Date.now(); });
      const cv = document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext('2d').drawImage(img, 0, 0);
      await finishOcr(seg, cv);
    } catch (err) {
      if (String(err && err.message) === 'cors') {
        setReOcrSeg(seg);
        setUpErr('瀏覽器擋住了雲端照片的讀取——請按照片下方新出現的「📁 選原始照片來辨識」，選你當初的同一張照片（只用來辨識，不會重新上傳）。');
      } else {
        setUpErr('辨識失敗：' + ((err && err.message) || err));
      }
    }
    setUploading('');
  };

  // v289: 課文音檔——課本配音/老師自錄；學生閱讀頁優先播這個（取代機器人 TTS）
  const pickAudio = async (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setUpErr('音檔太大（上限 20MB）——請先壓成 MP3'); return; }
    setUpErr('');
    try {
      setUploading('上傳音檔中…');
      const url = await window.uploadReadingAudio(itemId || 'gr', file);
      onChangeAudio(url);
    } catch (err) {
      setUpErr('音檔上傳失敗：' + ((err && err.message) || err));
    }
    setUploading('');
  };

  const pickReOcr = async (e) => {
    const file = (e.target.files || [])[0];
    e.target.value = '';
    if (!file || !reOcrSeg) return;
    setUpErr('');
    try {
      setUploading('辨識單字中…');
      const { cv } = await shrinkPhoto(file);
      await finishOcr(reOcrSeg, cv);
    } catch (err) {
      setUpErr('辨識失敗：' + ((err && err.message) || err));
    }
    setUploading('');
  };

  // 裁切確認：同一張照片的所有段落照新裁切線重建；原本各段的題目/文字按順序保留
  const applyCrop = (bands) => {
    const url = cropSeg.img.url;
    const isSame = (s) => s.img && s.img.url === url;
    const groupSegs = segments.filter(isSame).sort((a, b) => (a.img.y0 || 0) - (b.img.y0 || 0));
    const gi = segments.findIndex(isSame);
    const rest = segments.filter(s => !isSame(s));
    const insertAt = segments.slice(0, gi).filter(s => !isSame(s)).length;
    const rebuilt = bands.map((b, i) => {
      const prev = groupSegs[i];
      // v306: 裁切重建段落時，保留同一張照片的 OCR 辨識(wordsId/Url)、朗讀區域(readRects)、
      // 以及已產生的每段 AI 音檔(audioUrl)——座標都是整圖比例，重切後仍然有效，不該整批丟掉。
      const img = { url, ar: cropSeg.img.ar, y0: b[0], y1: b[1] };
      if (cropSeg.img.wordsId)  img.wordsId  = cropSeg.img.wordsId;
      if (cropSeg.img.wordsUrl) img.wordsUrl = cropSeg.img.wordsUrl;
      const rects = (prev && prev.img && prev.img.readRects) || cropSeg.img.readRects;
      if (rects) img.readRects = rects;
      const seg = {
        id: (prev && prev.id) || mkId('gs'),
        text: (prev && prev.text) || '',
        img,
        questions: (prev && prev.questions) || [],
      };
      if (prev && prev.audioUrl) seg.audioUrl = prev.audioUrl;
      return seg;
    });
    onChange([...rest.slice(0, insertAt), ...rebuilt, ...rest.slice(insertAt)]);
    setCropSeg(null);
  };
  const upd = (i, patch) => onChange(segments.map((s, si) => si === i ? { ...s, ...patch } : s));
  const delSeg = (i) => onChange(segments.filter((_, si) => si !== i));
  const moveSeg = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= segments.length) return;
    const a = [...segments]; [a[i], a[j]] = [a[j], a[i]];
    onChange(a);
  };
  const addSeg = () => onChange([...segments, { id: mkId('gs'), text: '', questions: [] }]);

  // v387: 一次匯入所有段落的題目
  const bulk = bulkOpen ? grParseBulk(bulkText, segments.length) : { errs: [], bySeg: {}, finalAdds: [], total: 0 };
  const doBulk = () => {
    if (bulk.errs.length || !bulk.total) return;
    onChange(segments.map((s, i) => {
      const adds = bulk.bySeg[i];
      if (!adds) return bulkReplace ? { ...s, questions: [] } : s;
      return { ...s, questions: (bulkReplace ? [] : (s.questions || [])).concat(adds) };
    }));
    if (bulk.finalAdds.length || bulkReplace) {
      onChangeFinal((bulkReplace ? [] : (finalQs || [])).concat(bulk.finalAdds));
    }
    setBulkText(''); setBulkOpen(false); setBulkReplace(false);
  };

  const pasteChunks = pasteText.split(/\n\s*\n+/).map(t => t.trim()).filter(Boolean);
  const doPaste = () => {
    if (!pasteChunks.length) return;
    onChange([...segments, ...pasteChunks.map(t => ({ id: mkId('gs'), text: t, questions: [] }))]);
    setPasteText(''); setPasting(false);
  };

  const inputStyle = {width:'100%',padding:'8px 10px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:3,fontSize:13,boxSizing:'border-box'};

  return (
    <div className="field">
      {/* v286: 綁定單字卡——學生在「開始閱讀」前先練文章單字（Alan 要的流程） */}
      {fcOptions.length > 0 && (
        <div className="field" style={{marginBottom:14}}>
          <label className="field-label">🃏 綁定單字卡 · 讀文章前先練（選填）</label>
          <select
            value={linkedFlashcardId || ''}
            onChange={e => onChangeLinked(e.target.value)}
            style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--ink)',borderRadius:3,fontSize:14}}
          >
            <option value="">— 不綁定 (None) —</option>
            {fcOptions.map(fc => (
              <option key={fc.id} value={fc.id}>{fc.title}（{(fc.cards || []).length} 張）</option>
            ))}
          </select>
          <div className="field-help">綁定後，學生的開始頁會多一張金色「先練習本文章單字」卡。</div>
          {/* v364: 必修／選修 */}
          {linkedFlashcardId && (
            <label className="gr-fc-must">
              <input type="checkbox" checked={!!linkedFcRequired}
                onChange={e => onChangeRequired(e.target.checked)}/>
              <span><b>必須先練完才能開始讀</b>——沒把單字卡的「📖 學習」模式跑完，「開始閱讀」會鎖住。不勾＝可以直接跳過去讀。</span>
            </label>
          )}
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8,gap:6,flexWrap:'wrap'}}>
        <label className="field-label" style={{margin:0}}>段落 Segments ({segments.length})</label>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button className="btn primary" style={{fontSize:11,padding:'5px 12px'}}
            onClick={() => pdfRef.current && pdfRef.current.click()} disabled={!!uploading}>
            {uploading || '📄 匯入 PDF'}
          </button>
          <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}}
            onClick={() => fileRef.current && fileRef.current.click()} disabled={!!uploading}>
            📷 照片
          </button>
          <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}} onClick={() => setPasting(v => !v)}>
            {pasting ? '✕ 取消' : '⬇ 貼文字'}
          </button>
          {/* v407：AI 依每一段自動出題（Alan 要的「匯入完就自動生題目」） */}
          <button className="btn ghost gr-ai-btn" style={{fontSize:11,padding:'5px 10px'}}
            disabled={!segments.length || !!aiRun}
            onClick={() => { setAiErr(''); setAiOpen(v => !v); }}
            title="每一段各出幾題閱讀理解，最後再出一組整篇綜合題">
            {aiRun || (aiOpen ? '✕ 取消' : '🤖 AI 自動出題')}
          </button>
          <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}} disabled={!segments.length}
            onClick={() => setBulkOpen(v => !v)}
            title="12 頁不用開 12 次——一次把每一頁的題目都貼進來">
            {bulkOpen ? '✕ 取消' : '📋 一次匯入所有題目'}
          </button>
        </div>
      </div>

      {/* v407：AI 自動出題的設定面板 ────────────────────────────────────
          刻意跟「📋 一次匯入所有題目」長得一樣（同一種紙感卡片、同一個位置），
          因為它們做的是同一件事，只是一個用貼的、一個用生的。 */}
      {aiOpen && (
        <div className="gr-ai-panel">
          <div className="gr-ai-note">
            每一段各出幾題<b>閱讀理解</b>，最後再出一組<b>整篇綜合題</b>。
            題目只會問「那一段裡寫的事」——學生還沒讀到後面，問後面就是壞題。<br/>
            AI 出完會由<b>程式再驗一次</b>：它引用的線索句必須真的在文章裡，
            對不上的整題丟掉重出（<b>不會硬湊題數</b>，最後會告訴你擋掉幾題）。
          </div>
          <div className="gr-ai-grid">
            <label>學生程度
              <select value={aiGrade} onChange={e => setAiGrade(e.target.value)}>
                {['g1','g2','g3','g4','g5','g6'].map(g => <option key={g} value={g}>{g.toUpperCase()}</option>)}
              </select>
            </label>
            <label>每段 · 選擇題
              <select value={aiPerM} onChange={e => setAiPerM(+e.target.value)}>
                {[0,1,2,3].map(n => <option key={n} value={n}>{n} 題</option>)}
              </select>
            </label>
            <label>每段 · 簡答題
              <select value={aiPerS} onChange={e => setAiPerS(+e.target.value)}>
                {[0,1,2].map(n => <option key={n} value={n}>{n} 題</option>)}
              </select>
            </label>
            <label>整篇綜合 · 選擇題
              <select value={aiFinM} onChange={e => setAiFinM(+e.target.value)}>
                {[0,2,3,5].map(n => <option key={n} value={n}>{n} 題</option>)}
              </select>
            </label>
            <label>整篇綜合 · 簡答題
              <select value={aiFinS} onChange={e => setAiFinS(+e.target.value)}>
                {[0,1,2].map(n => <option key={n} value={n}>{n} 題</option>)}
              </select>
            </label>
          </div>
          {/* 「最後統整…配合 reading skill 也很好，但不能亂出」——所以預設不勾，
              而且對不上文章的那一種會整個不做，不會硬生一份出來。 */}
          <div className="gr-ai-skills">
            <div className="gr-ai-skills-head">
              🔍 讀完整篇之後，順便做一份「閱讀技巧」單元（選填）
            </div>
            <div className="gr-ai-chips">
              {AI_SKILL_LIST.map(k => {
                const sk = (window.RC_SKILLS || {})[k] || {};
                const on = aiSkills.indexOf(k) >= 0;
                return (
                  <button key={k} type="button" className={'gr-ai-chip' + (on ? ' on' : '')}
                    onClick={() => setAiSkills(v => on ? v.filter(x => x !== k) : v.concat(k))}>
                    {sk.ico} {sk.zh}
                  </button>
                );
              })}
            </div>
            <div className="gr-ai-hint">
              勾起來的會合成<b>一個</b>「閱讀技巧」單元，跟這份分段閱讀一起建立（同一週、同一組）。
              卡片一張一張比對過文章，找不到出處的整張丟掉；某一種三輪都對不上就<b>不做那一種</b>。
            </div>
          </div>
          <label className="gr-ai-rep">
            <input type="checkbox" checked={aiReplace} onChange={e => setAiReplace(e.target.checked)}/>
            <span>蓋掉原本的題目（不勾＝加在原本的後面）</span>
          </label>
          {aiErr && <div className="gr-ai-err">{aiErr}</div>}
          <div className="gr-ai-foot">
            <span className="gr-ai-sum">
              {segments.length} 段 · 預計 {segments.length * (aiPerM + aiPerS) + aiFinM + aiFinS} 題
              {aiSkills.length ? ` ＋ ${aiSkills.length} 種閱讀技巧` : ''}
            </span>
            <span style={{flex:1}}/>
            <button className="btn ghost" style={{fontSize:12,padding:'5px 12px'}}
              onClick={() => setAiOpen(false)} disabled={!!aiRun}>取消</button>
            <button className="btn primary" style={{fontSize:12,padding:'5px 14px'}}
              onClick={runAiQuestions}
              disabled={!!aiRun || (!aiPerM && !aiPerS && !aiFinM && !aiFinS && !aiSkills.length)}>
              {aiRun || '🤖 開始出題'}
            </button>
          </div>
        </div>
      )}
      {aiInfo && !aiOpen && (
        <div className="gr-ai-done">
          ✓ {aiInfo}
          <button type="button" onClick={() => setAiInfo('')} aria-label="關閉">✕</button>
        </div>
      )}
      {aiErr && !aiOpen && <div className="gr-ai-err">{aiErr}</div>}
      {/* v387: 一次把 12 頁的題目全部貼進來，不用一段一段開 */}
      {bulkOpen && (
        <div style={{border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',margin:'0 0 10px',background:'var(--bg-paper,#FBF8F1)'}}>
          <div style={{fontSize:11.5,lineHeight:1.75,color:'var(--ink-2,#5c554a)',marginBottom:7}}>
            一行一題，最前面多寫一個<b>段號</b>（就是下面每段標題的「第 N 段」）：<br/>
            <code>段號 [Tab] 題目 [Tab] 正解 [Tab] 其他選項…</code>（選擇題，第一個＝正解，最多 4 個，匯入時自動打散）<br/>
            <code>段號 [Tab] 題目 [Tab] 答案要點</code>（簡答題——選項欄只有 0–1 個就算簡答）<br/>
            段號寫 <code>0</code> 或 <code>綜合</code> ＝ 放到最後的整篇綜合題。可以直接從 Excel／Google 試算表整段複製貼上。
          </div>
          <textarea rows={7} value={bulkText} onChange={e => setBulkText(e.target.value)}
            placeholder={'1\tWhere did the wolves live?\tOn an island\tIn a city\tIn a cave\n1\tWhy did the pups get on the raft?\tThey were curious / it looked strange\n2\tWhat happened to the deer?\tThere were too many\tThey all died\tThey left\n0\tWhat is the main idea of the whole story?\tnature needs balance / wolves keep the deer in check'}
            style={{width:'100%',fontFamily:'var(--mono,monospace)',fontSize:12,lineHeight:1.6,padding:'8px 10px',
              border:'1px solid var(--border)',background:'#fff',color:'var(--ink)',borderRadius:8,resize:'vertical',boxSizing:'border-box'}}/>
          {bulk.errs.length > 0 && (
            <div style={{fontSize:11.5,color:'#dc2626',whiteSpace:'pre-wrap',marginTop:6}}>
              {bulk.errs.slice(0, 6).join('\n')}{bulk.errs.length > 6 ? `\n…還有 ${bulk.errs.length - 6} 個問題` : ''}
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:10,marginTop:8,flexWrap:'wrap'}}>
            <span style={{fontSize:11.5,color:'var(--ink-3,#6b6455)'}}>
              {bulk.total
                ? Object.keys(bulk.bySeg).sort((a,b)=>a-b).map(i => `第${+i+1}段 ${bulk.bySeg[i].length}題`)
                    .concat(bulk.finalAdds.length ? [`綜合 ${bulk.finalAdds.length}題`] : []).join(' · ')
                : '貼上之後這裡會顯示每一段會拿到幾題'}
            </span>
            <label style={{fontSize:11.5,display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}>
              <input type="checkbox" checked={bulkReplace} onChange={e => setBulkReplace(e.target.checked)}/>
              覆蓋原本的題目（不勾＝加在後面）
            </label>
            <span style={{flex:1}}/>
            <button className="btn ghost" style={{fontSize:12,padding:'5px 12px'}}
              onClick={() => { setBulkText(''); setBulkOpen(false); }}>取消</button>
            <button className="btn primary" style={{fontSize:12,padding:'5px 14px'}}
              onClick={doBulk} disabled={!bulk.total || bulk.errs.length > 0}>
              匯入{bulk.total ? `（共 ${bulk.total} 題）` : ''}
            </button>
          </div>
        </div>
      )}
      {ocrStatus && (
        <div style={{fontSize:11.5,color:'#8a6d1c',background:'#fbf3de',border:'1px solid #ead9ae',borderRadius:8,padding:'5px 11px',margin:'6px 0 0',display:'inline-block'}}>⏳ {ocrStatus}</div>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={pickPhotos}/>
      <input ref={pdfRef} type="file" accept="application/pdf,.pdf" style={{display:'none'}} onChange={pickPdf}/>
      <input ref={reOcrRef} type="file" accept="image/*" style={{display:'none'}} onChange={pickReOcr}/>
      <input ref={audioRef} type="file" accept="audio/*,.mp3,.m4a" style={{display:'none'}} onChange={pickAudio}/>

      {/* v289: 課文音檔——有音檔時學生閱讀頁播它（課本配音的抑揚頓挫），沒有才用機器語音 */}
      <div style={{display:'flex',alignItems:'center',gap:8,margin:'0 0 10px',flexWrap:'wrap'}}>
        {audioUrl ? (
          <>
            <span style={{fontSize:12,color:'#2e7d32',fontWeight:700}}>🎧 課文音檔 ✓</span>
            <audio controls preload="none" src={audioUrl} style={{height:30,maxWidth:280}}/>
            <button className="btn ghost" style={{fontSize:11,padding:'3px 8px',color:'var(--accent)'}}
              onClick={() => { if (confirm('移除音檔？（學生會改聽機器語音）')) onChangeAudio(''); }}>✕ 移除</button>
          </>
        ) : (
          <>
            <button className="btn primary" style={{fontSize:11,padding:'5px 12px'}} disabled={!!uploading}
              onClick={genAiAudio} title="用 AI 神經語音把每段主文唸成 MP3——產生一次，學生播放不用錢">
              🗣 AI 產生朗讀（自然人聲）
            </button>
            <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}} disabled={!!uploading}
              onClick={() => audioRef.current && audioRef.current.click()}>
              🎧 或上傳音檔
            </button>
            <span style={{fontSize:11,color:'var(--ink-muted)'}}>照片先「🔍 辨識單字」＋框好「🗣 朗讀區域」，AI 就只唸主文、不唸旁邊小字</span>
          </>
        )}
      </div>
      <div className="field-help" style={{marginBottom:10}}>
        掃描 PDF：每一頁自動變一段；照片：一張＝一段。太長的頁面點「✂ 裁切」再切細，每段配 1–2 題，小朋友讀一小段就答題、不放空。
      </div>
      {upErr && <div style={{fontSize:12,color:'#dc2626',marginBottom:8}}>{upErr}</div>}

      {pasting && (
        <div style={{marginBottom:12,padding:'12px 14px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-paper)'}}>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-muted)',marginBottom:8}}>
            貼上整篇文章——<b>空一行</b>的地方會自動切成新的段落，切好後再幫每段加題目。
          </div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            rows={8}
            placeholder={"One day, a little fox found a red balloon in the forest…\n\nThe fox carried the balloon to the river. There, he met an old turtle…\n\nSuddenly, the wind blew very hard…"}
            style={{...inputStyle,fontSize:12,fontFamily:'var(--mono)',resize:'vertical',lineHeight:1.6}}
          />
          <div style={{display:'flex',gap:8,marginTop:8,justifyContent:'flex-end'}}>
            <button className="btn ghost" style={{fontSize:12,padding:'6px 14px'}} onClick={() => { setPasting(false); setPasteText(''); }}>取消</button>
            <button className="btn primary" style={{fontSize:12,padding:'6px 16px'}} onClick={doPaste} disabled={!pasteChunks.length}>
              分段匯入{pasteChunks.length ? `（${pasteChunks.length} 段）` : ''}
            </button>
          </div>
        </div>
      )}

      {segments.length === 0 && (
        <div className="fc-card-empty mono" style={{marginBottom:10}}>尚未新增段落 — 點「＋ 新增段落」或「⬇ 貼整篇文章自動分段」</div>
      )}

      {segments.map((seg, si) => (
        <div key={seg.id || si} style={{border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px',marginBottom:14,background:'var(--bg-paper)'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
            <b style={{fontSize:13}}>第 {si + 1} 段</b>
            <span style={{fontSize:11,color:'var(--ink-muted)'}}>{(seg.questions || []).length} 題</span>
            <span style={{flex:1}}/>
            <button className="btn ghost" style={{fontSize:11,padding:'3px 8px'}} onClick={() => moveSeg(si, -1)} disabled={si === 0}>▲</button>
            <button className="btn ghost" style={{fontSize:11,padding:'3px 8px'}} onClick={() => moveSeg(si, 1)} disabled={si === segments.length - 1}>▼</button>
            <button className="btn ghost" style={{fontSize:11,padding:'3px 8px',color:'var(--accent)'}}
              onClick={() => { if (confirm('刪除這一段（含底下的題目）？')) delSeg(si); }}>✕</button>
          </div>
          {seg.img && seg.img.url ? (
            <div style={{marginBottom:8}}>
              <GrEdCropThumb img={seg.img}/>
              <div style={{display:'flex',gap:6,marginTop:6,alignItems:'center',flexWrap:'wrap'}}>
                <button className="btn ghost" style={{fontSize:11,padding:'4px 10px'}} onClick={() => setCropSeg(seg)}>
                  ✂ 裁切這張照片
                </button>
                {seg.img.wordsId ? (
                  <>
                    <span style={{fontSize:11,color:'#2e7d32'}}>🔍 點字查義 ✓</span>
                    <button className="btn ghost" style={{fontSize:11,padding:'4px 10px'}} disabled={!!uploading}
                      onClick={() => setRegSeg(seg)}
                      title="框出主文與旁邊小字——AI 朗讀只唸主文；小字變成學生可點的 🔊">
                      🗣 朗讀區域{(seg.img.readRects || []).length ? ` ✓（${(seg.img.readRects || []).length} 框）` : ''}
                    </button>
                  </>
                ) : (
                  <button className="btn ghost" style={{fontSize:11,padding:'4px 10px'}} disabled={!!uploading}
                    onClick={() => ocrExisting(seg)} title="辨識照片裡的英文字，學生就能點單字查意思、聽朗讀">
                    🔍 辨識單字（點字查義）
                  </button>
                )}
                {reOcrSeg && reOcrSeg.img && seg.img.url === reOcrSeg.img.url && !seg.img.wordsId ? (
                  <button className="btn primary" style={{fontSize:11,padding:'4px 10px'}} disabled={!!uploading}
                    onClick={() => reOcrRef.current && reOcrRef.current.click()}>
                    📁 選原始照片來辨識
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {seg.audioUrl ? (
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:11,color:'#2e7d32',fontWeight:700}}>🎧 這段的朗讀 ✓</span>
              <audio controls preload="none" src={seg.audioUrl} style={{height:28,maxWidth:240}}/>
              <button className="btn ghost" style={{fontSize:11,padding:'3px 8px',color:'var(--accent)'}}
                onClick={() => {
                  if (!confirm('移除這段的朗讀音檔？')) return;
                  // v292: 用段落 id 比對＋顯式 delete——舊寫法不生效（Alan 回報「移除不了」）
                  onChange(segments.map(s2 => {
                    if ((s2.id || s2) !== (seg.id || seg)) return s2;
                    const n = { ...s2 };
                    delete n.audioUrl;
                    return n;
                  }));
                }}>✕</button>
            </div>
          ) : null}
          <textarea
            value={seg.text || ''}
            onChange={e => upd(si, { text: e.target.value })}
            rows={seg.img && seg.img.url ? 2 : 5}
            placeholder={seg.img && seg.img.url ? '補充文字（選填，顯示在照片下方）' : '這一段的文章內容…（學生會看到；空行＝換段落顯示）'}
            style={{...inputStyle,fontSize:14,lineHeight:1.7,resize:'vertical',fontFamily:'inherit'}}
          />

          <GrQuestionsEditor
            qs={seg.questions || []}
            onChange={qs2 => upd(si, { questions: qs2 })}
            impOpen={impSeg === si}
            onToggleImp={() => setImpSeg(impSeg === si ? null : si)}
            impText={impText}
            onImpText={setImpText}
            previewLabel={`將加進第 ${si + 1} 段`}
            inputStyle={inputStyle}
          />
        </div>
      ))}

      <button className="btn primary" style={{fontSize:12,padding:'7px 16px'}} onClick={addSeg}>＋ 新增段落</button>

      {/* v281: 全部讀完後的整篇綜合題（Alan 要求） */}
      <div style={{marginTop:18,padding:'12px 14px',border:'1.5px solid var(--border)',borderRadius:8,background:'var(--bg-paper)'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
          <b style={{fontSize:13}}>📚 綜合題（全部讀完後）</b>
          <span style={{fontSize:11,color:'var(--ink-muted)'}}>{(finalQs || []).length} 題</span>
        </div>
        <div className="field-help" style={{marginBottom:4}}>
          學生把每一段都讀完、答完後，最後出現的整篇文章綜合題（選填）。答題時可展開整篇文章回頭看。
        </div>
        <GrQuestionsEditor
          qs={finalQs || []}
          onChange={onChangeFinal}
          impOpen={impSeg === 'final'}
          onToggleImp={() => setImpSeg(impSeg === 'final' ? null : 'final')}
          impText={impText}
          onImpText={setImpText}
          previewLabel="將加進綜合題"
          inputStyle={inputStyle}
          aiHint="綜合題的簡答：AI 會拿「整篇文章的文字＋答案要點」批改，給 1–5 星。"
        />
      </div>

      {cropSeg && (
        <GrCropModal
          url={cropSeg.img.url}
          group={segments.filter(s => s.img && s.img.url === cropSeg.img.url)}
          onCancel={() => setCropSeg(null)}
          onConfirm={applyCrop}
        />
      )}

      {regSeg && (
        <GrRegionModal
          seg={regSeg}
          onCancel={() => setRegSeg(null)}
          onConfirm={(rects) => {
            onChange(segments.map(s => s.id === regSeg.id ? { ...s, img: { ...s.img, readRects: rects } } : s));
            setRegSeg(null);
          }}
        />
      )}
    </div>
  );
}

/* ── 朗讀區域框選（v290）——在這段的裁切畫面上拖出方框：
   第一框＝主文（金色，AI/機器朗讀只唸這裡）；其餘＝附註（藍色，學生端變 🔊 可點）。
   座標存整張圖比例（同 words），顯示時換算到裁切帶內。 */
function GrRegionModal({ seg, onCancel, onConfirm }) {
  const img = seg.img;
  const zy0 = img.y0 || 0;
  const zy1 = img.y1 == null ? 1 : img.y1;
  const band = Math.max(0.02, zy1 - zy0);
  const [rects, setRects] = useS(() => (img.readRects || []).map(r => ({ ...r })));
  const [draft, setDraft] = useS(null); // band 內比例 {x0,y0,x1,y1}
  const wrapRef = React.useRef(null);
  const startRef = React.useRef(null);

  const toFrac = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.min(1, Math.max(0, (cx - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (cy - r.top) / r.height)),
    };
  };
  const down = (e) => {
    if (e.target.closest && e.target.closest('.gr-reg-x')) return;
    e.preventDefault();
    const p = toFrac(e);
    startRef.current = p;
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };
  useE(() => {
    if (!startRef.current) return;
    const move = (e) => {
      if (!startRef.current) return;
      if (e.touches) e.preventDefault();
      const p = toFrac(e);
      setDraft({ x0: startRef.current.x, y0: startRef.current.y, x1: p.x, y1: p.y });
    };
    const up = () => {
      const s0 = startRef.current;
      startRef.current = null;
      setDraft(d => {
        if (d && s0) {
          const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
          if (w > 0.04 && h > 0.02) {
            // band 比例 → 整張圖比例
            setRects(rs => [...rs, {
              x: Math.min(d.x0, d.x1), w,
              y: zy0 + Math.min(d.y0, d.y1) * band, h: h * band,
            }]);
          }
        }
        return null;
      });
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [draft != null]);

  // 存檔時第一框標 main、其餘 side
  const finalize = () => onConfirm(rects.map((r, i) => ({ ...r, kind: i === 0 ? 'main' : 'side' })));

  const bandTop = (y) => ((y - zy0) / band) * 100;

  return ReactDOM.createPortal(
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(24,18,10,.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onCancel}>
      <div style={{background:'var(--bg,#fff)',borderRadius:10,maxWidth:620,width:'100%',maxHeight:'92vh',display:'flex',flexDirection:'column',padding:'14px 16px',boxSizing:'border-box'}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,flexWrap:'wrap'}}>
          <b style={{fontSize:14}}>🗣 朗讀區域</b>
          <span style={{flex:1}}/>
          <button className="btn ghost" style={{fontSize:11,padding:'4px 10px'}} onClick={() => setRects([])} disabled={!rects.length}>清除全部</button>
        </div>
        <div style={{fontSize:11.5,color:'var(--ink-muted)',marginBottom:6,lineHeight:1.7}}>
          在照片上<b>拖出方框</b>：第一個框＝<b style={{color:'#a07d1c'}}>主文</b>（朗讀只唸這裡）；
          再框的＝<b style={{color:'#3b6ea5'}}>附註</b>（學生點 🔊 可單獨聽）。框錯點 ✕ 重拉。
        </div>
        <div style={{overflow:'auto',flex:1,minHeight:0,border:'1px solid var(--border)',borderRadius:6}}>
          <div ref={wrapRef}
            style={{position:'relative',cursor:'crosshair',height:0,overflow:'hidden',paddingBottom:((img.ar || 1.3) * band * 100) + '%'}}
            onMouseDown={down} onTouchStart={down}>
            <img src={img.url} alt="" draggable={false}
              style={{position:'absolute',top:0,left:0,width:'100%',display:'block',userSelect:'none',pointerEvents:'none',transform:`translateY(-${zy0 * 100}%)`}}/>
            {rects.map((r, i) => (
              <div key={i} style={{
                position:'absolute',
                left: (r.x * 100) + '%', top: bandTop(r.y) + '%',
                width: (r.w * 100) + '%', height: ((r.h / band) * 100) + '%',
                border: `2.5px solid ${i === 0 ? '#c9a84c' : '#3b6ea5'}`,
                background: i === 0 ? 'rgba(201,168,76,.12)' : 'rgba(59,110,165,.10)',
                borderRadius: 6, boxSizing: 'border-box',
              }}>
                <span style={{position:'absolute',left:4,top:2,fontSize:10,fontWeight:800,color:i===0?'#a07d1c':'#3b6ea5',background:'rgba(255,255,255,.85)',borderRadius:3,padding:'0 4px',pointerEvents:'none'}}>
                  {i === 0 ? '主文' : `附註 ${i}`}
                </span>
                <button className="gr-reg-x"
                  onClick={(e) => { e.stopPropagation(); setRects(rs => rs.filter((_, j) => j !== i)); }}
                  onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
                  style={{position:'absolute',right:-10,top:-10,width:22,height:22,borderRadius:'50%',border:'none',background:i===0?'#c9a84c':'#3b6ea5',color:'#fff',fontSize:11,cursor:'pointer',lineHeight:'22px',padding:0}}>✕</button>
              </div>
            ))}
            {draft && (
              <div style={{
                position:'absolute',
                left: (Math.min(draft.x0, draft.x1) * 100) + '%', top: (Math.min(draft.y0, draft.y1) * 100) + '%',
                width: (Math.abs(draft.x1 - draft.x0) * 100) + '%', height: (Math.abs(draft.y1 - draft.y0) * 100) + '%',
                border: '2px dashed #B85A45', borderRadius: 6, boxSizing: 'border-box', pointerEvents: 'none',
              }}/>
            )}
          </div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:10}}>
          <button className="btn ghost" onClick={onCancel}>取消</button>
          <button className="btn primary" onClick={finalize}>✅ 完成（{rects.length} 框）</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── 編輯器：段落照片縮圖（固定寬，px 計算高度）── */
function GrEdCropThumb({ img }) {
  const y0 = img.y0 || 0;
  const y1 = img.y1 == null ? 1 : img.y1;
  const W = 300;
  const h = Math.max(8, W * (img.ar || 1.3) * Math.max(0.02, y1 - y0));
  return (
    <div style={{width:W,maxWidth:'100%',height:h,position:'relative',overflow:'hidden',borderRadius:6,border:'1px solid var(--border)',background:'#f5f1e8'}}>
      <img src={img.url} alt="" style={{position:'absolute',top:0,left:0,width:'100%',transform:`translateY(-${y0 * 100}%)`,display:'block'}}/>
    </div>
  );
}

/* ── 照片裁切視窗（v277）──
   點照片＝加線、拖線＝微調、✕＝刪線；🪄 自動偵測＝掃描橫列亮度，
   段落間的空白（比行距明顯大的白帶）自動畫線。只存比例，不產生新圖。 */
function GrCropModal({ url, group, onCancel, onConfirm }) {
  const sorted = [...group].sort((a, b) => (a.img.y0 || 0) - (b.img.y0 || 0));
  const init = sorted.slice(0, -1).map(s => (s.img.y1 == null ? 1 : s.img.y1)).filter(y => y > 0 && y < 1);
  const [lines, setLines] = useS(init);
  const [busy, setBusy] = useS(false);
  const [err, setErr] = useS('');
  const wrapRef = React.useRef(null);
  const dragRef = React.useRef(null);

  const yFromClient = (clientY) => {
    const r = wrapRef.current.getBoundingClientRect();
    return Math.min(0.98, Math.max(0.02, (clientY - r.top) / r.height));
  };
  const addLineAt = (e) => setLines(ls => [...ls, yFromClient(e.clientY)].sort((a, b) => a - b));
  const startDrag = (i) => (e) => { e.preventDefault(); e.stopPropagation(); dragRef.current = i; };

  useE(() => {
    const move = (e) => {
      if (dragRef.current == null || !wrapRef.current) return;
      if (e.touches) e.preventDefault();
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const i = dragRef.current;
      const y = yFromClient(cy);
      setLines(ls => ls.map((v, j) => j === i ? y : v));
    };
    const up = () => { if (dragRef.current != null) { dragRef.current = null; setLines(ls => [...ls].sort((a, b) => a - b)); } };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, []);

  const autoDetect = () => {
    setBusy(true); setErr('');
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Firebase Storage 下載 URL 有 CORS *，canvas 讀得到
    img.onload = () => {
      try {
        const W = 400;
        const H = Math.max(1, Math.round(W * (img.naturalHeight / img.naturalWidth)));
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const cx = cv.getContext('2d');
        cx.drawImage(img, 0, 0, W, H);
        const d = cx.getImageData(0, 0, W, H).data;
        const isText = new Array(H);
        for (let y = 0; y < H; y++) {
          let c = 0;
          for (let x = 0; x < W; x += 2) {
            const i = (y * W + x) * 4;
            if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 140) c++;
          }
          isText[y] = (c / (W / 2)) > 0.02;
        }
        // 連續「非文字列」＝空白帶；行距的白帶小、段落間的白帶大 → 取明顯大於中位數的
        const gaps = [];
        let s = null;
        for (let y = 0; y <= H; y++) {
          const t = y < H ? isText[y] : true;
          if (!t && s == null) s = y;
          if (t && s != null) { gaps.push({ start: s, len: y - s }); s = null; }
        }
        const interior = gaps.filter(g => g.start > 0 && g.start + g.len < H);
        if (!interior.length) { setErr('偵測不到段落空隙——請直接點照片手動加線。'); setBusy(false); return; }
        const lens = interior.map(g => g.len).sort((a, b) => a - b);
        const med = lens[Math.floor(lens.length / 2)];
        let cuts = interior
          .filter(g => g.len >= Math.max(med * 1.7, H * 0.012))
          .map(g => (g.start + g.len / 2) / H)
          .filter(y => y > 0.03 && y < 0.97);
        cuts = cuts.filter((c, i) => i === 0 || c - cuts[i - 1] > 0.04).slice(0, 12);
        if (!cuts.length) { setErr('空隙都差不多大，自動分不出段落——請直接點照片手動加線。'); setBusy(false); return; }
        setLines(cuts);
      } catch (e2) {
        setErr('這張照片無法自動偵測——請直接點照片手動加線。');
      }
      setBusy(false);
    };
    img.onerror = () => { setErr('照片載入失敗——請直接點照片手動加線。'); setBusy(false); };
    img.src = url;
  };

  const bands = (() => {
    const ys = [0, ...lines, 1];
    const out = [];
    for (let i = 0; i + 1 < ys.length; i++) if (ys[i + 1] - ys[i] > 0.02) out.push([ys[i], ys[i + 1]]);
    return out;
  })();

  // v290: portal 到 body——.modal 的 transform 會把 fixed 困在彈窗裡（containing block）
  return ReactDOM.createPortal(
    <div style={{position:'fixed',inset:0,zIndex:300,background:'rgba(24,18,10,.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onCancel}>
      <div style={{background:'var(--bg,#fff)',borderRadius:10,maxWidth:560,width:'100%',maxHeight:'92vh',display:'flex',flexDirection:'column',padding:'14px 16px',boxSizing:'border-box'}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,flexWrap:'wrap'}}>
          <b style={{fontSize:14}}>✂ 裁切照片</b>
          <span style={{flex:1}}/>
          <button className="btn ghost" style={{fontSize:11,padding:'4px 10px'}} onClick={autoDetect} disabled={busy}>
            {busy ? '偵測中…' : '🪄 自動偵測段落'}
          </button>
          <button className="btn ghost" style={{fontSize:11,padding:'4px 10px'}} onClick={() => setLines([])} disabled={!lines.length}>清除線</button>
        </div>
        <div style={{fontSize:11.5,color:'var(--ink-muted)',marginBottom:6}}>
          點照片＝加一條裁切線；拖線＝微調；點線上的 ✕＝刪除。兩條線之間＝一段。
        </div>
        {err && <div style={{fontSize:12,color:'#dc2626',marginBottom:6}}>{err}</div>}
        <div style={{overflow:'auto',flex:1,minHeight:0,border:'1px solid var(--border)',borderRadius:6}}>
          <div ref={wrapRef} style={{position:'relative',cursor:'crosshair'}} onClick={addLineAt}>
            <img src={url} alt="" style={{width:'100%',display:'block',userSelect:'none',pointerEvents:'none'}}/>
            {lines.map((y, i) => (
              <div key={i}
                style={{position:'absolute',left:0,right:0,top:`${y * 100}%`,borderTop:'2px dashed #B85A45',cursor:'ns-resize',height:14,marginTop:-7,paddingTop:7,boxSizing:'border-box'}}
                onMouseDown={startDrag(i)} onTouchStart={startDrag(i)} onClick={e => e.stopPropagation()}>
                <span style={{position:'absolute',left:6,top:-9,background:'#B85A45',color:'#fff',fontSize:10,borderRadius:3,padding:'0 5px',pointerEvents:'none'}}>✂ {i + 1}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setLines(ls => ls.filter((_, j) => j !== i)); }}
                  onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
                  style={{position:'absolute',right:6,top:-11,background:'#B85A45',color:'#fff',border:'none',borderRadius:'50%',width:22,height:22,fontSize:11,cursor:'pointer',lineHeight:'22px',padding:0}}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:10}}>
          <button className="btn ghost" onClick={onCancel}>取消</button>
          <button className="btn primary" onClick={() => onConfirm(bands)}>✅ 完成裁切（{bands.length} 段）</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── SyllableDivEditor ── */
/* v365: 配對連線編輯器——一行一組「單字 [Tab] 解釋」，跟聽寫一樣可以從 Excel 直接貼 */
function DefMatchEditor({ pairs, onChangePairs }) {
  const [importing, setImporting] = useS(false);
  const [importText, setImportText] = useS('');
  const [importErr, setImportErr] = useS('');

  const add = () => onChangePairs([...pairs, { id: 'dm' + Date.now(), word: '', def: '' }]);
  const del = (id) => onChangePairs(pairs.filter(p => p.id !== id));
  const upd = (id, field, val) => onChangePairs(pairs.map(p => p.id === id ? { ...p, [field]: val } : p));
  const move = (id, dir) => {
    const i = pairs.findIndex(p => p.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= pairs.length) return;
    const arr = pairs.slice(); [arr[i], arr[j]] = [arr[j], arr[i]];
    onChangePairs(arr);
  };

  const doImport = () => {
    const parsed = [];
    importText.split('\n').map(l => l.trim()).filter(Boolean).forEach((line, i) => {
      // 支援 Tab、逗號、破折號、冒號分隔（Excel 貼上多半是 Tab）
      const m = line.split('\t');
      let word = '', def = '';
      if (m.length >= 2) { word = m[0].trim(); def = m.slice(1).join(' ').trim(); }
      else {
        const m2 = line.match(/^(.+?)\s*[:：\-–—]\s*(.+)$/);
        if (m2) { word = m2[1].trim(); def = m2[2].trim(); }
      }
      if (word && def) parsed.push({ id: 'dm' + Date.now() + i, word, def });
    });
    if (!parsed.length) { setImportErr('沒有解析到資料——一行一組，中間用 Tab（或冒號、破折號）隔開'); return; }
    onChangePairs([...pairs, ...parsed]);
    setImportText(''); setImporting(false); setImportErr('');
  };

  const bad = pairs.filter(p => !p.word || !p.def).length;

  return (
    <div className="field">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <label className="field-label" style={{margin:0}}>配對組數（{pairs.length}）</label>
        <div style={{display:'flex',gap:6}}>
          <button className="btn ghost" style={{fontSize:11,padding:'5px 10px'}}
            onClick={() => { setImporting(v => !v); setImportErr(''); }}>
            {importing ? '✕ 取消' : '⬇ 貼上匯入'}
          </button>
          <button className="btn primary" style={{fontSize:11,padding:'5px 12px'}} onClick={add}>+ Add</button>
        </div>
      </div>

      {importing && (
        <div style={{marginBottom:12,padding:'12px 14px',border:'1px solid var(--border)',borderRadius:6,background:'var(--bg-paper,#f9f7f2)'}}>
          <div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--ink-muted)',marginBottom:8}}>
            從 Excel / Google Sheets 複製貼上：<br/>
            <code style={{background:'rgba(0,0,0,0.06)',padding:'1px 5px',borderRadius:2}}>單字 [Tab] 解釋</code>
            <span style={{display:'block',marginTop:4,color:'var(--ink-faint)'}}>
              也可以打 <code>producer: an organism that makes its own food</code>（冒號或破折號隔開）
            </span>
          </div>
          <textarea
            value={importText}
            onChange={e => { setImportText(e.target.value); setImportErr(''); }}
            rows={6}
            placeholder={'producer\tan organism that makes its own food\nconsumer\tan animal that eats other living things\npredator\tan animal that hunts other animals\nprey\tan animal that is hunted for food'}
            style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border)',background:'var(--bg)',
              color:'var(--ink)',borderRadius:2,fontSize:12,fontFamily:'var(--mono)',resize:'vertical',
              boxSizing:'border-box',lineHeight:1.6}}
          />
          {importErr && <div style={{color:'#dc2626',fontSize:12,marginTop:4}}>{importErr}</div>}
          <button className="btn primary" style={{marginTop:8,fontSize:12}} onClick={doImport}>加入清單</button>
        </div>
      )}

      {pairs.length === 0 ? (
        <div className="field-help">還沒有配對——按「+ Add」一組一組打，或用「⬇ 貼上匯入」整批貼進來。至少要 2 組。</div>
      ) : (
        <div className="dme-list">
          {pairs.map((p, i) => (
            <div key={p.id} className="dme-row">
              <span className="dme-n">{i + 1}</span>
              <input className="dme-in dme-word" value={p.word} placeholder="單字 word"
                onChange={e => upd(p.id, 'word', e.target.value)}/>
              <span className="dme-link">🔗</span>
              <input className="dme-in dme-def" value={p.def} placeholder="解釋 definition"
                onChange={e => upd(p.id, 'def', e.target.value)}/>
              <div className="dme-tools">
                <button onClick={() => move(p.id, -1)} disabled={i === 0} title="上移">▲</button>
                <button onClick={() => move(p.id, 1)} disabled={i === pairs.length - 1} title="下移">▼</button>
                <button className="dme-del" onClick={() => del(p.id)} title="刪除">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {bad > 0 && <div className="field-help" style={{color:'#b23c27'}}>⚠️ 有 {bad} 組還沒填完，沒填完的不會出現在題目裡。</div>}
      <div className="field-help">學生看到的右邊解釋會自動打亂順序，不用自己排。</div>
    </div>
  );
}

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

/* ══════════════════════════════════════════════════════════════════════════
   v386: 閱讀技巧的編輯器（reading-skill）
   ──────────────────────────────────────────────────────────────────────────
   ⚠ 這一組 RsBlockEditor 同時被兩個地方用：
     ① EditorModal 的 reading-skill 分支（老師事後想改）
     ② ReadingGenModal 的校稿頁（AI 出完先看過再建立）
   只寫一份，兩邊行為一定一致（v382 的教訓：校稿頁跟編輯器長不一樣＝老師會困惑）。
   ══════════════════════════════════════════════════════════════════════════ */

const RS_ZH = {
  'problem-solution': '🧩 問題與解決 Problem & Solution',
  'cause-effect':     '⚡ 因果關係 Cause & Effect',
  'sequence':         '🔢 事件排序 Sequencing',
  'compare-contrast': '⚖️ 比較對照 Compare & Contrast',
};

function rsBlankBlock(kind) {
  const mk = () => (window.rcNewChip ? window.rcNewChip() : { id: 'rc' + Math.random().toString(36).slice(2, 8), text: '', zone: '', why: '' });
  const id = window.rcNewBlockId ? window.rcNewBlockId() : 'rb' + Math.random().toString(36).slice(2, 8);
  if (kind === 'problem-solution') {
    return { id, kind, zones: [{ id: 'problem', label: 'Problem 問題', ico: '⚠️' }, { id: 'solution', label: 'Solution 解決方法', ico: '💡' }],
      chips: [{ ...mk(), zone: 'problem' }, { ...mk(), zone: 'problem' }, { ...mk(), zone: 'solution' }, { ...mk(), zone: 'solution' }] };
  }
  if (kind === 'cause-effect') {
    return window.rcRepairBlock({ id, kind, zones: [{ id: 'c0', label: '', ico: '⚡' }, { id: 'c1', label: '', ico: '⚡' }, { id: 'c2', label: '', ico: '⚡' }],
      chips: [mk(), mk(), mk()] });
  }
  if (kind === 'sequence') {
    return window.rcResequence({ id, kind, zones: [], chips: [mk(), mk(), mk(), mk(), mk()] });
  }
  // ⚠ 至少 6 張，不然老師把空白格全部填完，這一塊還是紅的（rcValidBlock 要求 6–9）
  return { id, kind, leftLabel: '', rightLabel: '',
    zones: [{ id: 'left', label: '', ico: '🔵' }, { id: 'both', label: '兩邊都有 Both', ico: '🟣' }, { id: 'right', label: '', ico: '🟠' }],
    chips: [{ ...mk(), zone: 'left' }, { ...mk(), zone: 'left' }, { ...mk(), zone: 'both' },
            { ...mk(), zone: 'both' }, { ...mk(), zone: 'right' }, { ...mk(), zone: 'right' }] };
}

function RsBlockEditor({ block, onChange, onDelete }) {
  if (!block) return null;
  const kind = block.kind;
  const chips = block.chips || [];
  const zones = block.zones || [];
  const bad = !window.rcValidBlock(block);

  const setChip = (i, k, v) => onChange({ ...block, chips: chips.map((c, j) => j === i ? { ...c, [k]: v } : c) });
  const setZone = (i, v) => onChange({ ...block, zones: zones.map((z, j) => j === i ? { ...z, label: v } : z) });
  const addChip = () => {
    const nc = window.rcNewChip();
    const next = { ...block, chips: chips.concat([{ ...nc, zone: kind === 'problem-solution' ? 'problem' : kind === 'compare-contrast' ? 'left' : '' }]) };
    if (kind === 'cause-effect') next.zones = zones.concat([{ id: 'c' + zones.length, label: '', ico: '⚡' }]);
    onChange(window.rcRepairBlock(next));
  };
  const delChip = (i) => onChange(window.rcFilterChips(block, (_c, j) => j !== i));
  const move = (i, d) => {
    const j = i + d; if (j < 0 || j >= chips.length) return;
    const arr = chips.slice(); const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    const next = { ...block, chips: arr };
    if (kind === 'cause-effect') {
      const zs = zones.slice(); const tz = zs[i]; zs[i] = zs[j]; zs[j] = tz; next.zones = zs;
    }
    onChange(window.rcRepairBlock(next));
  };
  const setSide = (side, v) => {
    const zid = side === 'left' ? 'left' : 'right';
    onChange({
      ...block, [side + 'Label']: v,
      zones: zones.map(z => z.id === zid ? { ...z, label: v } : z),
    });
  };

  const zoneSel = (i, c) => (
    <select className="rc-z" value={c.zone || ''} onChange={e => setChip(i, 'zone', e.target.value)}>
      {kind === 'problem-solution' ? (
        <><option value="problem">⚠️ Problem</option><option value="solution">💡 Solution</option></>
      ) : (
        <>
          <option value="left">🔵 只有 {block.leftLabel || '左邊'}</option>
          <option value="both">🟣 兩邊都有</option>
          <option value="right">🟠 只有 {block.rightLabel || '右邊'}</option>
        </>
      )}
    </select>
  );

  return (
    <div className={'rc-block' + (bad ? ' bad' : '')}>
      <div className="rc-block-head">
        <b>{RS_ZH[kind] || kind}</b>
        <span className="rc-block-n">{chips.length} 張卡</span>
        {onDelete && <button type="button" className="rc-x" aria-label="刪除這個技巧" onClick={onDelete} title="刪掉這個技巧">✕</button>}
      </div>

      {bad && (
        <div className="rc-warn">
          ⚠ 這一塊還不能用：
          {kind === 'problem-solution' && '需要 4–8 張卡，Problem 與 Solution 各至少 2 張，文字不可重複或空白。'}
          {kind === 'cause-effect' && '需要 3–5 組，每組的 Cause 與 Effect 都要填、而且不可重複。'}
          {kind === 'sequence' && '需要 5–8 個事件，文字不可重複或空白。'}
          {kind === 'compare-contrast' && '需要 6–9 張卡（左≥2、右≥2、兩邊都有≥1），兩邊的標題都要填。'}
        </div>
      )}

      {kind === 'compare-contrast' && (
        <div className="rc-two">
          <label className="rc-lab">🔵 左邊是什麼
            <input value={block.leftLabel || ''} onChange={e => setSide('left', e.target.value)} placeholder="After the wolves left"/>
          </label>
          <label className="rc-lab">🟠 右邊是什麼
            <input value={block.rightLabel || ''} onChange={e => setSide('right', e.target.value)} placeholder="After the wolves returned"/>
          </label>
        </div>
      )}

      {kind === 'cause-effect' ? (
        chips.map((c, i) => (
          <div key={c.id} className="rc-row rc-row-ce">
            <span className="rc-n">{i + 1}</span>
            <div className="rc-row-f">
              <input className="rc-in" value={(zones[i] && zones[i].label) || ''} onChange={e => setZone(i, e.target.value)} placeholder="Cause（原因）例：The wolves left the island."/>
              <input className="rc-in" value={c.text} onChange={e => setChip(i, 'text', e.target.value)} placeholder="Effect（結果）例：There were too many deer."/>
              <input className="rc-in rc-why" value={c.why || ''} onChange={e => setChip(i, 'why', e.target.value)} placeholder="中文提示（選填）——放錯時給學生看"/>
            </div>
            <div className="rc-ud">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === chips.length - 1}>▼</button>
              <button type="button" className="rc-x" onClick={() => delChip(i)}>✕</button>
            </div>
          </div>
        ))
      ) : kind === 'sequence' ? (
        chips.map((c, i) => (
          <div key={c.id} className="rc-row">
            <span className="rc-n">{i + 1}</span>
            <div className="rc-row-f">
              <input className="rc-in" value={c.text} onChange={e => setChip(i, 'text', e.target.value)} placeholder={`第 ${i + 1} 件發生的事`}/>
            </div>
            <div className="rc-ud">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === chips.length - 1}>▼</button>
              <button type="button" className="rc-x" onClick={() => delChip(i)}>✕</button>
            </div>
          </div>
        ))
      ) : (
        chips.map((c, i) => (
          <div key={c.id} className="rc-row">
            <span className="rc-n">{i + 1}</span>
            <div className="rc-row-f">
              <input className="rc-in" value={c.text} onChange={e => setChip(i, 'text', e.target.value)} placeholder="一句話的卡片內容（英文）"/>
              <div className="rc-row-2">
                {zoneSel(i, c)}
                <input className="rc-in rc-why" value={c.why || ''} onChange={e => setChip(i, 'why', e.target.value)} placeholder="中文提示（選填）"/>
              </div>
            </div>
            <div className="rc-ud">
              <button type="button" className="rc-x" onClick={() => delChip(i)}>✕</button>
            </div>
          </div>
        ))
      )}

      <button type="button" className="rc-add" onClick={addChip}>＋ 新增一{kind === 'cause-effect' ? '組' : '張'}</button>
      {kind === 'sequence' && <div className="rc-note">上面的順序＝正確答案。學生看到的是打亂的。</div>}
    </div>
  );
}

/* EditorModal 用的整段：文章 + 幾個技巧 */
function ReadingSkillEditor({ passage, blocks, onChangePassage, onChangeBlocks }) {
  const list = blocks || [];
  const [addKind, setAddKind] = useS('problem-solution');
  return (
    <>
      <div className="field">
        <label className="field-label">📖 文章／文字稿（選填）</label>
        <textarea rows={5} value={passage || ''} onChange={e => onChangePassage(e.target.value)}
          placeholder="貼上文章，學生在練習時可以按 📖 再看一次。不貼也可以。"/>
        <div className="field-help">學生點右上角的 📖 就能叫出來對照，不用退出去重讀。</div>
      </div>
      {list.map((b, i) => (
        <RsBlockEditor key={b.id || i} block={b}
          onChange={nb => onChangeBlocks(list.map((x, j) => j === i ? nb : x))}
          onDelete={() => onChangeBlocks(list.filter((_, j) => j !== i))}/>
      ))}
      <div className="rc-addblock">
        <select value={addKind} onChange={e => setAddKind(e.target.value)}>
          {Object.keys(RS_ZH).map(k => <option key={k} value={k}>{RS_ZH[k]}</option>)}
        </select>
        <button type="button" className="btn ghost" onClick={() => onChangeBlocks(list.concat([rsBlankBlock(addKind)]))}>＋ 加一種技巧</button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   v386: 📖 出閱讀理解 —— 貼文字稿，一次生「選擇題＋閱讀簡答＋閱讀技巧」
   流程沿用 v382 出時態題目那一套：設定 → 出題（進度條）→ 分頁校稿 → 建立。
   ══════════════════════════════════════════════════════════════════════════ */
/* 校稿頁的紅框、擋按鈕、以及 rcBuildItems 的過濾，全部用這一個判斷——
   三個地方各寫一套的話，一定會出現「畫面說可以、建立時被丟掉」。 */
function rcMcqOk(q) {
  if (!q || !String(q.q || '').trim()) return false;
  const o = (q.options || []).map(x => String(x || '').trim());
  if (o.length !== 4 || o.some(x => !x)) return false;
  if (new Set(o.map(x => x.toLowerCase())).size !== 4) return false;   // 選項重複 → 播放時 indexOf 會判錯
  return q.answer >= 0 && q.answer < 4;
}

function ReadingGenModal({ open, categories, defaultCat, perStudent, roster, onClose, onCreate }) {
  const SK = window.RC_SKILLS || {};
  const [title, setTitle]   = useS('');
  const [text, setText]     = useS('');
  const [cat, setCat]       = useS(defaultCat || 'reading');
  const [grade, setGrade]   = useS('g4');
  const [nMcq, setNMcq]     = useS(10);
  const [nSa, setNSa]       = useS(5);
  const [skills, setSkills] = useS({ 'problem-solution': true, 'cause-effect': true, 'sequence': true, 'compare-contrast': true });
  const [keepPassage, setKeepPassage] = useS(true);
  const [busy, setBusy]     = useS(null);     // { done, total, label }
  const [err, setErr]       = useS('');
  const [res, setRes]       = useS(null);     // { mcq, sa, blocks }
  const [tab, setTab]       = useS(0);
  const [assign, setAssign] = useS(true);
  const [due, setDue]       = useS('');
  const [who, setWho]       = useS([]);

  useE(() => {
    if (!open) return;
    setTitle(''); setText(''); setCat(defaultCat || 'reading'); setGrade('g4');
    setNMcq(10); setNSa(5); setKeepPassage(true);
    setSkills({ 'problem-solution': true, 'cause-effect': true, 'sequence': true, 'compare-contrast': true });
    setBusy(null); setErr(''); setRes(null); setTab(0); setAssign(true); setWho([]);
    const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    setDue(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }, [open]);
  if (!open) return null;

  const kinds = Object.keys(SK).filter(k => skills[k]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ready = title.trim() && words >= 40 && (nMcq > 0 || nSa > 0 || kinds.length > 0);

  const run = async () => {
    setErr('');
    setBusy({ done: 0, total: Math.ceil(nMcq / 5) + (nSa ? 1 : 0) + kinds.length, label: '讀文章中' });
    try {
      const r = await window.aiMakeReadingSet({
        passage: text, title: title.trim(), grade, mcq: nMcq, sa: nSa, skills: kinds,
        onProgress: (done, total, label) => setBusy({ done, total, label }),
      });
      setRes(r); setTab(0);
    } catch (e) { setErr((e && e.message) || 'AI 出題失敗，請再試一次。'); }
    setBusy(null);
  };

  const updMcq = (i, k, v) => setRes(r => ({ ...r, mcq: r.mcq.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const updOpt = (i, oi, v) => setRes(r => ({ ...r, mcq: r.mcq.map((x, j) => j === i ? { ...x, options: x.options.map((o, k) => k === oi ? v : o) } : x) }));
  const delMcq = (i) => setRes(r => { const n = r.mcq.filter((_, j) => j !== i); if (!n.length) setTab(0); return { ...r, mcq: n }; });
  const updSa  = (i, k, v) => setRes(r => ({ ...r, sa: r.sa.map((x, j) => j === i ? { ...x, [k]: v } : x) }));
  const delSa  = (i) => setRes(r => { const n = r.sa.filter((_, j) => j !== i); if (!n.length) setTab(0); return { ...r, sa: n }; });
  const updBlk = (i, nb) => setRes(r => ({ ...r, blocks: r.blocks.map((x, j) => j === i ? nb : x) }));
  const delBlk = (i) => setRes(r => ({ ...r, blocks: r.blocks.filter((_, j) => j !== i) }));

  /* ⚠ 不要寫成 const AssignBox = () => … 再 <AssignBox/>（v380 踩過）：
     每次重繪都是新的元件型別，React 會整段拆掉重掛，勾第二個學生時第一個就點不到。 */
  const assignBox = () => (
    <div className={'qs-assign' + (assign ? ' on' : '')}>
      <label className="qs-assign-head">
        <input type="checkbox" checked={assign} onChange={e => setAssign(e.target.checked)}/>
        <span>建立後<b>整組直接指派</b>（這篇文章的練習一次派出去）</span>
      </label>
      {assign && (perStudent ? (
        <div className="qs-who">
          <div className="qs-who-bar">
            <span>指派給（{who.length}/{(roster || []).length}）</span>
            <button type="button" onClick={() => setWho((roster || []).map(r => r.email))}>全選</button>
            <button type="button" onClick={() => setWho([])}>全不選</button>
          </div>
          <div className="qs-who-list">
            {(roster || []).map(r => (
              <label key={r.email} className={'qs-who-item' + (who.indexOf(r.email) >= 0 ? ' on' : '')}>
                <input type="checkbox" checked={who.indexOf(r.email) >= 0}
                  onChange={e => setWho(w => e.target.checked ? w.concat(r.email) : w.filter(x => x !== r.email))}/>
                {r.name || r.email}
              </label>
            ))}
            {!(roster || []).length && <span className="qs-who-empty">名單還沒載入</span>}
          </div>
        </div>
      ) : (
        <div className="qs-due">
          <label>截止日</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)}/>
          <span className="qs-due-n">整組會出現在學生的「今天的任務」</span>
        </div>
      ))}
    </div>
  );

  const payload = () => ({
    title: title.trim(), cat, passage: keepPassage ? text.trim() : '',
    mcq: res.mcq, sa: res.sa, blocks: res.blocks,
    assign: assign ? (perStudent ? { students: who } : { dueDate: due }) : null,
  });

  // ───────────────────────── 設定畫面 ─────────────────────────
  if (!res) {
    return (
      /* v261 的教訓：出到一半點到背景會全部不見。出題中／校稿中一律不讓背景關閉。 */
      <div className="modal-backdrop" onClick={() => { if (!busy) onClose(); }}>
        <div className="modal wide" onClick={e => e.stopPropagation()}>
          <div className="modal-head">
            <h3>📖 出閱讀理解 <em>貼文字稿，一次出選擇題＋簡答＋閱讀技巧</em></h3>
            <button className="modal-close" aria-label="關閉" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="rc-two">
              <label className="rc-lab">文章標題（會變成這一組的名字）
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="例：Wolf Island"/>
              </label>
              <label className="rc-lab">放到哪個分類
                <select value={cat} onChange={e => setCat(e.target.value)}>
                  {(categories || []).map(c => <option key={c.id} value={c.id}>{c.label || c.name || c.id}</option>)}
                </select>
              </label>
            </div>

            <div className="field">
              <label className="field-label">📄 文章／影片文字稿</label>
              <textarea className="rc-ta" rows={9} value={text} onChange={e => setText(e.target.value)}
                placeholder={'把整篇文章或 YouTube 逐字稿貼進來（英文）。\n有時間碼（0:04 之類）也沒關係，AI 會自己忽略。'}/>
              <div className="field-help">
                目前 <b>{words}</b> 個字{words > 0 && words < 40 ? '（太短了，至少要 40 字）' : ''}。
                AI 只會考文章裡有的東西，不會自己加料。
              </div>
            </div>

            <div className="rc-two">
              <label className="rc-lab">學生年級（決定用字難度）
                <select value={grade} onChange={e => setGrade(e.target.value)}>
                  <option value="g1">G1 一年級</option><option value="g2">G2 二年級</option>
                  <option value="g3">G3 三年級</option>
                  <option value="g4">G4 四年級</option><option value="g5">G5 五年級</option>
                  <option value="g6">G6 六年級</option>
                </select>
              </label>
              <label className="rc-lab">📝 選擇題
                <select value={nMcq} onChange={e => setNMcq(+e.target.value)}>
                  <option value={0}>不要</option><option value={5}>5 題</option>
                  <option value={10}>10 題</option><option value={15}>15 題</option><option value={20}>20 題</option>
                </select>
              </label>
              <label className="rc-lab">📖 閱讀簡答（AI 批改）
                <select value={nSa} onChange={e => setNSa(+e.target.value)}>
                  <option value={0}>不要</option><option value={3}>3 題</option>
                  <option value={5}>5 題</option><option value={8}>8 題</option><option value={10}>10 題</option>
                </select>
              </label>
            </div>

            <div className="field">
              <label className="field-label">🔍 閱讀技巧 Reading Skills（學校會考的那幾種）</label>
              <div className="rc-skills">
                {Object.keys(SK).map(k => (
                  <label key={k} className={'rc-skill' + (skills[k] ? ' on' : '')}>
                    <input type="checkbox" checked={!!skills[k]} onChange={e => setSkills(s => ({ ...s, [k]: e.target.checked }))}/>
                    <span className="rc-skill-ico">{SK[k].ico}</span>
                    <span className="rc-skill-tx"><b>{SK[k].en}</b><em>{SK[k].zh}</em></span>
                  </label>
                ))}
              </div>
              <div className="field-help">勾起來的會合成<b>一個</b>「閱讀技巧」單元，學生一步一步走完。</div>
            </div>

            <label className="rc-check">
              <input type="checkbox" checked={keepPassage} onChange={e => setKeepPassage(e.target.checked)}/>
              <span>把文章一起存進去（學生練習時可以按 📖 再看一次）</span>
            </label>

            {assignBox()}

            {err && <div className="notify-msg err" style={{ marginTop: 10 }}>⚠️ {err}</div>}
            {busy && (
              <div className="gr-busy">
                <div className="gr-busy-bar"><i style={{ width: (busy.done / Math.max(1, busy.total) * 100) + '%' }}/></div>
                <span>出題中… {busy.done}/{busy.total} · {busy.label}</span>
              </div>
            )}
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={onClose} disabled={!!busy}>取消</button>
            <button className="btn primary" onClick={run} disabled={!ready || !!busy}>
              {busy ? '出題中…' : `✨ 開始出題（${(nMcq ? 1 : 0) + (nSa ? 1 : 0) + (kinds.length ? 1 : 0)} 個單元）`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────── 校稿畫面 ─────────────────────────
  const tabs = []
    .concat(res.mcq.length ? [{ k: 'mcq', name: '📝 選擇題', n: res.mcq.length }] : [])
    .concat(res.sa.length ? [{ k: 'sa', name: '📖 閱讀簡答', n: res.sa.length }] : [])
    .concat(res.blocks.map((b, i) => ({ k: 'b', i, name: (window.RC_SKILLS[b.kind] || {}).ico + ' ' + (window.RC_SKILLS[b.kind] || {}).zh, n: (b.chips || []).length })));
  const cur = tabs[Math.min(tab, Math.max(0, tabs.length - 1))];
  const nUnits = (res.mcq.length ? 1 : 0) + (res.sa.length ? 1 : 0) + (res.blocks.length ? 1 : 0);
  /* ⚠ 以前紅色的題目會被 rcBuildItems 靜靜濾掉——老師按了「建立 3 個單元」，
     結果少了 4 題也不會知道。改成擋住按鈕、直接說是哪一頁有問題。 */
  const badTabs = tabs.filter(t => t.k === 'mcq' ? res.mcq.some(q => !rcMcqOk(q))
    : t.k === 'sa' ? res.sa.some(q => !String(q.question || '').trim() || !String(q.keyPoints || '').trim())
    : !window.rcValidBlock(res.blocks[t.i]));

  return (
    <div className="modal-backdrop">
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>📖 校稿 · {title} <em>改完再建立——這是題庫，學生每次看到的都是這一份</em></h3>
          <button className="modal-close" aria-label="關閉" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="gr-tabs">
            {tabs.map((t, i) => (
              <button key={i} className={i === tab ? 'active' : ''} onClick={() => setTab(i)}>{t.name}<em>{t.n}</em></button>
            ))}
          </div>

          <div className="gr-proof">
            {!cur ? <div className="rc-note">這次什麼都沒生出來，回上一步再試一次。</div>
              : cur.k === 'mcq' ? res.mcq.map((q, i) => {
                const opts = (q.options || []).map(o => String(o || '').trim());
                const bad = !rcMcqOk(q);
                return (
                  <div key={q.id || i} className={'rc-q' + (bad ? ' bad' : '')}>
                    <div className="rc-q-head">
                      <span className="rc-n">{i + 1}</span>
                      <span className="rc-skilltag">{q.skill || 'detail'}</span>
                      <button type="button" className="rc-x" onClick={() => delMcq(i)}>✕</button>
                    </div>
                    <textarea className="rc-in" rows={2} value={q.q} onChange={e => updMcq(i, 'q', e.target.value)} placeholder="題目（英文）"/>
                    {opts.map((o, oi) => (
                      <label key={oi} className={'rc-opt' + (q.answer === oi ? ' on' : '')}>
                        <input type="radio" checked={q.answer === oi} onChange={() => updMcq(i, 'answer', oi)}/>
                        <span className="rc-opt-l">{'ABCD'[oi]}</span>
                        <input className="rc-in" value={q.options[oi]} onChange={e => updOpt(i, oi, e.target.value)}/>
                      </label>
                    ))}
                    <input className="rc-in rc-why" value={q.explain || ''} onChange={e => updMcq(i, 'explain', e.target.value)} placeholder="中文解說（答完會給學生看）"/>
                    {bad && <div className="rc-warn">⚠ 題目、四個選項都要填，選項不可重複，而且要選一個正確答案。</div>}
                  </div>
                );
              })
              : cur.k === 'sa' ? res.sa.map((q, i) => (
                <div key={q.id || i} className={'rc-q' + (!q.question.trim() || !q.keyPoints.trim() ? ' bad' : '')}>
                  <div className="rc-q-head">
                    <span className="rc-n">{i + 1}</span>
                    <button type="button" className="rc-x" onClick={() => delSa(i)}>✕</button>
                  </div>
                  <textarea className="rc-in" rows={2} value={q.question} onChange={e => updSa(i, 'question', e.target.value)} placeholder="問題（英文）"/>
                  <input className="rc-in" value={q.keyPoints} onChange={e => updSa(i, 'keyPoints', e.target.value)} placeholder="答案要點，用 / 分隔——AI 依這個決定給幾顆星"/>
                </div>
              ))
              : <RsBlockEditor block={res.blocks[cur.i]} onChange={nb => updBlk(cur.i, nb)} onDelete={() => { delBlk(cur.i); setTab(0); }}/>}
          </div>

          {badTabs.length > 0 && (
            <div className="rc-warn" style={{ marginTop: 12 }}>
              ⚠ 這幾頁還有紅色的題目要改完才能建立：{badTabs.map(t => t.name).join('、')}
              （不想改就按該題的 ✕ 刪掉）
            </div>
          )}
          {assignBox()}
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={() => setRes(null)}>← 重新設定</button>
          <button className="btn primary" onClick={() => onCreate(payload())} disabled={!nUnits || badTabs.length > 0}>
            建立 {nUnits} 個單元{assign ? '並指派' : ''} →
          </button>
        </div>
      </div>
    </div>
  );
}

/* 把校稿完的東西變成週次裡的單元。
   order 不特別指定，讓 QM_TYPE_ORDER 的預設順序生效：
   選擇題(1) → 閱讀技巧(3.5) → 閱讀簡答(6)，剛好就是「先讀懂 → 練技巧 → 自己寫」。 */
function rcBuildItems({ title, passage, mcq, sa, blocks }) {
  const stamp = Date.now();
  const rnd = () => Math.random().toString(36).slice(2, 5);
  const out = [];
  const g = title;
  const good = (mcq || []).filter(rcMcqOk);
  if (good.length) {
    out.push({
      id: 'rc' + stamp + 'qz' + rnd(), type: 'quiz', group: g,
      title: `${g} · 選擇題`, zh: `${good.length} 題 · 讀完文章選出正確答案`,
      shuffle: true,
      passage: passage || '',          // v386: 學生在選擇題畫面按 📖 就能看文章
      questions: good.map((q, i) => ({
        id: 'q' + stamp + i + rnd(),
        q: String(q.q).trim(),
        options: q.options.map(o => String(o).trim()),
        answer: q.answer,
        explain: String(q.explain || '').trim(),
      })),
    });
  }
  const useBlocks = (blocks || []).filter(b => b && (b.chips || []).filter(c => c && String(c.text || '').trim()).length >= 2);
  if (useBlocks.length) {
    // ⚠ 一定要走 rcFilterChips：因果題的 zones 要跟著卡片一起丟，不然答案會錯位
    const clean = useBlocks.map(b => window.rcFilterChips(
      { ...b, chips: (b.chips || []).map(c => ({ ...c, text: String((c && c.text) || '').trim() })) },
      c => !!c.text));
    const nChips = clean.reduce((n, b) => n + b.chips.length, 0);
    out.push({
      id: 'rc' + stamp + 'rs' + rnd(), type: 'reading-skill', group: g,
      title: `${g} · 閱讀技巧`, zh: `${clean.length} 種技巧 · ${nChips} 張卡片`,
      rsPassage: passage || '', rsBlocks: clean,
    });
  }
  const goodSa = (sa || []).filter(q => q && String(q.question || '').trim());
  if (goodSa.length) {
    out.push({
      id: 'rc' + stamp + 'sa' + rnd(), type: 'short-answer', group: g,
      title: `${g} · 閱讀簡答`, zh: `${goodSa.length} 題 · 自己寫出答案，AI 批改`,
      passage: passage || '',
      saShowPassage: !!passage,        // v386: 有貼文章就讓學生看得到（舊單元的 passage 一向只給 AI）
      saQuestions: goodSa.map((q, i) => ({
        id: 'sa' + stamp + i + rnd(),
        question: String(q.question).trim(),
        keyPoints: String(q.keyPoints || '').trim(),
      })),
    });
  }
  return out;
}

Object.assign(window, { ReadingGenModal, rcBuildItems, RsBlockEditor, ReadingSkillEditor, rsBlankBlock, EditorModal, Footer, WeekModal, ExportModal, TermSetupModal, termWeekPlan, QuickSetModal, qsBuildItems, qsParseWords, qsBlank, GrammarGenModal, grBuildItems });
