// EMBERFALL v3 — entry program for the make.fun best-game-01 bounty.
//
// What it does: copy the playable game and its screenshots out of this
// repository into the output directory, then write /output/dossier.json
// with buildDossier from the kit's vendor/makefun-game.ts.
//
// Sandbox rule that killed v2: the grader mounts its output directory as
// a volume, so the output directory itself must never be removed — only
// the entries inside it (game/, screenshots/, dossier.json). Removing the
// directory itself fails with EBUSY and kills the run. Standard library
// only; two runs write byte-identical output.
import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = (process.env.MAKEFUN_OUTPUT_DIR ?? '').trim() || '/output';

const CHILDREN = ['game', 'screenshots', 'dossier.json'] as const;

function clearChildren(): void {
  // Remove only what lives INSIDE the output directory. Never the
  // directory itself: on the grader it is a mount point.
  for (const name of CHILDREN) {
    rmSync(join(outputDir, name), { recursive: true, force: true });
  }
}

function copyChildren(): void {
  for (const name of ['game', 'screenshots'] as const) {
    const source = join(repoRoot, name);
    if (!existsSync(source)) {
      throw new Error(`EMBERFALL v3: repository is missing ${name}/ — refusing to write an empty entry`);
    }
    cpSync(source, join(outputDir, name), { recursive: true });
  }
}

function main(): void {
  mkdirSync(outputDir, { recursive: true });
  clearChildren();
  copyChildren();
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 48 * 1024 * 1024,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  if (dossier.length === 0) {
    throw new Error('EMBERFALL v3: buildDossier returned an empty dossier');
  }
  console.log(`EMBERFALL v3: wrote ${join(outputDir, 'dossier.json')} (${dossier.length} bytes)`);
}

main();
