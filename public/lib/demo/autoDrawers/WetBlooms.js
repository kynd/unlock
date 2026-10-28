import { AutoDrawer } from './AutoDrawer.js';

const WASHES = ['watery-wash', 'wash', 'gouache', 'flat-paint'];

/**
 * Overlapping watercolor blooms. Soft wash fills gather in a couple of loose
 * clusters, larger and wetter first, so they bleed and layer into pooled
 * color.
 */
export class WetBlooms extends AutoDrawer {
    constructor() {
        super({
            id: 'wet-blooms', label: 'Wet blooms',
            description: 'Overlapping watercolor and wash fills, bleeding into pooled color.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const clusters = this.int(1, 3);
        for (let c = 0; c < clusters; c++) {
            const fx = this.range(-ex * 0.6, ex * 0.6), fy = this.range(-ey * 0.6, ey * 0.6);
            const blooms = this.int(4, 9);
            for (let i = 0; i < blooms; i++) {
                const tool = this.tool({ ids: WASHES, kind: 'blob' });
                const r = this.range(0.25, 0.7) * (1 - i / (blooms * 2));
                const cx = fx + this.gaussian() * 0.45, cy = fy + this.gaussian() * 0.4;
                const a = this.range(0, Math.PI * 2), len = r * this.range(0.5, 1.2);
                const knots = [0, 1, 2].map(k => [
                    cx + Math.cos(a) * len * (k - 1) + this.range(-0.06, 0.06),
                    cy + Math.sin(a) * len * (k - 1) + this.range(-0.06, 0.06),
                ]);
                this.fill(tool, this.curve(knots), {
                    radius: r, colorA: this.pick(this.colors), colorB: this.pick(this.colors),
                });
            }
        }
    }
}
