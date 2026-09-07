/**
 * The engine is loaded at runtime as the UMD global `ex`, so it is typed loosely on purpose: the same scenarios
 * must run against any Excalibur version, feature detect instead of relying on a specific API surface.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ex = any;

export interface BenchContext {
  ex: Ex;
  /** The ex.Engine under test */
  engine: Ex;
  /** Seeded ex.Random, identical sequence for every engine/repetition */
  rng: Ex;
  /** Index of the current measured frame, -1 during setup/warmup */
  frame: number;
}

export interface BenchTest {
  name: string;
  description: string;
  /**
   * Simulated milliseconds per deterministic step, usually 1000 / fixedUpdateFps (or 1000 / 60 without fixed updates)
   */
  stepMs: number;
  /**
   * Number of measured steps
   */
  frames: number;
  /**
   * Fixed number of un-measured steps before measuring
   */
  warmup?: number;
  /**
   * Keep warming up (un-measured) until this returns true, bounded by `warmupCap` steps
   */
  warmupUntil?: (ctx: BenchContext) => boolean;
  warmupCap?: number;
  /**
   * Extra ex.EngineOptions merged into the engine under test (physics config, fixedUpdateFps, ...)
   */
  engineOptions?: (ex: Ex) => Record<string, unknown>;
  /**
   * Build the scene, the engine has already started
   */
  setup: (ctx: BenchContext) => void | Promise<void>;
  /**
   * Called before every measured step, e.g. to spawn something
   */
  onFrame?: (ctx: BenchContext) => void;
  /**
   * Force the GPU to finish each step inside the timed window (a 1 pixel readback). Required for drawing benchmarks:
   * WebGL work is submitted asynchronously and would otherwise land outside the measurement
   */
  syncGpu?: boolean;
  /**
   * Extra numbers reported next to the timings, sampled after the last measured step
   */
  extras?: (ctx: BenchContext) => Record<string, number>;
}

export const defineTest = (test: BenchTest): BenchTest => test;

/**
 * Number of active bodies currently asleep, works on any engine version that exposes `actor.body.isSleeping`
 */
export function countSleeping(ctx: BenchContext): number {
  let sleeping = 0;
  for (const actor of ctx.engine.currentScene.actors) {
    if (actor.body?.isSleeping) {
      sleeping++;
    }
  }
  return sleeping;
}
