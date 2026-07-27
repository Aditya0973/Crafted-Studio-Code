import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = util.promisify(exec);

export interface GitPushInput {
  projectPath: string;
  repoUrl?: string;
  commitMessage?: string;
}

export interface GitInfo {
  hasGit: boolean;
  remoteUrl: string | null;
  currentBranch: string;
  commitCount: number;
}

export class GitService {
  private static instance: GitService | null = null;

  private constructor() {}

  public static getInstance(): GitService {
    if (!GitService.instance) {
      GitService.instance = new GitService();
    }
    return GitService.instance;
  }

  // Get Git info for project
  public async getGitInfo(projectPath: string): Promise<GitInfo> {
    const gitDir = path.join(projectPath, '.git');
    if (!fs.existsSync(gitDir)) {
      return { hasGit: false, remoteUrl: null, currentBranch: 'main', commitCount: 0 };
    }

    let remoteUrl: string | null = null;
    let currentBranch = 'main';
    let commitCount = 0;

    try {
      const { stdout: remoteOut } = await execAsync('git remote get-url origin', { cwd: projectPath });
      remoteUrl = remoteOut.trim() || null;
    } catch {
      remoteUrl = null;
    }

    try {
      const { stdout: branchOut } = await execAsync('git branch --show-current', { cwd: projectPath });
      currentBranch = branchOut.trim() || 'main';
    } catch {
      currentBranch = 'main';
    }

    try {
      const { stdout: countOut } = await execAsync('git rev-list --count HEAD', { cwd: projectPath });
      commitCount = parseInt(countOut.trim(), 10) || 0;
    } catch {
      commitCount = 0;
    }

    return { hasGit: true, remoteUrl, currentBranch, commitCount };
  }

  // Set remote URL
  public async setRemoteUrl(projectPath: string, repoUrl: string): Promise<boolean> {
    try {
      const gitDir = path.join(projectPath, '.git');
      if (!fs.existsSync(gitDir)) {
        await execAsync('git init', { cwd: projectPath });
      }

      try {
        await execAsync(`git remote add origin "${repoUrl}"`, { cwd: projectPath });
      } catch {
        await execAsync(`git remote set-url origin "${repoUrl}"`, { cwd: projectPath });
      }
      return true;
    } catch (err) {
      console.error('[GitService] Error setting remote URL:', err);
      return false;
    }
  }

  // Generate next automatic commit message if message is blank
  public async getNextCommitMessage(projectPath: string, userMsg?: string): Promise<string> {
    if (userMsg && userMsg.trim()) {
      return userMsg.trim();
    }

    const { commitCount } = await this.getGitInfo(projectPath);
    return `Update #${commitCount + 1}`;
  }
}
