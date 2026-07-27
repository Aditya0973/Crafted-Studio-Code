import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import electron from 'electron';

const VITE_DEV_SERVER_URL = 'http://localhost:5783';
const MAIN_DIST_PATH = path.resolve('dist/main/index.js');

function checkViteReady() {
  return new Promise((resolve) => {
    const req = http.get(VITE_DEV_SERVER_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function startElectron() {
  console.log('[Dev] Waiting for Vite server & main bundle on port 5783...');
  let ready = false;
  for (let i = 0; i < 40; i++) {
    const viteReady = await checkViteReady();
    const mainReady = fs.existsSync(MAIN_DIST_PATH);
    if (viteReady && mainReady) {
      ready = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!ready) {
    console.error('[Dev] Server or main bundle ready timeout.');
    process.exit(1);
  }

  console.log('[Dev] Launching Electron window...');
  const child = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

startElectron();
