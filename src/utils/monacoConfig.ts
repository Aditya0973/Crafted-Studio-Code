import * as monaco from 'monaco-editor';

// Configure MonacoEnvironment worker factory using Vite relative node_modules URL constructor
if (typeof window !== 'undefined') {
  try {
    (window as any).MonacoEnvironment = {
      getWorker(_: unknown, label: string) {
        if (label === 'json') {
          return new Worker(
            new URL('../../node_modules/monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
            { type: 'module' }
          );
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return new Worker(
            new URL('../../node_modules/monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
            { type: 'module' }
          );
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return new Worker(
            new URL('../../node_modules/monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
            { type: 'module' }
          );
        }
        if (label === 'typescript' || label === 'javascript') {
          return new Worker(
            new URL('../../node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
            { type: 'module' }
          );
        }
        return new Worker(
          new URL('../../node_modules/monaco-editor/esm/vs/editor/editor.worker.js', import.meta.url),
          { type: 'module' }
        );
      },
    };

    // Safely configure TypeScript & JavaScript Language Defaults (Compiler & Diagnostics Options)
    if (monaco && monaco.languages) {
      const languagesAny = monaco.languages as any;

      if (languagesAny && languagesAny.typescript) {
        const tsOptions = {
          jsx: 2, // React JSX
          target: 99, // ESNext/ES2022
          module: 99,
          moduleResolution: 2, // NodeJs
          allowNonTsExtensions: true,
          allowJs: true,
          checkJs: true,
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          experimentalDecorators: true,
        };

        if (languagesAny.typescript.typescriptDefaults) {
          languagesAny.typescript.typescriptDefaults.setCompilerOptions(tsOptions);
          languagesAny.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
            noSuggestionDiagnostics: false,
          });
        }

        if (languagesAny.typescript.javascriptDefaults) {
          languagesAny.typescript.javascriptDefaults.setCompilerOptions(tsOptions);
          languagesAny.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
            noSuggestionDiagnostics: false,
          });
        }
      }

      // Configure JSON Schema & Validation Options
      if (languagesAny && languagesAny.json && languagesAny.json.jsonDefaults) {
        languagesAny.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          allowComments: true,
          trailingCommas: 'ignore',
        });
      }

      // Configure HTML & CSS Language Options
      if (languagesAny && languagesAny.html && languagesAny.html.htmlDefaults) {
        languagesAny.html.htmlDefaults.setOptions({
          format: {
            wrapAttributes: 'auto',
          },
          suggest: {
            html5: true,
          },
        });
      }

      if (languagesAny && languagesAny.css && languagesAny.css.cssDefaults) {
        languagesAny.css.cssDefaults.setOptions({
          validate: true,
          lint: {
            compatibleVendorPrefixes: 'ignore',
          },
        });
      }
    }
  } catch (err) {
    console.warn('[monacoConfig] Safe initialization exception caught:', err);
  }
}

export { monaco };
