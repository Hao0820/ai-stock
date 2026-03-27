# 📈 AI Stock | 專業級 AI 股票戰術指揮中心

這是一款結合 **Google Gemini 2.0**、**OpenAI** 與 **Claude** 頂尖模型的 AI 股票數據可視化應用程式。專為重視技術分析與趨勢判斷的投資者設計，提供精確的進/出場建議與深度新聞情緒分析。

## ✨ 核心特色
- **多模型 AI 戰術大腦**：自選 Gemini 2.0 Flash/Pro、GPT-4o 或 Claude 3.5。一鍵生成包含「建議進場、勝率、止損、獲利」的 **2x2 戰術位階佈局**。
- **新聞情緒深度分析**：整合「情緒圓餅圖」與「AI 解析摘要」，直觀呈現市場心理狀態。
- **高效能 K 線圖表**：採用 `lightweight-charts` (Canvas)，支撐流暢縮放。內建 MA5/20、EMA12/26、布林通道、RSI、KD、MACD 等專業指標。
- **數據持久化紀錄**：透過 **IndexedDB** 安全地在本地存儲您的每一筆歷史分析報告，並包含即時漲跌幅回顧。
- **免設定一鍵使用**：不再需要修改 `.env` 檔案。透過 **Onboarding 引導系統**，在瀏覽器介面直接配置 API 金鑰，實現真正零成本部署。
- **多國語系 (i18n)**：完美適配 **繁體中文 (`zh-TW`)** 與 **英文 (`en-US`)**。

## 🛠️ 技術棧
- **Frontend**: React 19 + TypeScript + Vite 6
- **Styling**: **Tailwind CSS 4** + Motion (Framer Motion 12)
- **Charting**: Lightweight Charts
- **Data Proxy**: 內建 Vercel Edge Proxy 配置，解決 Yahoo Finance CORS 限制。
- **Storage**: IndexedDB (Local persistence)

## 🚀 快速啟動

1.  **安裝依賴**：
    ```bash
    npm install
    ```
2.  **啟動開發環境**：
    ```bash
    npm run dev
    ```
3.  **配置 AI**：
    在點擊開始按鈕後的 **Onboarding 頁面** 直接輸入您的 API Key。支援：
    - Gemini (Google AI Studio)
    - ChatGPT (OpenAI)
    - Claude (Anthropic)

## 📂 專案結構
- `src/api/`：AI 模型互動 (`ai.ts`) 與數據代理抓取 (`yahoo.ts`)。
- `src/pages/`：包含戰術詳情頁 (`DetailScreen`) 與引導頁 (`OnboardingScreen`)。
- `src/components/`：模組化 UI 組件。
- `src/utils/`：技術指標運算與 IndexedDB 管理。
- `vercel.json`：雲端部署代理設定。

## 🌐 部署
本專案已完美優化 **Vercel** 部署：
1. 推送代碼至 GitHub。
2. 在 Vercel 導入專案（自動讀取 `vercel.json`）。
3. 即刻享受個人專屬的 AI 股票分析站。
