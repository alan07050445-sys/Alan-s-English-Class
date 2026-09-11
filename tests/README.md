# tests

純 Node 腳本，**不會**被網站載入（GitHub Pages 只送 index.html 指名的檔案）。
在專案根目錄執行：

```
node tests/t-line-bind.mjs       # LINE 家長綁定對話：78 項
node tests/t-line-webhook.mjs    # LINE webhook 從 HTTP 進來跑一遍：15 項
node tests/t-line-reminders.mjs  # 作業提醒照年級發（不會發到別班）：16 項
node tests/t-line-hw-layout.mjs  # 作業提醒的三區排版、Flex 訊息與發送頻率：50 項
node tests/t-line-chat.mjs       # 聊天室三件事的意圖判斷、新增/刪除孩子、禮貌回覆：64 項
node tests/t-line-v425.mjs       # 先回 200 再處理、回覆失敗改推播、剛綁定的家長補發、主動提醒不動自動紀錄：26 項
node tests/t-line-v426.mjs       # AI 看懂家長的話（含 AI 掛掉/太慢的退路）、快取與背景更新、輸入中動畫、主動提醒挑對象
node tests/t-line-v427.mjs       # 關鍵字秒回（請假/調課/批改→請私訊老師本人）、AI 每次都回但範圍寫死＋一天上限、快速按鈕
node tests/t-grammar-notes.mjs   # ✏️ 出文法：驗證器、答案比對、長作業拆段同時讀、選擇題交叉檢查、Choose the correct answer：117 項
```

九支都不連網路（AI 也是假的）：Workers KV 用記憶體假的，Firestore 與 LINE API 的呼叫都被攔下來檢查內容（Flex Message 的結構也自己驗一遍，\nLINE 收到不合法的 JSON 會直接回 400）。
