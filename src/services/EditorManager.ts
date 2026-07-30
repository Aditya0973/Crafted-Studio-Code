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
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
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
      snippetSuggestions: 'inline',
      find: {
        addExtraSpaceOnTop: false,
        autoFindInSelection: 'never',
        seedSearchStringFromSelection: 'always',
      },
    });

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

  public layout(dimension?: { width: number; height: number }): void {
    if (this.editor) {
      if (dimension) {
        this.editor.layout(dimension);
      } else {
        this.editor.layout();
      }
    }
  }

  // Activate or create a model for filePath on single persistent editor instance
  public activateModel(
    filePath: string,
    initialContent: string,
    onContentChange?: (newVal: string) => void,
    savedViewState?: unknown
  ): monaco.editor.ITextModel | null {
    const normalizedPath = filePath.replace(/\\/g, '/');

    if (!this.editor && this.container) {
      this.mountEditor(this.container);
    }

    if (!this.editor) return null;

    this.showEditor();

    // 1. Get or create target Monaco model
    let model = this.models.get(normalizedPath);

    if (!model) {
      const uri = monaco.Uri.file(normalizedPath);
      const language = this.detectLanguage(normalizedPath);

      const existingUriModel = monaco.editor.getModel(uri);
      if (existingUriModel && !existingUriModel.isDisposed()) {
        model = existingUriModel;
        if (initialContent !== undefined && (model.getValue() === '' || model.getValue() !== initialContent)) {
          model.setValue(initialContent);
        }
      } else {
        if (existingUriModel && existingUriModel.isDisposed()) {
          try { existingUriModel.dispose(); } catch {}
        }
        model = monaco.editor.createModel(initialContent || '', language, uri);
      }

      this.models.set(normalizedPath, model);

      if (onContentChange) {
        const listener = model.onDidChangeContent(() => {
          if (model) {
            onContentChange(model.getValue());
          }
        });
        this.modelListeners.set(normalizedPath, listener);
      }
    } else {
      const currentVal = model.getValue();
      if (currentVal !== initialContent) {
        if (currentVal === '' && initialContent !== '') {
          model.setValue(initialContent);
        }
      }
    }

    // 2. Attach target model to persistent editor instance
    const currentAttachedModel = this.editor.getModel();
    const isModelSwitching = currentAttachedModel !== model;

    this.editor.setModel(model);
    this.currentFilePath = normalizedPath;

    // 3. Restore ViewState on model switch
    if (isModelSwitching) {
      const vs = (savedViewState as monaco.editor.ICodeEditorViewState) || this.viewStates.get(normalizedPath);
      if (vs) {
        try {
          this.editor.restoreViewState(vs);
        } catch {
          /* Non-critical */
        }
      }
      this.editor.focus();
    }

    // Post-activation double-frame forced render sequence to recalculate viewport bounds
    const activeEditor = this.editor;
    requestAnimationFrame(() => {
      activeEditor.layout();
      requestAnimationFrame(() => {
        if (typeof (activeEditor as any).render === 'function') {
          (activeEditor as any).render(true);
        } else {
          activeEditor.layout();
        }
        activeEditor.focus();
      });
    });

    return model;
  }

  // Get active viewState for current file
  public getActiveViewState(): monaco.editor.ICodeEditorViewState | null {
    if (!this.editor) return null;
    return this.editor.saveViewState();
  }

  // Dispose ONLY the specified file model when tab closes
  public disposeModel(filePath: string): void {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const model = this.models.get(normalizedPath);

    if (model) {
      if (this.currentFilePath === normalizedPath && this.editor) {
        this.editor.setModel(null);
        this.currentFilePath = null;
      }

      const listener = this.modelListeners.get(normalizedPath);
      if (listener) {
        listener.dispose();
        this.modelListeners.delete(normalizedPath);
      }

      model.dispose();
      this.models.delete(normalizedPath);
      this.viewStates.delete(normalizedPath);
    }
  }

  // Check if model is dirty / has unsaved edits
  public isModelDirty(filePath: string, originalContent: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const model = this.models.get(normalizedPath);
    if (!model) return false;
    return model.getValue() !== originalContent;
  }

  // Fully dispose editor and all models when workspace closes or switches projects
  public disposeAll(): void {
    this.modelListeners.forEach((listener) => {
      try { listener.dispose(); } catch {}
    });
    this.modelListeners.clear();

    this.models.forEach((model) => {
      try {
        if (!model.isDisposed()) model.dispose();
      } catch {}
    });
    this.models.clear();
    this.viewStates.clear();

    try {
      monaco.editor.getModels().forEach((m) => {
        try {
          if (!m.isDisposed()) m.dispose();
        } catch {}
      });
    } catch {}

    if (this.editor) {
      this.editor.setModel(null);
      try {
        this.editor.dispose();
      } catch {}
      this.editor = null;
    }
    this.container = null;
    this.currentFilePath = null;
  }
}
