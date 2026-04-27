/**
 * スリープ時の背景軌跡
 * 位置: x = R(tR) cos(θ), y = R(tR) sin(θ)
 * - θ は一定角速度で単調に増加
 * - tR は 0 → Rmax → 0 → … を繰り返す
 * - 上昇/下降の速度にランダム倍率を掛ける（平均倍率は 1.0）
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
 *   trajectoryChaosRate: number,
 *   trajectorySpeedRandomMin: number,
 *   trajectorySpeedRandomMax: number,
 *   trajectorySpeedRandomHz: number
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
    trajectoryChaosRate,
    trajectorySpeedRandomMin,
    trajectorySpeedRandomMax,
    trajectorySpeedRandomHz
  } = config;

  const e = Math.max(0, elapsedSec);
  const theta = trajectoryThetaMin + e * trajectoryAngularRate;
  const randomHz = Math.max(0.001, trajectorySpeedRandomHz);
  const noise = smoothValueNoise(e * randomHz, 7.123);
  const randomRateScale = lerp(trajectorySpeedRandomMin, trajectorySpeedRandomMax, noise);

  const hold = trajectoryQuietHoldSec;
  const q = trajectoryNoiseQuietRate * randomRateScale;
  const c = trajectoryChaosRate * randomRateScale;
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

function hash01(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothStep01(t) {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

function smoothValueNoise(x, seed) {
  const i0 = Math.floor(x);
  const i1 = i0 + 1;
  const frac = x - i0;
  const v0 = hash01(i0 + seed);
  const v1 = hash01(i1 + seed);
  return lerp(v0, v1, smoothStep01(frac));
}
