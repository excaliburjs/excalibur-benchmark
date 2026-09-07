import type { BenchContext, BenchTest, Ex } from './test';

export type Mode = 'step' | 'realtime';

export interface StepOptions {
  /**
   * Yield to the browser after every step so each frame is actually presented on screen (headed runs). The yield is
   * outside the timed window, samples are unaffected; the run takes longer because it becomes bound to the display
   */
  present?: boolean;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export interface BaseResult {
  name: string;
  mode: Mode;
  engineVersion: string;
  /** per step (ms) in step mode, per sample fps in realtime mode */
  samples: number[];
  median: number;
  p95: number;
  mean: number;
  extras: Record<string, number>;
  error?: string;
}

export interface StepResult extends BaseResult {
  mode: 'step';
  stepMs: number;
  warmupSteps: number;
  frames: number;
  /** wall clock ms spent in the measured steps */
  total: number;
  /** wall clock ms for engine start + scene setup */
  setupMs: number;
  /** wall clock ms for the warmup steps */
  warmupMs: number;
}

export interface RealtimeResult extends BaseResult {
  mode: 'realtime';
  durationMs: number;
}

export type Result = StepResult | RealtimeResult;

export function quantile(sortedAscending: number[], q: number): number {
  if (sortedAscending.length === 0) {
    return NaN;
  }
  const index = (sortedAscending.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedAscending[lower] * (1 - weight) + sortedAscending[upper] * weight;
}

export function summarize(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, value) => sum + value, 0) / (samples.length || 1);
  return { median: quantile(sorted, 0.5), p95: quantile(sorted, 0.95), mean };
}

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;

function createEngine(ex: Ex, test: BenchTest) {
  const stage = document.getElementById('stage') ?? document.body;
  const canvas = document.createElement('canvas');
  canvas.id = 'bench-canvas';
  stage.appendChild(canvas);
  const engine = new ex.Engine({
    canvasElement: canvas,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    suppressPlayButton: true,
    suppressHiDPIScaling: true,
    suppressConsoleBootMessage: true,
    ...(test.engineOptions?.(ex) ?? {})
  });
  return { engine, canvas };
}

function destroyEngine(engine: Ex, canvas: HTMLCanvasElement) {
  try {
    engine.stop();
    if (typeof engine.dispose === 'function') {
      engine.dispose();
    }
  } finally {
    canvas.remove();
  }
}

const GPU_SYNC_PIXEL = new Uint8Array(4);
/**
 * Blocks until the GPU has finished the frame by reading back one pixel, works on every Excalibur WebGL context version
 * that exposes the raw context as `__gl`
 */
function syncGpu(engine: Ex) {
  const gl: WebGLRenderingContext | undefined = engine.graphicsContext?.__gl;
  if (gl) {
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, GPU_SYNC_PIXEL);
  }
}

async function runWarmup(test: BenchTest, ctx: BenchContext, step: () => void, present: boolean): Promise<number> {
  let warmupSteps = 0;
  for (let i = 0; i < (test.warmup ?? 0); i++) {
    step();
    warmupSteps++;
    if (present) {
      await nextFrame();
    }
  }
  if (test.warmupUntil) {
    const cap = test.warmupCap ?? 1000;
    while (warmupSteps < cap && !test.warmupUntil(ctx)) {
      step();
      warmupSteps++;
      if (present) {
        await nextFrame();
      }
    }
  }
  return warmupSteps;
}

/**
 * Deterministic mode: the engine clock is replaced with a test clock before start and driven manually,
 * each measured sample is the wall clock time of one engine step (update + draw) of `stepMs` simulated time.
 */
export async function runStep(ex: Ex, test: BenchTest, options: StepOptions = {}): Promise<StepResult> {
  const present = options.present ?? false;
  const { engine, canvas } = createEngine(ex, test);
  // swap before start so nothing gets scheduled on the real time clock
  const clock = (engine.clock = engine.clock.toTestClock());
  const base: StepResult = {
    name: test.name,
    mode: 'step',
    engineVersion: String(ex.EX_VERSION ?? 'unknown'),
    stepMs: test.stepMs,
    warmupSteps: 0,
    frames: test.frames,
    samples: [],
    median: NaN,
    p95: NaN,
    mean: NaN,
    total: 0,
    setupMs: 0,
    warmupMs: 0,
    extras: {}
  };
  try {
    const setupStart = performance.now();
    await engine.start();
    const ctx: BenchContext = { ex, engine, rng: new ex.Random(1337), frame: -1 };
    await test.setup(ctx);
    base.setupMs = performance.now() - setupStart;
    const step = test.syncGpu
      ? () => {
          clock.step(test.stepMs);
          syncGpu(engine);
        }
      : () => clock.step(test.stepMs);
    const warmupStart = performance.now();
    base.warmupSteps = await runWarmup(test, ctx, step, present);
    base.warmupMs = performance.now() - warmupStart;

    const samples: number[] = new Array(test.frames);
    const start = performance.now();
    for (let i = 0; i < test.frames; i++) {
      ctx.frame = i;
      test.onFrame?.(ctx);
      const t0 = performance.now();
      step();
      samples[i] = performance.now() - t0;
      if (present) {
        await nextFrame();
      }
    }
    base.total = performance.now() - start;
    base.samples = samples;
    Object.assign(base, summarize(samples));
    base.extras = test.extras?.(ctx) ?? {};
  } catch (e) {
    base.error = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e);
  } finally {
    destroyEngine(engine, canvas);
  }
  return base;
}

/**
 * Real time mode (manual runs): the engine runs on its normal clock for `durationMs`,
 * samples are frames per second over 250ms windows.
 */
export async function runRealtime(ex: Ex, test: BenchTest, durationMs: number): Promise<RealtimeResult> {
  const { engine, canvas } = createEngine(ex, test);
  const base: RealtimeResult = {
    name: test.name,
    mode: 'realtime',
    engineVersion: String(ex.EX_VERSION ?? 'unknown'),
    durationMs,
    samples: [],
    median: NaN,
    p95: NaN,
    mean: NaN,
    extras: {}
  };
  try {
    await engine.start();
    const ctx: BenchContext = { ex, engine, rng: new ex.Random(1337), frame: -1 };
    await test.setup(ctx);

    const samples: number[] = [];
    let frames = 0;
    let windowStart = performance.now();
    let frame = 0;
    const onFrame = () => {
      ctx.frame = frame++;
      test.onFrame?.(ctx);
      frames++;
      const now = performance.now();
      if (now - windowStart >= 250) {
        samples.push((frames * 1000) / (now - windowStart));
        frames = 0;
        windowStart = now;
      }
    };
    engine.on('preframe', onFrame);
    await new Promise<void>((resolve) => setTimeout(resolve, durationMs));
    engine.off('preframe', onFrame);
    base.samples = samples;
    Object.assign(base, summarize(samples));
    base.extras = test.extras?.(ctx) ?? {};
  } catch (e) {
    base.error = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e);
  } finally {
    destroyEngine(engine, canvas);
  }
  return base;
}
