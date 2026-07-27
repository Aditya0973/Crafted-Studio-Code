import path from 'path';
import os from 'os';
import fs from 'fs';
import { spawn } from 'child_process';
import electron from 'electron';

async function runElectronRuntimeDebug() {
  console.log('=== RUNTIME DEBUG INVESTIGATION: OPENING FILE TAB ===\n');

  const mainScript = path.join(process.cwd(), 'dist', 'main', 'index.js');

  const child = spawn(electron, [mainScript], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_ENABLE_LOGGING: '1',
      ELECTRON_ENABLE_STACK_DUMPING: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdoutBuffer = '';
  let stderrBuffer = '';

  child.stdout.on('data', (data) => {
    const str = data.toString();
    stdoutBuffer += str;
    console.log('[ELECTRON STDOUT]', str.trim());
  });

  child.stderr.on('data', (data) => {
    const str = data.toString();
    stderrBuffer += str;
    console.log('[ELECTRON STDERR]', str.trim());
  });

  // Let it run for 10 seconds
  await new Promise((resolve) => setTimeout(resolve, 10000));

  child.kill('SIGKILL');
}

runElectronRuntimeDebug().catch((err) => {
  console.error('Runtime Debug Error:', err);
  process.exit(1);
});
