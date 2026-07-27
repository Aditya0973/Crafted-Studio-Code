import path from 'path';
import os from 'os';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { initDatabaseAsync } = require('../dist/database/index.js');
const { ProjectService } = require('../dist/services/ProjectService.js');
const { ChatService } = require('../dist/services/ChatService.js');

async function verifyChatSystem() {
  console.log('=== VERIFYING CHAT SYSTEM ARCHITECTURE & ISOLATION ===\n');

  const dbDir = path.join(os.tmpdir(), 'crafted_studio_chat_verify_db');
  const parentDir = path.join(os.tmpdir(), 'crafted_studio_chat_verify_workspaces');

  if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  if (fs.existsSync(parentDir)) fs.rmSync(parentDir, { recursive: true, force: true });

  fs.mkdirSync(parentDir, { recursive: true });
  await initDatabaseAsync(dbDir);

  // 1. Create Project A
  console.log('1. Creating Project A...');
  const projA = await ProjectService.createProject({
    name: 'Project Alpha',
    parentPath: parentDir,
  });

  // 2. Create Project B
  console.log('2. Creating Project B...');
  const projB = await ProjectService.createProject({
    name: 'Project Beta',
    parentPath: parentDir,
  });

  // 3. Verify Conversations in SQLite
  console.log('\n3. Verifying 1-to-1 Project Conversation Ownership...');
  const convA = await ChatService.getOrCreateConversation(projA.id);
  const convB = await ChatService.getOrCreateConversation(projB.id);

  console.log('   Project A Conv ID:', convA.id, 'Project ID:', convA.projectId);
  console.log('   Project B Conv ID:', convB.id, 'Project ID:', convB.projectId);

  if (convA.id === convB.id) throw new Error('Conversations are not isolated!');
  if (convA.projectId !== projA.id) throw new Error('Conv A not bound to Project A');
  if (convB.projectId !== projB.id) throw new Error('Conv B not bound to Project B');

  // 4. Send Messages to Project A
  console.log('\n4. Sending Messages to Project A...');
  const msgA1 = await ChatService.sendMessage({
    projectId: projA.id,
    role: 'user',
    content: 'Hello Project Alpha! Please optimize my React components.',
  });
  const msgA2 = await ChatService.sendMessage({
    projectId: projA.id,
    role: 'user',
    content: 'Add a new state variable for dark mode.',
  });

  // 5. Send Messages to Project B
  console.log('\n5. Sending Messages to Project B...');
  const msgB1 = await ChatService.sendMessage({
    projectId: projB.id,
    role: 'user',
    content: 'Hello Project Beta! Setup Flutter routes.',
  });

  // 6. Verify Isolation
  console.log('\n6. Verifying Message Isolation on Switching Projects...');
  const msgsA = await ChatService.getMessages(convA.id);
  const msgsB = await ChatService.getMessages(convB.id);

  console.log('   Project A Messages Count:', msgsA.length);
  console.log('   Project A Messages:', msgsA.map((m) => m.content));

  console.log('   Project B Messages Count:', msgsB.length);
  console.log('   Project B Messages:', msgsB.map((m) => m.content));

  if (msgsA.length !== 2) throw new Error(`Project A should have 2 messages, got ${msgsA.length}`);
  if (msgsB.length !== 1) throw new Error(`Project B should have 1 message, got ${msgsB.length}`);

  if (msgsA.some((m) => m.content.includes('Project Beta'))) {
    throw new Error('Project B message leaked into Project A!');
  }
  if (msgsB.some((m) => m.content.includes('Project Alpha'))) {
    throw new Error('Project A message leaked into Project B!');
  }

  // 7. Verify Clearing Conversation
  console.log('\n7. Testing Clear Conversation for Project A...');
  await ChatService.clearConversation(projA.id);
  const msgsACleared = await ChatService.getMessages(convA.id);
  const msgsBAfterAClear = await ChatService.getMessages(convB.id);

  console.log('   Project A Messages after clear:', msgsACleared.length);
  console.log('   Project B Messages after Project A clear:', msgsBAfterAClear.length);

  if (msgsACleared.length !== 0) throw new Error('Project A messages were not cleared');
  if (msgsBAfterAClear.length !== 1) throw new Error('Project B messages were affected by Project A clear');

  console.log('\n==================================================');
  console.log('  CHAT SYSTEM VERIFICATION METRICS');
  console.log('==================================================');
  console.log(`- Project A ID: ${projA.id}`);
  console.log(`- Project B ID: ${projB.id}`);
  console.log(`- Conversation A ID: ${convA.id}`);
  console.log(`- Conversation B ID: ${convB.id}`);
  console.log(`- Project A Initial Messages: 2`);
  console.log(`- Project B Initial Messages: 1`);
  console.log(`- Stale / Leaked Messages: 0`);
  console.log(`- Project A Messages after Clear: 0`);
  console.log(`- Project B Messages preserved: 1`);
  console.log('==================================================\n');
  console.log('SUCCESS: All Sprint 5 Chat System requirements passed cleanly!');
}

verifyChatSystem().catch((err) => {
  console.error('Chat Verification Failed:', err);
  process.exit(1);
});
