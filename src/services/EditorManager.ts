import { monaco } from '../utils/monacoConfig';

export class EditorManager {
  private static instance: EditorManager | null = null;

  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
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
        this.editor.layout();
      }
    }
  }

  // Create single persistent Monaco editor instance attached to container
  public mountEditor(container: HTMLDivElement, onSave?: () => void): monaco.editor.IStandaloneCodeEditor {
    if (this.editor) {
      console.log(`[TAB_SWITCH_TRACE] 2. Reusing existing Monaco editor instance:`, {
        editorId: this.editor.getId(),
        modelUriBefore: this.editor.getModel()?.uri.toString() || 'NULL',
        layoutInfoBefore: this.editor.getLayoutInfo(),
        domNodeId: this.editor.getDomNode()?.id || 'NO_ID',
      });
      const domNode = this.editor.getDomNode();
      if (domNode) {
        domNode.style.display = 'block';
        if (domNode.parentElement !== container) {
          container.appendChild(domNode);
        }
        this.editor.layout();
      }
      return this.editor;
    }

    // Instrument requestAnimationFrame and MutationObserver for Monaco rendering pipeline
    if (typeof window !== 'undefined' && !(window as any).__monaco_raf_instrumented) {
      (window as any).__monaco_raf_instrumented = true;
      const origRaf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
        const id = origRaf((timestamp) => {
          console.log(`[RENDER_PIPELINE_TRACE] [${performance.now().toFixed(2)}ms] rAF executed (id: ${id})`);
          callback(timestamp);
        });
        console.log(`[RENDER_PIPELINE_TRACE] [${performance.now().toFixed(2)}ms] rAF scheduled (id: ${id})`);
        return id;
      };
    }

    console.log(`[TAB_SWITCH_TRACE] 2. Creating NEW Monaco editor instance`);
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

    // Attach MutationObserver to .view-lines container
    const domNode = this.editor.getDomNode();
    if (domNode) {
      const attachObserver = () => {
        const viewLines = domNode.querySelector('.view-lines');
        if (viewLines) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((m) => {
              const now = performance.now().toFixed(2);
              if (m.addedNodes.length > 0) {
                console.log(`[MUTATION_TRACE] [${now}ms] Added ${m.addedNodes.length} nodes to .view-lines:`, Array.from(m.addedNodes).map((n: any) => n.className || n.nodeName));
              }
              if (m.removedNodes.length > 0) {
                console.log(`[MUTATION_TRACE] [${now}ms] Removed ${m.removedNodes.length} nodes from .view-lines:`, Array.from(m.removedNodes).map((n: any) => n.className || n.nodeName));
              }
            });
          });
          observer.observe(viewLines, { childList: true, subtree: true });
          console.log(`[RENDER_PIPELINE_TRACE] MutationObserver attached to .view-lines`);
        } else {
          setTimeout(attachObserver, 50);
        }
      };
      attachObserver();
    }

    // Instrument Monaco event timeline
    this.editor.onDidChangeModel((e) => console.log('[EVENT_TRACE] 1. onDidChangeModel fired:', { oldModelUrl: e.oldModelUrl?.toString() || 'NULL', newModelUrl: e.newModelUrl?.toString() || 'NULL' }));
    this.editor.onDidLayoutChange((e) => console.log('[EVENT_TRACE] 2. onDidLayoutChange fired:', e));
    this.editor.onDidScrollChange((e) => console.log('[EVENT_TRACE] 3. onDidScrollChange fired:', e));
    this.editor.onDidContentSizeChange((e) => console.log('[EVENT_TRACE] 4. onDidContentSizeChange fired:', e));
    this.editor.onDidChangeModelContent((e) => console.log('[EVENT_TRACE] 5. onDidChangeModelContent fired:', e));
    this.editor.onDidChangeConfiguration(() => console.log('[EVENT_TRACE] 6. onDidChangeConfiguration fired'));

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
    const now = performance.now().toFixed(2);
    console.log(`[RENDER_PIPELINE_TRACE] [${now}ms] editor.layout() called:`, dimension || 'NO_ARGS');
    if (this.editor) {
      if (dimension) {
        this.editor.layout(dimension);
      } else {
        this.editor.layout();
      }
    }
  }

  // Activate or create a model for filePath without corrupting active typing or blanking editors
  public activateModel(
    filePath: string,
    initialContent: string,
    onContentChange?: (newVal: string) => void,
    savedViewState?: unknown
  ): monaco.editor.ITextModel | null {
    if (!this.editor) return null;

    const normalizedPath = filePath.replace(/\\/g, '/');
    const t0 = performance.now().toFixed(2);
    console.log(`[RENDER_PIPELINE_TRACE] [${t0}ms] ENTRY activateModel() for "${normalizedPath}"`);
    this.showEditor();

    // 1. Save ViewState of currently active model before switching
    if (this.currentFilePath && this.currentFilePath !== normalizedPath) {
      try {
        const currentVS = this.editor.saveViewState();
        if (currentVS) {
          this.viewStates.set(this.currentFilePath, currentVS);
        }
      } catch {
        /* Non-critical */
      }
    }

    // 2. Get or create target Monaco model
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

    // 3. Set active model on persistent editor instance
    const isModelSwitching = this.editor.getModel() !== model;
    const tSetModel = performance.now().toFixed(2);
    console.log(`[RENDER_PIPELINE_TRACE] [${tSetModel}ms] editor.setModel() called? ${isModelSwitching} (targetModelUri: ${model.uri.toString()})`);

    if (isModelSwitching) {
      this.editor.setModel(model);
    }

    this.currentFilePath = normalizedPath;

    // 4. Restore ViewState ONLY on model switch
    if (isModelSwitching) {
      const vs = (savedViewState as monaco.editor.ICodeEditorViewState) || this.viewStates.get(normalizedPath);
      if (vs) {
        try {
          const tVS = performance.now().toFixed(2);
          console.log(`[RENDER_PIPELINE_TRACE] [${tVS}ms] editor.restoreViewState() called`);
          this.editor.restoreViewState(vs);
        } catch {
          /* Non-critical */
        }
      }
      const tFocus = performance.now().toFixed(2);
      console.log(`[RENDER_PIPELINE_TRACE] [${tFocus}ms] editor.focus() called`);
      this.editor.focus();
    }

    const tExit = performance.now().toFixed(2);
    console.log(`[RENDER_PIPELINE_TRACE] [${tExit}ms] EXIT activateModel() for "${normalizedPath}"`);

    // Direct inspect of Monaco internal view rendering state
    try {
      const view: any = (this.editor as any)._getViewModel ? (this.editor as any)._getViewModel() : null;
      console.log(`[RENDER_PIPELINE_TRACE] Monaco Internal _getViewModel():`, {
        hasViewModel: !!view,
        linesCount: view ? view.getLineCount() : 'N/A',
        viewportLines: view && view.getApproximateTopForLineNumber ? view.getApproximateTopForLineNumber(1) : 'N/A',
      });
    } catch (err) {
      console.log(`[RENDER_PIPELINE_TRACE] Internal view inspect err:`, err);
    }

    this.logVisualState(`AFTER_ACTIVATE_MODEL:${normalizedPath}`);

    return model;
  }

  public logVisualState(caseLabel: string): void {
    if (!this.editor) {
      console.log(`[VISUAL_STATE_TRACE] ${caseLabel}: NO_EDITOR_INSTANCE`);
      return;
    }
    const model = this.editor.getModel();
    const domNode = this.editor.getDomNode();

    // DOM Elements
    const overflowGuard = domNode ? (domNode.querySelector('.overflow-guard') as HTMLElement | null) : null;
    const viewLines = domNode ? (domNode.querySelector('.view-lines') as HTMLElement | null) : null;
    const viewLineElems = domNode ? domNode.querySelectorAll('.view-line') : [];
    const mtkSpans = domNode ? domNode.querySelectorAll('[class*="mtk"]') : [];

    const getComputed = (el: HTMLElement | null) => {
      if (!el || typeof window === 'undefined') return null;
      const s = window.getComputedStyle(el);
      return {
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        transform: s.transform,
      };
    };

    console.log(`[VISUAL_STATE_TRACE] ${caseLabel}:`, {
      editorState: {
        layoutInfo: this.editor.getLayoutInfo(),
        visibleRanges: this.editor.getVisibleRanges(),
        selections: this.editor.getSelections(),
        position: this.editor.getPosition(),
        scrollTop: this.editor.getScrollTop(),
        scrollLeft: this.editor.getScrollLeft(),
        scrollHeight: this.editor.getScrollHeight(),
        contentHeight: this.editor.getContentHeight(),
        topForLine1: this.editor.getTopForLineNumber(1),
        hasTextFocus: this.editor.hasTextFocus(),
      },
      modelState: model
        ? {
            uri: model.uri.toString(),
            getValueLength: model.getValueLength(),
            getLineCount: model.getLineCount(),
            isDisposed: model.isDisposed(),
          }
        : null,
      domState: {
        viewLineCount: viewLineElems.length,
        hasRenderedMtkSpans: mtkSpans.length > 0,
        mtkSpanCount: mtkSpans.length,
        monacoEditorStyle: domNode ? { width: domNode.style.width, height: domNode.style.height } : null,
        overflowGuardStyle: overflowGuard ? { width: overflowGuard.style.width, height: overflowGuard.style.height } : null,
        monacoComputed: getComputed(domNode),
        overflowGuardComputed: getComputed(overflowGuard),
        viewLinesComputed: getComputed(viewLines),
      },
    });
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
    }
    this.currentFilePath = null;
  }
}
