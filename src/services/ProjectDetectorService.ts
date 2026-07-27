import fs from 'fs';
import path from 'path';

export interface ProjectRunConfig {
  projectType: string; // 'nextjs' | 'vite' | 'react' | 'nodejs' | 'flutter' | 'rust' | 'python' | 'go' | 'custom';
  displayName: string;
  runCommand: string;
  buildCommand: string;
  testCommand: string;
  isCustomized?: boolean;
}

export class ProjectDetectorService {
  private static instance: ProjectDetectorService | null = null;

  private constructor() {}

  public static getInstance(): ProjectDetectorService {
    if (!ProjectDetectorService.instance) {
      ProjectDetectorService.instance = new ProjectDetectorService();
    }
    return ProjectDetectorService.instance;
  }

  // Detect project type and suggested run commands from project directory
  public async detectProjectConfig(projectPath: string): Promise<ProjectRunConfig> {
    const configPath = path.join(projectPath, '.crafted', 'project.json');

    // 1. Check if user already has custom persisted run config in .crafted/project.json
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.runConfig) {
          return parsed.runConfig as ProjectRunConfig;
        }
      } catch {
        /* proceed to auto-detect if invalid JSON */
      }
    }

    // 2. Auto-detect project defaults
    let config: ProjectRunConfig = {
      projectType: 'custom',
      displayName: 'Project',
      runCommand: 'npm start',
      buildCommand: 'npm run build',
      testCommand: 'npm test',
    };

    const pkgPath = path.join(projectPath, 'package.json');
    const pubspecPath = path.join(projectPath, 'pubspec.yaml');
    const cargoPath = path.join(projectPath, 'Cargo.toml');
    const goModPath = path.join(projectPath, 'go.mod');
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    const reqPath = path.join(projectPath, 'requirements.txt');
    const mainPyPath = path.join(projectPath, 'main.py');

    if (fs.existsSync(pkgPath)) {
      try {
        const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(pkgRaw);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        const scripts = pkg.scripts || {};

        const hasScript = (name: string) => !!scripts[name];
        const runCmd = hasScript('dev') ? 'npm run dev' : hasScript('start') ? 'npm start' : 'npm run dev';
        const buildCmd = hasScript('build') ? 'npm run build' : 'npm run build';
        const testCmd = hasScript('test') ? 'npm test' : 'npm test';

        if (deps.next) {
          config = { projectType: 'nextjs', displayName: 'Next.js', runCommand: runCmd, buildCommand: buildCmd, testCommand: testCmd };
        } else if (deps.vite) {
          config = { projectType: 'vite', displayName: 'Vite', runCommand: runCmd, buildCommand: buildCmd, testCommand: testCmd };
        } else if (deps.react) {
          config = { projectType: 'react', displayName: 'React', runCommand: runCmd, buildCommand: buildCmd, testCommand: testCmd };
        } else {
          config = { projectType: 'nodejs', displayName: 'Node.js', runCommand: runCmd, buildCommand: buildCmd, testCommand: testCmd };
        }
      } catch {
        config = { projectType: 'nodejs', displayName: 'Node.js', runCommand: 'npm run dev', buildCommand: 'npm run build', testCommand: 'npm test' };
      }
    } else if (fs.existsSync(pubspecPath)) {
      config = { projectType: 'flutter', displayName: 'Flutter', runCommand: 'flutter run', buildCommand: 'flutter build apk', testCommand: 'flutter test' };
    } else if (fs.existsSync(cargoPath)) {
      config = { projectType: 'rust', displayName: 'Rust', runCommand: 'cargo run', buildCommand: 'cargo build', testCommand: 'cargo test' };
    } else if (fs.existsSync(goModPath)) {
      config = { projectType: 'go', displayName: 'Go', runCommand: 'go run .', buildCommand: 'go build', testCommand: 'go test ./...' };
    } else if (fs.existsSync(pyprojectPath) || fs.existsSync(reqPath) || fs.existsSync(mainPyPath)) {
      config = { projectType: 'python', displayName: 'Python', runCommand: 'python main.py', buildCommand: 'python -m compileall .', testCommand: 'pytest' };
    }

    // 3. Persist detected config into .crafted/project.json for user editing & reusability
    await this.saveProjectConfig(projectPath, config);
    return config;
  }

  // Save / update project run config in .crafted/project.json
  public async saveProjectConfig(projectPath: string, config: ProjectRunConfig): Promise<boolean> {
    try {
      const dir = path.join(projectPath, '.crafted');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const configPath = path.join(dir, 'project.json');
      let existingData: Record<string, unknown> = {};

      if (fs.existsSync(configPath)) {
        try {
          existingData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch {
          existingData = {};
        }
      }

      existingData.runConfig = config;
      existingData.updatedAt = new Date().toISOString();

      fs.writeFileSync(configPath, JSON.stringify(existingData, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[ProjectDetectorService] Error saving .crafted/project.json:', err);
      return false;
    }
  }
}
