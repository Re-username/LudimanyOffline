/* ============================================================
   Общий модуль: каталог стикеров, сохранение коллекции и
   статистики в localStorage, рендер коллекции, звук, конфетти.
   Используется всеми тремя играми (колесо, лотерея, слоты).
   ============================================================ */

/* ---------- Легендарные стикеры (нарисованные) ---------- */
const IMG_STICKERS = [
  { id: 'cat',    name: 'Кот-манеки с прибауткой', src: 'stickers/cat.png'    },
  { id: 'trophy', name: 'Кубок заебатости',        src: 'stickers/trophy.png' },
  { id: 'gift',   name: 'Подарочек от деда',       src: 'stickers/gift.png'   },
  { id: 'rocket', name: 'Ракета в ебеня',          src: 'stickers/rocket.png' },
  { id: 'gem',    name: 'Алмаз ебейший',           src: 'stickers/gem.png'    },
  { id: 'crown',  name: 'Корона царя-батюшки',     src: 'stickers/crown.png'  },
];

const TIER_NAMES = {
  common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий',
  epic: 'Эпический', legendary: 'Легендарный'
};
const TIER_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
const TIER_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

/* ---------- Единый каталог ---------- */
const CATALOG = [];
EMOJI_STICKERS.forEach((s, i) => CATALOG.push({
  id: 'e' + i, kind: 'emoji', emoji: s.e, name: s.n, tier: s.t
}));
IMG_STICKERS.forEach(s => CATALOG.push({
  id: s.id, kind: 'img', src: s.src, name: s.name, tier: 'legendary'
}));
const BY_ID = Object.fromEntries(CATALOG.map(s => [s.id, s]));
const BY_TIER = {};
CATALOG.forEach(s => { (BY_TIER[s.tier] = BY_TIER[s.tier] || []).push(s); });
const TOTAL_STICKERS = CATALOG.length;

/* ---------- Сохранение (localStorage) ----------
   У каждой игры СВОЙ ключ: коллекции раздельные,
   прогресс не пропадает при переходе между страницами. */
let STATE = null;
let GAME_ID = null;

function defaultState() {
  return { collection: {}, stats: {} };  // stats заполняет сама игра
}

function loadState(gameId) {
  const key = 'stickersave_' + gameId + '_v2';
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultState();
    const st = JSON.parse(raw);
    // чистим от стикеров, которых больше нет в каталоге
    const coll = {};
    for (const id in (st.collection || {})) {
      if (BY_ID[id]) coll[id] = st.collection[id];
    }
    return { collection: coll, stats: st.stats || {} };
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  if (!GAME_ID) return;
  try { localStorage.setItem('stickersave_' + GAME_ID + '_v2', JSON.stringify(STATE)); } catch (e) {}
}

/* Вызывается каждой страницей до всего остального */
function initGame(gameId) {
  GAME_ID = gameId;
  STATE = loadState(gameId);
  return STATE;
}

/* ---------- Выдача стикеров ---------- */
function rollTierIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

function pickSticker(weights) {
  const tier = TIER_ORDER[rollTierIndex(weights)];
  const pool = BY_TIER[tier];
  return pool[Math.floor(Math.random() * pool.length)];
}

function awardSticker(s) {
  STATE.collection[s.id] = (STATE.collection[s.id] || 0) + 1;
  saveState();
}

/* ---------- Рендер коллекции ---------- */
function renderCollection(gridEl, emptyEl) {
  gridEl.innerHTML = '';
  const ids = Object.keys(STATE.collection).sort((a, b) => {
    const sa = BY_ID[a], sb = BY_ID[b];
    if (TIER_RANK[sa.tier] !== TIER_RANK[sb.tier]) return TIER_RANK[sb.tier] - TIER_RANK[sa.tier];
    return sa.id.localeCompare(sb.id, undefined, { numeric: true });
  });
  if (emptyEl) emptyEl.style.display = ids.length ? 'none' : 'block';

  ids.forEach(id => {
    const s = BY_ID[id];
    const card = document.createElement('div');
    card.className = 'sticker-card tier-' + s.tier;
    const visual = s.kind === 'img'
      ? `<img src="${s.src}" alt="${s.name}">`
      : `<span class="emoji-big">${s.emoji}</span>`;
    card.innerHTML = `
      <div class="tier-badge">${TIER_NAMES[s.tier].toUpperCase()}</div>
      <div class="count">×${STATE.collection[id]}</div>
      ${visual}
      <div class="name" title="${s.name}">${s.name}</div>`;
    gridEl.appendChild(card);
  });
}

function updateProgress(fillEl, labelEl) {
  const uniq = Object.keys(STATE.collection).length;
  const pct = (uniq / TOTAL_STICKERS * 100).toFixed(1);
  fillEl.style.width = pct + '%';
  labelEl.textContent = `Собрано уникальных: ${uniq} из ${TOTAL_STICKERS} (${pct}%)`;
}

/* ---------- Анимации выпадения призов (общие стили) ---------- */
(function injectAnimStyles() {
  const css = `
  @keyframes animPop { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }
  @keyframes animSpinIn { 0%{transform:scale(0) rotate(-540deg);opacity:0} 100%{transform:scale(1) rotate(0);opacity:1} }
  @keyframes animFlipIn { 0%{transform:perspective(500px) rotateY(95deg) scale(.6);opacity:0} 100%{transform:perspective(500px) rotateY(0) scale(1);opacity:1} }
  @keyframes animDropIn {
    0%{transform:translateY(-160px) scale(.7);opacity:0}
    60%{transform:translateY(12px) scale(1.05,.92);opacity:1}
    80%{transform:translateY(-6px) scale(1)}
    100%{transform:translateY(0) scale(1);opacity:1}
  }
  @keyframes animSwingIn {
    0%{transform:scale(.3) rotate(25deg);opacity:0}
    50%{transform:scale(1.1) rotate(-12deg);opacity:1}
    70%{transform:scale(1) rotate(8deg)}
    100%{transform:scale(1) rotate(0);opacity:1}
  }
  @keyframes animZoomRot {
    0%{transform:scale(3.2) rotate(40deg);opacity:0}
    100%{transform:scale(1) rotate(0);opacity:1}
  }
  @keyframes animSlideLeft {
    0%{transform:translateX(-180px) skewX(12deg);opacity:0}
    100%{transform:translateX(0) skewX(0);opacity:1}
  }
  @keyframes animSlideRight {
    0%{transform:translateX(180px) skewX(-12deg);opacity:0}
    100%{transform:translateX(0) skewX(0);opacity:1}
  }
  @keyframes legendaryPulse {
    0%,100%{ box-shadow: 0 0 18px rgba(255,215,0,.45); }
    50%{ box-shadow: 0 0 46px rgba(255,215,0,.95); }
  }
  .won-item.anim-pop      { animation: animPop      .5s cubic-bezier(.34,1.56,.64,1) backwards; }
  .won-item.anim-spin     { animation: animSpinIn   .65s cubic-bezier(.34,1.3,.5,1) backwards; }
  .won-item.anim-flip     { animation: animFlipIn   .6s ease backwards; }
  .won-item.anim-drop     { animation: animDropIn   .65s cubic-bezier(.3,1.2,.5,1) backwards; }
  .won-item.anim-swing    { animation: animSwingIn  .7s ease backwards; }
  .won-item.anim-zoomrot  { animation: animZoomRot  .55s cubic-bezier(.2,1.4,.4,1) backwards; }
  .won-item.anim-slide-l  { animation: animSlideLeft  .5s ease backwards; }
  .won-item.anim-slide-r  { animation: animSlideRight .5s ease backwards; }
  .won-item.glow-legendary .won-emoji,
  .won-item.glow-legendary .won-img { animation: legendaryPulse 1.6s ease-in-out infinite; }
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
})();

const WON_ANIMS = ['anim-pop', 'anim-spin', 'anim-flip', 'anim-drop', 'anim-swing', 'anim-zoomrot', 'anim-slide-l', 'anim-slide-r'];

/* ---------- Модалка выигрыша ---------- */
function buildWonItem(s) {
  const wrap = document.createElement('div');
  const anim = WON_ANIMS[Math.floor(Math.random() * WON_ANIMS.length)];
  wrap.className = 'won-item tier-' + s.tier + ' ' + anim + (s.tier === 'legendary' ? ' glow-legendary' : '');
  const visual = s.kind === 'img'
    ? `<img class="won-img" src="${s.src}" alt="${s.name}">`
    : `<div class="won-emoji">${s.emoji}</div>`;
  wrap.innerHTML = `
    ${visual}
    <div class="won-tier">${TIER_NAMES[s.tier]}</div>
    <div class="won-name">${s.name}</div>`;
  return wrap;
}

/* ---------- Звук ---------- */
let _audioCtx = null;
function beep(freq, dur, vol, type) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = _audioCtx.createOscillator();
    const g = _audioCtx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    const t = _audioCtx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(_audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
function tickSound() { beep(900, 0.07, 0.06, 'square'); }
function winJingle() {
  [523, 659, 784, 1047].forEach((f, i) =>
    setTimeout(() => beep(f, 0.35, 0.12, 'triangle'), i * 130));
}

/* ---------- Конфетти ---------- */
const Confetti = {
  canvas: null, ctx: null, parts: [], running: false,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
  },

  launch(amount, colors) {
    colors = colors || ['#ffd700', '#ff6b6b', '#4ecdc4', '#a78bfa', '#ff9a3d', '#ffffff'];
    for (let i = 0; i < amount; i++) {
      this.parts.push({
        x: Math.random() * this.canvas.width,
        y: -20 - Math.random() * this.canvas.height * 0.5,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: 2 + Math.random() * 3.5,
        vx: -1.5 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        vr: -0.12 + Math.random() * 0.24,
      });
    }
    if (!this.running) {
      this.running = true;
      requestAnimationFrame(() => this.frame());
    }
  },

  frame() {
    const c = this.ctx;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.parts = this.parts.filter(p => p.y < this.canvas.height + 40);
    this.parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillStyle = p.color;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      c.restore();
    });
    if (this.parts.length) requestAnimationFrame(() => this.frame());
    else { this.running = false; c.clearRect(0, 0, this.canvas.width, this.canvas.height); }
  }
};

/* ---------- Фоновая музыка и звуки ----------
   - музыка лифта играет по кругу на всех страницах,
     позиция воспроизведения сохраняется между страницами;
   - кнопка 🔊/🔇 в углу, состояние запоминается;
   - при проигрыше — звук пердёжа. */
const Sound = {
  bg: null,
  muted: false,

  init() {
    this.muted = localStorage.getItem('stickerhub_muted') === '1';

    this.bg = new Audio('audio/elevator.mp3');
    this.bg.loop = true;
    this.bg.volume = 0.3;

    const savedPos = parseFloat(localStorage.getItem('stickerhub_musicpos') || '0');

    const start = () => {
      if (this.muted || !this.bg.paused) return;
      if (savedPos && isFinite(savedPos)) {
        try { this.bg.currentTime = savedPos; } catch (e) {}
      }
      this.bg.play().catch(() => {});
    };

    // браузеры блокируют автоплей — запускаем по первому действию пользователя
    start();
    const kick = () => { start(); };
    document.addEventListener('click', kick);
    document.addEventListener('keydown', kick);

    // сохраняем позицию, чтобы музыка продолжалась с того же места на другой странице
    setInterval(() => {
      if (this.bg && !this.bg.paused) {
        try { localStorage.setItem('stickerhub_musicpos', String(this.bg.currentTime)); } catch (e) {}
      }
    }, 2000);
    window.addEventListener('beforeunload', () => {
      if (this.bg) {
        try { localStorage.setItem('stickerhub_musicpos', String(this.bg.currentTime)); } catch (e) {}
      }
    });

    // кнопка вкл/выкл музыки
    const btn = document.createElement('button');
    btn.textContent = this.muted ? '🔇' : '🔊';
    btn.title = 'Фоновая музыка';
    btn.style.cssText = 'position:fixed;top:14px;right:14px;z-index:300;width:46px;height:46px;' +
      'border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(0,0,0,.45);' +
      'color:#fff;font-size:20px;cursor:pointer;backdrop-filter:blur(4px);';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      this.toggleMute();
      btn.textContent = this.muted ? '🔇' : '🔊';
    });
    document.body.appendChild(btn);
  },

  toggleMute() {
    this.muted = !this.muted;
    try { localStorage.setItem('stickerhub_muted', this.muted ? '1' : '0'); } catch (e) {}
    if (this.muted) this.bg.pause();
    else this.bg.play().catch(() => {});
  },

  loss() {
    if (this.muted) return;
    try {
      const a = new Audio('audio/fart.mp3');
      a.volume = 0.75;
      a.play().catch(() => {});
    } catch (e) {}
  }
};

/* ---------- Банк фраз (выигрыш / промах) ---------- */
function pickRand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const PHRASES = {
  wheelEmpty: [
    'Пусто, как холодильник в конце месяца!',
    'Мимо. Колесо сказало «обойдёшься».',
    'Нихрена. Крути дальше, дурачок.',
    'Облом. Фортуна сегодня не в духе.',
    'Барабан крутился — жопа крутилась. Пусто.',
    'ПУСТО. Как обещания политиков.',
    'Не повезло. Подожди лифт… э-э, приза.',
    'Хрен тебе, а не стикер!',
    'Колесо посмотрело на тебя и передумало.',
    'Пустота. Даже пердёж сочувствует.',
  ],
  wheelWin: [
    'Затащил! Красава!',
    'Опа, а ты не промах!',
    'Стикер в карман! Точнее, в коллекцию.',
    'Есть контакт! Лови стикер.',
    'Везучий чертяка!',
    'Нормально так подфартило!',
  ],
  wheelRare: [
    'РЕДКОСТЬ! Повезло-повезло!',
    'Охренеть, редкий стикер!',
    'Редкий дроп — ты сегодня в ударе!',
    'Синька! Это уже серьёзно.',
  ],
  wheelJackpot: [
    'ДЖЕКПОТ, МАМА НЕ ГОРЮЙ!',
    'ТРИ СТИКЕРА! Да ты монстр!',
    'Джекпот! Соседи уже завидуют.',
    'ДЖЕКПОТ! Колесо тебя любит (пока).',
  ],

  lottoMiss: [
    'Ни одного. Классика жанра.',
    'Промах чистейший. Лотерея тебя видит насквозь.',
    'Мимо, как соль мимо раны.',
    'Ноль совпадений. Ты хоть угадать пытался?',
    'Шары выкатились посмотреть и укатились обратно.',
    'Мимо. Математика беспощадна.',
  ],
  lottoOne: [
    'Одно совпадение — почти подвиг. Почти.',
    '1 из 6. Это даже не смешно. Ладно, смешно.',
    'Одно попадание из шести. Снайпер, блин.',
  ],
  lotto2: ['Два совпадения — сойдёт за утешение.', '2 из 6! Уже не позор, но ещё не победа.'],
  lotto3: ['ТРИ совпадения! Мама, я везучий!', '3 из 6! Половина дела сделана!'],
  lotto4: ['4 СОВПАДЕНИЯ! Запомни этот день!', '4 из 6! Ты серьёзно это сделал?!'],
  lotto5: ['5 ИЗ 6! Ещё чуть-чуть до легенды!', 'ПЯТЬ! ОДНО ЧИСЛО ОТ ВЕЛИЧИЯ!'],
  lotto6: ['6 ИЗ 6! ТЫ СЛОМАЛ СИСТЕМУ!', 'ДЖЕКПОТ! Купи билет на Багамы!'],

  slotMiss: [
    'Мимо. Барабан издевается.',
    'Ничего. Казино довольно.',
    'Пусто! Рычаг подвёл.',
    'Не твоё. Дёрни ещё — может пронесёт.',
    'Барабаны выдали хаос. Без приза.',
    'Мимо! Однорукий бандит ограбил тебя снова.',
  ],
  slotPairEmpty: [
    'Пара есть, толку нет.',
    'Почти! Ещё один такой — и был бы приз.',
    'Пара — и то хлеб. Но сегодня без хлеба.',
    'Два из трёх. Обидно, согласен.',
  ],
  slotWin: [
    'Три в ряд! Забирай!',
    'Есть! Слоты тебя любят.',
    'Тройка! Красиво сыграно!',
  ],
  slotDiamond: ['АЛМАЗЫ! Блестит, аж слепит!', '💎💎💎! Ювелирка ограблена!'],
  slotStar: ['ТРИ ЗВЕЗДЫ! Голливуд нервно курит.', 'Звёздный час настал!'],
  slotJackpot: ['777! ДЖЕКПОТ ВЕКА!', 'ТРИ РОЖИ КАЗИНО! Ты бог слотов!'],
};

/* ---------- Утилиты ---------- */
function plural(n, one, few, many) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

function bindModal(overlay, closeBtn) {
  closeBtn.addEventListener('click', () => overlay.classList.remove('show'));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });
}
