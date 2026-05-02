/**
 * 休止時の軌道計算（sleepTrajectory.js の数式をフレームごとに進める）。
 * Three.js・DOM に依存しない。
 */

import { sleepTrajectoryFromPhase, sleepTrajectoryNoiseScale, trajectoryR } from './sleepTrajectory.js';

/** @typedef {{ sleepModeStartTime: number | null, sleepRPhaseSec: number, prevSleepFrameTime: number | null, sleepOrbitYawRad: number }} SleepTrailRuntime */

export function createSleepTrailRuntime() {
  return {
    sleepModeStartTime: null,
    sleepRPhaseSec: 0,
    prevSleepFrameTime: /** @type {number | null} */ (null),
    sleepOrbitYawRad: 0
  };
}

/**
 * @param {object} p
 * @param {SleepTrailRuntime} p.runtime
 * @param {number} p.clockTimeSec THREE.Clock.getElapsedTime()
 * @param {*} p.config CURSOR_CONFIG
 * @param {number} p.brokenVisualBlend 0〜1
 * @param {number} p.I 半径スケール X
 * @param {number} p.F 半径スケール Y
 * @param {number} p.wWidth
 * @param {number} p.wHeight
 * @param {number} p.curveLerpNow このフレームのチェーン係数
 * @param {{ lerp: Function, set: Function, copy: Function }[]} p.curvePoints
 */
export function stepSleepTrailFrame(p) {
  const {
    runtime,
    clockTimeSec,
    config,
    brokenVisualBlend,
    I,
    F,
    wWidth,
    wHeight,
    curveLerpNow,
    curvePoints
  } = p;
  const time = clockTimeSec;

  if (runtime.sleepModeStartTime === null) {
    runtime.sleepModeStartTime = time;
    runtime.sleepRPhaseSec = 0;
    runtime.prevSleepFrameTime = time;
    runtime.sleepOrbitYawRad = Math.random() * Math.PI * 2;
    const { theta: th0, tForR: tr0 } = sleepTrajectoryFromPhase(0, 0, config);
    const R0 = trajectoryR(tr0);
    const th = th0 + runtime.sleepOrbitYawRad;
    const initialD = I * R0 * Math.cos(th);
    const initialV = F * R0 * Math.sin(th);
    const initialX = initialD / (wWidth / 2);
    const initialY = -initialV / (wHeight / 2);
    const n = curvePoints.length;
    for (let i = 0; i < n; i++) curvePoints[i].set(initialX, initialY);
  }

  const elapsedSinceSleep = time - runtime.sleepModeStartTime;
  const dtRaw = time - (runtime.prevSleepFrameTime ?? time);
  const dt = Math.max(0, Math.min(0.15, dtRaw));
  runtime.prevSleepFrameTime = time;

  const blend = brokenVisualBlend;
  const randomRateScale = sleepTrajectoryNoiseScale(elapsedSinceSleep, config);
  const q = config.trajectoryNoiseQuietRate * randomRateScale;
  const c = config.trajectoryChaosRate * randomRateScale;
  const cAggro = c * (config.brokenTRPhaseAggro ?? 1);
  runtime.sleepRPhaseSec += dt * (q + (cAggro - q) * blend);

  const { theta: thetaBase, tForR: tForRRaw } = sleepTrajectoryFromPhase(
    elapsedSinceSleep,
    runtime.sleepRPhaseSec,
    config
  );

  const theta = thetaBase + runtime.sleepOrbitYawRad;
  const R = trajectoryR(tForRRaw);
  const D = I * R * Math.cos(theta);
  const V = F * R * Math.sin(theta);
  const x = D / (wWidth / 2);
  const y = -V / (wHeight / 2);

  const n = curvePoints.length;
  for (let i = n - 1; i > 0; i--) {
    curvePoints[i].lerp(curvePoints[i - 1], curveLerpNow);
  }
  curvePoints[0].set(x, y);
}
