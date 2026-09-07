import { countSleeping, defineTest, type BenchContext } from '../test';
import { addBlockColumns, addEdgeBox, realisticStackOptions } from './scene-helpers';

const COUNT = 200;
const SPAWN_EVERY = 60;

let spawned = 0;

/**
 * A settled, sleeping pile that keeps getting hit by a new box every 60 frames.
 * Exercises sleeping contact persistence, island wake up and going back to sleep.
 */
export const sleepingPileWake = defineTest({
  name: 'sleeping-pile-wake',
  description: '200 box pile asleep, a new box dropped on it every 60 frames',
  stepMs: 1000 / 30,
  frames: 300,
  warmupUntil: (ctx) => countSleeping(ctx) >= COUNT - 1,
  warmupCap: 900,
  engineOptions: (ex) => realisticStackOptions(ex, 30),
  setup: (ctx: BenchContext) => {
    spawned = 0;
    addEdgeBox(ctx, 400, 300, 2400);
    addBlockColumns(ctx, COUNT, 10, 40, -400);
  },
  onFrame: ({ ex, engine, rng, frame }: BenchContext) => {
    if (frame % SPAWN_EVERY === 0) {
      spawned++;
      engine.add(
        new ex.Actor({
          name: 'dropped',
          pos: ex.vec(rng.floating(-150, 150), -900),
          width: 40,
          height: 40,
          color: ex.Color.White,
          collisionType: ex.CollisionType.Active
        })
      );
    }
  },
  extras: (ctx) => ({ sleepingAtEnd: countSleeping(ctx), spawned })
});
