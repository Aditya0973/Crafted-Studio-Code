import path from 'path';
import os from 'os';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { initDatabaseAsync } = require('../dist/database/index.js');
const { ProjectService } = require('../dist/services/ProjectService.js');
const { WorkbenchSessionService } = require('../dist/services/WorkbenchSessionService.js');

async function verifySprint53() {
  console.log('=== VERIFYING SPRINT 5.3 WORKBENCH SESSION PERSISTENCE ===\n');

  const dbDir = path.join(os.tmpdir(), 'crafted_studio_sprint53_test_db');
  const parentDir = path.join(os.tmpdir(), 'crafted_studio_sprint53_workspaces');

  if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  if (fs.existsSync(parentDir)) fs.rmSync(parentDir, { recursive: true, force: true });

  fs.mkdirSync(parentDir, { recursive: true });
  await initDatabaseAsync(dbDir);

  // 1. Create Project A & Project B
  console.log('1. Creating Project A and Project B...');
  const projA = await ProjectService.createProject({ name: 'Alpha Studio', parentPath: parentDir });
  const projB = await ProjectService.createProject({ name: 'Beta Studio', parentPath: parentDir });

  // Create sample files on disk
  const fileA1 = path.join(projA.path, 'src', 'index.ts');
  const fileA2 = path.join(projA.path, 'memory.md');
  const fileB1 = path.join(projB.path, 'project.json');

  fs.mkdirSync(path.dirname(fileA1), { recursive: true });
  fs.writeFileSync(fileA1, 'console.log("Alpha");', 'utf-8');
  fs.writeFileSync(fileA2, '# Alpha Memory', 'utf-8');
  fs.writeFileSync(fileB1, '{"name": "Beta"}', 'utf-8');

  // 2. Save Session for Project A
  console.log('\n2. Saving Workbench Session for Project A...');
  const tabsA = [
    { id: fileA1, path: fileA1, title: 'index.ts', editorId: 'text-viewer', extension: '.ts' },
    { id: fileA2, path: fileA2, title: 'memory.md', editorId: 'text-viewer', extension: '.md' },
  ];
  WorkbenchSessionService.saveSession(projA.id, fileA2, tabsA);

  // 3. Save Session for Project B
  console.log('\n3. Saving Workbench Session for Project B...');
  const tabsB = [
    { id: fileB1, path: fileB1, title: 'project.json', editorId: 'text-viewer', extension: '.json' },
  ];
  WorkbenchSessionService.saveSession(projB.id, fileB1, tabsB);

  // 4. Verify Project-Aware Session Isolation
  console.log('\n4. Verifying Project-Aware Session Isolation...');
  const sessionA = WorkbenchSessionService.getSession(projA.id);
  const sessionB = WorkbenchSessionService.getSession(projB.id);

  console.log('   Project A Restored Active Tab:', sessionA.activeTabPath);
  console.log('   Project A Restored Tabs:', sessionA.tabs.map((t) => t.title));
  console.log('   Project B Restored Active Tab:', sessionB.activeTabPath);
  console.log('   Project B Restored Tabs:', sessionB.tabs.map((t) => t.title));

  if (sessionA.tabs.length !== 2) throw new Error('Project A tabs count mismatch');
  if (sessionA.activeTabPath !== fileA2) throw new Error('Project A active tab mismatch');
  if (sessionB.tabs.length !== 1) throw new Error('Project B tabs count mismatch');
  if (sessionB.activeTabPath !== fileB1) throw new Error('Project B active tab mismatch');

  // 5. Test File Validation (Deleted file handling)
  console.log('\n5. Testing File Validation (Deleting fileA2 from disk)...');
  fs.unlinkSync(fileA2); // Delete fileA2

  const sessionAAfterDelete = WorkbenchSessionService.getSession(projA.id);
  console.log('   Project A Valid Tabs after deletion:', sessionAAfterDelete.tabs.map((t) => t.title));
  console.log('   Project A Fallback Active Tab:', sessionAAfterDelete.activeTabPath);

  if (sessionAAfterDelete.tabs.length !== 1) throw new Error('Deleted file was not skipped');
  if (sessionAAfterDelete.activeTabPath !== fileA1) throw new Error('Active tab did not fall back to remaining valid tab');

  console.log('\n==================================================');
  console.log('  SPRINT 5.3 VERIFICATION METRICS');
  console.log('==================================================');
  console.log(`- Project A Restored Open Tabs: 2 (1 after deletion test)`);
  console.log(`- Project B Restored Open Tabs: 1`);
  console.log(`- File Validation: Deleted files skipped silently without errors`);
  console.log(`- Active Tab Fallback: Validated`);
  console.log(`- Session Isolation: Verified per project in SQLite tables`);
  console.log('==================================================\n');
  console.log('SUCCESS: All Sprint 5.3 Workbench Session requirements passed cleanly!');
}

verifySprint53().catch((err) => {
  console.error('Sprint 5.3 Verification Failed:', err);
  process.exit(1);
});
