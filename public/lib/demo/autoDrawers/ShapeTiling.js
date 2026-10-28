import { AutoDrawer } from './AutoDrawer.js';

const SHAPES = ['circle-fill', 'oval-fill', 'rect-fill', 'diamond-fill', 'triangle-30-60', 'triangle-45',
    'circle-flat', 'rect-flat', 'diamond-flat'];

/**
 * Hard-edged shape fills packed across the canvas on a loose grid. One shape
 * tool is used throughout, each cell holding one shape jittered in size and
 * position, so the field reads as a graphic tiling.
 */
export class ShapeTiling extends AutoDrawer {
    constructor() {
        super({
            id: 'shape-tiling', label: 'Shape tiling',
            description: 'Hard-edged shape fills packed across the canvas on a loose grid.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const tool = this.tool({ ids: SHAPES, kind: 'shape' });
        const cols = this.int(4, 8);
        const cell = (2 * ex) / cols;
        const rows = Math.max(1, Math.round((2 * ey) / cell));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (this.chance(0.12)) continue; // a few gaps
                const cx = -ex + (c + 0.5) * cell + this.range(-0.1, 0.1) * cell;
                const cy = -ey + (r + 0.5) * cell + this.range(-0.1, 0.1) * cell;
                const s = cell * this.range(0.28, 0.5);
                this.shape(tool, [cx - s, cy - s], [cx + s, cy + s], {
                    colorA: this.pick(this.colors), colorB: this.pick(this.colors),
                });
            }
        }
    }
}
