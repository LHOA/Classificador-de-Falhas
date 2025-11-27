import React, { createContext, useState, useContext, ReactNode } from 'react';

export type Language = 'pt' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt');

  const translations: Record<Language, Record<string, string>> = {
    pt: {
      // Navegação
      nav_dashboard: 'Visão Geral',
      nav_classifier: 'Classificador IA',
      nav_batch: 'Processar em Lote',
      nav_dictionary: 'Dicionário de Códigos',
      app_title: 'Failure Map',
      profile_role: 'Eng. Mecânico | Confiabilidade',

      // Dashboard
      dash_total: 'Total de Registros',
      dash_critical: 'Falhas Críticas',
      dash_impact_title: 'Distribuição por Impacto',
      dash_mode_title: 'Top 5 Modos de Falha',
      dash_mech_title: 'Top 5 Mecanismos de Falha',
      dash_insight_title: 'Insights da Análise',
      dash_insight_critical: 'das falhas são críticas (Dead/Serious).',
      dash_insight_mode: 'é o modo de falha mais recorrente.',
      dash_legend_toggle: 'Mostrar Legenda',
      dash_recent: 'Análises Recentes',
      btn_download: 'Baixar Histórico (CSV)',

      // --- Quota Modal (Novo) ---
      qm_welcome_title: "Bem-vindo ao Failure Map",
      qm_welcome_text: "Para acessar a plataforma gratuitamente, por favor, identifique-se. Isso nos ajuda a manter o serviço seguro para a comunidade.",
      qm_label_name: "Seu Nome",
      qm_placeholder_name: "Como gostaria de ser chamado?",
      qm_label_email: "Seu E-mail Profissional",
      qm_placeholder_email: "exemplo@empresa.com",
      qm_error_email_invalid: "Por favor, insira um endereço de e-mail válido.",
      qm_error_name_required: "Por favor, informe seu nome.",
      qm_btn_access_platform: "Acessar Plataforma",
      qm_welcome_disclaimer: "Seus dados são usados apenas para controle de acesso e estatísticas de uso anônimas.",

      // --- Quota Limit Reached ---
      qm_limit_title: "Limite de Uso Livre Atingido",
      // Usamos HTML para destacar o nome e permitir quebra de linha
      qm_limit_text: "Você atingiu o limite inicial de análises livres.<br/><br/>A plataforma é <strong>totalmente gratuita</strong>, mas para liberar o acesso ilimitado e termos um melhor controle da comunidade, por favor, entre em contato com o desenvolvedor:",
      qm_developer_name: "Luis Henrique Oliveira",
      qm_btn_contact_dev: "Contatar Desenvolvedor (LinkedIn)",

      // --- Quota Modal Success Step ---
      qm_success_title: "Cadastro Realizado!",
      qm_welcome_user_prefix: "Seja muito bem-vindo(a),",
      // Nota: Usamos tags HTML <strong> aqui porque o componente agora suporta com dangerouslySetInnerHTML
      qm_community_msg_1: "Esta plataforma é um <strong>projeto totalmente gratuito</strong> para a comunidade de engenharia e manutenção.",
      qm_community_msg_2: "Bom proveito! Qualquer feedback ou contribuição com bases de dados de falhas reais é super bem-vindo para aprimorarmos a ferramenta para todos.",
      qm_btn_start_using: "Começar a Usar Agora",
      qm_btn_processing_register: "Processando Registro...",

      // --- Classifier Component ---
      // MUDOU: Texto mais explicativo com negrito
      classifier_quota_exceeded: "Limite de uso livre atingido. Para continuar usando de forma <strong>totalmente gratuita</strong>, com acesso ilimitado, por favor, contate o desenvolvedor para liberar seu cadastro.",
      // NOVO: Texto do botão
      classifier_btn_contact_dev: "Contatar Desenvolvedor (LinkedIn)",
      classifier_title: 'Classificador de Falhas IA (ISO 14224)',
      classifier_subtitle: 'Insira a descrição da falha para obter a classificação padronizada de Modo, Mecanismo e Método de Detecção.',
      classifier_form_title: 'Dados de Entrada',
      classifier_placeholder: 'Descreva a falha com o máximo de detalhes possível. Ex: Vibração excessiva no mancal do lado acoplado da bomba P-102A, causando ruído anormal e aumento de temperatura, indicando possível desalinhamento ou desgaste do rolamento.',
      classifier_no_result: 'Aguardando dados... Insira a descrição da falha ao lado para gerar a classificação.',

      // Classificador (Legado - podem ser removidos se não usados mais no Classifier.tsx)
      input_title: 'Dados de Entrada',
      label_tag: 'Tag do Equipamento',
      label_impact: 'Impacto da Falha',
      label_desc: 'Descrição da Falha',
      placeholder_tag: 'ex: P-102-A',
      placeholder_desc: 'Descreva a falha (ex: Vibração alta no mancal do motor devido a desalinhamento)',
      btn_analyze: 'Classificar Falha',
      btn_analyzing: 'Analisando...',
      results_title: 'Resultados da IA',
      btn_edit: 'Incorreto? Editar',
      btn_cancel_edit: 'Cancelar Edição',
      label_mode: 'Modo de Falha',
      label_mech: 'Mecanismo de Falha',
      label_det: 'Método de Detecção',
      btn_save: 'Salvar no Banco de Dados',
      waiting_title: 'Aguardando dados...',
      waiting_desc: 'Insira uma descrição à esquerda para gerar a classificação ISO 14224.',
      conf: 'Conf.',
      btn_clear: 'Limpar',
      btn_classify: 'Classificar com IA',
      field_impact: 'Impacto',
      field_description: 'Descrição Detalhada',
      error_connection: 'Erro de conexão com o servidor.',
      error_generic_api: 'Erro ao processar a solicitação.'
    },
    en: {
      // Navigation
      nav_dashboard: 'Analytical Overview',
      nav_classifier: 'AI Classifier',
      nav_batch: 'Batch Processing',
      nav_dictionary: 'Code Dictionary',
      app_title: 'Failure Map',
      profile_role: 'Mech. Eng | Reliability',

      // Dashboard
      dash_total: 'Total Records',
      dash_critical: 'Critical Failures',
      dash_impact_title: 'Impact Distribution',
      dash_mode_title: 'Top 5 Failure Modes',
      dash_mech_title: 'Top 5 Failure Mechanisms',
      dash_insight_title: 'Analysis Insights',
      dash_insight_critical: 'of failures are critical (Dead/Serious).',
      dash_insight_mode: 'is the most recurring failure mode.',
      dash_legend_toggle: 'Show Legend',
      dash_recent: 'Recent Analysis',
      btn_download: 'Download History (CSV)',

      // --- Quota Modal (New) ---
      qm_welcome_title: "Welcome to Failure Map",
      qm_welcome_text: "To access the platform for free, please identify yourself. This helps us keep the service secure for the community.",
      qm_label_name: "Your Name",
      qm_placeholder_name: "How would you like to be called?",
      qm_label_email: "Your Professional Email",
      qm_placeholder_email: "example@company.com",
      qm_error_email_invalid: "Please enter a valid email address.",
      qm_error_name_required: "Please enter your name.",
      qm_btn_access_platform: "Access Platform",
      qm_welcome_disclaimer: "Your data is used only for access control and anonymous usage statistics.",

      // --- Quota Modal Success Step ---
      qm_success_title: "Registration Complete!",
      qm_welcome_user_prefix: "A warm welcome,",
      // Note: Using HTML <strong> tags here
      qm_community_msg_1: "This platform is a <strong>completely free project</strong> for the engineering and maintenance community.",
      qm_community_msg_2: "Enjoy! Any feedback or contribution with real failure databases is highly welcome to improve the tool for everyone.",
      qm_btn_start_using: "Start Using Now",
      qm_btn_processing_register: "Processing Registration...",

      // --- Quota Limit Reached ---
      qm_limit_title: "Free Usage Limit Reached",
      qm_limit_text: "You have reached the initial limit of free analyses.<br/><br/>The platform is <strong>completely free</strong>, but to unlock unlimited access and for better community control, please contact the developer:",
      qm_developer_name: "Luis Henrique Oliveira",
      qm_btn_contact_dev: "Contact Developer (LinkedIn)",

      // --- Classifier Component ---
      // CHANGED: More explanatory text with bold
      classifier_quota_exceeded: "Free usage limit reached. To continue using it <strong>completely for free</strong> with unlimited access, please contact the developer to unlock your account.",
      // NEW: Button label
      classifier_btn_contact_dev: "Contact Developer (LinkedIn)",
      classifier_title: 'AI Failure Classifier (ISO 14224)',
      classifier_subtitle: 'Enter the failure description to get standard classification for Mode, Mechanism, and Detection Method.',
      classifier_form_title: 'Input Data',
      classifier_placeholder: 'Describe the failure in as much detail as possible. E.g: Excessive vibration on the coupling side bearing of pump P-102A, causing abnormal noise and temperature increase, indicating possible misalignment or bearing wear.',
      classifier_no_result: 'Waiting for data... Enter the failure description on the side to generate classification.',

      // Classifier (Legacy)
      input_title: 'Input Data',
      label_tag: 'Equipment Tag',
      label_impact: 'Failure Impact',
      label_desc: 'Failure Description',
      placeholder_tag: 'e.g., P-102-A',
      placeholder_desc: 'Describe the failure (e.g., High vibration detected on motor bearing due to misalignment)',
      btn_analyze: 'Classify Failure',
      btn_analyzing: 'Analyzing...',
      results_title: 'AI Results',
      btn_edit: 'Incorrect? Edit',
      btn_cancel_edit: 'Cancel Editing',
      label_mode: 'Failure Mode',
      label_mech: 'Failure Mechanism',
      label_det: 'Detection Method',
      btn_save: 'Save to Database',
      waiting_title: 'Waiting for input...',
      waiting_desc: 'Enter a description on the left to generate ISO 14224 classifications.',
      conf: 'Conf.',
      btn_clear: 'Clear',
      btn_classify: 'Classify with AI',
      field_impact: 'Impact',
      field_description: 'Detailed Description',
      error_connection: 'Connection error with server.',
      error_generic_api: 'Error processing request.'
    }
  };

  const t = (key: string) => {
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
