// Neon Palms Cover Studio — entry program (Node 22, standard library only).
//
// Copies app/ and screenshots/ from this repository into the output directory
// and writes /output/dossier.json with buildDossier from vendor/makefun-app.ts.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
//
// The output directory itself is never removed: the grader mounts it as a
// volume, so only its contents are cleared, never the directory.

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Gate limits from the competition kit: app/ at most 993 entries and
// 48 MiB, index.html at most 1 MiB; screenshots 3-4 files at most 256 KiB
// each; dossier text at most 160 KiB.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

function clearOutputContents(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function main(): void {
  clearOutputContents(outputDir);
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(repoRoot, dossierCaps);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`Neon Palms Cover Studio: wrote ${outputDir}/dossier.json (${dossier.length} bytes)`);
  console.log(`app/ and screenshots/ copied to ${outputDir}`);
}

main();
