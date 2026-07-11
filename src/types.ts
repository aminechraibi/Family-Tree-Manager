import { Person, ParentRelationship, CoupleRelationship } from './utils/relationshipCalculator';

export type { Person, ParentRelationship, CoupleRelationship };

export interface Event {
  id: string;
  type: 'birth' | 'marriage' | 'graduation' | 'migration' | 'employment' | 'death' | 'burial' | 'custom';
  title: string;
  date?: string;
  location?: string;
  description?: string;
  people?: Array<{ personId: string; role?: string }>;
  createdAt: string;
}

export interface Photo {
  id: string;
  filePath: string;
  thumbnailPath?: string;
  title: string;
  date?: string;
  location?: string;
  description?: string;
  generatedSummary?: string;
  tags?: string[];
  people?: string[]; // list of tagged person IDs
  createdAt: string;
}

export interface Settings {
  familyName: string;
  language: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  treeLayout: 'TB' | 'LR';
  treeGenerations: number;
  showPhotosInTree: boolean;
  showBirthYearsInTree: boolean;
  imageSummariesEnabled: boolean;
  apiProvider: string;
  apiUrl: string;
  apiKey: string;
  apiModel: string;
}

export interface HistoryItem {
  id: string;
  action: string;
  timestamp: string;
  details: string;
}
