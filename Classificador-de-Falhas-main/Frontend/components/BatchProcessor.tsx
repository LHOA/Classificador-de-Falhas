// src/components/BatchProcessor.tsx (Versão com limite de 20 itens e correção de loop)
import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, Play, AlertCircle, CheckCircle2, 
  Loader2, Lock, FileText, BarChart3, HardDriveUpload, Download, AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { classificarFalha, getUserId } from '../services/aiService'; 
import { FailureRecord, RespostaAPI } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET, MAP_IMPACTO } from '../constants';

// Limite definido no frontend para o lote gratuito
const FREE_BATCH_LIMIT = 20;

interface BatchProcessorProps {
  onBatchComplete: (records: FailureRecord[]) => void;
  onShowRegister: () => void; 
  onShowLimitReached: () => void;
  isRegistered: boolean; // Mantemos a prop para UI inicial, mas checamos localStorage no clique
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onBatchComplete, onShowRegister, onShowLimitReached, isRegistered }) => {
  const { t, language } = useLanguage();
  
  // Estados de UI
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedData, setProcessedData] = useState<FailureRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ success: 0, fail: 0, skipped: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check simples para renderização inicial do botão
  const { email: initialEmail } = getUserId();
  const showPlayButton = isRegistered || !!initialEmail;

  const getLabel = (map: any, code: string) => {
    if (!map || !code) return code;
    if (map[code] && map[code][language]) {
        return map[code][language];
    }
    return code;
  };

  // --- MANIPULAÇÃO DE ARQUIVOS ---
  const handleDrag = (e: React.DragEvent) => { /* ... (código igual) ... */
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => { /* ... (código igual) ... */
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... (código igual) ... */
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const processFile = (uploadedFile: File) => {
    setFile(uploadedFile); setError(null); setProcessedData([]); setProgress(0);
    setStats({ success: 0, fail: 0, skipped: 0 });

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) throw new Error("Arquivo vazio ou sem dados.");
        const separator = lines[0].includes(';') ? ';' : ',';
        const data = lines.slice(1).map((line, index) => {
          const cols = line.split(separator);
          let tag = 'N/A', desc = '', imp = 'X';
          if (cols.length >= 2) {
             tag = cols[0].trim(); desc = cols[1].trim().replace(/^"|"$/g, '');
             if (cols.length > 2) imp = cols[2].trim();
          }
          return { id: index, tag, description: desc, impact: imp };
        }).filter(row => row.description.length > 2);
        setPreviewData(data);
      } catch (err) {
        setError("Erro ao ler arquivo. Use CSV UTF-8 separado por vírgula ou ponto-e-vírgula.");
        setFile(null);
      }
    };
    reader.readAsText(uploadedFile);
  };

  // --- PROCESSAMENTO (NOVA LÓGICA DE LIMITE 20) ---
  const processBatch = async () => {
    if (previewData.length === 0) return;

    // 1. CHECK FINAL DE REGISTRO NO MOMENTO DO CLIQUE
    const { email: user_email, name: user_name } = getUserId();
    if (!user_email) {
        // Se não tiver email salvo agora, abre o registro e para.
        onShowRegister();
        return;
    }

    setProcessing(true);
    setProgress(0);
    const results: FailureRecord[] = [];
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let hitBackendLimit = false;

    // (Opcional) Você pode remover a chamada ao /batch-process aqui se quiser
    // confiar apenas na lógica do loop abaixo e no limite global do backend.

    // 2. LOOP DE PROCESSAMENTO COM LIMITE DE 20
    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];
      
      // --- REGRA DOS 20 PRIMEIROS ---
      if (i >= FREE_BATCH_LIMIT) {
          results.push({ 
            id: Date.now() + i.toString(), tag: row.tag, description: row.description, impactCode: row.impact, impact: getLabel(MAP_IMPACTO, row.impact), 
            modeCode: 'LIMIT', mode: t('Limit Reached (Max 20)'), confidenceMode: 0, 
            mechanismCode: 'LIMIT', mechanism: t('Contact Developer'), confidenceMech: 0,
            detectionCode: 'LIMIT', detection: t('For Unlimited Access'), confidenceDet: 0, 
            confidence: 0, status: 'IA', timestamp: new Date()
        });
        skippedCount++;
        setProgress(Math.round(((i + 1) / previewData.length) * 100));
        continue; // Pula para o próximo sem chamar a API
      }

      try {
        // Chama a API apenas para os primeiros 20
        const aiRes: RespostaAPI = await classificarFalha({
          tag: row.tag, descricao: row.description, impacto: row.impact,
          user_email: user_email, user_name: user_name
        });
        
        // ... (criação do registro de sucesso - código igual ao anterior) ...
        results.push({
          id: Date.now() + i.toString(), tag: row.tag, description: row.description, impactCode: row.impact, impact: getLabel(MAP_IMPACTO, row.impact),
          modeCode: aiRes.modo[0].codigo, mode: getLabel(MAP_MODE, aiRes.modo[0].codigo), confidenceMode: aiRes.modo[0].confianca,
          mechanismCode: aiRes.mecanismo[0].codigo, mechanism: getLabel(MAP_MECH, aiRes.mecanismo[0].codigo), confidenceMech: aiRes.mecanismo[0].confianca,
          detectionCode: aiRes.deteccao[0].codigo, detection: getLabel(MAP_DET, aiRes.deteccao[0].codigo), confidenceDet: aiRes.deteccao[0].confianca,
          confidence: aiRes.modo[0].confianca, status: 'IA', timestamp: new Date()
        });
        successCount++;

      } catch (err: any) {
        console.error(`Linha ${i} falhou:`, err);
        // Se o backend bloquear (atingiu o limite total de 30), paramos tudo.
        if (err.message === "QUOTA_EXCEEDED") {
           hitBackendLimit = true;
           break; 
        }
        failCount++;
        // ... (criação do registro de erro genérico) ...
        results.push({ id: Date.now() + i.toString(), tag: row.tag, description: row.description, impactCode: 'X', impact: 'Erro', modeCode: 'ERR', mode: 'Erro API', confidenceMode: 0, mechanismCode: 'ERR', mechanism: 'Erro', confidenceMech: 0, detectionCode: 'ERR', detection: 'Erro', confidenceDet: 0, confidence: 0, status: 'IA', timestamp: new Date() });
      }
      setProgress(Math.round(((i + 1) / previewData.length) * 100));
    }

    setStats({ success: successCount, fail: failCount, skipped: skippedCount });
    setProcessedData(results);
    setProcessing(false);
    onBatchComplete(results);

    // Se pulou itens ou bateu no limite do backend, mostra o modal no final
    if (skippedCount > 0 || hitBackendLimit) {
        onShowLimitReached();
    }
  };

  // --- DOWNLOAD (Código igual) ---
  const downloadResults = () => { /* ... */ };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* ... (Header e Upload iguais) ... */}
      
      <div className="p-8">
            {/* ... (Drag & Drop Area igual) ... */}
            {!file ? ( /* ... */ ) : (
                /* FILE SELECTED VIEW */
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* ... (Info do arquivo igual) ... */}
                    
                    <div className="flex gap-3">
                        <button onClick={() => setFile(null)} className="px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
                            Trocar Arquivo
                        </button>
                        
                        {/* LÓGICA SIMPLIFICADA DO BOTÃO */}
                        {!processing && processedData.length === 0 && (
                            showPlayButton ? (
                                <button onClick={processBatch} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105">
                                    <Play className="w-4 h-4" /> Iniciar Análise (Máx {FREE_BATCH_LIMIT})
                                </button>
                            ) : (
                                <button onClick={onShowRegister} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg flex items-center gap-2">
                                    <Lock className="w-4 h-4" /> Registro Necessário
                                </button>
                            )
                        )}
                    </div>
                </div>
            )}
            {/* ... (Erro de leitura igual) ... */}
      </div>

      {/* ... (Progress Section igual) ... */}

      {/* --- RESULTS SECTION (Com nova estatística de "Pulados") --- */}
      {processedData.length > 0 && (
        <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* ... (Total e Sucesso iguais) ... */}
                
                {/* NOVO CARD: ITENS PULADOS PELO LIMITE */}
                {stats.skipped > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><AlertTriangle className="w-6 h-6"/></div>
                        <div><p className="text-xs uppercase font-bold text-slate-400">Limite Atingido</p><p className="text-2xl font-bold text-slate-800">{stats.skipped}</p></div>
                    </div>
                )}
                
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-xl shadow-lg text-white flex flex-col justify-center items-center cursor-pointer hover:scale-[1.02] transition-transform" onClick={downloadResults}>
                    <Download className="w-8 h-8 mb-2" />
                    <span className="font-bold">Baixar Relatório CSV</span>
                </div>
            </div>

            {/* Table (Rows com estilo diferente se for limite atingido) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-left text-sm">
                        {/* ... (Thead igual) ... */}
                        <tbody className="divide-y divide-slate-100">
                            {processedData.map((row, i) => {
                                const isLimitRow = row.modeCode === 'LIMIT';
                                return (
                                <tr key={i} className={`transition-colors ${isLimitRow ? 'bg-amber-50/50 hover:bg-amber-100/50' : 'hover:bg-indigo-50/30'}`}>
                                    <td className="p-4 font-bold text-slate-700">{row.tag}</td>
                                    <td className="p-4 text-slate-600 truncate max-w-xs" title={row.description}>{row.description}</td>
                                    
                                    {/* Células com estilo condicional */}
                                    <td className={`p-4 font-medium ${isLimitRow ? 'text-amber-700 italic' : 'text-indigo-700'}`}>{row.mode}</td>
                                    <td className={`p-4 ${isLimitRow ? 'text-amber-700 italic' : 'text-emerald-700'}`}>{row.mechanism}</td>
                                    <td className="p-4">
                                        {isLimitRow ? (
                                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-800">-</span>
                                        ) : (
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold 
                                                ${row.confidence > 0.8 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {(row.confidence * 100).toFixed(0)}%
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default BatchProcessor;
