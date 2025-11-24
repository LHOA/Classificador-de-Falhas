import { FalhaInput, RespostaAPI } from "../types";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const ANON_LIMIT = 5;

export const getUserId = () => {
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    return { email, name };
};

// ... (restante da função classificarFalha, inalterada)

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
    const credentials = getUserId(); // Pega credenciais em tempo real
    let currentAnonCount = getAnonCount();

    const isAnonymous = !credentials.email;
    
    // 1. CHECAGEM PRÉVIA DO LIMITE ANÔNIMO
    if (isAnonymous && currentAnonCount >= ANON_LIMIT) {
        throw new Error("ANON_LIMIT_REACHED");
    }

    // 2. CONSTRUÇÃO DO CORPO DA REQUISIÇÃO (Injeta credenciais, mesmo que null)
    const bodyData = {
        ...dados,
        user_email: credentials.email, // Injeta o email atualizado
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

    // 3. TRATAMENTO DE ERROS DA API (403 Quota Exceeded)
    if (response.status === 403) {
        throw new Error("QUOTA_EXCEEDED");
    }
    
    if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
    }

    // 4. SUCESSO: ATUALIZA O CONTADOR ANÔNIMO
    if (isAnonymous) {
        incrementAnonCount(); 
    }

    const resultado: RespostaAPI = await response.json();
    return resultado;
};
