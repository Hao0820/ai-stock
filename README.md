# 📈 AI Stock | 專業級 AI 股票戰術指揮中心

這是一款結合 **Google Gemini 1.5/2.0**、**OpenAI GPT-4o**、**Claude 3.5** 與 **DeepSeek** 頂尖模型的 AI 股票數據分析應用程式。專為重視技術分析與趨勢判斷的投資者設計，提供精確的進/出場建議與深度新聞情緒分析。

## ✨ 核心特色
- **三時段分層戰術規劃 (Strategic Timelines)**：獨家實作 **「短線、中線、長線」** 三階段策略。AI 自動生成針對不同持股週期的「進場區間、勝率預測、精準止損參考、目標價位」。
- **高韌性數據補救系統 (AI Research Fallback)**：即便 Yahoo Finance API 因 401/429 限制無法提供財報，系統也會自動啟動 **AI 聯網搜尋與專業推論模式**，確保分析報告內容始終完整且專業，不留空白。
- **100% 離線快照還原 (Offline Snapshots)**：透過 **IndexedDB** 實作。從歷史紀錄點入時，系統會還原分析當時的「股價、K 線指標、AI 研判內容」，**零網路請求**，不僅讀取極速，更能規避 API 被擋的風險。
- **行動端 UI 深度優化 (Mobile-First Excellence)**：針對手機版面進行字體收縮、自動置頂、與 K 線圖表適配優化，確保在小螢幕上資訊依然清晰、不被截斷。
- **AI 解析自動修復 (JSON Auto-Healing)**：內建強大的 Regex 修復邏輯，能自動修補 AI 回傳時可能出現的 JSON 格式錯誤或截斷缺失，大幅提升分析成功率。
- **專業級量化 UI**：內建 RSI、KD、MACD、布林通道等專業技術指標，搭配「戰術側邊欄」與「情緒圖表」，提供極致穩定的終端體驗。
- **多國語系 (i18n)**：完美適配 **繁體中文 (`zh-TW`)** 與 **英文 (`en-US`)**。

## 🛠️ 技術棧
- **Frontend**: React 19 + TypeScript + Vite 6
- **Styling**: **Tailwind CSS 4** + Framer Motion 12
- **Charting**: Lightweight Charts (Canvas Based)
- **Database**: IndexedDB (Local Snapshot Persistence)
- **Proxy**: Vite Proxy Middleware (Handling Yahoo/OpenAI/Gemini CORS)

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
    在 **Onboarding 頁面** 直接輸入您的 API Key。支援：
    - Gemini (Google AI Studio)
    - ChatGPT (OpenAI)
    - Claude (Anthropic)
    - DeepSeek AI

## 📂 專案結構
- `src/api/`：AI 模型驅動 (`ai.ts`) 與數據抓取與韌性處理 (`yahoo.ts`)。
- `src/pages/`：包含「戰術詳情頁 (`DetailScreen`)」與「搜尋/趨勢頁」。
- `src/utils/`：技術指標運算、IndexedDB 管理與 API 代理配置。
- `src/locales/`：專業多國語系文件（精確區分 Sentiment 與 Trading Strategy）。

## 🌐 部署
本專案已優化 **Vercel** 與各主流平台部署。只需推送代碼至 GitHub 並連結您的雲端服務，即刻擁有個人專屬的 AI 股票分析指揮中心。
