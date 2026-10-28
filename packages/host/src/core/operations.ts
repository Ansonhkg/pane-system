import type { FilePort, GitPort } from "@pane-system/contracts";
import { OPERATION } from "./operation-ids";
export { OPERATION } from "./operation-ids";

export interface HostInput {
  path?: string;
  paths?: string[];
  text?: string;
  staged?: boolean;
  message?: string;
  destination?: string;
  report?: unknown;
}
export function createOperations(options: {
  files: FilePort;
  git: GitPort;
  root: string;
  runtime: string;
  recordMeasurements?(value: unknown): Promise<void>;
}) {
  const path = (input: HostInput) => {
    if (typeof input.path !== "string") throw new Error("Supply a file path.");
    return input.path;
  };
  return async function execute(
    id: string,
    input: HostInput,
  ): Promise<unknown> {
    switch (id) {
      case OPERATION.INSPECT:
        return {
          name: "@pane-system/host",
          runtime: options.runtime,
          root: options.root,
        };
      case OPERATION.DOCTOR:
        return {
          ready: true,
          root: options.root,
          services: ["files", "git", "terminal", "watcher"],
          runtime: options.runtime,
        };
      case OPERATION.LIST:
        return options.files.list(path(input));
      case OPERATION.READ:
        return options.files.read(path(input));
      case OPERATION.WRITE:
        if (typeof input.text !== "string")
          throw new Error("Supply file text.");
        await options.files.write(path(input), input.text);
        return { saved: true };
      case OPERATION.STATUS:
        return options.git.status();
      case OPERATION.DIFF:
        return options.git.diff(path(input), input.staged);
      case OPERATION.STAGE:
        await options.git.stage(path(input));
        return { staged: true };
      case OPERATION.UNSTAGE:
        await options.git.unstage(path(input));
        return { staged: false };
      case OPERATION.DISCARD:
        if (!options.git.discard) throw new Error("Discard is not available.");
        await options.git.discard(path(input), input.staged === true);
        return { discarded: true };
      case OPERATION.HEAD:
        if (!options.git.head)
          throw new Error("HEAD content is not available.");
        return options.git.head(path(input));
      case OPERATION.PATCH:
        if (!options.git.patch) throw new Error("Patch is not available.");
        return options.git.patch(path(input), input.staged === true);
      case OPERATION.STASH:
        if (
          !options.git.stash ||
          !Array.isArray(input.paths) ||
          !input.paths.length ||
          !input.paths.every((item: unknown) => typeof item === "string")
        )
          throw new Error("Supply paths to stash.");
        await options.git.stash(input.paths);
        return { stashed: true };
      case OPERATION.COMMIT:
        if (typeof input.message !== "string")
          throw new Error("Supply a commit message.");
        return options.git.commit(input.message);
      case OPERATION.PUBLISH:
        if (!options.git.publish) throw new Error("Publish is not available.");
        await options.git.publish();
        return { published: true };
      case OPERATION.DIRECTORY:
        if (!options.files.createDirectory)
          throw new Error("Directory creation is not available.");
        await options.files.createDirectory(path(input));
        return { created: true };
      case OPERATION.RENAME:
        if (!options.files.rename || typeof input.destination !== "string")
          throw new Error("Supply a destination.");
        await options.files.rename(path(input), input.destination);
        return { renamed: true };
      case OPERATION.COPY:
        if (!options.files.copy || typeof input.destination !== "string")
          throw new Error("Supply a destination.");
        await options.files.copy(path(input), input.destination);
        return { copied: true };
      case OPERATION.REMOVE:
        if (!options.files.remove)
          throw new Error("File removal is not available.");
        await options.files.remove(path(input));
        return { removed: true };
      case OPERATION.MEASURE:
        if (!options.recordMeasurements)
          throw new Error("Measurement storage is not configured.");
        await options.recordMeasurements(input.report);
        return { saved: true };
      default:
        throw new Error("Unknown operation: " + id);
    }
  };
}
