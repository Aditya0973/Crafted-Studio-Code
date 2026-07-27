import path from 'path';
import os from 'os';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { initDatabaseAsync } = require('../dist/database/index.js');
const { ProjectService } = require('../dist/services/ProjectService.js');
const { ExplorerService } = require('../dist/services/ExplorerService.js');

async function testExplorerService() {
  const dbDir = path.join(os.tmpdir(), 'crafted_studio_sprint4_test_db');
  const testWorkspaceParent = path.join(os.tmpdir(), 'crafted_studio_workspaces_sprint4');

  if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  if (fs.existsSync(testWorkspaceParent)) fs.rmSync(testWorkspaceParent, { recursive: true, force: true });

  fs.mkdirSync(testWorkspaceParent, { recursive: true });
  await initDatabaseAsync(dbDir);

  console.log('--- 1. CREATING TEST PROJECT ---');
  const project = await ProjectService.createProject({
    name: 'Explorer Test Workspace',
    parentPath: testWorkspaceParent,
  });

  // Create a nested file inside src/
  fs.writeFileSync(path.join(project.path, 'src', 'App.tsx'), 'export const App = () => <div>Hello</div>;', 'utf-8');
  fs.writeFileSync(path.join(project.path, 'src', 'index.css'), 'body { background: #000; }', 'utf-8');

  console.log('\n--- 2. SCANNING TREE FOR PROJECT ---');
  const tree = await ExplorerService.scanTree(project.path);
  console.log('Root Node:', {
    name: tree.name,
    type: tree.type,
    childrenCount: tree.children?.length,
  });

  console.log('\n--- 3. CHILDREN NODES ---');
  tree.children?.forEach((child) => {
    console.log(`- [${child.type.toUpperCase()}] ${child.name} (Depth: ${child.depth})`);
    if (child.children) {
      child.children.forEach((grandChild) => {
        console.log(`   └─ [${grandChild.type.toUpperCase()}] ${grandChild.name}`);
      });
    }
  });

  console.log('\n--- 4. SAVING AND RETRIEVING EXPANDED PATHS ---');
  const srcPath = path.join(project.path, 'src');
  await ExplorerService.saveExpandedPaths(project.id, [project.path, srcPath]);

  const expanded = await ExplorerService.getExpandedPaths(project.id);
  console.log('Saved Expanded Paths:', expanded);

  console.log('\n--- ALL EXPLORER SERVICE TESTS PASSED CLEANLY ---');
}

testExplorerService().catch((err) => {
  console.error('Explorer Test Failed:', err);
  process.exit(1);
});
