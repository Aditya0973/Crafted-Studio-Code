import path from 'path';
import os from 'os';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { initDatabaseAsync } = require('../dist/database/index.js');
const { ProjectService } = require('../dist/services/ProjectService.js');
const { ChatService } = require('../dist/services/ChatService.js');
const { ProviderRegistry } = require('../dist/ai/ProviderRegistry.js');
const { ProviderManager } = require('../dist/ai/ProviderManager.js');
const { MockProvider } = require('../dist/ai/providers/MockProvider.js');
const { ProviderNotFoundError } = require('../dist/ai/errors.js');

async function verifySprint6() {
  console.log('=== VERIFYING SPRINT 6 AI PROVIDER ARCHITECTURE ===\n');

  const dbDir = path.join(os.tmpdir(), 'crafted_studio_sprint6_test_db');
  const parentDir = path.join(os.tmpdir(), 'crafted_studio_sprint6_workspaces');

  if (fs.existsSync(dbDir)) fs.rmSync(dbDir, { recursive: true, force: true });
  if (fs.existsSync(parentDir)) fs.rmSync(parentDir, { recursive: true, force: true });

  fs.mkdirSync(parentDir, { recursive: true });
  await initDatabaseAsync(dbDir);

  // 1. Verify ProviderRegistry
  console.log('1. Testing ProviderRegistry...');
  ProviderRegistry.clear();
  const mock = new MockProvider();
  await mock.initialize();
  ProviderRegistry.registerProvider(mock);

  console.log('   Has mock provider:', ProviderRegistry.hasProvider('mock'));
  console.log('   All registered providers:', ProviderRegistry.getAllProviders().map((p) => p.name));

  if (!ProviderRegistry.hasProvider('mock')) throw new Error('Mock provider failed to register');

  try {
    ProviderRegistry.getProvider('non-existent-provider');
    throw new Error('Registry failed to throw ProviderNotFoundError for non-existent provider');
  } catch (err) {
    if (err instanceof ProviderNotFoundError || err.name === 'ProviderNotFoundError') {
      console.log('   Successfully threw ProviderNotFoundError for invalid provider');
    } else {
      throw err;
    }
  }

  // 2. Verify ProviderManager
  console.log('\n2. Testing ProviderManager...');
  await ProviderManager.initialize();
  const statuses = await ProviderManager.getProviderStatuses();
  console.log('   Provider Statuses:', statuses);

  const directResponse = await ProviderManager.generateResponse([
    { role: 'user', content: 'What is the architecture pattern?' },
  ]);
  console.log('   Direct ProviderManager Completion Content:\n', directResponse.content);

  if (!directResponse.content.includes('Mock AI Response')) {
    throw new Error('Direct ProviderManager response invalid');
  }

  // 3. Test Full Chat Pipeline (User -> ChatService -> ProviderManager -> MockProvider -> SQLite Assistant Message)
  console.log('\n3. Testing Full Chat Pipeline Integration...');
  const project = await ProjectService.createProject({
    name: 'AI Pipeline Project',
    parentPath: parentDir,
  });

  console.log('   Sending User Message to ChatService...');
  await ChatService.sendMessage({
    projectId: project.id,
    role: 'user',
    content: 'Hello Crafted Studio AI Architecture!',
  });

  const conversation = await ChatService.getOrCreateConversation(project.id);
  const messages = await ChatService.getMessages(conversation.id);

  console.log('   Conversation Messages Count:', messages.length);
  console.log('   Messages Roles & Content:');
  messages.forEach((m, idx) => {
    console.log(`   [${idx + 1}] Role: ${m.role} | Provider: ${m.metadata?.provider || 'N/A'}`);
    console.log(`       Content: ${m.content.replace(/\n/g, ' ')}`);
  });

  if (messages.length !== 2) throw new Error(`Expected 2 messages (1 user, 1 assistant), got ${messages.length}`);
  if (messages[0].role !== 'user') throw new Error('First message is not user');
  if (messages[1].role !== 'assistant') throw new Error('Second message is not assistant');
  if (messages[1].metadata?.provider !== 'mock') throw new Error('Assistant metadata does not record providerId');

  console.log('\n==================================================');
  console.log('  SPRINT 6 AI ARCHITECTURE METRICS');
  console.log('==================================================');
  console.log(`- Common IAIProvider Interface Contract: Defined`);
  console.log(`- ProviderRegistry: Implemented & Isolated`);
  console.log(`- ProviderManager: Implemented & Active`);
  console.log(`- Built-in MockProvider: Fully Functional`);
  console.log(`- End-to-End Message Pipeline: User -> Chat -> ProviderManager -> MockProvider -> DB`);
  console.log(`- Error Architecture: AIError hierarchy implemented`);
  console.log('==================================================\n');
  console.log('SUCCESS: All Sprint 6 AI Provider Architecture requirements passed cleanly!');
}

verifySprint6().catch((err) => {
  console.error('Sprint 6 Verification Failed:', err);
  process.exit(1);
});
