export const PACKAGE = {
  name: "@pane-system/upstream",
  version: "0.2.0",
  capabilities: [
    "./layout",
    "./editor",
    "./tree",
    "./lifecycle",
    "./layout.css",
    "./editor.css",
    "./tree.css",
    ".",
  ],
} as const;
