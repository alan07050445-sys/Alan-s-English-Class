# tests

純 Node 腳本，**不會**被網站載入（GitHub Pages 只送 index.html 指名的檔案）。
在專案根目錄執行：

```
node tests/t-line-bind.mjs      # LINE 家長綁定對話：74 項
node tests/t-line-webhook.mjs   # LINE webhook 從 HTTP 進來跑一遍：12 項
```

兩支都不連網路：Workers KV 用記憶體假的，LINE API 呼叫被攔下來檢查內容。
