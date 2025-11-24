import React, { createContext, useState, useContext, ReactNode } from 'react';

// Tipos permitidos
export type Language = 'pt' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt');

  // --- DICIONÁRIO COMPLETO DE TRADUÇÕES ---
  const translations: Record<Language, Record<string, string>> = {
    pt: {
      // Navegação (Menu e Títulos)
      nav_dashboard: 'Visão Geral',
      nav_classifier: 'Classificador IA',
      nav_batch: 'Processar em Lote',
      nav_dictionary: 'Dicionário de Códigos',
      app_title: 'Failure Map',
      profile_role: 'Eng. Mecânico | Confiabilidade',
      
      // Classificador - Entrada
      input_title: 'Dados de Entrada',
      label_tag: 'Tag do Equipamento',
      label_impact: 'Impacto da Falha',
      label_desc: 'Descrição da Falha',
      placeholder_tag: 'ex: P-102-A',
      placeholder_desc: 'Descreva a falha (ex: Vibração alta no mancal do motor devido a desalinhamento)',
      btn_analyze: 'Classificar Falha',
      btn_analyzing: 'Analisando...',
      
      // Classificador - Resultados
      results_title: 'Resultados da IA',
      btn_edit: 'Incorreto? Editar',
      btn_cancel_edit: 'Cancelar Edição',
      label_mode: 'Modo de Falha',
      label_mech: 'Mecanismo de Falha',
      label_det: 'Método de Detecção',
      btn_save: 'Salvar no Banco de Dados',
      
      // Estado Vazio
      waiting_title: 'Aguardando dados...',
      waiting_desc: 'Insira uma descrição à esquerda para gerar a classificação ISO 14224.',
      conf: 'Conf.'
    },
    en: {
      // Navigation
      nav_dashboard: 'Analytical Overview',
      nav_classifier: 'AI Classifier',
      nav_batch: 'Batch Processing',
      nav_dictionary: 'Code Dictionary',
      app_title: 'Failure Map',
      profile_role: 'Mech. Eng | Reliability',

      // Classifier - Input
      input_title: 'Input Data',
      label_tag: 'Equipment Tag',
      label_impact: 'Failure Impact',
      label_desc: 'Failure Description',
      placeholder_tag: 'e.g., P-102-A',
      placeholder_desc: 'Describe the failure (e.g., High vibration detected on motor bearing due to misalignment)',
      btn_analyze: 'Classify Failure',
      btn_analyzing: 'Analyzing...',

      // Classifier - Results
      results_title: 'AI Results',
      btn_edit: 'Incorrect? Edit',
      btn_cancel_edit: 'Cancel Editing',
      label_mode: 'Failure Mode',
      label_mech: 'Failure Mechanism',
      label_det: 'Detection Method',
      btn_save: 'Save to Database',

      // Empty State
      waiting_title: 'Waiting for input...',
      waiting_desc: 'Enter a description on the left to generate ISO 14224 classifications.',
      conf: 'Conf.'
    }
  };

  const t = (key: string) => {
    // Se a chave não existir, retorna a própria chave para avisar que falta tradução
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage deve ser usado dentro de um LanguageProvider');
  return context;
};
