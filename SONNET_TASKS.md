# Alan's English Class — 開發任務指示書

> 這份文件寫給 AI 開發助手（Claude Sonnet）。請依照 Phase 順序執行，**一次只做一個 Phase**，
> 每個 Phase 做完先停下來讓 Alan 在瀏覽器測試確認，再進行下一個 Phase。

---

## 第〇部分：專案背景（開始任何工作前必讀）

### 產品是什麼
這是 Alan（英文家教）為康橋國小 3~6 年級學生做的教學網站。內容按「週」組織，
對齊學校老師的進度，每週有四大分類：外師單字（vocab）、文法（grammar）、
字根字首（word）、閱讀理解（reading）。學生登入 Google 帳號後做測驗、看單字卡，
進度存到 Firebase。Alan 用同一個網站的編輯模式維護內容。

### 技術架構（非常重要，不要違反）
- **沒有 build step、沒有 node_modules、沒有 package.json。** 純靜態檔案。
- React 18 UMD + `@babel/standalone` 在瀏覽器內即時編譯 JSX。
- 所有 `.jsx` 元件檔用 `<script type="text/babel">` 載入（見 `index.html`），
  元件之間透過 **`window.XXX` 全域變數** 互相引用，不能用 `import`/`export`。
- 每支 script/css 用 `?v=115` 這種查詢字串做 cache busting。
  **修改任何檔案後，把 `index.html` 裡所有 `?v=` 的數字 +1**（全檔統一同一個數字），
  並同步更新 `sw.js` 裡的 cache 版本字串（打開 sw.js 看現有寫法照做）。
- UI 文字以繁體中文為主、英文為輔（現有寫法是 title / titleZh 並存，照這個慣例）。
- 後端是 Firebase（compat SDK v9）：Firestore + Auth + Storage，初始化在 `data.js` 開頭。
- 老師（管理者）判斷：`data.js` 裡 `ADMIN_EMAILS = ['alan07050445@gmail.com']`，
  Firestore 規則（`firestore.rules`）也用同一個 email 做後端驗證。

### 檔案地圖
| 檔案 | 內容 |
|---|---|
| `index.html` | 唯一的 HTML，載入所有 script/css |
| `app.jsx` | 頂層 state、年級切換（g2/g3/g5）、auth、gamification 邏輯 |
| `data.js` | Firebase 初始化、G3 課程資料、所有 Firestore 讀寫 helper、BADGES 定義 |
| `data-g2.js` / `data-g5.js` | G2 / G5 的課程資料與對應 helper（命名加 G2/G5 後綴） |
| `components-shell.jsx` | 頁面外框、header、週選擇器、登入 UI |
| `components-quiz-mode.jsx` | 測驗模式（選擇題等），含 `saveQuizModeCompletion()` |
| `components-flashcard.jsx` | 單字卡，**已有 TTS**：檔案開頭有用 `speechSynthesis` 的 speak helper |
| `components-editor.jsx` | 老師的內容編輯器 |
| `components-dashboard.jsx` | 老師的班級報告儀表板（學生清單、完成率、錯題統計） |
| `components-quiz.jsx` / `components-cat.jsx` / `tweaks-panel.jsx` | 其他既有元件 |
| `styles*.css` | 各功能對應的樣式檔，新功能的 CSS 加在對應檔案或新開一支並掛進 index.html |
| `firestore.rules` / `storage.rules` | Firebase 安全規則 |

### Firestore 資料結構（現況，不要破壞）
- 課程內容：`class/data`（G3）、`class/data_g5`（G5）、`class-g2/data_g2`（G2）。
  內含 `weeks`（物件，key 是 weekId）與 `weekOrder`（陣列）。每週有 `label`、`dateRange`、
  `items: { vocab: [...], grammar: [...], word: [...], reading: [...] }`。
- 學生進度：`progress/{uid}`，欄位包含：
  - `name`、`email`、`updatedAt`
  - `items.{progressKey}` → `{ done, score, total, wrongQuestions: [{q, answer}], wrongCount, ... }`
    （progressKey 通常是 `weekId_itemId`，但歷史資料可能只有 `itemId`，
    `components-dashboard.jsx` 的 `isDone()` 有模糊比對邏輯可參考）
  - `xp`（數字）、`streak: { count, lastDate }`、`badges: { badgeId: timestamp }`
- 寫入進度的既有 helper：`data.js` 的 `saveProgressItem()`、`saveQuizMistakes()`、
  `awardXp()`、`unlockBadge()`；讀取全班：`subscribeAllStudents()`。

### 工作守則
1. **不要重構、不要改架構、不要引入 build tool。** 在現有模式內加功能。
2. 跟著現有程式碼的風格走（命名、註解語言、CSS 變數、視覺風格 — 米色紙張感 + 黑線條）。
3. 新元件掛到 `window`，新 script 加進 `index.html`（放在 `app.jsx` 之前）。
4. 每個 Phase 完成後：bump `?v=` 版本、更新 sw.js cache 版本、
   用瀏覽器打開 `index.html` 確認沒有 console error、列出你改了哪些檔案讓 Alan 測試。
5. 涉及 Firestore 結構新增時，只能**新增欄位/集合**，不能改既有欄位的意義。
6. `firestore.rules` 改了之後要提醒 Alan：「規則檔改了，需要到 Firebase Console
   或用 `firebase deploy --only firestore:rules` 部署才會生效。」

---

## Phase 1：家長週報（最高優先）

**目標**：Alan 在老師儀表板裡，對任一學生按一顆「產生週報」按鈕，
得到一份可以直接複製貼到 LINE 的文字週報 ＋ 一個漂亮的可分享網頁版報告。

### Step 1-1：報告資料彙整函式
在 `data.js` 新增 `buildWeeklyReport(student, weeks, weekOrder, { weekId })`：
- 輸入：一個學生的 progress 文件資料、課程資料、目標週（預設本週，
  用 `app.jsx` 已有的 `bestWeekIdx()` / `parseDateRange()` 邏輯判斷「本週」）。
- 輸出物件包含：
  - `weekLabel`、`dateRange`
  - `completed`: 該週已完成項目清單 `[{cat, title, score, total}]`
  - `pending`: 該週未完成項目清單
  - `weekVocab`: 該週 vocab 分類所有項目的標題（讓家長知道學了哪些單字主題）
  - `streak`、`xp`、本週新解鎖的 `badges`
  - `wrongQuestions`: 該週答錯的題目（最多 5 題，附正確答案）
  - `completionRate`: 完成百分比

### Step 1-2：LINE 文字版產生器
新增 `formatReportAsText(report, studentName)` → 回傳純文字字串，格式範例：

```
📚 Alan's English Class 學習週報
👦 王小明 ｜ Week 14（Mar 31 – Apr 6）

✅ 本週完成 6/8 項（75%）
⭐ 測驗平均：88 分
🔥 連續學習：5 天

本週學習內容：
• 外師單字：Unit 7 Animals
• 文法：過去式動詞
• 閱讀：The Lost Puppy

💪 建議加強（答錯的題目）：
• ran 的原形是 → run

— Alan 老師
```

欄位有資料才顯示該區塊，沒資料就略過整段（例如沒有錯題就不要出現「建議加強」）。

### Step 1-3：儀表板 UI
在 `components-dashboard.jsx` 的學生詳細頁加：
- 「📋 產生週報」按鈕 → 開 modal，內含：
  - 週次下拉選單（預設本週）
  - 報告預覽（網頁版排版，風格沿用現有米色卡片設計）
  - 「複製文字版」按鈕（`navigator.clipboard.writeText`，成功後按鈕短暫變成「已複製 ✓」）
- 另加「📋 產生全班週報」按鈕：一次產生所有學生的文字版，串接成一份
  （學生之間用分隔線），方便 Alan 一次貼給多個家長或逐段複製。

### Step 1-4：驗收標準
- 老師登入後，儀表板能對任一學生產生本週與歷史週的報告。
- 文字版貼到 LINE 排版不會亂（純文字 + emoji，無 markdown）。
- 學生該週零活動時，報告顯示「本週尚未開始學習」而不是空白或 NaN。
- 非老師帳號完全看不到此功能（沿用現有 dashboard 的權限判斷）。

---

## Phase 2：學生錯題本（我的錯題）

**目標**：學生（登入後）能看到自己累積的所有錯題，並可以把錯題當成一份測驗重新練習，答對後從錯題本移除。

### Step 2-1：資料讀取
資料已存在 `progress/{uid}` 的 `items.{key}.wrongQuestions`，不需要新 schema。
在 `data.js` 加 `collectWrongQuestions(progressData, weeks, weekOrder)`：
- 把所有 items 的 wrongQuestions 攤平成
  `[{ q, answer, itemId, itemTitle, weekLabel, cat }]`
- 透過 progressKey 反查週次與分類（參考 dashboard 的模糊比對邏輯）；
  反查不到的（內容已被刪的週次）標為「過往內容」仍保留顯示。
- 同題去重（q + answer 相同視為同一題）。

### Step 2-2：錯題本 UI
新檔案 `components-mistakes.jsx`（記得掛進 index.html）：
- 入口：學生登入後，header 或主畫面加「📕 我的錯題」按鈕，旁邊顯示錯題數 badge。
- 列表：按週次分組顯示，每題顯示題目與正確答案（答案預設遮住，點擊才顯示，
  鼓勵學生先回想）。
- 「開始重練」按鈕 → 進入重練模式。

### Step 2-3：錯題重練模式
- 把錯題轉成選擇題：正確答案 + 從該學生所有錯題答案池中隨機抽 3 個干擾選項
  （不足 3 個就從該週 vocab 內容抽）。
- 沿用 `components-quiz-mode.jsx` 的視覺風格與音效（可呼叫其既有的 tone/音效 helper）。
- **答對的題目**：從 Firestore 對應 item 的 `wrongQuestions` 陣列中移除該題
  （讀出陣列 → filter 掉 → 寫回，同步更新 `wrongCount`）。
- 全部答對時給予慶祝畫面 + XP 獎勵（呼叫既有 `awardXp()`，建議每題 5 XP）。
- 在 `data.js` 的 `BADGES` 加一個新徽章 `mistake_master`
  （🎯「錯題終結者」：清空一次錯題本）並在清空時呼叫 `unlockBadge()`。

### Step 2-4：驗收標準
- 未登入（訪客模式）看不到錯題本入口。
- 錯題答對後重新整理頁面，該題不再出現；老師儀表板的錯題統計同步減少。
- 零錯題時顯示友善的空狀態（「太棒了！目前沒有錯題 🎉」）。

---

## Phase 3：跨週累積複習（考前總複習）

**目標**：學生可以選一個週次範圍（例如 Week 10–14，對齊康橋定期評量範圍），系統把範圍內所有單字/題目混在一起出一份綜合測驗。

### Step 3-1：複習入口
主畫面（週次內容區上方或 header）加「🏆 總複習 Review」按鈕 → 開設定 modal：
- 起訖週次兩個下拉選單（預設：最近 4 週）
- 分類多選（預設只勾 vocab；grammar/word/reading 可加選）
- 題數選擇：10 / 20 / 全部

### Step 3-2：出題邏輯
新檔案 `components-review.jsx`：
- 從範圍內每週的選定分類收集可出題素材。**先檢查 `components-quiz-mode.jsx`
  既有的出題資料格式**（item 裡的題目欄位長怎樣），直接重用同樣的題型渲染元件，
  不要重寫一套答題 UI。
- 題目順序隨機、選項順序隨機；多週題目要交錯混排，不能一週一段。
- 結束畫面：分數、按週次統計的對錯分布（「Week 12 的單字錯最多」這種提示）、
  錯題自動寫入 Phase 2 的錯題本（呼叫 `saveQuizMistakes()`，
  itemId 用 `review_{起週}_{訖週}` 這種固定格式）。
- 完成給 XP（建議：答對一題 2 XP）。

### Step 3-3：驗收標準
- 選 Week 10–14 出 20 題，題目確實來自多個不同週次。
- 複習成績不會覆蓋或污染原本各週 item 的 done/score 進度。
- 範圍內沒有足夠素材時顯示提示，而不是出一份空測驗。

---

## Phase 4：聽力題型（聽音選字）

**目標**：在測驗中加入「聽音選字」題型 — 播放單字發音，學生從四個選項選出聽到的字。

### Step 4-1：抽取共用 TTS helper
`components-flashcard.jsx` 開頭已有 speechSynthesis 的 speak 函式。
把它搬到 `data.js`（或新檔 `lib-tts.js`）成為 `window.speakText(text, { rate, lang })`，
flashcard 改為呼叫共用版，行為不變。預設 `lang: 'en-US'`、語速稍慢（rate 0.9）。

### Step 4-2：聽力題型
在 `components-quiz-mode.jsx` 加新題型 `listening`：
- 題目區顯示一顆大的 🔊 播放按鈕（取代文字題目），可重複點擊重聽。
- 進入該題時自動播一次。
- 四個文字選項，答題流程、計分、錯題記錄沿用既有選擇題邏輯
  （錯題存入 wrongQuestions 時 `q` 存成 `🔊 聽音選字：{正確單字}` 以便錯題本能顯示）。
- 出題來源：vocab 類的單字內容，自動生成（正確字 + 3 個同週單字當干擾項）。

### Step 4-3：整合
- 在 Phase 3 的總複習設定 modal 加「包含聽力題」勾選框（預設勾選）。
- 在單字卡（flashcard）介面確認每張卡都有 🔊 按鈕（已有就不動）。
- 處理 iOS Safari 限制：speechSynthesis 需要使用者手勢觸發第一次播放，
  自動播放失敗時不要報錯，顯示「點 🔊 播放」提示即可。

### Step 4-4：驗收標準
- 在 iPhone Safari 與桌面 Chrome 都能發音。
- 聽力題答錯會進錯題本且顯示可讀。

---

## Phase 5：補齊 G4 / G6 年級

**目標**：年級選擇從 G2/G3/G5 擴充為 G2~G6 五個年級。

### Step 5-1：照既有模式複製
仔細閱讀 `data-g5.js`（它是最精簡的範本）與 `app.jsx` 裡 `_gradeOf()`、
年級切換、Firestore 訂閱的寫法，然後：
- 新增 `data-g4.js`、`data-g6.js`：Firestore 文件用 `class/data_g4`、`class/data_g6`，
  helper 命名加 G4/G6 後綴，seed 內容只放一個空白示範週。
- `app.jsx`：`_gradeOf()` 與所有 `{ g2, g5, g3 }` 的分支點全部擴充
  （全檔搜尋 `'g2'` 和 `g5` 找出每一處，一個都不能漏，包括 localStorage 初始化的三處）。
- 年級選擇 UI（搜尋現有 G2/G3/G5 切換按鈕的位置）加上 G4、G6。
- `index.html` 載入新 data 檔。
- `firestore.rules`：確認 `class/{docId}` 的規則已涵蓋 `data_g4`/`data_g6`
  （目前是整個 `class` collection 一條規則，應該已涵蓋，確認即可）。

### Step 5-2：驗收標準
- 五個年級都能切換，各自獨立載入/儲存內容，互不污染。
- 老師在 G4 編輯內容存檔後，重整頁面內容還在；切到 G3 不會看到 G4 的內容。
- 學生 progress 不分年級（維持現況單一 progress 文件），不要動。

---

## Phase 6：內容權限收緊（付費牆基礎）

**目標**：課程內容從「任何人可讀」改為「登入且在學生名單內才可讀」，為付費制鋪路。
**⚠️ 這個 Phase 會影響所有現有學生，動工前先跟 Alan 確認他已通知學生需要登入。**

### Step 6-1：學生名單機制
- Firestore 新增集合 `roster`：文件 ID 為學生 email（小寫），
  內容 `{ name, grade, active: true, addedAt }`。
- `components-dashboard.jsx` 加「學生名單管理」分頁：老師可新增（輸入 email + 姓名 + 年級）、
  停用（active: false）、刪除名單項目。

### Step 6-2：規則修改
`firestore.rules`：
- 抽一個 `function isTeacher()`（email == 老師 email）和
  `function isEnrolled()`（`exists(/databases/$(database)/documents/roster/$(request.auth.token.email))`
  且該文件 `active == true`；注意 email 要先轉小寫存）。
- `class/*`、`class-g2/*` 的 read 改為 `isTeacher() || isEnrolled()`。
- `roster`：只有老師可讀寫。
- 提醒 Alan 部署規則。

### Step 6-3：前端配合
- 訪客模式（不登入瀏覽）將失效：未登入或不在名單內時，
  顯示一個友善的鎖定頁（「請使用報名時的 Google 帳號登入；
  尚未報名請聯絡 Alan 老師」+ LINE 聯絡方式佔位文字，讓 Alan 自己填）。
- Firestore 讀取被拒時（permission-denied）要被 catch 並導向鎖定頁，不能白屏。
- localStorage 內快取的舊內容在未授權狀態下不可顯示。

### Step 6-4：驗收標準
- 名單內帳號登入 → 一切如常。名單外帳號 / 未登入 → 只看到鎖定頁。
- 老師帳號不在 roster 也能存取一切。
- 把某學生 active 改 false 後，該生下次載入即被鎖定。

---

## Phase 7（選做，最後）：遷移到 Vite 正式 build

只有在 Phase 1–6 都穩定後才考慮。目標：消除瀏覽器內 Babel 編譯，加快載入。
這是大工程：把 window 全域改成 ES modules、React 換 production build、
保留 PWA。**動工前先讓 Alan 確認，並開新的 git branch。** 此 Phase 不在此詳述，
屆時再規劃。

---

## 給每次工作階段的固定收尾清單
1. `index.html` 與 `sw.js` 版本號是否已 bump？
2. 新檔案是否已掛進 `index.html`？
3. 瀏覽器 console 是否乾淨（無紅字）？
4. 訪客模式、學生帳號、老師帳號三種身分是否都測過受影響的畫面？
5. 向 Alan 回報：改了哪些檔案、怎麼測試、有沒有需要他到 Firebase Console 操作的事。
