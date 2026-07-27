/// <reference types="vite/client" />

declare module '*?worker' {
  const workerConstructor: { new (): Worker };
  export default workerConstructor;
}

declare module 'monaco-editor/esm/vs/editor/editor.worker.js?worker' {
  const workerConstructor: { new (): Worker };
  export default workerConstructor;
}

declare module 'monaco-editor/esm/vs/language/json/json.worker.js?worker' {
  const workerConstructor: { new (): Worker };
  export default workerConstructor;
}

declare module 'monaco-editor/esm/vs/language/css/css.worker.js?worker' {
  const workerConstructor: { new (): Worker };
  export default workerConstructor;
}

declare module 'monaco-editor/esm/vs/language/html/html.worker.js?worker' {
  const workerConstructor: { new (): Worker };
  export default workerConstructor;
}

declare module 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker' {
  const workerConstructor: { new (): Worker };
  export default workerConstructor;
}
