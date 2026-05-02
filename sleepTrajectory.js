/**
 * スリープ時の背景軌跡
 * 位置: x = R(tR) cos(θ), y = R(tR) sin(θ)
 * - θ は経過秒 elapsedSec に対して一定角速度で単調に増加（常に同じ時間軸）
 * - tR は別パラメータ rPhaseSec の位相から決める（崩れ期間は速く、通常期間は遅く位相を進める＝dt×係数のみ切替）
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
 * ノイズ倍率（従来どおり elapsed ベース）
 * @param {number} elapsedSec
 * @param {*} config
 */
export function sleepTrajectoryNoiseScale(elapsedSec, config) {
  const { trajectorySpeedRandomMin, trajectorySpeedRandomMax, trajectorySpeedRandomHz } = config;
  const e = Math.max(0, elapsedSec);
  const randomHz = Math.max(0.001, trajectorySpeedRandomHz);
  const noise = smoothValueNoise(e * randomHz, 7.123);
  return lerp(trajectorySpeedRandomMin, trajectorySpeedRandomMax, noise);
}

/**
 * θ は elapsedSec、tForR は rPhaseSec（別積分）で決定。位相→tForR の式は常に同一（リセットなしで連続）。
 *
 * @param {number} elapsedSec 休止開始からの経過（θ 用・リセットは「マウス休止に入った時」のみ）
 * @param {number} rPhaseSec tForR 用位相（毎フレーム dt×係数で加算）
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
export function sleepTrajectoryFromPhase(elapsedSec, rPhaseSec, config) {
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
  const randomRateScale = sleepTrajectoryNoiseScale(e, config);

  const hold = trajectoryQuietHoldSec;
  const q = trajectoryNoiseQuietRate * randomRateScale;
  const c = trajectoryChaosRate * randomRateScale;
  const rMin = trajectoryRMin;
  const rMax = trajectoryRMax;

  const tQuietEnd = Math.min(rMax, hold * q);
  const upFastSec = (rMax - tQuietEnd) / c;
  const TUp = hold + upFastSec;
  const cycleLen = 2 * TUp;

  const phaseTime = cycleLen > 0 ? rPhaseSec % cycleLen : 0;

  let tForR;
  if (phaseTime < TUp) {
    if (phaseTime < hold) {
      tForR = rMin + phaseTime * q;
    } else {
      tForR = tQuietEnd + (phaseTime - hold) * c;
    }
    tForR = Math.min(rMax, Math.max(rMin, tForR));
  } else {
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
