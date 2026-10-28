import { installPaneDrop } from "./drop-target";
import { createPaneZoom } from "./zoom";
import { paneControls } from "./controls";
import { confirmAction } from "@pane-system/contracts/dialogs";
import { createTabModel, TabInput } from "./model";
import { EditorsOrder } from "@pane-system/upstream/groups";
import {
  renderPaneTabs,
  refreshPaneTabs,
  sameTabNodes,
  disposePaneTabs,
} from "./render";
import {
  Emitter,
  type IViewSize,
  type IView,
} from "@pane-system/upstream/layout";
import type { Tab, PaneState } from "@pane-system/contracts";
export interface PaneActions {
  activate(pane: Pane): void;
  split(pane: Pane, vertical: boolean): void;
  close(pane: Pane): void;
  move(tab: string, from: string, to: string, index?: number): void;
  drop(
    tab: string,
    from: string,
    to: Pane,
    edge: string,
    copy?: boolean,
    index?: number,
  ): void;
  changed(): void;
  canClose?(): boolean;
}
export class Pane implements IView {
  readonly element = document.createElement("section");
  readonly header = document.createElement("div");
  readonly body = document.createElement("div");
  readonly tablist = document.createElement("div");
  readonly minimumWidth = 150;
  readonly minimumHeight = 96;
  readonly maximumWidth = Number.POSITIVE_INFINITY;
  readonly maximumHeight = Number.POSITIVE_INFINITY;
  readonly changes = new Emitter<IViewSize | undefined>();
  readonly onDidChange = this.changes.event;
  private readonly model = createTabModel();
  private readonly inputs = new Map<string, TabInput>();
  get tabs(): Tab[] {
    return this.model
      .getEditors(EditorsOrder.SEQUENTIAL)
      .map((input) => (input as TabInput).tab);
  }
  get active() {
    return (this.model.activeEditor as TabInput | null)?.tab.id;
  }
  set active(id: string | undefined) {
    this.model.setActive(id ? this.inputs.get(id) : undefined);
  }
  private readonly toolbar: ReturnType<typeof paneControls>;
  private readonly dropTarget: { dispose(): void };
  private readonly zoomController: ReturnType<typeof createPaneZoom>;
  private width = 0;
  private height = 0;
  constructor(
    readonly id: string,
    readonly actions: PaneActions,
  ) {
    this.element.className = "pane";
    this.element.dataset.pane = id;
    this.element.setAttribute("aria-label", "Pane " + id);
    this.header.className = "pane-header";
    this.body.className = "pane-body";
    this.tablist.className = "tabs";
    this.tablist.setAttribute("role", "tablist");
    const controls = document.createElement("div");
    controls.className = "pane-controls";
    this.toolbar = paneControls(controls, this, actions);
    this.zoomController = createPaneZoom(this, () => {
      this.layout(this.width, this.height);
      this.toolbar.update("pane.zoom", {
        title: "Pane zoom (" + Math.round(this.zoom * 100) + "%)",
      });
      actions.changed();
    });
    this.header.append(this.tablist, controls);
    this.element.append(this.header, this.body);
    this.element.addEventListener("pointerdown", () => actions.activate(this));
    this.element.addEventListener("focusin", () => actions.activate(this));
    this.dropTarget = installPaneDrop(this);
  }
  open(tab: Tab, index = this.tabs.length) {
    if (this.tabs.some((t) => t.id === tab.id)) {
      this.select(tab.id);
      return;
    }
    if (tab.pinned === false) {
      for (const item of this.tabs) {
        if (!this.isPinned(item.id) && item.content.dirty)
          this.setPinned(item.id, true);
      }
    }
    const input = new TabInput(tab);
    this.inputs.set(tab.id, input);
    this.model.openEditor(input, {
      active: true,
      pinned: tab.pinned ?? true,
      sticky: tab.sticky,
      index,
    });
    this.cleanPreview();
    this.body.append(tab.content.element);
    this.select(tab.id);
  }
  take(id: string) {
    const input = this.inputs.get(id);
    if (!input) return;
    const tab = input.tab;
    tab.pinned = this.model.isPinned(input);
    tab.sticky = this.model.isSticky(input);
    this.model.closeEditor(input);
    this.inputs.delete(id);
    input.dispose();
    this.render();
    return tab;
  }
  private cleanPreview() {
    const active = new Set(this.model.getEditors(EditorsOrder.SEQUENTIAL));
    for (const [id, input] of this.inputs) {
      if (active.has(input)) continue;
      this.inputs.delete(id);
      input.tab.content.dispose();
      input.tab.content.element.remove();
      input.dispose();
    }
  }
  setPinned(id: string, pinned: boolean) {
    const input = this.inputs.get(id);
    if (!input) return;
    if (pinned) this.model.pin(input);
    else this.model.unpin(input);
    this.cleanPreview();
    this.render();
    this.actions.changed();
  }
  setSticky(id: string, sticky: boolean) {
    const input = this.inputs.get(id);
    if (!input) return;
    if (sticky) this.model.stick(input);
    else this.model.unstick(input);
    this.render();
    this.actions.changed();
  }
  isPinned(id: string) {
    const input = this.inputs.get(id);
    return !!input && this.model.isPinned(input);
  }
  isSticky(id: string) {
    const input = this.inputs.get(id);
    return !!input && this.model.isSticky(input);
  }
  async closeTab(id: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;
    if (
      tab.content.dirty &&
      !(await confirmAction("Discard unsaved changes in " + tab.title + "?"))
    )
      return;
    this.take(id);
    tab.content.dispose();
    tab.content.element.remove();
    this.actions.changed();
    if (!this.tabs.length) this.actions.close(this);
  }
  select(id: string) {
    if (!this.tabs.some((t) => t.id === id)) return;
    this.active = id;
    this.actions.activate(this);
    this.render();
    this.actions.changed();
  }
  private render() {
    if (sameTabNodes(this)) refreshPaneTabs(this);
    else renderPaneTabs(this);
    for (const tab of this.tabs)
      tab.content.element.hidden = tab.id !== this.active;
    this.layout(this.width, this.height);
  }
  refresh() {
    this.toolbar.update("pane.close", {
      enabled: this.actions.canClose?.() !== false,
    });
    for (const input of this.inputs.values()) input.changed();
    refreshPaneTabs(this);
  }
  layout(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.element.style.width = width + "px";
    this.element.style.height = height + "px";
    this.zoomController.layout();
    this.tabs
      .find((t) => t.id === this.active)
      ?.content.layout?.(this.body.clientWidth, this.body.clientHeight);
  }
  toJSON(): PaneState {
    return {
      id: this.id,
      zoom: this.zoom,
      active: this.active,
      tabs: this.tabs.map((t) => ({
        id: t.id,
        title: t.title,
        kind: t.kind,
        resource: t.resource,
        pinned: this.isPinned(t.id),
        sticky: this.isSticky(t.id),
        state: t.content.serialize?.(),
      })),
    };
  }
  dispose() {
    this.zoomController.dispose();
    this.dropTarget.dispose();
    this.toolbar.dispose();
    disposePaneTabs(this);
    for (const tab of this.tabs) tab.content.dispose();
    this.model.dispose();
    for (const input of this.inputs.values()) input.dispose();
    this.inputs.clear();
    this.changes.dispose();
    this.element.remove();
  }
  get zoom() {
    return this.zoomController.value;
  }
  setZoom(value: number) {
    this.zoomController.set(value);
  }
  showZoomMenu() {
    this.zoomController.show();
  }
}
