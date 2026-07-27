import { ProjectBlueprint, BlueprintCategory, StageItem } from './types';

const defaultActions = [
  { type: 'generate' as const, label: 'Generate' },
  { type: 'discuss' as const, label: 'Discuss' },
];

function attachActions(items: Omit<StageItem, 'actions'>[]): StageItem[] {
  return items.map((item) => ({
    ...item,
    actions: defaultActions,
  }));
}

export class BlueprintRegistry {
  private static blueprints: Map<string, ProjectBlueprint> = new Map();

  private static readonly BUILT_IN_BLUEPRINTS: ProjectBlueprint[] = [
    {
      id: 'blank',
      displayName: 'General Project',
      description: 'Standard software workspace with general guided development workflow.',
      icon: 'file-code',
      primaryLanguage: 'Any',
      framework: 'None',
      category: 'general',
      stages: [
        {
          id: 'planning',
          name: 'Planning',
          icon: 'target',
          items: attachActions([
            { id: 'gen_req', title: 'Requirements', description: 'Define core functional requirements' },
            { id: 'gen_feat', title: 'Features', description: 'List key features and scope' },
            { id: 'gen_arch', title: 'Architecture', description: 'Outline software components' },
          ]),
        },
        {
          id: 'documentation',
          name: 'Documentation',
          icon: 'file-text',
          items: attachActions([
            { id: 'gen_readme', title: 'README', description: 'Project overview and setup instructions' },
            { id: 'gen_memory', title: 'Memory', description: 'Initialize project memory.md' },
            { id: 'gen_dec', title: 'Decisions', description: 'Document architectural decision records' },
          ]),
        },
        {
          id: 'design',
          name: 'Design',
          icon: 'layout',
          items: attachActions([
            { id: 'gen_ui', title: 'UI Layout', description: 'Sketch screen layouts' },
            { id: 'gen_flow', title: 'User Flow', description: 'Define user navigation pathways' },
          ]),
        },
        {
          id: 'development',
          name: 'Development',
          icon: 'code',
          items: attachActions([
            { id: 'gen_impl', title: 'Implementation', description: 'Write core source code' },
            { id: 'gen_ai', title: 'AI Guided Coding', description: 'Leverage AI assistance for logic' },
          ]),
        },
        {
          id: 'testing',
          name: 'Testing',
          icon: 'check-circle-2',
          items: attachActions([
            { id: 'gen_qa', title: 'Manual QA', description: 'Execute end-to-end verification' },
          ]),
        },
        {
          id: 'deployment',
          name: 'Deployment',
          icon: 'rocket',
          items: attachActions([
            { id: 'gen_rel', title: 'Release Build', description: 'Package and release binary' },
          ]),
        },
      ],
    },
    {
      id: 'flutter',
      displayName: 'Flutter App',
      description: 'Cross-platform mobile and desktop applications built with Material Design 3 and Dart.',
      icon: 'smartphone',
      primaryLanguage: 'Dart',
      framework: 'Flutter',
      category: 'mobile',
      stages: [
        {
          id: 'planning',
          name: 'Planning',
          icon: 'target',
          items: attachActions([
            { id: 'flut_req', title: 'Requirements', description: 'Define mobile screen specs' },
            { id: 'flut_arch', title: 'Architecture', description: 'Layered Flutter architecture' },
            { id: 'flut_state', title: 'State Management', description: 'Choose Riverpod / BLoC pattern' },
          ]),
        },
        {
          id: 'design',
          name: 'Design',
          icon: 'layout',
          items: attachActions([
            { id: 'flut_ui', title: 'UI Design', description: 'Figma wireframes and theme colors' },
            { id: 'flut_m3', title: 'Material 3', description: 'Apply Material 3 color schemes' },
            { id: 'flut_resp', title: 'Responsive Layout', description: 'Adapt to mobile, tablet, desktop' },
          ]),
        },
        {
          id: 'development',
          name: 'Development',
          icon: 'code',
          items: attachActions([
            { id: 'flut_widge', title: 'Widgets', description: 'Build reusable UI widgets' },
            { id: 'flut_nav', title: 'Navigation', description: 'Setup go_router navigation' },
            { id: 'flut_st_impl', title: 'State Implementation', description: 'Connect Riverpod providers' },
          ]),
        },
        {
          id: 'testing',
          name: 'Testing',
          icon: 'check-circle-2',
          items: attachActions([
            { id: 'flut_t_android', title: 'Android QA', description: 'Test on Android emulator' },
            { id: 'flut_t_ios', title: 'iOS QA', description: 'Test on iOS simulator' },
            { id: 'flut_t_desk', title: 'Desktop QA', description: 'Verify desktop window sizing' },
          ]),
        },
        {
          id: 'deployment',
          name: 'Deployment',
          icon: 'rocket',
          items: attachActions([
            { id: 'flut_d_play', title: 'Google Play Store', description: 'Generate Android App Bundle (AAB)' },
            { id: 'flut_d_appstore', title: 'Apple App Store', description: 'Archive and submit via Xcode' },
          ]),
        },
      ],
    },
    {
      id: 'react',
      displayName: 'React App',
      description: 'Modern single-page web application powered by React and TypeScript.',
      icon: 'atom',
      primaryLanguage: 'TypeScript',
      framework: 'React',
      category: 'web',
      stages: [
        {
          id: 'planning',
          name: 'Planning',
          icon: 'target',
          items: attachActions([
            { id: 'react_req', title: 'Requirements', description: 'Single Page App specifications' },
            { id: 'react_arch', title: 'Component Architecture', description: 'Decompose UI into atomic components' },
          ]),
        },
        {
          id: 'design',
          name: 'Design',
          icon: 'layout',
          items: attachActions([
            { id: 'react_comp', title: 'UI Components', description: 'Design component library' },
            { id: 'react_style', title: 'Styling System', description: 'Configure Tailwind / CSS Modules' },
            { id: 'react_state_flow', title: 'State Flow', description: 'Define Context & Zustand stores' },
          ]),
        },
        {
          id: 'development',
          name: 'Development',
          icon: 'code',
          items: attachActions([
            { id: 'react_dev_comp', title: 'Components', description: 'Implement functional components' },
            { id: 'react_dev_hooks', title: 'Custom Hooks', description: 'Extract reusable data hooks' },
            { id: 'react_dev_route', title: 'Routing', description: 'Configure React Router routes' },
          ]),
        },
        {
          id: 'testing',
          name: 'Testing',
          icon: 'check-circle-2',
          items: attachActions([
            { id: 'react_unit', title: 'Unit Tests', description: 'Run Vitest component tests' },
            { id: 'react_integ', title: 'Integration Tests', description: 'Verify user interactions' },
          ]),
        },
        {
          id: 'deployment',
          name: 'Deployment',
          icon: 'rocket',
          items: attachActions([
            { id: 'react_deploy', title: 'Cloud Host', description: 'Deploy static bundle to Vercel / Netlify' },
          ]),
        },
      ],
    },
    {
      id: 'nextjs',
      displayName: 'Next.js App',
      description: 'Full-stack React framework with App Router, SSR, and API routes.',
      icon: 'layers',
      primaryLanguage: 'TypeScript',
      framework: 'Next.js',
      category: 'web',
      stages: [
        {
          id: 'planning',
          name: 'Planning',
          icon: 'target',
          items: attachActions([
            { id: 'next_req', title: 'Requirements', description: 'SEO & Server Rendering requirements' },
            { id: 'next_arch', title: 'App Router Architecture', description: 'Structure /app directory' },
          ]),
        },
        {
          id: 'design',
          name: 'Design',
          icon: 'layout',
          items: attachActions([
            { id: 'next_layouts', title: 'Layouts', description: 'Design nested layout hierarchy' },
            { id: 'next_rsc', title: 'Server Components', description: 'Identify RSC vs Client components' },
          ]),
        },
        {
          id: 'development',
          name: 'Development',
          icon: 'code',
          items: attachActions([
            { id: 'next_actions', title: 'Server Actions', description: 'Implement mutation actions' },
            { id: 'next_api', title: 'API Routes', description: 'Create Route Handlers' },
            { id: 'next_db', title: 'Database Integration', description: 'Connect Prisma / Drizzle ORM' },
          ]),
        },
        {
          id: 'testing',
          name: 'Testing',
          icon: 'check-circle-2',
          items: attachActions([
            { id: 'next_e2e', title: 'E2E Tests', description: 'Run Playwright / Cypress suite' },
            { id: 'next_api_test', title: 'API Tests', description: 'Verify route handler responses' },
          ]),
        },
        {
          id: 'deployment',
          name: 'Deployment',
          icon: 'rocket',
          items: attachActions([
            { id: 'next_vercel', title: 'Vercel Deployment', description: 'Deploy Edge functions & serverless routes' },
          ]),
        },
      ],
    },
    {
      id: 'electron',
      displayName: 'Electron App',
      description: 'Cross-platform desktop application built with Electron, Node.js, and web tech.',
      icon: 'laptop',
      primaryLanguage: 'TypeScript',
      framework: 'Electron',
      category: 'desktop',
      stages: [
        {
          id: 'planning',
          name: 'Planning',
          icon: 'target',
          items: attachActions([
            { id: 'elec_req', title: 'Requirements', description: 'Desktop window & system tray specs' },
            { id: 'elec_ipc', title: 'IPC Security Architecture', description: 'Design IPC channel contracts' },
          ]),
        },
        {
          id: 'design',
          name: 'Design',
          icon: 'layout',
          items: attachActions([
            { id: 'elec_shell', title: 'Desktop Shell UI', description: 'Design frameless window & titlebar' },
            { id: 'elec_tray', title: 'System Tray Menu', description: 'Design tray icons & quick actions' },
          ]),
        },
        {
          id: 'development',
          name: 'Development',
          icon: 'code',
          items: attachActions([
            { id: 'elec_main', title: 'Main Process', description: 'Implement main window lifecycle & SQLite' },
            { id: 'elec_rend', title: 'Renderer Process', description: 'Implement React UI components' },
            { id: 'elec_bridge', title: 'Preload Bridge', description: 'Expose safe contextBridge APIs' },
          ]),
        },
        {
          id: 'testing',
          name: 'Testing',
          icon: 'check-circle-2',
          items: attachActions([
            { id: 'elec_cross', title: 'Cross-Platform QA', description: 'Verify Windows, macOS, Linux builds' },
            { id: 'elec_pkg', title: 'Packaging Verification', description: 'Test electron-builder output' },
          ]),
        },
        {
          id: 'deployment',
          name: 'Deployment',
          icon: 'rocket',
          items: attachActions([
            { id: 'elec_dist', title: 'Installer Executables', description: 'Generate NSIS / DMG / AppImage' },
          ]),
        },
      ],
    },
    {
      id: 'node-api',
      displayName: 'Node API Service',
      description: 'Backend RESTful or GraphQL API server built with Node.js and TypeScript.',
      icon: 'server',
      primaryLanguage: 'TypeScript',
      framework: 'Node.js',
      category: 'backend',
      stages: [
        {
          id: 'planning',
          name: 'Planning',
          icon: 'target',
          items: attachActions([
            { id: 'node_ep', title: 'Endpoints', description: 'Design OpenAPI / Swagger endpoint spec' },
            { id: 'node_auth', title: 'Authentication', description: 'Choose JWT / OAuth security model' },
            { id: 'node_db_schema', title: 'Database Schema', description: 'Design relational ERD / migrations' },
          ]),
        },
        {
          id: 'development',
          name: 'Development',
          icon: 'code',
          items: attachActions([
            { id: 'node_ctrl', title: 'Controllers', description: 'Write HTTP route controllers' },
            { id: 'node_mid', title: 'Middleware', description: 'Implement auth & validation middleware' },
            { id: 'node_serv', title: 'Services', description: 'Implement business logic layer' },
          ]),
        },
        {
          id: 'testing',
          name: 'Testing',
          icon: 'check-circle-2',
          items: attachActions([
            { id: 'node_t_api', title: 'API Integration Tests', description: 'Run Supertest HTTP suite' },
            { id: 'node_t_perf', title: 'Performance Tests', description: 'Run load testing with Autocannon' },
          ]),
        },
        {
          id: 'deployment',
          name: 'Deployment',
          icon: 'rocket',
          items: attachActions([
            { id: 'node_docker', title: 'Docker / Cloud Host', description: 'Build OCI container & deploy to AWS/GCP' },
          ]),
        },
      ],
    },
  ];

  public static initialize(): void {
    if (this.blueprints.size > 0) return;
    for (const blueprint of this.BUILT_IN_BLUEPRINTS) {
      this.registerBlueprint(blueprint);
    }
  }

  public static registerBlueprint(blueprint: ProjectBlueprint): void {
    if (!blueprint || !blueprint.id) {
      throw new Error('Blueprint must have a valid id');
    }
    this.blueprints.set(blueprint.id, blueprint);
  }

  public static getBlueprint(id: string): ProjectBlueprint {
    this.initialize();
    const bp = this.blueprints.get(id);
    if (!bp) {
      return this.blueprints.get('blank')!;
    }
    return bp;
  }

  public static getAllBlueprints(): ProjectBlueprint[] {
    this.initialize();
    return Array.from(this.blueprints.values());
  }

  public static getBlueprintsByCategory(category: BlueprintCategory): ProjectBlueprint[] {
    this.initialize();
    return this.getAllBlueprints().filter((b) => b.category === category);
  }
}

// Auto-initialize on import
BlueprintRegistry.initialize();
