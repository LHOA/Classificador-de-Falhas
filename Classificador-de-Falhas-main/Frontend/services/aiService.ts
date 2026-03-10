// src/services/aiService.ts (Versão Final Completa e Corrigida - Trigger deploy)
import { FalhaInput, RespostaAPI } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface UserCredentials {
    email: string | null;
    name: string | null;
    isPremium: boolean;
}

interface RegisterResponse {
    status: string;
    message: string;
    total_uses: number;
    is_premium: boolean;
}

// --- HELPER: Obter credenciais ---
export const getUserId = (): UserCredentials => {
    const email = localStorage.getItem('user_email');
    const name = localStorage.getItem('user_name');
    const isPremium = localStorage.getItem('user_premium') === 'true';
    return { email, name, isPremium };
};

// --- 1. REGISTRAR USUÁRIO ---
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
        return await response.json();
    } catch (error) {
        console.error("Erro ao registrar no backend:", error);
        throw error;
    }
};

// --- 2. CLASSIFICAR FALHA (CHAMADA IA) ---
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

// --- 3. SALVAR REGISTRO ÚNICO (Banco de Dados) ---
export const salvarRegistroNoBackend = async (record: any): Promise<void> => {
    const { email } = getUserId();

    const payload = {
        user_email: email || "anonimo",
        tag: String(record.tag || "N/A"),
        description: String(record.description || ""),
        impact: String(record.impactCode || record.impact || "X"),
        mode_code: String(record.modeCode || ""),
        mode_desc: String(record.mode || ""),
        mech_code: String(record.mechanismCode || ""),
        mech_desc: String(record.mechanism || ""),
        det_code: String(record.detectionCode || ""),
        det_desc: String(record.detection || ""),
        confidence: Number(record.confidence || 0),
        status: String(record.status || "IA")
    };

    try {
        const response = await fetch(`${API_URL}/save-record`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Erro ao salvar no banco.");
        }
    } catch (error) {
        console.error("Erro ao salvar registro:", error);
        throw error;
    }
};

// --- 4. SALVAR LOTE (Banco de Dados) ---
export const salvarLoteNoBackend = async (records: any[]): Promise<void> => {
    const { email } = getUserId();
    if (!email) throw new Error("Usuário não identificado.");

    const payload = records.map(record => ({
        user_email: email,
        tag: String(record.tag || "N/A"),
        description: String(record.description || ""),
        impact: String(record.impactCode || record.impact || "X"),
        mode_code: String(record.modeCode || ""),
        mode_desc: String(record.mode || ""),
        mech_code: String(record.mechanismCode || ""),
        mech_desc: String(record.mechanism || ""),
        det_code: String(record.detectionCode || ""),
        det_desc: String(record.detection || ""),
        confidence: Number(record.confidence || 0),
        status: String(record.status || "IA")
    }));

    try {
        const response = await fetch(`${API_URL}/save-batch-records`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMsg = errorData?.detail
                ? (typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail))
                : `Erro HTTP ${response.status}`;
            throw new Error(errorMsg);
        }
    } catch (error: any) {
        console.error("Erro no salvamento em lote:", error);
        throw new Error(error.message || "Falha ao conectar com o servidor.");
    }
};

// --- 5. CARREGAR HISTÓRICO (Novo) ---
export const carregarHistoricoDoBackend = async (): Promise<any[]> => {
    const { email } = getUserId();
    if (!email) return [];

    try {
        const response = await fetch(`${API_URL}/history/${email}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            throw new Error("Erro ao buscar histórico.");
        }

        const data = await response.json();

        // Mapeia do formato do Banco (Snake Case) para o formato da App (Camel Case)
        return data.map((item: any) => ({
            id: item.id.toString(),
            tag: item.tag,
            description: item.description,
            impact: item.impact,
            impactCode: item.impact,

            mode: item.mode_desc,
            modeCode: item.mode_code,
            confidenceMode: 0, // Banco simplificado não salva confianças individuais

            mechanism: item.mech_desc,
            mechanismCode: item.mech_code,
            confidenceMech: 0,

            detection: item.det_desc,
            detectionCode: item.det_code,
            confidenceDet: 0,

            confidence: item.confidence,
            status: item.status,
            timestamp: new Date(item.created_at)
        }));

    } catch (error) {
        console.error("Erro ao carregar histórico:", error);
        throw error;
    }
};
