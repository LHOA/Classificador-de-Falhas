export interface FailureRecord {
  id: string;
  tag: string;
  description: string;
  
  impact: string;
  impactCode: string;
  
  mode: string;
  modeCode: string;
  confidenceMode: number;

  detection: string;
  detectionCode: string;
  confidenceDet: number;

  mechanism: string;
  mechanismCode: string;
  confidenceMech: number;

  // Aggregate/Overall confidence for backward compatibility or general KPIs
  confidence: number;
  status: 'IA' | 'Human' | 'Batch';
  timestamp: Date;
}

export interface PredictionResult {
  code: string;
  label: string;
  confidence: number;
}

export interface AIResponse {
  mode: PredictionResult[];
  detection: PredictionResult[];
  mechanism: PredictionResult[];
}

export enum TabView {
  DASHBOARD = 'dashboard',
  CLASSIFIER = 'classifier',
  BATCH = 'batch',
  DICTIONARY = 'dictionary'
}