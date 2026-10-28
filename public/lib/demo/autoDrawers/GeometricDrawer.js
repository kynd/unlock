import { AutoDrawer } from './AutoDrawer.js';

const FLAT_SHAPES = ['rect-flat', 'circle-flat', 'triangle-45-flat', 'triangle-30-60-flat', 'diamond-flat', 'oval-flat'];
const TEXTURED_SHAPES = ['rect-fill', 'circle-fill', 'triangle-45', 'triangle-30-60', 'diamond-fill', 'oval-fill'];
const LINE_STROKES = ['ribbon', 'ribbon-square', 'pencil', 'charcoal'];

/**
 * A constructivist composition on a grid: a square frame divided into a few
 * columns and rows, large color fields spanning cells, one shape per chosen
 * cell sized to the cell, a dominant circle, and straight lines along the
 * grid lines. One shape family (flat or textured) holds for the whole
 * drawing.
 */
export class GeometricDrawer extends AutoDrawer {
    constructor() {
        super({
            id: 'geometric',
            label: 'Geometric',
            description: 'Color fields, shapes, and lines laid out on a grid.',
        });
    }

    compose() {
        const ex = this.extentX, ey = this.extentY;
        const half = Math.min(ex, ey) * this.range(0.72, 0.86);
        const cols = this.int(2, 4), rows = this.int(2, 4);
        const cellW = 2 * half / cols, cellH = 2 * half / rows;
        const x0 = -half, y0 = -half;
        const cell = (i, j) => ({
            x: x0 + i * cellW, y: y0 + j * cellH,
            cx: x0 + (i + 0.5) * cellW, cy: y0 + (j + 0.5) * cellH,
        });
        const shapes = this.tools({ ids: this.chance(0.6) ? FLAT_SHAPES : TEXTURED_SHAPES, kind: 'shape' });
        // Fields are always flat rectangles; the dominant circle is the family's circle.
        const field = this.tool({ ids: ['rect-flat'], kind: 'shape' });
        const circle = shapes.find(e => e.id.startsWith('circle')) ?? this.pick(shapes);
        const tones = this.byLightness();
        const darkest = tones[tones.length - 1];

        // Color fields: rectangles spanning a run of cells.
        const fields = this.int(1, 3);
        for (let k = 0; k < fields; k++) {
            const i = this.int(0, cols - 1), j = this.int(0, rows - 1);
            const w = this.int(1, cols - i), h = this.int(1, rows - j);
            const a = cell(i, j);
            this.shape(field, [a.x, a.y], [a.x + w * cellW, a.y + h * cellH], {
                colorA: this.pick(tones.slice(0, 3)), colorB: this.pick(tones.slice(0, 3)),
            });
        }

        // Shapes: about half the cells, each shape inset from its cell.
        const inset = this.range(0.1, 0.2);
        for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
                if (!this.chance(0.5)) continue;
                const c = cell(i, j);
                const entry = this.pick(shapes);
                const rx = cellW * (0.5 - inset), ry = cellH * (0.5 - inset);
                const color = this.pick(this.colors);
                const colors = { colorA: color, colorB: this.pick(this.colors) };
                if (entry.id.startsWith('circle')) {
                    this.shape(entry, [c.cx, c.cy], [c.cx + Math.min(rx, ry), c.cy], colors);
                } else if (entry.id.startsWith('triangle')) {
                    // The triangle stands on one edge of the cell.
                    const side = this.int(0, 3);
                    const [a, b] = [
                        [[c.cx - rx, c.cy - ry], [c.cx + rx, c.cy - ry]],
                        [[c.cx + rx, c.cy - ry], [c.cx + rx, c.cy + ry]],
                        [[c.cx + rx, c.cy + ry], [c.cx - rx, c.cy + ry]],
                        [[c.cx - rx, c.cy + ry], [c.cx - rx, c.cy - ry]],
                    ][side];
                    this.shape(entry, a, b, colors);
                } else if (entry.id.startsWith('diamond')) {
                    const vertical = this.chance(0.5);
                    this.shape(entry,
                        vertical ? [c.cx, c.cy - ry] : [c.cx - rx, c.cy],
                        vertical ? [c.cx, c.cy + ry] : [c.cx + rx, c.cy], colors);
                } else {
                    this.shape(entry, [c.cx - rx, c.cy - ry], [c.cx + rx, c.cy + ry], colors);
                }
            }
        }

        // The dominant circle, centered on a grid crossing.
        const gi = this.int(1, cols - 1), gj = this.int(1, rows - 1);
        const center = [x0 + gi * cellW, y0 + gj * cellH];
        const radius = Math.min(cellW, cellH) * this.range(0.55, 0.9);
        this.shape(circle, center, [center[0] + radius, center[1]], {
            colorA: this.pick(tones.slice(2)), colorB: this.pick(tones),
        });

        // Lines: along grid lines and the frame, a few running past it.
        const pen = this.tool({ ids: LINE_STROKES, kind: 'stroke' });
        const penValues = this.values(pen);
        const lines = this.int(3, 6);
        for (let k = 0; k < lines; k++) {
            const over = this.chance(0.4) ? this.range(0.1, 0.4) : 0;
            let a, b;
            if (this.chance(0.5)) {
                const x = x0 + this.int(0, cols) * cellW;
                a = [x, -half - over]; b = [x, half + over];
            } else {
                const y = y0 + this.int(0, rows) * cellH;
                a = [-half - over, y]; b = [half + over, y];
            }
            if (this.chance(0.5)) [a, b] = [b, a];
            this.stroke(pen, this.taper(this.line(a, b), { peak: 0.55, ends: 0.5, attack: 0.05, release: 0.05 }), {
                values: penValues, widthPx: this.range(2, 7),
                colorA: darkest, colorB: darkest,
            });
        }
    }
}
