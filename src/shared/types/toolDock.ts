export type ToolType = 'website' | 'desktop_app';

export interface ToolDockItem {
  id: string;
  name: string;
  type: ToolType;
  target: string;
  icon: string;
  customIconUrl?: string;
  badge?: string;
  itemOrder: number;
  openInBuiltInBrowser?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateToolInput = Omit<ToolDockItem, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateToolInput = Partial<Omit<ToolDockItem, 'id' | 'createdAt' | 'updatedAt'>>;
