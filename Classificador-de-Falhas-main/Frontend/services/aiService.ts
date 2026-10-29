// Cliente HTTP da API do Failure Map.
// Sem autenticação e sem cota: a aplicação é open source e roda 100% local.
import { FalhaInput, RespostaAPI } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// --- 1. CLASSIFICAR FALHA ---
export const classificarFalha = async (dados: FalhaInput): Promise<RespostaAPI> => {
    let response: Response;
    try {
        response = await fetch(`${API_URL}/classificar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados),
        });
    } catch {
        throw new Error('CONNECTION_ERROR');
    }

    if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as RespostaAPI;
};

// --- 2. SALVAR REGISTRO ÚNICO ---
export const salvarRegistroNoBackend = async (record: any): Promise<void> => {
    const payload = {
        tag: String(record.tag || 'N/A'),
        description: String(record.description || ''),
        impact: String(record.impactCode || record.impact || 'S'),
        mode_code: String(record.modeCode || ''),
        mode_desc: String(record.mode || ''),
        mech_code: String(record.mechanismCode || ''),
        mech_desc: String(record.mechanism || ''),
        det_code: String(record.detectionCode || ''),
        det_desc: String(record.detection || ''),
        confidence: Number(record.confidence || 0),
        status: String(record.status || 'IA'),
    };

    const response = await fetch(`${API_URL}/save-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || 'Erro ao salvar no banco.');
    }
};

// --- 3. SALVAR LOTE ---
export const salvarLoteNoBackend = async (records: any[]): Promise<void> => {
    const payload = records.map((record) => ({
        tag: String(record.tag || 'N/A'),
        description: String(record.description || ''),
        impact: String(record.impactCode || record.impact || 'S'),
        mode_code: String(record.modeCode || ''),
        mode_desc: String(record.mode || ''),
        mech_code: String(record.mechanismCode || ''),
        mech_desc: String(record.mechanism || ''),
        det_code: String(record.detectionCode || ''),
        det_desc: String(record.detection || ''),
        confidence: Number(record.confidence || 0),
        status: String(record.status || 'IA'),
    }));

    const response = await fetch(`${API_URL}/save-batch-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail = errorData?.detail;
        const msg = typeof detail === 'string' ? detail : JSON.stringify(detail ?? {});
        throw new Error(msg || `Erro HTTP ${response.status}`);
    }
};

// --- 4. HISTÓRICO ---
export const carregarHistoricoDoBackend = async (): Promise<any[]> => {
    const response = await fetch(`${API_URL}/history?limit=50`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        throw new Error('Erro ao buscar histórico.');
    }

    const data = await response.json();

    // Banco (snake_case) -> App (camelCase)
    return data.map((item: any) => ({
        id: String(item.id),
        tag: item.tag,
        description: item.description,
        impact: item.impact,
        impactCode: item.impact,

        mode: item.mode_desc,
        modeCode: item.mode_code,
        confidenceMode: 0, // o histórico guarda só a confiança do modo principal

        mechanism: item.mech_desc,
        mechanismCode: item.mech_code,
        confidenceMech: 0,

        detection: item.det_desc,
        detectionCode: item.det_code,
        confidenceDet: 0,

        confidence: item.confidence,
        status: item.status,
        timestamp: new Date(item.created_at),
    }));
};
