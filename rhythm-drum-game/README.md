# 🥁 节奏打鼓 - Air Drum Master

> **揮手擊鼓，節奏賺錢！**
> 
> 純 Web 前端的音樂節奏遊戲，支援 **攝像頭手勢控制** 和 **觸控控制**，適合手機和桌面瀏覽器。

---

## 🎮 遊戲介紹

**节奏打鼓** 是一個結合 **節奏遊戲** 和 **放置遊戲** 的創新 Web 遊戲。玩家可以：

- 🎵 **跟隨鼓譜敲鼓**：用攝像頭捕捉手勢或觸控按鈕來敲擊不同的鼓
- 💰 **自動賺錢**：即使不敲鼓，樂團成員也會自動演奏賺取金幣
- 📈 **解鎖更多**：累積分數解鎖新歌曲和鼓手
- 📱 **跨平台**：支援桌面和手機瀏覽器

### 核心玩法
1. **手勢控制**：用攝像頭捕捉手勢敲鼓
   - 單手向下揮 → 軍鼓 (🪘)
   - 雙手同時敲擊 → 大鼓 (🥁)
   - 快速左右揮手 → 鈔鑼 (📛)
   - 雙手上舉 → 鑼 (🎔)

2. **觸控控制**：手機上使用屏幕底部的觸控按鈕

3. **節奏判定**：
   - ✅ **Perfect** (±50ms): 3x 分數 + Combo
   - ⚡ **Good** (±100ms): 1.5x 分數 + 0.5 Combo
   - ⚠️ **Bad** (±150ms): 0.5x 分數，Combo 歸零
   - ❌ **Miss** (>150ms): 0 分數，Combo 歸零

4. **放置機制**：觀眾會自動增加，分數轉換為金幣

---

## 🚀 快速開始

### 方法 1: 本地運行 (推薦)

1. **複製專案**
   ```bash
   git clone <專案鏈接>  # 如果有 Git 倉庫
   # 或直接下載 ZIP 文件
   ```

2. **安裝依賴 (可選)**
   此專案使用純 HTML/CSS/JS，無需安裝任何依賴。

3. **添加音效文件**
   參考 [音效文件目錄](assets/sounds/README.md) 下載或生成音效文件。
   
   或者，遊戲會自動使用 **Web Audio API** 生成音效（無需下載）。

4. **開啟瀏覽器**
   - 使用 VS Code 的 Live Server 擴展
   - 或者直接打開 `index.html` (部分功能可能受限)
   - 推薦使用 **本地伺服器** (例如 `python -m http.server 8000`)

5. **允許攝像頭權限**
   遊戲會要求攝像頭權限，請允許以獲得最佳體驗。

### 方法 2: 線上部署

1. **部署到 Netlify** (推薦，免費)
   ```bash
   # 安裝 Netlify CLI
   npm install -g netlify-cli
   
   # 部署
   netlify deploy --prod
   ```

2. **部署到 Vercel**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

3. **部署到 GitHub Pages**
   - 創建 GitHub 倉庫
   - 將專案推送到倉庫
   - 開啟 GitHub Pages 設定

---

## 📁 專案結構

```
rhythm-drum-game/
├── index.html                    # 主 HTML 文件
├── style.css                     # 主 CSS 文件 (RWD 設計)
├── main.js                       # 主 JavaScript 文件
├── README.md                     # 專案說明 (此文件)
├── 需求與技術文件.md              # 詳細的需求和技術文件
├── assets/                       # 靜態資源
│   ├── sounds/                   # 音效文件
│   │   ├── bass.mp3              # 大鼓音效
│   │   ├── snare.mp3             # 軍鼓音效
│   │   ├── hi-hat.mp3            # 鈔鑼音效
│   │   └── crash.mp3             # 鑼音效
│   │   └── README.md            # 音效文件說明
│   └── images/                   # 圖片资源 (可選)
└── charts/                       # 鼓譜文件
    ├── easy/                     # 簡單難度
    │   └── happy-birthday.json    # 預設歌曲
    ├── normal/                   # 普通難度
    └── hard/                     # 困難難度
```

---

## 🛠️ 技術棧

| 功能 | 技術 | 說明 |
|------|------|------|
| **前端** | HTML5 + CSS3 + JavaScript (ES6+) | 純前端實現 |
| **手勢識別** | MediaPipe Hands (CDN) | 精準的手勢追踪 |
| **攝像頭** | MediaDevices API | 瀏覽器原生攝像頭 API |
| **音效** | HTML5 Audio + Web Audio API | 支援音效文件和合成音效 |
| **動畫** | CSS Animations + Canvas | 流暢的動畫效果 |
| **存檔** | localStorage | 瀏覽器本地存檔 |
| **RWD** | Flexbox + CSS Grid | 完整響應式設計 |
| **部署** | Netlify / Vercel / GitHub Pages | 免費部署 |

### 主要功能模組

1. **攝像頭捕捉** (`CameraHandler`)
   - 使用 `navigator.mediaDevices.getUserMedia()`
   - 支援前置/後置攝像頭
   - 自動降級到觸控控制

2. **手勢識別** (`Gesture Detection`)
   - 使用 MediaPipe Hands (Google 官方)
   - 識別 4 種鼓聲手勢
   - 可自定義手勢邏輯

3. **鼓譜系統** (`Drum Chart`)
   - JSON 格式的鼓譜文件
   - 支援自動生成鼓譜
   - 可視化鼓譜顯示

4. **節奏判定** (`Rhythm Judge`)
   - 精確的時間判定 (毫秒級)
   - 支援多種難度
   - Combo 系統

5. **放置機制** (`Idle System`)
   - 自動賺取金幣
   - 觀眾系統
   - 離線收益

6. **音效系統** (`Audio System`)
   - HTML5 Audio 元素
   - Web Audio API 合成音效 (備用)
   - 音量控制

7. **RWD 設計** (`Responsive Design`)
   - 手機/平板/桌面全支援
   - 觸控控制 (手機專用)
   - 自適應布局

---

## 🎯 遊戲功能

### ✅ 已實現的功能

- [x] **攝像頭手勢控制** (MediaPipe Hands)
- [x] **觸控控制** (手機備選)
- [x] **鍵盤控制** (桌面備選: A/S/D/F)
- [x] **鼓譜系統** (JSON 格式)
- [x] **節奏判定** (4 級判定: Perfect/Good/Bad/Miss)
- [x] **Combo 系統** (連擊獎勵)
- [x] **分數系統** (基礎分數 + 判定倍率 + Combo 加成)
- [x] **放置機制** (自動賺錢)
- [x] **觀眾系統** (觀眾數量影響收益)
- [x] **RWD 設計** (手機/桌面全支援)
- [x] **存檔系統** (localStorage)
- [x] **音量控制**
- [x] **難度設定** (簡單/普通/困難)
- [x] **振動反饋** (手機振動)
- [x] **遊戲選單** (開始/說明/設定)
- [x] **暫停/繼續**
- [x] **重新開始**

### 🚧 待實現的功能 (可選)

- [ ] **更多歌曲** (需要添加鼓譜 JSON 文件)
- [ ] **樂團系統** (雇傭新鼓手)
- [ ] **場地升級**
- [ ] **技能系統**
- [ ] **道具系統**
- [ ] **錄製分享** (MediaRecorder API)
- [ ] **排行榜** (需要後端)
- [ ] **成就系統**
- [ ] **鼓譜編輯器** (可視化編輯)
- [ ] **多語言支援**

---

## 📱 手機適配

### 觸控控制
- 在手機上，如果攝像頭權限被拒絕或未啟用，遊戲會自動顯示 **觸控按鈕**
- 4 個圓形按鈕分別對應 4 種鼓聲
- 支援手勢和觸控雙重控制

### 手機優化
- **攝像頭**: 使用前置攝像頭，降低解析度 (640x480 @15fps)
- **性能**: 使用 MediaPipe 輕量模型 (`modelComplexity: 0`)
- **音效**: 預載音效文件，限制同時播放數量
- **振動**: 支援 Vibration API (可選)

### 瀏覽器兼容性

| 瀏覽器 | 支援狀況 | 備註 |
|--------|----------|------|
| Chrome (桌面) | ✅ 完美支援 | 所有功能正常 |
| Firefox (桌面) | ✅ 完美支援 | 所有功能正常 |
| Safari (桌面) | ✅ 大部分支援 | 攝像頭需要 HTTPS |
| Chrome (手機) | ✅ 完美支援 | 所有功能正常 |
| Safari (手機) | ✅ 大部分支援 | 攝像頭需要 HTTPS |
| iOS WebView | ⚠️ 部分支援 | 需要測試 |

---

## 🎵 音效文件

遊戲需要 4 個鼓聲音效文件：

| 文件名 | 描述 | 來源 |
|--------|------|------|
| `bass.mp3` | 大鼓音效 | [Freesound](https://freesound.org/) |
| `snare.mp3` | 軍鼓音效 | [Freesound](https://freesound.org/) |
| `hi-hat.mp3` | 鈔鑼音效 | [Freesound](https://freesound.org/) |
| `crash.mp3` | 鑼音效 | [Freesound](https://freesound.org/) |

**注意**：如果音效文件不存在，遊戲會自動使用 **Web Audio API** 生成的音效。

參考 [音效文件目錄](assets/sounds/README.md) 獲取更多音效下載資訊。

---

## 🎮 鼓譜編輯

### 鼓譜格式 (JSON)

```json
{
  "title": "歌曲名稱",
  "artist": "藝人",
  "bpm": 120,
  "difficulty": "easy",
  "duration": 30,
  "notes": [
    {"time": 0.5, "type": "snare", "lane": 1},
    {"time": 1.0, "type": "bass", "lane": 0},
    {"time": 1.5, "type": "hi-hat", "lane": 2},
    {"time": 2.0, "type": "crash", "lane": 3}
  ]
}
```

### 字段說明

| 字段 | 類型 | 描述 |
|------|------|------|
| `title` | string | 歌曲名稱 |
| `artist` | string | 藝人 (可選) |
| `bpm` | number | 每分鐘節拍數 |
| `difficulty` | string | 隊度 (easy/normal/hard) |
| `duration` | number | 歌曲時長 (秒) |
| `notes` | array | 音符陣列 |
| `notes[].time` | number | 音符出現時間 (秒) |
| `notes[].type` | string | 音符類型 (bass/snare/hi-hat/crash) |
| `notes[].lane` | number | 鼓譜線道 (0=大鼓, 1=軍鼓, 2=鈔鑼, 3=鑼) |

### 添加新歌曲

1. 在 `charts/<difficulty>/` 目錄下創建新的 JSON 文件
2. 確保文件名只包含小寫字母、數字和連字號
3. 在遊戲中選擇該難度即可使用

---

## ⚙️ 設定

遊戲提供以下設定：

| 設定 | 描述 | 默認值 |
|------|------|--------|
| **遊戲難度** | 判定窗口大小 | 普通 |
| **音量** | 音效音量 (0-100%) | 80% |
| **使用攝像頭** | 是否啟用攝像頭控制 | ✅ 啟用 |
| **手機振動** | 是否啟用振動反饋 | ❌ 關閉 |

---

## 💾 存檔

遊戲使用 `localStorage` 儲存以下資料：

- 金幣數量
- 最高 Combo
- 觀眾上限
- 鼓手資料
- 遊戲設定 (難度、音量等)

**注意**：
- 存檔儲存在瀏覽器本地，清除瀏覽器數據會導致存檔消失
- 不同瀏覽器的存檔不共享
- 如果需要雲端存檔，需要後端支援

---

## 🐛 已知問題

1. **iOS Safari 攝像頭問題**
   - 需要 HTTPS 協定才能使用攝像頭
   - 在本地開發時，需要使用本地伺服器 (例如 `python -m http.server`)

2. **音效文件加載失敗**
   - 如果音效文件不存在，遊戲會自動使用 Web Audio API 生成的音效
   - 可以檢查瀏覽器控制台獲取詳細錯誤訊息

3. **手勢識別不準確**
   - MediaPipe Hands 在不同光線環境下識別效果可能不同
   - 建議在光線充足的環境下遊戲
   - 可以調整 `minDetectionConfidence` 和 `minTrackingConfidence` 參數

4. **手機性能問題**
   - 在低端手機上，MediaPipe Hands 可能會卡頓
   - 可以嘗試使用更輕量的模型或關閉攝像頭

5. **觸控控制延遲**
   - 在部分手機上，觸控事件可能會有輕微延遲
   - 可以嘗試使用攝像頭控制獲得更好的體驗

---

## 🤝 貢獻

歡迎貢獻此專案！

### 如何貢獻

1. Fork 此專案
2. 創建新的分支 (`git checkout -b feature/your-feature`)
3. 提交變更 (`git commit -m 'Add some feature'`)
4. 推送到分支 (`git push origin feature/your-feature`)
5. 創建 Pull Request

###貢獻方向

- 添加新的歌曲鼓譜
- 改進手勢識別算法
- 修復 Bug
- 改進 UI/UX
- 添加新功能 (樂團系統、排行榜等)
- 翻譯文檔

---

## 📜 許可證

此專案目前 **未指定許可證**，你可以自由使用、修改和分發。

如果你想商用此專案，建議：
1. 確認音效文件的許可證
2. 添加合適的開源許可證 (例如 MIT)
3. 保留原作者信息

---

## 📞 聯繫方式

如果你有任何問題或建議，歡迎：
- 創建 GitHub Issue
- 發送 Email
- 在社交媒體上聯繫

---

## 🎉 鳴謝

- **MediaPipe**: 手勢識別技術支援
- **Freesound**: 免費音效資源
- **所有開源貢獻者**: 你們的奉獻讓此專案成為可能

---

**享受敲鼓的樂趣！🥁🎵**
