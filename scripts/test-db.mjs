import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { initDatabaseAsync } = require('../dist/main/database/index.js');

async function test() {
  const dbDir = path.join(os.tmpdir(), 'crafted_studio_test_db');
  const db = await initDatabaseAsync(dbDir);

  console.log('--- TABLES CREATED ---');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(tables);

  console.log('--- SETTINGS DATA ---');
  const settings = db.prepare('SELECT * FROM settings').all();
  console.log(settings);

  console.log('--- WINDOW STATE DATA ---');
  const windowState = db.prepare('SELECT * FROM window_state').all();
  console.log(windowState);
}

test();
