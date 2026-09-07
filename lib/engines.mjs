import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const UMD_BUNDLE = path.join('build', 'dist', 'excalibur.js');

/**
 * Resolves an engine spec to a local UMD bundle file.
 *
 * Accepted specs:
 * - a path to a bundle, e.g. `../excalibur/build/dist/excalibur.js`
 * - `npm:excalibur@latest` (any npm spec) - fetched with `npm pack` into `cacheDir`
 * - `http(s)://.../excalibur.js` - downloaded into `cacheDir`
 * @returns {Promise<{ spec: string, file: string }>}
 */
export async function resolveEngine(spec, cacheDir) {
  if (spec.startsWith('npm:')) {
    return { spec, file: packFromNpm(spec.slice(4), cacheDir) };
  }
  if (/^https?:\/\//.test(spec)) {
    return { spec, file: await download(spec, cacheDir) };
  }
  const file = path.resolve(spec);
  if (!fs.existsSync(file)) {
    throw new Error(`engine bundle not found: ${file}`);
  }
  return { spec, file };
}

function packFromNpm(pkgSpec, cacheDir) {
  const dir = path.join(cacheDir, sanitize(pkgSpec));
  const bundle = path.join(dir, 'package', UMD_BUNDLE);
  if (fs.existsSync(bundle)) {
    return bundle;
  }
  fs.mkdirSync(dir, { recursive: true });
  const output = execFileSync('npm', ['pack', pkgSpec, '--pack-destination', dir, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  const [info] = JSON.parse(output);
  const tarball = path.join(dir, info.filename);
  execFileSync('tar', ['-xzf', tarball, '-C', dir], { stdio: 'inherit' });
  if (!fs.existsSync(bundle)) {
    throw new Error(`${pkgSpec} does not contain ${UMD_BUNDLE}`);
  }
  return bundle;
}

async function download(url, cacheDir) {
  const file = path.join(cacheDir, sanitize(url) + '.js');
  if (fs.existsSync(file)) {
    return file;
  }
  fs.mkdirSync(cacheDir, { recursive: true });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

function sanitize(text) {
  return text.replace(/[^a-zA-Z0-9.@-]+/g, '_');
}
