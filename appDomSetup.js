import { setRefs, getRefs } from './domRefs.js';

export function initializeAppRefs(options = {}) {
  const {
    openLightbox,
    openLightboxVideo
  } = options;

  setRefs({
    portfolioTitle: document.getElementById('portfolioTitle'),
    profileOpenBtn: document.getElementById('profileOpenBtn'),
    contextPanel: document.getElementById('contextPanel'),
    focusVisual: document.getElementById('focusVisual'),
    heroVideoBase: document.getElementById('bgVideo'),
    bgLayer: document.getElementById('bgLayer'),
    titleBackground: document.getElementById('titleBackground'),
    titleText: document.getElementById('titleText'),
    guidanceText: document.getElementById('guidanceText'),
    projectNavigation: document.getElementById('projectNavigation'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalContainer: document.querySelector('.modal-container'),
    modalClose: document.getElementById('modalClose'),
    modalContent: document.getElementById('modalContent'),
    profileModalOverlay: document.getElementById('profileModalOverlay'),
    profileModalContainer: document.getElementById('profileModalContainer'),
    profileModalClose: document.getElementById('profileModalClose'),
    profileModalContent: document.getElementById('profileModalContent'),
    lightboxOverlay: document.getElementById('lightboxOverlay'),
    lightboxImage: document.getElementById('lightboxImage'),
    lightboxVideo: document.getElementById('lightboxVideo'),
    lightboxClose: document.getElementById('lightboxClose'),
    openLightbox,
    openLightboxVideo
  });

  return getRefs();
}
