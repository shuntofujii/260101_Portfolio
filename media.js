// メディア（画像・動画グリッド、施策カード、動画プレイヤー）
import { state } from './state.js';
import { getRefs } from './domRefs.js';
import { baseAssetsUrl, BREAKPOINT_MOBILE_PX } from './constants.js';
import { attachVideoElement } from './videoCache.js';

function isMobileViewport() {
  return window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE_PX}px)`).matches;
}

// 統一命名規則: {prefix}_{mediaType}_{number}.{ext}
function buildAssetPrefix(initiativeName, caseName = null) {
  return caseName ? `${initiativeName}_${caseName}` : initiativeName;
}

function buildImageUrl(projectSlug, initiativeName, caseName = null, number = 1) {
  const prefix = buildAssetPrefix(initiativeName, caseName);
  return `${baseAssetsUrl}/${projectSlug}/${prefix}_p_${number}.webp`;
}

export function buildVideoUrl(projectSlug, initiativeName, caseName = null, number = 1) {
  const prefix = buildAssetPrefix(initiativeName, caseName);
  return `${baseAssetsUrl}/${projectSlug}/${prefix}_m_${number}.webm`;
}

function getImageGridLayout(count, isMobile = null) {
  if (isMobile === null) isMobile = isMobileViewport();
  if (isMobile) {
    switch (count) {
      case 2: return { columns: 2, spans: [] };
      case 3: return { columns: 2, spans: [{ index: 2, span: 2 }] };
      case 4: return { columns: 2, spans: [] };
      case 5: return { columns: 2, spans: [{ index: 4, span: 2 }] };
      default: return { columns: 1, spans: [] };
    }
  } else {
    switch (count) {
      case 2: return { columns: 2, spans: [] };
      case 3: return { columns: 3, spans: [] };
      case 4: return { columns: 2, spans: [] };
      case 5:
        return {
          columns: 6,
          spans: [
            { index: 0, span: 2 }, { index: 1, span: 2 }, { index: 2, span: 2 },
            { index: 3, span: 3 }, { index: 4, span: 3 }
          ]
        };
      default: return { columns: 1, spans: [] };
    }
  }
}

function equalizeMediaGridRowHeights(grid) {
  if (!grid.dataset.equalHeight) return;
  const items = Array.from(grid.querySelectorAll('.mediaItem'));
  const visibleItems = items.filter(item => item.style.display !== 'none');
  if (visibleItems.length === 0) return;
  const allLoaded = visibleItems.every(item => item.dataset.naturalWidth && item.dataset.naturalHeight);
  if (!allLoaded) return;

  const count = items.length;
  const layout = getImageGridLayout(count, isMobileViewport());
  const columns = layout.columns || 1;
  const gap = parseFloat(getComputedStyle(grid).gap) || 0;
  const gridWidth = grid.offsetWidth;
  const colWidth = (gridWidth - gap * (columns - 1)) / columns;

  const rowForIndex = [];
  let row = 0, col = 0;
  for (let i = 0; i < count; i++) {
    const span = (layout.spans && layout.spans.find(s => s.index === i)) ? layout.spans.find(s => s.index === i).span : 1;
    if (col + span > columns && col > 0) { row++; col = 0; }
    rowForIndex[i] = row;
    col += span;
    if (col >= columns) { row++; col = 0; }
  }

  const rowMaxHeights = [];
  for (let i = 0; i < count; i++) {
    if (items[i].style.display === 'none') continue;
    const r = rowForIndex[i];
    const w = Number(items[i].dataset.naturalWidth);
    const h = Number(items[i].dataset.naturalHeight);
    if (!w || !h) continue;
    const span = (layout.spans && layout.spans.find(s => s.index === i)) ? layout.spans.find(s => s.index === i).span : 1;
    const itemWidth = colWidth * span + (span - 1) * gap;
    const naturalHeight = itemWidth * (h / w);
    if (rowMaxHeights[r] == null || naturalHeight > rowMaxHeights[r]) rowMaxHeights[r] = naturalHeight;
  }

  grid.style.gridTemplateRows = rowMaxHeights.map(h => `${Math.round(h)}px`).join(' ');
}

export function createImageGrid(images, projectSlug, forceHorizontal = false, initiativeName = null, caseName = null, startIndex = 0, optionAltPrefix = '') {
  if (!images || images.length === 0) return null;

  const grid = document.createElement('div');
  grid.className = 'mediaGrid';
  grid.dataset.count = String(images.length);

  let layout = null;

  if (forceHorizontal) {
    grid.dataset.forceHorizontal = 'true';
    grid.style.gridTemplateColumns = `repeat(${images.length}, 1fr)`;
  } else {
    layout = getImageGridLayout(images.length, isMobileViewport());
    if (layout.columns > 0) grid.style.gridTemplateColumns = `repeat(${layout.columns}, 1fr)`;
    if (images.length >= 2 && layout.columns >= 2) grid.dataset.equalHeight = 'true';
  }

  images.forEach((imageData, index) => {
    const position = startIndex + index + 1;
    const altText = (imageData && imageData.caption)
      ? String(imageData.caption).trim()
      : (optionAltPrefix ? `${optionAltPrefix} 画像 ${position}` : `画像 ${position}`);

    const item = document.createElement('div');
    item.className = 'mediaItem';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', altText);

    if (!forceHorizontal && layout && layout.spans) {
      const span = layout.spans.find(s => s.index === index);
      if (span) item.style.gridColumn = `span ${span.span}`;
    }

    if (!grid.dataset.equalHeight) {
      item.style.aspectRatio = '16 / 9';
    }

    const img = document.createElement('img');
    let imageUrl;
    if (imageData && (imageData.src || typeof imageData === 'string')) {
      imageUrl = imageData.src || imageData;
    } else if (initiativeName) {
      const number = startIndex + index + 1;
      imageUrl = buildImageUrl(projectSlug, initiativeName, caseName, number);
    } else {
      imageUrl = imageData && imageData.src ? imageData.src : '';
    }

    img.src = imageUrl;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = altText;

    img.addEventListener('error', () => {
      console.warn('Image load error:', imageUrl);
      item.style.display = 'none';
    });

    img.addEventListener('load', () => {
      if (grid.dataset.equalHeight) {
        item.dataset.naturalWidth = String(img.naturalWidth);
        item.dataset.naturalHeight = String(img.naturalHeight);
        equalizeMediaGridRowHeights(grid);
      } else {
        item.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
      }
    });

    const openLightbox = () => {
      const refs = getRefs();
      if (typeof refs.openLightbox === 'function') refs.openLightbox(imageUrl, item);
    };

    item.addEventListener('click', openLightbox);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox();
      }
    });

    item.appendChild(img);
    grid.appendChild(item);
  });

  return grid;
}

export function stopAllInlineVideos() {
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
      if (controls) controls.classList.remove('visible');
    }
  });
  state.currentPlayingVideo = null;
}

export function initVideoPlayer(videoShell) {
  const video = videoShell.querySelector('.video');
  const overlayPlay = videoShell.querySelector('.video-overlay-play');
  const controls = videoShell.querySelector('.video-controls');
  const playPauseBtn = controls?.querySelector('.btn-playpause');
  const seekBar = controls?.querySelector('.seek');
  const muteBtn = controls?.querySelector('.btn-mute');

  if (!video || !overlayPlay || !controls) return;

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

  function updatePlayButton() {
    if (video.paused) {
      playPauseBtn.setAttribute('aria-label', 'Play');
      playPauseBtn.classList.remove('playing');
    } else {
      playPauseBtn.setAttribute('aria-label', 'Pause');
      playPauseBtn.classList.add('playing');
    }
  }

  function updateSeekBar() {
    if (video.duration) seekBar.value = (video.currentTime / video.duration) * 100;
  }

  function updateMuteButton() {
    if (video.muted) {
      muteBtn.setAttribute('aria-label', 'Unmute');
      muteBtn.classList.add('muted');
    } else {
      muteBtn.setAttribute('aria-label', 'Mute');
      muteBtn.classList.remove('muted');
    }
  }

  function openLightboxVideo() {
    const refs = getRefs();
    const src = video.dataset.canonicalVideoSrc || video.src;
    if (typeof refs.openLightboxVideo === 'function') refs.openLightboxVideo(src, videoShell);
  }

  function togglePlay() {
    if (video.paused) {
      stopAllInlineVideos();
      enterPlayingState();
      video.play().catch(e => {
        console.warn('Video play error:', e);
        enterPausedState();
      });
      state.currentPlayingVideo = video;
    } else {
      enterPausedState();
      video.pause();
    }
  }

  video.addEventListener('loadedmetadata', () => { seekBar.max = 100; updateSeekBar(); });
  video.addEventListener('timeupdate', updateSeekBar);
  video.addEventListener('play', updatePlayButton);
  video.addEventListener('pause', updatePlayButton);
  video.addEventListener('ended', () => { video.currentTime = 0; updatePlayButton(); });

  overlayPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    openLightboxVideo();
  });

  video.addEventListener('click', (e) => {
    e.stopPropagation();
    if (video.paused) openLightboxVideo();
    else togglePlay();
  });

  playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
  seekBar.addEventListener('input', (e) => {
    e.stopPropagation();
    video.currentTime = (seekBar.value / 100) * video.duration;
  });
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    updateMuteButton();
  });

  video.addEventListener('error', () => { console.warn('Video load error:', video.src); updatePlayButton(); });

  updatePlayButton();
  updateMuteButton();
}

/** モーダル内インライン動画: ポスター・アスペクト比・コントロールを含むシェルを1つ生成 */
function createInteractiveVideoShell(canonicalSrc, posterOverride = null) {
  const posterUrl = posterOverride ?? canonicalSrc.replace(/\.webm$/, '.webp');
  const videoShell = document.createElement('div');
  videoShell.className = 'video-shell';

  const video = document.createElement('video');
  video.className = 'video';
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.preload = 'metadata';
  video.poster = posterUrl;
  attachVideoElement(video, canonicalSrc);
  video.muted = true;
  video.loop = true;
  video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
  video.setAttribute('disablepictureinpicture', 'true');

  const posterImg = new Image();
  posterImg.onload = () => {
    videoShell.style.aspectRatio = `${posterImg.naturalWidth} / ${posterImg.naturalHeight}`;
  };
  posterImg.onerror = () => {
    video.addEventListener('loadedmetadata', () => {
      if (video.videoWidth && video.videoHeight) {
        videoShell.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
      }
    }, { once: true });
  };
  posterImg.src = posterUrl;

  const overlayPlay = document.createElement('button');
  overlayPlay.className = 'video-overlay-play';
  overlayPlay.type = 'button';
  overlayPlay.setAttribute('aria-label', 'Play');
  const playIcon = document.createElement('span');
  playIcon.className = 'icon-play';
  overlayPlay.appendChild(playIcon);

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
  return videoShell;
}

export function createVideoGrid(videos, projectSlug, initiativeName = null, caseName = null) {
  const grid = document.createElement('div');
  grid.className = 'video-grid';
  grid.dataset.count = String(videos.length);

  videos.forEach((videoData, index) => {
    let canonicalSrc;
    let posterOverride = null;
    if (initiativeName) {
      canonicalSrc = buildVideoUrl(projectSlug, initiativeName, caseName, index + 1);
    } else {
      canonicalSrc = videoData.src;
      posterOverride = (videoData.src || '').replace(/\.webm$/, '.webp');
    }
    grid.appendChild(createInteractiveVideoShell(canonicalSrc, posterOverride));
  });

  return grid;
}

export function createInitiativeCard(initiative, projectSlug, showTitle = true) {
  const card = document.createElement('div');
  card.className = 'initiative-card';

  if (showTitle) {
    const head = document.createElement('div');
    head.className = 'initiative-head';
    const name = document.createElement('h4');
    name.className = 'initiative-name';
    name.textContent = initiative.title;
    head.appendChild(name);
    card.appendChild(head);
  }

  const videoCount = initiative.videos ?? (initiative.hasVideo ? 1 : 0);
  if (videoCount > 1) {
    const videoGrid = createVideoGrid(
      Array(videoCount).fill({}),
      projectSlug,
      initiative.assetPrefix,
      null
    );
    card.appendChild(videoGrid);
  } else if (videoCount === 1) {
    const videoSrc = buildVideoUrl(projectSlug, initiative.assetPrefix, null, 1);
    card.appendChild(createInteractiveVideoShell(videoSrc));
  }

  if (initiative.imageGroups && initiative.imageGroups.length > 0) {
    let offset = 0;
    initiative.imageGroups.forEach((count, groupIndex) => {
      const syntheticImages = Array(count).fill(null);
      const grid = createImageGrid(
        syntheticImages,
        projectSlug,
        true,
        initiative.assetPrefix,
        null,
        offset,
        initiative.title || ''
      );
      if (grid) {
        if (groupIndex > 0) {
          grid.style.marginTop = isMobileViewport() ? 'var(--img-gap-sp)' : 'var(--img-gap-pc)';
        }
        card.appendChild(grid);
      }
      offset += count;
    });
  } else if (initiative.images > 0) {
    const syntheticImages = Array(initiative.images).fill(null);
    const grid = createImageGrid(
      syntheticImages,
      projectSlug,
      false,
      initiative.assetPrefix,
      null,
      0,
      initiative.title || ''
    );
    if (grid) card.appendChild(grid);
  }

  return card;
}

export function createInitiativeSection(initiative, projectSlug) {
  const section = document.createElement('div');
  section.className = 'initiative-section';

  if (initiative.title && initiative.title !== 'Main') {
    const heading = document.createElement('h4');
    heading.className = 'initiative-name';
    heading.textContent = initiative.title;
    section.appendChild(heading);
  }

  if (initiative.assetPrefix) {
    section.appendChild(createInitiativeCard(initiative, projectSlug, false));
  }

  return section;
}

export function createCaseSection(caseData, projectSlug) {
  const section = document.createElement('section');
  section.className = 'case-section';

  const heading = document.createElement('h3');
  heading.className = 'case-title';
  heading.textContent = caseData.title;
  section.appendChild(heading);

  if (caseData.initiatives && caseData.initiatives.length > 0) {
    caseData.initiatives.forEach(initiative => {
      section.appendChild(createInitiativeSection(initiative, projectSlug));
    });
  }

  return section;
}
