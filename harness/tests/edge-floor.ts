import { countSleeping, defineTest, type BenchContext } from '../test';
import { realisticStackOptions } from './scene-helpers';

const COUNT = 200;

/**
 * 200 boxes dropped in a line onto one very long edge collider, including right at its ends.
 * Exercises the polygon vs edge path of the separating axis test and edge contact manifolds.
 */
export const edgeFloor = defineTest({
  name: 'edge-floor-realistic-200',
  description: '200 boxes land along a 4000px edge floor (realistic solver)',
  stepMs: 1000 / 30,
  frames: 300,
  engineOptions: (ex) => realisticStackOptions(ex, 30),
  setup: ({ ex, engine, rng }: BenchContext) => {
    engine.add(
      new ex.Actor({
        name: 'floor',
        pos: ex.vec(0, 300),
        collider: ex.Shape.Edge(ex.vec(-2000, 0), ex.vec(2000, 0)),
        collisionType: ex.CollisionType.Fixed
      })
    );
    for (let i = 0; i < COUNT; i++) {
      // spread from one end of the floor to the other, five rows high so boxes land on each other too
      const x = -1990 + (i % 40) * 100;
      const y = 200 - Math.floor(i / 40) * 45;
      engine.add(
        new ex.Actor({
          name: 'block',
          pos: ex.vec(x, y),
          width: 30,
          height: 30,
          color: new ex.Color(rng.integer(0, 255), rng.integer(0, 255), rng.integer(0, 255)),
          collisionType: ex.CollisionType.Active
        })
      );
    }
  },
  extras: (ctx: BenchContext) => {
    let fellThrough = 0;
    for (const actor of ctx.engine.currentScene.actors) {
      if (actor.name === 'block' && actor.pos.y > 400) {
        fellThrough++;
      }
    }
    return { sleepingAtEnd: countSleeping(ctx), fellThrough };
  }
});
