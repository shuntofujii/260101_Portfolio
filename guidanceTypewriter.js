import {
  GUIDANCE_TYPE_MS_MIN,
  GUIDANCE_TYPE_MS_MAX,
  GUIDANCE_DELETE_MS_MIN,
  GUIDANCE_DELETE_MS_MAX,
  GUIDANCE_PAUSE_AT_FULL_MS,
  GUIDANCE_PAUSE_AT_EMPTY_MS,
  GUIDANCE_TYPO_PROBABILITY,
  GUIDANCE_TYPO_CONSECUTIVE_DECAY,
  GUIDANCE_TYPO_CHAIN_CONTINUE_BASE,
  GUIDANCE_TYPO_CHAIN_CONTINUE_DECAY,
  GUIDANCE_TYPO_MAX_APPEND_WHILE_WRONG,
  GUIDANCE_TYPO_WRONG_HOLD_MS_MIN,
  GUIDANCE_TYPO_WRONG_HOLD_MS_MAX,
  GUIDANCE_TYPO_PAUSE_BEFORE_DELETE_MIN_MS,
  GUIDANCE_TYPO_PAUSE_BEFORE_DELETE_MAX_MS,
  GUIDANCE_TYPO_AFTER_FIX_EXTRA_MIN_MS,
  GUIDANCE_TYPO_AFTER_FIX_EXTRA_MAX_MS
} from './constants.js';
import { state } from './state.js';

/** 末尾の点滅 `_` は `.guidance-cursor` が担当（HTML）。本文のみ更新する */
const FULL_PHRASE = 'Please select a project';

const QWERTY_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randTypeMs() {
  return randomInt(GUIDANCE_TYPE_MS_MIN, GUIDANCE_TYPE_MS_MAX);
}

function randDeleteMs() {
  return randomInt(GUIDANCE_DELETE_MS_MIN, GUIDANCE_DELETE_MS_MAX);
}

/** タイプミス修正直後〜次の文字入力へ（通常の文字間 + 追加のためらい） */
function randDelayAfterTypoFix() {
  return (
    randTypeMs() + randomInt(GUIDANCE_TYPO_AFTER_FIX_EXTRA_MIN_MS, GUIDANCE_TYPO_AFTER_FIX_EXTRA_MAX_MS)
  );
}

function adjacentTypoChar(correct) {
  const lower = correct.toLowerCase();
  if (!/[a-z]/.test(lower)) return correct;

  for (const row of QWERTY_ROWS) {
    const i = row.indexOf(lower);
    if (i === -1) continue;
    const candidates = [];
    if (i > 0) candidates.push(row[i - 1]);
    if (i < row.length - 1) candidates.push(row[i + 1]);
    const letters = candidates.filter((ch) => /[a-z]/.test(ch));
    const pool = letters.length ? letters : candidates;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick || pick === lower) return correct;
    return correct === correct.toUpperCase() ? pick.toUpperCase() : pick;
  }
  return correct;
}

function clampProb(p) {
  return Math.min(0.92, Math.max(0.008, p));
}

export function initGuidanceTypewriter(guidanceTextEl) {
  const mainEl = guidanceTextEl?.querySelector('.guidance-main');
  const cursorEl = guidanceTextEl?.querySelector('.guidance-cursor');
  if (!mainEl || !cursorEl || !guidanceTextEl) return;

  let timeoutId = null;
  let cancelled = false;
  /** 同一ラウンド内で、直近まで連続していたタイプミス回数（正しく一発で打てたら 0 に戻す） */
  let typoStreak = 0;

  function clearTimer() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function schedule(fn, delayMs) {
    clearTimer();
    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      if (!cancelled) fn();
    }, delayMs);
  }

  function effectiveTypoProbability() {
    if (!state.brokenPeriodActive) return 0;
    return clampProb(
      GUIDANCE_TYPO_PROBABILITY * GUIDANCE_TYPO_CONSECUTIVE_DECAY ** typoStreak
    );
  }

  /**
   * `fromIndex` 文字まで表示済みの状態を描画し、ランダムな間隔後に次の1文字を打つ
   */
  function runTyping(fromIndex) {
    if (cancelled) return;
    mainEl.textContent = FULL_PHRASE.slice(0, fromIndex);

    if (fromIndex >= FULL_PHRASE.length) {
      schedule(runDeletingPhase, GUIDANCE_PAUSE_AT_FULL_MS);
      return;
    }

    schedule(() => commitCharAt(fromIndex), randTypeMs());
  }

  function commitCharAt(fromIndex) {
    if (cancelled) return;

    const nextChar = FULL_PHRASE[fromIndex];
    const tryTypo =
      /[a-zA-Z]/.test(nextChar) && Math.random() < effectiveTypoProbability();
    const wrongChar = tryTypo ? adjacentTypoChar(nextChar) : null;
    const doTypo = tryTypo && wrongChar && wrongChar !== nextChar;

    if (!doTypo) {
      typoStreak = 0;
      mainEl.textContent = FULL_PHRASE.slice(0, fromIndex + 1);
      runTyping(fromIndex + 1);
      return;
    }

    mainEl.textContent = FULL_PHRASE.slice(0, fromIndex) + wrongChar;
    schedule(
      () => decideChainOrDeletePhase(fromIndex, wrongChar, 0),
      randomInt(GUIDANCE_TYPO_WRONG_HOLD_MS_MIN, GUIDANCE_TYPO_WRONG_HOLD_MS_MAX)
    );
  }

  /**
   * 誤字のあと、正しい「次々」の文字を誤字のまま打ち足すか、削除フェーズへ
   * @param {number} appendedCount 誤字のあとに足した正しい文字数（連鎖深度）
   */
  function decideChainOrDeletePhase(startIndex, wrongChar, appendedCount) {
    if (cancelled) return;

    const nextPhraseIndex = startIndex + 1 + appendedCount;
    const chainDepth = appendedCount;

    const chainProb = clampProb(
      GUIDANCE_TYPO_CHAIN_CONTINUE_BASE *
        GUIDANCE_TYPO_CHAIN_CONTINUE_DECAY ** chainDepth *
        GUIDANCE_TYPO_CONSECUTIVE_DECAY ** typoStreak
    );

    const canAppendMore =
      nextPhraseIndex < FULL_PHRASE.length &&
      appendedCount < GUIDANCE_TYPO_MAX_APPEND_WHILE_WRONG;

    if (canAppendMore && Math.random() < chainProb) {
      const nextAppend = FULL_PHRASE[nextPhraseIndex];
      mainEl.textContent =
        FULL_PHRASE.slice(0, startIndex) +
        wrongChar +
        FULL_PHRASE.slice(startIndex + 1, nextPhraseIndex + 1);
      schedule(
        () => decideChainOrDeletePhase(startIndex, wrongChar, appendedCount + 1),
        randTypeMs()
      );
      return;
    }

    schedule(
      () => hesitateThenMultiDelete(startIndex, appendedCount),
      randomInt(GUIDANCE_TYPO_PAUSE_BEFORE_DELETE_MIN_MS, GUIDANCE_TYPO_PAUSE_BEFORE_DELETE_MAX_MS)
    );
  }

  function hesitateThenMultiDelete(startIndex, appendedCount) {
    if (cancelled) return;
    const deleteSteps = 1 + appendedCount;
    multiDeleteTail(startIndex, deleteSteps);
  }

  /** 末尾から deleteSteps 回削り、本文が FULL_PHRASE.slice(0, targetPrefixLen) になる */
  function multiDeleteTail(targetPrefixLen, deleteSteps) {
    if (cancelled) return;

    if (deleteSteps <= 0) {
      typoStreak += 1;
      schedule(() => runTyping(targetPrefixLen), randDelayAfterTypoFix());
      return;
    }

    const cur = mainEl.textContent;
    mainEl.textContent = cur.slice(0, -1);
    schedule(() => multiDeleteTail(targetPrefixLen, deleteSteps - 1), randDeleteMs());
  }

  function runDeletingPhase() {
    if (cancelled) return;
    runDeleting(FULL_PHRASE.length - 1);
  }

  function runDeleting(index) {
    if (cancelled) return;
    mainEl.textContent = FULL_PHRASE.slice(0, index);

    if (index > 0) {
      schedule(() => runDeleting(index - 1), randDeleteMs());
      return;
    }

    typoStreak = 0;
    schedule(() => runTyping(0), GUIDANCE_PAUSE_AT_EMPTY_MS);
  }

  function startLoop() {
    cancelled = false;
    typoStreak = 0;
    cursorEl.textContent = '_';
    runTyping(0);
  }

  function stopLoop() {
    cancelled = true;
    clearTimer();
    mainEl.textContent = FULL_PHRASE;
    cursorEl.textContent = '_';
  }

  function syncFromVisibility() {
    if (guidanceTextEl.classList.contains('visible')) {
      startLoop();
    } else {
      stopLoop();
    }
  }

  const observer = new MutationObserver(syncFromVisibility);
  observer.observe(guidanceTextEl, { attributes: true, attributeFilter: ['class'] });

  syncFromVisibility();
}
