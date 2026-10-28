import { AutoDrawer } from './AutoDrawer.js';

const WRAPS = ['around-spiral', 'around-entangled', 'around-scattered', 'around-wiggle', 'around-wiggle-even', 'around-wiggle-u'];

/**
 * Wrapping strokes coiling around hidden spines. Each spine is a gentle curve;
 * one wrapping stroke follows it, so the drawing reads as a few tangled coils.
 */
export class WrapCoil extends AutoDrawer {
    constructor() {
        super({
            id: 'wrap-coil', label: 'Wrap & coil',
            description: 'Wrapping strokes coiling and scattering along a few hidden spines.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const coils = this.int(3, 7);
        for (let i = 0; i < coils; i++) {
            const tool = this.tool({ ids: WRAPS, kind: 'stroke' });
            const a = this.range(0, Math.PI * 2);
            const len = this.range(1.0, 2.2);
            const cx = this.range(-ex * 0.7, ex * 0.7), cy = this.range(-ey * 0.7, ey * 0.7);
            const bend = this.range(-0.4, 0.4);
            const knots = [-1, -0.33, 0.33, 1].map(t => {
                const off = bend * (1 - t * t) + this.range(-0.04, 0.04);
                return [
                    cx + Math.cos(a) * len / 2 * t - Math.sin(a) * off,
                    cy + Math.sin(a) * len / 2 * t + Math.cos(a) * off,
                ];
            });
            this.stroke(tool, this.taper(this.curve(knots), { peak: 0.5 }), {
                widthPx: this.widthAt(tool, this.range(0.3, 0.7)),
                colorA: this.pick(this.colors), colorB: this.pick(this.colors),
            });
        }
    }
}
