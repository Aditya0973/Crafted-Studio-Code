import { WorkspacePanelDefinition } from '../shared/types';

export type WorkspacePanelId = 'explorer' | 'chat' | 'editor' | 'tooldock';

export const REGISTERED_WORKSPACE_PANELS: Record<WorkspacePanelId, WorkspacePanelDefinition> = {
  explorer: {
    id: 'explorer',
    title: 'Explorer',
    minSize: 220, // min width in pixels
    defaultSize: 0.2, // 20% proportion
  },
  chat: {
    id: 'chat',
    title: 'Chat',
    minSize: 300, // min width in pixels
    defaultSize: 0.25, // 25% proportion
  },
  editor: {
    id: 'editor',
    title: 'Editor',
    minSize: 450, // min width in pixels
    defaultSize: 0.35, // 35% proportion
  },
  tooldock: {
    id: 'tooldock',
    title: 'Tool Dock',
    minSize: 280, // min width in pixels
    defaultSize: 0.2, // 20% proportion
  },
};

export class WorkspaceLayoutEngine {
  private static instance: WorkspaceLayoutEngine | null = null;
  private panelDefinitions: Map<string, WorkspacePanelDefinition> = new Map();

  private constructor() {
    Object.values(REGISTERED_WORKSPACE_PANELS).forEach((def) => {
      this.panelDefinitions.set(def.id, def);
    });
  }

  public static getInstance(): WorkspaceLayoutEngine {
    if (!WorkspaceLayoutEngine.instance) {
      WorkspaceLayoutEngine.instance = new WorkspaceLayoutEngine();
    }
    return WorkspaceLayoutEngine.instance;
  }

  public registerPanel(def: WorkspacePanelDefinition): void {
    this.panelDefinitions.set(def.id, def);
  }

  public getPanelDefinition(id: string): WorkspacePanelDefinition | undefined {
    return this.panelDefinitions.get(id);
  }

  /**
   * Compute actual pixel widths for visible panels given relative proportions and container width.
   */
  public computePixelWidths(
    containerWidth: number,
    panelOrder: WorkspacePanelId[],
    panelVisibility: Record<WorkspacePanelId, boolean>,
    panelProportions: Record<WorkspacePanelId, number>,
    focusModePanel: WorkspacePanelId | null
  ): Record<WorkspacePanelId, { width: number; collapsed: boolean }> {
    const result: Record<WorkspacePanelId, { width: number; collapsed: boolean }> = {
      explorer: { width: 0, collapsed: true },
      chat: { width: 0, collapsed: true },
      editor: { width: 0, collapsed: true },
      tooldock: { width: 0, collapsed: true },
    };

    if (containerWidth <= 0) return result;

    // In Focus Mode, target panel takes 100% width; all others collapse to 0 width
    if (focusModePanel) {
      panelOrder.forEach((id) => {
        if (id === focusModePanel) {
          result[id] = { width: containerWidth, collapsed: false };
        } else {
          result[id] = { width: 0, collapsed: true };
        }
      });
      return result;
    }

    // Determine visible active panels
    const visibleIds = panelOrder.filter((id) => panelVisibility[id]);

    if (visibleIds.length === 0) {
      return result;
    }

    // Sum relative proportions of active visible panels
    let activeProportionSum = 0;
    visibleIds.forEach((id) => {
      activeProportionSum += panelProportions[id] || 0.25;
    });

    if (activeProportionSum <= 0) activeProportionSum = 1;

    // Calculate raw target widths based on normalized relative proportions
    const rawWidths: Record<string, number> = {};
    visibleIds.forEach((id) => {
      const normalizedProp = (panelProportions[id] || 0.25) / activeProportionSum;
      rawWidths[id] = Math.round(normalizedProp * containerWidth);
    });

    // Enforce pixel minSize clamping
    visibleIds.forEach((id) => {
      const def = this.getPanelDefinition(id);
      const minW = def ? def.minSize : 200;
      if (rawWidths[id] < minW) {
        rawWidths[id] = minW;
      }
    });

    // Calculate total computed width and distribute delta to fill 100% container width cleanly
    const currentTotal = visibleIds.reduce((sum, id) => sum + rawWidths[id], 0);
    const difference = containerWidth - currentTotal;

    if (difference !== 0 && visibleIds.length > 0) {
      // Add difference to the largest panel
      let largestId = visibleIds[0];
      let maxW = rawWidths[largestId];
      visibleIds.forEach((id) => {
        if (rawWidths[id] > maxW) {
          maxW = rawWidths[id];
          largestId = id;
        }
      });
      rawWidths[largestId] = Math.max(
        this.getPanelDefinition(largestId)?.minSize || 200,
        rawWidths[largestId] + difference
      );
    }

    // Assign final computed widths
    panelOrder.forEach((id) => {
      if (panelVisibility[id]) {
        result[id] = { width: rawWidths[id] || 0, collapsed: false };
      } else {
        result[id] = { width: 0, collapsed: true };
      }
    });

    return result;
  }

  /**
   * Smart spillover resizing math when dragging splitters.
   */
  public calculateSmartResize(
    containerWidth: number,
    visibleIds: WorkspacePanelId[],
    currentProportions: Record<WorkspacePanelId, number>,
    splitterIndex: number, // Index of panel to left of splitter
    deltaX: number
  ): Record<WorkspacePanelId, number> {
    if (splitterIndex < 0 || splitterIndex >= visibleIds.length - 1 || containerWidth <= 0) {
      return currentProportions;
    }

    const leftId = visibleIds[splitterIndex];
    const rightId = visibleIds[splitterIndex + 1];

    const deltaProportion = deltaX / containerWidth;

    const leftProp = currentProportions[leftId] || 0.25;
    const rightProp = currentProportions[rightId] || 0.25;

    const leftMinProp = (this.getPanelDefinition(leftId)?.minSize || 200) / containerWidth;
    const rightMinProp = (this.getPanelDefinition(rightId)?.minSize || 200) / containerWidth;

    let newLeftProp = leftProp + deltaProportion;
    let newRightProp = rightProp - deltaProportion;

    if (newLeftProp < leftMinProp) {
      const overflow = leftMinProp - newLeftProp;
      newLeftProp = leftMinProp;
      newRightProp -= overflow;
    }

    if (newRightProp < rightMinProp) {
      const overflow = rightMinProp - newRightProp;
      newRightProp = rightMinProp;
      newLeftProp -= overflow;
    }

    return {
      ...currentProportions,
      [leftId]: Math.max(leftMinProp, newLeftProp),
      [rightId]: Math.max(rightMinProp, newRightProp),
    };
  }
}

export const workspaceLayoutEngine = WorkspaceLayoutEngine.getInstance();
