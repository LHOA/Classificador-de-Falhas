// O que você envia para a API
export interface FalhaInput {
  tag: string;
  descricao: string;
  impacto: string; // "D", "S", "U" ou "X"
}

// O pedacinho da resposta da IA (código + texto + confiança)
export interface ResultadoClassificacao {
  codigo: string;
  descricao: string;
  confianca: number;
}

// A resposta completa da API
export interface RespostaAPI {
  modo: ResultadoClassificacao;
  deteccao: ResultadoClassificacao;
  mecanismo: ResultadoClassificacao;
  texto_processado: string;
}
