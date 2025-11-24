// src/types.ts

export enum TabView {
  CLASSIFIER = 'classifier',
  BATCH = 'bulk',
  DASHBOARD = 'dashboard',
  DICTIONARY = 'dictionary'
}

export interface FalhaInput {
  tag: string;
  descricao: string;
  impacto: string;
}

export interface ItemClassificacao {
  codigo: string;
  descricao: string;
  confianca: number;
}

// A RESPOSTA DA API AGORA É UMA LISTA (ARRAY) DE ITENS
export interface RespostaAPI {
  modo: ItemClassificacao[];      
  deteccao: ItemClassificacao[];
  mecanismo: ItemClassificacao[];
  texto_processado: string;
}

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
