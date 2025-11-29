export interface MaterialItem {
  category: string;
  material: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  // New fields for toggling
  secondaryQuantity?: number;
  secondaryUnit?: string;
}

export type MarketTrend = 'UP' | 'DOWN' | 'STABLE';

export interface CategoryTrend {
  category: string;
  trend: MarketTrend;
  percentageChange?: number; // e.g., 5% increase
  priceHistory?: number[]; // Array of numbers representing price points over time (e.g. last 6 months)
}

export interface EstimateResult {
  fileId: string;
  fileName: string;
  projectName: string;
  totalBudget: number;
  breakdown: MaterialItem[];
  currency: string;
  marketRegion: string;
  marketTrends: CategoryTrend[];
}

export interface ProjectEstimate {
  grandTotal: number;
  currency: string;
  estimates: EstimateResult[];
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}

export interface UploadedFile {
  id: string;
  file: File;
  base64: string;
  mimeType: string;
  previewUrl: string; // for PDF this might be a generic icon
  name: string;
}