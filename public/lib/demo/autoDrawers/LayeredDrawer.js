import { AutoDrawer } from './AutoDrawer.js';

const GROUND_FILLS = ['wash', 'watery-wash', 'gouache', 'flat-paint', 'dry-brush'];
const MASS_FILLS = ['gouache', 'flat-paint', 'knife-oil', 'wash', 'wobbly-blob', 'flat-blob'];
const STRUCTURE_STROKES = ['brush', 'brush-rounded', 'oil', 'oil-ragged', 'wet-brush', 'watercolor', 'smear'];
const DETAIL_STROKES = ['pencil', 'charcoal', 'pastel', 'dry-brush-fine', 'dry-brush-medium', 'ribbon-ragged'];

/**
 * A painting built the way a painter layers one: broad ground fills in the
 * light colors, masses gathered around a focal point on a rule-of-thirds
 * intersection, long structural strokes in one brush along a dominant
 * direction, short detail marks clustered at the focus, and a few accents in
 * the palette's strongest color.
 */
export class LayeredDrawer extends AutoDrawer {
    constructor() {
        super({
            id: 'layered',
            label: 'Layered painting',
            description: 'Ground, masses, structure, detail, and accents, painted in that order around a focal point.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const tones = this.byLightness();
        const lights = tones.slice(0, 2), mids = tones.slice(1, 4), darks = tones.slice(3);
        const strongest = [...this.palette.entries].sort((a, b) => b.C - a.C)[0].hex;
        const focus = [
            (this.chance(0.5) ? -1 : 1) * ex / 3 + this.range(-0.15, 0.15),
            (this.chance(0.5) ? -1 : 1) * ey / 3 + this.range(-0.15, 0.15),
        ];
        // One direction the structure leans along, shared by the detail.
        const lean = this.range(-0.6, 0.6) + (this.chance(0.3) ? Math.PI / 2 : 0);

        // Ground: wide bands across the canvas, top to bottom.
        const bands = this.int(2, 3);
        for (let i = 0; i < bands; i++) {
            const y = ey - (i + 0.5) * (2 * ey / bands) + this.range(-0.1, 0.1);
            const knots = [];
            for (let k = 0; k <= 4; k++) {
                knots.push([-ex * 1.1 + k * (ex * 2.2 / 4), y + this.range(-0.12, 0.12)]);
            }
            this.fill(this.tool({ ids: GROUND_FILLS, kind: 'blob' }), this.curve(knots), {
                radius: ey / bands * this.range(0.85, 1.1),
                colorA: this.pick(lights), colorB: this.pick(mids),
            });
        }

        // Masses: overlapping fills gathered at the focus, larger ones first.
        const masses = this.int(3, 6);
        for (let i = 0; i < masses; i++) {
            const r = this.range(0.15, 0.4) * (1 - i / (masses * 1.6));
            const cx = focus[0] + this.gaussian() * 0.35, cy = focus[1] + this.gaussian() * 0.3;
            const a = this.range(0, Math.PI * 2), len = r * this.range(0.6, 1.6);
            const knots = [0, 1, 2].map(k => [
                cx + Math.cos(a) * len * (k - 1) + this.range(-0.06, 0.06),
                cy + Math.sin(a) * len * (k - 1) + this.range(-0.06, 0.06),
            ]);
            this.fill(this.tool({ ids: MASS_FILLS, kind: 'blob' }), this.curve(knots), {
                radius: r, colorA: this.pick(mids), colorB: this.pick(tones),
            });
        }

        // Structure: one brush for the whole layer, long sweeps along the lean.
        const brush = this.tool({ ids: STRUCTURE_STROKES, kind: 'stroke' });
        const brushValues = this.values(brush);
        const sweeps = this.int(4, 9);
        for (let i = 0; i < sweeps; i++) {
            const a = lean + this.range(-0.35, 0.35);
            const len = this.range(1.0, 2.2);
            const cx = this.chance(0.6) ? focus[0] + this.gaussian() * 0.4 : this.range(-ex, ex) * 0.8;
            const cy = this.chance(0.6) ? focus[1] + this.gaussian() * 0.4 : this.range(-ey, ey) * 0.8;
            const bend = this.range(-0.25, 0.25);
            const knots = [-1, -0.33, 0.33, 1].map(t => {
                const off = bend * (1 - t * t) + this.range(-0.04, 0.04);
                return [
                    cx + Math.cos(a) * len / 2 * t - Math.sin(a) * off,
                    cy + Math.sin(a) * len / 2 * t + Math.cos(a) * off,
                ];
            });
            this.stroke(brush, this.taper(this.curve(knots)), {
                values: brushValues, widthPx: this.widthAt(brush, this.range(0.2, 0.5)),
                colorA: this.pick(mids.concat(darks)), colorB: this.pick(tones),
            });
        }

        // Detail: short dry marks clustered at the focus, turning with the noise.
        const pencil = this.tool({ ids: DETAIL_STROKES, kind: 'stroke' });
        const pencilValues = this.values(pencil);
        const details = this.int(30, 60);
        for (let i = 0; i < details; i++) {
            const cx = focus[0] + this.gaussian() * 0.45, cy = focus[1] + this.gaussian() * 0.4;
            if (!this.inside(cx, cy, 0.05)) continue;
            const a = lean + this.noise(cx * 1.5, cy * 1.5) * 1.4;
            const len = this.range(0.08, 0.32);
            const mid = this.range(-0.03, 0.03);
            const knots = [
                [cx - Math.cos(a) * len / 2, cy - Math.sin(a) * len / 2],
                [cx - Math.sin(a) * mid, cy + Math.cos(a) * mid],
                [cx + Math.cos(a) * len / 2, cy + Math.sin(a) * len / 2],
            ];
            this.stroke(pencil, this.taper(this.curve(knots), { peak: 0.55, attack: 0.1, release: 0.5 }), {
                values: pencilValues, widthPx: this.widthAt(pencil, this.range(0.3, 0.7)),
                colorA: this.pick(darks), colorB: this.pick(mids),
            });
        }

        // Accents: a few small marks in the strongest color, right at the focus.
        const accents = this.int(1, 3);
        const accent = this.tool({ ids: ['oil', 'brush-rounded', 'pastel', 'gouache'] });
        for (let i = 0; i < accents; i++) {
            const cx = focus[0] + this.gaussian() * 0.15, cy = focus[1] + this.gaussian() * 0.15;
            const a = this.range(0, Math.PI * 2), len = this.range(0.06, 0.18);
            const path = this.curve([
                [cx - Math.cos(a) * len, cy - Math.sin(a) * len],
                [cx + Math.cos(a) * len, cy + Math.sin(a) * len],
            ]);
            if (accent.kind === 'blob') {
                this.fill(accent, path, { radius: this.range(0.04, 0.09), colorA: strongest, colorB: strongest });
            } else {
                this.stroke(accent, this.taper(path), {
                    widthPx: this.widthAt(accent, this.range(0.3, 0.6)), colorA: strongest, colorB: strongest,
                });
            }
        }
    }
}
