import { defineTest, type BenchContext } from '../test';
import { addEdgeBox } from './scene-helpers';

const COUNT = 1000;

/**
 * 1000 small active boxes bouncing around inside a walled box with the arcade solver and no gravity.
 * Exercises the spatial hash broadphase, polygon narrowphase and the arcade solver at high pair counts.
 */
export const arcadeBouncing = defineTest({
  name: 'arcade-1000-bouncing',
  description: '1000 active boxes bouncing in a box (arcade solver, no gravity)',
  stepMs: 1000 / 60,
  warmup: 10,
  frames: 300,
  engineOptions: (ex) => ({
    physics: {
      solver: ex.SolverStrategy.Arcade,
      gravity: ex.vec(0, 0)
    }
  }),
  setup: (ctx: BenchContext) => {
    const { ex, engine, rng } = ctx;
    addEdgeBox(ctx, 400, 300, 600);
    for (let i = 0; i < COUNT; i++) {
      engine.add(
        new ex.Actor({
          name: 'ball',
          pos: ex.vec(rng.floating(-380, 380), rng.floating(-280, 280)),
          width: 20,
          height: 20,
          color: new ex.Color(rng.integer(0, 255), rng.integer(0, 255), rng.integer(0, 255)),
          collisionType: ex.CollisionType.Active,
          vel: ex.vec(rng.floating(-150, 150), rng.floating(-150, 150))
        })
      );
    }
  },
  extras: ({ engine }: BenchContext) => {
    // bodies that escaped the box would indicate tunneling
    let outside = 0;
    for (const actor of engine.currentScene.actors) {
      if (actor.name === 'ball' && (Math.abs(actor.pos.x) > 420 || actor.pos.y > 320 || actor.pos.y < -320)) {
        outside++;
      }
    }
    return { outside };
  }
});
