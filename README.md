# 📈 AI Stock Insight Dashboard

這是一款專為技術分析與趨勢判斷設計的 **AI 股票數據可視化應用程式**。旨在提供極致流暢的看盤體驗，並結合多項專業技術指標與多國語系支援。

## ✨ 核心特色
- **高效能 Canvas 渲染**：採用 `lightweight-charts` 技術，支援大數據量 K 線的縮放與拖曳，操作極其流暢。
- **全方位技術指標**：包含 MA(5/20)、EMA(12/26)、Bollinger Bands、RSI、KD、MACD，並支援連動游標顯示。
- **精準報價計算**：針對 Yahoo Finance API 進行數據清洗，精確計算「當日相比昨收」的漲跌幅數值。
- **多國語系支援 (i18n)**：完整支援 **繁體中文 (`zh-TW`)** 與 **英文 (`en-US`)**。
- **美型戰情室介面**：深色戰情室風格，專為高對比度、長時間看盤設計。

## 🛠️ 技術棧
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Charting**: Lightweight Charts (Canvas-based)
- **Data Source**: Yahoo Finance (Proxy)
- **AI Integration**: Gemini Pro Vision (準備串接)

## 🚀 快速啟動

1.  **安裝依賴**：
    ```bash
    npm install
    ```
2.  **設定環境變數**：
    在 `.env.local` 檔案中填入您的 `GEMINI_API_KEY`。
3.  **啟動開發環境**：
    ```bash
    npm run dev
    ```

## 📂 專案結構
- `src/api/`：API 請求與數據處理邏輯。
- `src/locales/`：多語系字典檔。
- `src/pages/`：主要頁面導向（主頁、詳細資訊頁）。
- `src/utils/`：技術指標計算演算法。
