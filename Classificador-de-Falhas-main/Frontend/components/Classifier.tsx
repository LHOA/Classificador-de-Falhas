// src/components/Classifier.tsx (Versão Compacta e Editável)
import React, { useState } from 'react';
import { BrainCircuit, Send, AlertTriangle, Sparkles, ArrowRight, Eraser, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { classificarFalha } from '../services/aiService';
import { FailureRecord, RespostaAPI } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET, MAP_IMPACTO } from '../constants';
import ClassificationResult from './ClassificationResult';

const LINKEDIN_URL = "https://www.linkedin.com/in/luishenriqueifma/";

interface ClassifierProps {
  onSave: (record: FailureRecord) => void;
  onShowRegister: () => void;
  onShowLimitReached: () => void;
  isQuotaEnforced: boolean;
}

const Classifier: React.FC<ClassifierProps> = ({ onSave, onShowRegister, onShowLimitReached, isQuotaEnforced }) => {
  const { t, language } = useLanguage();
  
  const [tag, setTag] = useState('N/A');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('X');
  
  const [loading, setLoading] = useState(false);
  // 'result' guarda todos os dados que vieram da API (as listas de possibilidades)
  const [result, setResult] = useState<RespostaAPI | null>(null);
  // 'selectedResults' guarda QUAL das opções o usuário escolheu (começa com a top 1)
  const [selectedResults, setSelectedResults] = useState<{mode: any, mech: any, det: any} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClear = () => {
    setTag('N/A');
    setDescription('');
    setImpact('X');
    setResult(null);
    setSelectedResults(null); // Limpa a seleção
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
      // Inicializa a seleção com o primeiro resultado (top 1) de cada lista
      setSelectedResults({
          mode: data.modo[0],
          mech: data.mecanismo[0],
          det: data.deteccao[0]
      });

    } catch (err: any) {
      console.error("Erro na classificação:", err);
      if (err.message === 'QUOTA_EXCEEDED') {
          onShowLimitReached();
      } else if (err.message === 'CONNECTION_ERROR') {
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

  const handleSave = () => {
    // Salva com base no que está SELECIONADO pelo usuário
    if (!result || !selectedResults) return;
    
    const newRecord: FailureRecord = {
      id: Date.now().toString(),
      tag,
      description,
      impactCode: impact,
      impact: getLabel(MAP_IMPACTO, impact),
      // Usa os dados da seleção atual
      modeCode: selectedResults.mode.codigo,
      mode: getLabel(MAP_MODE, selectedResults.mode.codigo),
      confidenceMode: selectedResults.mode.confianca,

      mechanismCode: selectedResults.mech.codigo,
      mechanism: getLabel(MAP_MECH, selectedResults.mech.codigo),
      confidenceMech: selectedResults.mech.confianca,

      detectionCode: selectedResults.det.codigo,
      detection: getLabel(MAP_DET, selectedResults.det.codigo),
      confidenceDet: selectedResults.det.confianca,

      confidence: selectedResults.mode.confianca, // Mantemos a confiança do modo como principal
      status: 'IA',
      timestamp: new Date(),
    };
    
    onSave(newRecord);
    handleClear();
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

      {/* Reduzido gap-8 para gap-6 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* --- Formulário de Entrada --- */}
        {/* Reduzido padding de p-8 para p-6 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                {t('classifier_form_title')}
            </h3>
            
            {isQuotaEnforced && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl shadow-sm animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-full flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-base font-bold text-amber-800 mb-1">{t('qm_limit_title')}</h4>
                    <p className="text-sm text-amber-700 mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('classifier_quota_exceeded') }}></p>
                    <a 
                        href={LINKEDIN_URL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                    >
                        {t('classifier_btn_contact_dev')} <ExternalLink className="w-4 h-4"/>
                    </a>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleClassify} className={`space-y-4 ${isQuotaEnforced ? 'opacity-50 pointer-events-none filter grayscale' : ''}`}>
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
                  style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.75rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: '2.5rem'}}
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
              {/* Reduzido altura para h-32 */}
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
                    disabled={loading || isQuotaEnforced}
                    className={`flex-1 bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition-transform shadow-md flex items-center justify-center gap-2 text-sm
                        ${loading ? 'opacity-80 cursor-wait' : 'hover:scale-[1.02] active:scale-[0.98]'}
                        ${isQuotaEnforced ? 'bg-slate-400 cursor-not-allowed' : ''}
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
                // Reduzido min-h e paddings
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center h-full flex flex-col items-center justify-center text-slate-400 italic border-dashed min-h-[350px]">
                    <BrainCircuit className="w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm max-w-xs">{t('classifier_no_result')}</p>
                    <ArrowRight className="w-5 h-5 mt-3 animate-bounce opacity-50" />
                </div>
            )}

             {loading && (
                // Reduzido min-h e paddings
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center h-full flex flex-col items-center justify-center min-h-[350px] shadow-sm z-10 relative overflow-hidden">
                     <div className="absolute inset-0 bg-indigo-50/50 animate-pulse"></div>
                    <div className="relative z-10">
                         <BrainCircuit className="w-16 h-16 text-indigo-600 animate-spin mb-4 mx-auto" style={{animationDuration: '3s'}} />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Analisando com IA...</h3>
                        <p className="text-slate-500 text-sm">Processando o texto e identificando padrões ISO 14224.</p>
                    </div>
                </div>
            )}

            {result && !loading && selectedResults && (
                <div className="animate-in slide-in-from-right duration-500 relative z-20">
                   {/* Passamos o resultado completo e o estado da seleção atual */}
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
