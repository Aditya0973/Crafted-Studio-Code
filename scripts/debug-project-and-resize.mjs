import path from 'path';
import os from 'os';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { initDatabaseAsync } = require('../dist/database/index.js');
const { ProjectService } = require('../dist/services/ProjectService.js');

async function debugProjects() {
  console.log('=== DEBUGGING PROJECT MANAGEMENT & RECENT PROJECTS ===\n');

  const dbDir = path.join(os.tmpdir(), 'crafted_studio_debug_db');
  const parentDir = path.join(os.tmpdir(), 'crafted_studio_debug_workspaces');

  if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  if (fs.existsSync(parentDir)) fs.rmSync(parentDir, { recursive: true, force: true });

  fs.mkdirSync(parentDir, { recursive: true });
  await initDatabaseAsync(dbDir);

  // 1. Create a project
  console.log('1. Creating Test Project...');
  const proj1 = await ProjectService.createProject({
    name: 'Test Project 1',
    parentPath: parentDir,
  });
  console.log('   Created Project:', proj1);

  // 2. Fetch Active Project
  const active = await ProjectService.getActiveProject();
  console.log('\n2. Active Project:', active);

  // 3. Fetch Recent Projects
  const recents = await ProjectService.getRecentProjects();
  console.log('\n3. Recent Projects Count:', recents.length, recents);

  if (recents.length !== 1) throw new Error('Recent projects list is empty!');

  // 4. Test Opening External Project Folder (Import Proposal)
  const extDir = path.join(parentDir, 'external-app');
  fs.mkdirSync(extDir, { recursive: true });
  fs.writeFileSync(path.join(extDir, 'package.json'), '{"name": "ext"}', 'utf-8');

  console.log('\n4. Testing openProject on external folder:', extDir);
  const openResult = await ProjectService.openProject(extDir);
  console.log('   Open Result:', openResult);

  if (!('isImportRequired' in openResult) || !openResult.isImportRequired) {
    throw new Error('openProject failed to return import proposal for external folder');
  }

  // 5. Test Importing External Project
  console.log('\n5. Testing importProject...');
  const importedProj = await ProjectService.importProject({
    projectPath: extDir,
    name: 'External App',
  });
  console.log('   Imported Project:', importedProj);

  const recentsAfterImport = await ProjectService.getRecentProjects();
  console.log('\n6. Recent Projects after Import:', recentsAfterImport.length);

  if (recentsAfterImport.length !== 2) throw new Error('Imported project not added to recents');

  console.log('\nSUCCESS: All project operations work cleanly!');
}

debugProjects().catch((err) => {
  console.error('Debug Failed:', err);
  process.exit(1);
});
