import { AutoDrawer } from './AutoDrawer.js';

const SPRAYS = ['feather', 'leaves', 'fringe', 'wet-fringe'];
const STEMS = ['around-wiggle', 'around-entangled', 'around-spiral'];

/**
 * Organic sprays. A few stems grow from the lower canvas, each a wrapping
 * stroke, with leaf and feather pattern strokes sprouting along their reach.
 */
export class FoliageDrawer extends AutoDrawer {
    constructor() {
        super({
            id: 'foliage', label: 'Foliage',
            description: 'Leaf and feather sprays growing along a few curving stems.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const stems = this.int(2, 5);
        for (let s = 0; s < stems; s++) {
            const baseX = this.range(-ex * 0.8, ex * 0.8);
            const baseY = -ey + this.range(0, 0.3);
            const height = this.range(0.9, 1.8) * ey;
            const sway = this.range(-0.5, 0.5);
            const knots = [-0, 0.5, 1].map(t => [
                baseX + sway * t * t + this.range(-0.08, 0.08),
                baseY + height * t,
            ]);
            const stem = this.tool({ ids: STEMS, kind: 'stroke' });
            const path = this.curve(knots);
            this.stroke(stem, this.taper(path, { peak: 0.5 }), {
                widthPx: this.widthAt(stem, this.range(0.2, 0.45)),
                colorA: this.pick(this.colors), colorB: this.pick(this.colors),
            });
            // Sprays sprouting along the stem.
            const spray = this.tool({ ids: SPRAYS, kind: 'stroke' });
            const values = this.values(spray);
            const sprigs = this.int(5, 12);
            for (let i = 0; i < sprigs; i++) {
                const t = this.range(0.2, 1);
                const px = baseX + sway * t * t, py = baseY + height * t;
                const side = this.chance(0.5) ? 1 : -1;
                const a = Math.PI / 2 + side * this.range(0.5, 1.1);
                const len = this.range(0.2, 0.55);
                const tip = [px + Math.cos(a) * len, py + Math.sin(a) * len];
                this.stroke(spray, this.taper(this.line([px, py], tip), { peak: 0.6, release: 0.6 }), {
                    values, widthPx: this.widthAt(spray, this.range(0.4, 0.8)),
                    colorA: this.pick(this.colors), colorB: this.pick(this.colors),
                });
            }
        }
    }
}
