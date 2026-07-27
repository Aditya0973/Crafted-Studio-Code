import { downloadArtifact } from '@electron/get';
import extract from 'extract-zip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const electronDir = path.resolve(__dirname, '../node_modules/electron');

async function fixElectron() {
  console.log('[Fix] Downloading Electron binary artifact zip...');
  const version = '34.2.0';
  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform: 'win32',
    arch: 'x64',
  });

  console.log('[Fix] Zip downloaded to:', zipPath);
  const distDir = path.join(electronDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });

  console.log('[Fix] Extracting zip to:', distDir);
  await extract(zipPath, { dir: distDir });

  fs.writeFileSync(path.join(electronDir, 'path.txt'), 'electron.exe');
  console.log('[Fix] Successfully created path.txt. Executable ready:', fs.existsSync(path.join(distDir, 'electron.exe')));
}

fixElectron().catch((err) => {
  console.error('[Fix] Failed to download electron:', err);
  process.exit(1);
});
