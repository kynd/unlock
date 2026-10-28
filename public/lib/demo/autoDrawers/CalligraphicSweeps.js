import { AutoDrawer } from './AutoDrawer.js';

const INK = ['ribbon', 'ribbon-ragged', 'brush', 'brush-rounded', 'oil', 'oil-ragged'];

/**
 * A few bold calligraphic gestures. Each is a long, strongly tapered sweep in
 * one ink or brush, crossing most of the canvas, so the drawing stays open and
 * gestural.
 */
export class CalligraphicSweeps extends AutoDrawer {
    constructor() {
        super({
            id: 'calligraphic', label: 'Calligraphic sweeps',
            description: 'A few bold, strongly tapered ink and brush gestures.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const sweeps = this.int(2, 5);
        for (let i = 0; i < sweeps; i++) {
            const tool = this.tool({ ids: INK, kind: 'stroke' });
            const a = this.range(0, Math.PI * 2);
            const len = this.range(1.4, 2.4) * Math.max(ex, ey) / 2;
            const cx = this.range(-ex * 0.4, ex * 0.4), cy = this.range(-ey * 0.4, ey * 0.4);
            const bend = this.range(-0.5, 0.5);
            const knots = [-1, -0.4, 0.3, 1].map(t => {
                const off = bend * (1 - t * t);
                return [
                    cx + Math.cos(a) * len / 2 * t - Math.sin(a) * off,
                    cy + Math.sin(a) * len / 2 * t + Math.cos(a) * off,
                ];
            });
            this.stroke(tool, this.taper(this.curve(knots), { peak: this.range(0.7, 1.0), ends: 0.05, attack: 0.25, release: 0.4 }), {
                widthPx: this.widthAt(tool, this.range(0.6, 1.0)),
                colorA: this.pick(this.colors), colorB: this.pick(this.colors),
            });
        }
    }
}
