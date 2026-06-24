/* 暑假上課時間 — public booking page (2026) */
(function () {
  const firebaseConfig = {
    apiKey: 'AIzaSyD1fQDneiwkGhbMOUxpOzVxZi8EIkourAs',
    authDomain: 'alan-s-english-class.firebaseapp.com',
    projectId: 'alan-s-english-class',
    storageBucket: 'alan-s-english-class.firebasestorage.app',
    messagingSenderId: '113180818799',
    appId: '1:113180818799:web:fff201f706d5c90b5f3c9a',
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const SLOTS = 'summerSlots2026';
  const BOOKINGS = 'summerBookings2026';
  const ADMIN_EMAIL = 'alan07050445@gmail.com';
  const TIMES = [
    ['10:00', '12:00'], ['13:00', '15:00'], ['15:00', '17:00'], ['17:00', '19:00'],
  ];
  const CLOSED = new Set(['2026-07-09', '2026-07-10']);
  const state = { month: 6, booked: new Set(), selectedDate: null, selectedTime: null };
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const keyFor = (date, start) => `${date}-${start.replace(':', '')}`;
  const dateText = date => {
    const d = new Date(`${date}T12:00:00`);
    return `${d.getMonth() + 1} 月 ${d.getDate()} 日（${'日一二三四五六'[d.getDay()]}）`;
  };
  const eligibleDates = () => {
    const dates = [];
    for (let d = new Date('2026-07-01T12:00:00'); d <= new Date('2026-08-31T12:00:00'); d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (d.getDay() !== 0 && d.getDay() !== 6 && !CLOSED.has(key)) dates.push(key);
    }
    return dates;
  };
  const updateSteps = step => {
    [['step-two', step >= 2], ['step-three', step >= 3]].forEach(([id, active]) => $(id).classList.toggle('active', active));
  };
  const isDateFull = date => TIMES.every(([start]) => state.booked.has(keyFor(date, start)));
  const renderCalendar = () => {
    const year = 2026, month = state.month;
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const fragments = [];
    for (let i = 0; i < (first === 0 ? 6 : first - 1); i++) fragments.push('<div class="day-empty"></div>');
    for (let day = 1; day <= days; day++) {
      const date = `${year}-${pad(month + 1)}-${pad(day)}`;
      const closed = !eligibleDates().includes(date);
      const full = !closed && isDateFull(date);
      const selected = state.selectedDate === date;
      const classes = ['day', closed ? 'disabled closed' : '', full ? 'disabled full' : '', selected ? 'selected' : ''].filter(Boolean).join(' ');
      fragments.push(`<button type="button" class="${classes}" data-date="${date}" ${closed || full ? 'disabled' : ''}>${day}</button>`);
    }
    $('calendar').innerHTML = fragments.join('');
    $('calendar').querySelectorAll('.day:not(.disabled)').forEach(button => button.addEventListener('click', () => selectDate(button.dataset.date)));
  };
  const selectDate = date => {
    state.selectedDate = date;
    state.selectedTime = null;
    $('form-panel').hidden = true;
    $('times-panel').hidden = false;
    $('selected-date-label').textContent = `${dateText(date)} · 請選一個還有名額的時段`;
    $('time-slots').innerHTML = TIMES.map(([start, end]) => {
      const booked = state.booked.has(keyFor(date, start));
      return `<button type="button" class="time-slot" data-start="${start}" data-end="${end}" ${booked ? 'disabled' : ''}><span>${start} – ${end}</span><small>${booked ? '已被選走' : '可預約 →'}</small></button>`;
    }).join('');
    $('time-slots').querySelectorAll('.time-slot:not(:disabled)').forEach(button => button.addEventListener('click', () => selectTime(button.dataset.start, button.dataset.end)));
    updateSteps(2); renderCalendar(); $('times-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const selectTime = (start, end) => {
    state.selectedTime = { start, end };
    $('form-panel').hidden = false;
    $('chosen-slot').textContent = `你選擇的是：${dateText(state.selectedDate)} ${start} – ${end}`;
    updateSteps(3); $('form-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const showError = message => window.alert(message);
  const submitBooking = async event => {
    event.preventDefault();
    if (!state.selectedDate || !state.selectedTime) return;
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    const slotId = keyFor(state.selectedDate, state.selectedTime.start);
    const submit = $('submit-booking');
    submit.disabled = true; submit.textContent = '正在保留名額…';
    try {
      const slotRef = db.collection(SLOTS).doc(slotId);
      const bookingRef = db.collection(BOOKINGS).doc(slotId);
      await db.runTransaction(async transaction => {
        const slot = await transaction.get(slotRef);
        if (!slot.exists || slot.data().status !== 'open') throw new Error('這個時段剛剛被其他家長選走了');
        transaction.update(slotRef, { status: 'booked', bookedAt: firebase.firestore.FieldValue.serverTimestamp() });
        transaction.create(bookingRef, {
          slotId, date: state.selectedDate, start: state.selectedTime.start, end: state.selectedTime.end,
          studentName: values.studentName.trim(), grade: values.grade, parentName: values.parentName.trim(),
          contact: values.contact.trim(), lessonCount: values.lessonCount, notes: values.notes.trim(),
          status: 'confirmed', createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
      state.booked.add(slotId);
      $('times-panel').hidden = true; $('form-panel').hidden = true; $('success-panel').hidden = false;
      $('success-copy').textContent = `${dateText(state.selectedDate)} ${state.selectedTime.start} – ${state.selectedTime.end} 已成功保留。`;
      updateSteps(3); renderCalendar(); $('success-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      console.error(error);
      showError(error.message || '暫時無法完成預約，請稍後再試或直接聯絡 Alan 老師。');
      await loadSlots();
      if (state.selectedDate) selectDate(state.selectedDate);
    } finally { submit.disabled = false; submit.innerHTML = '確認保留這個時段 <span>→</span>'; }
  };
  const loadSlots = async () => {
    const snap = await db.collection(SLOTS).get();
    state.booked = new Set();
    snap.forEach(doc => { if (doc.data().status === 'booked') state.booked.add(doc.id); });
  };
  const setup = async () => {
    try {
      await loadSlots();
      $('loading').hidden = true; $('booking-app').hidden = false; renderCalendar();
      if (new URLSearchParams(window.location.search).has('admin')) $('admin-panel').hidden = false;
    } catch (error) {
      console.error(error);
      $('loading').innerHTML = '目前無法讀取時段，請稍後再試或直接聯絡 Alan 老師。';
    }
  };
  const signInAsAdmin = async () => {
    const login = $('admin-login');
    login.disabled = true; login.textContent = '正在登入…';
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await firebase.auth().signInWithPopup(provider);
      if (result.user.email !== ADMIN_EMAIL) {
        await firebase.auth().signOut();
        throw new Error('請使用 Alan 的 Google 帳號登入。');
      }
      $('admin-copy').textContent = '已登入 Alan 管理帳號。按下按鈕即可建立尚未存在的開放時段；已被家長預約的時段不會被覆蓋。';
      login.hidden = true; $('seed-slots').hidden = false;
    } catch (error) {
      showError(error.message || '登入失敗，請再試一次。');
      login.disabled = false; login.textContent = '以 Alan 帳號登入';
    }
  };
  const seedSlots = async () => {
    const button = $('seed-slots');
    button.disabled = true; button.textContent = '正在建立時段…';
    try {
      const existing = await db.collection(SLOTS).get();
      const existingIds = new Set(existing.docs.map(doc => doc.id));
      const batch = db.batch();
      let created = 0;
      eligibleDates().forEach(date => TIMES.forEach(([start, end]) => {
        const id = keyFor(date, start);
        if (!existingIds.has(id)) {
          batch.set(db.collection(SLOTS).doc(id), {
            slotId: id, date, start, end, status: 'open', createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          created++;
        }
      }));
      if (created) await batch.commit();
      await loadSlots(); renderCalendar();
      $('admin-copy').textContent = created ? `完成：已建立 ${created} 個開放時段。現在家長可以開始選課。` : '所有暑假時段都已建立完成。';
      button.textContent = '時段已建立完成';
    } catch (error) {
      console.error(error);
      showError(error.message || '建立時段失敗，請確認 Firestore 規則已部署。');
      button.disabled = false; button.textContent = '再試一次';
    }
  };
  document.querySelectorAll('.month-tab').forEach(button => button.addEventListener('click', () => {
    state.month = Number(button.dataset.month);
    document.querySelectorAll('.month-tab').forEach(tab => { const selected = tab === button; tab.classList.toggle('active', selected); tab.setAttribute('aria-selected', selected); });
    renderCalendar();
  }));
  $('change-date').addEventListener('click', () => { $('times-panel').hidden = true; $('form-panel').hidden = true; state.selectedDate = null; updateSteps(1); renderCalendar(); });
  $('change-time').addEventListener('click', () => { $('form-panel').hidden = true; updateSteps(2); });
  $('booking-form').addEventListener('submit', submitBooking);
  $('book-another').addEventListener('click', () => { $('success-panel').hidden = true; $('booking-form').reset(); state.selectedDate = null; state.selectedTime = null; updateSteps(1); renderCalendar(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('admin-login').addEventListener('click', signInAsAdmin);
  $('seed-slots').addEventListener('click', seedSlots);
  setup();
})();
