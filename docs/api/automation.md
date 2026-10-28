# CLI, SDK and HTTP operation reference

This reference lists the implemented adapters, not every operation required by the scode rules.
Sources: [host operation IDs](../../packages/host/src/core/operation-ids.ts), [input contract and handler](../../packages/host/src/core/operations.ts), [CLI](../../packages/host/src/app/entrypoints/cli.ts), [client](../../packages/host/src/platform/transport/client.ts) and [server](../../packages/host/src/platform/server.ts).

## Host operations

Run the host CLI from the repository root:
The package does not declare a `bin` executable; use its Bun source entry point.

```sh
bun packages/host/src/app/entrypoints/cli.ts <operation> --root /path/to/project --input '<json>'
```

`--input` defaults to `{}`.
Paths are relative to the selected workspace.
The local CLI stores runs in `<root>/.scode/local/pane-host.sqlite`.
Only one process can own that ledger.
To use a running host, supply `--url http://127.0.0.1:4318` and set `PANE_HOST_TOKEN`.
The remote CLI connects to the host's selected workspace; `--root` does not change that selection.

| Operation                     | Input                                              | Result                                                 |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `host.inspect`                | `{}`                                               | Host name, runtime and workspace root                  |
| `host.doctor` or CLI `doctor` | `{}`                                               | Host service information and readiness flag            |
| `files.list`                  | `{ "path": "" }`                                   | Folder entries                                         |
| `files.read`                  | `{ "path": "src/main.ts" }`                        | File text                                              |
| `files.search`                | `{ "search": { "query": "text" } }`                | Matches, matched-file count and limit flag             |
| `files.write`                 | `{ "path": "notes.txt", "text": "Example" }`       | `{ "saved": true }`                                    |
| `files.directory`             | `{ "path": "notes" }`                              | Creation flag                                          |
| `files.rename`                | `{ "path": "old.txt", "destination": "new.txt" }`  | Rename flag                                            |
| `files.copy`                  | `{ "path": "old.txt", "destination": "copy.txt" }` | Copy flag                                              |
| `files.remove`                | `{ "path": "old.txt" }`                            | Removal flag                                           |
| `git.status`                  | `{}`                                               | Branch, changes and publish availability               |
| `git.diff`                    | `{ "path": "src/main.ts", "staged": false }`       | Original and modified text                             |
| `git.stage`                   | `{ "path": "src/main.ts" }`                        | Staged flag                                            |
| `git.unstage`                 | `{ "path": "src/main.ts" }`                        | Staged flag                                            |
| `git.discard`                 | `{ "path": "src/main.ts", "staged": false }`       | Discard flag                                           |
| `git.patch`                   | `{ "path": "src/main.ts", "staged": false }`       | Patch text                                             |
| `git.head`                    | `{ "path": "src/main.ts" }`                        | HEAD file text                                         |
| `git.stash`                   | `{ "paths": ["src/main.ts"] }`                     | Stash flag                                             |
| `git.commit`                  | `{ "message": "Describe the change" }`             | Commit identifier                                      |
| `git.publish`                 | `{}`                                               | Publish flag                                           |
| `measurements.record`         | `{ "report": {} }`                                 | Saved flag; requires a configured measurement callback |

The CLI requires `--yes` for `files.remove`, `git.discard` and `git.stash`.
Git operations require the corresponding Git repository state and permissions.
`host.doctor` returns configured service information; it does not probe every dependency or repair failures.
The direct local CLI does not configure measurement storage.
See [search contracts](../../packages/host/docs/api/operations.md#filessearch) for filters, limits and match coordinates.

## SDK

Import `createHostClient` from `@pane-system/host/client`.
Supply `{ base, token }` outside the browser; `base` defaults to `location.origin` in the browser.
Call `await client.doctor()` to establish the workspace scope.

| SDK surface                    | Behavior                                  |
| ------------------------------ | ----------------------------------------- |
| `client.files`                 | File provider methods, including `search` |
| `client.git`                   | Git provider methods                      |
| `client.terminal`              | Terminal sessions over WebSocket          |
| `client.run(id, input, key?)`  | Operation result, run ID and status       |
| `client.operation(id, input)`  | Completed operation result                |
| `client.selectWorkspace(root)` | Change the host workspace                 |

The root `@pane-system/host` export also supplies `createFiles`, `createGit`, `createOperations`, `inspectPackage` and `searchFiles`.
`searchFiles(provider, query)` needs an enabled host feature and an `invoke` adapter.
Pane registration, layout, tabs and editor controls use the separate browser package APIs.

## Host HTTP API

The demo binds to `127.0.0.1`.
The demo page contains its session token in `meta[name="pane-token"]`.
External requests require both `Authorization: Bearer <token>` and `x-pane-token: <token>`.
Browser requests use the same-origin session cookie and `x-pane-token` header.

| Method and path                              | Body or query                                                                                      | Result                      |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------- |
| `POST /api/operations`                       | `{ "id": "files.list", "input": { "path": "" }, "root": "/absolute/project", "key": "request-1" }` | `{ result, runId, status }` |
| `POST /api/workspace`                        | `{ "root": "/new/project", "currentRoot": "/absolute/project" }`                                   | Selected root               |
| `GET /api/runs`                              | None                                                                                               | Latest 100 saved runs       |
| `GET /api/runs?id=<runId>`                   | Run ID                                                                                             | Saved run                   |
| `POST /api/runs?id=<runId>&action=<action>`  | `pause`, `resume` or `stop` action                                                                 | Updated run                 |
| `POST /api/runs?id=<runId>&action=reconcile` | `{ "result": {}, "reason": "Verified external state" }`                                            | Reconciled run              |

`root` and `key` are optional in an operation request.
Supply `root` to reject a request if the selected workspace changed.
Reuse a request key with the same input to retrieve its saved run.
A key with different input fails.
Mutation errors can require inspection of file or Git state before retry.
Interrupted mutations require reconciliation instead of automatic replay.

The CLI has `runs.list`, `runs.get`, `runs.pause`, `runs.resume`, `runs.stop` and `runs.reconcile` commands.
Supply `--input '{"runId":"<id>"}'` for commands that select a run.
Reconciliation also requires `result` and a nonempty `reason`.
The SDK exposes `listRuns`, `getRun`, `pauseRun`, `resumeRun`, `stopRun` and `reconcileRun`.
Operations execute as atomic steps; a running step rejects pause and stop requests.
Controls do not undo completed changes.

## Package inspection adapters

Each library package has a `src/app/entrypoints/package.ts` inspection entry point.
The default CLI branch invokes `<package>.inspect`; `doctor --json` uses that same branch.
It is package inspection, not a complete readiness check.
The corresponding SDK function is `inspectPackage(provider)`.

```sh
bun packages/layout/src/app/entrypoints/package.ts
PORT=4320 bun packages/layout/src/app/entrypoints/package.ts --serve
```

The server prints `{ url, token }`.
Send `POST /operations` with `Authorization: Bearer <token>` and `{ "operation": "layout.inspect", "input": {} }`.
The package server uses `operation`; the workspace host uses `id` at `/api/operations`.
The package server defaults to port 4320.
These inspection adapters do not make every browser action available through CLI and HTTP.
