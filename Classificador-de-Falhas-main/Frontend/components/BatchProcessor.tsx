// src/components/BatchProcessor.tsx (Versão Final com Salvar Lote)
import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, Upload, Download, Play, AlertCircle, CheckCircle2, 
  Loader2, Lock, FileText, BarChart3, HardDriveUpload, AlertTriangle, CloudUpload
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
// Importamos a nova função de salvar lote
import { classificarFalha, getUserId, salvarLoteNoBackend } from '../services/aiService'; 
import { FailureRecord, RespostaAPI } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET, MAP_IMPACTO } from '../constants';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const FREE_BATCH_LIMIT = 20;

interface BatchProcessorProps {
  onBatchComplete: (records: FailureRecord[]) => void;
  onShowRegister: () => void; 
  onShowLimitReached: () => void;
  isPremium: boolean;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onBatchComplete, onShowRegister, onShowLimitReached, isPremium }) => {
  const { t, language } = useLanguage();
  
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedData, setProcessedData] = useState<FailureRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ success: 0, fail: 0, skipped: 0 });
  
  // Estado para controlar o salvamento no banco
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { email: userEmailOnLoad } = getUserId();
  const isEffectivelyRegistered = !!userEmailOnLoad;

  const getLabel = (map: any, code: string) => {
    if (!map || !code) return code;
    if (map[code] && map[code][language]) { return map[code][language]; }
    return code;
  };

  // --- MANIPULAÇÃO DE ARQUIVOS ---
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.type === "dragenter" || e.type === "dragover") setDragActive(true); else if (e.type === "dragleave") setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) processFile(e.target.files[0]); };
  
  const processFile = (uploadedFile: File) => {
    setFile(uploadedFile); setError(null); setProcessedData([]); setProgress(0); setStats({ success: 0, fail: 0, skipped: 0 });
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
          if (cols.length >= 2) { tag = cols[0].trim(); desc = cols[1].trim().replace(/^"|"$/g, ''); if (cols.length > 2) imp = cols[2].trim(); }
          return { id: index, tag, description: desc, impact: imp };
        }).filter(row => row.description.length > 2);
        setPreviewData(data);
      } catch (err) { setError("Erro ao ler arquivo. Use CSV UTF-8 separado por vírgula ou ponto-e-vírgula."); setFile(null); }
    };
    reader.readAsText(uploadedFile);
  };

  // --- PROCESSAMENTO ---
  const processBatch = async () => {
    if (previewData.length === 0) return;
    const { email: user_email, name: user_name } = getUserId();
    if (!user_email) { onShowRegister(); return; }

    setProcessing(true); setProgress(0); setIsSaving(false);
    const results: FailureRecord[] = [];
    let successCount = 0; let failCount = 0; let skippedCount = 0; let hitBackendLimit = false;

    if (!isPremium) {
        try {
            const batchCheckResponse = await fetch(`${API_URL}/batch-process`, {
                method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_email, batch_size: previewData.length }) 
            });
            if (batchCheckResponse.status === 403) { onShowLimitReached(); setProcessing(false); return; }
            if (!batchCheckResponse.ok) throw new Error("Erro ao reservar quota.");
        } catch (err: any) { setError(err.message || "Erro de API ao iniciar."); setProcessing(false); return; }
    }

    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];
      
      if (!isPremium && i >= FREE_BATCH_LIMIT) {
          results.push({ id: Date.now() + i.toString(), tag: row.tag, description: row.description, impactCode: row.impact, impact: getLabel(MAP_IMPACTO, row.impact), 
            modeCode: 'LIMIT', mode: t('qm_limit_title'), confidenceMode: 0, mechanismCode: 'LIMIT', mechanism: t('qm_btn_contact_dev'), detectionCode: 'LIMIT', detection: t('qm_limit_text'), confidenceDet: 0, confidence: 0, status: 'IA', timestamp: new Date() });
        skippedCount++; setProgress(Math.round(((i + 1) / previewData.length) * 100)); continue;
      }

      try {
        const aiRes: RespostaAPI = await classificarFalha({ tag: row.tag, descricao: row.description, impacto: row.impact, user_email: user_email, user_name: user_name });
        const record: FailureRecord = { id: Date.now() + i.toString(), tag: row.tag, description: row.description, impactCode: row.impact, impact: getLabel(MAP_IMPACTO, row.impact), modeCode: aiRes.modo[0].codigo, mode: getLabel(MAP_MODE, aiRes.modo[0].codigo), confidenceMode: aiRes.modo[0].confianca, mechanismCode: aiRes.mecanismo[0].codigo, mechanism: getLabel(MAP_MECH, aiRes.mecanismo[0].codigo), confidenceMech: aiRes.mecanismo[0].confianca, detectionCode: aiRes.deteccao[0].codigo, detection: getLabel(MAP_DET, aiRes.deteccao[0].codigo), confidenceDet: aiRes.deteccao[0].confianca, confidence: aiRes.modo[0].confianca, status: 'IA', timestamp: new Date() };
        results.push(record); successCount++;
      } catch (err: any) {
        if (err.message === "QUOTA_EXCEEDED") { hitBackendLimit = true; break; }
        failCount++; results.push({ id: Date.now() + i.toString(), tag: row.tag, description: row.description, impactCode: 'X', impact: 'Erro', modeCode: 'ERR', mode: 'Erro API', confidenceMode: 0, mechanismCode: 'ERR', mechanism: 'Erro', confidenceMech: 0, detectionCode: 'ERR', detection: 'Erro', confidenceDet: 0, confidence: 0, status: 'IA', timestamp: new Date() });
      }
      if (hitBackendLimit) break;
      setProgress(Math.round(((i + 1) / previewData.length) * 100));
    }

    setStats({ success: successCount, fail: failCount, skipped: skippedCount });
    setProcessedData(results); setProcessing(false); onBatchComplete(results);
    if (skippedCount > 0 || hitBackendLimit) { onShowLimitReached(); }
  };

  const downloadResults = () => {
      if (processedData.length === 0) return;
      const header = ["Tag", "Description", "Impact", "Mode Code", "Mode", "Mech Code", "Mech", "Detection", "Confidence"];
      const rows = processedData.map(r => [r.tag, `"${r.description.replace(/"/g, '""')}"`, r.impactCode, r.modeCode, r.mode, r.mechanismCode, r.mechanism, r.detection, (r.confidence*100).toFixed(1)+'%']);
      const csvContent = ["\uFEFF" + header.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
      link.download = `Analise_IA_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
  };

  // --- NOVO: HANDLER PARA SALVAR NO BANCO ---
  const handleBatchSave = async () => {
      // Filtra apenas os sucessos (remove erros e limites)
      const validRecords = processedData.filter(r => r.status === 'IA' && r.modeCode !== 'ERR' && r.modeCode !== 'LIMIT');
      
      if (validRecords.length === 0) return;

      setIsSaving(true);
      try {
          await salvarLoteNoBackend(validRecords);
          alert(`${validRecords.length} registros salvos com sucesso na base de conhecimento!`);
          // Opcional: Atualizar dashboard local onBatchComplete(validRecords);
      } catch (error) {
          alert("Erro ao salvar no banco de dados.");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* ... Header (Mantido Igual) ... */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 text-white text-center">
            <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4"><FileSpreadsheet className="w-8 h-8 text-white" /></div>
            <h2 className="text-3xl font-bold mb-2">{t('nav_batch')}</h2>
            <p className="text-indigo-100 max-w-xl mx-auto text-sm">Processe centenas de falhas em segundos. A IA classifica automaticamente Modos, Mecanismos e Métodos de Detecção.</p>
        </div>
        <div className="p-8">
            {!file ? (
                <div className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer ${dragActive ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                    <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputRef} onChange={handleFileInput} />
                    <HardDriveUpload className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-indigo-600' : 'text-slate-300'}`} />
                    <p className="text-lg font-medium text-slate-700">Arraste seu arquivo CSV aqui</p>
                    <p className="text-sm text-slate-400 mt-2">ou clique para selecionar do computador</p>
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-full font-mono"><FileText className="w-3 h-3" /> Tag, Description, FailureImp</div>
                </div>
            ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><FileSpreadsheet className="w-6 h-6" /></div><div><h4 className="font-bold text-slate-800">{file.name}</h4><p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB • {previewData.length} linhas detectadas</p></div></div>
                    <div className="flex gap-3">
                        <button onClick={() => setFile(null)} className="px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">Trocar Arquivo</button>
                        {!processing && processedData.length === 0 && (
                            isEffectivelyRegistered ? (
                                <button onClick={processBatch} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105"><Play className="w-4 h-4" /> Iniciar Análise {isPremium ? '(Ilimitado)' : `(Máx ${FREE_BATCH_LIMIT})`}</button>
                            ) : (
                                <button onClick={onShowRegister} className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg flex items-center gap-2"><Lock className="w-4 h-4" /> Registro Necessário</button>
                            )
                        )}
                    </div>
                </div>
            )}
            {error && (<div className="mt-6 p-4 bg-red-50 border-l-4 border-red-200 rounded-lg flex items-start gap-3 text-red-700"><AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /><div><p className="font-bold">Não foi possível processar o arquivo</p><p className="text-sm opacity-90">{error}</p></div></div>)}
        </div>
      </div>

      {processing && <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-pulse"><div className="flex justify-between items-end mb-2"><div><h3 className="font-bold text-slate-800 flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> Processando IA...</h3><p className="text-sm text-slate-500">Isso pode levar alguns segundos.</p></div><span className="text-2xl font-bold text-indigo-600">{progress}%</span></div><div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden"><div className="bg-indigo-600 h-full transition-all duration-300 ease-out rounded-full" style={{ width: `${progress}%` }}></div></div></div>}
      
      {processedData.length > 0 && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4"><div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><BarChart3 className="w-6 h-6"/></div><div><p className="text-xs uppercase font-bold text-slate-400">Total Processado</p><p className="text-2xl font-bold text-slate-800">{processedData.length}</p></div></div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4"><div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle2 className="w-6 h-6"/></div><div><p className="text-xs uppercase font-bold text-slate-400">Sucesso</p><p className="text-2xl font-bold text-slate-800">{stats.success}</p></div></div>
                {stats.skipped > 0 && (<div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex items-center gap-4"><div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><AlertTriangle className="w-6 h-6"/></div><div><p className="text-xs uppercase font-bold text-slate-400">Limite Atingido</p><p className="text-2xl font-bold text-slate-800">{stats.skipped}</p></div></div>)}
                
                {/* BOTÕES DE AÇÃO FINAIS */}
                <div className="flex flex-col gap-2">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-lg shadow-lg text-white flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform" onClick={downloadResults}>
                        <Download className="w-5 h-5" /><span className="font-bold text-sm">Baixar CSV</span>
                    </div>
                    <button 
                        onClick={handleBatchSave} 
                        disabled={isSaving}
                        className={`p-3 rounded-lg shadow-lg text-white flex items-center justify-center gap-2 transition-transform ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02]'}`}
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <CloudUpload className="w-5 h-5" />}
                        <span className="font-bold text-sm">{isSaving ? 'Salvando...' : 'Salvar no Banco'}</span>
                    </button>
                </div>
            </div>

            {/* ... (Tabela mantida igual) ... */}
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 font-bold text-slate-500 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 w-24">Tag</th>
                                <th className="p-4 w-1/3">Descrição</th>
                                <th className="p-4">Modo de Falha</th>
                                <th className="p-4">Mecanismo</th>
                                <th className="p-4 w-24">Conf.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedData.map((row, i) => {
                                const isLimitRow = row.modeCode === 'LIMIT';
                                return (
                                <tr key={i} className={`transition-colors ${isLimitRow ? 'bg-amber-50/50 hover:bg-amber-100/50' : 'hover:bg-indigo-50/30'}`}>
                                    <td className="p-4 font-bold text-slate-700">{row.tag}</td>
                                    <td className="p-4 text-slate-600 truncate max-w-xs" title={row.description}>{row.description}</td>
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
