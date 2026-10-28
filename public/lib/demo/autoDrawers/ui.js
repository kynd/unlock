import { PALETTE_SCHEMES } from '../../SchemePaletteMaker.js';

const CANVAS_SIZES = [
    { label: 'Fit window', value: null },
    { label: '1920 × 1080', value: { width: 1920, height: 1080 } },
    { label: '1080 × 1920', value: { width: 1080, height: 1920 } },
    { label: '1600 × 1200', value: { width: 1600, height: 1200 } },
    { label: '1200 × 1600', value: { width: 1200, height: 1600 } },
    { label: '1280 × 1280', value: { width: 1280, height: 1280 } },
];

const TEMPLATE = /* html */`
  <div class="canvas-wrap">
    <canvas id="canvas"></canvas>
  </div>

  <div class="dp-panel">
    <div class="dp-sub-label">Algorithms (up to 3)</div>
    <div id="algo-list"></div>
    <div class="dp-btn-row">
      <button id="random-algo-btn" class="dp-btn secondary">🎲 Randomize</button>
    </div>

    <div class="dp-sub-label">Canvas size</div>
    <select id="size-select" class="dp-select"></select>

    <div class="dp-sub-label">Palette</div>
    <select id="scheme-select" class="dp-select"></select>
    <div class="dp-row">
      <span class="dp-label">Change / stroke</span>
      <input id="churn-range" class="dp-range" type="range" min="0" max="100" step="1" />
      <span id="churn-val" class="dp-val"></span>
    </div>

    <div class="dp-sub-label">Seed</div>
    <div class="dp-row">
      <input id="seed-input" class="dp-input" type="number" min="1" step="1" />
    </div>
    <div class="dp-btn-row">
      <button id="generate-btn" class="dp-btn secondary">Generate</button>
      <button id="regenerate-btn" class="dp-btn">New seed</button>
    </div>
    <div class="dp-stats" id="stats"></div>

    <div class="dp-sub-label">Playback</div>
    <div class="dp-btn-row">
      <button id="play-btn" class="dp-btn secondary">Replay</button>
    </div>
    <div class="dp-row">
      <span class="dp-label">Speed</span>
      <input id="speed-range" class="dp-range" type="range" min="1" max="40" step="1" />
      <span id="speed-val" class="dp-val"></span>
    </div>
    <label class="dp-check"><input id="animate-check" type="checkbox" />Animate on generate</label>
    <label class="dp-check"><input id="loop-check" type="checkbox" />Loop with new seeds</label>

    <div class="dp-sub-label">Export</div>
    <div class="dp-btn-row">
      <button id="record-btn" class="dp-btn secondary">Record video</button>
    </div>
    <div class="dp-btn-row">
      <button id="png-btn" class="dp-btn secondary">Download PNG</button>
      <button id="json-btn" class="dp-btn secondary">Download JSON</button>
    </div>

    <hr class="dp-divider" />
    <div class="dp-btn-row">
      <button id="fullscreen-btn" class="dp-btn secondary">Full screen</button>
    </div>
  </div>
`;

/** Injects the auto drawer's layout into `root` and returns it with its canvas. */
export function buildAutoDrawerLayout({ root = document.body } = {}) {
    const layout = document.createElement('div');
    layout.className = 'demo-layout';
    layout.innerHTML = TEMPLATE;
    root.appendChild(layout);
    return { layout, canvas: layout.querySelector('#canvas') };
}

/**
 * The default auto drawer UI: the algorithm picker (up to three, mixed), the
 * canvas size, the palette, the seed, playback, and export, wired as a client
 * of the runner. Every handler is a runner or engine call and every display
 * update a subscription.
 */
export function attachAutoDrawerUi(runner, layout) {
    const $ = id => layout.querySelector('#' + id);
    const tool = runner.tool;

    // ------------------------------------------------------------------
    // Algorithms: up to three checkboxes, mixed in the drawing.
    const algoList = $('algo-list');
    for (const drawer of runner.drawers) {
        const label = document.createElement('label');
        label.className = 'dp-check';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = drawer.id;
        label.append(cb, drawer.label);
        cb.addEventListener('change', () => { runner.toggle(drawer.id); runner.generate(); });
        algoList.appendChild(label);
    }
    const syncAlgos = () => {
        const sel = runner.selectedIds;
        algoList.querySelectorAll('input[type=checkbox]').forEach(cb => {
            cb.checked = sel.includes(cb.value);
            cb.disabled = !cb.checked && sel.length >= 3;
        });
    };
    runner.on('selection', syncAlgos);
    syncAlgos();
    $('random-algo-btn').addEventListener('click', () => runner.randomizeAlgorithms());

    // ------------------------------------------------------------------
    // Canvas size
    const sizeSelect = $('size-select');
    CANVAS_SIZES.forEach((s, i) => {
        const o = document.createElement('option');
        o.value = String(i);
        o.textContent = s.label;
        sizeSelect.appendChild(o);
    });
    const sizeMatches = (a, b) => (!a && !b) || (!!a && !!b && a.width === b.width && a.height === b.height);
    const syncSize = () => {
        const i = CANVAS_SIZES.findIndex(s => sizeMatches(s.value, runner.canvasSize));
        sizeSelect.value = String(i >= 0 ? i : 0);
    };
    syncSize();
    runner.on('size', syncSize);
    sizeSelect.addEventListener('change', () => {
        runner.setCanvasSize(CANVAS_SIZES[Number(sizeSelect.value)].value);
    });

    // ------------------------------------------------------------------
    // Palette
    const schemeSelect = $('scheme-select');
    const addScheme = (value, text) => {
        const o = document.createElement('option');
        o.value = value; o.textContent = text;
        schemeSelect.appendChild(o);
    };
    addScheme('auto', 'Auto (random)');
    for (const s of PALETTE_SCHEMES) addScheme(s.id, s.label);
    schemeSelect.value = runner.scheme;
    schemeSelect.addEventListener('change', () => runner.setScheme(schemeSelect.value));

    const churnRange = $('churn-range');
    const churnVal = $('churn-val');
    churnRange.value = String(Math.round(runner.churn * 100));
    churnVal.textContent = churnRange.value + '%';
    churnRange.addEventListener('input', () => { churnVal.textContent = churnRange.value + '%'; });
    churnRange.addEventListener('change', () => runner.setChurn(Number(churnRange.value) / 100));

    // ------------------------------------------------------------------
    // Seed
    const seedInput = $('seed-input');
    const readSeed = () => {
        const v = Math.round(Number(seedInput.value));
        return Number.isFinite(v) && v >= 1 ? v : runner.seed;
    };
    seedInput.value = runner.seed;
    seedInput.addEventListener('keydown', e => { if (e.key === 'Enter') runner.generate(readSeed()); });
    $('generate-btn').addEventListener('click', () => runner.generate(readSeed()));
    $('regenerate-btn').addEventListener('click', () => runner.regenerate());
    const stats = $('stats');
    runner.on('generate', ({ seed, marks }) => {
        seedInput.value = seed;
        stats.innerHTML = `<span>Marks <strong>${marks}</strong></span>`;
    });

    // ------------------------------------------------------------------
    // Playback
    const playBtn = $('play-btn');
    playBtn.addEventListener('click', () => {
        if (runner.playing) runner.stop();
        else runner.play();
    });
    const speedRange = $('speed-range');
    const speedVal = $('speed-val');
    speedRange.value = runner.speed;
    speedVal.textContent = runner.speed;
    speedRange.addEventListener('input', () => {
        runner.setSpeed(Number(speedRange.value));
        speedVal.textContent = speedRange.value;
    });
    const animateCheck = $('animate-check');
    animateCheck.checked = runner.animate;
    animateCheck.addEventListener('change', () => runner.setAnimate(animateCheck.checked));
    const loopCheck = $('loop-check');
    loopCheck.checked = runner.loop;
    loopCheck.addEventListener('change', () => runner.setLoop(loopCheck.checked));

    // ------------------------------------------------------------------
    // Export
    const recordBtn = $('record-btn');
    const pngBtn = $('png-btn');
    const jsonBtn = $('json-btn');
    recordBtn.addEventListener('click', () => runner.record());
    pngBtn.addEventListener('click', () => tool.downloadImage(runner.fileLabel()));
    jsonBtn.addEventListener('click', () => tool.downloadDrawing(runner.fileLabel()));

    // While a playback runs, the replay button stops it; a recording runs to
    // its end, so everything that would disturb it is disabled.
    const genControls = [
        seedInput, $('generate-btn'), $('regenerate-btn'), $('random-algo-btn'),
        sizeSelect, schemeSelect, churnRange,
        ...algoList.querySelectorAll('input[type=checkbox]'),
    ];
    const setPlaying = (on, recording = false) => {
        playBtn.textContent = on && !recording ? 'Stop' : 'Replay';
        playBtn.disabled = recording;
        for (const el of [recordBtn, pngBtn, jsonBtn]) el.disabled = on;
        for (const el of genControls) el.disabled = recording;
        if (!recording) syncAlgos();
        recordBtn.classList.toggle('active', recording);
    };
    runner.on('play-start', () => setPlaying(true));
    runner.on('play-end', () => setPlaying(false));
    runner.on('record-start', () => setPlaying(true, true));
    runner.on('record-end', () => setPlaying(false));

    // ------------------------------------------------------------------
    // Full screen: when the surface fills the window, the drawing composes
    // again for the new extents; a fixed canvas size just refits its letterbox.
    let recomposeOnResize = false;
    $('fullscreen-btn').addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else layout.requestFullscreen();
    });
    document.addEventListener('fullscreenchange', () => { recomposeOnResize = true; });
    tool.on('resize', () => {
        if (!recomposeOnResize || tool.state.recording) return;
        recomposeOnResize = false;
        runner.generate();
    });
}
