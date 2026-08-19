export interface Project {
  id: string;
  name: string;
  description: string;
  domain: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ProjectSortKey = 'name' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';
export type ActiveFilter = 'all' | 'active' | 'inactive';