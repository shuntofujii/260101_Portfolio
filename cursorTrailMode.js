/**
 * カーソル軌跡のモード判定だけをまとめる（描画・Three.js から独立）。
 */

/**
 * @param {boolean} isMouseActive ページ内でポインタが有効か
 * @param {number} perfNow performance.now 相当（ms）
 * @param {number | null} lastUserActivityPerfMs siteBrokenPeriod が更新する最終操作時刻
 * @param {number} idleThresholdSec CURSOR_CONFIG.cursorIdleSleepTrajectorySec
 */
export function shouldUseSleepTrajectory(
  isMouseActive,
  perfNow,
  lastUserActivityPerfMs,
  idleThresholdSec
) {
  const idleSec =
    lastUserActivityPerfMs == null ? 0 : Math.max(0, (perfNow - lastUserActivityPerfMs) / 1000);
  const idleTooLong = isMouseActive && idleSec >= idleThresholdSec;
  return !isMouseActive || idleTooLong;
}
