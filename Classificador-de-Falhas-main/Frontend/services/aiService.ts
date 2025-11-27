import { FalhaInput, RespostaAPI } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface UserCredentials {
    email: string | null;
    name: string | null;
}

// Obtém credenciais salvas no localStorage
export const getUserId = (): UserCredentials => {
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    return { email, name };
};

// --- NOVA FUNÇÃO: REGISTRAR NO BACKEND ---
export const registrarUsuarioNoBackend = async (email: string, name: string): Promise<void> => {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            // Envia os dados exatamente como o Pydantic do Python espera
            body: JSON.stringify({ email, name }),
        });

        if (!response.ok) {
            // Se der erro (ex: banco fora do ar), lançamos uma exceção
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Erro no registro: ${response.status}`);
        }
        // Se deu tudo certo (200 OK), a função termina sem erros.
        
    } catch (error) {
        console.error("Erro ao registrar no backend:", error);
        // Propaga o erro para ser tratado no frontend se necessário
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
