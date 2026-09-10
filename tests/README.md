# tests

純 Node 腳本，**不會**被網站載入（GitHub Pages 只送 index.html 指名的檔案）。
在專案根目錄執行：

```
node tests/t-line-bind.mjs       # LINE 家長綁定對話：78 項
node tests/t-line-webhook.mjs    # LINE webhook 從 HTTP 進來跑一遍：15 項
node tests/t-line-reminders.mjs  # 作業提醒照年級發（不會發到別班）：15 項
node tests/t-line-hw-layout.mjs  # 作業提醒的三區排版與發送頻率：30 項
```

四支都不連網路：Workers KV 用記憶體假的，Firestore 與 LINE API 的呼叫都被攔下來檢查內容。
