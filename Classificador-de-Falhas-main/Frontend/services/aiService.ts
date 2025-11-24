// src/services/aiService.ts

import { FalhaInput, RespostaAPI } from "../types";

// Usa variável de ambiente (VITE_API_URL)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Interface interna para dados de registro
interface UserCredentials {
    email: string;
    name: string;
}

const ANON_LIMIT = 5;

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

// --- FUNÇÃO PRINCIPAL DE CLASSIFICAÇÃO (Com correção de fluxo) ---
export const classificarFalha = async (dados: FalhaInput): Promise<RespostaAPI> => {
    const credentials = getUserCredentials();
    let currentAnonCount = getAnonCount();

    const isAnonymous = !credentials;
    
    // --- 1. CHECAGEM PRÉVIA DO LIMITE (CORREÇÃO DO BUG 2) ---
    // Se for anônimo E já atingiu o limite, para AQUI e avisa o App.tsx para mostrar o modal
    if (isAnonymous && currentAnonCount >= ANON_LIMIT) {
        throw new Error("ANON_LIMIT_REACHED");
    }
    // --- NOVO: Funções para Obter e Injetar Credenciais ---
// Adicione esta função ao seu aiService.ts (em qualquer lugar)
export const getUserId = (): { email: string | null, name: string | null } => {
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    return { email, name };
};

// ... (O restante do aiService.ts se mantém)

    // 2. CONSTRUÇÃO DO CORPO DA REQUISIÇÃO (Inclui credenciais se existirem)
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

    // 3. TRATAMENTO DE ERROS DA API (403 Quota Exceeded)
    if (response.status === 403) {
        throw new Error("QUOTA_EXCEEDED");
    }
    
    if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
    }

    // 4. SUCESSO: ATUALIZA O CONTADOR ANÔNIMO
    if (isAnonymous) {
        incrementAnonCount(); // Incrementa após o sucesso
    }

    const resultado: RespostaAPI = await response.json();
    return resultado;
};
