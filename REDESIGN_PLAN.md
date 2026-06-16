# 專業化改造計畫（Duolingo 等級的教學平台）

> 目標：從「做題網站」升級為「以學習者為中心的教學平台」。
> 核心結構維持：每週進度 + 五大分類（單字 / 文法 / Reading Comprehension / Opinion Essay / Word Study）。
> 後端維持 Firebase + 靜態（不重寫——對此規模是正確架構）。

## 設計原則
- **學習者為中心**：打開先看到「你」（連勝、等級、下一步），不是內容方塊。
- **旅程感**：週次以路徑呈現，看得到走到哪、下一步是什麼。
- **一個明確的下一步**：永遠有醒目的「繼續學習」。
- **溫暖編輯風 × 兒童活力**：奶油紙張 + 襯線標題（家長覺得專業）＋ 分類色彩 + 觸感動效（小孩覺得有趣）。

## 進度

### ✅ 已完成
- 刪除 Phase A（AI 自動出題 / 學生端 AI 解說）—— 老師自行出題與詳解。
- **學習旅程首頁 v1**（v123）：
  - `components-home.jsx` → `LearnHero`（問候 + 等級環 + 連勝 + XP + 錯題入口 + 繼續學習）、`WeekJourney`（水平週次路徑）。
  - `styles-home.css`。
  - 接進 `app.jsx` 首頁（非編輯模式）。

### ⏳ 下一步（依序）
1. **五大分類標準化**：目前各年級為 vocab/grammar/word/reading 四類；新增 `essay`（Opinion Essay）為第五類。
   - 改：data.js / data-g2 / g4 / g5 / g6 的 `CATEGORIES` + seed weeks `items`。
   - 改：`CAT_ICONS`、`CAT_BG`（quiz-mode）、`styles-theme.css` 的 nth-of-type 顏色（補第 5 色）。
   - 分類顯示名建議：外師單字 / 文法 / 閱讀理解 / 意見寫作 / 字根字首。
2. **週次橫幅減重**：首頁有 Hero + Journey 後，QuizModeBlocks 內的大標題橫幅可改成輕量的「本週主題」帶狀，避免三重週次標題。
3. **分類進入頁（CategoryView）打磨**：側欄 + 單元卡再設計，做成「技能關卡」感。
4. **測驗結算頁**：強化慶祝感（紙花、進步對比、connection 到下一個技能）。
5. **空狀態 / 載入骨架**：目前內容清空時頁面偏空，補上引導式空狀態與 skeleton。
6. **行動版**：Hero / Journey 已做 RWD，待真機微調。

## 版本控制慣例（沿用）
- 改檔 → `index.html` 全部 `?v=` +1、`sw.js` cache 版本同步、新檔掛進兩處。
- 預覽鏡像：`rsync -a --delete --exclude .git ./ /Users/hoyo/.alan-preview/`（preview server 跑在此鏡像）。
