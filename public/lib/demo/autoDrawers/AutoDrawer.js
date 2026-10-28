import * as THREE from 'three';
import { PIXELS_PER_UNIT } from '../../CanvasBuffer.js';
import { seededRandom, seededNoise2D } from '../../random.js';
import { SchemePaletteMaker, PALETTE_SCHEMES, paperGradient } from '../../SchemePaletteMaker.js';
import { catmullRomSpline, resampleEvery } from '../../curves.js';
import { randomValues, toolCategory } from '../toolRegistry.js';

// Pen samples about two CSS pixels apart, close to what a drawn gesture records,
// so a playback animates a generated stroke at a hand's pace.
const SPACING = 0.012;
const DEFAULT_WIDTH_RANGE = [2, 64];
const ROLL_SCHEMES = PALETTE_SCHEMES.filter(s => s.id !== 'black').map(s => s.id);

/**
 * The base of every auto drawer: an algorithm that composes a whole drawing
 * from a seed. `plan({ seed, extentX, extentY, registry })` returns the plan
 * shape an initializer rolls (`{ background, colors, marks }`), which
 * `DrawingTool.drawPlan` runs through its cycle, so the drawing records,
 * replays, and exports like anything drawn by hand.
 *
 * A subclass passes its `id`, `label`, and `description` to the constructor
 * and implements `compose()`, adding marks with `stroke`, `fill`, and `shape`.
 * Every random choice goes through the seeded helpers here (`random`, `range`,
 * `pick`, `noise`, ...), so the same seed and canvas size always compose the
 * same plan. `rollPalette` and `rollBackground` may be overridden too.
 */
export class AutoDrawer {
    /**
     * @param {object} opts
     * @param {string} opts.id            Stable identifier.
     * @param {string} opts.label         Name shown in a menu.
     * @param {string} [opts.description] One sentence on what it draws.
     */
    constructor({ id, label, description = '' }) {
        this.id = id;
        this.label = label;
        this.description = description;
    }

    /**
     * Composes a plan. `registry` is the tool set the marks may name; tools a
     * subclass asks for that are missing from it are skipped. `palette` pins the
     * base palette (`{ hue, scheme, seed }`, any field omitted rolls from the
     * seed), so a mix shares one palette. `churn` is the per-mark probability of
     * rolling a fresh palette mid-drawing; it runs on its own seeded stream, so
     * turning it on does not disturb the layout.
     */
    plan({ seed, extentX, extentY, registry, palette = null, churn = 0 }) {
        this.seed = seed;
        this.rand = seededRandom(seed);
        this._noise = null;
        this.extentX = extentX;
        this.extentY = extentY;
        this.registry = registry;
        this.marks = [];
        this._paletteOverride = palette;
        this._churn = churn;
        this._churnRand = seededRandom(seed + 7777);
        this.palette = this.rollPalette();
        this.colors = this.palette.entries.map(e => e.hex);
        const background = this.rollBackground();
        this.compose();
        return { background, colors: this.colors, marks: this.marks };
    }

    /** Adds the drawing's marks. Subclasses implement it. */
    compose() {
        throw new Error(`${this.constructor.name} does not implement compose()`);
    }

    /**
     * A five-color palette. Rolls hue, scheme, and seed from `rng` (the plan's
     * own stream by default), but a palette override pins any of the three, so a
     * mix of drawers shares one palette. The three rolls happen whether or not
     * they are used, so the override never shifts the layout stream.
     */
    rollPalette(rng = this.rand) {
        const hueRoll = rng() * 360;
        const schemeRoll = ROLL_SCHEMES[Math.floor(rng() * ROLL_SCHEMES.length)];
        const seedRoll = Math.floor(rng() * 1e9);
        const o = this._paletteOverride;
        return new SchemePaletteMaker({
            hue: o?.hue ?? hueRoll,
            count: 5,
            scheme: o?.scheme ?? schemeRoll,
            seed: o?.seed ?? seedRoll,
        }).generate();
    }

    /** A fresh palette rolled from the churn stream: a new hue and seed, keeping
     * a pinned scheme if the override has one. Used mid-drawing by churn. */
    _churnPalette() {
        const r = this._churnRand;
        const scheme = this._paletteOverride?.scheme
            ?? ROLL_SCHEMES[Math.floor(r() * ROLL_SCHEMES.length)];
        return new SchemePaletteMaker({
            hue: r() * 360, count: 5, scheme, seed: Math.floor(r() * 1e9),
        }).generate();
    }

    /** A paper gradient tinted from the palette. */
    rollBackground() {
        return paperGradient(this.palette, this.rand);
    }

    // ------------------------------------------------------------------
    // Seeded randomness

    /** Uniform in [0, 1). */
    random() { return this.rand(); }

    /** Uniform in [min, max). */
    range(min, max) { return min + this.rand() * (max - min); }

    /** An integer in [min, max], both ends included. */
    int(min, max) { return min + Math.floor(this.rand() * (max - min + 1)); }

    /** Whether an event of probability `p` happens. */
    chance(p) { return this.rand() < p; }

    /** One element of a list. */
    pick(list) { return list[Math.floor(this.rand() * list.length)]; }

    /** A shuffled copy of a list (Fisher-Yates). */
    shuffle(list) {
        const out = [...list];
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(this.rand() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }

    /** Roughly normal, mean 0 and deviation 1 (a sum of uniforms). */
    gaussian() {
        return (this.rand() + this.rand() + this.rand() + this.rand() - 2) * 1.7320508;
    }

    /** Smooth value noise in [-1, 1], about one feature per unit, seeded by the plan. */
    noise(x, y) {
        this._noise ??= seededNoise2D(this.seed + 0.5);
        return this._noise(x, y);
    }

    // ------------------------------------------------------------------
    // Palette

    /** The palette's colors ordered from lightest to darkest. */
    byLightness() {
        return [...this.palette.entries].sort((a, b) => b.L - a.L).map(e => e.hex);
    }

    // ------------------------------------------------------------------
    // Tools

    /**
     * Registry entries matching every given filter: `ids` (in that order),
     * `kind` ('stroke', 'blob', or 'shape'), and `category` (one or a list of
     * tool categories). Falls back to any tool of the kind, then to the whole
     * registry, so a narrow page set still draws.
     */
    tools({ ids = null, kind = null, category = null } = {}) {
        const cats = category === null ? null : [].concat(category);
        const match = e => (kind === null || e.kind === kind)
            && (cats === null || cats.includes(toolCategory(e)));
        const found = ids
            ? ids.map(id => this.registry.find(e => e.id === id)).filter(Boolean).filter(match)
            : this.registry.filter(match);
        if (found.length) return found;
        const ofKind = this.registry.filter(e => kind === null || e.kind === kind);
        return ofKind.length ? ofKind : this.registry;
    }

    /** One tool picked from `tools(filters)`. */
    tool(filters) { return this.pick(this.tools(filters)); }

    /** A seeded roll of an entry's parameters. */
    values(entry) { return randomValues(entry, this.rand); }

    /** A width in pixels at `t` (0..1) along the entry's canonical range. */
    widthAt(entry, t) {
        const [min, max] = entry.width ?? DEFAULT_WIDTH_RANGE;
        return min + (max - min) * Math.min(Math.max(t, 0), 1);
    }

    // ------------------------------------------------------------------
    // Geometry, in world units

    /** A point carrying a pressure. */
    point(x, y, pressure = 0) {
        const p = new THREE.Vector3(x, y, 0);
        p.pressure = pressure;
        return p;
    }

    /** A smooth path through `knots` (`[x, y]` pairs or vectors), sampled at pen spacing. */
    curve(knots, { closed = false, spacing = SPACING } = {}) {
        const vs = knots.map(k => Array.isArray(k) ? new THREE.Vector3(k[0], k[1], 0) : k.clone());
        return resampleEvery(catmullRomSpline(vs, 16, closed), spacing);
    }

    /** A straight path from `a` to `b`, sampled at pen spacing. */
    line(a, b, { spacing = SPACING } = {}) {
        const pa = Array.isArray(a) ? new THREE.Vector3(a[0], a[1], 0) : a;
        const pb = Array.isArray(b) ? new THREE.Vector3(b[0], b[1], 0) : b;
        return resampleEvery([pa, pb], spacing);
    }

    /**
     * Sets a pen pressure along a path from one of several seeded shapes, so a
     * stroke is not always thin at both ends. The pressure stays within
     * `[lo, hi]` (the lo keeps the tips from vanishing). `shape` forces one:
     * 'flat' (even), 'both' (thin at both ends), 'in' (swelling), 'out'
     * (fading), or 'wave' (wavering); omitted, it is picked from the seed.
     * Returns the path.
     */
    pressure(points, { lo = 0.42, hi = 0.72, shape = null } = {}) {
        const n = points.length;
        const kind = shape ?? this.pick(['flat', 'both', 'both', 'in', 'in', 'out', 'out', 'wave']);
        const flat = this.range(lo, hi);
        const phase = this.random() * Math.PI * 2;
        const freq = this.range(1.2, 3.2);
        const smooth = s => s * s * (3 - 2 * s);
        points.forEach((p, i) => {
            const t = n > 1 ? i / (n - 1) : 0.5;
            let u;
            if (kind === 'flat') { p.pressure = flat; return; }
            else if (kind === 'both') u = smooth(Math.min(t / 0.3, 1)) * smooth(Math.min((1 - t) / 0.3, 1));
            else if (kind === 'in') u = smooth(t);
            else if (kind === 'out') u = smooth(1 - t);
            else u = 0.5 + 0.5 * Math.sin(phase + t * freq * Math.PI * 2);
            p.pressure = lo + (hi - lo) * u;
        });
        return points;
    }

    /**
     * A pen pressure along a path. Kept for the drawers that still ask for a
     * taper by `peak` and `ends`; it raises the floor and picks a seeded shape,
     * so even a "taper" is not always thin at both ends.
     */
    taper(points, { peak = 0.72, ends = 0.42, shape = null } = {}) {
        const lo = Math.min(Math.max(ends, 0.38), 0.6);
        const hi = Math.min(Math.max(peak, lo + 0.12), 0.9);
        return this.pressure(points, { lo, hi, shape });
    }

    /** Whether (x, y) lies inside the canvas, `margin` in from its edges. */
    inside(x, y, margin = 0) {
        return Math.abs(x) <= this.extentX - margin && Math.abs(y) <= this.extentY - margin;
    }

    // ------------------------------------------------------------------
    // Marks

    _entry(tool) {
        return typeof tool === 'string' ? this.registry.find(e => e.id === tool) : tool;
    }

    _mark(entry, path, { widthPx, colorA, colorB, values, initial, sens }) {
        // Churn: before this mark picks its colors, a seeded roll may swap the
        // palette, so the drawing drifts through several palettes as it fills.
        if (this._churn > 0 && this._churnRand() < this._churn) {
            this.palette = this._churnPalette();
            this.colors = this.palette.entries.map(e => e.hex);
        }
        const mark = {
            toolId: entry.id, values: values ?? this.values(entry),
            colorA: colorA ?? this.pick(this.colors), colorB: colorB ?? this.pick(this.colors),
            widthPx, path,
        };
        if (initial) mark.initial = true;
        if (sens !== undefined) mark.sens = sens;
        this.marks.push(mark);
        return mark;
    }

    /**
     * A stroke along `points` (a path with pressures; see `taper`). `widthPx`
     * defaults to the middle of the tool's range; colors default to palette
     * picks; `values` to a seeded roll.
     */
    stroke(tool, points, opts = {}) {
        const entry = this._entry(tool);
        if (!entry || points.length < 2) return null;
        return this._mark(entry, points, { ...opts, widthPx: opts.widthPx ?? this.widthAt(entry, 0.5) });
    }

    /**
     * A fill whose outline closes around `spine` at `radius` world units. The
     * spine carries no pressure, so the radius holds as given.
     */
    fill(tool, spine, { radius = 0.3, ...opts } = {}) {
        const entry = this._entry(tool);
        if (!entry || spine.length < 2) return null;
        spine.forEach(p => { p.pressure = 0; });
        return this._mark(entry, spine, { ...opts, widthPx: radius / 1.3 * PIXELS_PER_UNIT });
    }

    /** A shape fill spanning the endpoints `a` and `b`. */
    shape(tool, a, b, opts = {}) {
        const entry = this._entry(tool);
        if (!entry) return null;
        return this._mark(entry, this.line(a, b), { ...opts, widthPx: opts.widthPx ?? 24 });
    }
}
