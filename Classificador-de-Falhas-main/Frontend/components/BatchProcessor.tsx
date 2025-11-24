// src/components/BatchProcessor.tsx

import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, Download, Play, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
// Importação de todas as funções do serviço de IA
import { classificarFalha, getUserId } from '../services/aiService'; 
import { FailureRecord, RespostaAPI } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET, MAP_IMPACTO } from '../constants';

interface BatchProcessorProps {
  onBatchComplete: (records: FailureRecord[]) => void;
  // NOVO: Handlers de Quota (vindos do App.tsx)
  onShowRegister: () => void; 
  onShowLimitReached: () => void; 
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onBatchComplete, onShowRegister, onShowLimitReached }) => {
  const { t, language } = useLanguage();
  
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedData, setProcessedData] = useState<FailureRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Obtém as credenciais do localStorage na montagem/atualização
  const { email: user_email, name: user_name } = getUserId();
  const isRegistered = !!user_email;

  // --- 1. PROCESSAMENTO DO ARQUIVO CSV ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError(null);
    setProcessedData([]);
    setProgress(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';
        
        const data = lines.slice(1).map((line, index) => {
          const cols = line.split(separator);
          
          let tag = 'N/A';
          let desc = '';
          let imp = 'X';

          if (cols.length >= 3) {
            tag = cols[0].trim();
            desc = cols[1].trim().replace(/^"|"$/g, ''); 
            imp = cols[2].trim();
          } else if (cols.length === 2) {
            tag = cols[0].trim();
            desc = cols[1].trim().replace(/^"|"$/g, '');
          }

          return { id: index, tag, description: desc, impact: imp };
        }).filter(row => row.description.length > 2); 

        setPreviewData(data);
      } catch (err) {
        setError("Erro ao ler arquivo. Certifique-se que é um CSV válido (UTF-8).");
      }
    };
    reader.readAsText(uploadedFile);
  };

  // --- 2. ENVIO PARA A IA (LOOP) ---
  const processBatch = async () => {
    if (previewData.length === 0) return;
    
    // VERIFICAÇÃO CRÍTICA DE REGISTRO ANTES DE INICIAR O LOTE
    if (!isRegistered) {
      setError("O processamento em lote requer registro. Por favor, registre-se na aba Classificador.");
      onShowRegister(); // Chama o modal para forçar o registro
      return;
    }
    
    setProcessing(true);
    setProgress(0);
    const results: FailureRecord[] = [];

    // O Frontend faz a requisição inicial para reservar a quota (batch-process endpoint)
    // O Backend subtrai 10 usos do limite total aqui.
    try {
        const batchCheckResponse = await fetch(`${API_URL}/batch-process`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_email, batch_size: previewData.length }) // Enviamos o email
        });

        if (batchCheckResponse.status === 403) {
            onShowLimitReached(); // Limite atingido
            setProcessing(false);
            return;
        }
        if (!batchCheckResponse.ok) {
            throw new Error("Erro ao reservar a quota para o lote.");
        }

    } catch (err: any) {
        setError(err.message || "Erro de API desconhecido ao iniciar o lote.");
        setProcessing(false);
        return;
    }


    // LOOP PRINCIPAL DE PROCESSAMENTO
    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];
      let hasQuotaError = false;

      try {
        // INJEÇÃO DE CREDENCIAIS: O email é enviado com cada requisição individual
        const aiRes: RespostaAPI = await classificarFalha({
          tag: row.tag,
          descricao: row.description,
          impacto: row.impact,
          user_email: user_email || undefined, // Injeta o email do usuário
          user_name: user_name || undefined 
        });

        // ... (Lógica de conversão para FailureRecord) ...
        const getLabel = (map: any, code: string) => map[code] ? map[code][language] : code;
        
        const record: FailureRecord = {
          id: Date.now() + i.toString(), tag: row.tag, description: row.description,
          impactCode: row.impact, impact: getLabel(MAP_IMPACTO, row.impact),
          modeCode: aiRes.modo[0].codigo, mode: getLabel(MAP_MODE, aiRes.modo[0].codigo), confidenceMode: aiRes.modo[0].confianca,
          mechanismCode: aiRes.mecanismo[0].codigo, mechanism: getLabel(MAP_MECH, aiRes.mecanismo[0].codigo), confidenceMech: aiRes.mecanismo[0].confianca,
          detectionCode: aiRes.deteccao[0].codigo, detection: getLabel(MAP_DET, aiRes.deteccao[0].codigo), confidenceDet: aiRes.deteccao[0].confianca,
          confidence: aiRes.modo[0].confianca, status: 'IA', timestamp: new Date()
        };

        results.push(record);

      } catch (err: any) {
        console.error(`Erro na linha ${i}:`, err);
        setError(`Erro na linha ${i + 1}. Processamento interrompido.`);

        // Se o erro for de Quota (403), paramos o loop
        if (err.message === "QUOTA_EXCEEDED") {
           onShowLimitReached();
           hasQuotaError = true;
           break; 
        }
        
        results.push({ // Adiciona registro de ERRO
          id: Date.now() + i.toString(), tag: row.tag, description: row.description,
          impactCode: 'X', impact: 'Error', modeCode: 'ERR', mode: 'Erro na API', confidenceMode: 0,
          mechanismCode: 'ERR', mechanism: 'Erro', confidenceMech: 0, detectionCode: 'ERR', detection: 'Erro', confidenceDet: 0,
          confidence: 0, status: 'IA', timestamp: new Date()
        });
      }

      if (hasQuotaError) break;
      setProgress(Math.round(((i + 1) / previewData.length) * 100));
    }

    setProcessedData(results);
    setProcessing(false);
    onBatchComplete(results);
  };

  // ... (Download Results - downloadResults function is assumed to be correct) ...
  const downloadResults = () => { /* ... */ };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Header e Upload */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4"><FileSpreadsheet className="w-8 h-8" /></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('nav_batch')}</h2>
        <p className="text-slate-500 max-w-lg mx-auto mb-8">Faça upload de um arquivo CSV contendo as colunas: <code>Tag</code>, <code>Description</code>, <code>FailureImp</code>.</p>

        {/* VERIFICAÇÃO DE REGISTRO E BOTÕES */}
        <div className="flex justify-center gap-4">
          <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          
          <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg flex items-center gap-2 transition-colors"><Upload className="w-5 h-5" /> Selecionar CSV</button>
          
          {file && !isRegistered && !processing && (
            <button onClick={() => setError("Você precisa estar registrado para processar lotes.")} className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg cursor-not-allowed">
              <Lock className="w-5 h-5" /> {t('btn_analyze')} (Exige Registro)
            </button>
          )}

          {file && isRegistered && !processing && processedData.length === 0 && (
             <button onClick={processBatch} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-200">
               <Play className="w-5 h-5" /> Processar {previewData.length} Itens
             </button>
          )}

           {processedData.length > 0 && (
             <button onClick={downloadResults} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-200"><Download className="w-5 h-5" /> Baixar Resultados</button>
           )}
        </div>
        
        {file && <p className="mt-4 text-sm font-medium text-slate-600 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Arquivo carregado: {file.name}</p>}
        {error && <p className="mt-4 text-sm font-bold text-red-500 flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4"/> {error}</p>}
      </div>

      {/* Barra de Progresso e Tabela */}
      {/* ... (restante do código para Progress Bar e Tabela de Resultados) ... */}
    </div>
  );
};

export default BatchProcessor;
