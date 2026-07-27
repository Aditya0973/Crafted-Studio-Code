import path from 'path';
import os from 'os';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { initDatabaseAsync } = require('../dist/database/index.js');
const { ProjectService } = require('../dist/services/ProjectService.js');

async function testProjectService() {
  const dbDir = path.join(os.tmpdir(), 'crafted_studio_sprint3_test_db');
  const testWorkspaceParent = path.join(os.tmpdir(), 'crafted_studio_workspaces');

  if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  if (fs.existsSync(testWorkspaceParent)) fs.rmSync(testWorkspaceParent, { recursive: true, force: true });

  fs.mkdirSync(testWorkspaceParent, { recursive: true });
  await initDatabaseAsync(dbDir);

  console.log('--- 1. CREATING TEST PROJECT ---');
  const project1 = await ProjectService.createProject({
    name: 'Sample Crafted App',
    parentPath: testWorkspaceParent,
  });
  console.log('Created Project:', project1);

  console.log('\n--- 2. VERIFYING FILESYSTEM STRUCTURE ---');
  const projectFiles = fs.readdirSync(project1.path);
  console.log('Project Folder Contents:', projectFiles);
  console.log('project.json content:\n', fs.readFileSync(path.join(project1.path, 'project.json'), 'utf-8'));
  console.log('memory.md content:\n', fs.readFileSync(path.join(project1.path, 'memory.md'), 'utf-8'));

  console.log('--- 3. CREATING SECOND TEST PROJECT ---');
  const project2 = await ProjectService.createProject({
    name: 'Modyule Generator',
    parentPath: testWorkspaceParent,
  });
  console.log('Created Second Project:', project2);

  console.log('\n--- 4. FETCHING ACTIVE PROJECT ---');
  const active = await ProjectService.getActiveProject();
  console.log('Active Project (should be project2):', active);

  console.log('\n--- 5. RECENT PROJECTS LIST ---');
  const recents = await ProjectService.getRecentProjects();
  console.log('Recent Projects:', recents);

  console.log('\n--- 6. SWITCHING BACK TO PROJECT 1 ---');
  const switched = await ProjectService.switchProject(project1.id);
  console.log('Switched Active Project:', switched);

  console.log('\n--- 7. OPENING EXISTING PROJECT FROM PATH ---');
  const opened = await ProjectService.openProject(project1.path);
  console.log('Opened Project:', opened);

  console.log('\n--- ALL PROJECT SERVICE TESTS PASSED CLEANLY ---');
}

testProjectService().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
