// src/components/Classifier.tsx (Versão Final com Salvamento no Banco de Dados)
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BrainCircuit, Send, AlertTriangle, Sparkles, ArrowRight, Eraser } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
// IMPORTANTE: Importar a função de salvar
import { classificarFalha, salvarRegistroNoBackend } from '../services/aiService';
import { FailureRecord, RespostaAPI } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET, MAP_IMPACTO } from '../constants';
import ClassificationResult from './ClassificationResult';

interface ClassifierProps {
  onSave: () => void;
}

const Classifier: React.FC<ClassifierProps> = ({ onSave }) => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  const [tag, setTag] = useState('N/A');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('S');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RespostaAPI | null>(null);
  const [selectedResults, setSelectedResults] = useState<{ mode: any, mech: any, det: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClear = () => {
    setTag('N/A');
    setDescription('');
    setImpact('S');
    setResult(null);
    setSelectedResults(null);
    setError(null);
  };

  const handleClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedResults(null);

    try {
      const data = await classificarFalha({ tag, descricao: description, impacto: impact });
      setResult(data);
      // Inicializa a seleção com o Top 1
      setSelectedResults({
        mode: data.modo[0],
        mech: data.mecanismo[0],
        det: data.deteccao[0]
      });

    } catch (err: any) {
      console.error("Erro na classificação:", err);
      if (err.message === 'CONNECTION_ERROR') {
        setError(t('error_connection'));
      } else {
        setError(t('error_generic_api'));
      }
    } finally {
      setLoading(false);
    }
  };

  const getLabel = (map: any, code: string) => {
    if (!map || !code) return code;
    if (map[code] && map[code][language]) {
      return map[code][language];
    }
    return code;
  };

  // --- LÓGICA DE SALVAMENTO CONECTADA AO BANCO ---
  const handleSave = async () => {
    if (!result || !selectedResults) return;

    setLoading(true); // Bloqueia a tela enquanto salva

    try {
      // Verifica se o usuário mudou a sugestão da IA (Top 1)
      const isHumanModified =
        selectedResults.mode.codigo !== result.modo[0].codigo ||
        selectedResults.mech.codigo !== result.mecanismo[0].codigo ||
        selectedResults.det.codigo !== result.deteccao[0].codigo;

      const newRecord: FailureRecord = {
        id: Date.now().toString(),
        tag,
        description,
        impactCode: impact,
        impact: getLabel(MAP_IMPACTO, impact),

        // Usa a seleção atual do usuário
        modeCode: selectedResults.mode.codigo,
        mode: getLabel(MAP_MODE, selectedResults.mode.codigo),
        confidenceMode: selectedResults.mode.confianca,

        mechanismCode: selectedResults.mech.codigo,
        mechanism: getLabel(MAP_MECH, selectedResults.mech.codigo),
        confidenceMech: selectedResults.mech.confianca,

        detectionCode: selectedResults.det.codigo,
        detection: getLabel(MAP_DET, selectedResults.det.codigo),
        confidenceDet: selectedResults.det.confianca,

        confidence: selectedResults.mode.confianca,
        status: isHumanModified ? 'Human' : 'IA', // Define se foi curadoria humana ou IA pura
        timestamp: new Date(),
      };

      // 1. Salva no Banco de Dados (PostgreSQL)
      await salvarRegistroNoBackend(newRecord);

      // 2. Feedback e Limpeza
      alert("Registro salvo com sucesso na base de conhecimento!");
      handleClear();

      // 3. Atualiza o Dashboard localmente via React Query e redireciona
      queryClient.invalidateQueries({ queryKey: ['history'] });
      onSave();

    } catch (error) {
      console.error(error);
      alert("Erro ao salvar registro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 px-2">

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-full mb-3">
          <BrainCircuit className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('classifier_title')}</h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          {t('classifier_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* --- Formulário de Entrada --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            {t('classifier_form_title')}
          </h3>

          <form onSubmit={handleClassify} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">Tag (ID)</label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
                  placeholder="Ex: P-101A"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('field_impact')}</label>
                <select
                  value={impact}
                  onChange={(e) => setImpact(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none bg-white text-sm"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.75rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: '2.5rem' }}
                >
                  {Object.entries(MAP_IMPACTO).map(([key, label]) => (
                    <option key={key} value={key}>
                      {key} - {label[language]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('field_description')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl h-32 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none leading-relaxed shadow-sm text-sm"
                placeholder={t('classifier_placeholder')}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClear}
                disabled={loading || (!description && tag === 'N/A')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm"
              >
                <Eraser className="w-5 h-5" /> {t('btn_clear')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition-transform shadow-md flex items-center justify-center gap-2 text-sm
                        ${loading ? 'opacity-80 cursor-wait' : 'hover:scale-[1.02] active:scale-[0.98]'}
                    `}
              >
                {loading ? (
                  <>
                    <BrainCircuit className="w-5 h-5 animate-pulse" /> {t('btn_analyzing')}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" /> {t('btn_classify')}
                  </>
                )}
              </button>
            </div>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl flex items-center gap-3 animate-in fade-in text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* --- Resultados --- */}
        <div className="relative lg:sticky lg:top-6 transition-all">
          {!result && !loading && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center h-full flex flex-col items-center justify-center text-slate-400 italic border-dashed min-h-[350px]">
              <BrainCircuit className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm max-w-xs">{t('classifier_no_result')}</p>
              <ArrowRight className="w-5 h-5 mt-3 animate-bounce opacity-50" />
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center h-full flex flex-col items-center justify-center min-h-[350px] shadow-sm z-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-indigo-50/50 animate-pulse"></div>
              <div className="relative z-10">
                <BrainCircuit className="w-16 h-16 text-indigo-600 animate-spin mb-4 mx-auto" style={{ animationDuration: '3s' }} />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Analisando com IA...</h3>
                <p className="text-slate-500 text-sm">Processando o texto e identificando padrões ISO 14224.</p>
              </div>
            </div>
          )}

          {result && !loading && selectedResults && (
            <div className="animate-in slide-in-from-right duration-500 relative z-20">
              <ClassificationResult
                resultApi={result}
                selected={selectedResults}
                setSelected={setSelectedResults}
                onSave={handleSave}
                onCancel={handleClear}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Classifier;
