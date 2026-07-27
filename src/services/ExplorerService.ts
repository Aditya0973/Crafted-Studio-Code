import fs from 'fs';
import path from 'path';
import { TreeNode, ExplorerScanOptions, TreeNodeMetadata } from '../shared/types';
import { getDatabase } from '../database';
import { SettingsService } from './SettingsService';

const DEFAULT_IGNORED = new Set(['node_modules', '.git', 'dist', '.DS_Store', 'Thumbs.db', 'coverage']);

export class ExplorerService {
  public static async scanTree(projectPath: string, options?: ExplorerScanOptions): Promise<TreeNode | null> {
    if (!projectPath || !fs.existsSync(projectPath)) {
      return null;
    }

    const normalizedPath = path.resolve(path.normalize(projectPath));
    const stat = fs.statSync(normalizedPath);
    if (!stat.isDirectory()) {
      return null;
    }

    const rootName = path.basename(normalizedPath);
    return this.buildNode(normalizedPath, rootName, 0, null, options);
  }

  private static buildNode(
    fullPath: string,
    name: string,
    depth: number,
    parentId: string | null,
    options?: ExplorerScanOptions
  ): TreeNode {
    const stat = fs.statSync(fullPath);
    const isDir = stat.isDirectory();
    const extension = !isDir ? path.extname(name).toLowerCase() : undefined;

    // Extensible Metadata Attachment
    const metadata: TreeNodeMetadata = {
      sizeBytes: isDir ? undefined : stat.size,
      updatedAt: stat.mtime.toISOString(),
      isMemoryFile: name.toLowerCase() === 'memory.md',
    };

    const normalizedFullPath = path.resolve(path.normalize(fullPath));

    const node: TreeNode = {
      id: normalizedFullPath,
      name,
      path: normalizedFullPath,
      type: isDir ? 'directory' : 'file',
      extension,
      depth,
      parentId,
      metadata,
    };

    if (isDir) {
      const maxDepth = options?.maxDepth ?? 10;
      if (depth < maxDepth) {
        try {
          const entries = fs.readdirSync(normalizedFullPath);
          const children: TreeNode[] = [];

          for (const entry of entries) {
            if (DEFAULT_IGNORED.has(entry)) continue;

            const childPath = path.join(normalizedFullPath, entry);
            try {
              const childNode = this.buildNode(childPath, entry, depth + 1, normalizedFullPath, options);
              children.push(childNode);
            } catch (err) {
              console.warn(`[ExplorerService] Skipping inaccessible path: ${childPath}`, err);
            }
          }

          // Sort: Directories first (A-Z), then Files (A-Z)
          children.sort((a, b) => {
            if (a.type === b.type) {
              return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            }
            return a.type === 'directory' ? -1 : 1;
          });

          node.children = children;
        } catch (err) {
          console.error(`[ExplorerService] Error reading directory ${normalizedFullPath}:`, err);
          node.children = [];
        }
      } else {
        node.children = [];
      }
    }

    return node;
  }

  public static async getExpandedPaths(projectId: string): Promise<string[]> {
    if (!projectId) return [];
    try {
      const db = getDatabase();
      const key = `explorer_expanded_${projectId}`;
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
      if (row && row.value) {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed)) {
          return parsed.map((p: string) => path.resolve(path.normalize(p)));
        }
      }
    } catch (err) {
      console.error('[ExplorerService] Error reading expanded paths:', err);
    }
    return [];
  }

  public static async saveExpandedPaths(projectId: string, expandedPaths: string[]): Promise<boolean> {
    if (!projectId) return false;
    try {
      const key = `explorer_expanded_${projectId}` as any;
      const normalizedPaths = expandedPaths.map((p) => path.resolve(path.normalize(p)));
      return SettingsService.setSetting(key, normalizedPaths);
    } catch (err) {
      console.error('[ExplorerService] Error saving expanded paths:', err);
      return false;
    }
  }
}
