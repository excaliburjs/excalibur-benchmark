import { countSleeping, defineTest, type BenchContext, type BenchTest } from '../test';
import { addBlockColumns, addEdgeBox, realisticStackOptions } from './scene-helpers';

const STEP_MS = 1000 / 30;

// tracked across frames of a single run, reset in setup
let firstFrameAllAsleep = -1;

function buildStack(ctx: BenchContext, count: number) {
  firstFrameAllAsleep = -1;
  // walls are much taller than the settling pile so nothing spills over the top
  addEdgeBox(ctx, 400, 300, 2400);
  addBlockColumns(ctx, count, 10, 40, -400);
}

/**
 * Boxes dropped into a walled box with the realistic solver, measured while they land and settle.
 * Port of sandbox/tests/collision-stacks. Exercises narrowphase, solver iterations, warm starting and islands.
 */
function makeSettleTest(count: number): BenchTest {
  return defineTest({
    name: `stack-realistic-${count}-settle`,
    description: `${count} boxes fall and settle into a pile (realistic solver, 3 substeps)`,
    stepMs: STEP_MS,
    frames: 300,
    engineOptions: (ex) => realisticStackOptions(ex, 30),
    setup: (ctx) => buildStack(ctx, count),
    onFrame: (ctx) => {
      if (firstFrameAllAsleep < 0 && countSleeping(ctx) >= count - 1) {
        firstFrameAllAsleep = ctx.frame;
      }
    },
    extras: (ctx) => ({ sleepingAtEnd: countSleeping(ctx), firstFrameAllAsleep })
  });
}

/**
 * A smaller pile that older releases survive, so there is always a comparable number
 */
export const stackRealistic100Settle = makeSettleTest(100);

export const stackRealisticSettle = makeSettleTest(300);

/**
 * Same pile after it has come to rest: everything is asleep, this is the per frame floor of the
 * broadphase, contact persistence and collider bookkeeping
 */
const COUNT = 300;

export const stackRealisticRest = defineTest({
  name: 'stack-realistic-300-rest',
  description: '300 box pile fully asleep, per frame maintenance floor',
  stepMs: STEP_MS,
  frames: 150,
  warmupUntil: (ctx) => countSleeping(ctx) >= COUNT - 1,
  warmupCap: 900,
  engineOptions: (ex) => realisticStackOptions(ex, 30),
  setup: (ctx) => buildStack(ctx, COUNT),
  extras: (ctx) => ({ sleepingAtEnd: countSleeping(ctx) })
});
