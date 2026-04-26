/**
 * スリープ時の背景軌跡
 * 位置: x = R(tR) cos(θ), y = R(tR) sin(θ)
 * - θ は一定角速度で単調に増加
 * - tR は 0 → Rmax → 0 → … を、上昇と同じレートで下降して繰り返す
 */

/**
 * @param {number} t パラメータ（t >= 0）
 * @returns {number} R(t)
 */
export function trajectoryR(t) {
  return (
    1 +
    0.01 *
      t *
      (Math.sin(Math.SQRT2 * t) +
        Math.cos(Math.PI * t) +
        Math.sin(0.1 * t * t))
  );
}

/**
 * @param {number} elapsedSec
 * @param {{
 *   trajectoryThetaMin: number,
 *   trajectoryRMin: number,
 *   trajectoryRMax: number,
 *   trajectoryQuietHoldSec: number,
 *   trajectoryNoiseQuietRate: number,
 *   trajectoryAngularRate: number,
 *   trajectoryChaosRate: number
 * }} config
 * @returns {{ theta: number, tForR: number }}
 */
export function sleepTrajectoryParams(elapsedSec, config) {
  const {
    trajectoryThetaMin,
    trajectoryRMin,
    trajectoryRMax,
    trajectoryQuietHoldSec,
    trajectoryNoiseQuietRate,
    trajectoryAngularRate,
    trajectoryChaosRate
  } = config;

  const e = Math.max(0, elapsedSec);
  const theta = trajectoryThetaMin + e * trajectoryAngularRate;

  const hold = trajectoryQuietHoldSec;
  const q = trajectoryNoiseQuietRate;
  const c = trajectoryChaosRate;
  const rMin = trajectoryRMin;
  const rMax = trajectoryRMax;

  const tQuietEnd = Math.min(rMax, hold * q);
  const upFastSec = (rMax - tQuietEnd) / c;
  const TUp = hold + upFastSec;
  const cycleLen = 2 * TUp;

  const phaseTime = TUp > 0 ? e % cycleLen : 0;

  let tForR;
  if (phaseTime < TUp) {
    // 上昇: 0 → rMax（従来と同じ二段レート）
    if (phaseTime < hold) {
      tForR = rMin + phaseTime * q;
    } else {
      tForR = tQuietEnd + (phaseTime - hold) * c;
    }
    tForR = Math.min(rMax, Math.max(rMin, tForR));
  } else {
    // 下降: rMax → 0（上昇と対称なレート）
    const tau = phaseTime - TUp;
    if (tau < upFastSec) {
      tForR = rMax - tau * c;
    } else {
      const tau2 = tau - upFastSec;
      tForR = tQuietEnd - tau2 * q;
    }
    tForR = Math.min(rMax, Math.max(rMin, tForR));
  }

  return { theta, tForR };
}
