import { defineTest, type BenchContext, type BenchTest } from '../test';

/**
 * Port of https://github.com/excaliburjs/excalibur-bunnymark: sprites drawn straight through the graphics context
 * every frame with a tiny manual physics update, no actors or ECS involved. A pure drawing pipeline benchmark
 * (batching, texture binding, draw call overhead).
 */
interface Bunny {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
}

function makeBunnymark(count: number): BenchTest {
  const WIDTH = 800;
  const HEIGHT = 600;
  const GRAVITY = 0.75;
  let bunnies: Bunny[] = [];
  let image: BenchContext['ex'] = null;

  return defineTest({
    name: `bunnymark-${count}`,
    description: `${count} bunny sprites drawn each frame via the graphics context (drawing pipeline)`,
    stepMs: 1000 / 60,
    // software GL on CI rasterizes these at ~100ms+/frame, keep the sample count modest
    warmup: 10,
    frames: 120,
    syncGpu: true,
    engineOptions: (ex) => ({
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: ex.Color.White,
      antialiasing: false,
      useDrawSorting: false,
      pixelRatio: 1
    }),
    setup: async ({ ex, engine, rng }: BenchContext) => {
      image = new ex.ImageSource('./rabbitv3.png');
      await image.load();
      bunnies = [];
      for (let i = 0; i < count; i++) {
        bunnies.push({ x: 0, y: 0, speedX: rng.floating(0, 10), speedY: rng.floating(-5, 5) });
      }
      const bitmap = image.image;
      // the same update the original bunnymark does, seeded so both engines see identical motion
      engine.on('postupdate', () => {
        for (let i = 0; i < bunnies.length; i++) {
          const bunny = bunnies[i];
          bunny.x += bunny.speedX;
          bunny.y += bunny.speedY;
          bunny.speedY += GRAVITY;
          if (bunny.x > WIDTH) {
            bunny.speedX *= -1;
            bunny.x = WIDTH;
          } else if (bunny.x < 0) {
            bunny.speedX *= -1;
            bunny.x = 0;
          }
          if (bunny.y > HEIGHT) {
            bunny.speedY *= -0.85;
            bunny.y = HEIGHT;
            if (rng.next() > 0.5) {
              bunny.speedY -= rng.floating(0, 6);
            }
          } else if (bunny.y < 0) {
            bunny.speedY = 0;
            bunny.y = 0;
          }
        }
      });
      engine.on('postdraw', () => {
        const ctx = engine.graphicsContext;
        for (let i = 0; i < bunnies.length; i++) {
          ctx.drawImage(bitmap, bunnies[i].x, bunnies[i].y);
        }
      });
    },
    extras: ({ engine }: BenchContext) => {
      const stats = engine.stats?.prevFrame;
      return {
        bunnies: bunnies.length,
        drawCalls: stats?.graphics?.drawCalls ?? NaN
      };
    }
  });
}

export const bunnymark2000 = makeBunnymark(2_000);
export const bunnymark5000 = makeBunnymark(5_000);
