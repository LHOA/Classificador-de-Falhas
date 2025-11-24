// src/services/aiService.ts (Atualize o conteúdo)
import { FalhaInput, RespostaAPI, ItemClassificacao } from "../types";

// Usa variável de ambiente (VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Interface interna para dados de registro
interface UserCredentials {
    email: string;
    name: string;
}

// Obtém credenciais salvas no localStorage
const getUserCredentials = (): UserCredentials | null => {
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    return (email && name) ? { email, name } : null;
}

// Obtém o contador anônimo
const getAnonCount = (): number => {
    const count = localStorage.getItem('anon_eval_count');
    return count ? parseInt(count, 10) : 0;
}

// Incrementa e salva a contagem anônima
const incrementAnonCount = (): number => {
    const newCount = getAnonCount() + 1;
    localStorage.setItem('anon_eval_count', newCount.toString());
    return newCount;
}


// --- FUNÇÃO PRINCIPAL DE CLASSIFICAÇÃO ---
export const classificarFalha = async (dados: FalhaInput): Promise<RespostaAPI> => {
  const credentials = getUserCredentials();
  let currentAnonCount = getAnonCount();

  const isAnonymous = !credentials;
  const anonLimitReached = currentAnonCount >= 5 && isAnonymous;

  // 1. CHECAGEM DE LIMITE ANÔNIMO
  if (anonLimitReached) {
      // Retorna um erro específico que o componente irá interceptar para mostrar o modal de registro
      throw new Error("ANON_LIMIT_REACHED");
  }


  // 2. CONSTRUÇÃO DO CORPO DA REQUISIÇÃO
  const bodyData = {
      ...dados,
      user_email: credentials?.email,
      user_name: credentials?.name,
  };

  let response;
  try {
    response = await fetch(`${API_URL}/classificar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData),
    });
  } catch (error) {
    throw new Error("CONNECTION_ERROR");
  }


  // 3. TRATAMENTO DE ERROS DA API
  if (response.status === 403) {
      // Limite atingido (resposta do Backend com Quota Exceeded)
      throw new Error("QUOTA_EXCEEDED");
  }
  
  if (!response.ok) {
    throw new Error(`Erro na API: ${response.statusText}`);
  }

  // 4. SUCESSO: ATUALIZA O CONTADOR ANÔNIMO
  if (isAnonymous) {
      currentAnonCount = incrementAnonCount();
      // Checa se o último uso anônimo atingiu o limite (para mostrar o modal na próxima interação)
      if (currentAnonCount >= 5) {
          throw new Error("SHOW_REGISTER_MODAL");
      }
  }

  const resultado: RespostaAPI = await response.json();
  return resultado;
};

// ... (Você pode adicionar uma função separada para o Batch se necessário) ...
