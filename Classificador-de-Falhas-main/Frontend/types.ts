// --- 1. ENUM DE NAVEGAÇÃO (Mudança aqui!) ---
// Transformamos de "type" para "enum" para que o Sidebar.tsx consiga ler "TabView.DASHBOARD"
export enum TabView {
  CLASSIFIER = 'classifier',
  BATCH = 'bulk',
  DASHBOARD = 'dashboard',
  DICTIONARY = 'dictionary'
}

// --- 2. TIPOS DA API ---
export interface FalhaInput {
  tag: string;
  descricao: string;
  impacto: string; // "D", "S", "U" ou "X"
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
