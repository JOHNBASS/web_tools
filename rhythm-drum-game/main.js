/**
 * 节奏打鼓 - Air Drum Master
 * 主邏輯文件
 * 使用 MediaPipe Hands + Web Audio API
 */

// ============================================
// MediaPipe 載入檢查
// ============================================
// 確保 MediaPipe 已經載入完成
function checkMediaPipeLoaded() {
  return typeof Hands !== 'undefined' && typeof Camera !== 'undefined';
}

// 如果 MediaPipe 沒有載入，自動切換到觸控模式
if (!checkMediaPipeLoaded()) {
  console.warn('MediaPipe 未載入完成，將強制使用觸控模式');
  // 可以在此設定全局旗標，強制使用觸控
  window.mediaPipeAvailable = false;
} else {
  window.mediaPipeAvailable = true;
}

// ============================================
// 遊戲狀態
// ============================================
const gameState = {
  // 遊戲基本狀態
  score: 0,
  coins: 0,
  audience: 100,
  combo: 0,
  maxCombo: 0,
  isPlaying: false,
  isPaused: false,
  
  // 遊戲配置
  difficulty: 'normal',
  volume: 80,
  cameraEnabled: true,
  vibrationEnabled: false,
  
  // 遊戲資料
  currentChart: null,
  currentTime: 0,
  startTime: 0,
  lastUpdateTime: 0,
  lastInteractionTime: 0,
  
  //放置系統
  drummers: [{ type: 'street', level: 1, bonus: 1.0, autoEarn: 1 }],
  audienceLimit: 100,
  
  // 音樂相關
  bpm: 120,
  beatInterval: 500, // 以毫秒為單位
  
  //鼓譜相關
  notes: [],
  nextNoteIndex: 0,
  noteSpeed: 3
};

// ============================================
// DOM 元素
// ============================================
const elements = {
  // 容器
  menuContainer: document.getElementById('menuContainer'),
  gameContainer: document.getElementById('gameContainer'),
  howToPlayContainer: document.getElementById('howToPlayContainer'),
  settingsContainer: document.getElementById('settingsContainer'),
  
  // 遊戲 UI
  score: document.getElementById('score'),
  coins: document.getElementById('coins'),
  audience: document.getElementById('audience'),
  combo: document.getElementById('combo'),
  judgment: document.getElementById('judgment'),
  gestureHint: document.getElementById('gesture-hint'),
  cameraView: document.getElementById('camera-view'),
  drumChart: document.querySelector('.drum-chart'),
  handCanvas: document.getElementById('hand-canvas'),
  detectionStatus: document.getElementById('detectionStatus'),

  // 按鈕
  startGameBtn: document.getElementById('startGameBtn'),
  howToPlayBtn: document.getElementById('howToPlayBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  pauseBtn: document.getElementById('pause-btn'),
  restartBtn: document.getElementById('restart-btn'),
  backBtn: document.getElementById('back-btn'),
  backFromInstructions: document.getElementById('backFromInstructions'),
  saveSettings: document.getElementById('saveSettings'),
  backFromSettings: document.getElementById('backFromSettings'),
  
  // 觸控控制
  touchControls: document.getElementById('touchControls'),
  
  // 鼓譜
  lanes: [
    document.getElementById('lane-0'),
    document.getElementById('lane-1'),
    document.getElementById('lane-2'),
    document.getElementById('lane-3')
  ],
  
  // 音效
  sounds: {
    bass: document.getElementById('sound-bass'),
    snare: document.getElementById('sound-snare'),
    'hi-hat': document.getElementById('sound-hi-hat'),
    crash: document.getElementById('sound-crash')
  },
  
  // 設定
  difficultySelect: document.getElementById('difficulty'),
  volumeSlider: document.getElementById('volume'),
  volumeValue: document.getElementById('volume-value'),
  cameraEnabledCheckbox: document.getElementById('camera-enabled'),
  vibrationEnabledCheckbox: document.getElementById('vibration-enabled')
};

// ============================================
// 遊戲常數
// ============================================
const CONSTANTS = {
  DRUM_TYPES: ['bass', 'snare', 'hi-hat', 'crash'],
  DRUM_COLORS: ['#ff4444', '#4444ff', '#ffff44', '#ff44ff'],
  DRUM_EMOJIS: ['🥁', '🪘', '📛', '🎔'],
  DRUM_NAMES: ['大鼓', '軍鼓', '鈔鑼', '鑼'],
  JUDGE_WINDOWS: {
    easy: { perfect: 70, good: 140, bad: 210 },
    normal: { perfect: 50, good: 100, bad: 150 },
    hard: { perfect: 30, good: 60, bad: 100 }
  },
  NOTE_SPEED: 3, // 音符下落速度 (px/ms)
  LEAD_TIME: 2, // 音符從出現(頂端)到抵達判定線的秒數
  DEFAULT_SONGS: {
    easy: 'happy-birthday',
    normal: 'smells-like-teen-spirit',
    hard: 'uptown-funk'
  },
  STRIKE_DY: 0.045, // 揮擊偵測：手掌每幀向下位移門檻 (normalized)
  STRIKE_COOLDOWN: 200, // 兩次敲擊最短間隔 (ms)
  AUDIENCE_GROWTH: 0.1, // 觀眾每秒增加數
  AUDIENCE_DECAY: 0.2, // 觀眾每秒流失數 (無互動)
  OFFLINE_EARN_RATE: 0.5 // 離線收益倍率
};

// ============================================
// 手勢映射
// ============================================
const GESTURE_MAP = {
  'swipe_down': 'snare',     // 单手向下揮 (軍鼓)
  'clap': 'bass',            // 双手敲击 (大鼓)
  'swipe_left': 'hi-hat',    // 快速左右揮手 (鈔鑼)
  'swipe_right': 'hi-hat',   // 快速左右揮手 (鈔鑼)
  'hands_up': 'crash'        // 双手上举 (鑼)
};

// ============================================
// 手部骨架連線 (MediaPipe Hands 21 個關鍵點)
// ============================================
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],          // 拇指
  [0,5],[5,6],[6,7],[7,8],          // 食指
  [5,9],[9,10],[10,11],[11,12],     // 中指
  [9,13],[13,14],[14,15],[15,16],   // 無名指
  [13,17],[17,18],[18,19],[19,20],  // 小指
  [0,17]                            // 手掌底
];

let hitFlashTimer = null;

// 在攝像頭畫面上繪製偵測到的手部骨架，讓玩家確認手勢有被抓到
function drawHandLandmarks(landmarks) {
  const canvas = elements.handCanvas;
  if (!canvas) return;
  // 讓畫布內部解析度對齊顯示尺寸
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  if (!landmarks || landmarks.length === 0) return;

  // 連線
  ctx.strokeStyle = '#00ff66';
  ctx.lineWidth = 3;
  HAND_CONNECTIONS.forEach(([a, b]) => {
    const p1 = landmarks[a], p2 = landmarks[b];
    if (!p1 || !p2) return;
    ctx.beginPath();
    ctx.moveTo(p1.x * w, p1.y * h);
    ctx.lineTo(p2.x * w, p2.y * h);
    ctx.stroke();
  });

  // 關鍵點
  ctx.fillStyle = '#ff4444';
  landmarks.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function clearHandCanvas() {
  const canvas = elements.handCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 更新「是否偵測到手部」的狀態徽章
function setDetectionStatus(state, text) {
  const el = elements.detectionStatus;
  if (!el) return;
  el.className = 'detection-status' + (state ? ' ' + state : '');
  if (text !== undefined) el.textContent = text;
}

// ============================================
// MediaPipe 相關
// ============================================
let hands;
let cameraStream;
let camera;

// 揮擊偵測狀態 (動作式手勢)
const strikeState = { lastY: null, armed: false, lastHitTime: 0 };

// ============================================
// 初始化
// ============================================
async function init() {
  // 載入存檔
  loadGame();
  
  // 初始化 UI
  updateSettingsUI();
  
  // 初始化事件監聽
  initEventListeners();
  
  // 顯示選單
  showMenu();
  
  console.log('遊戲初始化完成！');
}

// ============================================
// 事件監聽
// ============================================
function initEventListeners() {
  // 選單按鈕
  elements.startGameBtn.addEventListener('click', startGame);
  elements.howToPlayBtn.addEventListener('click', showHowToPlay);
  elements.settingsBtn.addEventListener('click', showSettings);
  
  // 遊戲按鈕
  elements.pauseBtn.addEventListener('click', togglePause);
  elements.restartBtn.addEventListener('click', restartGame);
  elements.backBtn.addEventListener('click', backToMenu);
  
  // 如何遊戲按鈕
  elements.backFromInstructions.addEventListener('click', showMenu);
  
  // 設定按鈕
  elements.saveSettings.addEventListener('click', saveSettings);
  elements.backFromSettings.addEventListener('click', showMenu);
  
  // 設定變更
  elements.difficultySelect.addEventListener('change', () => {
    gameState.difficulty = elements.difficultySelect.value;
  });
  
  elements.volumeSlider.addEventListener('input', () => {
    gameState.volume = parseInt(elements.volumeSlider.value);
    elements.volumeValue.textContent = `${gameState.volume}%`;
    updateVolume();
  });
  
  elements.cameraEnabledCheckbox.addEventListener('change', () => {
    gameState.cameraEnabled = elements.cameraEnabledCheckbox.checked;
  });
  
  elements.vibrationEnabledCheckbox.addEventListener('change', () => {
    gameState.vibrationEnabled = elements.vibrationEnabledCheckbox.checked;
  });
  
  // 觸控控制
  initTouchControls();
  
  // 鍵盤控制 (桌面備選)
  document.addEventListener('keydown', handleKeyDown);
  
  // 任何互動都更新最後互動時間
  document.addEventListener('click', () => {
    if (gameState.isPlaying) {
      gameState.lastInteractionTime = Date.now();
    }
  });
}

// ============================================
// 觸控控制
// ============================================
function initTouchControls() {
  elements.touchControls.addEventListener('click', (e) => {
    const drumType = e.target.closest('[data-drum]')?.dataset.drum;
    if (drumType && gameState.isPlaying && !gameState.isPaused) {
      triggerDrum(drumType, Date.now());
      gameState.lastInteractionTime = Date.now();
    }
  });
}

// ============================================
// 鍵盤控制
// ============================================
function handleKeyDown(e) {
  if (!gameState.isPlaying || gameState.isPaused) return;
  
  const keyMap = {
    'a': 'bass',
    's': 'snare',
    'd': 'hi-hat',
    'f': 'crash',
    ' ': 'bass' // 空格鍵 = 大鼓
  };
  
  const drumType = keyMap[e.key];
  if (drumType) {
    triggerDrum(drumType, Date.now());
    gameState.lastInteractionTime = Date.now();
  }
  
  // ESC 鍵返回選單
  if (e.key === 'Escape' && gameState.isPlaying) {
    backToMenu();
  }
}

// ============================================
// UI 顯示控制
// ============================================
function showMenu() {
  elements.menuContainer.style.display = 'flex';
  elements.gameContainer.style.display = 'none';
  elements.howToPlayContainer.style.display = 'none';
  elements.settingsContainer.style.display = 'none';
  
  // 停止遊戲
  if (gameState.isPlaying) {
    endGame();
  }
}

function showHowToPlay() {
  elements.menuContainer.style.display = 'none';
  elements.gameContainer.style.display = 'none';
  elements.howToPlayContainer.style.display = 'flex';
  elements.settingsContainer.style.display = 'none';
}

function showSettings() {
  elements.menuContainer.style.display = 'none';
  elements.gameContainer.style.display = 'none';
  elements.howToPlayContainer.style.display = 'none';
  elements.settingsContainer.style.display = 'flex';
}

function showGame() {
  elements.menuContainer.style.display = 'none';
  elements.gameContainer.style.display = 'flex';
  elements.howToPlayContainer.style.display = 'none';
  elements.settingsContainer.style.display = 'none';
}

// ============================================
// 更新設定 UI
// ============================================
function updateSettingsUI() {
  elements.difficultySelect.value = gameState.difficulty;
  elements.volumeSlider.value = gameState.volume;
  elements.volumeValue.textContent = `${gameState.volume}%`;
  elements.cameraEnabledCheckbox.checked = gameState.cameraEnabled;
  elements.vibrationEnabledCheckbox.checked = gameState.vibrationEnabled;
  
  updateVolume();
}

// ============================================
// 更新音量
// ============================================
function updateVolume() {
  Object.values(elements.sounds).forEach(sound => {
    if (sound) {
      sound.volume = gameState.volume / 100;
    }
  });
}

// ============================================
// 存檔系統
// ============================================
function saveGame() {
  const saveData = {
    coins: gameState.coins,
    maxCombo: gameState.maxCombo,
    audienceLimit: gameState.audienceLimit,
    drummers: gameState.drummers,
    difficulty: gameState.difficulty,
    volume: gameState.volume,
    cameraEnabled: gameState.cameraEnabled,
    vibrationEnabled: gameState.vibrationEnabled,
    version: 1.0
  };
  
  localStorage.setItem('rhythmDrumGame_Save', JSON.stringify(saveData));
  console.log('遊戲進度已儲存');
}

function loadGame() {
  const saveData = localStorage.getItem('rhythmDrumGame_Save');
  if (!saveData) return;
  
  try {
    const data = JSON.parse(saveData);
    
    // 版本兼容性
    if (data.version !== 1.0) {
      console.log('存檔版本不匹配，使用預設值');
      return;
    }
    
    // 載入遊戲狀態
    gameState.coins = data.coins || 0;
    gameState.maxCombo = data.maxCombo || 0;
    gameState.audienceLimit = data.audienceLimit || 100;
    gameState.drummers = data.drummers || [{ type: 'street', level: 1, bonus: 1.0, autoEarn: 1 }];
    gameState.difficulty = data.difficulty || 'normal';
    gameState.volume = data.volume || 80;
    gameState.cameraEnabled = data.cameraEnabled !== false; // 預設 true
    gameState.vibrationEnabled = data.vibrationEnabled || false;
    
    console.log('遊戲進度已載入');
  } catch (err) {
    console.error('載入存檔失敗:', err);
  }
}

// ============================================
// 保存設定
// ============================================
function saveSettings() {
  // 更新遊戲狀態
  gameState.difficulty = elements.difficultySelect.value;
  gameState.volume = parseInt(elements.volumeSlider.value);
  gameState.cameraEnabled = elements.cameraEnabledCheckbox.checked;
  gameState.vibrationEnabled = elements.vibrationEnabledCheckbox.checked;
  
  // 更新音量
  updateVolume();
  
  // 儲存設定
  saveGame();
  
  // 顯示提示
  alert('設定已儲存！');
  showMenu();
}

// ============================================
// 鼓譜系統
// ============================================
async function loadChart(difficulty = 'easy', name = 'happy-birthday') {
  try {
    // 嘗試從本地載入
    const response = await fetch(`charts/${difficulty}/${name}.json`);
    gameState.currentChart = await response.json();
    generateNotes();
    return true;
  } catch (err) {
    console.warn('載入鼓譜失敗，使用預設鼓譜:', err);
    // 使用預設鼓譜
    gameState.currentChart = {
      title: "Happy Birthday",
      bpm: 120,
      difficulty: "easy",
      notes: [
        { time: 0.5, type: "snare", lane: 1 },
        { time: 1.0, type: "snare", lane: 1 },
        { time: 1.5, type: "bass", lane: 0 },
        { time: 2.0, type: "hi-hat", lane: 2 },
        { time: 2.5, type: "snare", lane: 1 },
        { time: 3.0, type: "crash", lane: 3 },
        { time: 3.5, type: "snare", lane: 1 },
        { time: 4.0, type: "bass", lane: 0 },
        { time: 4.5, type: "hi-hat", lane: 2 },
        { time: 5.0, type: "snare", lane: 1 },
        { time: 5.5, type: "crash", lane: 3 }
      ]
    };
    generateNotes();
    return false;
  }
}

function generateNotes() {
  gameState.notes = [];
  gameState.nextNoteIndex = 0;
  
  // 清空舊音符
  document.querySelectorAll('.note').forEach(note => note.remove());
  
  // 根據 BPM 計算 beatInterval
  gameState.bpm = gameState.currentChart.bpm || 120;
  gameState.beatInterval = 60000 / gameState.bpm;
  
  // 創建新音符
  gameState.currentChart.notes.forEach((note, index) => {
    gameState.notes.push({
      ...note,
      id: `note-${index}`,
      x: 0,
      y: -50
    });
  });
  
  // 更新提示
  updateGestureHint();
}

function updateGestureHint() {
  if (!gameState.currentChart || !gameState.currentChart.notes || 
      gameState.nextNoteIndex >= gameState.currentChart.notes.length) {
    elements.gestureHint.textContent = '遊戲結束！';
    return;
  }
  
  const nextNote = gameState.currentChart.notes[gameState.nextNoteIndex];
  const drumIndex = CONSTANTS.DRUM_TYPES.indexOf(nextNote.type);
  elements.gestureHint.textContent = 
    `↑ ${CONSTANTS.DRUM_EMOJIS[drumIndex]} = ${CONSTANTS.DRUM_NAMES[drumIndex]}`;
}

// ============================================
// 遊戲控制
// ============================================
async function startGame() {
  if (gameState.isPlaying) return;
  
  // 載入鼓譜 (依難度選擇對應歌曲)
  await loadChart(gameState.difficulty, CONSTANTS.DEFAULT_SONGS[gameState.difficulty] || 'happy-birthday');

  // 重置遊戲狀態
  resetGameState();
  resetStrikeState();

  // 啟動攝像頭 (如果啟用)
  let cameraOK = gameState.cameraEnabled ? await startCamera() : false;

  if (cameraOK) {
    try {
      await initMediaPipe();
      startMediaPipeCamera();
      setDetectionStatus('', '🖐 請將手部放在攝像頭前');
      console.log('手勢辨識啟動成功');
    } catch (err) {
      // 手勢辨識 (MediaPipe) 載入失敗，但攝像頭本身正常 →
      // 保留鏡頭畫面，僅改用觸控/鍵盤輸入
      console.warn('手勢辨識載入失敗，保留鏡頭並改用觸控/鍵盤:', err);
      elements.touchControls.style.display = 'flex';
      clearHandCanvas();
      setDetectionStatus('', '⚠️ 手勢辨識無法載入，請用觸控/鍵盤');
      
      // 顯示更多的除錯資訊在 console
      console.error('MediaPipe載入錯誤:', err);
      console.log('請檢查：');
      console.log('1. 網路連線是否正常');
      console.log('2. CDN 是否被阻擋 (例如：' + 
          'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js)');
      console.log('3. 是否有使用 ad blocker 阻擋 CDN');
    }
  } else {
    // 完全沒有攝像頭 (權限被拒或停用) → 觸控/鍵盤模式
    elements.touchControls.style.display = 'flex';
    clearHandCanvas();
    setDetectionStatus('', '⌨️ 觸控/鍵盤模式 (無攝像頭)');
    console.log('使用觸控/鍵盤模式');
  }
  
  // 顯示遊戲畫面
  showGame();
  
  // 更新按鈕狀態
  elements.pauseBtn.disabled = false;
  elements.pauseBtn.textContent = '⏸️ 暫停';
  elements.startGameBtn.disabled = true;
  
  // 開始遊戲循環
  gameState.isPlaying = true;
  gameState.isPaused = false;
  gameState.startTime = Date.now();
  gameState.lastUpdateTime = Date.now();
  gameState.lastInteractionTime = Date.now();
  
  // 顯示遊戲開始
  elements.judgment.textContent = '開始！';
  elements.judgment.className = 'judgment-display';
  
  // 生成音符
  generateNotes();
  
  // 開始遊戲循環
  requestAnimationFrame(gameLoop);
  
  console.log('遊戲已開始');
}

function resetGameState() {
  gameState.score = 0;
  gameState.combo = 0;
  gameState.audience = 100;
  gameState.currentTime = 0;
  
  // 清空音符
  document.querySelectorAll('.note').forEach(note => note.remove());
  
  // 更新 UI
  updateUI();
}

function restartGame() {
  if (!gameState.isPlaying) return;
  
  endGame();
  setTimeout(startGame, 100);
}

function togglePause() {
  if (!gameState.isPlaying) return;
  
  if (gameState.isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

function pauseGame() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  
  gameState.isPaused = true;
  elements.pauseBtn.textContent = '▶️ 繼續';
  
  // 停止 MediaPipe
  stopMediaPipe();
  
  // 顯示暫停狀態
  elements.judgment.textContent = '⏸️ 已暫停';
  elements.judgment.className = 'judgment-display';
  
  console.log('遊戲已暫停');
}

function resumeGame() {
  if (!gameState.isPlaying || !gameState.isPaused) return;
  
  gameState.isPaused = false;
  gameState.lastUpdateTime = Date.now();
  gameState.lastInteractionTime = Date.now();
  elements.pauseBtn.textContent = '⏸️ 暫停';
  
  // 重新啟動 MediaPipe
  if (gameState.cameraEnabled && cameraStream) {
    startMediaPipeCamera();
  }
  
  // 顯示繼續狀態
  elements.judgment.textContent = '▶️ 繼續遊戲';
  elements.judgment.className = 'judgment-display';
  setTimeout(() => {
    elements.judgment.textContent = '';
  }, 1000);
  
  // 繼續遊戲循環
  requestAnimationFrame(gameLoop);
  
  console.log('遊戲已繼續');
}

function backToMenu() {
  if (gameState.isPlaying) {
    endGame();
  }
  showMenu();
  
  // 儲存遊戲進度
  saveGame();
}

function endGame() {
  gameState.isPlaying = false;
  gameState.isPaused = false;
  
  // 停止攝像頭
  stopCamera();
  
  // 停止 MediaPipe
  stopMediaPipe();
  
  // 清空音符
  document.querySelectorAll('.note').forEach(note => note.remove());
  
  // 重置 UI
  elements.pauseBtn.disabled = true;
  elements.pauseBtn.textContent = '⏸️ 暫停';
  elements.startGameBtn.disabled = false;
  elements.judgment.textContent = '遊戲結束！';
  elements.judgment.className = 'judgment-display';
  
  // 隱藏觸控控制
  elements.touchControls.style.display = 'none';

  // 清除手部骨架繪製與偵測狀態
  clearHandCanvas();
  setDetectionStatus('', '📷 攝像頭啟動中…');

  console.log('遊戲已結束');
}

// ============================================
// 攝像頭控制
// ============================================
async function startCamera() {
  try {
    // 先檢查相機是否可用
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('瀏覽器不支援相機 API');
    }
    
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640, min: 320 },
        height: { ideal: 480, min: 240 },
        frameRate: { ideal: 30, min: 15 }
      },
      audio: false
    });
    
    elements.cameraView.srcObject = cameraStream;
    elements.cameraView.play().catch(e => {
      console.error('攝像頭播放失敗:', e);
    });
    
    return true;
  } catch (err) {
    console.error('攝像頭權限被拒絕:', err);
    
    // 更詳細的錯誤訊息
    let errorMessage = '相機無法使用';
    if (err.name === 'NotAllowedError') {
      errorMessage = '相機權限被拒絕，請允許網站使用相機';
    } else if (err.name === 'NotFoundError') {
      errorMessage = '找不到相機裝置';
    } else if (err.name === 'NotReadableError') {
      errorMessage = '相機正被其他應用程式使用';
    }
    
    console.error('相機錯誤:', errorMessage);
    setDetectionStatus('', `⚠️ ${errorMessage}`);
    
    // 顯示觸控控制
    elements.touchControls.style.display = 'flex';
    elements.cameraEnabled = false;
    return false;
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    elements.cameraView.srcObject = null;
  }
}

// ============================================
// MediaPipe 初始化
// ============================================
async function initMediaPipe() {
  if (typeof Hands === 'undefined') {
    throw new Error('MediaPipe Hands 未載入 (CDN 無法存取)');
  }
  
  // 降低信心度門檻，提高偵測靈敏度
  hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
    },
    maxNumHands: 2,           // 支援兩隻手
    modelComplexity: 0,        // 輕量模型
    minDetectionConfidence: 0.3,  // 降低門檻，更容易偵測到手
    minTrackingConfidence: 0.3   // 降低門檻，更容易追蹤
  });
  
  console.log('MediaPipe Hands 初始化成功');
  
  hands.onResults((results) => {
    // 嘗試取得任何一隻手的骨架
    const allLandmarks = results.multiHandLandmarks || [];
    const landmarks = allLandmarks[0];

    // 繪製所有偵測到的手部骨架
    allLandmarks.forEach(lm => drawHandLandmarks(lm));

    if (!landmarks || !landmarks.length) {
      // 沒偵測到手 → 重置揮擊狀態，避免下次速度誤判
      resetStrikeState();
      setDetectionStatus('', '🖐 尋找手部... 請保持手部在攝像頭前');
      return;
    }

    setDetectionStatus('detected', `✋ 偵測到 ${allLandmarks.length} 隻手 ✓`);

    if (gameState.isPlaying && !gameState.isPaused) {
      const drumType = detectStrike(landmarks); // 向下揮擊 → 對應的鼓
      if (drumType) {
        triggerDrum(drumType, Date.now());
        gameState.lastInteractionTime = Date.now();

        // 敲擊 → 徽章閃一下並顯示對應的鼓
        const drumIndex = CONSTANTS.DRUM_TYPES.indexOf(drumType);
        const label = drumIndex >= 0
          ? `${CONSTANTS.DRUM_EMOJIS[drumIndex]} ${CONSTANTS.DRUM_NAMES[drumIndex]}!`
          : '🥁 敲擊!';
        setDetectionStatus('hit', label);
        if (hitFlashTimer) clearTimeout(hitFlashTimer);
        hitFlashTimer = setTimeout(() => {
          setDetectionStatus('detected', '✋ 偵測到手部 ✓');
        }, 200);
      }
    }
  });
}

function startMediaPipeCamera() {
  if (!hands || !cameraStream) return;
  if (typeof Camera === 'undefined') {
    throw new Error('MediaPipe Camera 未載入 (CDN 無法存取)');
  }

  camera = new Camera(elements.cameraView, {
    onFrame: async () => {
      await hands.send({ image: elements.cameraView });
    },
    width: 640,
    height: 480
  });
  
  camera.start();
}

function stopMediaPipe() {
  if (camera) {
    camera.stop();
    camera = null;
  }
  
  if (hands) {
    hands.close();
    hands = null;
  }
}

// ============================================
// 手勢判定
// ============================================
// 以「向下揮擊」的動作偵測敲鼓 (比靜態姿勢可靠很多)：
// 手快速往下移動 = 一次敲擊；用手的水平位置決定敲哪一個鼓。
// 回傳鼓的種類字串 ('bass'|'snare'|'hi-hat'|'crash') 或 null。
function detectStrike(landmarks) {
  const hand = landmarks[9] || landmarks[0]; // 用手掌中心 (中指根部) 較穩定
  const now = Date.now();
  let drumType = null;

  if (strikeState.lastY !== null) {
    const dy = hand.y - strikeState.lastY;          // 正值 = 往下 (畫面座標 y 向下為正)
    const movingDown = dy > CONSTANTS.STRIKE_DY;     // 下移速度超過門檻
    const cooledDown = now - strikeState.lastHitTime > CONSTANTS.STRIKE_COOLDOWN;

    if (movingDown && cooledDown && !strikeState.armed) {
      // 畫面是鏡像的 (scaleX(-1))，螢幕上的 x = 1 - 原始 x
      const screenX = 1 - hand.x;
      const zone = screenX < 0.25 ? 0 : screenX < 0.5 ? 1 : screenX < 0.75 ? 2 : 3;
      drumType = CONSTANTS.DRUM_TYPES[zone]; // 0:大鼓 1:軍鼓 2:鈔鑼 3:鑼
      strikeState.lastHitTime = now;
      strikeState.armed = true; // 觸發後鎖住，等手抬回去才能再次觸發
    }

    // 手往上抬 → 解除鎖定，允許下一次敲擊
    if (dy < -CONSTANTS.STRIKE_DY * 0.5) {
      strikeState.armed = false;
    }
  }

  strikeState.lastY = hand.y;
  return drumType;
}

function resetStrikeState() {
  strikeState.lastY = null;
  strikeState.armed = false;
  strikeState.lastHitTime = 0;
}

function distance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// ============================================
// 觸發敲鼓
// ============================================
function triggerDrum(drumType, timestamp) {
  if (!gameState.isPlaying || gameState.isPaused) return;
  
  // 计算判定
  const now = timestamp - gameState.startTime;
  const judgment = judgeDrum(drumType, now);
  
  // 播放音效
  playSound(drumType);
  
  // 振動反饋 (如果啟用)
  if (gameState.vibrationEnabled && 'vibrate' in navigator) {
    if (judgment.result === 'Perfect') {
      navigator.vibrate(30);
    } else if (judgment.result === 'Good') {
      navigator.vibrate(20);
    }
  }
  
  // 显示判定
  showJudgment(judgment.result);
  
  // 更新分数
  gameState.score += judgment.score;
  gameState.combo = judgment.combo;
  gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
  
  // 更新觀眾
  if (judgment.result === 'Perfect' || judgment.result === 'Good') {
    gameState.audience = Math.min(gameState.audience + 5, gameState.audienceLimit);
  } else if (judgment.result === 'Miss') {
    gameState.audience = Math.max(gameState.audience - 2, 0);
  }
  
  // 更新音符索引
  const currentTime = (timestamp - gameState.startTime) / 1000;
  while (gameState.nextNoteIndex < gameState.notes.length && 
         gameState.notes[gameState.nextNoteIndex].time <= currentTime) {
    gameState.nextNoteIndex++;
  }
  
  // 更新提示
  updateGestureHint();
  
  // 更新 UI
  updateUI();
  
  // 检查是否所有音符都处理完了
  if (gameState.nextNoteIndex >= gameState.notes.length) {
    setTimeout(() => {
      if (gameState.nextNoteIndex >= gameState.notes.length) {
        elements.judgment.textContent = '太棒了！歌曲完成';
        elements.judgment.className = 'judgment-display';
        
        // 更新金幣 (放置收益)
        const songDuration = gameState.currentChart.notes.length * 0.5; // 假設每個音符 0.5 秒
        gameState.coins += Math.floor(gameState.score * 0.1); // 10% 分數轉金幣
        
        // 解鎖新鼓譜
        unlockNewCharts();
      }
    }, 1000);
  }
}

// ============================================
// 判定系統
// ============================================
function judgeDrum(drumType, now) {
  // 找到当前时间附近的音符
  const timeWindow = 200; // ±200ms
  const currentNotes = gameState.notes.filter(note => {
    return Math.abs(note.time * 1000 - now) < timeWindow && note.type === drumType;
  });
  
  if (currentNotes.length === 0) {
    // 没有对应的音符
    resetCombo();
    return { result: 'Miss', score: 0, combo: 0 };
  }
  
  // 找到最接近的音符
  const closestNote = currentNotes.reduce((prev, curr) => {
    return Math.abs(curr.time * 1000 - now) < Math.abs(prev.time * 1000 - now) ? curr : prev;
  });
  
  const diff = Math.abs(closestNote.time * 1000 - now);
  const windows = CONSTANTS.JUDGE_WINDOWS[gameState.difficulty];
  
  let result, scoreMultiplier;
  if (diff <= windows.perfect) {
    result = 'Perfect';
    scoreMultiplier = 3.0;
    gameState.combo++;
  } else if (diff <= windows.good) {
    result = 'Good';
    scoreMultiplier = 1.5;
    gameState.combo += 0.5;
  } else if (diff <= windows.bad) {
    result = 'Bad';
    scoreMultiplier = 0.5;
    resetCombo();
  } else {
    result = 'Miss';
    scoreMultiplier = 0;
    resetCombo();
  }
  
  const baseScore = 100;
  const comboBonus = 1 + (gameState.combo * 0.01); // 每 1 combo +1%
  const finalScore = baseScore * scoreMultiplier * comboBonus;
  
  return { result, score: Math.floor(finalScore), combo: gameState.combo };
}

function resetCombo() {
  gameState.combo = 0;
}

function showJudgment(result) {
  elements.judgment.textContent = result;
  elements.judgment.className = `judgment-display ${result.toLowerCase()}`;
  
  // 1 秒后清空
  setTimeout(() => {
    if (elements.judgment.textContent === result) {
      elements.judgment.textContent = '';
      elements.judgment.className = 'judgment-display';
    }
  }, 1000);
}

// ============================================
// 音效播放
// ============================================
// 本地 .mp3 音效檔已損毀 (實際是 HTML 錯誤頁)，改用 Web Audio API 即時合成鼓聲
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioCtx = new AudioCtx();
  }
  // 瀏覽器要求使用者互動後才能播放，遊戲由點擊「開始」觸發，這裡確保已 resume
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function createNoiseSource(ctx, duration) {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

function playSound(drumType) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const vol = gameState.volume / 100;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (drumType === 'bass') {
      // 大鼓：低頻正弦波 + 快速下滑
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.12);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.3);
    } else if (drumType === 'snare') {
      // 軍鼓：高通白噪音 + 短促衰減
      const noise = createNoiseSource(ctx, 0.2);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;
      gain.gain.setValueAtTime(vol * 0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      noise.connect(filter);
      filter.connect(gain);
      noise.start(t);
      noise.stop(t + 0.2);
    } else if (drumType === 'hi-hat') {
      // 鈔鑼：極短高頻噪音
      const noise = createNoiseSource(ctx, 0.05);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      gain.gain.setValueAtTime(vol * 0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      noise.connect(filter);
      filter.connect(gain);
      noise.start(t);
      noise.stop(t + 0.05);
    } else if (drumType === 'crash') {
      // 鑼：較長的高頻噪音衰減
      const noise = createNoiseSource(ctx, 0.6);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 5000;
      gain.gain.setValueAtTime(vol * 0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      noise.connect(filter);
      filter.connect(gain);
      noise.start(t);
      noise.stop(t + 0.6);
    }
  } catch (err) {
    console.error('播放音效失敗:', err);
  }
}

// ============================================
// 遊戲循環
// ============================================
function gameLoop(timestamp) {
  if (!gameState.isPlaying || gameState.isPaused) {
    return;
  }
  
  // 更新音符位置
  updateNotes();
  
  // 更新觀眾數量
  const now = Date.now();
  const deltaTime = (now - gameState.lastUpdateTime) / 1000; // 轉換為秒
  
  if (deltaTime > 0) {
    // 觀眾自動增加
    gameState.audience = Math.min(
      gameState.audience + CONSTANTS.AUDIENCE_GROWTH * deltaTime,
      gameState.audienceLimit
    );
    
    // 如果長時間沒互動，觀眾流失
    if (now - gameState.lastInteractionTime > 30000) { // 30 秒
      gameState.audience = Math.max(
        gameState.audience - CONSTANTS.AUDIENCE_DECAY * deltaTime,
        0
      );
    }
    
    gameState.lastUpdateTime = now;
    updateUI();
  }
  
  // 繼續循環
  requestAnimationFrame(gameLoop);
}

// ============================================
// 更新音符位置
// ============================================
function updateNotes() {
  // 與 triggerDrum/判定系統使用同一時鐘 (Date.now)，避免 requestAnimationFrame
  // 的時間戳 (performance.now) 與 startTime 混用導致數值錯亂
  const now = Date.now() - gameState.startTime; // ms
  const laneHeight = elements.drumChart ? elements.drumChart.offsetHeight : 200;
  const noteHeight = 18;
  const leadMs = CONSTANTS.LEAD_TIME * 1000;

  for (let i = 0; i < gameState.notes.length; i++) {
    const note = gameState.notes[i];

    // 音符判定時間 (ms) 與其在頂端出現的時間
    const noteTime = note.time * 1000;
    const appearTime = noteTime - leadMs;

    // 還沒到出現時間，跳過
    if (now < appearTime) continue;

    // 位置: appearTime → y=0 (頂端)，noteTime → y=laneHeight (判定線)
    const progress = (now - appearTime) / leadMs;
    note.y = progress * laneHeight;

    // 如果音符已经超出屏幕，移除
    if (note.y > laneHeight + noteHeight) {
      const noteElement = document.querySelector(`.note[data-id="${note.id}"]`);
      if (noteElement) {
        noteElement.remove();
      }
      continue;
    }

    // 更新音符位置
    let noteElement = document.querySelector(`.note[data-id="${note.id}"]`);
    if (!noteElement) {
      noteElement = createNoteElement(note);
    }

    if (noteElement) {
      noteElement.style.transform = `translateY(${note.y}px)`;
    }
  }
}

// ============================================
// 創建音符元素
// ============================================
function createNoteElement(note) {
  const lane = elements.lanes[note.lane];
  if (!lane) return null;
  
  const noteElement = document.createElement('div');
  noteElement.className = `note ${note.type}`;
  noteElement.dataset.id = note.id;
  noteElement.style.transform = `translateY(${note.y}px)`;
  lane.appendChild(noteElement);
  
  return noteElement;
}

// ============================================
// 更新 UI
// ============================================
function updateUI() {
  elements.score.textContent = Math.floor(gameState.score);
  elements.coins.textContent = `$${Math.floor(gameState.coins)}`;
  elements.audience.textContent = Math.floor(gameState.audience);
  elements.combo.textContent = gameState.combo;
}

// ============================================
// 解鎖新鼓譜
// ============================================
function unlockNewCharts() {
  // 根据分数解锁新鼓譜
  if (gameState.score >= 5000 && !localStorage.getItem('unlocked_jingle-bells')) {
    localStorage.setItem('unlocked_jingle-bells', 'true');
    console.log('解鎖了新鼓譜: Jingle Bells');
  }
}

// ============================================
// 页面加载完成后初始化
// ============================================
document.addEventListener('DOMContentLoaded', init);
