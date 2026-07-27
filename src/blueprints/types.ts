export type BlueprintCategory = 'mobile' | 'web' | 'desktop' | 'backend' | 'general';

export type StageActionType = 'prompt' | 'doc' | 'memory' | 'stitch' | 'antigravity';

export interface StageItemAction {
  type: 'generate' | 'discuss' | 'custom';
  label: string;
  actionPayload?: string;
}

export interface StageItem {
  id: string;
  title: string;
  description?: string;

  // Extensible action hooks (Sprint 10.2 Workflow Actions)
  actions?: StageItemAction[];

  // Future-ready extension points (Sprint 11+ Ready)
  actionType?: StageActionType;
  actionPayload?: string;
}

export interface ProjectStage {
  id: string;
  name: string;
  icon: string;
  items: StageItem[];
}

export interface ProjectBlueprint {
  id: string;
  displayName: string;
  description: string;
  icon: string;
  primaryLanguage: string;
  framework: string;
  category: BlueprintCategory;
  stages: ProjectStage[];

  // Architectural metadata slots
  defaultPrompts?: string[];
  documentationTemplates?: string[];
  codingConventions?: string[];
  recommendedModels?: string[];
  projectStages?: string[];
}
