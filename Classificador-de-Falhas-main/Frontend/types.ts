// --- TIPOS DE NAVEGAÇÃO (O que estava faltando) ---
// Define quais telas existem no seu app
export type TabView = 'classifier' | 'bulk' | 'dashboard' | 'dictionary';

// --- TIPOS DA API (Necessários para a IA funcionar) ---
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
