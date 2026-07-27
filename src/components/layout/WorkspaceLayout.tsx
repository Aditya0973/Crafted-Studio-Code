import React, { useEffect, useRef, useState } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { ChatContainer } from './ChatContainer';
import { WorkbenchArea } from '../workbench/WorkbenchArea';
import { RightSidebar } from './RightSidebar';
import { WorkspacePanel } from './WorkspacePanel';
import { PanelSplitter } from './PanelSplitter';
import { BottomPanelContainer } from '../bottompanel/BottomPanelContainer';
import { useLayoutStore } from '../../stores/layoutStore';
import { useProjectStore } from '../../stores/projectStore';
import { useWorkbenchStore } from '../../stores/workbenchStore';
import {
  WorkspacePanelId,
  workspaceLayoutEngine,
} from '../../services/WorkspaceLayoutEngine';

export const WorkspaceLayout: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  const {
    panelVisibility,
    panelOrder,
    panelProportions,
    focusModePanel,
    setPanelProportions,
    initializeLayout,
  } = useLayoutStore();

  const { activeProject } = useProjectStore();
  const { loadSessionForProject } = useWorkbenchStore();

  useEffect(() => {
    initializeLayout();
  }, [initializeLayout]);

  // Load project workbench session strictly when active project ID changes
  const activeProjectId = activeProject && !activeProject.isMissing ? activeProject.id : null;
  useEffect(() => {
    if (activeProjectId) {
      loadSessionForProject(activeProjectId);
    } else {
      loadSessionForProject(null);
    }
  }, [activeProjectId]);

  // Measure container width via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect) {
        setContainerWidth(entries[0].contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute pixel widths via WorkspaceLayoutEngine
  const computedPanelState = workspaceLayoutEngine.computePixelWidths(
    containerWidth,
    panelOrder,
    panelVisibility,
    panelProportions,
    focusModePanel
  );

  // Visible panel IDs in current panelOrder
  const visibleIds = focusModePanel
    ? [focusModePanel]
    : panelOrder.filter((id) => panelVisibility[id]);

  const renderPanelComponent = (panelId: WorkspacePanelId) => {
    switch (panelId) {
      case 'explorer':
        return <LeftSidebar isDragging={isDraggingSplitter} />;
      case 'chat':
        return (
          <div className="flex flex-col h-full w-full overflow-hidden">
            <ChatContainer />
          </div>
        );
      case 'editor':
        return (
          <div className="flex flex-col h-full w-full overflow-hidden">
            <WorkbenchArea />
          </div>
        );
      case 'tooldock':
        return <RightSidebar isDragging={isDraggingSplitter} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex flex-col flex-1 h-full w-full overflow-hidden bg-crafted-bg select-none font-sans">
      {/* Upper Horizontal Workspace Panels Area */}
      <div
        ref={containerRef}
        className="flex-1 flex h-full min-h-0 w-full overflow-hidden relative"
      >
        {visibleIds.length > 0 ? (
          panelOrder.map((panelId) => {
            const state = computedPanelState[panelId];
            if (!state) return null;

            const isVisible = !state.collapsed;
            const visibleIdx = visibleIds.indexOf(panelId);
            const isLastVisible = visibleIdx === visibleIds.length - 1;
            const showSplitter = !focusModePanel && isVisible && !isLastVisible;

            return (
              <React.Fragment key={panelId}>
                <WorkspacePanel
                  id={panelId}
                  width={state.width}
                  collapsed={state.collapsed}
                  isDragging={isDraggingSplitter}
                >
                  {renderPanelComponent(panelId)}
                </WorkspacePanel>

                {showSplitter && (
                  <PanelSplitter
                    splitterIndex={visibleIdx}
                    containerWidth={containerWidth}
                    visibleIds={visibleIds}
                    currentProportions={panelProportions}
                    onProportionsChange={setPanelProportions}
                    onDragStateChange={setIsDraggingSplitter}
                  />
                )}
              </React.Fragment>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full w-full text-crafted-text-dim text-xs space-y-2">
            <span>All Workspace Panels Collapsed</span>
            <p className="text-[11px] text-crafted-text-muted">Use the top Workspace Navigation Bar or keyboard shortcuts (Ctrl+1..4) to show panels.</p>
          </div>
        )}
      </div>

      {/* Integrated Resizable Bottom Panel (Terminal / Problems / Output) */}
      <BottomPanelContainer />
    </div>
  );
};
