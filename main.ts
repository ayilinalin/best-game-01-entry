// EMBERFALL v2 — entry program for make.fun best-game-01.
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendor/makefun-game.ts, exactly as the gate rebuilds it.
import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function main(): void {
  for (const sub of ['game', 'screenshots']) {
    if (!existsSync(join(REPO_ROOT, sub))) {
      throw new Error(`EMBERFALL v2: missing ${join(REPO_ROOT, sub)} — refusing to write an empty entry`);
    }
  }
  if (existsSync(OUTPUT_DIR)) rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  cpSync(join(REPO_ROOT, 'game'), join(OUTPUT_DIR, 'game'), { recursive: true });
  cpSync(join(REPO_ROOT, 'screenshots'), join(OUTPUT_DIR, 'screenshots'), { recursive: true });
  const dossier = buildDossier(OUTPUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 48 * 1024 * 1024,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  if (dossier.length === 0) throw new Error('EMBERFALL v2: buildDossier wrote 0 bytes');
  console.log(`EMBERFALL v2: wrote ${join(OUTPUT_DIR, 'dossier.json')} (${dossier.length} bytes)`);
}

main();
