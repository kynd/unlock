---
title: Auto Drawers
---

<div class="prose">

Algorithms that compose a whole drawing from a seed. Each auto drawer follows its own rules (what goes down first, which tools, where the marks gather) and takes every remaining choice from a seeded generator, so one algorithm draws a different picture for each seed and the same picture for the same seed. The result is a plan in the initializer shape, which `DrawingTool.drawPlan` draws through its cycle, so it replays, records, and exports like a drawing made by hand.
<div class="jp">シードから絵全体を組み立てるアルゴリズムです。それぞれのオートドロワーは自分の規則（何を先に描くか、どのツールを使うか、筆跡がどこに集まるか）に従い、残りの選択はすべてシード付きの生成器から取ります。そのため、ひとつのアルゴリズムがシードごとに違う絵を描き、同じシードからは同じ絵を描きます。結果はイニシャライザと同じ形のプランで、`DrawingTool.drawPlan`がそれをサイクルに通して描くので、手で描いた絵と同じように再生、録画、書き出しができます。</div>

<div class="page-note">
<p><code>public/lib/demo/autoDrawers/</code>: <code>AutoDrawer.js</code>, <code>mix.js</code>, one file per algorithm (<code>LayeredDrawer.js</code>, <code>WindingStrokes.js</code>, <code>HatchingDrawer.js</code>, <code>CalligraphicSweeps.js</code>, <code>WetBlooms.js</code>, <code>MaterialStudy.js</code>, <code>PatternField.js</code>, <code>FoliageDrawer.js</code>, <code>WrapCoil.js</code>, <code>ScatterDrawer.js</code>, <code>ShapeTiling.js</code>, <code>FlowFieldDrawer.js</code>, <code>GeometricDrawer.js</code>), <code>AutoDrawerRunner.js</code>, <code>ui.js</code>, <code>index.js</code></p>
</div>

## The base class

`AutoDrawer` is the contract every algorithm shares. A subclass passes its `id`, `label`, and `description` to the constructor and implements `compose()`. `plan({ seed, extentX, extentY, registry, palette, churn })` seeds the generator, rolls the palette (`rollPalette`) and the background (`rollBackground`), calls `compose()`, and returns `{ background, colors, marks }`. `registry` is the tool set the marks may name, `palette` pins the base palette, and `churn` is the per-mark palette-change probability.
<div class="jp">`AutoDrawer`は、すべてのアルゴリズムが共有する契約です。サブクラスはコンストラクタに`id`、`label`、`description`を渡し、`compose()`を実装します。`plan({ seed, extentX, extentY, registry, palette, churn })`は生成器にシードを与え、パレット（`rollPalette`）と背景（`rollBackground`）をロールし、`compose()`を呼び、`{ background, colors, marks }`を返します。`registry`は筆跡が名指してよいツールの集合、`palette`は基準パレットの固定、`churn`は筆跡ごとにパレットを変える確率です。</div>

## Common to every auto drawer

**Seeded randomness:** every random choice goes through the base class (`random`, `range`, `int`, `chance`, `pick`, `shuffle`, `gaussian`, and `noise`, a smooth value noise), all derived from the plan's seed.
<div class="jp"><strong>シード付きの乱数：</strong>ランダムな選択はすべて基底クラスを通ります（`random`、`range`、`int`、`chance`、`pick`、`shuffle`、`gaussian`、そして滑らかなバリューノイズの`noise`）。どれも、プランのシードから導かれます。</div>

**Reproducibility:** the same seed and canvas extents compose the same plan, and the runner sets the cycle's seed from the plan's seed, so each mark's seeded look reproduces too.
<div class="jp"><strong>再現性：</strong>同じシードと同じキャンバスの範囲からは同じプランが組み立てられます。ランナーはサイクルのシードもプランのシードから設定するため、各筆跡のシードによる見た目も再現されます。</div>

**Tool choice:** `tools({ ids, kind, category })` filters the registry and falls back to any tool of the kind, so an algorithm still draws on a page whose tool set lacks its preferred tools. `values(entry)` rolls a tool's parameters from the seed, and `widthAt(entry, t)` reads a width from the tool's canonical range.
<div class="jp"><strong>ツールの選択：</strong>`tools({ ids, kind, category })`はレジストリを絞り込み、見つからなければ同じ種類の任意のツールに戻ります。そのため、好みのツールがないツール集合のページでもアルゴリズムは描けます。`values(entry)`はツールのパラメータをシードからロールし、`widthAt(entry, t)`はツールの標準の幅の範囲から幅を読みます。</div>

**Paths:** `curve(knots)` runs a Catmull-Rom spline through the knots and resamples it at pen spacing (about two CSS pixels), so a playback animates a generated stroke at a hand's pace. `line(a, b)` does the same for a straight path. `pressure(points, { lo, hi, shape })` sets a pen pressure from one of several seeded shapes ('flat', 'both', 'in', 'out', 'wave'), kept within `[lo, hi]` so the tips do not vanish, so strokes are not all thin at both ends; `taper(points)` routes through it from a `peak` and `ends`.
<div class="jp"><strong>パス：</strong>`curve(knots)`はノットを通るCatmull-Romスプラインを引き、ペンの間隔（約2CSSピクセル）で取り直します。そのため再生は、生成したストロークを手の速さでアニメーションします。`line(a, b)`は直線のパスに同じことをします。`pressure(points, { lo, hi, shape })`は、いくつかのシード付きの形（'flat'、'both'、'in'、'out'、'wave'）から筆圧を設定し、`[lo, hi]`の範囲に収めて先端が消えないようにします。そのため、ストロークは常に両端が細くなるわけではありません。`taper(points)`は`peak`と`ends`からこれを呼び出します。</div>

**Marks:** `stroke(tool, points, opts)`, `fill(tool, spine, { radius })`, and `shape(tool, a, b)` add a mark in the plan shape. Colors default to palette picks and values to a seeded roll. A fill's spine carries no pressure, so its radius holds as given.
<div class="jp"><strong>筆跡：</strong>`stroke(tool, points, opts)`、`fill(tool, spine, { radius })`、`shape(tool, a, b)`はプランの形の筆跡を加えます。色の既定はパレットからの選択、値の既定はシードによるロールです。塗りの芯は筆圧を持たないため、半径は指定どおりに保たれます。</div>

**Palette and churn:** a `palette` override (`{ hue, scheme, seed }`, any field pinning that part) lets a mix share one palette. `churn` is the per-mark probability of rolling a fresh palette mid-drawing. It runs on its own seeded stream, so turning it on changes the colors without moving a single mark.
<div class="jp"><strong>パレットとチャーン：</strong>`palette`の上書き（`{ hue, scheme, seed }`、指定した部分だけを固定）によって、ミックスはひとつのパレットを共有できます。`churn`は、描画の途中で新しいパレットをロールする筆跡ごとの確率です。専用のシード付きストリームで動くため、オンにしても筆跡はひとつも動かさず、色だけを変えます。</div>

## The algorithms

<ul>
<li><code>LayeredDrawer</code>: ground fills in bands of the light colors, masses gathered around a focal point on a rule-of-thirds intersection, long strokes in one brush along a dominant direction, short dry marks clustered at the focus, and a few accents in the palette's most saturated color.<br /><span class="jp">明るい色の帯で敷く下地の塗り、三分割法の交点にある焦点のまわりに集まる量塊、ひとつの筆で主な方向に沿って引く長いストローク、焦点に集まる短い乾いた筆跡、そしてパレットで最も彩度の高い色のいくつかのアクセント。</span></li>
<li><code>FlowFieldDrawer</code>: strokes that trace a flow field (a base angle turned by noise) in three passes from wide and long to narrow and short, colored by a slower noise mapped across the palette.<br /><span class="jp">流れ場（ノイズで回した基準の角度）をたどるストロークを、太く長いものから細く短いものへ3回に分けて引きます。色は、パレットに写したより遅いノイズで決まります。</span></li>
<li><code>GeometricDrawer</code>: a square frame divided into a grid, flat color fields spanning cells, one shape fitted to each chosen cell in one shape family (flat or textured), a dominant circle on a grid crossing, and straight lines along the grid lines.<br /><span class="jp">格子に分けた正方形の枠、セルにまたがる平坦な色面、選んだセルごとにひとつ収まる形（形のファミリーは平坦かテクスチャ付きのどちらかひとつ）、格子の交点に置く大きな円、そして格子の線に沿った直線。</span></li>
<li><code>WindingStrokes</code>: long meandering strokes in realistic paints, each starting somewhere on the canvas and wandering as the noise field turns its heading.<br /><span class="jp">写実的な絵の具による長く曲がりくねったストローク。キャンバスのどこかから始まり、ノイズ場が向きを変えながらさまよいます。</span></li>
<li><code>HatchingDrawer</code>: patches of short parallel dry-media strokes at each patch's angle, about half of them crossed for cross-hatching.<br /><span class="jp">各区画の角度で引く短い平行なドライメディアのストロークのかたまり。約半数は交差させてクロスハッチングにします。</span></li>
<li><code>CalligraphicSweeps</code>: a few bold, strongly tapered ink and brush gestures crossing most of the canvas.<br /><span class="jp">キャンバスの大部分を横切る、力強くテーパーした数本の大胆なインクと筆のジェスチャ。</span></li>
<li><code>WetBlooms</code>: overlapping watercolor and wash fills gathered in a couple of clusters, larger and wetter first.<br /><span class="jp">いくつかのかたまりに集まる、重なり合う水彩とウォッシュの塗り。大きく水分の多いものから先に置きます。</span></li>
<li><code>MaterialStudy</code>: a few large metal, glass, and stone fills, with slimmer material strokes threaded between them.<br /><span class="jp">金属・ガラス・石の大きな塗りをいくつか置き、その間に細い素材のストロークを通します。</span></li>
<li><code>PatternField</code>: an initializer-style field, either bands of a patterned fill or rows of pattern strokes across the canvas.<br /><span class="jp">イニシャライザ風のパターンの場。パターンの塗りの帯か、キャンバスを横切るパターンストロークの列のどちらかです。</span></li>
<li><code>FoliageDrawer</code>: a few stems growing from the lower canvas, with leaf and feather sprays sprouting along them.<br /><span class="jp">キャンバスの下から伸びる数本の茎と、それに沿って生える葉や羽の房。</span></li>
<li><code>WrapCoil</code>: wrapping strokes coiling and scattering along a few hidden spines.<br /><span class="jp">いくつかの見えないスパインに沿って巻きつき、散らばる、取り巻くストローク。</span></li>
<li><code>ScatterDrawer</code>: a dense confetti field of small dabs and shape dots across the whole canvas.<br /><span class="jp">キャンバス全体に広がる、小さなタッチと形の点による紙吹雪のような密な場。</span></li>
<li><code>ShapeTiling</code>: one shape family packed across the canvas on a loose grid, hard-edged and graphic.<br /><span class="jp">ひとつの形のファミリーを、ゆるい格子でキャンバスに敷き詰めた、輪郭のくっきりしたグラフィックな塗り。</span></li>
</ul>

<strong>Mixing:</strong> `composeMixedPlan(drawers, { seed, extentX, extentY, registry, scheme, churn })` in `mix.js` composes one plan from one to three drawers over a shared palette, background, and canvas, each drawer at a seed derived from the shared one. With more than one drawer it shuffles every mark into a single random order, so the styles interleave; a single drawer keeps its own order.
<div class="jp"><strong>ミックス：</strong>`mix.js`の`composeMixedPlan(drawers, { seed, extentX, extentY, registry, scheme, churn })`は、1つから3つのドロワーから、共有のパレット・背景・キャンバスの上にひとつのプランを組み立てます。各ドロワーは共有のシードから導いたシードで描きます。2つ以上のときはすべての筆跡をひとつのランダムな順序に混ぜてスタイルを交互にし、1つのときはそのドロワー自身の順序を保ちます。</div>

## The runner and the UI

`AutoDrawerRunner(tool, drawers, opts)` runs auto drawers on a `DrawingTool`, headless like the engine. `setSelection(ids)` and `toggle(id)` set the one to three drawers that are mixed; `randomizeAlgorithms()` picks one to three at random and draws. `setScheme(scheme)` sets the palette scheme ('auto' or a scheme id), `setChurn(p)` the per-stroke palette-change probability, and `setCanvasSize(size)` pins the output to a fixed pixel size (or `null` to fit the window); each recomposes. `generate(seed)` composes the selection through `composeMixedPlan` and draws it, jumping straight to the final state (`animate` is off by default); `regenerate()` does the same at a fresh seed. `play()`, `stop()`, and `record()` drive the engine's replay and video recording, and `setSpeed(pointsPerFrame)` sets the playback speed, also mid-playback. Events: `'selection'`, `'scheme'`, `'churn'`, `'size'`, `'generate'`, `'play-start'`, `'play-end'`, `'record-start'`, and `'record-end'`.
<div class="jp">`AutoDrawerRunner(tool, drawers, opts)`は、`DrawingTool`の上でオートドロワーを動かします。エンジンと同じく画面を持ちません。`setSelection(ids)`と`toggle(id)`はミックスする1〜3個のドロワーを設定し、`randomizeAlgorithms()`は1〜3個をランダムに選んで描きます。`setScheme(scheme)`はパレットのスキーム（'auto'かスキームのid）、`setChurn(p)`はストロークごとにパレットを変える確率、`setCanvasSize(size)`は出力を固定ピクセルサイズに（`null`でウィンドウに合わせる）設定し、いずれも組み直します。`generate(seed)`は選択を`composeMixedPlan`で組み立てて描き、最終状態へ一気に飛びます（`animate`は既定でオフ）。`regenerate()`は新しいシードで同じことをします。`play()`、`stop()`、`record()`はエンジンの再生と録画を操作し、`setSpeed(pointsPerFrame)`は再生の速さを設定します（再生中でも）。イベントは`'selection'`、`'scheme'`、`'churn'`、`'size'`、`'generate'`、`'play-start'`、`'play-end'`、`'record-start'`、`'record-end'`です。</div>

`setupAutoDrawer({ drawers, root, seed })` in `index.js` assembles the whole demo: the layout, a `DrawingTool` with `AutoDrawerConfig` (no preview, no initializer, and no pointer input forwarded), the runner over one instance of each drawer class, and the default UI from `ui.js`. The UI picks up to three algorithms, a canvas size, a palette scheme, and a churn, with a button that randomizes the algorithms. `AUTO_DRAWERS` lists every drawer class in menu order; a new algorithm is a subclass added there.
<div class="jp">`index.js`の`setupAutoDrawer({ drawers, root, seed })`はデモ全体を組み立てます。レイアウト、`AutoDrawerConfig`の`DrawingTool`（プレビューもイニシャライザもなく、ポインタ入力も渡さない）、各ドロワークラスのインスタンスひとつずつを持つランナー、そして`ui.js`の既定のUIです。UIでは、最大3つのアルゴリズム、キャンバスサイズ、パレットのスキーム、チャーンを選べ、アルゴリズムをランダムに選ぶボタンもあります。`AUTO_DRAWERS`はすべてのドロワークラスをメニューの順に並べたもので、新しいアルゴリズムはそこに加えるサブクラスです。</div>

</div>
