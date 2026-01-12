// ============================================
// 状態管理
// ============================================
let projects = [];
let currentState = 'initial'; // 'initial' | 'hover' | 'modal'
let hoveredProject = null;
let selectedProject = null;
let hoverLeaveTimer = null; // hover解除時の余韻用タイマー


// ============================================
// DOM要素の取得
// ============================================
const portfolioTitle = document.getElementById('portfolioTitle');
const contextPanel = document.getElementById('contextPanel');
const focusVisual = document.getElementById('focusVisual');
const heroVideoBase = document.getElementById('bgVideo');
const bgLayer = document.getElementById('bgLayer');
const titleBackground = document.getElementById('titleBackground');
const titleText = document.getElementById('titleText');
const guidanceText = document.getElementById('guidanceText');
const projectNavigation = document.getElementById('projectNavigation');
const modalOverlay = document.getElementById('modalOverlay');
const modalContainer = document.querySelector('.modal-container');
const modalClose = document.getElementById('modalClose');
const modalContent = document.getElementById('modalContent');
const lightboxOverlay = document.getElementById('lightboxOverlay');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxVideo = document.getElementById('lightboxVideo');
const lightboxClose = document.getElementById('lightboxClose');
let isClosing = false;

// ============================================
// 初期化
// ============================================
async function init() {
  try {
    // projects.jsonを読み込む
    const response = await fetch('projects.json');
    projects = await response.json();
    
    // 初期状態を設定
    renderInitialState();
    renderProjectNavigation();
    
    // イベントリスナーを設定（プロジェクトアイテムが生成された後）
    setupEventListeners();
  } catch (error) {
    console.error('Error loading projects:', error);
    // エラー時はプレースホルダーを表示
    showErrorState();
  }
}

// ============================================
// 初期状態の描画
// ============================================
function renderInitialState() {
  // ① コンテキストパネルを非表示にする
  contextPanel.classList.remove('visible');
  
  // ② 動画背景レイヤー（初期状態では何も表示しない）
  if (heroVideoBase) {
    heroVideoBase.style.display = 'none';
    heroVideoBase.pause();
    heroVideoBase.currentTime = 0;
    heroVideoBase.style.opacity = '0';
  }
  
  // bgLayerも非表示
  if (bgLayer) {
    bgLayer.style.opacity = '0';
    bgLayer.classList.remove('isFading');
  }
  
  // ③ タイトル
  titleText.textContent = 'PORTFOLIO';
  
  // State0用ガイダンステキストを表示
  guidanceText.classList.add('visible');
}

// ============================================
// プロジェクト選択UIの描画
// ============================================
function renderProjectNavigation() {
  projectNavigation.innerHTML = '';
  
  projects.forEach((project, index) => {
    const item = document.createElement('div');
    item.className = 'project-item';
    item.dataset.projectId = project.id;
    item.dataset.projectIndex = index;
    
    const thumbnail = document.createElement('img');
    thumbnail.className = 'project-thumbnail';
    thumbnail.src = project.thumbnail || 'https://assets.shuntofujii.com/top/placeholder-image.jpg';
    thumbnail.alt = project.title;
    thumbnail.onerror = function() {
      this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3E' + project.title.substring(0, 2) + '%3C/text%3E%3C/svg%3E';
    };
    
    item.appendChild(thumbnail);
    projectNavigation.appendChild(item);
  });
  
  // プロジェクトアイテムのイベントリスナーを設定
  setupProjectItemListeners();
}

// ============================================
// プロジェクトアイテムのイベントリスナー設定
// ============================================
function setupProjectItemListeners() {
  // プロジェクトアイテムのhover
  const projectItems = document.querySelectorAll('.project-item');
  projectItems.forEach(item => {
    const projectIndex = parseInt(item.dataset.projectIndex);
    const project = projects[projectIndex];
    
    if (!project) return;
    
    item.addEventListener('mouseenter', () => {
      if (currentState !== 'modal') {
        handleProjectHover(project, item);
      }
    });
    
    item.addEventListener('mouseleave', () => {
      if (currentState !== 'modal') {
        handleProjectLeave();
      }
    });
    
    // スマホ向け：touchstartでhover状態、touchcancel/touchendで非hover状態
    item.addEventListener('touchstart', (e) => {
      if (currentState !== 'modal') {
        handleProjectHover(project, item);
      }
    }, { passive: true });
    
    item.addEventListener('touchcancel', (e) => {
      if (currentState !== 'modal') {
        handleProjectLeave();
      }
    }, { passive: true });
    
    item.addEventListener('touchend', (e) => {
      if (currentState !== 'modal') {
        handleProjectLeave();
      }
    }, { passive: true });
    
    item.addEventListener('click', () => {
      handleProjectClick(project, item);
    });
  });
}

// ============================================
// イベントリスナーの設定
// ============================================
function setupEventListeners() {
  // プロジェクトアイテムのイベントリスナーを設定
  setupProjectItemListeners();
  
  // モーダルを閉じる
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  // ESCキーでモーダル/ライトボックスを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!lightboxOverlay.hidden) {
        closeLightbox();
      } else if (currentState === 'modal') {
        closeModal();
      }
    }
  });
  
  // ライトボックスのイベントリスナー
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightboxOverlay) {
    lightboxOverlay.addEventListener('click', (e) => {
      if (e.target === lightboxOverlay) {
        closeLightbox();
      }
    });
  }
  
  // ポートフォリオ名をクリックでState0に戻る
  portfolioTitle.addEventListener('click', () => {
    resetToInitialState();
  });
}

// ============================================
// プロジェクトhover処理（一時的フォーカス）
// ============================================
function handleProjectHover(project, itemElement) {
  // hover解除タイマーをクリア
  if (hoverLeaveTimer) {
    clearTimeout(hoverLeaveTimer);
    hoverLeaveTimer = null;
  }
  
  currentState = 'hover';
  hoveredProject = project;
  
  // ② 動画背景レイヤーを更新（動画を自動再生）
  updateHeroMedia(project.heroMedia);
  
  // bgLayerを表示
  if (bgLayer) {
    bgLayer.classList.remove('isFading');
    bgLayer.style.opacity = '1';
  }
  
  // ③ タイトルは非表示（hover時も表示しない）
  
  // State0用ガイダンステキストを非表示
  guidanceText.classList.remove('visible');
  
  // ① コンテキストパネルを表示・更新
  contextPanel.classList.add('visible');
  updateContextPanel(project);
}

// ============================================
// プロジェクトhover解除処理（即座に初期状態に戻す）
// ============================================
function handleProjectLeave() {
  // タイマーをクリア（既存のタイマーがあれば）
  if (hoverLeaveTimer) {
    clearTimeout(hoverLeaveTimer);
    hoverLeaveTimer = null;
  }
  
  // 即座に初期状態に戻す
  if (currentState !== 'modal' && !selectedProject) {
    // ③ タイトルを初期状態に戻す
    titleText.textContent = 'PORTFOLIO';
    
    // 動画を停止
    if (heroVideoBase) {
      heroVideoBase.pause();
      heroVideoBase.currentTime = 0;
      heroVideoBase.style.display = 'none';
      heroVideoBase.style.opacity = '0';
    }
    
    // bgLayerをフェードアウト
    if (bgLayer) {
      bgLayer.classList.add('isFading');
      bgLayer.addEventListener('transitionend', function fadeComplete() {
        bgLayer.classList.remove('isFading');
        bgLayer.removeEventListener('transitionend', fadeComplete);
        renderInitialState();
      }, { once: true });
    } else {
      renderInitialState();
    }
    
    // ① コンテキストパネルを非表示にする
    contextPanel.classList.remove('visible');
    
    // ④ 選択状態を解除
    document.querySelectorAll('.project-item').forEach(item => {
      item.classList.remove('selected');
    });
  }
}

// ============================================
// プロジェクトクリック処理（状態保持）
// ============================================
function handleProjectClick(project, itemElement) {
  currentState = 'modal';
  selectedProject = project;
  
  // hover解除タイマーをクリア
  if (hoverLeaveTimer) {
    clearTimeout(hoverLeaveTimer);
    hoverLeaveTimer = null;
  }
  
  // 選択状態を保持（selectedクラスを使用）
  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.remove('selected');
  });
  itemElement.classList.add('selected');
  
  // モーダルを開く
  openModal(project);
}

// ============================================
// ヒーローメディアの更新（動画を自動再生・遅めの切り替え）
// ============================================
function updateHeroMedia(heroMedia) {
  if (!heroMedia) return;
  
  // ②は動画のみ表示（静止画は表示しない）
  if (heroMedia.type === 'video') {
    // 現在再生中の動画と同じ場合はスキップ
    if (heroVideoBase && heroVideoBase.src && heroVideoBase.src.endsWith(heroMedia.src)) {
      return;
    }
    
    // 動画を更新する関数
    const updateVideo = (video) => {
      if (!video) return;
      
      // フェードアウト
      video.style.opacity = '0';
      
      setTimeout(() => {
        // 既存のイベントリスナーをクリーンアップ
        const existingListeners = ['loadeddata', 'canplay', 'canplaythrough', 'error'];
        existingListeners.forEach(eventType => {
          video.removeEventListener(eventType, video._playHandler);
          video.removeEventListener(eventType, video._errorHandler);
        });
        video._playHandler = null;
        video._errorHandler = null;
        
        video.src = heroMedia.src;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.setAttribute('loop', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('playsinline', 'true');
        video.style.display = 'block';
        
        // 動画が終了したときに再再生（ループのフォールバック）
        const loopHandler = function() {
          video.currentTime = 0;
          video.play().catch(e => {
            console.log('Video replay error:', e);
          });
        };
        video.removeEventListener('ended', loopHandler);
        video.addEventListener('ended', loopHandler);
        
        // 再生を試行する関数
        const attemptPlay = () => {
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA以上
            video.play().catch(e => {
              console.log('Video autoplay prevented:', e);
              // ユーザー操作で再試行するためのガード
              const retryPlay = () => {
                video.play().catch(() => {});
                document.removeEventListener('pointerdown', retryPlay);
                document.removeEventListener('touchstart', retryPlay);
                document.removeEventListener('click', retryPlay);
              };
              document.addEventListener('pointerdown', retryPlay, { once: true });
              document.addEventListener('touchstart', retryPlay, { once: true });
              document.addEventListener('click', retryPlay, { once: true });
            });
          }
        };
        
        // 複数のイベントで再生を試行（フォールバック）
        const playHandler = () => {
          attemptPlay();
          video.removeEventListener('loadeddata', playHandler);
          video.removeEventListener('canplay', playHandler);
          video.removeEventListener('canplaythrough', playHandler);
        };
        video._playHandler = playHandler;
        
        // エラーハンドリング
        const errorHandler = (e) => {
          console.error('Video load error:', e, heroMedia.src);
          video.removeEventListener('error', errorHandler);
        };
        video._errorHandler = errorHandler;
        video.addEventListener('error', errorHandler);
        
        // 複数のイベントリスナーを設定（最初に発火したもので再生）
        video.addEventListener('loadeddata', playHandler, { once: true });
        video.addEventListener('canplay', playHandler, { once: true });
        video.addEventListener('canplaythrough', playHandler, { once: true });
        
        // 動画を読み込む
        video.load();
        
        // 既に読み込み済みの場合のフォールバック
        if (video.readyState >= 2) {
          attemptPlay();
        }
        
        // フェードイン
        video.style.opacity = '1';
        video.classList.add('fade-in');
        
        // アニメーションクラスをリセット
        setTimeout(() => {
          video.classList.remove('fade-in');
        }, 700);
      }, 100);
    };
    
    // 動画を更新
    updateVideo(heroVideoBase);
  }
}

// ============================================
// コンテキストパネルの更新
// ============================================
function updateContextPanel(project) {
  const tools = project.tools ? project.tools.join(' / ') : null;
  
  // Category (Year) を表示（project-08は特別処理）
  let categoryYear = '';
  if (project.id === 'project-08') {
    categoryYear = `${project.category} (Opening Soon)`;
  } else {
    categoryYear = `${project.category} (${project.year})`;
  }
  
  // RoleとScopeを結合（Roleを適切な形式に変換、Scopeも調整）
  let roleScope = '';
  
  // プロジェクトIDに基づいて表示内容を決定
  const displayMap = {
    'project-01': 'Founding / Service Design / UIUX Design / Business Dev',
    'project-02': 'Creative Direction / Intro Video / Logo Design / Graphic Design',
    'project-03': 'Creative Direction / Product Video / UIUX Design',
    'project-04': 'Marketing Strategy / Product Video',
    'project-05': 'Business Dev / Product Video / Graphic Design',
    'project-06': 'Art Direction / Production Design / Costume Supervisor / Set Decorator',
    'project-07': 'Creative Direction / Fitness Video',
    'project-08': 'Co-Founding',
    'project-09': 'Graphic Design / Videography / Photography'
  };
  
  roleScope = displayMap[project.id] || (project.role && project.scope ? `${project.role} / ${project.scope}` : project.role || project.scope || '');
  
  contextPanel.innerHTML = `
    <div class="context-content">
      <div class="context-info">
        <div class="context-info-item">
          <span class="context-info-value">${categoryYear}</span>
        </div>
        <div class="context-info-item">
          <span class="context-info-value value">${roleScope}</span>
        </div>
        ${tools ? `
        <div class="context-info-item row">
          <img src="https://assets.shuntofujii.com/icons/toolkits.svg" alt="Toolkits" class="toolkit-icon" />
          <span class="context-info-value value">${tools}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ============================================
// State0（未選択状態）にリセット
// ============================================
function resetToInitialState() {
  // hover解除タイマーをクリア
  if (hoverLeaveTimer) {
    clearTimeout(hoverLeaveTimer);
    hoverLeaveTimer = null;
  }
  
  currentState = 'initial';
  hoveredProject = null;
  selectedProject = null;
  
  // ① コンテキストパネルを非表示にする
  contextPanel.classList.remove('visible');
  
  // ② 動画背景レイヤーを停止
  if (heroVideoBase) {
    heroVideoBase.pause();
    heroVideoBase.currentTime = 0;
    heroVideoBase.style.display = 'none';
    heroVideoBase.style.opacity = '0';
  }
  
  // ③ タイトルを初期状態に
  titleText.textContent = 'PORTFOLIO';
  
  // State0用ガイダンステキストを表示
  guidanceText.classList.add('visible');
  
  // ④ 選択状態を解除
  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.remove('selected');
  });
}

// ============================================
// アセットURL組み立て関数
// ============================================
const baseAssetsUrl = "https://assets.shuntofujii.com";

function buildImageUrl(projectSlug, prefix, n) {
  return `${baseAssetsUrl}/${projectSlug}/${prefix}_${n}.webp`;
}

function buildVideoUrl(projectSlug, prefix) {
  return `${baseAssetsUrl}/${projectSlug}/${prefix}.webm`;
}

// ============================================
// 画像グリッドレイアウト（PC/SP判定）
// ============================================
function getImageGridLayout(count, isMobile) {
  if (isMobile) {
    // SP版
    switch (count) {
      case 2:
        return { columns: 2, spans: [] };
      case 3:
        return { columns: 2, spans: [{ index: 2, span: 2 }] }; // 3枚目をfull width
      case 4:
        return { columns: 2, spans: [] };
      case 5:
        return { columns: 2, spans: [{ index: 4, span: 2 }] }; // 5枚目をfull width
      default:
        return { columns: 1, spans: [] };
    }
  } else {
    // PC版
    switch (count) {
      case 2:
        return { columns: 2, spans: [] };
      case 3:
        return { columns: 3, spans: [] };
      case 4:
        return { columns: 2, spans: [] };
      case 5:
        return { columns: 6, spans: [
          { index: 0, span: 2 }, // 1-3枚目：各2/6 = 3列
          { index: 1, span: 2 },
          { index: 2, span: 2 },
          { index: 3, span: 3 }, // 4-5枚目：各3/6 = 2列
          { index: 4, span: 3 }
        ]};
      default:
        return { columns: 1, spans: [] };
    }
  }
}

// ============================================
// 動画再生制御（インライン再生）
// ============================================
function cleanupVideoObservers() {
  // 現在は使用していないが、互換性のため残す
}

// 現在再生中の動画を管理
let currentPlayingVideo = null;

// 全てのインライン動画を停止してposterに戻す
function stopAllInlineVideos() {
  const allVideos = document.querySelectorAll('.video-shell .video');
  allVideos.forEach(video => {
    video.pause();
    video.currentTime = 0;
    const videoShell = video.closest('.video-shell');
    if (videoShell) {
      videoShell.classList.remove('playing');
      const overlayPlay = videoShell.querySelector('.video-overlay-play');
      const controls = videoShell.querySelector('.video-controls');
      if (overlayPlay) {
        overlayPlay.style.opacity = '1';
        overlayPlay.style.pointerEvents = 'auto';
      }
      if (controls) {
        controls.classList.remove('visible');
      }
    }
  });
  currentPlayingVideo = null;
}

// ============================================
// 動画プレイヤーの初期化と制御（1クリック再生）
// ============================================
function initVideoPlayer(videoShell) {
  const video = videoShell.querySelector('.video');
  const overlayPlay = videoShell.querySelector('.video-overlay-play');
  const controls = videoShell.querySelector('.video-controls');
  const playPauseBtn = controls.querySelector('.btn-playpause');
  const seekBar = controls.querySelector('.seek');
  const muteBtn = controls.querySelector('.btn-mute');
  
  if (!video || !overlayPlay || !controls) return;
  
  // 再生状態を管理
  function enterPlayingState() {
    videoShell.classList.add('playing');
    overlayPlay.style.opacity = '0';
    overlayPlay.style.pointerEvents = 'none';
    controls.classList.add('visible');
    playPauseBtn.setAttribute('aria-label', 'Pause');
    playPauseBtn.classList.add('playing');
  }

  function enterPausedState() {
    videoShell.classList.remove('playing');
    overlayPlay.style.opacity = '1';
    overlayPlay.style.pointerEvents = 'auto';
    controls.classList.remove('visible');
    playPauseBtn.setAttribute('aria-label', 'Play');
    playPauseBtn.classList.remove('playing');
  }
  
  // 再生/停止ボタン更新（イベント用、状態は変更しない）
  function updatePlayButton() {
    // ボタンの見た目のみ更新（状態変更はtogglePlay内で行う）
    if (video.paused) {
      playPauseBtn.setAttribute('aria-label', 'Play');
      playPauseBtn.classList.remove('playing');
    } else {
      playPauseBtn.setAttribute('aria-label', 'Pause');
      playPauseBtn.classList.add('playing');
    }
  }
  
  // シークバー更新
  function updateSeekBar() {
    if (video.duration) {
      const percent = (video.currentTime / video.duration) * 100;
      seekBar.value = percent;
    }
  }
  
  // ミュートボタン更新
  function updateMuteButton() {
    if (video.muted) {
      muteBtn.setAttribute('aria-label', 'Unmute');
      muteBtn.classList.add('muted');
    } else {
      muteBtn.setAttribute('aria-label', 'Mute');
      muteBtn.classList.remove('muted');
    }
  }
  
  // 再生/一時停止
  function togglePlay() {
    if (video.paused) {
      // 他の動画を停止
      stopAllInlineVideos();
      // 再生ボタンのクリックをトリガーに全画面表示
      enterPlayingState();
      video.play().catch(e => {
        console.warn('Video play error:', e);
        // エラー時は停止状態に戻す
        enterPausedState();
      });
      currentPlayingVideo = video;
    } else {
      // 停止ボタンのクリックをトリガーに縮小表示
      enterPausedState();
      video.pause();
    }
  }
  
  // イベントリスナー
  video.addEventListener('loadedmetadata', () => {
    seekBar.max = 100;
    updateSeekBar();
  });
  
  video.addEventListener('timeupdate', updateSeekBar);
  video.addEventListener('play', updatePlayButton);
  video.addEventListener('pause', updatePlayButton);
  video.addEventListener('ended', () => {
    video.currentTime = 0;
    updatePlayButton();
  });
  
  // オーバーレイプレイボタン（クリックでライトボックスを開く）
  overlayPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    openLightboxVideo(video.src, videoShell);
  });
  
  // 動画クリック（ライトボックスを開く）
  video.addEventListener('click', (e) => {
    e.stopPropagation();
    if (video.paused) {
      openLightboxVideo(video.src, videoShell);
    } else {
      togglePlay();
    }
  });
  
  // プレイ/一時停止ボタン
  playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });
  
  // シークバー
  seekBar.addEventListener('input', (e) => {
    e.stopPropagation();
    const percent = seekBar.value / 100;
    video.currentTime = video.duration * percent;
  });
  
  // ミュートボタン
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    updateMuteButton();
  });
  
  // エラーハンドリング
  video.addEventListener('error', (e) => {
    console.warn('Video load error:', video.src);
    updatePlayButton();
  });
  
  // 初期状態
  updatePlayButton();
  updateMuteButton();
}

// ============================================
// 施策カードを生成
// ============================================
function createInitiativeCard(initiative, projectSlug) {
  const card = document.createElement('div');
  card.className = 'initiative-card';
  
  // ヘッダー
  const head = document.createElement('div');
  head.className = 'initiative-head';
  const name = document.createElement('h4');
  name.className = 'initiative-name';
  name.textContent = initiative.title;
  head.appendChild(name);
  card.appendChild(head);
  
  // 動画（hasVideo=trueの場合のみ）
  if (initiative.hasVideo) {
    const videoShell = document.createElement('div');
    videoShell.className = 'video-shell';
    
    // video要素
    const video = document.createElement('video');
    video.className = 'video';
    video.src = buildVideoUrl(projectSlug, initiative.assetPrefix);
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.preload = 'metadata';
    video.poster = buildImageUrl(projectSlug, initiative.assetPrefix, 1);
    video.muted = true;
    video.loop = true;
    video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
    video.setAttribute('disablepictureinpicture', 'true');
    
    // オーバーレイプレイボタン（初期のみ表示）
    const overlayPlay = document.createElement('button');
    overlayPlay.className = 'video-overlay-play';
    overlayPlay.type = 'button';
    overlayPlay.setAttribute('aria-label', 'Play');
    
    const playIcon = document.createElement('span');
    playIcon.className = 'icon-play';
    
    overlayPlay.appendChild(playIcon);
    
    // コントロールバー（動画内下部にオーバーレイ）
    const controls = document.createElement('div');
    controls.className = 'video-controls';
    
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'btn-playpause';
    playPauseBtn.type = 'button';
    playPauseBtn.setAttribute('aria-label', 'Play');
    
    const seekBar = document.createElement('input');
    seekBar.className = 'seek';
    seekBar.type = 'range';
    seekBar.min = '0';
    seekBar.max = '100';
    seekBar.value = '0';
    seekBar.setAttribute('aria-label', 'Seek');
    
    const muteBtn = document.createElement('button');
    muteBtn.className = 'btn-mute';
    muteBtn.type = 'button';
    muteBtn.setAttribute('aria-label', 'Mute');
    
    controls.appendChild(playPauseBtn);
    controls.appendChild(seekBar);
    controls.appendChild(muteBtn);
    
    videoShell.appendChild(video);
    videoShell.appendChild(overlayPlay);
    videoShell.appendChild(controls);
    
    // プレイヤーを初期化
    initVideoPlayer(videoShell);
    
    card.appendChild(videoShell);
  }
  
  // 画像グリッド（images > 0の場合のみ）
  if (initiative.images > 0) {
    const grid = document.createElement('div');
    grid.className = 'mediaGrid';
    grid.dataset.count = String(initiative.images);
    
    for (let i = 1; i <= initiative.images; i++) {
      const item = document.createElement('div');
      item.className = 'mediaItem';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Open image ${i} of ${initiative.title}`);
      
      const img = document.createElement('img');
      const imageUrl = buildImageUrl(projectSlug, initiative.assetPrefix, i);
      img.src = imageUrl;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      
      // エラーハンドリング
      img.addEventListener('error', (e) => {
        console.warn('Image load error:', imageUrl);
        item.style.display = 'none';
      });
      
      // クリックでライトボックスを開く
      item.addEventListener('click', () => {
        openLightbox(imageUrl, item);
      });
      
      // キーボードアクセス対応
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(imageUrl, item);
        }
      });
      
      item.appendChild(img);
      grid.appendChild(item);
    }
    
    card.appendChild(grid);
  }
  
  return card;
}

// ============================================
// 動画グリッドの作成（横並び2本〜5本）
// ============================================
function createVideoGrid(videos, projectSlug) {
  const grid = document.createElement('div');
  grid.className = 'video-grid';
  grid.dataset.count = String(videos.length);
  
  videos.forEach((videoData, index) => {
    const videoShell = document.createElement('div');
    videoShell.className = 'video-shell';
    
    const video = document.createElement('video');
    video.className = 'video';
    video.src = videoData.src;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.preload = 'metadata';
    video.muted = true;
    video.loop = true;
    video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
    video.setAttribute('disablepictureinpicture', 'true');
    
    // メディアのアスペクト比に従って枠の縦幅を決定
    video.addEventListener('loadedmetadata', () => {
      videoShell.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
    });
    
    // オーバーレイプレイボタン
    const overlayPlay = document.createElement('button');
    overlayPlay.className = 'video-overlay-play';
    overlayPlay.type = 'button';
    overlayPlay.setAttribute('aria-label', 'Play');
    
    const playIcon = document.createElement('span');
    playIcon.className = 'icon-play';
    overlayPlay.appendChild(playIcon);
    
    // コントロールバー
    const controls = document.createElement('div');
    controls.className = 'video-controls';
    
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'btn-playpause';
    playPauseBtn.type = 'button';
    playPauseBtn.setAttribute('aria-label', 'Play');
    
    const seekBar = document.createElement('input');
    seekBar.className = 'seek';
    seekBar.type = 'range';
    seekBar.min = '0';
    seekBar.max = '100';
    seekBar.value = '0';
    seekBar.setAttribute('aria-label', 'Seek');
    
    const muteBtn = document.createElement('button');
    muteBtn.className = 'btn-mute';
    muteBtn.type = 'button';
    muteBtn.setAttribute('aria-label', 'Mute');
    
    controls.appendChild(playPauseBtn);
    controls.appendChild(seekBar);
    controls.appendChild(muteBtn);
    
    videoShell.appendChild(video);
    videoShell.appendChild(overlayPlay);
    videoShell.appendChild(controls);
    
    initVideoPlayer(videoShell);
    grid.appendChild(videoShell);
  });
  
  return grid;
}

// ============================================
// 画像グリッドの作成
// ============================================
function createImageGrid(images, projectSlug, forceHorizontal = false) {
  if (!images || images.length === 0) return null;
  
  const grid = document.createElement('div');
  grid.className = 'mediaGrid';
  grid.dataset.count = String(images.length);
  
  let layout = null;
  
  // imageGroupsの場合は横並び（画像数分の列）
  if (forceHorizontal) {
    grid.dataset.forceHorizontal = 'true';
    grid.style.gridTemplateColumns = `repeat(${images.length}, 1fr)`;
  } else {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    layout = getImageGridLayout(images.length, isMobile);
    
    // grid-template-columnsを設定
    if (layout.columns > 0) {
      grid.style.gridTemplateColumns = `repeat(${layout.columns}, 1fr)`;
    }
  }
  
  images.forEach((imageData, index) => {
    const item = document.createElement('div');
    item.className = 'mediaItem';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Image ${index + 1}`);
    
    // span設定（forceHorizontalの場合は不要）
    if (!forceHorizontal && layout) {
      const span = layout.spans.find(s => s.index === index);
      if (span) {
        item.style.gridColumn = `span ${span.span}`;
      }
    }
    
    const img = document.createElement('img');
    img.src = imageData.src;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    
    img.addEventListener('error', () => {
      console.warn('Image load error:', imageData.src);
      item.style.display = 'none';
    });
    
    // メディアのアスペクト比に従って枠の縦幅を決定
    img.addEventListener('load', () => {
      item.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
    });
    
    // クリックでライトボックスを開く
    item.addEventListener('click', () => {
      openLightbox(imageData.src, item);
    });
    
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(imageData.src, item);
      }
    });
    
    item.appendChild(img);
    grid.appendChild(item);
  });
  
  return grid;
}

// ============================================
// 施策セクションの作成（cases構造用）
// ============================================
function createInitiativeSection(initiative, projectSlug) {
  const section = document.createElement('div');
  section.className = 'initiative-section';
  
  // 施策名（"Main"の場合は表示しない）
  if (initiative.title && initiative.title !== 'Main') {
    const heading = document.createElement('h4');
    heading.className = 'initiative-name';
    heading.textContent = initiative.title;
    section.appendChild(heading);
  }
  
  // 動画（videos配列がある場合）
  if (initiative.videos && initiative.videos.length > 0) {
    const videoGrid = createVideoGrid(initiative.videos, projectSlug);
    section.appendChild(videoGrid);
  }
  
  // 画像（images配列がある場合）
  if (initiative.images && initiative.images.length > 0) {
    const imageGrid = createImageGrid(initiative.images, projectSlug);
    if (imageGrid) {
      section.appendChild(imageGrid);
    }
  }
  
  // 画像グループ（imageGroups配列がある場合）
  // imageGroupsの場合は横並びで表示（例外措置）
  if (initiative.imageGroups && initiative.imageGroups.length > 0) {
    initiative.imageGroups.forEach((group, groupIndex) => {
      if (group.images && group.images.length > 0) {
        const imageGrid = createImageGrid(group.images, projectSlug, true);
        if (imageGrid) {
          // imageGroups同士の間隔を設定（最後のグループ以外）
          if (groupIndex < initiative.imageGroups.length - 1) {
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            const gap = isMobile ? 'var(--img-gap-sp)' : 'var(--img-gap-pc)';
            imageGrid.style.marginBottom = gap;
          }
          section.appendChild(imageGrid);
        }
      }
    });
  }
  
  return section;
}

// ============================================
// 案件セクションの作成（cases構造用）
// ============================================
function createCaseSection(caseData, projectSlug) {
  const section = document.createElement('section');
  section.className = 'case-section';
  
  // 案件名
  const heading = document.createElement('h3');
  heading.className = 'case-title';
  heading.textContent = caseData.title;
  section.appendChild(heading);
  
  // 施策リスト
  if (caseData.initiatives && caseData.initiatives.length > 0) {
    caseData.initiatives.forEach(initiative => {
      const initiativeSection = createInitiativeSection(initiative, projectSlug);
      section.appendChild(initiativeSection);
    });
  }
  
  return section;
}

// ============================================
// モーダルを開く
// ============================================
function openModal(project) {
  // 既存の動画オブザーバーをクリーンアップ
  cleanupVideoObservers();
  
  // Focusを構築（role + scope）
  let focusValue = project.role || '';
  if (project.scope) {
    if (focusValue) {
      focusValue = `${focusValue} / ${project.scope}`;
    } else {
      focusValue = project.scope;
    }
  }
  
  // モーダルコンテンツを構築
  modalContent.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${project.title}</h2>
      ${project.tagline ? `<p class="modal-tagline">${project.tagline}</p>` : ''}
      <div class="modal-meta">
        <div class="modal-meta-item">
          <img src="https://assets.shuntofujii.com/icons/domain.svg" alt="Domain" class="modal-meta-icon" />
          <div class="modal-meta-content">
            <span class="modal-meta-label">Domain</span>
            <span class="modal-meta-value">${project.category}</span>
          </div>
        </div>
        <div class="modal-meta-item">
          <img src="https://assets.shuntofujii.com/icons/year.svg" alt="Year" class="modal-meta-icon" />
          <div class="modal-meta-content">
            <span class="modal-meta-label">Year</span>
            <span class="modal-meta-value">${project.year}</span>
          </div>
        </div>
        ${focusValue ? `
        <div class="modal-meta-item">
          <img src="https://assets.shuntofujii.com/icons/focus.svg" alt="Focus" class="modal-meta-icon" />
          <div class="modal-meta-content">
            <span class="modal-meta-label">Focus</span>
            <span class="modal-meta-value">${focusValue}</span>
          </div>
        </div>
        ` : ''}
        ${project.tools && project.tools.length > 0 ? `
        <div class="modal-meta-item">
          <img src="https://assets.shuntofujii.com/icons/toolkits.svg" alt="Toolkits" class="modal-meta-icon" />
          <div class="modal-meta-content">
            <span class="modal-meta-label">Toolkits</span>
            <span class="modal-meta-value">${project.tools.join(' / ')}</span>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${project.description ? `
    <div class="modal-description">
      ${project.description.replace(/\n/g, '<br>')}
    </div>
    ` : ''}
  `;
  
  // casesセクションの生成（cases構造がある場合）
  if (project.cases && project.cases.length > 0) {
    const casesSection = document.createElement('section');
    casesSection.className = 'modal-initiatives';
    
    project.cases.forEach(caseData => {
      const caseSection = createCaseSection(caseData, project.projectSlug || 'deteqle');
      casesSection.appendChild(caseSection);
    });
    
    modalContent.appendChild(casesSection);
  }
  // initiativesセクションの生成（既存のinitiatives構造がある場合）
  else if (project.initiatives && project.initiatives.length > 0 && project.projectSlug) {
    const initiativesSection = document.createElement('section');
    initiativesSection.className = 'modal-initiatives';
    
    const initiativeList = document.createElement('div');
    initiativeList.className = 'initiative-list';
    
    project.initiatives.forEach(initiative => {
      const card = createInitiativeCard(initiative, project.projectSlug);
      initiativeList.appendChild(card);
    });
    
    initiativesSection.appendChild(initiativeList);
    modalContent.appendChild(initiativesSection);
  }
  
  
  // モーダルを表示（hidden解除）
  if (modalOverlay && modalContainer) {
    modalOverlay.hidden = false;
    modalContainer.hidden = false;
    isClosing = false;
    
    // 初期状態を設定
    modalContainer.dataset.state = 'closed';
    
    // 次フレームでstateをopenに（transition発火）
    requestAnimationFrame(() => {
      document.body.classList.add('modal-open');
      modalContainer.dataset.state = 'open';
      
    });
  }
  
  document.body.style.overflow = 'hidden';
  
  // 背景要素を後退させる（既存のmodal-backgroundクラスも維持）
  focusVisual.classList.add('modal-background');
  titleBackground.classList.add('modal-background');
  contextPanel.classList.add('modal-background');
  projectNavigation.classList.add('modal-background');
}

// ============================================
// ライトボックスの開閉
// ============================================
let lightboxOriginRect = null;
let lightboxType = 'image'; // 'image' or 'video'

function openLightboxVideo(videoSrc, originElement) {
  if (!lightboxOverlay || !lightboxVideo) return;
  
  lightboxType = 'video';
  
  // 元の動画要素の位置とサイズを取得
  if (originElement) {
    const rect = originElement.getBoundingClientRect();
    lightboxOriginRect = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  } else {
    lightboxOriginRect = null;
  }
  
  // 画像を非表示、動画を表示
  if (lightboxImage) {
    lightboxImage.style.display = 'none';
  }
  lightboxVideo.style.display = 'block';
  lightboxVideo.src = videoSrc;
  lightboxVideo.muted = true;
  lightboxVideo.playsInline = true;
  lightboxVideo.setAttribute('playsinline', 'true');
  lightboxVideo.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
  lightboxVideo.setAttribute('disablepictureinpicture', 'true');
  lightboxOverlay.removeAttribute('hidden');
  lightboxOverlay.classList.remove('closing');
  
  // 動画が読み込まれるまで待つ
  const handleVideoLoad = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (lightboxOriginRect) {
      // 元の位置から開始
      const originX = lightboxOriginRect.x;
      const originY = lightboxOriginRect.y;
      const originWidth = lightboxOriginRect.width;
      const originHeight = lightboxOriginRect.height;
      
      // 最終的な位置（中央）
      const finalX = viewportWidth / 2;
      const finalY = viewportHeight / 2;
      
      // 最終的なサイズ（アスペクト比を維持）
      const videoAspectRatio = lightboxVideo.videoWidth / lightboxVideo.videoHeight;
      let finalWidth = viewportWidth * 0.9;
      let finalHeight = finalWidth / videoAspectRatio;
      
      if (finalHeight > viewportHeight * 0.9) {
        finalHeight = viewportHeight * 0.9;
        finalWidth = finalHeight * videoAspectRatio;
      }
      
      // 初期状態を設定（元の位置とサイズ）
      lightboxVideo.style.position = 'fixed';
      lightboxVideo.style.left = `${originX}px`;
      lightboxVideo.style.top = `${originY}px`;
      lightboxVideo.style.width = `${originWidth}px`;
      lightboxVideo.style.height = `${originHeight}px`;
      lightboxVideo.style.transform = 'translate(-50%, -50%)';
      lightboxVideo.style.transformOrigin = 'center center';
      lightboxVideo.style.opacity = '1';
      lightboxVideo.style.transition = 'none';
      lightboxVideo.style.objectFit = 'cover';
      
      // 次のフレームでアニメーション開始
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lightboxVideo.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
          lightboxVideo.style.left = `${finalX}px`;
          lightboxVideo.style.top = `${finalY}px`;
          lightboxVideo.style.width = `${finalWidth}px`;
          lightboxVideo.style.height = `${finalHeight}px`;
          lightboxVideo.style.objectFit = 'contain';
          
          // アニメーション完了後に自動再生
          setTimeout(() => {
            lightboxVideo.play().catch(e => {
              console.warn('Video autoplay prevented:', e);
            });
          }, 500);
        });
      });
    } else {
      // 元の位置情報がない場合
      lightboxVideo.style.position = '';
      lightboxVideo.style.left = '';
      lightboxVideo.style.top = '';
      lightboxVideo.style.width = '';
      lightboxVideo.style.height = '';
      lightboxVideo.style.opacity = '1';
      lightboxVideo.style.transform = 'translate(-50%, -50%) scale(1)';
      lightboxVideo.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    }
  };
  
  lightboxVideo.addEventListener('loadedmetadata', handleVideoLoad, { once: true });
  
  // 既に読み込まれている場合
  if (lightboxVideo.readyState >= 1) {
    handleVideoLoad();
  }
}

function openLightbox(imageSrc, originElement) {
  if (!lightboxOverlay || !lightboxImage) return;
  
  lightboxType = 'image';
  
  // 元の画像の位置とサイズを取得
  if (originElement) {
    const rect = originElement.getBoundingClientRect();
    lightboxOriginRect = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  } else {
    lightboxOriginRect = null;
  }
  
  // 動画を非表示、画像を表示
  if (lightboxVideo) {
    lightboxVideo.style.display = 'none';
    lightboxVideo.pause();
    lightboxVideo.src = '';
  }
  if (lightboxImage) {
    lightboxImage.style.display = 'block';
  }
  
  lightboxImage.src = imageSrc;
  lightboxOverlay.removeAttribute('hidden');
  lightboxOverlay.classList.remove('closing');
  
  // 画像が読み込まれるまで待つ
  const handleImageLoad = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (lightboxOriginRect) {
      // 元の位置から開始
      const originX = lightboxOriginRect.x;
      const originY = lightboxOriginRect.y;
      const originWidth = lightboxOriginRect.width;
      const originHeight = lightboxOriginRect.height;
      
      // 最終的な位置（中央）
      const finalX = viewportWidth / 2;
      const finalY = viewportHeight / 2;
      
      // 最終的なサイズ（アスペクト比を維持）
      const imageAspectRatio = lightboxImage.naturalWidth / lightboxImage.naturalHeight;
      let finalWidth = viewportWidth * 0.9;
      let finalHeight = finalWidth / imageAspectRatio;
      
      if (finalHeight > viewportHeight * 0.9) {
        finalHeight = viewportHeight * 0.9;
        finalWidth = finalHeight * imageAspectRatio;
      }
      
      // 初期状態を設定（元の位置とサイズ）
      lightboxImage.style.position = 'fixed';
      lightboxImage.style.left = `${originX}px`;
      lightboxImage.style.top = `${originY}px`;
      lightboxImage.style.width = `${originWidth}px`;
      lightboxImage.style.height = `${originHeight}px`;
      lightboxImage.style.transform = 'translate(-50%, -50%)';
      lightboxImage.style.transformOrigin = 'center center';
      lightboxImage.style.opacity = '1';
      lightboxImage.style.transition = 'none';
      lightboxImage.style.objectFit = 'cover';
      
      // 次のフレームでアニメーション開始
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lightboxImage.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
          lightboxImage.style.left = `${finalX}px`;
          lightboxImage.style.top = `${finalY}px`;
          lightboxImage.style.width = `${finalWidth}px`;
          lightboxImage.style.height = `${finalHeight}px`;
          lightboxImage.style.objectFit = 'contain';
        });
      });
    } else {
      // 元の位置情報がない場合は従来のアニメーション
      lightboxImage.style.position = '';
      lightboxImage.style.left = '';
      lightboxImage.style.top = '';
      lightboxImage.style.width = '';
      lightboxImage.style.height = '';
      lightboxImage.style.opacity = '1';
      lightboxImage.style.transform = 'translate(-50%, -50%) scale(1)';
      lightboxImage.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    }
  };
  
  lightboxImage.onload = handleImageLoad;
  
  // 既に読み込まれている場合
  if (lightboxImage.complete && lightboxImage.naturalWidth > 0) {
    handleImageLoad();
  }
}

function closeLightbox() {
  if (!lightboxOverlay) return;
  
  // 閉じるアニメーション開始：背景を透明にする
  lightboxOverlay.classList.add('closing');
  
  if (lightboxType === 'video' && lightboxVideo) {
    // 動画を閉じる
    if (lightboxOriginRect) {
      // 元の位置に戻るアニメーション
      const originX = lightboxOriginRect.x;
      const originY = lightboxOriginRect.y;
      const originWidth = lightboxOriginRect.width;
      const originHeight = lightboxOriginRect.height;
      
      // 動画を先に停止
      lightboxVideo.pause();
      
      lightboxVideo.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      lightboxVideo.style.left = `${originX}px`;
      lightboxVideo.style.top = `${originY}px`;
      lightboxVideo.style.width = `${originWidth}px`;
      lightboxVideo.style.height = `${originHeight}px`;
      lightboxVideo.style.opacity = '0';
      lightboxVideo.style.objectFit = 'cover';
      
      setTimeout(() => {
        // まず動画のsrcをクリア（動画を非表示にする）
        lightboxVideo.src = '';
        lightboxVideo.style.display = 'none';
        
        // 次にhidden属性を設定
        lightboxOverlay.setAttribute('hidden', '');
        
        // 最後にclosingクラスを削除してスタイルをクリーンアップ
        lightboxOverlay.classList.remove('closing');
        lightboxVideo.style.position = '';
        lightboxVideo.style.left = '';
        lightboxVideo.style.top = '';
        lightboxVideo.style.width = '';
        lightboxVideo.style.height = '';
        lightboxVideo.style.transform = '';
        lightboxVideo.style.transformOrigin = '';
        lightboxVideo.style.transition = '';
        lightboxVideo.style.objectFit = '';
        lightboxOriginRect = null;
      }, 400);
    } else {
      // 動画を先に停止
      lightboxVideo.pause();
      
      lightboxVideo.style.opacity = '0';
      lightboxVideo.style.transform = 'translate(-50%, -50%) scale(0.9)';
      
      setTimeout(() => {
        // まず動画のsrcをクリア（動画を非表示にする）
        lightboxVideo.src = '';
        lightboxVideo.style.display = 'none';
        
        // 次にhidden属性を設定
        lightboxOverlay.setAttribute('hidden', '');
        
        // 最後にclosingクラスを削除してスタイルをクリーンアップ
        lightboxOverlay.classList.remove('closing');
        lightboxVideo.style.position = '';
        lightboxVideo.style.left = '';
        lightboxVideo.style.top = '';
        lightboxVideo.style.width = '';
        lightboxVideo.style.height = '';
        lightboxVideo.style.transform = '';
        lightboxVideo.style.transformOrigin = '';
        lightboxVideo.style.transition = '';
        lightboxVideo.style.objectFit = '';
      }, 400);
    }
    return;
  }
  
  // 画像を閉じる
  if (!lightboxImage) return;
  
  if (lightboxOriginRect) {
    // 元の位置に戻るアニメーション
    const originX = lightboxOriginRect.x;
    const originY = lightboxOriginRect.y;
    const originWidth = lightboxOriginRect.width;
    const originHeight = lightboxOriginRect.height;
    
    lightboxImage.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    lightboxImage.style.left = `${originX}px`;
    lightboxImage.style.top = `${originY}px`;
    lightboxImage.style.width = `${originWidth}px`;
    lightboxImage.style.height = `${originHeight}px`;
    lightboxImage.style.opacity = '0';
    
    setTimeout(() => {
      lightboxOverlay.setAttribute('hidden', '');
      lightboxOverlay.classList.remove('closing');
      lightboxImage.src = '';
      lightboxImage.style.position = '';
      lightboxImage.style.left = '';
      lightboxImage.style.top = '';
      lightboxImage.style.width = '';
      lightboxImage.style.height = '';
      lightboxImage.style.transform = '';
      lightboxImage.style.transformOrigin = '';
      lightboxImage.style.transition = '';
      lightboxImage.style.objectFit = '';
      lightboxOriginRect = null;
    }, 400);
  } else {
    // 従来のアニメーション
    lightboxImage.style.opacity = '0';
    lightboxImage.style.transform = 'translate(-50%, -50%) scale(0.9)';
    
    setTimeout(() => {
      lightboxOverlay.setAttribute('hidden', '');
      lightboxOverlay.classList.remove('closing');
      lightboxImage.src = '';
      lightboxImage.style.position = '';
      lightboxImage.style.left = '';
      lightboxImage.style.top = '';
      lightboxImage.style.width = '';
      lightboxImage.style.height = '';
      lightboxImage.style.transform = '';
      lightboxImage.style.transformOrigin = '';
      lightboxImage.style.transition = '';
      lightboxImage.style.objectFit = '';
    }, 400);
  }
}

// ============================================
// モーダルを閉じる
// ============================================
function closeModal() {
  // ライトボックスが開いている場合は閉じる
  if (lightboxOverlay && !lightboxOverlay.hidden) {
    closeLightbox();
  }
  
  // 全てのインライン動画を停止してposterに戻す
  stopAllInlineVideos();
  
  // 動画を停止してオブザーバーをクリーンアップ
  cleanupVideoObservers();
  
  if (!modalOverlay || !modalContainer) return;
  if (isClosing) return;
  isClosing = true;
  
  // closing状態に設定
  modalContainer.dataset.state = 'closing';
  document.body.classList.remove('modal-open');
  
  // transitionendを待ってから非表示にする
  const onEnd = (e) => {
    // transformのtransitionが終わったら処理
    if (e.target !== modalContainer || e.propertyName !== 'transform') return;
    modalContainer.removeEventListener('transitionend', onEnd);
    modalContainer.dataset.state = 'closed';
    modalOverlay.hidden = true;
    modalContainer.hidden = true;
    isClosing = false;
  };
  modalContainer.addEventListener('transitionend', onEnd);
  
  document.body.style.overflow = '';
  
  // 背景要素を元に戻す
  focusVisual.classList.remove('modal-background');
  titleBackground.classList.remove('modal-background');
  contextPanel.classList.remove('modal-background');
  projectNavigation.classList.remove('modal-background');
  
  // 選択状態をクリアして初期状態に戻す
  selectedProject = null;
  hoveredProject = null;
  currentState = 'initial';
  
  // すべてのサムネイルからselectedクラスを削除
  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  // 初期状態にリセット
  resetToInitialState();
}

// ============================================
// エラー状態の表示
// ============================================
function showErrorState() {
  contextPanel.innerHTML = `
    <div class="context-content">
      <p class="context-text">プロジェクトデータの読み込みに失敗しました。</p>
    </div>
  `;
  titleText.textContent = 'ERROR';
}

// 初期化実行
// ============================================
init();

