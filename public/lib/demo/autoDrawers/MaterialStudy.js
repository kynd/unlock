import { AutoDrawer } from './AutoDrawer.js';

const MATERIAL_FILLS = ['metal', 'glass-blob', 'facet-glass', 'marble', 'rock', 'sand'];
const MATERIAL_STROKES = ['chrome', 'glass-stroke', 'frosted-glass'];

/**
 * Reflective and refractive materials. A few large material fills anchor the
 * canvas, each a rounded blob, with slimmer material strokes threaded between
 * them as highlights.
 */
export class MaterialStudy extends AutoDrawer {
    constructor() {
        super({
            id: 'material', label: 'Material study',
            description: 'Large metal, glass, and stone fills with material strokes threaded between.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const blobs = this.int(3, 6);
        for (let i = 0; i < blobs; i++) {
            const tool = this.tool({ ids: MATERIAL_FILLS, kind: 'blob' });
            const cx = this.range(-ex * 0.7, ex * 0.7);
            const cy = this.range(-ey * 0.7, ey * 0.7);
            const r = this.range(0.3, 0.75);
            const a = this.range(0, Math.PI * 2), len = r * this.range(0.5, 1.3);
            const knots = [0, 1, 2].map(k => [
                cx + Math.cos(a) * len * (k - 1) + this.range(-0.08, 0.08),
                cy + Math.sin(a) * len * (k - 1) + this.range(-0.08, 0.08),
            ]);
            this.fill(tool, this.curve(knots), {
                radius: r, colorA: this.pick(this.colors), colorB: this.pick(this.colors),
            });
        }
        const strokes = this.int(4, 10);
        for (let i = 0; i < strokes; i++) {
            const tool = this.tool({ ids: MATERIAL_STROKES, kind: 'stroke' });
            const cx = this.range(-ex, ex), cy = this.range(-ey, ey);
            const a = this.range(0, Math.PI * 2), len = this.range(0.6, 1.6);
            const bend = this.range(-0.3, 0.3);
            const knots = [-1, 0, 1].map(t => [
                cx + Math.cos(a) * len / 2 * t - Math.sin(a) * bend * (1 - t * t),
                cy + Math.sin(a) * len / 2 * t + Math.cos(a) * bend * (1 - t * t),
            ]);
            this.stroke(tool, this.taper(this.curve(knots)), {
                widthPx: this.widthAt(tool, this.range(0.3, 0.7)),
                colorA: this.pick(this.colors), colorB: this.pick(this.colors),
            });
        }
    }
}
