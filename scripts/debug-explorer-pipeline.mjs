import path from 'path';
import os from 'os';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { initDatabaseAsync } = require('../dist/database/index.js');
const { ProjectService } = require('../dist/services/ProjectService.js');
const { ExplorerService } = require('../dist/services/ExplorerService.js');

async function debugPipeline() {
  console.log('=== STAGE 1: DATABASE & WORKSPACE INIT ===');
  const dbDir = path.join(os.tmpdir(), 'crafted_studio_debug_db');
  if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  await initDatabaseAsync(dbDir);

  const parentDir = path.join(os.tmpdir(), 'crafted_studio_debug_workspace');
  if (fs.existsSync(parentDir)) fs.rmSync(parentDir, { recursive: true, force: true });
  fs.mkdirSync(parentDir, { recursive: true });

  console.log('=== STAGE 2: CREATE PROJECT VIA PROJECTSERVICE ===');
  const project = await ProjectService.createProject({
    name: 'Debug Explorer App',
    parentPath: parentDir,
  });
  console.log('Created Active Project:', project);

  console.log('\n=== STAGE 3: GET ACTIVE PROJECT FROM DB ===');
  const active = await ProjectService.getActiveProject();
  console.log('Active Project from DB:', active);

  console.log('\n=== STAGE 4: CHECK PATH ON DISK ===');
  console.log('Active Path:', active?.path);
  console.log('Exists on disk:', fs.existsSync(active?.path || ''));

  console.log('\n=== STAGE 5: SCAN TREE VIA EXPLORERSERVICE ===');
  const tree = await ExplorerService.scanTree(active?.path || '');
  console.log('Scanned Tree Result:', tree ? {
    id: tree.id,
    name: tree.name,
    type: tree.type,
    childrenCount: tree.children?.length,
    childrenNames: tree.children?.map(c => c.name)
  } : 'NULL TREE RETURNED!');

  console.log('\n=== STAGE 6: VERIFY EXPANDED PATHS ===');
  const expanded = await ExplorerService.getExpandedPaths(active?.id || '');
  console.log('Expanded Paths:', expanded);

  console.log('\n=== PIPELINE DEBUG COMPLETE ===');
}

debugPipeline().catch(err => {
  console.error('Pipeline Debug Error:', err);
});
