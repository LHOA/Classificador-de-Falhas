// src/services/aiService.ts (Versão Limpa - Sem contagem anônima)
import { FalhaInput, RespostaAPI } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface UserCredentials {
    email: string | null;
    name: string | null;
}

// NÃO PRECISAMOS MAIS DE ANON_LIMIT AQUI

// Obtém credenciais salvas no localStorage
export const getUserId = (): UserCredentials => {
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    return { email, name };
};

// REMOVIDO: getAnonCount
// REMOVIDO: incrementAnonCount

// --- FUNÇÃO PRINCIPAL DE CLASSIFICAÇÃO ---
export const classificarFalha = async (dados: FalhaInput): Promise<RespostaAPI> => {
    const credentials = getUserId(); // Pega credenciais em tempo real

    // REMOVIDO: Checagem de limite anônimo. 
    // O App.tsx agora garante que o usuário só chega aqui se tiver credenciais (ou se o fluxo estiver quebrado, o backend barra).

    // 2. CONSTRUÇÃO DO CORPO DA REQUISIÇÃO
    const bodyData = {
        ...dados,
        user_email: credentials.email,
        user_name: credentials.name,
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

    // 3. TRATAMENTO DE ERROS DA API (403 Quota Exceeded do Backend)
    if (response.status === 403) {
        throw new Error("QUOTA_EXCEEDED");
    }
    
    if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
    }

    // REMOVIDO: incrementAnonCount()

    const resultado: RespostaAPI = await response.json();
    return resultado;
};
