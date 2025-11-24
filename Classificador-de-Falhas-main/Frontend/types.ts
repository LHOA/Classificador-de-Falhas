// --- 1. TIPO DE NAVEGAÇÃO (O que está faltando e causando o erro) ---
// Define as telas do seu menu lateral. Sem isso, o Sidebar.tsx quebra.
export type TabView = 'classifier' | 'bulk' | 'dashboard' | 'dictionary';

// --- 2. TIPOS DA API (Necessários para a IA) ---
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
