// 定数（時間・z-index・URL・カーソル設定など）
/** CSS のレスポンシブブレークポイント（スマホ判定）と揃える */
export const BREAKPOINT_MOBILE_PX = 768;

export const LIGHTBOX_CLOSE_DURATION_MS = 400;
export const LIGHTBOX_VIDEO_PLAY_DELAY_MS = 500;
export const VIDEO_UPDATE_FADE_DELAY_MS = 100;
export const VIDEO_SHOW_FALLBACK_MS = 1200;
export const CURSOR_Z_INDEX = 100;

/** 軌跡ヒット時の hover 維持時間（ms）の下限・上限。この間はランダムに決定する */
export const TRAIL_THUMBNAIL_HOVER_MIN_MS = 5000;
export const TRAIL_THUMBNAIL_HOVER_MAX_MS = 20000;

export const COLOR_TRANSITION_DURATION = 60000;
export const COLOR_UPDATE_THROTTLE_MS = 50;

/** カーソル軌跡（シェーダ・追従・休止軌道）。サイト崩れ抽選は SITE_BROKEN_*。 */
export const CURSOR_CONFIG = {
  shaderPoints: 16,
  curvePoints: 80,
  curveLerp: 0.5,
  /** サムネイル上では追従を強めて尻尾を短く（0〜1、大きいほど短い） */
  curveLerpOnThumbnail: 1,
  radius1: 3,
  radius2: 5,
  /** 角 θ の初期位相（x = R cos θ の θ 開始値） */
  trajectoryThetaMin: 1,
  /** R(t) に渡す t：0 ↔ 50 を同じレートで往復 */
  trajectoryRMin: 0,
  trajectoryRMax: 50,
  /** この秒数までは R 用 t のみ緩やか（長いほど休止開始が「じわっ」と見える） */
  trajectoryQuietHoldSec: 4,
  /** ホールド中の R 用 t の増加速度（秒あたり・小さいほど真円が長持ち） */
  trajectoryNoiseQuietRate: 0.035,
  /** 描画の角速度（rad/秒）。ホールド前後で一定＝最初から崩れ始めと同程度の速さで円を描く */
  trajectoryAngularRate: 1.15,
  /** ホールド後の R 用 t の増加速度（ノイズが大きくなる） */
  trajectoryChaosRate: 1.15,
  /** 上昇・下降速度のランダム倍率レンジ（平均は 1.0） */
  trajectorySpeedRandomMin: 0.75,
  trajectorySpeedRandomMax: 1.25,
  /** ランダム速度ノイズの更新頻度（Hz）。小さいほどなだらか */
  trajectorySpeedRandomHz: 0.18,
  /** .project-item の矩形に足す余白（0 なら拡大前レイアウト枠ぴったり） */
  thumbnailOverlapPadPx: 0,
  /** 重なり時の不透明度を 0/1 に近づける補間係数（毎フレーム） */
  thumbnailOpacityLerp: 0.22,

  /**
   * WebGL 軌跡がマウントされてから、全体の不透明度を 0→1 に持ち上げる秒数。
   * 着地・初期表示で一瞬に出るのを避け、徐々に見えるようにする。
   */
  cursorTrailInitialRevealSec: 1.05,

  /**
   * ページ内にポインタがある状態で、この秒数操作が無いと「画面外と同じ」休止軌跡へ移行する。
   * （ポインタがページ外に出た場合の休止は、この値に関係なく従来どおり）
   */
  cursorIdleSleepTrajectorySec: 12,

  /**
   * state.brokenPeriodActive に追従する視覚ブレンド（0=円・1=崩れ）。
   * 通常へ戻るときはゆっくり下げて「戻った」と分かるまで持続。
   */
  /** 崩れ開始時、見た目が早く激しく乗る（1/s） */
  brokenVisualBlendInPerSec: 2.35,
  /** 通常へ: 大きいほど早く見た目が円へ（state より遅れを解消しやすい） */
  brokenVisualBlendOutPerSec: 0.58,
  /** 通常フラグかつ blend がこれ未満なら 0 にスナップ（残りの微かな崩れを消す） */
  brokenVisualBlendSnapEps: 0.03,

  /** 崩れ中: 位相の混沌レート c に掛ける倍率（1 より大きいほど R(t) 周方向の位相が速く振れる） */
  brokenTRPhaseAggro: 1.95,
};

export const baseAssetsUrl = 'https://assets.shuntofujii.com';

/** CDN 画像・動画・アイコン共通のキャッシュバスター（先頭は ?）。projects.json / HTML の ?v= と揃える */
export const ASSETS_CACHE_V = '?v=202608081132';

/** プロフィール入場アニメ（Matter.js） */
export const PROFILE_INTRO_ASSETS_V = ASSETS_CACHE_V;
/** 真上を0°、時計回りに真左が90°（Matter は y 下向き正＝上は vy 負） */
export const PROFILE_INTRO_LAUNCH_FROM_UP_MIN_DEG = 45;
export const PROFILE_INTRO_LAUNCH_FROM_UP_MAX_DEG = 90;
/** Matter の目安 y≈1。落下中の加速感（初速は別調整） */
export const PROFILE_INTRO_GRAVITY_Y = 1.52;
/** Engine gravity と掛け合わせるスケール（既定 0.001）。上げると落下が速く重く感じる */
export const PROFILE_INTRO_GRAVITY_SCALE = 0.00112;
/** 最大シミュレーション時間（この時間で強制終了→差し替え） */
export const PROFILE_INTRO_MAX_MS = 8000;
/** 運動エネルギーが下回ってからこの時間経過で静止とみなす */
export const PROFILE_INTRO_SETTLE_MS = 520;
/** 静止判定の運動エネルギー閾値（大きいほど早く終わる） */
export const PROFILE_INTRO_KINETIC_EPS = 3.2;
export const PROFILE_INTRO_START_SIZE_PX = 44;
/** 放出時の基準高さに掛ける倍率（ボタン内へ収めるクリップはそのまま） */
export const PROFILE_INTRO_START_SIZE_SCALE_MIN = 0.86;
export const PROFILE_INTRO_START_SIZE_SCALE_MAX = 1.16;
export const PROFILE_INTRO_TARGET_WIDTH_FRAC = 2 / 3;
/** 静止後 shuntofujii.webp → 重ね画像に見せてからモーダルへ（ms） */
export const PROFILE_INTRO_SWAP_HOLD_MS = 420;
/** 顔の衝突形状（楕円近似）: 画像実寸より細身にする係数 */
export const PROFILE_INTRO_FACE_COLLIDER_WIDTH_RATIO = 0.84;
export const PROFILE_INTRO_FACE_COLLIDER_HEIGHT_RATIO = 0.94;
/** 楕円近似の分割数（多いほど自然、重い） */
export const PROFILE_INTRO_FACE_POLYGON_SIDES = 36;

/** コンテキストパネルで「Opening Soon」を付与するプロジェクト id（projects.json の id と一致） */
export const OPENING_SOON_PROJECT_ID = 'project-08';

/**
 * 動画 prefetch ヒントの同時・上限（`<link rel="prefetch">`。帯域・メインスレッド競合を抑える）
 * 起動時の複数本先読みは PageSpeed の巨大ペイロード要因になるため最小限に抑える。
 */
export const VIDEO_PRELOAD_LINK_MAX_MOBILE = 1;
export const VIDEO_PRELOAD_LINK_MAX_DESKTOP = 2;

/** 起動時に prefetch で温めるヒーロー動画の最大本数（ホバー前に必要な分だけ） */
export const HERO_VIDEO_PREFETCH_COUNT_MOBILE = 1;
export const HERO_VIDEO_PREFETCH_COUNT_DESKTOP = 1;

/** `.project-item` / `.project-thumbnail` の表示サイズ（CLS 用 width/height と一致） */
export const PROJECT_THUMBNAIL_SIZE_PX = 90;

/** ヒーロー動画プレビューと同一トリガー（mouseenter / touchstart）で付与し、SP の :hover ずれを防ぐ */
export const THUMBNAIL_PREVIEW_ACTIVE_CLASS = 'thumbnail-preview-active';

/**
 * 1周目ナビで fetchpriority=high / eager にする先頭件数（残りとループ複製は lazy）。
 * 全件 high だと低スペックで動画 warmup・WebGL と帯域争奪しやすい。
 */
export const THUMBNAIL_FETCH_PRIORITY_COUNT = 2;

/** ナビ描画後、サムネ Ready にならない場合に lite へ落とすまでの待ち（ms） */
export const PERF_MODE_WATCHDOG_MS = 10000;

/** 早期 lite: deviceMemory（GB）がこの値以下なら軽量モード */
export const PERF_MODE_DEVICE_MEMORY_MAX = 4;

/** 早期 lite: hardwareConcurrency がこの値以下なら軽量モード */
export const PERF_MODE_HARDWARE_CONCURRENCY_MAX = 4;

/** ガイダンス「Please select a project」タイプライター（文字追加・削除の間隔・停止） */

/** 通常入力の文字間隔（ms）の乱数範囲 */
export const GUIDANCE_TYPE_MS_MIN = 68;
export const GUIDANCE_TYPE_MS_MAX = 105;

/** 文末からの一括削除時、1文字あたりの間隔（ms）の乱数範囲 */
export const GUIDANCE_DELETE_MS_MIN = 42;
export const GUIDANCE_DELETE_MS_MAX = 72;

export const GUIDANCE_PAUSE_AT_FULL_MS = 3000;
/** 削除完了後〜再入力開始までの短い休止 */
export const GUIDANCE_PAUSE_AT_EMPTY_MS = 400;

/** 1文字入力時に隣接キー誤入力へ分岐する確率（0〜1・ベース値） */
export const GUIDANCE_TYPO_PROBABILITY = 0.14;
/**
 * 直前まで連続してタイプミスしていたとき、ベース確率に掛ける減衰（1回ごとに乗算）。
 * 例: 0.65 なら 2連続で 0.65^2
 */
export const GUIDANCE_TYPO_CONSECUTIVE_DECAY = 0.66;

/** 誤字を直さずに「本来の次の文字」を打ち足すときのベース確率（0〜1） */
export const GUIDANCE_TYPO_CHAIN_CONTINUE_BASE = 0.36;
/** 誤字のあとに足した正しい文字が多いほど、さらに打ち足す確率に掛ける減衰 */
export const GUIDANCE_TYPO_CHAIN_CONTINUE_DECAY = 0.5;
/** 誤字のまま先へ進める正しい文字の最大数（連鎖の上限） */
export const GUIDANCE_TYPO_MAX_APPEND_WHILE_WRONG = 5;

/** 誤入力文字を表示している時間（気づくまで）（ms）—通常の文字間より長めの範囲 */
export const GUIDANCE_TYPO_WRONG_HOLD_MS_MIN = 100;
export const GUIDANCE_TYPO_WRONG_HOLD_MS_MAX = 175;

/** 誤入力あと削除するまでのためらい（ms）の乱数範囲 */
export const GUIDANCE_TYPO_PAUSE_BEFORE_DELETE_MIN_MS = 210;
export const GUIDANCE_TYPO_PAUSE_BEFORE_DELETE_MAX_MS = 400;

/**
 * 正しい文字を打ち直したあと、次の入力へ進むまでの待ち（ms）。
 * 下限・上限は GUIDANCE_TYPE_* に「タイプミス後のひと休み」を足したレンジ。
 */
export const GUIDANCE_TYPO_AFTER_FIX_EXTRA_MIN_MS = 95;
export const GUIDANCE_TYPO_AFTER_FIX_EXTRA_MAX_MS = 270;

// --- サイト全体「崩れ」期間（通常 ↔ 崩れの一元管理・siteBrokenPeriod.js） ---

/** `initSiteBrokenPeriod` 呼び出しからこの時間は必ず通常期間（着地後の猶予） */
export const SITE_BROKEN_GRACE_AFTER_LAND_MS = 5000;

/** 通常中、「崩れへ入るか」評価までの待ち下限（ms）+ ジッター */
export const SITE_BROKEN_EVAL_MIN_MS = 3000;

/** 崩れ中、「通常へ戻るか」評価までの待ち下限（ms）。やや短くして戻りを増やす */
export const SITE_BROKEN_EVAL_MIN_MS_WHILE_BROKEN = 2600;

/** `SITE_BROKEN_EVAL_MIN_MS` に加算するランダム（ms） */
export const SITE_BROKEN_EVAL_JITTER_MS = 7000;

/**
 * 崩れ期間中に候補が来たとき、通常期間へ戻る確率（0〜1）。
 * 通常→崩れより高めにすると「戻る」が目立ちやすい。
 */
export const SITE_BROKEN_TO_NORMAL_CHANCE = 0.68;

/**
 * 通常期間中に候補が来たとき、崩れ期間へ入るベース確率（0〜1）。
 * 実効値は未操作ブースト・連続崩れブースト後に `SITE_BROKEN_TO_BROKEN_CAP` で頭打ち。
 */
export const SITE_BROKEN_TO_BROKEN_CHANCE = 0.48;

/**
 * 未操作が `SITE_BROKEN_IDLE_BOOST_SATURATION_SEC` に達すると、この分だけベース確率に加算（0〜1）。
 */
export const SITE_BROKEN_TO_BROKEN_IDLE_MAX_EXTRA = 0.26;

/** 上記の未操作ブーストが飽和するまでの秒数 */
export const SITE_BROKEN_IDLE_BOOST_SATURATION_SEC = 14;

/**
 * 崩れが終わってからこの秒数以内なら、通常→崩れの確率に追加（終わった直後ほど強い）。
 */
export const SITE_BROKEN_REPEAT_WINDOW_SEC = 12;

/** `SITE_BROKEN_REPEAT_WINDOW_SEC` 直後に足す確率の最大（線形減衰） */
export const SITE_BROKEN_REPEAT_BROKEN_EXTRA = 0.18;

/** 通常→崩れの抽選確率の上限（ブースト合成後） */
export const SITE_BROKEN_TO_BROKEN_CAP = 0.9;

/** 内部 tick（ms） */
export const SITE_BROKEN_POLL_MS = 500;

/**
 * 着地からこの秒数を過ぎると「長め滞在」バイアスが付き始める（猶予後の経過秒）。
 */
export const SITE_BROKEN_DWELL_BIAS_START_SEC = 28;

/**
 * この秒数経過で滞在バイアスが最大（その間は線形）。
 */
export const SITE_BROKEN_DWELL_BIAS_SAT_SEC = 100;

/**
 * `stayBrokenAffinity`（滞在×未操作の合成）が最大のとき、崩れ→通常の確率に掛る係数の下限（0〜1）。
 */
export const SITE_BROKEN_DWELL_TO_NORMAL_SCALE_MIN = 0.11;

/**
 * 滞在バイアス最大時に通常→崩れへ足せる追加確率（あわせて CAP で頭打ち）。
 */
export const SITE_BROKEN_DWELL_TO_BROKEN_EXTRA = 0.32;

/**
 * 滞在×未操作の両方が高いときだけ足す追加確率（「長く見ていて動いてない」とより崩れやすい）。
 */
export const SITE_BROKEN_DWELL_IDLE_SYNERGY_EXTRA = 0.16;
