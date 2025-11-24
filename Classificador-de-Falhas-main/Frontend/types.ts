// --- 1. ENUM DE NAVEGAÇÃO ---
export enum TabView {
  CLASSIFIER = 'classifier',
  BATCH = 'bulk',
  DASHBOARD = 'dashboard',
  DICTIONARY = 'dictionary'
}

// --- 2. TIPOS DA API (O que vai e volta do Python) ---
export interface FalhaInput {
  tag: string;
  descricao: string;
  impacto: string; 
}

export interface ResultadoClassificacao {
  codigo: string;
  descricao: string;
  confianca: number;
}

export interface RespostaAPI {
  modo: ResultadoClassificacao;
  deteccao: ResultadoClassificacao;
  mecanismo: ResultadoClassificacao;
  texto_processado: string;
}

// --- 3. TIPOS DA UI (O que o React usa para exibir/salvar) ---
export interface FailureRecord {
  id: string;
  tag: string;
  description: string;
  
  impactCode: string;
  impact: string;

  modeCode: string;
  mode: string;
  confidenceMode: number;

  mechanismCode: string;
  mechanism: string;
  confidenceMech: number;

  detectionCode: string;
  detection: string;
  confidenceDet: number;

  confidence: number;
  status: 'IA' | 'Human';
  timestamp: Date;
}
