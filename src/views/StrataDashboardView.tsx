import React from "react";
import { createRoot, Root } from "react-dom/client";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { DashboardRoot } from "../components/DashboardRoot";

export const STRATA_VIEW_TYPE = "stratamd";

export class StrataDashboardView extends ItemView {
  private root: Root | null = null;
  private actions: {
    onSaveSelected: () => Promise<void>;
    onOpenOriginal: () => void;
    onToggleStar: () => void;
    onToggleRead: () => void;
    loadPreview: (url: string, feedContent?: string, summary?: string) => Promise<{ html: string; source: string }>;
  };

  constructor(
    leaf: WorkspaceLeaf,
    actions: {
      onSaveSelected: () => Promise<void>;
      onOpenOriginal: () => void;
      onToggleStar: () => void;
      onToggleRead: () => void;
      loadPreview: (url: string, feedContent?: string, summary?: string) => Promise<{ html: string; source: string }>;
    },
  ) {
    super(leaf);
    this.actions = actions;
  }

  getViewType(): string {
    return STRATA_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "StrataMD";
  }

  async onOpen(): Promise<void> {
    this.root = createRoot(this.containerEl.children[1]);
    this.root.render(React.createElement(DashboardRoot, this.actions));
  }

  async onClose(): Promise<void> {
    this.root?.unmount();
    this.root = null;
  }
}
