import { defineTest, type BenchContext, type BenchTest } from '../test';

/**
 * The original excalibur-benchmark scenario: many non-colliding actors flying around, exercises the ECS,
 * transforms and the renderer rather than physics
 */
function makeActorsTest(count: number): BenchTest {
  return defineTest({
    name: `actors-${count}`,
    description: `${count} actors with random velocity and spin, no collisions`,
    stepMs: 1000 / 60,
    warmup: 10,
    frames: 300,
    setup: ({ ex, engine, rng }: BenchContext) => {
      for (let i = 0; i < count; i++) {
        const actor = new ex.Actor({
          pos: ex.vec(engine.halfDrawWidth, engine.halfDrawHeight),
          width: 10,
          height: 10,
          color: new ex.Color(rng.integer(0, 255), rng.integer(0, 255), rng.integer(0, 255)),
          collisionType: ex.CollisionType.PreventCollision,
          vel: ex.vec(rng.floating(-100, 100), rng.floating(-100, 100)),
          angularVelocity: rng.floating(-2, 2)
        });
        engine.add(actor);
      }
    },
    extras: ({ engine }: BenchContext) => ({ actors: engine.currentScene.actors.length })
  });
}

export const actors1000 = makeActorsTest(1000);
export const actors4000 = makeActorsTest(4000);
