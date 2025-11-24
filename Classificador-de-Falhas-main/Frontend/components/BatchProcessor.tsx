import React, { useState, useRef } from 'react';
import { FileSpreadsheet, Upload, Download, Play, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { classificarFalha } from '../services/aiService';
import { FailureRecord, RespostaAPI } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET, MAP_IMPACTO } from '../constants';

interface BatchProcessorProps {
  onBatchComplete: (records: FailureRecord[]) => void;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onBatchComplete }) => {
  const { t, language } = useLanguage();
  
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedData, setProcessedData] = useState<FailureRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        
        // Detecção simples de separador (vírgula ou ponto e vírgula)
        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';
        
        // Remove cabeçalho e processa linhas
        // Espera-se: Tag, Description, FailureImp
        const data = lines.slice(1).map((line, index) => {
          // Regex para tratar CSV complexo (ignora separador dentro de aspas)
          // Simplificado: split direto
          const cols = line.split(separator);
          
          // Tenta ser inteligente com colunas:
          // Se tiver 3 colunas: Tag, Desc, Impacto
          // Se tiver 2: Tag, Desc (Impacto padrão X)
          let tag = 'N/A';
          let desc = '';
          let imp = 'X';

          if (cols.length >= 3) {
            tag = cols[0].trim();
            desc = cols[1].trim().replace(/^"|"$/g, ''); // Remove aspas
            imp = cols[2].trim();
          } else if (cols.length === 2) {
            tag = cols[0].trim();
            desc = cols[1].trim().replace(/^"|"$/g, '');
          }

          return { id: index, tag, description: desc, impact: imp };
        }).filter(row => row.description.length > 2); // Filtra linhas vazias/lixo

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
    setProcessing(true);
    setProgress(0);
    const results: FailureRecord[] = [];

    // Processa um por um para não travar o navegador/API
    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];
      try {
        // Chama a API (que agora retorna arrays top 3)
        const aiRes: RespostaAPI = await classificarFalha({
          tag: row.tag,
          descricao: row.description,
          impacto: row.impact
        });

        // Converte para FailureRecord (usando apenas o Top 1)
        // Helper para pegar tradução
        const getLabel = (map: any, code: string) => map[code] ? map[code][language] : code;

        const record: FailureRecord = {
          id: Date.now() + i.toString(),
          tag: row.tag,
          description: row.description,
          
          impactCode: row.impact,
          impact: getLabel(MAP_IMPACTO, row.impact),

          modeCode: aiRes.modo[0].codigo,
          mode: getLabel(MAP_MODE, aiRes.modo[0].codigo),
          confidenceMode: aiRes.modo[0].confianca,

          mechanismCode: aiRes.mecanismo[0].codigo,
          mechanism: getLabel(MAP_MECH, aiRes.mecanismo[0].codigo),
          confidenceMech: aiRes.mecanismo[0].confianca,

          detectionCode: aiRes.deteccao[0].codigo,
          detection: getLabel(MAP_DET, aiRes.deteccao[0].codigo),
          confidenceDet: aiRes.deteccao[0].confianca,

          confidence: aiRes.modo[0].confianca,
          status: 'IA',
          timestamp: new Date()
        };

        results.push(record);

      } catch (err) {
        console.error(`Erro na linha ${i}:`, err);
        // Adiciona registro de erro para não perder a linha
        results.push({
          id: Date.now() + i.toString(),
          tag: row.tag,
          description: row.description,
          impactCode: 'X', impact: 'Error',
          modeCode: 'ERR', mode: 'Erro na API', confidenceMode: 0,
          mechanismCode: 'ERR', mechanism: 'Erro', confidenceMech: 0,
          detectionCode: 'ERR', detection: 'Erro', confidenceDet: 0,
          confidence: 0, status: 'IA', timestamp: new Date()
        });
      }

      // Atualiza barra de progresso
      setProgress(Math.round(((i + 1) / previewData.length) * 100));
    }

    setProcessedData(results);
    setProcessing(false);
    
    // Opcional: Mandar para o histórico global do App
    if (onBatchComplete) {
      onBatchComplete(results);
    }
  };

  // --- 3. EXPORTAR CSV ---
  const downloadResults = () => {
    if (processedData.length === 0) return;
    
    const header = ["Tag", "Description", "Impact", "Mode Code", "Mode", "Mech Code", "Mech", "Detection", "Confidence"];
    const rows = processedData.map(r => [
      r.tag,
      `"${r.description.replace(/"/g, '""')}"`, // Escape aspas
      r.impactCode,
      r.modeCode,
      r.mode,
      r.mechanismCode,
      r.mechanism,
      r.detection,
      (r.confidence * 100).toFixed(1) + '%'
    ]);

    const csvContent = [
      header.join(';'), 
      ...rows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ISO14224_Results_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Header e Upload */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
          <FileSpreadsheet className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('nav_batch')}</h2>
        <p className="text-slate-500 max-w-lg mx-auto mb-8">
          Faça upload de um arquivo CSV contendo as colunas: <code>Tag</code>, <code>Description</code>, <code>FailureImp</code>.
        </p>

        <div className="flex justify-center gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Selecionar CSV
          </button>
          <input 
            type="file" 
            accept=".csv,.txt" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />

          {file && !processing && processedData.length === 0 && (
             <button 
               onClick={processBatch}
               className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-200"
             >
               <Play className="w-5 h-5" />
               Processar {previewData.length} Itens
             </button>
          )}

           {processedData.length > 0 && (
             <button 
               onClick={downloadResults}
               className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-200"
             >
               <Download className="w-5 h-5" />
               Baixar Resultados
             </button>
           )}
        </div>
        
        {file && <p className="mt-4 text-sm font-medium text-slate-600 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Arquivo carregado: {file.name}</p>}
        {error && <p className="mt-4 text-sm font-bold text-red-500 flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4"/> {error}</p>}
      </div>

      {/* Barra de Progresso */}
      {processing && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
            <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Processando...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Tabela de Preview / Resultados */}
      {(previewData.length > 0 || processedData.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">
            {processedData.length > 0 ? 'Resultados da Classificação' : 'Pré-visualização dos Dados'}
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-xs uppercase font-semibold text-slate-500 sticky top-0 shadow-sm">
                <tr>
                  <th className="p-4">Tag</th>
                  <th className="p-4">Description</th>
                  {processedData.length > 0 && (
                    <>
                      <th className="p-4">Mode</th>
                      <th className="p-4">Mechanism</th>
                      <th className="p-4">Conf.</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(processedData.length > 0 ? processedData : previewData).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-4 font-medium">{row.tag}</td>
                    <td className="p-4 text-slate-600 max-w-md truncate" title={row.description}>{row.description}</td>
                    {processedData.length > 0 && (
                      <>
                        <td className="p-4 text-indigo-700 font-medium">
                           {/* Se for objeto 'FailureRecord', acessa propriedades. Se for previewData, não tem essas props. */}
                           {(row as FailureRecord).modeCode} - {(row as FailureRecord).mode}
                        </td>
                        <td className="p-4 text-emerald-700">
                           {(row as FailureRecord).mechanism}
                        </td>
                        <td className="p-4 font-bold text-slate-700">
                           {((row as FailureRecord).confidence * 100).toFixed(0)}%
                        </td>
                      </>
                    )}
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
