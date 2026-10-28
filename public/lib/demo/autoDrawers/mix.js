import { seededRandom } from '../../random.js';
import { SchemePaletteMaker, PALETTE_SCHEMES, paperGradient } from '../../SchemePaletteMaker.js';

const ROLL_SCHEMES = PALETTE_SCHEMES.filter(s => s.id !== 'black').map(s => s.id);

/**
 * Composes one plan from one to three auto drawers over a shared palette,
 * background, and canvas. Each drawer composes its own marks at a seed derived
 * from the shared seed, all pinned to the same base palette (`scheme` chooses
 * it, or 'auto' rolls one from the seed). With more than one drawer the marks
 * are shuffled into a single random order, so the styles interleave. `churn`
 * passes through to each drawer as the per-mark chance of a fresh palette.
 *
 * @param {AutoDrawer[]} drawers   One to three selected drawers.
 * @param {object} opts
 * @param {number} opts.seed
 * @param {number} opts.extentX
 * @param {number} opts.extentY
 * @param {object[]} opts.registry
 * @param {string} [opts.scheme]   A palette scheme id, or 'auto'.
 * @param {number} [opts.churn]    Per-mark palette-change probability.
 */
export function composeMixedPlan(drawers, { seed, extentX, extentY, registry, scheme = 'auto', churn = 0 }) {
    const rng = seededRandom(seed);
    // One base palette for the whole drawing, shared by every selected drawer.
    const hue = rng() * 360;
    const baseScheme = scheme === 'auto' ? ROLL_SCHEMES[Math.floor(rng() * ROLL_SCHEMES.length)] : scheme;
    const paletteSeed = Math.floor(rng() * 1e9);
    const paletteCfg = { hue, scheme: baseScheme, seed: paletteSeed };
    const basePalette = new SchemePaletteMaker({ ...paletteCfg, count: 5 }).generate();
    const background = paperGradient(basePalette, rng);
    const colors = basePalette.entries.map(e => e.hex);

    const marks = [];
    drawers.forEach((drawer, i) => {
        const sub = drawer.plan({
            seed: seed + (i + 1) * 104729, extentX, extentY, registry,
            palette: paletteCfg, churn,
        });
        marks.push(...sub.marks);
    });

    // A mix interleaves the styles by shuffling every mark into one order; a
    // single drawer keeps its own order, where earlier marks sit behind later.
    if (drawers.length > 1) {
        const sh = seededRandom(seed + 13);
        for (let i = marks.length - 1; i > 0; i--) {
            const j = Math.floor(sh() * (i + 1));
            [marks[i], marks[j]] = [marks[j], marks[i]];
        }
    }

    return { background, colors, marks };
}
