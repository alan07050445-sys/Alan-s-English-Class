// components-companion.jsx — 學習夥伴：可愛角色 SVG + 命名/選擇 onboarding

const { useState: useCmp } = React;

/* ── 可愛角色 SVG（viewBox 100x100） ── */
function _owl(mood) {
  const happy = mood === 'celebrate' || mood === 'happy';
  return (
    <g>
      {/* ear tufts */}
      <path d="M26 24 L38 36 L20 38 Z" fill="#8B3120"/>
      <path d="M74 24 L62 36 L80 38 Z" fill="#8B3120"/>
      {/* body */}
      <ellipse cx="50" cy="58" rx="33" ry="35" fill="#B85A45"/>
      {/* wings */}
      <ellipse cx="20" cy="60" rx="9" ry="18" fill="#A04C38"/>
      <ellipse cx="80" cy="60" rx="9" ry="18" fill="#A04C38"/>
      {/* belly */}
      <ellipse cx="50" cy="64" rx="21" ry="23" fill="#F4E3D0"/>
      {/* eyes */}
      <circle cx="38" cy="46" r="14" fill="#FBF8F1" stroke="#E8D9B0" strokeWidth="1.5"/>
      <circle cx="62" cy="46" r="14" fill="#FBF8F1" stroke="#E8D9B0" strokeWidth="1.5"/>
      {happy ? (
        <g stroke="#15130E" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M31 47 Q38 40 45 47"/><path d="M55 47 Q62 40 69 47"/>
        </g>
      ) : (
        <g>
          <circle cx="38" cy="47" r="7" fill="#15130E"/>
          <circle cx="62" cy="47" r="7" fill="#15130E"/>
          <circle cx="40.5" cy="44.5" r="2.4" fill="#fff"/>
          <circle cx="64.5" cy="44.5" r="2.4" fill="#fff"/>
        </g>
      )}
      {/* cheeks */}
      <circle cx="26" cy="60" r="5" fill="#E8857A" opacity="0.55"/>
      <circle cx="74" cy="60" r="5" fill="#E8857A" opacity="0.55"/>
      {/* beak */}
      <path d="M45 56 L55 56 L50 64 Z" fill="#E8A23D"/>
      {/* feet */}
      <path d="M40 91 l-5 6 M44 92 l-1 6 M56 92 l1 6 M60 91 l5 6" stroke="#E8A23D" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
    </g>
  );
}
function _cat(mood) {
  const happy = mood === 'celebrate' || mood === 'happy';
  return (
    <g>
      {/* ears */}
      <path d="M24 30 L36 14 L44 34 Z" fill="#8A86C9"/>
      <path d="M76 30 L64 14 L56 34 Z" fill="#8A86C9"/>
      <path d="M30 28 L37 20 L41 31 Z" fill="#F4C0D1"/>
      <path d="M70 28 L63 20 L59 31 Z" fill="#F4C0D1"/>
      {/* head/body */}
      <ellipse cx="50" cy="58" rx="33" ry="33" fill="#9B97D6"/>
      <ellipse cx="50" cy="66" rx="20" ry="20" fill="#EFEDFB"/>
      {/* eyes */}
      {happy ? (
        <g stroke="#15130E" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M33 50 Q40 44 47 50"/><path d="M53 50 Q60 44 67 50"/>
        </g>
      ) : (
        <g>
          <ellipse cx="40" cy="50" rx="6" ry="8" fill="#15130E"/>
          <ellipse cx="60" cy="50" rx="6" ry="8" fill="#15130E"/>
          <circle cx="42" cy="47" r="2" fill="#fff"/>
          <circle cx="62" cy="47" r="2" fill="#fff"/>
        </g>
      )}
      {/* nose + mouth */}
      <path d="M47 58 L53 58 L50 62 Z" fill="#D4537E"/>
      <path d="M50 62 Q45 67 41 63 M50 62 Q55 67 59 63" stroke="#6B6797" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* cheeks */}
      <circle cx="30" cy="60" r="5" fill="#E8857A" opacity="0.5"/>
      <circle cx="70" cy="60" r="5" fill="#E8857A" opacity="0.5"/>
      {/* whiskers */}
      <g stroke="#B4B2A9" strokeWidth="1.5" strokeLinecap="round">
        <path d="M28 58 L12 54 M28 63 L12 64"/><path d="M72 58 L88 54 M72 63 L88 64"/>
      </g>
    </g>
  );
}
function _dog(mood) {
  const happy = mood === 'celebrate' || mood === 'happy';
  return (
    <g>
      {/* floppy ears */}
      <ellipse cx="22" cy="50" rx="11" ry="22" fill="#B57636"/>
      <ellipse cx="78" cy="50" rx="11" ry="22" fill="#B57636"/>
      {/* head/body */}
      <ellipse cx="50" cy="56" rx="33" ry="33" fill="#D99A52"/>
      {/* muzzle */}
      <ellipse cx="50" cy="66" rx="22" ry="18" fill="#F4E3D0"/>
      {/* spot */}
      <ellipse cx="64" cy="40" rx="11" ry="10" fill="#C5863F"/>
      {/* eyes */}
      {happy ? (
        <g stroke="#15130E" strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M33 47 Q40 41 47 47"/><path d="M55 47 Q62 41 69 47"/>
        </g>
      ) : (
        <g>
          <circle cx="40" cy="48" r="6" fill="#15130E"/>
          <circle cx="60" cy="48" r="6" fill="#15130E"/>
          <circle cx="42" cy="45.5" r="2" fill="#fff"/>
          <circle cx="62" cy="45.5" r="2" fill="#fff"/>
        </g>
      )}
      {/* nose */}
      <ellipse cx="50" cy="60" rx="6" ry="5" fill="#15130E"/>
      {/* mouth + tongue */}
      <path d="M50 65 Q44 72 38 67 M50 65 Q56 72 62 67" stroke="#A87038" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {happy && <ellipse cx="50" cy="72" rx="5" ry="7" fill="#E8857A"/>}
      {/* cheeks */}
      <circle cx="30" cy="60" r="5" fill="#E8857A" opacity="0.45"/>
      <circle cx="70" cy="60" r="5" fill="#E8857A" opacity="0.45"/>
    </g>
  );
}

/* ── 帽子 / 配件（畫在頭頂，三種動物通用座標） ── */
function _accBow() {
  return (
    <g>
      <path d="M50 18 L32 9 L32 27 Z" fill="#D4537E"/>
      <path d="M50 18 L68 9 L68 27 Z" fill="#D4537E"/>
      <circle cx="50" cy="18" r="5" fill="#B23A66"/>
    </g>
  );
}
function _accParty() {
  return (
    <g>
      <path d="M50 -4 L36 24 L64 24 Z" fill="#6D5BD0"/>
      <path d="M44 10 h12 M41 18 h18" stroke="#F4C0D1" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="50" cy="-4" r="5" fill="#E8A23D"/>
    </g>
  );
}
function _accGrad() {
  return (
    <g>
      <rect x="40" y="16" width="20" height="9" rx="2" fill="#2C2C2A"/>
      <polygon points="50,2 80,14 50,26 20,14" fill="#15130E"/>
      <circle cx="50" cy="14" r="2.5" fill="#E8A23D"/>
      <path d="M50 14 L72 14 L72 28" stroke="#E8A23D" strokeWidth="2" fill="none"/>
      <circle cx="72" cy="29" r="3" fill="#E8A23D"/>
    </g>
  );
}
function _accCap() {
  return (
    <g>
      <path d="M28 22 Q50 -2 72 22 Z" fill="#2E8FD0"/>
      <ellipse cx="50" cy="23" rx="26" ry="6" fill="#2477AD"/>
      <path d="M50 22 Q72 20 78 27 L74 30 Q60 24 50 25 Z" fill="#2477AD"/>
      <circle cx="50" cy="6" r="3" fill="#1C5C86"/>
    </g>
  );
}
function _accWizard() {
  return (
    <g>
      <path d="M50 -10 L34 26 L66 26 Z" fill="#4A3C89"/>
      <ellipse cx="50" cy="26" rx="22" ry="5" fill="#3A2E6E"/>
      <path d="M44 12 l5 4 -2 6 M56 6 l2 5 4 1" stroke="#F4D06A" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="50" cy="-10" r="3.5" fill="#F4D06A"/>
    </g>
  );
}
function _accCrown() {
  return (
    <g>
      <path d="M28 26 L30 8 L40 19 L50 5 L60 19 L70 8 L72 26 Z" fill="#F0C04A" stroke="#D9A52F" strokeWidth="1.5"/>
      <circle cx="50" cy="14" r="3" fill="#E0507A"/>
      <circle cx="34" cy="20" r="2" fill="#2E8FD0"/>
      <circle cx="66" cy="20" r="2" fill="#2E8FD0"/>
    </g>
  );
}
const _ACC = { bow: _accBow, party: _accParty, grad: _accGrad, cap: _accCap, wizard: _accWizard, crown: _accCrown };

const _DRAW = { owl: _owl, cat: _cat, dog: _dog };
const COMPANION_TYPES = [
  { type: 'owl', name: '貓頭鷹', desc: '聰明愛讀書 📚' },
  { type: 'cat', name: '小貓',   desc: '溫柔又療癒 🌙' },
  { type: 'dog', name: '小狗',   desc: '活潑又熱情 ⚡' },
];

function CompanionAvatar({ type = 'owl', size = 96, mood = 'idle', accessory = null }) {
  const draw = _DRAW[type] || _owl;
  const acc = accessory && _ACC[accessory] ? _ACC[accessory] : null;
  return (
    <span className={`comp-avatar comp-${mood}`} style={{ width: size, height: size, display: 'inline-block' }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {draw(mood)}
        {acc && acc()}
      </svg>
    </span>
  );
}

/* ── Onboarding：選角色 + 取名 ── */
function CompanionSetup({ onDone }) {
  const [type, setType] = useCmp(null);
  const [name, setName] = useCmp('');

  const confirm = () => {
    if (!type) return;
    const finalName = (name.trim() || COMPANION_TYPES.find(t => t.type === type).name).slice(0, 12);
    const saved = window.saveCompanion({ type, name: finalName });
    if (window.playSound) window.playSound('complete');
    onDone(saved);
  };

  return (
    <div className="comp-setup-overlay">
      <div className="comp-setup">
        <div className="comp-setup-banner">
          <img src="owl-mascot.png" alt="貓頭鷹吉祥物" className="comp-setup-owl"/>
          <div className="comp-setup-banner-text">
            <h2 className="comp-setup-title">選一個學習夥伴</h2>
            <p className="comp-setup-sub">牠會陪你一起學英文、為你加油！</p>
          </div>
        </div>

        <div className="comp-setup-choices">
          {COMPANION_TYPES.map(c => (
            <button
              key={c.type}
              className={`comp-choice${type === c.type ? ' on' : ''}`}
              onClick={() => setType(c.type)}
            >
              <CompanionAvatar type={c.type} size={88} mood={type === c.type ? 'happy' : 'idle'}/>
              <span className="comp-choice-name">{c.name}</span>
              <span className="comp-choice-desc">{c.desc}</span>
            </button>
          ))}
        </div>

        {type && (
          <div className="comp-name-row">
            <label className="comp-name-label">幫牠取個名字</label>
            <input
              className="comp-name-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`例如：${COMPANION_TYPES.find(t => t.type === type).name}寶`}
              maxLength={12}
              onKeyDown={e => e.key === 'Enter' && confirm()}
              autoFocus
            />
          </div>
        )}

        <button className="comp-setup-confirm" onClick={confirm} disabled={!type}>
          {type ? '就是你了！開始學習 →' : '先選一個夥伴'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { CompanionAvatar, CompanionSetup, COMPANION_TYPES });
