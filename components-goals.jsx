// components-goals.jsx — 本週任務（個人）+ 全班合作目標（班級）

const { useState: useGoal, useEffect: useGoalE } = React;

/* ── 本週個人任務 ── */
function QuestsCard({ quests, onClaim, disabled }) {
  const defs = window.WEEKLY_QUESTS || [];
  const prog = quests?.progress || {};
  const claimed = quests?.claimed || [];

  return (
    <div className="goals-card">
      <div className="goals-head">
        <span className="goals-title">🎯 本週任務</span>
        <span className="goals-sub">每週一重置</span>
      </div>
      {disabled ? (
        <div className="quest-empty">
          <div className="quest-empty-title">任務尚未開放</div>
          <div className="quest-empty-sub">本週練習放上來後，任務會自動開始計算。</div>
        </div>
      ) : (
      <div className="quest-list">
        {defs.map(d => {
          const cur = Math.min(prog[d.metric] || 0, d.goal);
          const pct = Math.round(cur / d.goal * 100);
          const done = cur >= d.goal;
          const isClaimed = claimed.includes(d.id);
          return (
            <div key={d.id} className={`quest-row${isClaimed ? ' claimed' : ''}`}>
              <div className="quest-info">
                <div className="quest-label">{d.label}</div>
                <div className="quest-bar"><div className="quest-bar-fill" style={{ width: pct + '%' }}/></div>
                <div className="quest-count">{cur} / {d.goal}</div>
              </div>
              {isClaimed ? (
                <span className="quest-claimed">✓ 已領取</span>
              ) : (
                <button className={`quest-claim${done ? ' ready' : ''}`} disabled={!done} onClick={() => onClaim(d.id)}>
                  🪙 {d.reward}
                </button>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

/* ── 全班合作目標 ── */
function CoopCard({ coop }) {
  if (!coop || !coop.goal || coop.weekKey !== _coopWeekKeyClient()) return null;
  const count = coop.count || 0;
  const pct = Math.min(100, Math.round(count / coop.goal * 100));
  const reached = count >= coop.goal;
  return (
    <div className="goals-card coop-card">
      <div className="goals-head">
        <span className="goals-title">👫 全班一起</span>
        <span className="goals-sub">本週班級目標</span>
      </div>
      <div className="coop-body">
        <div className="coop-stat"><strong>{count}</strong> / {coop.goal} 題</div>
        <div className="coop-bar"><div className="coop-bar-fill" style={{ width: pct + '%' }}/></div>
        {reached ? (
          <div className="coop-reached">🎉 全班達標！{coop.reward ? `獎勵：${coop.reward}` : ''}</div>
        ) : (
          <div className="coop-hint">大家一起加油，每答對一題就推進班級進度！{coop.reward ? `達標獎勵：${coop.reward}` : ''}</div>
        )}
      </div>
    </div>
  );
}
function _coopWeekKeyClient() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const wk = Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${wk}`;
}

/* ── 老師：設定全班合作目標（儀表板用） ── */
function CoopGoalSetter() {
  const [coop, setCoop] = useGoal(null);
  const [goal, setGoalV] = useGoal('');
  const [reward, setReward] = useGoal('');
  const [saved, setSaved] = useGoal(false);

  useGoalE(() => window.subscribeCoop(c => {
    setCoop(c);
    if (c) { setGoalV(c.goal || ''); setReward(c.reward || ''); }
  }, () => {}), []);

  const save = async () => {
    await window.setCoopGoal(goal, reward);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const count = coop?.count || 0;
  const pct = coop?.goal ? Math.min(100, Math.round(count / coop.goal * 100)) : 0;

  return (
    <div className="coop-setter">
      <div className="coop-setter-title">👫 本週全班合作目標</div>
      {coop?.goal ? (
        <div className="coop-setter-prog">目前 {count} / {coop.goal} 題（{pct}%）</div>
      ) : (
        <div className="coop-setter-prog">尚未設定 — 設一個全班一起達成的題數目標</div>
      )}
      <div className="coop-setter-row">
        <input className="coop-setter-input" type="number" placeholder="目標題數（如 500）" value={goal} onChange={e => setGoalV(e.target.value)}/>
        <input className="coop-setter-input" placeholder="達標獎勵（如：全班看影片）" value={reward} onChange={e => setReward(e.target.value)}/>
        <button className="coop-setter-btn" onClick={save}>{saved ? '已儲存 ✓' : '設定目標'}</button>
      </div>
      <div className="coop-setter-note">⚠️ 學生貢獻需先部署新版 firestore.rules 才會累計。</div>
    </div>
  );
}

Object.assign(window, { QuestsCard, CoopCard, CoopGoalSetter });
