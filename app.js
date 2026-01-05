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
const heroVideoBase = document.getElementById('heroVideoBase');
const heroVideoGlass = document.getElementById('heroVideoGlass');
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
  if (heroVideoGlass) {
    heroVideoGlass.style.display = 'none';
    heroVideoGlass.pause();
    heroVideoGlass.currentTime = 0;
    heroVideoGlass.style.opacity = '0';
  }
  
  // ③ タイトル
  titleText.textContent = 'PORTFOLIO';
  titleText.classList.remove('highlight');
  
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
  
  // ③ タイトルは非表示（hover時も表示しない）
  titleText.classList.remove('highlight');
  
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
    titleText.classList.remove('highlight');
    
    // 動画を停止
    if (heroVideoBase) {
      heroVideoBase.pause();
      heroVideoBase.currentTime = 0;
      heroVideoBase.style.display = 'none';
      heroVideoBase.style.opacity = '0';
    }
    if (heroVideoGlass) {
      heroVideoGlass.pause();
      heroVideoGlass.currentTime = 0;
      heroVideoGlass.style.display = 'none';
      heroVideoGlass.style.opacity = '0';
    }
    
    // ① コンテキストパネルを非表示にする
    contextPanel.classList.remove('visible');
    
    // State0用ガイダンステキストを表示
    guidanceText.classList.add('visible');
    
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
    
    // 2つの動画を同期して更新する関数
    const updateVideo = (video, isBase) => {
      if (!video) return;
      
      // フェードアウト
      video.style.opacity = '0';
      
      setTimeout(() => {
        video.src = heroMedia.src;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('loop', 'true');
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
        
        // 動画を読み込んで再生
        video.load();
        
        // loadeddataイベントで再生を試行（2つの動画を同期）
        video.addEventListener('loadeddata', function playVideo() {
          video.play().catch(e => {
            console.log('Video autoplay prevented:', e);
            // ユーザー操作で再試行するためのガード
            const retryPlay = () => {
              video.play().catch(() => {});
              document.removeEventListener('pointerdown', retryPlay);
              document.removeEventListener('touchstart', retryPlay);
            };
            document.addEventListener('pointerdown', retryPlay, { once: true });
            document.addEventListener('touchstart', retryPlay, { once: true });
          });
          video.removeEventListener('loadeddata', playVideo);
        }, { once: true });
        
        // フェードイン
        video.style.opacity = '1';
        video.classList.add('fade-in');
        
        // アニメーションクラスをリセット
        setTimeout(() => {
          video.classList.remove('fade-in');
        }, 700);
      }, isBase ? 100 : 100);
    };
    
    // BaseとGlassの両方を更新
    updateVideo(heroVideoBase, true);
    updateVideo(heroVideoGlass, false);
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
  if (heroVideoGlass) {
    heroVideoGlass.pause();
    heroVideoGlass.currentTime = 0;
    heroVideoGlass.style.display = 'none';
    heroVideoGlass.style.opacity = '0';
  }
  
  // ③ タイトルを初期状態に
  titleText.textContent = 'PORTFOLIO';
  titleText.classList.remove('highlight');
  
  // State0用ガイダンステキストを表示
  guidanceText.classList.add('visible');
  
  // ④ 選択状態を解除
  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.remove('selected');
  });
}

// ============================================
// モーダルを開く
// ============================================
function openModal(project) {
  // Focusを構築（role + scope）
  let focusValue = project.role || '';
  if (project.scope) {
    if (focusValue) {
      focusValue = `${focusValue} / ${project.scope}`;
    } else {
      focusValue = project.scope;
    }
  }
  
  modalContent.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${project.title}</h2>
      ${project.tagline ? `<p class="modal-tagline">${project.tagline}</p>` : ''}
      <div class="modal-meta">
        <div class="modal-meta-item">
          <span class="modal-meta-label">Domain</span>
          <span class="modal-meta-value">${project.category}</span>
        </div>
        ${focusValue ? `
        <div class="modal-meta-item">
          <span class="modal-meta-label">Focus</span>
          <span class="modal-meta-value">${focusValue}</span>
        </div>
        ` : ''}
        <div class="modal-meta-item">
          <span class="modal-meta-label">Year</span>
          <span class="modal-meta-value">${project.year}</span>
        </div>
        ${project.tools && project.tools.length > 0 ? `
        <div class="modal-meta-item">
          <span class="modal-meta-label">Toolkit</span>
          <span class="modal-meta-value">${project.tools.join(' / ')}</span>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${project.description ? `
    <div class="modal-description">
      ${project.description.replace(/\n/g, '<br>')}
    </div>
    ` : ''}
    
    ${project.gallery && project.gallery.length > 0 ? `
    <div class="modal-gallery">
      ${project.gallery.map(item => {
        if (item.type === 'video') {
          return `
            <div class="gallery-item">
              <video controls>
                <source src="${item.src}" type="video/webm">
                お使いのブラウザは動画タグをサポートしていません。
              </video>
              ${item.caption ? `<div class="gallery-caption">${item.caption}</div>` : ''}
            </div>
          `;
        } else {
          return `
            <div class="gallery-item">
              <img src="${item.src || 'https://assets.shuntofujii.com/other/placeholder-image.jpg'}" alt="${item.caption || ''}" 
                   onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'800\\' height=\\'600\\'%3E%3Crect fill=\\'%23111\\' width=\\'800\\' height=\\'600\\'/%3E%3Ctext x=\\'400\\' y=\\'300\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23444\\' font-size=\\'24\\'%3EPlaceholder Image%3C/text%3E%3C/svg%3E'">
              ${item.caption ? `<div class="gallery-caption">${item.caption}</div>` : ''}
            </div>
          `;
        }
      }).join('')}
    </div>
    ` : ''}
    
    ${project.links && project.links.length > 0 ? `
    <div class="modal-links">
      ${project.links.map(link => `
        <a href="${link.url}" class="modal-link" target="_blank" rel="noopener noreferrer">${link.label}</a>
      `).join('')}
    </div>
    ` : ''}
  `;
  
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

// ============================================
// ドットアニメーション（State0用ガイダンステキスト）
// ============================================
// ドットアニメーションは削除（CSSアニメーションに置き換え）

// ============================================
// 初期化実行
// ============================================
init();

