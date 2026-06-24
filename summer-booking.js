/* 暑假上課時間 — public multi-slot booking page (2026) */
(function () {
  const entrance = document.getElementById('summer-entrance');
  const dismissEntrance = () => { if (entrance) entrance.classList.add('summer-entrance-hidden'); };
  if (entrance) {
    window.setTimeout(dismissEntrance, 2300);
    entrance.addEventListener('click', dismissEntrance);
    entrance.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') dismissEntrance(); });
  }
  const firebaseConfig = {
    apiKey: 'AIzaSyD1fQDneiwkGhbMOUxpOzVxZi8EIkourAs', authDomain: 'alan-s-english-class.firebaseapp.com',
    projectId: 'alan-s-english-class', storageBucket: 'alan-s-english-class.firebasestorage.app',
    messagingSenderId: '113180818799', appId: '1:113180818799:web:fff201f706d5c90b5f3c9a',
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const SLOTS = 'summerSlots2026', BOOKINGS = 'summerBookings2026', ADMIN_EMAIL = 'alan07050445@gmail.com';
  const TIMES = [['10:00','12:00'],['13:00','15:00'],['15:00','17:00'],['17:00','19:00']];
  const SPECIAL_TIMES = [['10:00','12:00'],['13:00','16:00'],['16:00','18:00'],['18:00','20:00']];
  const KEVIN_ELAINE_DATES = ['2026-08-10','2026-08-11','2026-08-12','2026-08-13','2026-08-14','2026-08-17','2026-08-18','2026-08-19','2026-08-20','2026-08-21'];
  const defaultTimesForDate = date => KEVIN_ELAINE_DATES.includes(date) ? SPECIAL_TIMES : TIMES;
  const CLOSED = new Set(['2026-07-09','2026-07-10']);
  const OWN_STORAGE = 'alan-summer-own-bookings-2026';
  const readOwnBookings = () => { try { return JSON.parse(localStorage.getItem(OWN_STORAGE) || '[]'); } catch (_) { return []; } };
  const saveOwnBookings = bookings => localStorage.setItem(OWN_STORAGE, JSON.stringify(bookings));
  const state = { month: 6, booked: new Set(), slots: new Map(), selectedDate: null, selectedSlots: [], ownBookings: readOwnBookings() };
  let stopSlotListener = null;
  let stopAdminBookingListener = null;
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const keyFor = (date, start) => `${date}-${start.replace(':','')}`;
  const timesForDate = date => {
    const stored = [...state.slots.values()].filter(slot => slot.date === date).sort((a,b) => a.start.localeCompare(b.start));
    return stored.length ? stored.map(slot => [slot.start, slot.end]) : defaultTimesForDate(date);
  };
  const dateText = date => { const d = new Date(`${date}T12:00:00`); return `${d.getMonth()+1} 月 ${d.getDate()} 日（${'日一二三四五六'[d.getDay()]}）`; };
  const eligibleDates = () => { const out=[]; for(let d=new Date('2026-07-01T12:00:00');d<=new Date('2026-08-31T12:00:00');d.setDate(d.getDate()+1)){const v=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;if(d.getDay()!==0&&d.getDay()!==6&&!CLOSED.has(v))out.push(v);} return out; };
  const updateSteps = step => [['step-two',step>=2],['step-three',step>=3]].forEach(([id,on]) => $(id).classList.toggle('active',on));
  const isDateFull = date => timesForDate(date).every(([start]) => state.booked.has(keyFor(date,start)));
  const renderCalendar = () => {
    const first = new Date(2026,state.month,1).getDay(), days = new Date(2026,state.month+1,0).getDate(), fragments=[];
    for(let i=0;i<(first===0?6:first-1);i++)fragments.push('<div class="day-empty"></div>');
    for(let day=1;day<=days;day++){
      const date=`2026-${pad(state.month+1)}-${pad(day)}`, closed=!eligibleDates().includes(date), full=!closed&&isDateFull(date), selected=state.selectedDate===date;
      const mine=state.ownBookings.some(slot=>slot.date===date);
      const classes=['day',closed?'disabled closed':'',full?'disabled full':'',mine?'mine':'',selected?'selected':''].filter(Boolean).join(' ');
      fragments.push(`<button type="button" class="${classes}" data-date="${date}" ${closed||full?'disabled':''}>${day}</button>`);
    }
    $('calendar').innerHTML=fragments.join('');
    $('calendar').querySelectorAll('.day:not(.disabled)').forEach(b=>b.addEventListener('click',()=>selectDate(b.dataset.date)));
  };
  const selectDate = date => {
    state.selectedDate=date; $('times-panel').hidden=false;
    $('selected-date-label').textContent=`${dateText(date)} · 點選時段即可加入／移出清單`;
    renderTimes(); updateSteps(state.selectedSlots.length?2:1); renderCalendar(); $('times-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  const renderTimes = () => {
    if(!state.selectedDate)return;
    $('time-slots').innerHTML=timesForDate(state.selectedDate).map(([start,end])=>{
      const id=keyFor(state.selectedDate,start), booked=state.booked.has(id), picked=state.selectedSlots.some(slot=>slot.id===id), mine=state.ownBookings.some(slot=>slot.id===id);
      return `<button type="button" class="time-slot ${picked?'picked':''} ${mine?'mine':''}" data-start="${start}" data-end="${end}" ${booked?'disabled':''}><span>${start} – ${end}</span><small>${mine?'您的課程':booked?'已排課':picked?'已加入 ✓':'加入清單 +'}</small></button>`;
    }).join('');
    $('time-slots').querySelectorAll('.time-slot:not(:disabled)').forEach(b=>b.addEventListener('click',()=>toggleSlot(state.selectedDate,b.dataset.start,b.dataset.end)));
  };
  const toggleSlot = (date,start,end) => {
    const id=keyFor(date,start), index=state.selectedSlots.findIndex(slot=>slot.id===id);
    if(index>=0)state.selectedSlots.splice(index,1); else state.selectedSlots.push({id,date,start,end});
    renderTimes(); renderCart(); renderCalendar(); updateSteps(state.selectedSlots.length?2:1);
  };
  const renderCart = () => {
    const sorted=[...state.selectedSlots].sort((a,b)=>a.id.localeCompare(b.id));
    $('cart-panel').hidden=!sorted.length;
    $('selected-count').textContent=sorted.length?`（${sorted.length} 堂）`:'';
    $('selected-slots').innerHTML=sorted.map(slot=>`<div class="selected-slot"><span>${dateText(slot.date)}　${slot.start} – ${slot.end}</span><button type="button" data-id="${slot.id}" aria-label="移除此時段">×</button></div>`).join('');
    $('selected-slots').querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{state.selectedSlots=state.selectedSlots.filter(slot=>slot.id!==button.dataset.id);renderTimes();renderCart();renderCalendar();}));
  };
  const openConfirmation = () => {
    if(!state.selectedSlots.length)return;
    const sorted=[...state.selectedSlots].sort((a,b)=>a.id.localeCompare(b.id));
    $('form-panel').hidden=false;
    $('chosen-slot').innerHTML=`以下 ${sorted.length} 個時段將一起保留：<br>${sorted.map(slot=>`${dateText(slot.date)} ${slot.start} – ${slot.end}`).join('<br>')}`;
    updateSteps(3); $('form-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  const showError = message => window.alert(message);
  const loadSlots = async () => { const snap=await db.collection(SLOTS).get(); state.booked=new Set(); state.slots=new Map(); snap.forEach(doc=>{state.slots.set(doc.id,doc.data());if(doc.data().status==='booked')state.booked.add(doc.id);}); };
  const watchSlots = () => {
    if (stopSlotListener) stopSlotListener();
    stopSlotListener = db.collection(SLOTS).onSnapshot(snapshot => {
      state.booked = new Set(); state.slots = new Map();
      snapshot.forEach(doc => { state.slots.set(doc.id,doc.data()); if (doc.data().status === 'booked') state.booked.add(doc.id); });
      const before = state.selectedSlots.length;
      state.selectedSlots = state.selectedSlots.filter(slot => !state.booked.has(slot.id));
      if (before !== state.selectedSlots.length) {
        $('form-panel').hidden = true;
        renderCart();
      }
      if (!$('booking-app').hidden) { renderCalendar(); renderTimes(); }
    });
  };
  const submitBooking = async event => {
    event.preventDefault(); if(!state.selectedSlots.length)return;
    const studentName=new FormData(event.currentTarget).get('studentName').trim(), selected=[...state.selectedSlots];
    const submit=$('submit-booking'); submit.disabled=true; submit.textContent='正在保留所有時段…';
    try {
      const group=`summer-2026-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const changeToken=(crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await db.runTransaction(async transaction=>{
        const refs=selected.map(slot=>db.collection(SLOTS).doc(slot.id));
        const snaps=await Promise.all(refs.map(ref=>transaction.get(ref)));
        snaps.forEach((snap,index)=>{if(!snap.exists||snap.data().status!=='open')throw new Error(`${dateText(selected[index].date)} ${selected[index].start} 剛剛被選走了，請重新選擇。`);});
        selected.forEach((slot,index)=>{
          transaction.update(refs[index],{status:'booked',bookedAt:firebase.firestore.FieldValue.serverTimestamp()});
          transaction.set(db.collection(BOOKINGS).doc(slot.id),{slotId:slot.id,date:slot.date,start:slot.start,end:slot.end,studentName,bookingGroup:group,changeToken,status:'confirmed',createdAt:firebase.firestore.FieldValue.serverTimestamp()});
        });
      });
      selected.forEach(slot=>state.booked.add(slot.id)); state.ownBookings=[...state.ownBookings.filter(existing=>!selected.some(slot=>slot.id===existing.id)),...selected.map(slot=>({...slot,changeToken}))];saveOwnBookings(state.ownBookings); state.selectedSlots=[]; $('times-panel').hidden=true;$('cart-panel').hidden=true;$('form-panel').hidden=true;$('success-panel').hidden=false;
      $('success-copy').textContent=`${studentName} 已成功保留 ${selected.length} 個暑假上課時段。`;
      renderCalendar(); $('success-panel').scrollIntoView({behavior:'smooth',block:'center'});
    } catch(error) {
      console.error(error); showError(error.message||'暫時無法完成預約，請稍後再試。'); await loadSlots(); state.selectedSlots=state.selectedSlots.filter(slot=>!state.booked.has(slot.id)); renderTimes();renderCart();renderCalendar();
    } finally { submit.disabled=false; submit.innerHTML='確認保留所有時段 <span>→</span>'; }
  };
  const changeOwnBookings = async () => {
    const own = [...state.ownBookings];
    if (!own.length) { $('success-panel').hidden=true; return; }
    if (own.some(slot => !slot.changeToken)) return showError('這筆是更新前建立的舊測試預約，請由 Alan 管理頁釋放後再重新選課。');
    if (!window.confirm('要釋放您目前保留的時段，重新選擇嗎？')) return;
    try {
      const batch=db.batch();
      own.forEach(slot=>{
        batch.update(db.collection(BOOKINGS).doc(slot.id),{status:'cancel_requested',changeToken:slot.changeToken});
        batch.update(db.collection(SLOTS).doc(slot.id),{status:'open',bookedAt:firebase.firestore.FieldValue.delete()});
      });
      await batch.commit();
      state.ownBookings=[];saveOwnBookings([]);$('success-panel').hidden=true;$('booking-form').reset();state.selectedDate=null;state.selectedSlots=[];updateSteps(1);renderCart();renderCalendar();window.scrollTo({top:0,behavior:'smooth'});
    } catch(error){console.error(error);showError('目前無法更改時段，請稍後再試或聯絡 Alan 老師。');}
  };
  const watchAdminBookings = () => {
    if (stopAdminBookingListener) stopAdminBookingListener();
    $('admin-bookings').hidden = false;
    stopAdminBookingListener = db.collection(BOOKINGS).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
      const groups = new Map();
      snapshot.forEach(doc => {
        const booking = doc.data(), groupId = (booking.studentName || '').trim() || doc.id;
        if (booking.status !== 'confirmed') return;
        if (!groups.has(groupId)) groups.set(groupId, { groupId, studentName: booking.studentName, slots: [] });
        groups.get(groupId).slots.push(booking);
      });
      const entries = [...groups.values()];
      $('admin-booking-count').textContent = entries.length ? `${entries.length} 位學生` : '尚未有人選課';
      $('admin-booking-list').innerHTML = entries.length ? entries.map(entry => {
        const slots = entry.slots.sort((a,b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
        return `<div class="admin-booking"><b>${entry.studentName}</b> · ${slots.length} 堂<div class="admin-booking-slots">${slots.map(slot => `<div class="admin-booking-slot"><span>${dateText(slot.date)} ${slot.start}–${slot.end}</span><button class="release-slot" type="button" data-slot-id="${slot.slotId}">釋放</button></div>`).join('')}</div></div>`;
      }).join('') : '<div class="admin-booking">目前還沒有家長選課。</div>';
      $('admin-booking-list').querySelectorAll('.release-slot').forEach(button => button.addEventListener('click', () => releaseBookingSlot(button.dataset.slotId)));
    }, error => { console.error(error); $('admin-booking-list').innerHTML = '<div class="admin-booking">讀取選課名單失敗，請重新登入管理頁。</div>'; });
  };
  const releaseBookingSlot = async slotId => {
    if (!window.confirm('要釋放這一堂課嗎？')) return;
    try {
      const batch = db.batch();
      batch.update(db.collection(SLOTS).doc(slotId), { status: 'open', bookedAt: firebase.firestore.FieldValue.delete() });
      batch.delete(db.collection(BOOKINGS).doc(slotId));
      await batch.commit();
    } catch (error) { console.error(error); showError('無法釋放這一堂課，請稍後再試。'); }
  };
  const signInAsAdmin = async () => {
    const login=$('admin-login');login.disabled=true;login.textContent='正在登入…';
    try { const provider=new firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});const result=await firebase.auth().signInWithPopup(provider);if(result.user.email!==ADMIN_EMAIL){await firebase.auth().signOut();throw new Error('請使用 Alan 的 Google 帳號登入。');}await ensureKevinElaineBooking();await loadSlots();renderCalendar();$('admin-copy').textContent='已登入 Alan 管理帳號。Kevin & Elaine 的預排時段已自動卡位。';login.hidden=true;$('admin-manual-form').hidden=false;watchAdminBookings(); } catch(error) {showError(error.message||'登入失敗或預排設定失敗，請再試一次。');login.disabled=false;login.textContent='以 Alan 帳號登入';}
  };
  const seedSlots = async () => {
    const button=$('seed-slots');button.disabled=true;button.textContent='正在建立時段…';
    try {const existing=await db.collection(SLOTS).get(), ids=new Set(existing.docs.map(doc=>doc.id)),batch=db.batch();let created=0;eligibleDates().forEach(date=>defaultTimesForDate(date).forEach(([start,end])=>{const id=keyFor(date,start);if(!ids.has(id)){batch.set(db.collection(SLOTS).doc(id),{slotId:id,date,start,end,status:'open',createdAt:firebase.firestore.FieldValue.serverTimestamp()});created++;}}));if(created)await batch.commit();await loadSlots();renderCalendar();$('admin-copy').textContent=created?`完成：已建立 ${created} 個開放時段。現在家長可以開始選課。`:'所有暑假時段都已建立完成。';button.textContent='時段已建立完成';}catch(error){console.error(error);showError(error.message||'建立時段失敗，請確認 Firestore 規則已發布。');button.disabled=false;button.textContent='再試一次';}
  };
  const ensureKevinElaineBooking = async () => {
    await db.runTransaction(async transaction => {
      const configRef = db.collection('class').doc('summer-booking-2026');
      const config = await transaction.get(configRef);
      if (config.exists && config.data().kevinElaineApplied) return;
      const refs = KEVIN_ELAINE_DATES.flatMap(date => ['13:00','15:00','17:00','16:00','18:00'].map(start => db.collection(SLOTS).doc(keyFor(date,start))));
      const snaps = await Promise.all(refs.map(ref => transaction.get(ref)));
      snaps.forEach((snap, index) => {
        const start = ['13:00','15:00','17:00','16:00','18:00'][index % 5];
        if ((start === '15:00' || start === '17:00' || start === '16:00' || start === '18:00') && snap.exists && snap.data().status === 'booked') throw new Error('這 10 天已有其他家長預約的重疊時段，沒有自動覆蓋。');
      });
      KEVIN_ELAINE_DATES.forEach(date => {
        const mainId = keyFor(date,'13:00');
        transaction.set(db.collection(SLOTS).doc(mainId), { slotId:mainId, date, start:'13:00', end:'16:00', status:'booked', bookedAt:firebase.firestore.FieldValue.serverTimestamp() });
        transaction.set(db.collection(BOOKINGS).doc(mainId), { slotId:mainId, date, start:'13:00', end:'16:00', studentName:'Kevin & Elaine', bookingGroup:'summer-2026-kevin-elaine', status:'confirmed', createdAt:firebase.firestore.FieldValue.serverTimestamp() });
        transaction.delete(db.collection(SLOTS).doc(keyFor(date,'15:00')));
        transaction.delete(db.collection(SLOTS).doc(keyFor(date,'17:00')));
        [['16:00','18:00'],['18:00','20:00']].forEach(([start,end]) => { const id=keyFor(date,start); transaction.set(db.collection(SLOTS).doc(id), { slotId:id, date, start, end, status:'open', createdAt:firebase.firestore.FieldValue.serverTimestamp() }); });
      });
      transaction.set(configRef, { kevinElaineApplied: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    });
  };
  const saveManualSlot = async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const studentName = data.studentName.trim();
    if (!data.date || !data.start || !data.end || data.end <= data.start) return showError('請填寫正確的日期與開始／結束時間。');
    const day = new Date(`${data.date}T12:00:00`).getDay();
    if (day === 0 || day === 6 || data.date < '2026-07-01' || data.date > '2026-08-31') return showError('只可設定 2026 年 7–8 月的週一至週五。');
    const id = keyFor(data.date, data.start);
    const overlaps = [...state.slots.values()].some(slot => slot.slotId !== id && slot.date === data.date && data.start < slot.end && data.end > slot.start);
    if (overlaps) return showError('這個時間和既有時段重疊，請先釋放或選擇其他時間。');
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = '儲存中…';
    try {
      const batch = db.batch();
      batch.set(db.collection(SLOTS).doc(id), { slotId:id, date:data.date, start:data.start, end:data.end, status:studentName ? 'booked' : 'open', ...(studentName ? { bookedAt:firebase.firestore.FieldValue.serverTimestamp() } : { createdAt:firebase.firestore.FieldValue.serverTimestamp() }) });
      if (studentName) batch.set(db.collection(BOOKINGS).doc(id), { slotId:id, date:data.date, start:data.start, end:data.end, studentName, bookingGroup:`manual-${id}`, status:'confirmed', createdAt:firebase.firestore.FieldValue.serverTimestamp() });
      await batch.commit();
      event.currentTarget.reset();
    } catch (error) { console.error(error); showError('無法儲存時段，請稍後再試。'); }
    finally { button.disabled = false; button.textContent = '儲存這個時段'; }
  };
  const setup = async () => {
    try {await loadSlots();$('loading').hidden=true;$('booking-app').hidden=false;if(new URLSearchParams(window.location.search).has('admin'))$('admin-panel').hidden=false;renderCalendar();watchSlots();}catch(error){console.error(error);$('loading').innerHTML='目前無法讀取時段，請稍後再試或直接聯絡 Alan 老師。';}
  };
  document.querySelectorAll('.month-tab').forEach(button=>button.addEventListener('click',()=>{state.month=Number(button.dataset.month);document.querySelectorAll('.month-tab').forEach(tab=>{const selected=tab===button;tab.classList.toggle('active',selected);tab.setAttribute('aria-selected',selected);});renderCalendar();}));
  $('change-date').addEventListener('click',()=>{$('times-panel').hidden=true;state.selectedDate=null;updateSteps(state.selectedSlots.length?2:1);renderCalendar();});
  $('change-time').addEventListener('click',()=>{$('form-panel').hidden=true;updateSteps(2);$('cart-panel').scrollIntoView({behavior:'smooth',block:'nearest'});});
  $('continue-to-form').addEventListener('click',openConfirmation);$('booking-form').addEventListener('submit',submitBooking);
  $('book-another').addEventListener('click',()=>{$('success-panel').hidden=true;$('booking-form').reset();state.selectedDate=null;state.selectedSlots=[];updateSteps(1);renderCart();renderCalendar();window.scrollTo({top:0,behavior:'smooth'});});
  $('change-bookings').addEventListener('click',changeOwnBookings);
  $('admin-login').addEventListener('click',signInAsAdmin);$('admin-manual-form').addEventListener('submit',saveManualSlot);setup();
})();
