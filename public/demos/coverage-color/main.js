import * as THREE from 'three';
import { StrokeDef } from '../../lib/StrokeDef.js';
import { PIXELS_PER_UNIT } from '../../lib/CanvasBuffer.js';
import { BrushStrokeRenderer } from '../../lib/renderers/BrushStrokeRenderer.js';
import { randomSchemePalette, paperColor } from '../../lib/SchemePaletteMaker.js';
import { StrokeStage } from '../../lib/demo/stage.js';
import { DrawingBoard } from '../../lib/demo/drawingBoard.js';
import { setupDrawCycle } from '../../lib/demo/drawCycle.js';
import { uniformWidth } from '../../lib/demo/strokePaths.js';

// A two-pigment brush drawn through the coverage layer. The left half draws it;
// the right half shows the layer's buffer in color. MAX keeps single coverage on
// the alpha, but the color composites as a straight over, so a self-crossing
// blends the pigments the way they layer instead of maxing two hues toward white.
const widthInput = document.getElementById('width');
const width = () => parseFloat(widthInput.value) / PIXELS_PER_UNIT;

let colorA = '#b0431f';
let colorB = '#2f6f8f';
let paper = '#f3f0ea';

const stage = new StrokeStage(document.getElementById('canvas'), { background: paper });
const board = new DrawingBoard(stage, { background: paper });

function rollColors() {
    const palette = randomSchemePalette('vivid-wheel');
    const hex = palette.toHexArray();
    colorA = hex[0];
    colorB = hex[Math.min(3, hex.length - 1)];
    paper = paperColor(palette.entries[0].H);
    stage.setBackground(paper);
    board.clear(paper);
}

const cycle = setupDrawCycle({
    stage, board,
    canvas: document.getElementById('canvas'),
    build: (path, points, seed) => {
        const renderer = new BrushStrokeRenderer({
            cap: 'ragged', colorA, colorB, rough: 0.85, dry: 0.5,
        });
        const def = new StrokeDef({
            points: path.map(p => new THREE.Vector3(p.x, p.y, 0)),
            widthLeft: uniformWidth(width()), renderer, seed,
        });
        const mesh = def.build();
        mesh.position.z = 0.05;
        return { mesh, renderer };
    },
    widthFor: width,
    split: false,
    pointerTrace: false,
});

// The right half shows the single coverage buffer split into its two channels,
// stacked: Color on top (RGB, un-premultiplied by the coverage, so the pure
// pigment shows), Opacity below (the alpha, as brightness). The buffer holds
// one RGBA target: alpha takes the MAX (single coverage), while the multicolor
// mark composites its color as a straight over. So at a self-crossing the
// opacity pane stays flat while the color pane shows the pigments layered.
const BG = '#232323';
const backing = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: BG })
);
backing.position.z = 1.0;
backing.userData.overlay = true;
stage.add(backing);

function paneMaterial(mode) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uMap: { value: stage.coverage.target.texture },
            uMode: { value: mode },               // 0 = color, 1 = opacity
            uBg: { value: new THREE.Color(BG) },
        },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */`
            uniform sampler2D uMap;
            uniform float uMode;
            uniform vec3 uBg;
            varying vec2 vUv;
            void main() {
                vec4 c = texture2D(uMap, vUv);
                vec3 col = uMode < 0.5
                    ? (c.a > 0.0001 ? c.rgb / c.a : uBg)   // un-premultiplied color
                    : vec3(c.a);                            // coverage as brightness
                gl_FragColor = vec4(col, 1.0);
            }
        `,
    });
}

const colorView = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), paneMaterial(0));
const opacityView = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), paneMaterial(1));
for (const v of [colorView, opacityView]) { v.position.z = 1.01; v.userData.overlay = true; stage.add(v); }

function layoutBufferView() {
    backing.scale.set(stage.extentX, stage.extentY * 2, 1);
    backing.position.set(stage.extentX / 2, 0, 1.0);
    // Each pane fits the full-canvas aspect into its half of the right side.
    const w = stage.extentX * 0.9, h = stage.extentY * 0.9;
    colorView.scale.set(w, h, 1);
    opacityView.scale.set(w, h, 1);
    colorView.position.set(stage.extentX / 2, stage.extentY / 2, 1.01);     // top of screen
    opacityView.position.set(stage.extentX / 2, -stage.extentY / 2, 1.01);  // bottom of screen
}

document.getElementById('clear-btn').addEventListener('click', () => {
    cycle.disposeGhost();
    board.clear(paper);
    stage.draw();
});
document.getElementById('random-btn').addEventListener('click', () => {
    cycle.disposeGhost();
    rollColors();
    stage.draw();
});
widthInput.addEventListener('input', () => {
    document.getElementById('width-val').textContent = widthInput.value;
});

stage.onResize(() => layoutBufferView());
rollColors();
layoutBufferView();
stage.draw();
