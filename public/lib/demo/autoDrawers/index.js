import { DrawingTool } from '../drawingTool/DrawingTool.js';
import { AutoDrawerConfig } from '../toolConfigs.js';
import { AutoDrawer } from './AutoDrawer.js';
import { AutoDrawerRunner } from './AutoDrawerRunner.js';
import { composeMixedPlan } from './mix.js';
import { LayeredDrawer } from './LayeredDrawer.js';
import { FlowFieldDrawer } from './FlowFieldDrawer.js';
import { GeometricDrawer } from './GeometricDrawer.js';
import { WindingStrokes } from './WindingStrokes.js';
import { HatchingDrawer } from './HatchingDrawer.js';
import { MaterialStudy } from './MaterialStudy.js';
import { PatternField } from './PatternField.js';
import { CalligraphicSweeps } from './CalligraphicSweeps.js';
import { WetBlooms } from './WetBlooms.js';
import { FoliageDrawer } from './FoliageDrawer.js';
import { WrapCoil } from './WrapCoil.js';
import { ScatterDrawer } from './ScatterDrawer.js';
import { ShapeTiling } from './ShapeTiling.js';
import { buildAutoDrawerLayout, attachAutoDrawerUi } from './ui.js';

export {
    AutoDrawer, AutoDrawerRunner, composeMixedPlan,
    LayeredDrawer, FlowFieldDrawer, GeometricDrawer,
    WindingStrokes, HatchingDrawer, MaterialStudy, PatternField, CalligraphicSweeps,
    WetBlooms, FoliageDrawer, WrapCoil, ScatterDrawer, ShapeTiling,
    buildAutoDrawerLayout, attachAutoDrawerUi,
};

/** Every auto drawer, in menu order. */
export const AUTO_DRAWERS = [
    LayeredDrawer, WindingStrokes, HatchingDrawer, CalligraphicSweeps, WetBlooms,
    MaterialStudy, PatternField, FoliageDrawer, WrapCoil, ScatterDrawer,
    ShapeTiling, FlowFieldDrawer, GeometricDrawer,
];

/**
 * The whole auto drawer in one call: the layout, a DrawingTool with the auto
 * drawer config (no pointer input is forwarded, so only the algorithms
 * draw), the runner over one instance of each drawer class, and the default
 * UI. The first drawing generates once the canvas has a size. Returns the
 * runner.
 */
export function setupAutoDrawer({ drawers = AUTO_DRAWERS, root = document.body, seed = null } = {}) {
    const { layout, canvas } = buildAutoDrawerLayout({ root });
    const tool = new DrawingTool(canvas, new AutoDrawerConfig());
    const runner = new AutoDrawerRunner(tool, drawers.map(D => new D()), { seed });
    attachAutoDrawerUi(runner, layout);
    // Start at a fixed square canvas, which also sizes the stage, so the first
    // drawing composes right away rather than waiting for the container resize.
    requestAnimationFrame(() => runner.setCanvasSize({ width: 1280, height: 1280 }));
    return runner;
}
