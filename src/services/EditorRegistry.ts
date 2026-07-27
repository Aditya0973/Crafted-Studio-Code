import { EditorDefinition, EditorType } from '../shared/types';

export class EditorRegistry {
  private static editors: Map<EditorType, EditorDefinition> = new Map();

  public static initializeDefaults(): void {
    if (this.editors.size > 0) return;

    this.registerEditor({
      id: 'text-viewer',
      name: 'Default Text Viewer',
      extensions: [
        '.txt',
        '.md',
        '.json',
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.css',
        '.html',
        '.yaml',
        '.yml',
        '.xml',
        '.env',
        '.log',
        '.gitignore',
        '.config',
        '.mjs',
        '.cjs',
        '.py',
        '.go',
        '.rs',
        '.java',
        '.c',
        '.cpp',
        '.h',
      ],
    });

    this.registerEditor({
      id: 'image-viewer',
      name: 'Image Viewer',
      extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico'],
    });
  }

  public static registerEditor(definition: EditorDefinition): void {
    this.editors.set(definition.id, definition);
  }

  public static getEditorForFile(filePath: string): EditorType {
    this.initializeDefaults();

    if (!filePath) return 'unknown';

    const extIndex = filePath.lastIndexOf('.');
    const ext = extIndex !== -1 ? filePath.substring(extIndex).toLowerCase() : '';

    for (const [id, def] of this.editors.entries()) {
      if (def.extensions.includes(ext)) {
        return id;
      }
    }

    // Default fallback to text-viewer if no binary extension matched
    return 'text-viewer';
  }

  public static getAllEditors(): EditorDefinition[] {
    this.initializeDefaults();
    return Array.from(this.editors.values());
  }
}
