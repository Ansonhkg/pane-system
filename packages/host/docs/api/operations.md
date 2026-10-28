# Package API

## host.inspect

Empty object.

Package name, version, and public entry points.

CLI: `bun src/app/entrypoints/package.ts doctor --json`.

SDK: `inspectPackage(provider)`.

HTTP: `POST /operations` through `bun src/app/entrypoints/package.ts --serve`.

Supply a durable RunStore and explicit feature flags. Run control preserves the run ID.

## files.search

Search text in the selected folder with ripgrep, as VS Code does. Install `rg` on the host PATH.

Input: `{ "search": { "query": "text", "matchCase": false, "wholeWord": false, "regex": false, "include": "**/*.ts", "exclude": "**/vendor/**" } }`.

The query is limited to 4096 characters. Patterns use comma-separated ripgrep globs. Search respects ignore files and excludes `.git`, `node_modules`, `dist` and `.scode`. Symbolic links are not followed. Files larger than 4 MiB are excluded.

Output: `{ matches, fileCount, limitHit }`. Each match has a relative `path`, one-based `line`, UTF-16 `column` and `endColumn`, and `before`, `text`, `after` preview segments. File counts refer to files with matches. Results stop at 1000 matches or fail after 15 seconds.

CLI: `bun src/app/entrypoints/cli.ts files.search --root <folder> --input '{"search":{"query":"text"}}'`.

SDK: `searchFiles(provider, query)` from `@pane-system/host`, with `features.host` enabled and an `invoke` adapter connected to `createOperations`. The durable package run uses the same search operation. For a remote host, use `createHostClient({ base, token }).files.search({ query: "text" })` from `@pane-system/host/client`.

HTTP: `POST /api/operations` with `{ id: "files.search", input: { search: { query: "text" } }, root, key }`. Use the host session token. The selected folder determines the search scope.

Read-only. Retries repeat the search against current files. A stable request key retrieves the saved run. Run status and pause/resume/stop controls use the existing host ledger. A completed search is atomic; control requests do not undo a result. The browser discards results from a previous query after the query changes.

Errors: invalid query or regex, missing ripgrep, timeout, file access failure, invalid session token or changed workspace.
