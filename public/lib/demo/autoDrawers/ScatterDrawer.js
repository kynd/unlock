import { AutoDrawer } from './AutoDrawer.js';

const DABS = ['brush-rounded', 'oil', 'pastel', 'charcoal', 'watercolor', 'pattern-dots'];
const DOTS = ['circle-flat', 'circle-fill', 'oval-flat'];

/**
 * A dense scatter of small marks, like confetti. Short dabs and tiny shape
 * fills drop across the whole canvas, their density even but their colors
 * drawn freely from the palette.
 */
export class ScatterDrawer extends AutoDrawer {
    constructor() {
        super({
            id: 'scatter', label: 'Scatter',
            description: 'A dense field of small dabs and dots scattered across the canvas.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const count = this.int(60, 140);
        for (let i = 0; i < count; i++) {
            const x = this.range(-ex, ex), y = this.range(-ey, ey);
            if (this.chance(0.7)) {
                const tool = this.tool({ ids: DABS, kind: 'stroke' });
                const a = this.range(0, Math.PI * 2);
                const len = this.range(0.04, 0.18);
                const path = this.line(
                    [x - Math.cos(a) * len, y - Math.sin(a) * len],
                    [x + Math.cos(a) * len, y + Math.sin(a) * len]);
                this.stroke(tool, this.taper(path, { peak: 0.6, attack: 0.1, release: 0.4 }), {
                    widthPx: this.widthAt(tool, this.range(0.3, 0.7)),
                    colorA: this.pick(this.colors), colorB: this.pick(this.colors),
                });
            } else {
                const tool = this.tool({ ids: DOTS, kind: 'shape' });
                const r = this.range(0.03, 0.1);
                this.shape(tool, [x - r, y - r], [x + r, y + r], {
                    colorA: this.pick(this.colors), colorB: this.pick(this.colors),
                });
            }
        }
    }
}
