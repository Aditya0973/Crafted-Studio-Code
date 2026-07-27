export type ModuleCategory =
  | 'state-management'
  | 'database'
  | 'backend-services'
  | 'monetization'
  | 'analytics';

export interface ProjectModule {
  id: string;
  displayName: string;
  description: string;
  category: ModuleCategory;
  compatibleBlueprintIds?: string[];
}
