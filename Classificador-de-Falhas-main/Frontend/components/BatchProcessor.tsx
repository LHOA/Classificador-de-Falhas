import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, Download, Play, AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { classificarFalha, getUserId } from '../services/aiService'; 
import { FailureRecord, RespostaAPI } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET, MAP_IMPACTO } from '../constants';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface BatchProcessorProps {
  onBatchComplete: (records: FailureRecord[]) => void;
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
  
  const { email: user_email, name: user_name } = getUserId();
  const isRegistered = !!user_email;

  const getLabel = (map: any, code: string) => map[code] ? map[code][language] : code;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile); setError(null); setProcessedData([]); setProgress(0);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        const separator = lines[0].includes(';') ? ';' : ',';
        const data = lines.slice(1).map((line, index) => {
          const cols = line.split(separator);
          let tag = 'N/A', desc = '', imp = 'X';
          if (cols.length >= 2) {
             tag = cols[0].trim();
             desc = cols[1].trim().replace(/^"|"$/g, '');
             if (cols.length > 2) imp = cols[2].trim();
          }
          return { id: index, tag, description: desc, impact: imp };
        }).filter(row => row.description.length > 2);
        setPreviewData(data);
      } catch (err) { setError("Erro ao ler CSV."); }
    };
    reader.readAsText(uploadedFile);
  };

  const processBatch = async () => {
    if (previewData.length === 0 || !isRegistered) return;
    setProcessing(true); setProgress(0);
    const results: FailureRecord[] = [];

    try {
        // RESERVA QUOTA
        const res = await fetch(`${API_URL}/batch-process`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_email, batch_size: previewData.length }) 
        });
        if (res.status === 403) { onShowLimitReached(); setProcessing(false); return; }
        if (!res.ok) throw new Error("Erro na reserva de quota.");
    } catch (err: any) {
        setError(err.message); setProcessing(false); return;
    }

    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];
      try {
        const aiRes: RespostaAPI = await classificarFalha({
          tag: row.tag, descricao: row.description, impacto: row.impact,
          user_email: user_email || undefined, user_name: user_name || undefined // O Backend já descontou no batch-process, mas mandamos p/ log
        });
        
        results.push({
          id: Date.now() + i.toString(), tag: row.tag, description: row.description,
          impactCode: row.impact, impact: getLabel(MAP_IMPACTO, row.impact),
          modeCode: aiRes.modo[0].codigo, mode: getLabel(MAP_MODE, aiRes.modo[0].codigo), confidenceMode: aiRes.modo[0].confianca,
          mechanismCode: aiRes.mecanismo[0].codigo, mechanism: getLabel(MAP_MECH, aiRes.mecanismo[0].codigo), confidenceMech: aiRes.mecanismo[0].confianca,
          detectionCode: aiRes.deteccao[0].codigo, detection: getLabel(MAP_DET, aiRes.deteccao[0].codigo), confidenceDet: aiRes.deteccao[0].confianca,
          confidence: aiRes.modo[0].confianca, status: 'IA', timestamp: new Date()
        });
      } catch (err: any) {
        console.error(`Linha ${i} falhou:`, err);
        results.push({ 
            id: Date.now() + i.toString(), tag: row.tag, description: row.description, impactCode: 'X', impact: 'Error', 
            modeCode: 'ERR', mode: 'Erro API', confidenceMode: 0, mechanismCode: 'ERR', mechanism: 'Erro', confidenceMech: 0,
            detectionCode: 'ERR', detection: 'Erro', confidenceDet: 0, confidence: 0, status: 'IA', timestamp: new Date()
        });
      }
      setProgress(Math.round(((i + 1) / previewData.length) * 100));
    }
    setProcessedData(results); setProcessing(false); onBatchComplete(results);
  };

  const downloadResults = () => {
      if (processedData.length === 0) return;
      const header = ["Tag", "Description", "Impact", "Mode", "Mech", "Det", "Conf"];
      const rows = processedData.map(r => [r.tag, `"${r.description}"`, r.impactCode, r.mode, r.mechanism, r.detection, (r.confidence*100).toFixed(0)+'%']);
      const csvContent = ["\uFEFF" + header.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
      link.download = `Resultados_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('nav_batch')}</h2>
        <div className="flex justify-center gap-4 mt-6">
          <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white border hover:bg-slate-50 rounded-lg flex gap-2"><Upload className="w-5 h-5"/> Selecionar CSV</button>
          
          {file && !isRegistered && !processing && (
            <button onClick={onShowRegister} className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg flex gap-2 shadow-lg"><Lock className="w-5 h-5" /> Exige Registro</button>
          )}
          {file && isRegistered && !processing && processedData.length === 0 && (
             <button onClick={processBatch} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg flex gap-2 shadow-lg"><Play className="w-5 h-5" /> Processar</button>
          )}
           {processedData.length > 0 && (
             <button onClick={downloadResults} className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg flex gap-2 shadow-lg"><Download className="w-5 h-5" /> Baixar</button>
           )}
        </div>
        {file && <p className="mt-4 text-sm text-slate-600">Arquivo: {file.name}</p>}
        {error && <p className="mt-4 text-sm font-bold text-red-500">{error}</p>}
      </div>
      {processing && <div className="bg-white p-6 rounded-xl border shadow-sm"><div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden"><div className="bg-indigo-600 h-full transition-all" style={{ width: `${progress}%` }}></div></div><p className="text-center mt-2 text-slate-600">{progress}%</p></div>}
      
      {(processedData.length > 0 || previewData.length > 0) && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 font-bold text-slate-500 sticky top-0"><tr><th className="p-3">Tag</th><th className="p-3">Desc</th>{processedData.length > 0 && <><th className="p-3">Mode</th><th className="p-3">Mech</th></>}</tr></thead>
                    <tbody>
                        {(processedData.length > 0 ? processedData : previewData).map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 border-b last:border-0">
                                <td className="p-3 font-medium">{row.tag}</td>
                                <td className="p-3 truncate max-w-xs">{row.description}</td>
                                {processedData.length > 0 && <><td className="p-3 text-indigo-700">{(row as FailureRecord).mode}</td><td className="p-3 text-emerald-700">{(row as FailureRecord).mechanism}</td></>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default BatchProcessor;
