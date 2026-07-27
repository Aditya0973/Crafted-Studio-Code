import fs from 'fs';
import path from 'path';
import { FileContentResult } from '../shared/types';

export class FileService {
  public static async readFileText(filePath: string): Promise<FileContentResult> {
    const normalizedPath = path.resolve(path.normalize(filePath));

    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`File does not exist: ${normalizedPath}`);
    }

    const stat = fs.statSync(normalizedPath);
    if (stat.isDirectory()) {
      throw new Error(`Path is a directory, not a file: ${normalizedPath}`);
    }

    // Limit single read size to 10MB
    if (stat.size > 10 * 1024 * 1024) {
      throw new Error('File exceeds maximum readable size limit of 10MB');
    }

    const content = fs.readFileSync(normalizedPath, 'utf-8');
    return {
      path: normalizedPath,
      content,
      sizeBytes: stat.size,
      isBinary: false,
    };
  }

  public static async writeFileText(filePath: string, content: string): Promise<boolean> {
    const normalizedPath = path.resolve(path.normalize(filePath));
    const dir = path.dirname(normalizedPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file atomically
    fs.writeFileSync(normalizedPath, content, 'utf-8');
    return true;
  }

  public static async getFileStats(filePath: string): Promise<{ sizeBytes: number; updatedAt: string } | null> {
    const normalizedPath = path.resolve(path.normalize(filePath));
    if (!fs.existsSync(normalizedPath)) return null;

    try {
      const stat = fs.statSync(normalizedPath);
      return {
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  public static async readFileDataUrl(filePath: string): Promise<string> {
    const normalizedPath = path.resolve(path.normalize(filePath));

    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`File does not exist: ${normalizedPath}`);
    }

    const stat = fs.statSync(normalizedPath);
    if (stat.isDirectory()) {
      throw new Error(`Path is a directory: ${normalizedPath}`);
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.svg') mimeType = 'image/svg+xml';
    else if (ext === '.ico') mimeType = 'image/x-icon';

    const buffer = fs.readFileSync(normalizedPath);
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}
