// components-shop.jsx — 金幣商店：買帽子/配件，幫夥伴換裝

const { useState: useShop } = React;

function ShopModal({ companion, coins, onClose, onChange }) {
  const [wardrobe, setWardrobe] = useShop(() => window.loadWardrobe());
  const [bal, setBal]   = useShop(coins || 0);
  const [flash, setFlash] = useShop(null); // {id, msg}

  const petType = companion?.type || 'owl';
  const petName = companion?.name || '夥伴';
  const items = window.SHOP_ITEMS || [];

  const sync = (newBal, newWard) => {
    setBal(newBal); setWardrobe(newWard);
    if (onChange) onChange(newBal, newWard);
  };

  const onBuy = (id) => {
    const res = window.buyItem(id);
    if (!res.ok) {
      if (res.reason === 'broke') { setFlash({ id, msg: '金幣不夠喔！多做幾個練習吧 💪' }); setTimeout(() => setFlash(null), 2400); }
      return;
    }
    if (window.playSound) window.playSound('badge');
    sync(res.coins, res.wardrobe);
  };
  const onEquip = (id) => {
    if (window.playSound) window.playSound('match');
    sync(bal, window.equipItem(id));
  };

  return (
    <div className="shop-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shop-panel">
        <div className="shop-head">
          <h2 className="shop-title">🎁 造型商店</h2>
          <div className="shop-bal">🪙 {bal}</div>
          <button className="icon-btn" onClick={onClose}><window.Icon name="close" size={16}/></button>
        </div>

        {/* 預覽 */}
        <div className="shop-preview">
          <window.CompanionAvatar type={petType} size={120} mood="happy" accessory={wardrobe.equipped}/>
          <div className="shop-preview-name">{petName}</div>
          {wardrobe.equipped && (
            <button className="shop-takeoff" onClick={() => onEquip(wardrobe.equipped)}>脫下</button>
          )}
        </div>

        {/* 商品格 */}
        <div className="shop-grid">
          {items.map(item => {
            const owned = wardrobe.owned.includes(item.id);
            const equipped = wardrobe.equipped === item.id;
            const afford = bal >= item.price;
            return (
              <div key={item.id} className={`shop-item${equipped ? ' equipped' : ''}`}>
                <div className="shop-item-pic">
                  <window.CompanionAvatar type={petType} size={66} mood="idle" accessory={item.id}/>
                </div>
                <div className="shop-item-name">{item.name}</div>
                {owned ? (
                  <button className={`shop-item-btn owned${equipped ? ' on' : ''}`} onClick={() => onEquip(item.id)}>
                    {equipped ? '✓ 穿著中' : '穿上'}
                  </button>
                ) : (
                  <button
                    className={`shop-item-btn buy${afford ? '' : ' broke'}`}
                    onClick={() => onBuy(item.id)}
                  >🪙 {item.price}</button>
                )}
                {flash && flash.id === item.id && <div className="shop-flash">{flash.msg}</div>}
              </div>
            );
          })}
        </div>

        <p className="shop-foot">做練習、達成每日目標就能賺金幣 🪙</p>
      </div>
    </div>
  );
}

Object.assign(window, { ShopModal });
