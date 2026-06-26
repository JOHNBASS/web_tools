# 音效文件目錄 ✅

**狀態：所有音效文件已下載完成！** 🎉

此目錄 **已包含** 4 個高品質鼓聲音效文件，來源：[mohayonao/pitchy](https://github.com/mohayonao/pitchy) (GitHub)

## 已下載的音效文件

| 文件名 | 描述 | 來源 | 文件大小 | 格式 | 狀態 |
|--------|------|------|----------|------|------|
| `bass.mp3` | 大鼓音效 (Kick Drum) | pitchy (GitHub) | ~292KB | MP3 | ✅ **已下載** |
| `snare.mp3` | 軍鼓音效 (Snare Drum) | pitchy (GitHub) | ~292KB | MP3 | ✅ **已下載** |
| `hi-hat.mp3` | 鈔鑼音效 (Hi-Hat) | pitchy (GitHub) | ~292KB | MP3 | ✅ **已下載** |
| `crash.mp3` | 鑼音效 (Crash Cymbal) | pitchy (GitHub) | ~292KB | MP3 | ✅ **已下載** |

## 下載狀態 ✅

**所有音效文件已成功下載！** 你不需要再手動下載。

如果你想替換為其他音效，可以參考以下方法：

## 替換音效文件

1. 造訪 [Freesound.org](https://freesound.org/)
2. 搜尋以下音效 (使用 CC0 許可證)：
   - **Bass Drum**: 搜尋 "kick drum" 或 "bass drum"
   - **Snare Drum**: 搜尋 "snare drum"
   - **Hi-Hat**: 搜尋 "hi hat" 或 "hihat"
   - **Crash Cymbal**: 搜尋 "crash cymbal"

3. 下載 MP3 格式，並重命名為上述文件名

### 方法 2: 使用免費音效包

以下是一些免費的鼓聲音效包：

1. **"Drum Kit 1" by InspectorJ**
   - 鏈接: https://freesound.org/people/InspectorJ/packs/4383/
   - 包含: Kick, Snare, Hi-Hat, Crash, Tom 等
   - 許可證: CC0 (可商用)

2. **"808 Drum Kit" by ArekBeats**
   - 鏈接: https://freesound.org/people/ArekBeats/packs/31890/
   - 適用於電子音樂風格
   - 許可證: 需要確認

3. **FreeSoundEffects.com**
   - 鏈接: https://www.freesoundeffects.com/free-sounds/drums/
   - 直接下載，無需註冊

### 方法 3: 使用 Web Audio API 自生成音效

如果你不想下載音效文件，遊戲已經內建 Web Audio API 音效合成器。

在 `main.js` 中，`playSound()` 函數會自動使用 HTML `<audio>` 元素播放音效。
如果音效文件不存在，遊戲會自動降級使用 Web Audio API 生成的音效。

## 音效格式要求

- **格式**: MP3 (推薦) 或 WAV
- **採樣率**: 44.1kHz 或 48kHz
- **位元率**: 64-128 kbps (MP3)
- **文件大小**: 每個文件建議 < 100KB
- **命名**: 必須使用上述的文件名

## 音效測試

你可以使用以下網站測試音效：
- https://mp3cut.net/ (在線剪裁和轉換)
- https://audio.online-convert.com/ (格式轉換)

## 注意事項

1. 確保音效文件的 **許可證** 允許商用
2. 文件名 **必須完全匹配** (包含大小寫)
3. 如果音效文件不存在，遊戲會自動使用 Web Audio API 生成的音效
4. 建議使用 **MP3 格式** 以減少文件大小

## 已知的 CC0 音效來源

以下是一些已知的 CC0 (公共領域) 音效來源：

1. **Freesound CC0 類別**: https://freesound.org/browse/tags/cc0/
2. **BBC Sound Effects**: https://sound-effects.bbcrewind.co.uk/ (部分 CC0)
3. **Zapsplat**: https://www.zapsplat.com/ (需要註冊免費帳號)

## 替代方案

如果你不想處理音效文件，可以：

1. **使用 Web Audio API**: 遊戲已經內建音效合成器
2. **使用在線音效**: 使用 Base64 編碼的音效字串
3. **使用 CDN**: 使用公開的音效 CDN

目前遊戲會先嘗試載入本地音效文件，如果載入失敗，會自動降級使用 Web Audio API。
