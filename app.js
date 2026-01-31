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
const heroVideoBase = document.getElementById('bgVideo');
const bgLayer = document.getElementById('bgLayer');
const titleBackground = document.getElementById('titleBackground');
const titleText = document.getElementById('titleText');
const guidanceText = document.getElementById('guidanceText');
const projectNavigation = document.getElementById('projectNavigation');
const modalOverlay = document.getElementById('modalOverlay');
const modalContainer = document.querySelector('.modal-container');
const modalClose = document.getElementById('modalClose');
const modalContent = document.getElementById('modalContent');
const lightboxOverlay = document.getElementById('lightboxOverlay');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxVideo = document.getElementById('lightboxVideo');
const lightboxClose = document.getElementById('lightboxClose');
let isClosing = false;

// ============================================
// カーソルエフェクト管理（自前実装）
// ============================================
let cursorEffectInstance = null;
let colorAnimationFrameId = null;
let colorTransitionStartTime = null;
let cursorAnimationFrameId = null;
let initialHue = null; // ランダムな初期色相（0-360度）

// 色の移り変わり設定
const COLOR_TRANSITION_DURATION = 60000; // 60秒で1周（360度）- よりゆっくりとした色の変化

// カーソルエフェクトの設定（threejs-toysのデフォルト設定）
const CURSOR_CONFIG = {
  shaderPoints: 16, // CodePenの例に合わせて変更（滑らかさ向上）
  curvePoints: 80, // threejs-toysのデフォルト
  curveLerp: 0.5, // CodePenの例に合わせて変更
  radius1: 3, // threejs-toysのデフォルト
  radius2: 5, // threejs-toysのデフォルト
  sleepTimeCoefX: 1.0, // 円を描くための係数（1秒で約1ラジアン回転）
  sleepTimeCoefY: 1.0, // 円を描くための係数（1秒で約1ラジアン回転）
};

// ============================================
// 色相を回るプログラム（共通の色管理）
// ============================================
// 現在の色を保持する変数（カーソルとサムネイルの両方が参照）
let currentAccentColor = null;

// 色相を回るプログラム（全色相を回る）
function getCurrentAccentColor() {
  if (colorTransitionStartTime === null) {
    // 初期化されていない場合は初期色を返す（ランダムな初期色相を使用）
    if (initialHue === null) {
      initialHue = Math.random() * 360; // 0-360度のランダムな色相
    }
    return getColorFromHue(initialHue);
  }

  const currentTime = performance.now();
  const elapsed = currentTime - colorTransitionStartTime;

  // 色相（0-360度）を計算（時間に基づいて循環）
  // 初期色相からのオフセットを加算して、ランダムな開始点から色相を回す
  const hue = (initialHue + (elapsed / COLOR_TRANSITION_DURATION) * 360) % 360;

  // HSV色空間からRGBに変換
  return getColorFromHue(hue);
}

// 色を更新する関数（カーソルとサムネイルの両方に適用）
function updateAccentColor() {
  // 色相を回るプログラムから現在の色を取得
  const color = getCurrentAccentColor();

  // 現在の色を保持
  currentAccentColor = color;

  // テーマカラー（--accent-color）を更新（サムネイルhover時の囲いが参照）
  document.documentElement.style.setProperty('--accent-color', color);

  // カーソルエフェクトの色を更新（カーソルの軌跡が参照）
  updateCursorEffectColor(color);

  return color;
}

// ============================================
// カーソルエフェクトの初期化（自前実装）
// ============================================
async function initCursorEffect() {
  try {
    // Three.jsをインポート
    const THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');

    // 既存のインスタンスを破棄
    if (cursorEffectInstance) {
      destroyCursorEffect();
    }

    // ランダムな初期色相を生成（まだ生成されていない場合）
    if (initialHue === null) {
      initialHue = Math.random() * 360; // 0-360度のランダムな色相
    }

    // 初期色を設定（ランダムな色相から）
    const initialColor = getColorFromHue(initialHue);
    currentAccentColor = initialColor;

    // カーソルエフェクトを初期化
    cursorEffectInstance = createCustomCursorEffect(THREE, initialColor);

    // 色をテーマカラーに設定
    document.documentElement.style.setProperty('--accent-color', initialColor);

    // 色の移り変わりを開始
    startColorTransition();
  } catch (error) {
    console.error('[Cursor Effect] Failed to initialize cursor effect:', error);
  }
}

// ============================================
// 色の移り変わり機能（常にゆっくりと移り変わり続ける）
// ============================================
function startColorTransition() {
  // 既存のアニメーションフレームをキャンセル
  if (colorAnimationFrameId) {
    cancelAnimationFrame(colorAnimationFrameId);
  }

  // 開始時間を記録
  colorTransitionStartTime = performance.now();

  // アニメーションループ
  function animateColor() {
    // 色相を回るプログラムから現在の色を取得し、カーソルとサムネイルの両方に適用
    updateAccentColor();

    // 次のフレームをリクエスト
    colorAnimationFrameId = requestAnimationFrame(animateColor);
  }

  // アニメーションを開始
  animateColor();
}

// ============================================
// HSV色空間からRGBに変換（色相のみ変化、彩度と明度は固定）
// ============================================
function getColorFromHue(hue) {
  // 彩度（Saturation）と明度（Value）を固定
  const saturation = 100; // 100%の彩度（鮮やかな色）
  const value = 100; // 100%の明度（明るい色）

  // HSVからRGBに変換
  const c = (value / 100) * (saturation / 100);
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = (value / 100) - c;

  let r, g, b;

  if (hue < 60) {
    r = c; g = x; b = 0;
  } else if (hue < 120) {
    r = x; g = c; b = 0;
  } else if (hue < 180) {
    r = 0; g = c; b = x;
  } else if (hue < 240) {
    r = 0; g = x; b = c;
  } else if (hue < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  // RGB値を0-255の範囲に変換して16進数に
  const red = Math.round((r + m) * 255);
  const green = Math.round((g + m) * 255);
  const blue = Math.round((b + m) * 255);

  return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

// ============================================
// 自前のカーソルエフェクトを作成（threejs-toysのneonCursorを参考）
// ============================================
function createCustomCursorEffect(THREE, initialColor) {
  const el = document.body;
  const config = { ...CURSOR_CONFIG };

  // シーン、カメラ、レンダラーの作成
  const scene = new THREE.Scene();
  // OrthographicCameraを使用（threejs-toysと同じ）
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.pointerEvents = 'none';
  renderer.domElement.style.zIndex = '100'; // タイトル(250)より下、サムネイル(140)より上
  el.appendChild(renderer.domElement);

  // 色をRGBに変換
  const rgb = hexToRgb(initialColor);
  if (!rgb) {
    console.error('[Cursor Effect] Failed to parse color:', initialColor);
    return null;
  }
  const colorVec = new THREE.Vector3(rgb.r / 255, rgb.g / 255, rgb.b / 255);

  // threejs-toysと同じ実装：PlaneGeometryとフラグメントシェーダーでベジェ曲線を描画
  // uPoints配列を作成（uniform配列として使用）
  // Three.jsでは、uniform配列の各要素を個別に作成する必要がある
  const uPointsUniform = [];
  for (let i = 0; i < config.shaderPoints; i++) {
    uPointsUniform.push(new THREE.Vector2());
  }

  // uRatioとuSizeのuniformを作成
  const uRatio = new THREE.Vector2();
  const uSize = new THREE.Vector2();

  // シェーダーマテリアルを作成（threejs-toysと同じ実装）
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uRatio: { value: uRatio },
      uSize: { value: uSize },
      uPoints: { value: uPointsUniform },
      uColor: { value: colorVec },
    },
    defines: {
      SHADER_POINTS: config.shaderPoints,
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      // threejs-toysと同じ実装：ベジェ曲線の距離計算
      // https://www.shadertoy.com/view/wdy3DD
      // https://www.shadertoy.com/view/MlKcDD
      // Signed distance to a quadratic bezier
      float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C) {
        vec2 a = B - A;
        vec2 b = A - 2.0*B + C;
        vec2 c = a * 2.0;
        vec2 d = A - pos;
        float kk = 1.0 / dot(b,b);
        float kx = kk * dot(a,b);
        float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
        float kz = kk * dot(d,a);
        float res = 0.0;
        float p = ky - kx*kx;
        float p3 = p*p*p;
        float q = kx*(2.0*kx*kx - 3.0*ky) + kz;
        float h = q*q + 4.0*p3;
        if(h >= 0.0){
          h = sqrt(h);
          vec2 x = (vec2(h, -h) - q) / 2.0;
          vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
          float t = uv.x + uv.y - kx;
          t = clamp( t, 0.0, 1.0 );
          // 1 root
          vec2 qos = d + (c + b*t)*t;
          res = length(qos);
        } else {
          float z = sqrt(-p);
          float v = acos( q/(p*z*2.0) ) / 3.0;
          float m = cos(v);
          float n = sin(v)*1.732050808;
          vec3 t = vec3(m + m, -n - m, n - m) * z - kx;
          t = clamp( t, 0.0, 1.0 );
          // 3 roots
          vec2 qos = d + (c + b*t.x)*t.x;
          float dis = dot(qos,qos);
          res = dis;
          qos = d + (c + b*t.y)*t.y;
          dis = dot(qos,qos);
          res = min(res,dis);
          qos = d + (c + b*t.z)*t.z;
          dis = dot(qos,qos);
          res = min(res,dis);
          res = sqrt( res );
        }
        return res;
      }

      uniform vec2 uRatio;
      uniform vec2 uSize;
      uniform vec2 uPoints[SHADER_POINTS];
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float intensity = 1.0;
        float radius = 0.015;

        vec2 pos = (vUv - 0.5) * uRatio;

        vec2 c = (uPoints[0] + uPoints[1]) / 2.0;
        vec2 c_prev;
        float dist = 10000.0;
        for(int i = 0; i < SHADER_POINTS - 1; i++){
          c_prev = c;
          c = (uPoints[i] + uPoints[i + 1]) / 2.0;
          dist = min(dist, sdBezier(pos, c_prev, uPoints[i], c));
        }
        dist = max(0.0, dist);

        float glow = pow(uSize.y / dist, intensity);
        vec3 col = vec3(0.0);
        col += 10.0 * vec3(smoothstep(uSize.x, 0.0, dist));
        col += glow * uColor;

        // Tone mapping
        col = 1.0 - exp(-col);
        col = pow(col, vec3(0.4545));
  
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // PlaneGeometryを作成（フルスクリーン）
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // マウス位置を追跡（2D座標、OrthographicCamera用）
  const mouse = new THREE.Vector2();
  const target = new THREE.Vector2();
  const clock = new THREE.Clock();

  // ポイントの履歴を保存（カーブを作成するため）- threejs-toysと同じ実装
  const curvePoints = new Array(config.curvePoints).fill(0).map(() => new THREE.Vector2());

  // 初期位置を画面中央に設定
  mouse.set(0, 0);
  target.set(0, 0);

  // マウスがブラウザ内にあるかどうかを追跡（threejs-toysと同じ実装）
  // 初期状態ではfalseにして、マウスが動いたときにtrueにする
  let isMouseActive = false;
  let isTouchDevice = false; // タッチデバイスかどうかを判定
  // NOTE:
  // 以前は「sleep modeに入った時点の時間」を都度リセットしていたため、
  // ブラウザ外に出るたびに円運動が毎回同じ点から再開してしまっていた。
  // ここでは「グローバル時間（clock）」を基準に円運動の位相を決めることで、
  // 戻り座標（位相）が毎回固定にならないようにする。

  // 待機時の円の半径（レスポンシブ対応）
  // 「Please select a project_」の文字サイズに比例するように計算
  // フォントサイズの倍数で半径を決定（例：フォントサイズの10倍など）
  const SLEEP_RADIUS_FONT_MULTIPLIER = 10; // フォントサイズに対する倍率
  let currentSleepRadiusX = 150; // 初期値
  let currentSleepRadiusY = 150; // 初期値

  // タッチデバイスの検出（一度でもタッチイベントが発生したらタッチデバイスと判定）
  const detectTouchDevice = () => {
    isTouchDevice = true;
  };

  // マウスイベント（PC版用）
  const handleMouseMove = (e) => {
    // タッチデバイスの場合はマウスイベントを無視（タッチイベントが優先）
    if (isTouchDevice) {
      return;
    }

    // 画面座標を正規化デバイス座標（NDC）に変換（-1から1の範囲）
    // threejs-toysでは、nPositionとして-1から1の範囲で処理される
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    target.set(x, y);
    isMouseActive = true;
  };

  const handleMouseLeave = (e) => {
    // タッチデバイスの場合はマウスイベントを無視
    if (isTouchDevice) {
      return;
    }

    // マウスがブラウザウィンドウから出た場合のみfalseにする
    // mouseleaveイベントは、マウスがブラウザウィンドウから出た時に発火
    if (!e.relatedTarget || e.relatedTarget === null) {
      isMouseActive = false;
    }
  };

  // タッチイベントハンドラー（SP版用）
  const handleTouchStart = (e) => {
    // タッチデバイスとして検出
    detectTouchDevice();

    // タッチ開始時：タッチ位置をカーソル位置として設定
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      target.set(x, y);
      isMouseActive = true;
    }
  };

  const handleTouchMove = (e) => {
    // タッチ移動時：タッチ位置をカーソル位置として更新
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      target.set(x, y);
      isMouseActive = true;
    }
  };

  const handleTouchEnd = (e) => {
    // タッチ終了時：sleep modeに移行（画面中央で円を描く）
    isMouseActive = false;
  };

  const handleTouchCancel = (e) => {
    // タッチキャンセル時：sleep modeに移行（画面中央で円を描く）
    isMouseActive = false;
  };

  // threejs-toysと同じ実装：documentに対してイベントリスナーを設定
  // renderer.domElementはpointer-events: noneのため、documentに設定
  document.addEventListener('mousemove', handleMouseMove);
  // mouseleaveとmouseoutの両方を設定（ブラウザ互換性のため）
  document.addEventListener('mouseleave', handleMouseLeave);
  document.addEventListener('mouseout', handleMouseLeave);

  // タッチイベント（スマホ版対応）
  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

  // リサイズイベント（threejs-toysと同じ実装）
  const handleResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);

    // uRatioとuSizeを更新（threejs-toysと同じ実装）
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width >= height) {
      uRatio.set(1, height / width);
      uSize.set(config.radius1, config.radius2);
      uSize.multiplyScalar(1 / width);
    } else {
      uRatio.set(width / height, 1);
      uSize.set(config.radius1, config.radius2);
      uSize.multiplyScalar(1 / height);
    }

    material.uniforms.uRatio.value = uRatio;
    material.uniforms.uSize.value = uSize;

    // 待機時の円の半径を「Please select a project_」の文字サイズに比例して計算
    if (guidanceText) {
      const computedStyle = window.getComputedStyle(guidanceText);
      const fontSize = parseFloat(computedStyle.fontSize); // px単位で取得

      // フォントサイズに倍率を掛けて半径を計算
      currentSleepRadiusX = fontSize * SLEEP_RADIUS_FONT_MULTIPLIER;
      currentSleepRadiusY = fontSize * SLEEP_RADIUS_FONT_MULTIPLIER;
    } else {
      // guidanceTextが取得できない場合のフォールバック
      currentSleepRadiusX = 150;
      currentSleepRadiusY = 150;
    }
  };
  window.addEventListener('resize', handleResize);

  // 初期リサイズを実行
  handleResize();

  // アニメーションループ
  function animate() {
    cursorAnimationFrameId = requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    if (isMouseActive) {
      // マウス位置を滑らかに追跡（threejs-toysと同じ実装：直接lerp）
      mouse.lerp(target, config.curveLerp);

      // ポイントの履歴を更新（threejs-toysと同じ実装）
      // curvePoints配列を後ろから前に向かってlerpで更新
      for (let i = config.curvePoints - 1; i > 0; i--) {
        curvePoints[i].lerp(curvePoints[i - 1], config.curveLerp);
      }
      // 最初のポイントを現在のマウス位置に設定
      curvePoints[0].copy(mouse);
    } else {
      // マウスがブラウザ外に出た場合、画面中央を回る円を描く
      // 重要：円運動の位相は「グローバル時間」に紐づけ、戻り座標が毎回同じ点にならないようにする。
      // 角度オフセット（-π/2）により、time=0 では円の最も下の点から始まる。

      // 画面サイズに応じた半径を計算（threejs-toysと同じ実装）
      // threejs-toysでは、wWidth（画面の幅）とwidth（レンダラーの幅）を使用
      const wWidth = window.innerWidth;
      const wHeight = window.innerHeight;
      const width = renderer.domElement.width / renderer.getPixelRatio();

      // レスポンシブ対応：SP版のサイズを起点として、画面幅に応じて拡大した半径を使用
      // threejs-toysと同じ計算：I = sleepRadiusX * wWidth / width, F = sleepRadiusY * wWidth / width
      const I = (currentSleepRadiusX * wWidth) / width;
      const F = (currentSleepRadiusY * wWidth) / width;
      // グローバル時間（time）に紐づけた角度（位相）
      // 角度 = -π/2 + time * sleepTimeCoefX
      const angleX = -Math.PI / 2 + time * config.sleepTimeCoefX;
      const angleY = -Math.PI / 2 + time * config.sleepTimeCoefY;

      const cosX = Math.cos(angleX);
      const sinY = Math.sin(angleY);

      // threejs-toysと同じ計算：D = I * N, V = F * x
      // ここで、N = cosX, x = sinY
      const D = I * cosX;
      const V = F * sinY;

      // threejs-toysでは、t.points[0].set(D, V)で直接ピクセル座標を設定
      // しかし、その後uPointsに変換する際に、0.5 * point * uRatioの変換が必要
      // そのため、まずNDC座標に変換してから、0.5 * point * uRatioの変換を行う
      // 正規化デバイス座標（NDC）に変換（-1から1の範囲）
      // 画面中央が(0, 0)になるように変換
      const x = D / (wWidth / 2);
      const y = -V / (wHeight / 2);

      // threejs-toysと同じ実装：スリープモードでは、curvePoints[0]に直接設定
      // ポイントの履歴を更新（threejs-toysと同じ実装）
      // curvePoints配列を後ろから前に向かってlerpで更新
      for (let i = config.curvePoints - 1; i > 0; i--) {
        curvePoints[i].lerp(curvePoints[i - 1], config.curveLerp);
      }
      // 最初のポイントをスリープモードの位置に直接設定（NDC座標）
      curvePoints[0].set(x, y);
    }

    // threejs-toysと同じ実装：SplineCurveを使用してポイントを取得
    // SplineCurveの代わりにCatmullRomCurve3を使用（Three.jsにはSplineCurveがないため）
    if (curvePoints.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(
        curvePoints.map(p => new THREE.Vector3(p.x, p.y, 0)),
        false,
        'centripetal'
      );

      // uPoints配列を更新（threejs-toysと同じ実装）
      // threejs-toysでは、nPosition（-1から1）を0.5 * nPosition * uRatioに変換
      for (let i = 0; i < config.shaderPoints; i++) {
        const t = i / (config.shaderPoints - 1);
        const point = curve.getPoint(t);
        // threejs-toysと同じ変換：0.5 * point * uRatio
        uPointsUniform[i].set(
          0.5 * point.x * uRatio.x,
          0.5 * point.y * uRatio.y
        );
      }
    } else {
      // 履歴が少ない場合は、現在のマウス位置を使用
      // threejs-toysと同じ変換：0.5 * mouse * uRatio
      for (let i = 0; i < config.shaderPoints; i++) {
        uPointsUniform[i].set(
          0.5 * mouse.x * uRatio.x,
          0.5 * mouse.y * uRatio.y
        );
      }
    }

    // uniformを更新（threejs-toysと同じ実装：配列の各要素を直接更新）
    // Three.jsでは、uniform配列の各要素を個別に更新する必要がある
    if (material.uniforms.uPoints && material.uniforms.uPoints.value) {
      for (let i = 0; i < config.shaderPoints; i++) {
        if (material.uniforms.uPoints.value[i]) {
          material.uniforms.uPoints.value[i].copy(uPointsUniform[i]);
        } else {
          // 要素が存在しない場合は、新しく作成
          material.uniforms.uPoints.value[i] = uPointsUniform[i].clone();
        }
      }
      material.uniforms.uPoints.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  animate();

  // 破棄関数
  function destroy() {
    if (cursorAnimationFrameId) {
      cancelAnimationFrame(cursorAnimationFrameId);
      cursorAnimationFrameId = null;
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseleave', handleMouseLeave);
    document.removeEventListener('mouseout', handleMouseLeave);
    // タッチイベントリスナーの削除（スマホ版対応）
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchCancel);
    window.removeEventListener('resize', handleResize);
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer.dispose();
    material.dispose();
    geometry.dispose();
  }

  return {
    scene,
    camera,
    renderer,
    material,
    geometry,
    mesh,
    destroy,
    updateColor: (color) => {
      const rgb = hexToRgb(color);
      if (rgb) {
        const colorVec = new THREE.Vector3(rgb.r / 255, rgb.g / 255, rgb.b / 255);
        material.uniforms.uColor.value = colorVec;
      }
    }
  };
}

// ============================================
// カーソルエフェクトの色を更新
// ============================================
function updateCursorEffectColor(color) {
  if (!cursorEffectInstance) {
    return;
  }

  try {
    cursorEffectInstance.updateColor(color);
  } catch (error) {
    console.error('[Cursor Effect] Failed to update color:', error);
  }
}

// ============================================
// カーソルエフェクトを破棄
// ============================================
function destroyCursorEffect() {
  if (cursorEffectInstance) {
    cursorEffectInstance.destroy();
    cursorEffectInstance = null;
  }
}

// ============================================
// ヘルパー関数: 16進数カラーをRGBに変換
// ============================================
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

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

    // イベントリスナーを設定（プロジェクトアイテムが生成された後）
    setupEventListeners();

    // カーソルエフェクトを初期化
    await initCursorEffect();
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

  // bgLayerも非表示
  if (bgLayer) {
    bgLayer.style.opacity = '0';
    bgLayer.classList.remove('isFading');
  }

  // ③ タイトル
  titleText.textContent = 'PORTFOLIO';

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
    thumbnail.onerror = function () {
      this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3E' + project.title.substring(0, 2) + '%3C/text%3E%3C/svg%3E';
    };

    item.appendChild(thumbnail);
    projectNavigation.appendChild(item);
  });

  // プロジェクトアイテムのイベントリスナーを設定
  setupProjectItemListeners();
}

// ============================================
// プロジェクトアイテムのイベントリスナー設定
// ============================================
function setupProjectItemListeners() {
  // プロジェクトアイテムのhover
  const projectItems = document.querySelectorAll('.project-item');
  projectItems.forEach(item => {
    const projectIndex = parseInt(item.dataset.projectIndex);
    const project = projects[projectIndex];

    if (!project) return;

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

    // スマホ向け：touchstartでhover状態、touchcancel/touchendでは背景動画を継続
    item.addEventListener('touchstart', (e) => {
      if (currentState !== 'modal') {
        handleProjectHover(project, item);
      }
    }, { passive: true });

    // touchcancel/touchendでは背景動画を継続（handleProjectLeaveを呼ばない）

    item.addEventListener('click', () => {
      handleProjectClick(project, item);
    });
  });
}

// ============================================
// イベントリスナーの設定
// ============================================
function setupEventListeners() {
  // プロジェクトアイテムのイベントリスナーを設定
  setupProjectItemListeners();

  // モーダルを閉じる
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  // ESCキーでモーダル/ライトボックスを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!lightboxOverlay.hidden) {
        closeLightbox();
      } else if (currentState === 'modal') {
        closeModal();
      }
    }
  });

  // ライトボックスのイベントリスナー
  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightboxOverlay) {
    lightboxOverlay.addEventListener('click', (e) => {
      if (e.target === lightboxOverlay) {
        closeLightbox();
      }
    });
  }

  // ポートフォリオ名をクリックでState0に戻る
  portfolioTitle.addEventListener('click', () => {
    resetToInitialState();
  });

  // SP向け：背景領域をタッチした時に背景動画を停止して待機画面に戻す
  if (focusVisual) {
    focusVisual.addEventListener('touchstart', (e) => {
      // プロジェクトアイテムをタッチした場合は何もしない（handleProjectHoverが処理する）
      if (e.target.closest('.project-item')) {
        return;
      }

      // モーダルが開いている場合は何もしない
      if (currentState === 'modal') {
        return;
      }

      // 背景動画が流れている状態の場合のみ停止して待機画面に戻す
      if (currentState === 'hover' && heroVideoBase && !heroVideoBase.paused) {
        resetToInitialState();
      }
    }, { passive: true });
  }
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

  // bgLayerを表示
  if (bgLayer) {
    bgLayer.classList.remove('isFading');
    bgLayer.style.opacity = '1';
  }

  // ③ タイトルは非表示（hover時も表示しない）

  // ガイダンステキストを非表示（サムネイルhover時のみ）
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

    // 動画を停止
    if (heroVideoBase) {
      heroVideoBase.pause();
      heroVideoBase.currentTime = 0;
      heroVideoBase.style.display = 'none';
      heroVideoBase.style.opacity = '0';
    }

    // ガイダンステキストを表示（hover解除時）
    guidanceText.classList.add('visible');

    // bgLayerをフェードアウト
    if (bgLayer) {
      bgLayer.classList.add('isFading');
      bgLayer.addEventListener('transitionend', function fadeComplete() {
        bgLayer.classList.remove('isFading');
        bgLayer.removeEventListener('transitionend', fadeComplete);
        renderInitialState();
      }, { once: true });
    } else {
      renderInitialState();
    }

    // ① コンテキストパネルを非表示にする
    contextPanel.classList.remove('visible');

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

    // 動画を更新する関数
    const updateVideo = (video) => {
      if (!video) return;

      // フェードアウト
      video.style.opacity = '0';

      setTimeout(() => {
        // 既存のイベントリスナーをクリーンアップ
        const existingListeners = ['loadeddata', 'canplay', 'canplaythrough', 'error'];
        existingListeners.forEach(eventType => {
          video.removeEventListener(eventType, video._playHandler);
          video.removeEventListener(eventType, video._errorHandler);
        });
        video._playHandler = null;
        video._errorHandler = null;

        video.src = heroMedia.src;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.setAttribute('loop', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('playsinline', 'true');
        video.style.display = 'block';

        // 動画が終了したときに再再生（ループのフォールバック）
        const loopHandler = function () {
          video.currentTime = 0;
          video.play().catch(e => {
            console.log('Video replay error:', e);
          });
        };
        video.removeEventListener('ended', loopHandler);
        video.addEventListener('ended', loopHandler);

        // 再生を試行する関数
        const attemptPlay = () => {
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA以上
            video.play().catch(e => {
              console.log('Video autoplay prevented:', e);
              // ユーザー操作で再試行するためのガード
              const retryPlay = () => {
                video.play().catch(() => { });
                document.removeEventListener('pointerdown', retryPlay);
                document.removeEventListener('touchstart', retryPlay);
                document.removeEventListener('click', retryPlay);
              };
              document.addEventListener('pointerdown', retryPlay, { once: true });
              document.addEventListener('touchstart', retryPlay, { once: true });
              document.addEventListener('click', retryPlay, { once: true });
            });
          }
        };

        // 複数のイベントで再生を試行（フォールバック）
        const playHandler = () => {
          attemptPlay();
          video.removeEventListener('loadeddata', playHandler);
          video.removeEventListener('canplay', playHandler);
          video.removeEventListener('canplaythrough', playHandler);
        };
        video._playHandler = playHandler;

        // エラーハンドリング
        const errorHandler = (e) => {
          console.error('Video load error:', e, heroMedia.src);
          video.removeEventListener('error', errorHandler);
        };
        video._errorHandler = errorHandler;
        video.addEventListener('error', errorHandler);

        // 複数のイベントリスナーを設定（最初に発火したもので再生）
        video.addEventListener('loadeddata', playHandler, { once: true });
        video.addEventListener('canplay', playHandler, { once: true });
        video.addEventListener('canplaythrough', playHandler, { once: true });

        // 動画を読み込む
        video.load();

        // 既に読み込み済みの場合のフォールバック
        if (video.readyState >= 2) {
          attemptPlay();
        }

        // フェードイン
        video.style.opacity = '1';
        video.classList.add('fade-in');

        // アニメーションクラスをリセット
        setTimeout(() => {
          video.classList.remove('fade-in');
        }, 700);
      }, 100);
    };

    // 動画を更新
    updateVideo(heroVideoBase);
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

  // ③ タイトルを初期状態に
  titleText.textContent = 'PORTFOLIO';

  // State0用ガイダンステキストを表示
  guidanceText.classList.add('visible');

  // ④ 選択状態を解除
  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.remove('selected');
  });
}

// ============================================
// アセットURL組み立て関数
// ============================================
const baseAssetsUrl = "https://assets.shuntofujii.com";

// 新しい命名規則: 施策コードネーム_案件コードネーム_動画ならm、画像ならp_通番
// 案件名がない場合はスキップ
function buildImageUrl(projectSlug, initiativeName, caseName = null, number = 1) {
  let filename;
  if (caseName) {
    filename = `${initiativeName}_${caseName}_p_${number}.webp`;
  } else {
    filename = `${initiativeName}_p_${number}.webp`;
  }
  return `${baseAssetsUrl}/${projectSlug}/${filename}`;
}

function buildVideoUrl(projectSlug, initiativeName, caseName = null, number = 1) {
  let filename;
  if (caseName) {
    filename = `${initiativeName}_${caseName}_m_${number}.webm`;
  } else {
    filename = `${initiativeName}_m_${number}.webm`;
  }
  return `${baseAssetsUrl}/${projectSlug}/${filename}`;
}

// ============================================
// 画像グリッドレイアウト（PC/SP判定）
// ============================================
function getImageGridLayout(count, isMobile) {
  if (isMobile) {
    // SP版
    switch (count) {
      case 2:
        return { columns: 2, spans: [] };
      case 3:
        return { columns: 2, spans: [{ index: 2, span: 2 }] }; // 3枚目をfull width
      case 4:
        return { columns: 2, spans: [] };
      case 5:
        return { columns: 2, spans: [{ index: 4, span: 2 }] }; // 5枚目をfull width
      default:
        return { columns: 1, spans: [] };
    }
  } else {
    // PC版
    switch (count) {
      case 2:
        return { columns: 2, spans: [] };
      case 3:
        return { columns: 3, spans: [] };
      case 4:
        return { columns: 2, spans: [] };
      case 5:
        return {
          columns: 6, spans: [
            { index: 0, span: 2 }, // 1-3枚目：各2/6 = 3列
            { index: 1, span: 2 },
            { index: 2, span: 2 },
            { index: 3, span: 3 }, // 4-5枚目：各3/6 = 2列
            { index: 4, span: 3 }
          ]
        };
      default:
        return { columns: 1, spans: [] };
    }
  }
}


// 現在再生中の動画を管理
let currentPlayingVideo = null;

// 全てのインライン動画を停止してposterに戻す
function stopAllInlineVideos() {
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
      if (controls) {
        controls.classList.remove('visible');
      }
    }
  });
  currentPlayingVideo = null;
}

// ============================================
// 動画プレイヤーの初期化と制御（1クリック再生）
// ============================================
function initVideoPlayer(videoShell) {
  const video = videoShell.querySelector('.video');
  const overlayPlay = videoShell.querySelector('.video-overlay-play');
  const controls = videoShell.querySelector('.video-controls');
  const playPauseBtn = controls.querySelector('.btn-playpause');
  const seekBar = controls.querySelector('.seek');
  const muteBtn = controls.querySelector('.btn-mute');

  if (!video || !overlayPlay || !controls) return;

  // 再生状態を管理
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

  // 再生/停止ボタン更新（イベント用、状態は変更しない）
  function updatePlayButton() {
    // ボタンの見た目のみ更新（状態変更はtogglePlay内で行う）
    if (video.paused) {
      playPauseBtn.setAttribute('aria-label', 'Play');
      playPauseBtn.classList.remove('playing');
    } else {
      playPauseBtn.setAttribute('aria-label', 'Pause');
      playPauseBtn.classList.add('playing');
    }
  }

  // シークバー更新
  function updateSeekBar() {
    if (video.duration) {
      const percent = (video.currentTime / video.duration) * 100;
      seekBar.value = percent;
    }
  }

  // ミュートボタン更新
  function updateMuteButton() {
    if (video.muted) {
      muteBtn.setAttribute('aria-label', 'Unmute');
      muteBtn.classList.add('muted');
    } else {
      muteBtn.setAttribute('aria-label', 'Mute');
      muteBtn.classList.remove('muted');
    }
  }

  // 再生/一時停止
  function togglePlay() {
    if (video.paused) {
      // 他の動画を停止
      stopAllInlineVideos();
      // 再生ボタンのクリックをトリガーに全画面表示
      enterPlayingState();
      video.play().catch(e => {
        console.warn('Video play error:', e);
        // エラー時は停止状態に戻す
        enterPausedState();
      });
      currentPlayingVideo = video;
    } else {
      // 停止ボタンのクリックをトリガーに縮小表示
      enterPausedState();
      video.pause();
    }
  }

  // イベントリスナー
  video.addEventListener('loadedmetadata', () => {
    seekBar.max = 100;
    updateSeekBar();
  });

  video.addEventListener('timeupdate', updateSeekBar);
  video.addEventListener('play', updatePlayButton);
  video.addEventListener('pause', updatePlayButton);
  video.addEventListener('ended', () => {
    video.currentTime = 0;
    updatePlayButton();
  });

  // オーバーレイプレイボタン（クリックでライトボックスを開く）
  overlayPlay.addEventListener('click', (e) => {
    e.stopPropagation();
    openLightboxVideo(video.src, videoShell);
  });

  // 動画クリック（ライトボックスを開く）
  video.addEventListener('click', (e) => {
    e.stopPropagation();
    if (video.paused) {
      openLightboxVideo(video.src, videoShell);
    } else {
      togglePlay();
    }
  });

  // プレイ/一時停止ボタン
  playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  // シークバー
  seekBar.addEventListener('input', (e) => {
    e.stopPropagation();
    const percent = seekBar.value / 100;
    video.currentTime = video.duration * percent;
  });

  // ミュートボタン
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    updateMuteButton();
  });

  // エラーハンドリング
  video.addEventListener('error', (e) => {
    console.warn('Video load error:', video.src);
    updatePlayButton();
  });

  // 初期状態
  updatePlayButton();
  updateMuteButton();
}

// ============================================
// 施策カードを生成
// ============================================
function createInitiativeCard(initiative, projectSlug, showTitle = true) {
  const card = document.createElement('div');
  card.className = 'initiative-card';

  // ヘッダー（showTitleがtrueの場合のみ表示）
  if (showTitle) {
    const head = document.createElement('div');
    head.className = 'initiative-head';
    const name = document.createElement('h4');
    name.className = 'initiative-name';
    name.textContent = initiative.title;
    head.appendChild(name);
    card.appendChild(head);
  }

  // 動画（hasVideo=trueの場合のみ）
  if (initiative.hasVideo) {
    const videoShell = document.createElement('div');
    videoShell.className = 'video-shell';

    // video要素
    const video = document.createElement('video');
    video.className = 'video';
    // assetPrefixを施策コードネームとして扱い、案件名は無し
    const videoSrc = buildVideoUrl(projectSlug, initiative.assetPrefix, null, 1);
    video.src = videoSrc;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.preload = 'metadata';
    // ポスター画像は動画と同じ命名規則（_m_を含む）で拡張子だけ.webpに変更
    video.poster = videoSrc.replace(/\.webm$/, '.webp');
    video.muted = true;
    video.loop = true;
    video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
    video.setAttribute('disablepictureinpicture', 'true');

    // オーバーレイプレイボタン（初期のみ表示）
    const overlayPlay = document.createElement('button');
    overlayPlay.className = 'video-overlay-play';
    overlayPlay.type = 'button';
    overlayPlay.setAttribute('aria-label', 'Play');

    const playIcon = document.createElement('span');
    playIcon.className = 'icon-play';

    overlayPlay.appendChild(playIcon);

    // コントロールバー（動画内下部にオーバーレイ）
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

    // プレイヤーを初期化
    initVideoPlayer(videoShell);

    card.appendChild(videoShell);
  }

  // 画像グリッド（images > 0の場合のみ）
  if (initiative.images > 0) {
    const grid = document.createElement('div');
    grid.className = 'mediaGrid';
    grid.dataset.count = String(initiative.images);

    for (let i = 1; i <= initiative.images; i++) {
      const item = document.createElement('div');
      item.className = 'mediaItem';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Open image ${i} of ${initiative.title}`);

      const img = document.createElement('img');
      // assetPrefixを施策コードネームとして扱い、案件名は無し
      const imageUrl = buildImageUrl(projectSlug, initiative.assetPrefix, null, i);
      img.src = imageUrl;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';

      // エラーハンドリング
      img.addEventListener('error', (e) => {
        console.warn('Image load error:', imageUrl);
        item.style.display = 'none';
      });

      // クリックでライトボックスを開く
      item.addEventListener('click', () => {
        openLightbox(imageUrl, item);
      });

      // キーボードアクセス対応
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(imageUrl, item);
        }
      });

      item.appendChild(img);
      grid.appendChild(item);
    }

    card.appendChild(grid);
  }

  return card;
}

// ============================================
// 動画グリッドの作成（横並び2本〜5本）
// ============================================
function createVideoGrid(videos, projectSlug, initiativeName = null, caseName = null) {
  const grid = document.createElement('div');
  grid.className = 'video-grid';
  grid.dataset.count = String(videos.length);

  videos.forEach((videoData, index) => {
    const videoShell = document.createElement('div');
    videoShell.className = 'video-shell';

    const video = document.createElement('video');
    video.className = 'video';

    // 新しい命名規則に基づいてURLを生成（initiativeNameとcaseNameが指定されている場合）
    let videoSrc;
    let posterUrl;
    if (initiativeName) {
      const number = index + 1;
      videoSrc = buildVideoUrl(projectSlug, initiativeName, caseName, number);
      // ポスター画像は動画と同じ命名規則（_m_を含む）で拡張子だけ.webpに変更
      posterUrl = videoSrc.replace(/\.webm$/, '.webp');
    } else {
      // 既存のURLを使用（後方互換性）
      videoSrc = videoData.src;
      posterUrl = videoData.src.replace(/\.webm$/, '.webp');
    }

    video.src = videoSrc;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.preload = 'metadata';
    video.poster = posterUrl;
    video.muted = true;
    video.loop = true;
    video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
    video.setAttribute('disablepictureinpicture', 'true');

    // メディアのアスペクト比に従って枠の縦幅を決定
    // まずポスター画像のアスペクト比を試す（IZUMOと同じ方式）
    const posterImg = new Image();
    posterImg.onload = () => {
      videoShell.style.aspectRatio = `${posterImg.naturalWidth} / ${posterImg.naturalHeight}`;
    };
    posterImg.onerror = () => {
      // ポスター画像が存在しない場合は、動画のメタデータ読み込みを待つ
      video.addEventListener('loadedmetadata', () => {
        if (video.videoWidth && video.videoHeight) {
          videoShell.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
        }
      }, { once: true });
    };
    posterImg.src = posterUrl;

    // オーバーレイプレイボタン
    const overlayPlay = document.createElement('button');
    overlayPlay.className = 'video-overlay-play';
    overlayPlay.type = 'button';
    overlayPlay.setAttribute('aria-label', 'Play');

    const playIcon = document.createElement('span');
    playIcon.className = 'icon-play';
    overlayPlay.appendChild(playIcon);

    // コントロールバー
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
    grid.appendChild(videoShell);
  });

  return grid;
}

// ============================================
// 画像グリッドの作成
// ============================================
function createImageGrid(images, projectSlug, forceHorizontal = false, initiativeName = null, caseName = null) {
  if (!images || images.length === 0) return null;

  const grid = document.createElement('div');
  grid.className = 'mediaGrid';
  grid.dataset.count = String(images.length);

  let layout = null;

  // imageGroupsの場合は横並び（画像数分の列）
  if (forceHorizontal) {
    grid.dataset.forceHorizontal = 'true';
    grid.style.gridTemplateColumns = `repeat(${images.length}, 1fr)`;
  } else {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    layout = getImageGridLayout(images.length, isMobile);

    // grid-template-columnsを設定
    if (layout.columns > 0) {
      grid.style.gridTemplateColumns = `repeat(${layout.columns}, 1fr)`;
    }
  }

  images.forEach((imageData, index) => {
    const item = document.createElement('div');
    item.className = 'mediaItem';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Image ${index + 1}`);

    // span設定（forceHorizontalの場合は不要）
    if (!forceHorizontal && layout) {
      const span = layout.spans.find(s => s.index === index);
      if (span) {
        item.style.gridColumn = `span ${span.span}`;
      }
    }

    const img = document.createElement('img');
    // 新しい命名規則に基づいてURLを生成（initiativeNameが指定されている場合）
    // ただし、imageDataにsrcプロパティがある場合は、そちらを優先（imageGroupsの場合）
    let imageUrl;
    if (imageData.src || (typeof imageData === 'string')) {
      // 既にURLが指定されている場合（imageGroupsなど）は、そのまま使用
      imageUrl = imageData.src || imageData;
    } else if (initiativeName) {
      const number = index + 1;
      imageUrl = buildImageUrl(projectSlug, initiativeName, caseName, number);
    } else {
      // 既存のURLを使用（後方互換性）
      imageUrl = imageData.src || imageData;
    }

    img.src = imageUrl;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';

    img.addEventListener('error', () => {
      console.warn('Image load error:', imageUrl);
      item.style.display = 'none';
    });

    // メディアのアスペクト比に従って枠の縦幅を決定
    img.addEventListener('load', () => {
      item.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
    });

    // クリックでライトボックスを開く
    item.addEventListener('click', () => {
      openLightbox(imageUrl, item);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(imageUrl, item);
      }
    });

    item.appendChild(img);
    grid.appendChild(item);
  });

  return grid;
}

// ============================================
// 施策セクションの作成（cases構造用）
// ============================================
function createInitiativeSection(initiative, projectSlug, initiativeName = null, caseName = null) {
  const section = document.createElement('div');
  section.className = 'initiative-section';

  // 施策名（"Main"の場合は表示しない）
  if (initiative.title && initiative.title !== 'Main') {
    const heading = document.createElement('h4');
    heading.className = 'initiative-name';
    heading.textContent = initiative.title;
    section.appendChild(heading);
  }

  // IZUMOプロジェクト用：assetPrefix構造（assetPrefix、hasVideo、images数値）を処理
  if (initiative.assetPrefix) {
    // createInitiativeCardを使用してIZUMO構造を処理
    // createInitiativeSectionで既にtitleを表示している（"Main"以外の場合）ので、
    // createInitiativeCardでは表示しない
    // "Main"の場合も表示しない
    const showTitleInCard = false;
    const card = createInitiativeCard(initiative, projectSlug, showTitleInCard);
    section.appendChild(card);
    return section;
  }

  // デテクルプロジェクト用：videos配列、images配列構造を処理
  // 動画（videos配列がある場合）
  if (initiative.videos && initiative.videos.length > 0) {
    const videoGrid = createVideoGrid(initiative.videos, projectSlug, initiativeName, caseName);
    section.appendChild(videoGrid);
  }

  // 画像（images配列がある場合）
  if (initiative.images && initiative.images.length > 0) {
    const imageGrid = createImageGrid(initiative.images, projectSlug, false, initiativeName, caseName);
    if (imageGrid) {
      section.appendChild(imageGrid);
    }
  }

  // 画像グループ（imageGroups配列がある場合）
  // imageGroupsの場合は横並びで表示（例外措置）
  if (initiative.imageGroups && initiative.imageGroups.length > 0) {
    initiative.imageGroups.forEach((group, groupIndex) => {
      if (group.images && group.images.length > 0) {
        const imageGrid = createImageGrid(group.images, projectSlug, true, initiativeName, caseName);
        if (imageGrid) {
          // imageGroups同士の間隔を設定（最後のグループ以外）
          if (groupIndex < initiative.imageGroups.length - 1) {
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            const gap = isMobile ? 'var(--img-gap-sp)' : 'var(--img-gap-pc)';
            imageGrid.style.marginBottom = gap;
          }
          section.appendChild(imageGrid);
        }
      }
    });
  }

  return section;
}

// ============================================
// 案件セクションの作成（cases構造用）
// ============================================
function createCaseSection(caseData, projectSlug) {
  const section = document.createElement('section');
  section.className = 'case-section';

  // 案件名
  const heading = document.createElement('h3');
  heading.className = 'case-title';
  heading.textContent = caseData.title;
  section.appendChild(heading);

  // 施策リスト
  if (caseData.initiatives && caseData.initiatives.length > 0) {
    caseData.initiatives.forEach(initiative => {
      // 案件名と施策名を取得（タイトルから推測、または明示的に指定）
      // projects.jsonにinitiativeSlugやcaseSlugがあれば使用、なければタイトルから推測
      let initiativeName = null;
      let caseName = null;

      if (initiative.initiativeSlug) {
        // 明示的に指定されている場合
        initiativeName = initiative.initiativeSlug;
        caseName = initiative.caseSlug || null;
      } else if (projectSlug === 'deteqle') {
        // デテクルプロジェクト用のマッピング（タイトルから推測）
        // 案件名と施策名の組み合わせで判断
        if (caseData.title === 'ARマーダーミステリー（仮称）') {
          if (initiative.title === 'Main') {
            initiativeName = 'murder';
            caseName = null;
          } else if (initiative.title === 'Process') {
            initiativeName = 'murder';
            caseName = 'process';
          }
        } else if (caseData.title === 'ARコンテンツ') {
          if (initiative.title === 'ダダコネおじさん') {
            initiativeName = 'content';
            caseName = 'dadakone';
          } else if (initiative.title === 'ゾンビに襲われた') {
            initiativeName = 'content';
            caseName = 'zombie';
          }
        } else if (caseData.title === 'Cafe Mai:lish' && initiative.title === 'Main') {
          initiativeName = 'mailish';
          caseName = null;
        } else if (caseData.title === 'Design System' && initiative.title === 'Main') {
          initiativeName = 'designsystem';
          caseName = null;
        }
      } else if (projectSlug === 'sepila') {
        // SEPILAプロジェクト用のマッピング（タイトルから推測）
        if (caseData.title === 'Lecture Video' && initiative.title === 'Main') {
          initiativeName = 'lecture';
          caseName = null;
        } else if (caseData.title === 'Color' && initiative.title === 'Main') {
          initiativeName = 'color';
          caseName = null;
        } else if (caseData.title === 'Process' && initiative.title === 'Main') {
          initiativeName = 'process';
          caseName = null;
        }
      }

      const initiativeSection = createInitiativeSection(initiative, projectSlug, initiativeName, caseName);
      section.appendChild(initiativeSection);
    });
  }

  return section;
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

  // モーダルコンテンツを構築
  modalContent.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${project.title}</h2>
      ${project.tagline ? `<p class="modal-tagline">${project.tagline}</p>` : ''}
      <div class="modal-meta">
        <div class="modal-meta-item">
          <img src="https://assets.shuntofujii.com/icons/domain.svg" alt="Domain" class="modal-meta-icon" />
          <div class="modal-meta-content">
            <span class="modal-meta-label">Domain</span>
            <span class="modal-meta-value">${project.category}</span>
          </div>
        </div>
        <div class="modal-meta-item">
          <img src="https://assets.shuntofujii.com/icons/year.svg" alt="Year" class="modal-meta-icon" />
          <div class="modal-meta-content">
            <span class="modal-meta-label">Year</span>
            <span class="modal-meta-value">${project.year}</span>
          </div>
        </div>
        ${focusValue ? `
        <div class="modal-meta-item">
          <img src="https://assets.shuntofujii.com/icons/focus.svg" alt="Focus" class="modal-meta-icon" />
          <div class="modal-meta-content">
            <span class="modal-meta-label">Focus</span>
            <span class="modal-meta-value">${focusValue}</span>
          </div>
        </div>
        ` : ''}
        ${project.tools && project.tools.length > 0 ? `
        <div class="modal-meta-item">
          <img src="https://assets.shuntofujii.com/icons/toolkits.svg" alt="Toolkits" class="modal-meta-icon" />
          <div class="modal-meta-content">
            <span class="modal-meta-label">Toolkits</span>
            <span class="modal-meta-value">${project.tools.join(' / ')}</span>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
    
    ${project.description ? `
    <div class="modal-description">
      ${project.description.replace(/\n/g, '<br>')}
    </div>
    ` : ''}
  `;

  // casesセクションの生成（cases構造がある場合）
  if (project.cases && project.cases.length > 0) {
    const casesSection = document.createElement('section');
    casesSection.className = 'modal-initiatives';

    project.cases.forEach(caseData => {
      const caseSection = createCaseSection(caseData, project.projectSlug || 'deteqle');
      casesSection.appendChild(caseSection);
    });

    modalContent.appendChild(casesSection);
  }
  // initiativesセクションの生成（既存のinitiatives構造がある場合）
  else if (project.initiatives && project.initiatives.length > 0 && project.projectSlug) {
    const initiativesSection = document.createElement('section');
    initiativesSection.className = 'modal-initiatives';

    const initiativeList = document.createElement('div');
    initiativeList.className = 'initiative-list';

    project.initiatives.forEach(initiative => {
      const card = createInitiativeCard(initiative, project.projectSlug);
      initiativeList.appendChild(card);
    });

    initiativesSection.appendChild(initiativeList);
    modalContent.appendChild(initiativesSection);
  }


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

  // ガイダンステキストを非表示（モーダル表示時のみ）
  guidanceText.classList.remove('visible');

  // 背景要素を後退させる（既存のmodal-backgroundクラスも維持）
  focusVisual.classList.add('modal-background');
  titleBackground.classList.add('modal-background');
  contextPanel.classList.add('modal-background');
  projectNavigation.classList.add('modal-background');
}

// ============================================
// ライトボックスの開閉
// ============================================
let lightboxOriginRect = null;
let lightboxType = 'image'; // 'image' or 'video'

function openLightboxVideo(videoSrc, originElement) {
  if (!lightboxOverlay || !lightboxVideo) return;

  lightboxType = 'video';

  // 元の動画要素の位置とサイズを取得
  if (originElement) {
    const rect = originElement.getBoundingClientRect();
    lightboxOriginRect = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  } else {
    lightboxOriginRect = null;
  }

  // 画像を非表示、動画を表示
  if (lightboxImage) {
    lightboxImage.style.display = 'none';
  }
  lightboxVideo.style.display = 'block';
  lightboxVideo.src = videoSrc;
  lightboxVideo.muted = true;
  lightboxVideo.playsInline = true;
  lightboxVideo.setAttribute('playsinline', 'true');
  lightboxVideo.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
  lightboxVideo.setAttribute('disablepictureinpicture', 'true');
  lightboxOverlay.removeAttribute('hidden');
  lightboxOverlay.classList.remove('closing');

  // 動画が読み込まれるまで待つ
  const handleVideoLoad = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (lightboxOriginRect) {
      // 元の位置から開始
      const originX = lightboxOriginRect.x;
      const originY = lightboxOriginRect.y;
      const originWidth = lightboxOriginRect.width;
      const originHeight = lightboxOriginRect.height;

      // 最終的な位置（中央）
      const finalX = viewportWidth / 2;
      const finalY = viewportHeight / 2;

      // 最終的なサイズ（アスペクト比を維持）
      const videoAspectRatio = lightboxVideo.videoWidth / lightboxVideo.videoHeight;
      let finalWidth = viewportWidth * 0.9;
      let finalHeight = finalWidth / videoAspectRatio;

      if (finalHeight > viewportHeight * 0.9) {
        finalHeight = viewportHeight * 0.9;
        finalWidth = finalHeight * videoAspectRatio;
      }

      // 初期状態を設定（元の位置とサイズ）
      lightboxVideo.style.position = 'fixed';
      lightboxVideo.style.left = `${originX}px`;
      lightboxVideo.style.top = `${originY}px`;
      lightboxVideo.style.width = `${originWidth}px`;
      lightboxVideo.style.height = `${originHeight}px`;
      lightboxVideo.style.transform = 'translate(-50%, -50%)';
      lightboxVideo.style.transformOrigin = 'center center';
      lightboxVideo.style.opacity = '1';
      lightboxVideo.style.transition = 'none';
      lightboxVideo.style.objectFit = 'cover';

      // 次のフレームでアニメーション開始
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lightboxVideo.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
          lightboxVideo.style.left = `${finalX}px`;
          lightboxVideo.style.top = `${finalY}px`;
          lightboxVideo.style.width = `${finalWidth}px`;
          lightboxVideo.style.height = `${finalHeight}px`;
          lightboxVideo.style.objectFit = 'contain';

          // アニメーション完了後に自動再生
          setTimeout(() => {
            lightboxVideo.play().catch(e => {
              console.warn('Video autoplay prevented:', e);
            });
          }, 500);
        });
      });
    } else {
      // 元の位置情報がない場合
      lightboxVideo.style.position = '';
      lightboxVideo.style.left = '';
      lightboxVideo.style.top = '';
      lightboxVideo.style.width = '';
      lightboxVideo.style.height = '';
      lightboxVideo.style.opacity = '1';
      lightboxVideo.style.transform = 'translate(-50%, -50%) scale(1)';
      lightboxVideo.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    }
  };

  lightboxVideo.addEventListener('loadedmetadata', handleVideoLoad, { once: true });

  // 既に読み込まれている場合
  if (lightboxVideo.readyState >= 1) {
    handleVideoLoad();
  }
}

function openLightbox(imageSrc, originElement) {
  if (!lightboxOverlay || !lightboxImage) return;

  lightboxType = 'image';

  // 元の画像の位置とサイズを取得
  if (originElement) {
    const rect = originElement.getBoundingClientRect();
    lightboxOriginRect = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  } else {
    lightboxOriginRect = null;
  }

  // 動画を非表示、画像を表示
  if (lightboxVideo) {
    lightboxVideo.style.display = 'none';
    lightboxVideo.pause();
    lightboxVideo.src = '';
  }
  if (lightboxImage) {
    lightboxImage.style.display = 'block';
  }

  lightboxImage.src = imageSrc;
  lightboxOverlay.removeAttribute('hidden');
  lightboxOverlay.classList.remove('closing');

  // 画像が読み込まれるまで待つ
  const handleImageLoad = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (lightboxOriginRect) {
      // 元の位置から開始
      const originX = lightboxOriginRect.x;
      const originY = lightboxOriginRect.y;
      const originWidth = lightboxOriginRect.width;
      const originHeight = lightboxOriginRect.height;

      // 最終的な位置（中央）
      const finalX = viewportWidth / 2;
      const finalY = viewportHeight / 2;

      // 最終的なサイズ（アスペクト比を維持）
      const imageAspectRatio = lightboxImage.naturalWidth / lightboxImage.naturalHeight;
      let finalWidth = viewportWidth * 0.9;
      let finalHeight = finalWidth / imageAspectRatio;

      if (finalHeight > viewportHeight * 0.9) {
        finalHeight = viewportHeight * 0.9;
        finalWidth = finalHeight * imageAspectRatio;
      }

      // 初期状態を設定（元の位置とサイズ）
      lightboxImage.style.position = 'fixed';
      lightboxImage.style.left = `${originX}px`;
      lightboxImage.style.top = `${originY}px`;
      lightboxImage.style.width = `${originWidth}px`;
      lightboxImage.style.height = `${originHeight}px`;
      lightboxImage.style.transform = 'translate(-50%, -50%)';
      lightboxImage.style.transformOrigin = 'center center';
      lightboxImage.style.opacity = '1';
      lightboxImage.style.transition = 'none';
      lightboxImage.style.objectFit = 'cover';

      // 次のフレームでアニメーション開始
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          lightboxImage.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
          lightboxImage.style.left = `${finalX}px`;
          lightboxImage.style.top = `${finalY}px`;
          lightboxImage.style.width = `${finalWidth}px`;
          lightboxImage.style.height = `${finalHeight}px`;
          lightboxImage.style.objectFit = 'contain';
        });
      });
    } else {
      // 元の位置情報がない場合は従来のアニメーション
      lightboxImage.style.position = '';
      lightboxImage.style.left = '';
      lightboxImage.style.top = '';
      lightboxImage.style.width = '';
      lightboxImage.style.height = '';
      lightboxImage.style.opacity = '1';
      lightboxImage.style.transform = 'translate(-50%, -50%) scale(1)';
      lightboxImage.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    }
  };

  lightboxImage.onload = handleImageLoad;

  // 既に読み込まれている場合
  if (lightboxImage.complete && lightboxImage.naturalWidth > 0) {
    handleImageLoad();
  }
}

function closeLightbox() {
  if (!lightboxOverlay) return;

  // 閉じるアニメーション開始：背景を透明にする
  lightboxOverlay.classList.add('closing');

  if (lightboxType === 'video' && lightboxVideo) {
    // 動画を閉じる
    if (lightboxOriginRect) {
      // 元の位置に戻るアニメーション
      const originX = lightboxOriginRect.x;
      const originY = lightboxOriginRect.y;
      const originWidth = lightboxOriginRect.width;
      const originHeight = lightboxOriginRect.height;

      // 動画を先に停止
      lightboxVideo.pause();

      lightboxVideo.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      lightboxVideo.style.left = `${originX}px`;
      lightboxVideo.style.top = `${originY}px`;
      lightboxVideo.style.width = `${originWidth}px`;
      lightboxVideo.style.height = `${originHeight}px`;
      lightboxVideo.style.opacity = '0';
      lightboxVideo.style.objectFit = 'cover';

      setTimeout(() => {
        // まず動画のsrcをクリア（動画を非表示にする）
        lightboxVideo.src = '';
        lightboxVideo.style.display = 'none';

        // 次にhidden属性を設定
        lightboxOverlay.setAttribute('hidden', '');

        // 最後にclosingクラスを削除してスタイルをクリーンアップ
        lightboxOverlay.classList.remove('closing');
        lightboxVideo.style.position = '';
        lightboxVideo.style.left = '';
        lightboxVideo.style.top = '';
        lightboxVideo.style.width = '';
        lightboxVideo.style.height = '';
        lightboxVideo.style.transform = '';
        lightboxVideo.style.transformOrigin = '';
        lightboxVideo.style.transition = '';
        lightboxVideo.style.objectFit = '';
        lightboxOriginRect = null;
      }, 400);
    } else {
      // 動画を先に停止
      lightboxVideo.pause();

      lightboxVideo.style.opacity = '0';
      lightboxVideo.style.transform = 'translate(-50%, -50%) scale(0.9)';

      setTimeout(() => {
        // まず動画のsrcをクリア（動画を非表示にする）
        lightboxVideo.src = '';
        lightboxVideo.style.display = 'none';

        // 次にhidden属性を設定
        lightboxOverlay.setAttribute('hidden', '');

        // 最後にclosingクラスを削除してスタイルをクリーンアップ
        lightboxOverlay.classList.remove('closing');
        lightboxVideo.style.position = '';
        lightboxVideo.style.left = '';
        lightboxVideo.style.top = '';
        lightboxVideo.style.width = '';
        lightboxVideo.style.height = '';
        lightboxVideo.style.transform = '';
        lightboxVideo.style.transformOrigin = '';
        lightboxVideo.style.transition = '';
        lightboxVideo.style.objectFit = '';
      }, 400);
    }
    return;
  }

  // 画像を閉じる
  if (!lightboxImage) return;

  if (lightboxOriginRect) {
    // 元の位置に戻るアニメーション
    const originX = lightboxOriginRect.x;
    const originY = lightboxOriginRect.y;
    const originWidth = lightboxOriginRect.width;
    const originHeight = lightboxOriginRect.height;

    lightboxImage.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    lightboxImage.style.left = `${originX}px`;
    lightboxImage.style.top = `${originY}px`;
    lightboxImage.style.width = `${originWidth}px`;
    lightboxImage.style.height = `${originHeight}px`;
    lightboxImage.style.opacity = '0';

    setTimeout(() => {
      lightboxOverlay.setAttribute('hidden', '');
      lightboxOverlay.classList.remove('closing');
      lightboxImage.src = '';
      lightboxImage.style.position = '';
      lightboxImage.style.left = '';
      lightboxImage.style.top = '';
      lightboxImage.style.width = '';
      lightboxImage.style.height = '';
      lightboxImage.style.transform = '';
      lightboxImage.style.transformOrigin = '';
      lightboxImage.style.transition = '';
      lightboxImage.style.objectFit = '';
      lightboxOriginRect = null;
    }, 400);
  } else {
    // 従来のアニメーション
    lightboxImage.style.opacity = '0';
    lightboxImage.style.transform = 'translate(-50%, -50%) scale(0.9)';

    setTimeout(() => {
      lightboxOverlay.setAttribute('hidden', '');
      lightboxOverlay.classList.remove('closing');
      lightboxImage.src = '';
      lightboxImage.style.position = '';
      lightboxImage.style.left = '';
      lightboxImage.style.top = '';
      lightboxImage.style.width = '';
      lightboxImage.style.height = '';
      lightboxImage.style.transform = '';
      lightboxImage.style.transformOrigin = '';
      lightboxImage.style.transition = '';
      lightboxImage.style.objectFit = '';
    }, 400);
  }
}

// ============================================
// モーダルを閉じる
// ============================================
function closeModal() {
  // ライトボックスが開いている場合は閉じる
  if (lightboxOverlay && !lightboxOverlay.hidden) {
    closeLightbox();
  }

  // 全てのインライン動画を停止してposterに戻す
  stopAllInlineVideos();

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

    // モーダルコンテンツをクリアして、すべてのDOM要素とイベントリスナーを削除
    if (modalContent) {
      modalContent.innerHTML = '';
    }

    isClosing = false;
  };
  modalContainer.addEventListener('transitionend', onEnd);

  document.body.style.overflow = '';

  // ガイダンステキストを表示（モーダル閉じる時）
  guidanceText.classList.add('visible');

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

// 初期化実行
// ============================================
init();

