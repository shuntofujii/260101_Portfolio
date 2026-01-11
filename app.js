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
    
    // イベントリスナーを設定
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
}

// ============================================
// イベントリスナーの設定
// ============================================
function setupEventListeners() {
  // プロジェクトアイテムのhover
  const projectItems = document.querySelectorAll('.project-item');
  projectItems.forEach(item => {
    const projectIndex = parseInt(item.dataset.projectIndex);
    const project = projects[projectIndex];
    
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
  
  // モーダルを閉じる
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  // ESCキーでモーダルを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentState === 'modal') {
      closeModal();
    }
  });
  
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
// 動画再生制御（インライン再生）
// ============================================
function cleanupVideoObservers() {
  // 現在は使用していないが、互換性のため残す
}

// 現在再生中の動画を管理
let currentPlayingVideo = null;

// 全てのインライン動画を停止してposterに戻す
function stopAllInlineVideos() {
  const allVideos = document.querySelectorAll('.video');
  allVideos.forEach(video => {
    video.pause();
    video.currentTime = 0;
    const videoShell = video.closest('.video-shell');
    if (videoShell) {
      const overlayPlay = videoShell.querySelector('.video-overlay-play');
      if (overlayPlay) {
        overlayPlay.style.display = 'grid';
        overlayPlay.style.opacity = '1';
        overlayPlay.style.pointerEvents = 'auto';
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
  
  // コントロールバーの表示/非表示を制御
  let controlsTimeout = null;
  const CONTROLS_HIDE_DELAY = 2000; // 2秒後に非表示

  function showControls() {
    controls.classList.add('visible');
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    // 再生中の場合のみ、一定時間後に非表示
    if (!video.paused) {
      controlsTimeout = setTimeout(() => {
        hideControls();
      }, CONTROLS_HIDE_DELAY);
    }
  }

  function hideControls() {
    controls.classList.remove('visible');
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
      controlsTimeout = null;
    }
  }

  // 再生/停止ボタン更新
  function updatePlayButton() {
    if (video.paused) {
      playPauseBtn.setAttribute('aria-label', 'Play');
      playPauseBtn.classList.remove('playing');
      overlayPlay.style.display = 'grid';
      overlayPlay.style.opacity = '1';
      overlayPlay.style.pointerEvents = 'auto';
      // 一時停止時はコントロールバーを表示
      showControls();
    } else {
      playPauseBtn.setAttribute('aria-label', 'Pause');
      playPauseBtn.classList.add('playing');
      overlayPlay.style.display = 'none';
      overlayPlay.style.opacity = '0';
      overlayPlay.style.pointerEvents = 'none';
      // 再生開始時はコントロールバーを非表示
      hideControls();
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
      video.play().catch(e => {
        console.warn('Video play error:', e);
        updatePlayButton();
      });
      currentPlayingVideo = video;
    } else {
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
  
  // オーバーレイプレイボタン（クリック1回で即再生）
  overlayPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });
  
  // 動画クリック（再生/一時停止）
  video.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  // マウスムーブでコントロールバーを表示
  videoShell.addEventListener('mousemove', (e) => {
    if (!video.paused) {
      showControls();
    }
  });

  // マウスが動画の外に出たら非表示
  videoShell.addEventListener('mouseleave', () => {
    if (!video.paused) {
      hideControls();
    }
  });
  
  // プレイ/一時停止ボタン
  playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  // コントロールバー上でマウスを動かしたときも表示を維持
  controls.addEventListener('mousemove', (e) => {
    e.stopPropagation();
    if (!video.paused) {
      showControls();
    }
  });
  
  // シークバー
  seekBar.addEventListener('input', (e) => {
    e.stopPropagation();
    const percent = seekBar.value / 100;
    video.currentTime = video.duration * percent;
    // シーク操作時はコントロールバーを表示
    if (!video.paused) {
      showControls();
    }
  });
  
  // ミュートボタン
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    updateMuteButton();
    // ミュート操作時はコントロールバーを表示
    if (!video.paused) {
      showControls();
    }
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
      
      // クリックで新規タブで開く
      item.addEventListener('click', () => {
        window.open(imageUrl, '_blank', 'noopener,noreferrer');
      });
      
      // キーボードアクセス対応
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.open(imageUrl, '_blank', 'noopener,noreferrer');
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
  
  // initiativesセクションの生成（DOM要素を直接追加）
  if (project.initiatives && project.initiatives.length > 0 && project.projectSlug) {
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
// モーダルを閉じる
// ============================================
function closeModal() {
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

