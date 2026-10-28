import { AutoDrawer } from './AutoDrawer.js';

const PAINTS = ['brush', 'brush-rounded', 'watercolor', 'wet-brush', 'oil', 'oil-ragged', 'smear'];

/**
 * Long meandering strokes in realistic paints. Each starts somewhere on the
 * canvas and wanders, its heading turned by the noise field, so the strokes
 * flow and cross without a shared direction.
 */
export class WindingStrokes extends AutoDrawer {
    constructor() {
        super({
            id: 'winding', label: 'Winding strokes',
            description: 'Long meandering strokes in realistic paints, wandering across the canvas.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const count = this.int(6, 14);
        for (let i = 0; i < count; i++) {
            const tool = this.tool({ ids: PAINTS, kind: 'stroke' });
            let x = this.range(-ex, ex), y = this.range(-ey, ey);
            let a = this.range(0, Math.PI * 2);
            const steps = this.int(5, 11);
            const step = this.range(0.3, 0.7);
            const knots = [[x, y]];
            for (let s = 0; s < steps; s++) {
                a += this.noise(x * 0.7, y * 0.7) * 1.3 + this.range(-0.3, 0.3);
                x += Math.cos(a) * step;
                y += Math.sin(a) * step;
                knots.push([x, y]);
            }
            this.stroke(tool, this.taper(this.curve(knots), { peak: this.range(0.4, 0.85) }), {
                widthPx: this.widthAt(tool, this.range(0.25, 0.7)),
                colorA: this.pick(this.colors), colorB: this.pick(this.colors),
            });
        }
    }
}
