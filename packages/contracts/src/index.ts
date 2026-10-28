export interface Disposable {
  dispose(): void;
}
export interface Content extends Disposable {
  readonly ready?: Promise<void>;
  readonly element: HTMLElement;
  layout?(width: number, height: number): void;
  focus?(): void;
  reveal?(line: number, column?: number): void;
  save?(): Promise<void>;
  serialize?(): unknown;
  readonly dirty?: boolean;
}
export interface Tab {
  pinned?: boolean;
  sticky?: boolean;
  id: string;
  title: string;
  kind: string;
  resource?: string;
  content: Content;
}
export interface PaneState {
  id: string;
  zoom?: number;
  tabs: {
    id: string;
    title: string;
    kind: string;
    resource?: string;
    state?: unknown;
    pinned?: boolean;
    sticky?: boolean;
  }[];
  active?: string;
}
export type { TreeSettings, TreeSettingsPort } from "./core/tree-settings";
export interface TreeOpenOptions {
  pinned: boolean;
  sideBySide: boolean;
  preserveFocus: boolean;
}
export interface FileEntry {
  path: string;
  name: string;
  directory: boolean;
}
export interface FilePort {
  search?(
    query: import("./core/search").SearchQuery,
  ): Promise<import("./core/search").SearchResults>;
  list(path: string): Promise<FileEntry[]>;
  read(path: string): Promise<string>;
  write(path: string, text: string): Promise<void>;
  createDirectory?(path: string): Promise<void>;
  rename?(path: string, destination: string): Promise<void>;
  copy?(path: string, destination: string): Promise<void>;
  remove?(path: string): Promise<void>;
  watch?(listener: (path: string) => void): Disposable;
}
export type { SearchQuery, SearchMatch, SearchResults } from "./core/search";
export interface Change {
  path: string;
  status: string;
  staged: boolean;
  originalPath?: string;
}
export interface GitPort {
  status(): Promise<{
    branch: string;
    changes: Change[];
    canPublish?: boolean;
  }>;
  diff(
    path: string,
    staged?: boolean,
  ): Promise<{ original: string; modified: string }>;
  stage(path: string): Promise<void>;
  unstage(path: string): Promise<void>;
  discard?(path: string, staged: boolean): Promise<void>;
  patch?(path: string, staged: boolean): Promise<string>;
  head?(path: string): Promise<string>;
  stash?(paths: string[]): Promise<void>;
  commit(message: string): Promise<string>;
  publish?(): Promise<void>;
}
export interface TerminalSession extends Disposable {
  write(data: string): void;
  resize(columns: number, rows: number): void;
  onData(listener: (data: string) => void): Disposable;
}
export interface TerminalPort {
  create(): TerminalSession;
}
export interface StoragePort {
  read(key: string): unknown;
  write(key: string, value: unknown): void;
}
export interface Command {
  when?: string;
  keybinding?: string;
  id: string;
  title: string;
  shortcut?: string;
  run(): void | Promise<void>;
}
export interface PaneExtension {
  id: string;
  title: string;
  create(options: {
    resource?: string;
    state?: unknown;
  }): Content | Promise<Content>;
}

import type { PackageProvider } from "./core/contracts/module";
import { executeRun, runOperation } from "./core/engine";
import { PACKAGE_OPERATION } from "./core/operation-ids";
export { createPackageProvider } from "./app/bootstrap/providers";
export async function inspectPackage(provider: PackageProvider) {
  return runOperation(provider, PACKAGE_OPERATION.INSPECT, {});
}
export async function resumeRun(provider: PackageProvider, id: string) {
  provider.application.assertEnabled(provider.runs.get(id).operation);
  const run = provider.runs.control(id, "resume");
  return executeRun(provider, run);
}
