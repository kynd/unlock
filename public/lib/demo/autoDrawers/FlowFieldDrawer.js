import { AutoDrawer } from './AutoDrawer.js';

const MAIN_STROKES = [
    'brush', 'brush-rounded', 'oil', 'oil-ragged', 'wet-brush', 'watercolor',
    'pastel', 'charcoal', 'dry-brush-medium', 'ribbon', 'ribbon-ragged',
    'pattern-dashes', 'feather', 'leaves',
];
const FINE_STROKES = ['pencil', 'charcoal', 'dry-brush-fine', 'ribbon', 'pattern-dots'];
// Integration step along the field, in world units.
const STEP = 0.02;

/**
 * Strokes that follow a seeded flow field: a direction at every point, from
 * a base angle turned by smooth noise. Three passes go from wide, long strokes
 * to narrow, short ones, each stroke starting on a jittered grid and tracing
 * the field until it reaches its length or leaves the canvas. Color follows a
 * second, slower noise mapped across the palette, so regions of one color
 * form.
 */
export class FlowFieldDrawer extends AutoDrawer {
    constructor() {
        super({
            id: 'flow-field',
            label: 'Flow field',
            description: 'Strokes that trace a noise flow field, from wide and long to narrow and short.',
        });
    }

    compose() {
        const base = this.range(0, Math.PI * 2);
        const turbulence = this.range(0.6, 1.8);
        const frequency = this.range(0.35, 0.9);
        const colorFrequency = this.range(0.25, 0.6);
        const tones = this.byLightness();
        this._field = (x, y) => base + this.noise(x * frequency, y * frequency) * Math.PI * turbulence;
        this._tone = (x, y) => {
            const n = this.noise(x * colorFrequency + 31.7, y * colorFrequency - 12.3) * 0.5 + 0.5;
            return tones[Math.min(tones.length - 1, Math.floor(n * tones.length))];
        };

        const main = this.tool({ ids: MAIN_STROKES, kind: 'stroke' });
        const fine = this.chance(0.5) ? main : this.tool({ ids: FINE_STROKES, kind: 'stroke' });
        const passes = [
            { tool: main, spacing: 0.5, length: [0.9, 1.8], width: [0.35, 0.6] },
            { tool: main, spacing: 0.36, length: [0.5, 1.1], width: [0.2, 0.4] },
            { tool: fine, spacing: 0.3, length: [0.2, 0.55], width: [0.08, 0.2] },
        ];
        for (const pass of passes) this._pass(pass);
    }

    _pass({ tool, spacing, length, width }) {
        const ex = this.extentX, ey = this.extentY;
        const values = this.values(tool);
        const starts = [];
        for (let y = -ey; y <= ey; y += spacing) {
            for (let x = -ex; x <= ex; x += spacing) {
                starts.push([x + this.range(-0.5, 0.5) * spacing, y + this.range(-0.5, 0.5) * spacing]);
            }
        }
        for (const [x, y] of this.shuffle(starts)) {
            const path = this._trace(x, y, this.range(length[0], length[1]));
            if (path.length < 3) continue;
            const color = this._tone(x, y);
            this.stroke(tool, this.taper(path, { peak: 0.6, attack: 0.15, release: 0.35 }), {
                values, widthPx: this.widthAt(tool, this.range(width[0], width[1])),
                colorA: color, colorB: this.pick(this.colors),
            });
        }
    }

    // Walks the field from (x, y) in both directions, so the start sits mid-stroke.
    _trace(x, y, length) {
        const half = Math.max(2, Math.round(length / 2 / STEP));
        const walk = sign => {
            const out = [];
            let px = x, py = y;
            for (let i = 0; i < half; i++) {
                const a = this._field(px, py);
                px += Math.cos(a) * STEP * sign;
                py += Math.sin(a) * STEP * sign;
                if (!this.inside(px, py, -0.05)) break;
                out.push([px, py]);
            }
            return out;
        };
        const knots = [...walk(-1).reverse(), [x, y], ...walk(1)];
        return knots.length < 3 ? [] : this.curve(knots);
    }
}
