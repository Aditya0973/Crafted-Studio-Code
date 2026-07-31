import { monaco } from '../utils/monacoConfig';

export class EditorManager {
  private static instance: EditorManager | null = null;

  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private container: HTMLDivElement | null = null;
  private models: Map<string, monaco.editor.ITextModel> = new Map();
  private viewStates: Map<string, monaco.editor.ICodeEditorViewState> = new Map();
  private modelListeners: Map<string, monaco.IDisposable> = new Map();
  private currentFilePath: string | null = null;

  private constructor() {}

  public static getInstance(): EditorManager {
    if (!EditorManager.instance) {
      EditorManager.instance = new EditorManager();
    }
    return EditorManager.instance;
  }

  // Detect language from file extension
  public detectLanguage(filePath: string): string {
    const filename = filePath.split(/[/\\]/).pop()?.toLowerCase() || '';
    const parts = filename.split('.');
    const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : filename;

    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        return 'javascript';
      case 'json':
        return 'json';
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'scss':
        return 'scss';
      case 'less':
        return 'less';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'xml':
      case 'svg':
        return 'xml';
      case 'sql':
        return 'sql';
      case 'c':
        return 'c';
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'h':
      case 'hpp':
        return 'cpp';
      case 'java':
        return 'java';
      case 'kt':
      case 'kts':
        return 'kotlin';
      case 'dart':
        return 'dart';
      case 'py':
        return 'python';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'php':
        return 'php';
      case 'sh':
      case 'bash':
      case 'zsh':
        return 'shell';
      case 'env':
      case 'gitignore':
      case 'txt':
        return 'plaintext';
      default:
        if (filename.includes('.tsx') || filename.includes('.ts')) return 'typescript';
        if (filename.includes('.jsx') || filename.includes('.js')) return 'javascript';
        if (filename.includes('.json')) return 'json';
        if (filename.includes('.py')) return 'python';
        if (filename.includes('.html')) return 'html';
        if (filename.includes('.css')) return 'css';
        return 'plaintext';
    }
  }

  // Hide Monaco Editor DOM node completely when displaying non-code viewers (Images, PDFs)
  public hideEditor(): void {
    if (this.editor) {
      const domNode = this.editor.getDomNode();
      if (domNode) {
        domNode.style.display = 'none';
      }
      this.editor.setModel(null);
    }
    this.currentFilePath = null;
  }

  // Show Monaco Editor DOM node when switching to a code file
  public showEditor(): void {
    if (this.editor) {
      const domNode = this.editor.getDomNode();
      if (domNode) {
        domNode.style.display = 'block';
        this.layout();
      }
    }
  }

  // Create single persistent Monaco editor instance attached to container
  public mountEditor(container: HTMLDivElement, onSave?: () => void): monaco.editor.IStandaloneCodeEditor {
    this.container = container;

    if (this.editor) {
      const domNode = this.editor.getDomNode();
      if (domNode) {
        domNode.style.display = 'block';
        if (domNode.parentElement !== container) {
          container.appendChild(domNode);
        }
        this.layout();
      }
      return this.editor;
    }

    this.editor = monaco.editor.create(container, {
      theme: 'vs-dark',
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace font-mono",
      lineNumbers: 'on',
      wordWrap: 'on',
      automaticLayout: true,
      matchBrackets: 'always',
      folding: true,
      smoothScrolling: true,
      autoIndent: 'full',
      formatOnPaste: false,
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      padding: { top: 10, bottom: 10 },
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      parameterHints: { enabled: true },
      hover: { enabled: true, delay: 250 },
      bracketPairColorization: { enabled: true },
      snippetSuggestions: 'inline',
      find: {
        addExtraSpaceOnTop: false,
        autoFindInSelection: 'never',
        seedSearchStringFromSelection: 'always',
      },
    } as any);


    if (onSave) {
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave();
      });
    }

    return this.editor;
  }

  public getEditorInstance(): monaco.editor.IStandaloneCodeEditor | null {
    return this.editor;
  }

  public getActiveViewState(): monaco.editor.ICodeEditorViewState | null {
    return this.editor ? this.editor.saveViewState() : null;
  }

  public layout(dimension?: { width: number; height: number }): void {
    if (this.editor) {
      if (dimension) {
        this.editor.layout(dimension);
      } else if (this.container) {
        const rect = this.container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          this.editor.layout({ width: rect.width, height: rect.height });
        }
      }
    }
  }

  public activateModel(
    filePath: string,
    initialContent: string,
    onChange?: (content: string) => void,
    savedViewState?: unknown
  ): monaco.editor.ITextModel {
    if (!this.editor) {
      throw new Error('[EditorManager] Cannot activate model before editor is mounted.');
    }

    // Save viewState (cursor position, scroll) of current file before switching
    if (this.currentFilePath && this.currentFilePath !== filePath) {
      const vs = this.editor.saveViewState();
      if (vs) {
        this.viewStates.set(this.currentFilePath, vs);
      }
    }

    this.currentFilePath = filePath;
    const uri = monaco.Uri.file(filePath);
    let model = monaco.editor.getModel(uri);

    if (!model) {
      const language = this.detectLanguage(filePath);
      model = monaco.editor.createModel(initialContent, language, uri);
      this.models.set(filePath, model);
    } else {
      if (model.getValue() !== initialContent && initialContent.length > 0) {
        model.setValue(initialContent);
      }
    }

    // Listen to model content changes
    if (onChange && !this.modelListeners.has(filePath)) {
      const listener = model.onDidChangeContent(() => {
        if (model) {
          onChange(model.getValue());
        }
      });
      this.modelListeners.set(filePath, listener);
    }

    this.editor.setModel(model);

    // Restore viewState if available
    const vs = savedViewState || this.viewStates.get(filePath);
    if (vs) {
      this.editor.restoreViewState(vs as monaco.editor.ICodeEditorViewState);
    }

    this.editor.focus();
    return model;
  }

  public closeModel(filePath: string): void {
    const model = this.models.get(filePath);
    if (model) {
      const listener = this.modelListeners.get(filePath);
      if (listener) {
        listener.dispose();
        this.modelListeners.delete(filePath);
      }
      model.dispose();
      this.models.delete(filePath);
      this.viewStates.delete(filePath);
    }

    if (this.currentFilePath === filePath) {
      this.currentFilePath = null;
      if (this.editor) {
        this.editor.setModel(null);
      }
    }
  }

  public disposeModel(filePath: string): void {
    this.closeModel(filePath);
  }

  public disposeAll(): void {
    this.dispose();
  }

  public dispose(): void {
    this.modelListeners.forEach((listener) => listener.dispose());
    this.modelListeners.clear();
    this.models.forEach((model) => model.dispose());
    this.models.clear();
    this.viewStates.clear();
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
    this.container = null;
    this.currentFilePath = null;
    EditorManager.instance = null;
  }
}
