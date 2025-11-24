import React, { createContext, useState, useContext, ReactNode } from 'react';

// Tipos permitidos
export type Language = 'pt' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string; // Função de tradução simples
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt'); // Padrão Português

  // Dicionário de textos fixos da interface (títulos, botões)
  const translations = {
    pt: {
      app_name: 'Failure Map',
      input_data: 'Dados de Entrada',
      tag: 'Tag do Equipamento',
      impact: 'Impacto da Falha',
      description: 'Descrição',
      analyze_btn: 'Classificar Falha',
      analyzing: 'Analisando...',
      results: 'Resultados da IA',
      edit: 'Incorreto? Editar',
      cancel_edit: 'Cancelar Edição',
      save_btn: 'Salvar no Banco de Dados',
      waiting: 'Aguardando dados...',
      waiting_desc: 'Insira uma descrição à esquerda para gerar a classificação ISO 14224.',
      conf: 'Conf.'
    },
    en: {
      app_name: 'Failure Map',
      input_data: 'Input Data',
      tag: 'Equipment Tag',
      impact: 'Failure Impact',
      description: 'Description',
      analyze_btn: 'Classify Failure',
      analyzing: 'Analyzing...',
      results: 'AI Results',
      edit: 'Incorrect? Edit',
      cancel_edit: 'Cancel Editing',
      save_btn: 'Save to Database',
      waiting: 'Waiting for input...',
      waiting_desc: 'Enter a description on the left to generate ISO 14224 classifications.',
      conf: 'Conf.'
    }
  };

  // Função que busca o texto
  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['pt']] || key;
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
