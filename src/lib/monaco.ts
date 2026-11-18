import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/languages/features/json/json.worker?worker';
import TsWorker from 'monaco-editor/languages/features/typescript/ts.worker?worker';
import TEST_GLOBALS from '../runners/ts/test-globals.d.ts.txt?raw';
import type { TsConfigOptions } from './buildFiles';

(self as unknown as { MonacoEnvironment: monaco.Environment }).MonacoEnvironment = {
  getWorker(_id, label) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    return new EditorWorker();
  },
};

const ts = monaco.typescript;

const BASE_OPTIONS: monaco.typescript.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  lib: ['es2022', 'dom'],
  strict: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  skipLibCheck: true,
  allowNonTsExtensions: true,
  isolatedModules: false,
  noEmitOnError: false,
  sourceMap: false,
  jsx: ts.JsxEmit.React,
};

ts.typescriptDefaults.setEagerModelSync(true);
ts.typescriptDefaults.setCompilerOptions(BASE_OPTIONS);
ts.typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
ts.typescriptDefaults.addExtraLib(TEST_GLOBALS, 'file:///__rekru__/test-globals.d.ts');

let packagesLib: monaco.IDisposable | undefined;

export function configureTypeScript(opts: { tsconfig?: TsConfigOptions; packagesDts?: string }) {
  ts.typescriptDefaults.setCompilerOptions({ ...BASE_OPTIONS, ...(opts.tsconfig ?? {}) });
  packagesLib?.dispose();
  packagesLib = opts.packagesDts ? ts.typescriptDefaults.addExtraLib(opts.packagesDts, 'file:///__rekru__/packages.d.ts') : undefined;
}

monaco.editor.defineTheme('rekru-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#12141a',
    'editor.lineHighlightBackground': '#1a1d26',
    'editorGutter.background': '#12141a',
  },
});

export function languageForPath(path: string): string {
  const name = path.toLowerCase();
  if (name.endsWith('.java')) return 'java';
  if (/\.tsx?$/.test(name)) return 'typescript';
  if (name.endsWith('.kts')) return 'kotlin';
  if (name.endsWith('.gradle')) return 'java';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.xml')) return 'xml';
  if (name.endsWith('.md')) return 'markdown';
  if (/\.ya?ml$/.test(name)) return 'yaml';
  if (/\.(properties|env)$/.test(name)) return 'ini';
  return 'plaintext';
}

export function modelUri(path: string) {
  return monaco.Uri.parse(`file:///${path}`);
}

export { monaco };
