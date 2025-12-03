// src/services/aiService.ts (Atualizado com suporte a Premium)
import { FalhaInput, RespostaAPI } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Interface atualizada para incluir o status premium
export interface UserCredentials {
    email: string | null;
    name: string | null;
    isPremium: boolean; // Novo campo
}

// Interface atualizada para a resposta do registro
interface RegisterResponse {
    status: string;
    message: string;
    total_uses: number;
    is_premium: boolean; // Novo campo vindo do Python
}

// Obtém credenciais e status premium salvos no localStorage
export const getUserId = (): UserCredentials => {
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    // O localStorage salva tudo como string, então comparamos com "true"
    const isPremium = localStorage.getItem('user_premium') === 'true';
    return { email, name, isPremium };
};

// --- FUNÇÃO DE REGISTRO ---
export const registrarUsuarioNoBackend = async (email: string, name: string): Promise<RegisterResponse> => {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Erro no registro: ${response.status}`);
        }

        // Retorna o JSON que agora inclui is_premium
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
        // Não precisamos enviar isPremium aqui, o backend verifica no banco
    };

    let response;
    try {
        response = await fetch(`${API_URL}/classificar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
// --- NOVA FUNÇÃO: SALVAR REGISTRO DE FALHA ---
export const salvarRegistroNoBackend = async (record: any): Promise<void> => {
    // Pega o email atual para garantir autoria
    const { email } = getUserId();
    
    // Prepara o payload compatível com o modelo Python FailureLog
    const payload = {
        user_email: email || "anonimo",
        tag: record.tag,
        description: record.description,
        impact: record.impact, // ou impactCode, dependendo do que você quer salvar
        mode_code: record.modeCode,
        mode_desc: record.mode,
        mech_code: record.mechanismCode,
        mech_desc: record.mechanism,
        det_code: record.detectionCode,
        det_desc: record.detection,
        confidence: record.confidence,
        status: record.status
        // created_at é gerado pelo banco
    };

    try {
        const response = await fetch(`${API_URL}/save-record`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error("Erro ao salvar no banco de dados.");
        }
    } catch (error) {
        console.error("Erro ao salvar registro:", error);
        throw error; // Repassa o erro para o componente mostrar feedback
    }
};
