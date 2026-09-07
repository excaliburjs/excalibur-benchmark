import { defineConfig } from 'vite';

// The harness is a static page that loads an Excalibur UMD bundle at runtime via `?engine=<url>`,
// it never bundles the engine itself so the same page can benchmark any version.
export default defineConfig({
  root: 'harness',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true
  },
  server: {
    fs: {
      // allow serving engine bundles from sibling checkouts during `npm run dev`, e.g. ?engine=/@fs/.../build/dist/excalibur.js
      allow: ['..']
    }
  }
});
