// src/components/Classifier.tsx (CORRIGIDO - Passando onCancel)
import React, { useState } from 'react';
import { BrainCircuit, Send, AlertTriangle, Sparkles, ArrowRight, Eraser, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { classificarFalha } from '../services/aiService';
import { FailureRecord, RespostaAPI } from '../types';
import { MAP_MODE, MAP_MECH, MAP_DET, MAP_IMPACTO } from '../constants';
// O erro acontece aqui porque este arquivo não existe ainda:
import ClassificationResult from './ClassificationResult';

// SEU LINK DO LINKEDIN AQUI
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
  const [result, setResult] = useState<RespostaAPI | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Essa é a função que vamos passar para o componente filho
  const handleClear = () => {
    setTag('N/A');
    setDescription('');
    setImpact('X');
    setResult(null);
    setError(null);
  };

  const handleClassify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await classificarFalha({ tag, descricao: description, impacto: impact });
      setResult(data);
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
    if (!result) return;
    
    const newRecord: FailureRecord = {
      id: Date.now().toString(),
      tag,
      description,
      impactCode: impact,
      impact: getLabel(MAP_IMPACTO, impact),
      modeCode: result.modo[0].codigo,
      mode: getLabel(MAP_MODE, result.modo[0].codigo),
      confidenceMode: result.modo[0].confianca,
      mechanismCode: result.mecanismo[0].codigo,
      mechanism: getLabel(MAP_MECH, result.mecanismo[0].codigo),
      confidenceMech: result.mecanismo[0].confianca,
      detectionCode: result.deteccao[0].codigo,
      detection: getLabel(MAP_DET, result.deteccao[0].codigo),
      confidenceDet: result.deteccao[0].confianca,
      confidence: result.modo[0].confianca,
      status: 'IA',
      timestamp: new Date(),
    };
    
    onSave(newRecord);
    handleClear();
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-100 rounded-full mb-4">
            <BrainCircuit className="w-10 h-10 text-indigo-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">{t('classifier_title')}</h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          {t('classifier_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* --- Formulário de Entrada --- */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                {t('classifier_form_title')}
            </h3>
            
            {isQuotaEnforced && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-8 rounded-r-xl shadow-sm animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-full flex-shrink-0">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h4 className="text-lg font-bold text-amber-800 mb-2">{t('qm_limit_title')}</h4>
                    <p className="text-amber-700 mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('classifier_quota_exceeded') }}></p>
                    <a 
                        href={LINKEDIN_URL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-md"
                    >
                        {t('classifier_btn_contact_dev')} <ExternalLink className="w-4 h-4"/>
                    </a>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleClassify} className={`space-y-6 ${isQuotaEnforced ? 'opacity-50 pointer-events-none filter grayscale' : ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-2">Tag (ID)</label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
                  placeholder="Ex: P-101A"
                />
              </div>
              <div className="md:col-span-2">
                 <label className="block text-sm font-bold text-slate-700 mb-2">{t('field_impact')}</label>
                 <select
                  value={impact}
                  onChange={(e) => setImpact(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none bg-white"
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
              <label className="block text-sm font-bold text-slate-700 mb-2">
                {t('field_description')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 border border-slate-300 rounded-xl h-40 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none leading-relaxed shadow-sm"
                placeholder={t('classifier_placeholder')}
                required
              />
            </div>

            <div className="flex gap-4 pt-2">
                <button
                    type="button"
                    onClick={handleClear}
                    disabled={loading || (!description && tag === 'N/A')}
                    className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                    <Eraser className="w-5 h-5" /> {t('btn_clear')}
                </button>
                <button
                    type="submit"
                    disabled={loading || isQuotaEnforced}
                    className={`flex-1 bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-transform shadow-md flex items-center justify-center gap-2
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
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl flex items-center gap-3 animate-in fade-in">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{error}</p>
            </div>
            )}
        </div>

        {/* --- Resultados --- */}
        <div className="relative">
            {!result && !loading && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center h-full flex flex-col items-center justify-center text-slate-400 italic border-dashed min-h-[400px]">
                    <BrainCircuit className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg max-w-xs">{t('classifier_no_result')}</p>
                    <ArrowRight className="w-6 h-6 mt-4 animate-bounce opacity-50" />
                </div>
            )}

             {loading && (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px] shadow-sm z-10 relative overflow-hidden">
                     <div className="absolute inset-0 bg-indigo-50/50 animate-pulse"></div>
                    <div className="relative z-10">
                         <BrainCircuit className="w-20 h-20 text-indigo-600 animate-spin mb-6 mx-auto" style={{animationDuration: '3s'}} />
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Analisando com IA...</h3>
                        <p className="text-slate-500">Processando o texto e identificando padrões ISO 14224.</p>
                    </div>
                </div>
            )}

            {result && !loading && (
                <div className="animate-in slide-in-from-right duration-500 relative z-20">
                   {/* AQUI ESTÁ A CORREÇÃO: Passando onCancel */}
                   <ClassificationResult result={result} onSave={handleSave} onCancel={handleClear} />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Classifier;
