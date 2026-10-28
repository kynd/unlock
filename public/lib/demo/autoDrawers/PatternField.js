import { AutoDrawer } from './AutoDrawer.js';

const PATTERN_FILLS = ['polka-dots', 'grid-squares', 'riley-waves'];
const PATTERN_STROKES = ['pattern-dashes', 'pattern-dots', 'pattern-strips', 'wet-dashes', 'wet-dots', 'wet-strips'];

/**
 * A field of repeating patterns, laid like an initializer. Either broad bands
 * of a patterned fill tiled down the canvas, or rows of pattern strokes drawn
 * straight across it.
 */
export class PatternField extends AutoDrawer {
    constructor() {
        super({
            id: 'pattern-field', label: 'Pattern field',
            description: 'Bands of patterned fills or rows of pattern strokes, tiled across the canvas.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        if (this.chance(0.5)) {
            // Patterned fill bands, top to bottom.
            const tool = this.tool({ ids: PATTERN_FILLS, kind: 'blob' });
            const bands = this.int(2, 4);
            for (let i = 0; i < bands; i++) {
                const y = ey - (i + 0.5) * (2 * ey / bands) + this.range(-0.08, 0.08);
                const knots = [];
                for (let k = 0; k <= 4; k++) knots.push([-ex * 1.15 + k * (ex * 2.3 / 4), y + this.range(-0.1, 0.1)]);
                this.fill(tool, this.curve(knots), {
                    radius: ey / bands * this.range(0.9, 1.1),
                    colorA: this.pick(this.colors), colorB: this.pick(this.colors),
                });
            }
        } else {
            // Rows of pattern strokes across the canvas.
            const tool = this.tool({ ids: PATTERN_STROKES, kind: 'stroke' });
            const values = this.values(tool);
            const rows = this.int(4, 8);
            const angle = this.chance(0.5) ? 0 : this.range(-0.5, 0.5);
            for (let i = 0; i < rows; i++) {
                const y = ey - (i + 0.5) * (2 * ey / rows);
                const cx = this.range(-0.2, 0.2);
                const knots = [-1, 0, 1].map(t => [
                    cx + Math.cos(angle) * ex * 1.15 * t - Math.sin(angle) * 0,
                    y + Math.sin(angle) * ex * 1.15 * t + this.range(-0.05, 0.05),
                ]);
                this.stroke(tool, this.curve(knots), {
                    values, widthPx: this.widthAt(tool, this.range(0.4, 0.8)),
                    colorA: this.pick(this.colors), colorB: this.pick(this.colors),
                });
            }
        }
    }
}
