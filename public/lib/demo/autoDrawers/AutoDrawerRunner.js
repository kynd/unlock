import { composeMixedPlan } from './mix.js';

const MAX_SELECTION = 3;

/**
 * Runs auto drawers on a DrawingTool: composes a plan from the selected
 * drawers (one to three, mixed), a palette scheme, and a churn, draws it
 * through the engine at once, and replays it on demand. Headless, like the
 * engine: a UI is a client of this API and stays in sync through its events.
 *
 * Events: 'selection' (the chosen drawers changed), 'scheme', 'churn',
 * 'size', 'generate' (with { seed, marks }), 'play-start', 'play-end' (with
 * whether it ran to the end), 'record-start', 'record-end'.
 */
export class AutoDrawerRunner {
    /**
     * @param {DrawingTool} tool
     * @param {AutoDrawer[]} drawers   Every available drawer.
     * @param {object} [opts]
     * @param {number} [opts.seed]
     * @param {number} [opts.speed]      Points fed per frame on playback.
     * @param {number} [opts.strokeWait] Seconds of rest after each stroke on playback.
     * @param {number} [opts.loopWait]   Seconds a loop rests on a finished drawing.
     */
    constructor(tool, drawers, { seed = null, speed = 6, strokeWait = 0.05, loopWait = 2 } = {}) {
        if (!drawers.length) throw new Error('AutoDrawerRunner: no drawers');
        this.tool = tool;
        this.drawers = drawers;
        this.selection = [drawers[0]];
        this.scheme = 'auto';
        this.churn = 0.2;
        this.canvasSize = null;
        this.seed = seed ?? AutoDrawerRunner.rollSeed();
        this.speed = speed;
        this.strokeWait = strokeWait;
        this.loopWait = loopWait;
        // Generate jumps straight to the final drawing; Replay animates it.
        this.animate = false;
        this.loop = false;
        this.marks = 0;
        this._listeners = new Map();
        this._stopped = false;
        this._loopTimer = 0;

        tool.on('replay-end', () => this._ended('play-end'));
        tool.on('record-end', () => this._ended('record-end'));
    }

    /** A fresh seed, a positive integer. */
    static rollSeed() { return 1 + Math.floor(Math.random() * 999999); }

    on(event, fn) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(fn);
        return this;
    }

    off(event, fn) {
        this._listeners.get(event)?.delete(fn);
        return this;
    }

    _emit(event, payload) {
        this._listeners.get(event)?.forEach(fn => fn(payload));
    }

    get playing() { return this.tool.state.replaying; }

    /** The ids of the selected drawers, for file names and the UI. */
    get selectedIds() { return this.selection.map(d => d.id); }

    /** A stable name for the current drawing's files. */
    fileLabel() {
        const ids = this.selectedIds.join('+') || 'auto';
        return `${ids}-${this.seed}`;
    }

    /**
     * Sets the selection to the drawers with the given ids (capped at three,
     * never empty). Does not generate.
     */
    setSelection(ids) {
        const chosen = ids.map(id => this.drawers.find(d => d.id === id)).filter(Boolean).slice(0, MAX_SELECTION);
        this.selection = chosen.length ? chosen : [this.drawers[0]];
        this._emit('selection');
    }

    /** Adds or removes one drawer from the selection, keeping it within bounds. */
    toggle(id) {
        const has = this.selectedIds.includes(id);
        let ids = this.selectedIds;
        if (has) ids = ids.filter(x => x !== id);
        else ids = [...ids, id].slice(-MAX_SELECTION);
        this.setSelection(ids);
    }

    /** Picks one to three drawers at random, then generates. */
    randomizeAlgorithms() {
        const pool = [...this.drawers];
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const n = 1 + Math.floor(Math.random() * MAX_SELECTION);
        this.setSelection(pool.slice(0, n).map(d => d.id));
        this.generate();
    }

    /** 'auto' or a palette scheme id. Regenerates the same composition. */
    setScheme(scheme) {
        this.scheme = scheme;
        this._emit('scheme');
        this.generate();
    }

    /** Per-stroke probability (0..1) of a fresh palette. Regenerates. */
    setChurn(churn) {
        this.churn = Math.min(Math.max(churn, 0), 1);
        this._emit('churn');
        this.generate();
    }

    /**
     * Sets the output canvas to a fixed pixel size (or null to fit the window),
     * then recomposes for the new extents.
     */
    setCanvasSize(size) {
        this.canvasSize = size ?? null;
        this.tool.stage.viewport.setFixedSize(size ? size.width : null, size ? size.height : null);
        this._emit('size');
        this.generate();
    }

    /**
     * Composes and draws the selection at `seed`, then animates it when
     * `animate` is on. A running playback is stopped first.
     */
    generate(seed = this.seed) {
        clearTimeout(this._loopTimer);
        if (this.playing) this.stop();
        this.seed = seed;
        const plan = composeMixedPlan(this.selection, {
            seed, extentX: this.tool.stage.extentX, extentY: this.tool.stage.extentY,
            registry: this.tool.registry, scheme: this.scheme, churn: this.churn,
        });
        // The cycle's seed follows the drawing's, so each mark's own seeded look
        // reproduces with it.
        this.tool.drawPlan(plan, { seed: 1 + (seed % 9973) * 1000 });
        this.marks = plan.marks.length;
        this._emit('generate', { seed, marks: this.marks });
        if (this.animate) this.play();
    }

    /** Generates at a fresh seed. */
    regenerate() { this.generate(AutoDrawerRunner.rollSeed()); }

    /** Animates the current drawing from the start. */
    play() {
        clearTimeout(this._loopTimer);
        this._stopped = false;
        if (this.tool.replay(this._playOptions())) this._emit('play-start');
    }

    /** Ends a running playback, showing the finished drawing. */
    stop() {
        this._stopped = true;
        clearTimeout(this._loopTimer);
        if (this.playing) this.tool.stopReplay();
    }

    /** Plays the current drawing from the start while saving it as a video. */
    record() {
        clearTimeout(this._loopTimer);
        this._stopped = false;
        if (this.tool.recordVideo(this._playOptions())) this._emit('record-start');
    }

    /** Points fed per frame; also applies to a running playback. */
    setSpeed(pointsPerFrame) {
        this.speed = pointsPerFrame;
        this.tool.setReplaySpeed(pointsPerFrame);
    }

    /** With `loop` on, a finished playback rests `loopWait` seconds, then the
     * next drawing generates at a fresh seed. */
    setLoop(on) {
        this.loop = Boolean(on);
        if (!this.loop) clearTimeout(this._loopTimer);
    }

    setAnimate(on) { this.animate = Boolean(on); }

    _playOptions() {
        return { pointsPerFrame: this.speed, strokeWaitMs: this.strokeWait * 1000 };
    }

    _ended(event) {
        const completed = !this._stopped;
        this._emit(event, completed);
        if (event === 'play-end' && completed && this.loop) {
            this._loopTimer = setTimeout(() => this.regenerate(), this.loopWait * 1000);
        }
    }
}
