// src/services/aiService.ts (Atualizado para retornar dados do registro)
import { FalhaInput, RespostaAPI } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface UserCredentials {
    email: string | null;
    name: string | null;
}

// Interface para a resposta do registro
interface RegisterResponse {
    status: string;
    message: string;
    total_uses: number;
}

// Obtém credenciais salvas no localStorage
export const getUserId = (): UserCredentials => {
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    return { email, name };
};

// --- FUNÇÃO ATUALIZADA: Retorna os dados do backend ---
export const registrarUsuarioNoBackend = async (email: string, name: string): Promise<RegisterResponse> => {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, name }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Erro no registro: ${response.status}`);
        }

        // Agora retornamos o JSON com o total_uses
        return await response.json();
        
    } catch (error) {
        console.error("Erro ao registrar no backend:", error);
        throw error;
    }
};

// --- FUNÇÃO PRINCIPAL DE CLASSIFICAÇÃO ---
export const classificarFalha = async (dados: FalhaInput): Promise<RespostaAPI> => {
    const credentials = getUserId();

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

    if (response.status === 403) {
        throw new Error("QUOTA_EXCEEDED");
    }
    
    if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
    }

    const resultado: RespostaAPI = await response.json();
    return resultado;
};
