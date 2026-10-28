import type { Context } from "./context";
import type { StoragePort } from "@pane-system/contracts";
export interface WorkbenchOptions {
  context?: Context;
  container: HTMLElement;
  storage?: StoragePort;
  storageKey?: string;
  status?(message: string): void;
}
