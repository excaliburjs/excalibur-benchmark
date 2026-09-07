import type { BenchContext, Ex } from '../test';

/**
 * Shared physics config for the realistic solver stacks, mirrors sandbox/tests/collision-stacks in excalibur
 */
export function realisticStackOptions(ex: Ex, fixedUpdateFps = 30) {
  return {
    fixedUpdateFps,
    physics: {
      solver: ex.SolverStrategy.Realistic,
      gravity: ex.vec(0, 400),
      substep: 3,
      bodies: { canSleepByDefault: true },
      realistic: {
        velocityIterations: 4,
        positionIterations: 2
      }
    }
  };
}

/**
 * Fixed edge colliders: a floor plus two tall walls, world coordinates centered on (0, 0)
 * @param halfWidth distance from the center to each wall
 * @param floorY y of the floor
 * @param wallHeight how far up from the floor the walls reach
 */
export function addEdgeBox({ ex, engine }: BenchContext, halfWidth: number, floorY: number, wallHeight: number) {
  const floor = new ex.Actor({
    name: 'floor',
    pos: ex.vec(0, floorY),
    collider: ex.Shape.Edge(ex.vec(-halfWidth, 0), ex.vec(halfWidth, 0)),
    collisionType: ex.CollisionType.Fixed
  });
  const left = new ex.Actor({
    name: 'left-wall',
    pos: ex.vec(-halfWidth, floorY),
    collider: ex.Shape.Edge(ex.vec(0, -wallHeight), ex.vec(0, 0)),
    collisionType: ex.CollisionType.Fixed
  });
  const right = new ex.Actor({
    name: 'right-wall',
    pos: ex.vec(halfWidth, floorY),
    collider: ex.Shape.Edge(ex.vec(0, -wallHeight), ex.vec(0, 0)),
    collisionType: ex.CollisionType.Fixed
  });
  engine.add(floor);
  engine.add(left);
  engine.add(right);
}

/**
 * A grid of boxes stacked in columns above the floor, they fall and pile up
 */
export function addBlockColumns({ ex, engine, rng }: BenchContext, count: number, columns: number, size: number, startY: number) {
  const spacing = size * 1.5;
  for (let i = 0; i < count; i++) {
    const x = -((columns - 1) * size) / 2 + (i % columns) * size;
    const y = startY - Math.floor(i / columns) * spacing;
    engine.add(
      new ex.Actor({
        name: 'block',
        pos: ex.vec(x, y),
        width: size,
        height: size,
        color: new ex.Color(rng.integer(0, 255), rng.integer(0, 255), rng.integer(0, 255)),
        collisionType: ex.CollisionType.Active
      })
    );
  }
}
