export interface Bead {
  id: string;
  code: string; // e.g., "01", "Hama 207-01"
  name: string; // e.g., "White"
  hex: string;  // e.g., "#FFFFFF"
  quantity: number;
}

export interface PatternColorRequirement {
  colorName: string;
  hexCode: string;
  count: number;
}

export interface MatchedRequirement extends PatternColorRequirement {
  matchedBeadId: string | null; // null if no match found or user needs to select
}

export type TabType = 'inventory' | 'project' | 'create';
