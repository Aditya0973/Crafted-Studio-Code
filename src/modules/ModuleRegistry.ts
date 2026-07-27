import { ProjectModule, ModuleCategory } from './types';

export class ModuleRegistry {
  private static modules: Map<string, ProjectModule> = new Map();

  private static readonly BUILT_IN_MODULES: ProjectModule[] = [
    {
      id: 'riverpod',
      displayName: 'Riverpod',
      description: 'Reactive state management framework for Dart and Flutter.',
      category: 'state-management',
      compatibleBlueprintIds: ['flutter'],
    },
    {
      id: 'isar',
      displayName: 'Isar DB',
      description: 'Ultra fast, cross-platform local database for Flutter applications.',
      category: 'database',
      compatibleBlueprintIds: ['flutter'],
    },
    {
      id: 'drift',
      displayName: 'Drift ORM',
      description: 'Reactive persistence library for Flutter and Dart written on top of SQLite.',
      category: 'database',
      compatibleBlueprintIds: ['flutter'],
    },
    {
      id: 'firebase',
      displayName: 'Firebase',
      description: 'Google Cloud backend infrastructure, Auth, Firestore, and Cloud Storage.',
      category: 'backend-services',
    },
    {
      id: 'supabase',
      displayName: 'Supabase',
      description: 'Open-source Firebase alternative with PostgreSQL, Auth, and Realtime subscriptions.',
      category: 'backend-services',
    },
    {
      id: 'revenuecat',
      displayName: 'RevenueCat',
      description: 'In-app purchase and subscription infrastructure for iOS, Android, and Web.',
      category: 'monetization',
    },
    {
      id: 'admob',
      displayName: 'Google AdMob',
      description: 'Mobile advertising platform to monetize apps with banner and interstitial ads.',
      category: 'monetization',
      compatibleBlueprintIds: ['flutter', 'react'],
    },
    {
      id: 'analytics',
      displayName: 'Analytics Engine',
      description: 'Telemetry and event tracking engine to analyze user behavior.',
      category: 'analytics',
    },
  ];

  public static initialize(): void {
    if (this.modules.size > 0) return;
    for (const mod of this.BUILT_IN_MODULES) {
      this.registerModule(mod);
    }
  }

  public static registerModule(mod: ProjectModule): void {
    if (!mod || !mod.id) {
      throw new Error('Module must have a valid id');
    }
    this.modules.set(mod.id, mod);
  }

  public static getModule(id: string): ProjectModule | undefined {
    this.initialize();
    return this.modules.get(id);
  }

  public static getAllModules(): ProjectModule[] {
    this.initialize();
    return Array.from(this.modules.values());
  }

  public static getModulesByCategory(category: ModuleCategory): ProjectModule[] {
    this.initialize();
    return this.getAllModules().filter((m) => m.category === category);
  }
}

// Auto-initialize on import
ModuleRegistry.initialize();
