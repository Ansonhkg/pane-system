export const PATHS = { state: ".scode/local/package-runs.json" } as const;

export const PACKAGE_RUN_PATH = ".scode/local/package-runs.json";

export const BUILD_PATHS = {
  logo: "apps/demo/assets/logo.svg",
  logoName: "logo.svg",
  layoutDemo: "apps/demo/src/app/entrypoints/layout-demo.ts",
  demo: "apps/demo/src/app/entrypoints/demo.ts",
  worker: "editor-worker.js",
} as const;

export const LANGUAGE_WORKER =
  "packages/language-services/src/platform/worker.ts";
export const ARTIFACT_PATHS = {
  packages: "packages",
  manifest: "package.json",
  license: "LICENSE",
  source: "src",
  output: "dist",
  native: "native",
  lib: "lib",
  types: "types",
  staging: "dist/packaging",
  archives: "dist/packages",
  declarations: "dist/types/packages",
  monaco: "monaco-editor",
  monacoDeclaration: "monaco.d.ts",
  monacoNotices: "ThirdPartyNotices.txt",
  editorTypes: "types/core/editor.d.ts",
  monacoTypes: "types/core/monaco.d.ts",
  upstream: "packages/upstream",
  buildConfig: "tsconfig.build.json",
} as const;
export const PROVENANCE_PATH = "vendor/provenance.json";

export const DECLARATION_EXTENSION = ".d.ts";

export const NATIVE_DROP_PATHS = {
  target: "src/vs/workbench/browser/parts/editor/editorDropTarget.ts",
  groups: "src/vs/workbench/services/editor/common/editorGroupsService.ts",
  tabs: "src/vs/workbench/browser/parts/editor/multiEditorTabsControl.ts",
  generated: "standalone-drop.ts",
} as const;
