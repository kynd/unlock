import { AutoDrawer } from './AutoDrawer.js';

const DRY = ['pencil', 'charcoal', 'pastel', 'dry-brush-fine', 'dry-brush-medium', 'dry-brush-coarse'];

/**
 * Hatched patches in dry media. A few patches scatter over the canvas, each a
 * cluster of short parallel strokes at the patch's angle, and roughly half of
 * them get a second pass at a crossing angle for cross-hatching.
 */
export class HatchingDrawer extends AutoDrawer {
    constructor() {
        super({
            id: 'hatching', label: 'Hatching',
            description: 'Clusters of short parallel dry-media strokes, some cross-hatched.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const patches = this.int(4, 8);
        for (let p = 0; p < patches; p++) {
            const tool = this.tool({ ids: DRY, kind: 'stroke' });
            const values = this.values(tool);
            const cx = this.range(-ex * 0.85, ex * 0.85);
            const cy = this.range(-ey * 0.85, ey * 0.85);
            const w = this.range(0.4, 1.1), h = this.range(0.4, 1.1);
            const angle = this.range(0, Math.PI);
            const colorA = this.pick(this.colors), colorB = this.pick(this.colors);
            const passes = this.chance(0.5) ? 2 : 1;
            for (let pass = 0; pass < passes; pass++) {
                const a = angle + pass * (Math.PI / 2 + this.range(-0.2, 0.2));
                const lines = this.int(10, 24);
                for (let i = 0; i < lines; i++) {
                    const t = (i / (lines - 1) - 0.5) * 2;
                    // Offset perpendicular to the hatch direction, length along it.
                    const ox = -Math.sin(a) * t * w / 2, oy = Math.cos(a) * t * h / 2;
                    const len = Math.min(w, h) * this.range(0.5, 1.0);
                    const jig = this.range(-0.05, 0.05);
                    const knots = [
                        [cx + ox - Math.cos(a) * len / 2, cy + oy - Math.sin(a) * len / 2 + jig],
                        [cx + ox + Math.cos(a) * len / 2, cy + oy + Math.sin(a) * len / 2 - jig],
                    ];
                    this.stroke(tool, this.taper(this.curve(knots), { peak: 0.5, attack: 0.15, release: 0.4 }), {
                        values, widthPx: this.widthAt(tool, this.range(0.25, 0.55)),
                        colorA, colorB,
                    });
                }
            }
        }
    }
}
