/* 粉色主题 2048 —— 纯前端实现 */
(() => {
  'use strict';

  const SIZE = 4;
  const WIN_VALUE = 2048;
  const BEST_KEY = 'pink-2048-best';
  const SWIPE_THRESHOLD = 24;

  const els = {
    board: document.getElementById('board'),
    tileLayer: document.getElementById('tile-layer'),
    overlay: document.getElementById('overlay'),
    overlayTitle: document.getElementById('overlay-title'),
    overlayText: document.getElementById('overlay-text'),
    overlayButtons: document.getElementById('overlay-buttons'),
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    scoreFx: document.getElementById('score-fx'),
    newGameBtn: document.getElementById('new-game'),
  };

  const state = {
    grid: null,        // 二维数组，元素为 tile 或 null
    score: 0,
    best: 0,
    won: false,
    keepPlaying: false,
    over: false,
    nextId: 1,
    pending: [],       // 尚未从 DOM 移除的被吃方块（快速连续操作时的兜底清理）
  };

  const VECTORS = {
    up:    { r: -1, c: 0 },
    down:  { r: 1,  c: 0 },
    left:  { r: 0,  c: -1 },
    right: { r: 0,  c: 1 },
  };

  /* ---------- 基础工具 ---------- */

  function emptyGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  }

  function emptyCells() {
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!state.grid[r][c]) cells.push([r, c]);
      }
    }
    return cells;
  }

  function loadBest() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(BEST_KEY, String(state.best));
    } catch { /* 隐私模式下静默失败 */ }
  }

  /* ---------- 方块 DOM ---------- */

  function faceClass(value) {
    return value > WIN_VALUE ? 'tile-super' : 'tile-' + value;
  }

  function setTileFace(tile, merged) {
    const inner = tile.el.firstChild;
    inner.textContent = tile.value;
    const cls = ['tile', faceClass(tile.value)];
    const digits = String(tile.value).length;
    if (digits >= 5) cls.push('tiny');
    else if (digits === 4) cls.push('small');
    if (merged) {
      // 先移除再强制回流，保证连续合并时 pop 动画能重新触发
      tile.el.classList.remove('tile-merged');
      void tile.el.offsetWidth;
      cls.push('tile-merged');
    }
    tile.el.className = cls.join(' ');
  }

  function createTile(tile, isNew) {
    const el = document.createElement('div');
    const inner = document.createElement('div');
    inner.className = 'tile-inner';
    el.appendChild(inner);
    tile.el = el;
    el.dataset.r = tile.r;
    el.dataset.c = tile.c;
    setTileFace(tile, false);
    if (isNew) {
      el.classList.add('tile-new');
      inner.addEventListener(
        'animationend',
        () => el.classList.remove('tile-new'),
        { once: true }
      );
    }
    els.tileLayer.appendChild(el);
  }

  function spawnRandomTile() {
    const cells = emptyCells();
    if (!cells.length) return;
    const [r, c] = cells[(Math.random() * cells.length) | 0];
    const tile = {
      id: state.nextId++,
      value: Math.random() < 0.9 ? 2 : 4,
      r, c, el: null,
    };
    state.grid[r][c] = tile;
    createTile(tile, true);
  }

  function slideTo(tile, r, c) {
    tile.r = r;
    tile.c = c;
    tile.el.dataset.r = r;
    tile.el.dataset.c = c;
    tile.el.style.zIndex = '2'; // 滑动中的方块压在被吃方块之上
  }

  function flushPending() {
    for (const el of state.pending) el.remove();
    state.pending = [];
  }

  /* ---------- 计分 ---------- */

  function showScoreGain(points) {
    if (points <= 0) return;
    const span = document.createElement('span');
    span.className = 'score-gain';
    span.textContent = '+' + points;
    els.scoreFx.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  }

  function addScore(points) {
    state.score += points;
    els.score.textContent = state.score;
    showScoreGain(points);
    if (state.score > state.best) {
      state.best = state.score;
      els.best.textContent = state.best;
      saveBest();
    }
  }

  /* ---------- 移动与合并 ---------- */

  function move(dir) {
    if (state.over || (state.won && !state.keepPlaying)) return;
    flushPending();
    for (const row of state.grid) {
      for (const tile of row) if (tile) tile.el.style.zIndex = '';
    }

    const v = VECTORS[dir];
    const range = [0, 1, 2, 3];
    const rows = v.r === 1 ? [3, 2, 1, 0] : range;
    const cols = v.c === 1 ? [3, 2, 1, 0] : range;
    const mergedIds = new Set(); // 本回合已参与合并的方块不能再合并
    let moved = false;
    let gained = 0;

    for (const r of rows) {
      for (const c of cols) {
        const tile = state.grid[r][c];
        if (!tile) continue;

        // 沿方向找最远可达位置
        let cr = r, cc = c;
        let mergeTarget = null;
        for (;;) {
          const nr = cr + v.r;
          const nc = cc + v.c;
          if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) break;
          const next = state.grid[nr][nc];
          if (!next) {
            cr = nr;
            cc = nc;
            continue;
          }
          if (
            next.value === tile.value &&
            !mergedIds.has(next.id) &&
            !mergedIds.has(tile.id)
          ) {
            mergeTarget = next;
          }
          break;
        }

        if (mergeTarget) {
          // 滑动的方块并入 target：target 被吃掉，tile 翻倍留在原地
          state.grid[r][c] = null;
          state.grid[mergeTarget.r][mergeTarget.c] = tile;
          slideTo(tile, mergeTarget.r, mergeTarget.c);
          state.pending.push(mergeTarget.el);
          // 滑动一结束就移除被合并方块，合并数字立即生效；快速连按时由 move 开头的 flushPending 兜底
          setTimeout(() => mergeTarget.el.remove(), 150);
          tile.value *= 2;
          gained += tile.value;
          mergedIds.add(tile.id);
          setTileFace(tile, true);
          moved = true;
        } else if (cr !== r || cc !== c) {
          state.grid[r][c] = null;
          state.grid[cr][cc] = tile;
          slideTo(tile, cr, cc);
          moved = true;
        }
      }
    }

    if (!moved) {
      shakeBoard();
      return;
    }

    addScore(gained);
    spawnRandomTile();

    if (!state.won && hasValue(WIN_VALUE)) {
      state.won = true;
      showWinOverlay();
      return;
    }
    if (!movesAvailable()) {
      state.over = true;
      showLoseOverlay();
    }
  }

  function hasValue(target) {
    for (const row of state.grid) {
      for (const tile of row) {
        if (tile && tile.value >= target) return true;
      }
    }
    return false;
  }

  function movesAvailable() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const tile = state.grid[r][c];
        if (!tile) return true;
        if (c + 1 < SIZE && state.grid[r][c + 1] &&
            state.grid[r][c + 1].value === tile.value) return true;
        if (r + 1 < SIZE && state.grid[r + 1][c] &&
            state.grid[r + 1][c].value === tile.value) return true;
      }
    }
    return false;
  }

  function shakeBoard() {
    els.board.classList.remove('shake');
    void els.board.offsetWidth;
    els.board.classList.add('shake');
    setTimeout(() => els.board.classList.remove('shake'), 300);
  }

  /* ---------- 遮罩层 ---------- */

  function showOverlay(title, text, buttons) {
    els.overlayTitle.textContent = title;
    els.overlayText.textContent = text;
    els.overlayButtons.innerHTML = '';
    for (const { label, primary, onClick } of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (primary ? '' : ' ghost');
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      els.overlayButtons.appendChild(btn);
    }
    els.overlay.classList.add('show');
  }

  function hideOverlay() {
    els.overlay.classList.remove('show');
  }

  function showWinOverlay() {
    showOverlay('🎉 你赢啦！', `达到了 ${WIN_VALUE}，本局得分 ${state.score} 分`, [
      { label: '继续挑战', primary: true, onClick: () => { state.keepPlaying = true; hideOverlay(); } },
      { label: '再来一局', primary: false, onClick: newGame },
    ]);
  }

  function showLoseOverlay() {
    showOverlay('游戏结束 💔', `本局得分 ${state.score} 分，最高分 ${state.best} 分`, [
      { label: '再来一局', primary: true, onClick: newGame },
    ]);
  }

  /* ---------- 开局 ---------- */

  function newGame() {
    flushPending();
    hideOverlay();
    els.tileLayer.innerHTML = '';
    state.grid = emptyGrid();
    state.score = 0;
    state.won = false;
    state.keepPlaying = false;
    state.over = false;
    state.nextId = 1;
    els.score.textContent = '0';
    spawnRandomTile();
    spawnRandomTile();
  }

  /* ---------- 输入 ---------- */

  const KEY_DIRS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  };

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const dir = KEY_DIRS[e.key];
    if (!dir) return;
    e.preventDefault();
    move(dir);
  });

  let touchStart = null;
  els.board.addEventListener('touchstart', (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  // 阻止棋盘上的滑动触发页面滚动
  els.board.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  els.board.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });

  els.newGameBtn.addEventListener('click', newGame);

  /* ---------- 启动 ---------- */
  state.best = loadBest();
  els.best.textContent = state.best;
  newGame();
})();
