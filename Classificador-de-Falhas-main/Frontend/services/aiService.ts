import { FalhaInput, RespostaAPI } from "./types";

// Usa variável de ambiente ou localhost se não existir (para testes locais)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const classificarFalha = async (dados: FalhaInput): Promise<RespostaAPI> => {
  try {
    const response = await fetch(`${API_URL}/classificar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Converte o objeto JS para JSON string para enviar
      body: JSON.stringify(dados),
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.statusText}`);
    }

    const resultado: RespostaAPI = await response.json();
    return resultado;
  } catch (error) {
    console.error("Erro ao classificar falha:", error);
    throw error;
  }
};
