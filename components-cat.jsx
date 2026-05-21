// components-cat.jsx — Category cards & detail view

const { useState: useStateCat } = React;

const TYPE_ORDER = ["quizlet", "wordwall", "youtube", "form", "pdf", "note", "quiz", "image"];

function groupByType(items) {
  const map = {};
  items.forEach(item => { (map[item.type] = map[item.type] || []).push(item); });
  // Order groups by first occurrence in flat array (so moving items changes group order)
  const seenTypes = [];
  items.forEach(item => { if (!seenTypes.includes(item.type)) seenTypes.push(item.type); });
  return seenTypes.map(type => ({ type, items: map[type] }));
}

/* Type icon glyph used on chips */
function EmbedFrame({ src, fallbackUrl, label }) {
  const [loaded, setLoaded] = useStateCat(false);
  const [failed, setFailed] = useStateCat(false);
  const tRef = React.useRef(null);

  React.useEffect(() => {
    setLoaded(false);
    setFailed(false);
    // If onLoad never fires within 6s, assume the embed was blocked (X-Frame-Options).
    tRef.current = setTimeout(() => {
      setFailed(prev => loaded ? false : true);
    }, 6000);
    return () => clearTimeout(tRef.current);
    // eslint-disable-next-line
  }, [src]);

  return (
    <div className="embed-stack">
      <iframe
        src={src}
        allow="fullscreen"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => { setLoaded(true); setFailed(false); }}
      />
      {failed && !loaded && (
        <div className="embed-fallback">
          <div className="embed-fallback-inner">
            <div className="mono" style={{color: "var(--ink-muted)", marginBottom: 12}}>⚠ Embed blocked by {label}</div>
            <div className="serif" style={{fontSize: 22, marginBottom: 6}}>This resource won't load inside the page.</div>
            <div style={{color: "var(--ink-muted)", fontSize: 13, marginBottom: 20}}>
              {label} sometimes blocks embedding from outside their site. Open it directly in a new tab to use it.<br/>
              <span style={{color: "var(--ink-faint)"}}>{label} 有時會擋住外部網站的嵌入 — 點下面按鈕開新分頁即可正常使用。</span>
            </div>
            <a className="item-action open" href={fallbackUrl} target="_blank" rel="noopener">
              Open in {label} ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/* Type icon glyph used on chips */
function PdfDisplay({ item }) {
  const src = item.fileData || item.url;
  const isUploaded = !!item.fileData;
  if (!src) {
    return <div className="item-note-body" style={{textAlign: "center", color: "var(--ink-muted)"}}>
      No PDF attached yet. · 尚未上傳 PDF。
    </div>;
  }
  return (
    <div className="pdf-embed-wrap">
      <div className="item-embed-head">
        <span>
          PDF · {item.fileName || item.title}
          {isUploaded && <span style={{color: "var(--ink-faint)", marginLeft: 10}}>· uploaded</span>}
        </span>
        <div style={{display: "flex", gap: 14}}>
          <a href={src} target="_blank" rel="noopener">Open in new tab</a>
          <a href={src} download={item.fileName || "worksheet.pdf"}>Download ↓</a>
        </div>
      </div>
      <object data={src} type="application/pdf" className="pdf-object">
        <div className="pdf-fallback">
          <div className="pdf-icon">PDF</div>
          <div>
            <div className="serif" style={{fontSize: 20, marginBottom: 4}}>{item.fileName || item.title}</div>
            <div style={{color: "var(--ink-muted)", fontSize: 13, marginBottom: 16}}>
              無法在網頁中預覽 · Your browser can't preview this PDF inline.
            </div>
            <a className="item-action" href={src} download={item.fileName || "worksheet.pdf"}>Download ↓</a>
          </div>
        </div>
      </object>
    </div>
  );
}

function TypeGlyph({ type }) {
  const map = {
    quizlet: "Q",
    wordwall: "W",
    youtube: "▶",
    form: "Q",
    pdf: "PDF",
    note: "¶",
    image: "◇",
  };
  return <span>{map[type] || "·"}</span>;
}

function CategoryCard({ cat, items, doneCount, isOpen, onClick }) {
  const total = items.length;
  const pct = total > 0 ? (doneCount / total) * 100 : 0;
  // Build chip list = unique types in the items
  const types = Array.from(new Set(items.map(i => i.type)));

  return (
    <article className={"cat-card " + (isOpen ? "open" : "")} onClick={onClick}>
      <div className="cat-card-head">
        <span className="cat-num">— {cat.num}</span>
        <div className="cat-count">
          <span><span className="done">{doneCount}</span> / {total}</span>
          <div className="bar"><i style={{width: pct + "%"}}/></div>
        </div>
      </div>
      <h3 className="cat-title">{cat.title}<em>.</em></h3>
      <div className="cat-zh">{cat.titleZh}</div>
      <div className="cat-foot">
        <div className="cat-chips">
          {types.length === 0 ? (
            <span className="cat-chip" style={{borderStyle: "dashed", opacity: 0.6}}>No items yet</span>
          ) : types.map(t => (
            <span key={t} className="cat-chip">{(window.TYPE_META[t] || {label: t}).label}</span>
          ))}
        </div>
        <div className="cat-arrow"><Icon name={isOpen ? "chevron-down" : "arrow-right"} size={14}/></div>
      </div>
    </article>
  );
}

/* ── ITEM ROW ── */
function ItemRow({ item, checked, onToggleCheck, isExpanded, onToggleExpand, editMode, onEdit, onDelete, onMove, canMoveUp, canMoveDown }) {
  const meta = window.TYPE_META[item.type] || { label: item.type, cta: "Open →", embed: false };
  const canEmbed = meta.embed && (item.embed || item.url);

  // For YouTube: derive embed URL if not provided
  let embedSrc = item.embed;
  if (!embedSrc && item.type === "youtube" && item.url) {
    embedSrc = window.toYouTubeEmbed(item.url);
  }

  const handleCheck = (e) => { e.stopPropagation(); onToggleCheck(item.id); };
  const handleEdit = (e) => { e.stopPropagation(); onEdit(item); };
  const handleAction = (e) => {
    e.stopPropagation();
    if (canEmbed || item.type === "note" || item.type === "pdf" || item.type === "quiz") {
      onToggleExpand(item.id);
    } else if (item.url) {
      window.open(item.url, "_blank");
    }
  };

  return (
    <>
      <div className="item">
        <button className={"item-check " + (checked ? "checked" : "")} onClick={handleCheck} aria-label="Mark complete">
          {checked && <Icon name="check" size={12}/>}
        </button>
        <span className="item-type">{meta.label}</span>
        <div className="item-body">
          <div className="item-title">{item.title}</div>
          <div className="item-zh">{item.zh}</div>
        </div>
        <div className="item-meta">
          <span>{item.duration || "—"}</span>
        </div>
        <button className={"item-action " + (isExpanded ? "open" : "")} onClick={handleAction}>
          {isExpanded ? "Close ×" : meta.cta}
        </button>
        {editMode ? (
          <div className="item-edit-tools">
            <button className="move-btn" onClick={(e) => { e.stopPropagation(); onMove(item.id, -1); }} disabled={!canMoveUp} title="Move up">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 15l6-6 6 6"/></svg>
            </button>
            <button className="move-btn" onClick={(e) => { e.stopPropagation(); onMove(item.id, 1); }} disabled={!canMoveDown} title="Move down">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <button className="item-edit" onClick={handleEdit} title="Edit item">
              <Icon name="edit" size={14}/>
            </button>
          </div>
        ) : (
          <span style={{width: 28}}/>
        )}

        {isExpanded && (
          <div className="item-embed">
            {item.type === "note" ? (
              <div className="item-note-body">{item.body || "No notes yet."}</div>
            ) : item.type === "quiz" ? (
              <window.QuizPlayer item={item} onComplete={() => onToggleCheck(item.id)}/>
            ) : item.type === "pdf" ? (
              <PdfDisplay item={item}/>
            ) : embedSrc ? (
              <>
                <div className="item-embed-head">
                  <span>{meta.label} · Embedded</span>
                  <a href={item.url || embedSrc} target="_blank" rel="noopener">
                    Open in new tab <Icon name="external" size={11}/>
                  </a>
                </div>
                <EmbedFrame src={embedSrc} fallbackUrl={item.url || embedSrc} label={meta.label}/>
              </>
            ) : (
              <div className="item-note-body">No embed available.</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ── CATEGORY DETAIL ── */
function CategoryDetail({ cat, items, progress, onToggleCheck, editMode, onAddItem, onEditItem, onDeleteItem, onMoveItem, onMoveTypeGroup }) {
  const [expandedId, setExpandedId] = useStateCat(null);

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="cat-detail">
      <div className="cat-detail-head">
        <div>
          <h3 className="cat-detail-title">{cat.title}<em>.</em></h3>
          <p className="cat-detail-desc">{cat.desc}<br/><span style={{color: "var(--ink-faint)"}}>{cat.descZh}</span></p>
        </div>
        <span className="mono" style={{color: "var(--ink-muted)"}}>— {cat.num} / 04</span>
      </div>

      <div className="item-list">
        {items.length === 0 && !editMode && (
          <div style={{padding: "48px 0", textAlign: "center", color: "var(--ink-muted)", fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase"}}>
            No items yet this week
          </div>
        )}

        {groupByType(items).map(({ type, items: groupItems }, groupIdx, allGroups) => {
          const meta = window.TYPE_META[type] || { label: type, zh: "" };
          return (
            <div key={type}>
              <div style={{display: "flex", alignItems: "center", gap: 8, padding: groupIdx === 0 ? "8px 0 10px" : "20px 0 10px"}}>
                {editMode && (
                  <div style={{display: "flex", flexDirection: "column", gap: 1, flexShrink: 0}}>
                    <button
                      onClick={() => onMoveTypeGroup(cat.id, type, -1)}
                      disabled={groupIdx === 0}
                      style={{fontSize: 9, lineHeight: 1, padding: "1px 3px", opacity: groupIdx === 0 ? 0.2 : 0.6, color: "var(--ink-muted)"}}
                    >▲</button>
                    <button
                      onClick={() => onMoveTypeGroup(cat.id, type, 1)}
                      disabled={groupIdx === allGroups.length - 1}
                      style={{fontSize: 9, lineHeight: 1, padding: "1px 3px", opacity: groupIdx === allGroups.length - 1 ? 0.2 : 0.6, color: "var(--ink-muted)"}}
                    >▼</button>
                  </div>
                )}
                <span className="mono" style={{fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-muted)", whiteSpace: "nowrap"}}>
                  {meta.label}{meta.zh ? ` · ${meta.zh}` : ""}
                </span>
                <span style={{flex: 1, height: 1, background: "var(--rule, #e6e0d2)"}}/>
              </div>
              {groupItems.map((item) => {
                const flatIdx = items.findIndex(it => it.id === item.id);
                return (
                  <ItemRow
                    key={item.id}
                    item={item}
                    checked={!!progress[item.id]}
                    onToggleCheck={onToggleCheck}
                    isExpanded={expandedId === item.id}
                    onToggleExpand={toggleExpand}
                    editMode={editMode}
                    onEdit={onEditItem}
                    onDelete={onDeleteItem}
                    onMove={(id, dir) => onMoveItem(cat.id, id, dir)}
                    canMoveUp={flatIdx > 0}
                    canMoveDown={flatIdx < items.length - 1}
                  />
                );
              })}
            </div>
          );
        })}

        {editMode && (
          <button className="add-row" onClick={() => onAddItem(cat.id)}>
            <span className="plus"><Icon name="plus" size={12}/></span>
            <span>Add new item to {cat.title}</span>
          </button>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { CategoryCard, CategoryDetail, ItemRow, TypeGlyph });
