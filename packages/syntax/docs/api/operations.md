# Package API

## syntax.inspect

Empty object.

Package name, version, and public entry points.

CLI: `bun src/app/entrypoints/package.ts doctor --json`.

SDK: `inspectPackage(provider)`.

HTTP: `POST /operations` through `bun src/app/entrypoints/package.ts --serve`.

Supply a durable RunStore and explicit feature flags. Run control preserves the run ID.
