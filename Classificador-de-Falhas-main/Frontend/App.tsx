import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classifier from './components/Classifier';
import BatchProcessor from './components/BatchProcessor';
import Dictionary from './components/Dictionary';
import QuotaModal from './components/QuotaModal'; // <--- NOVO
import { FailureRecord, TabView } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

// Enum para status do usuário
type UserStatus = 'anonymous' | 'needs_register' | 'registered' | 'limit_reached';

// --- COMPONENTE INTERNO COM A LÓGICA DE ESTADO ---
const AppContent: React.FC = () => {
  const { t } = useLanguage(); 
  const [currentTab, setCurrentTab] = useState<TabView>(TabView.DASHBOARD);
  const [history, setHistory] = useState<FailureRecord[]>([]);
  
  // ESTADO CRÍTICO DE QUOTA
  const [userStatus, setUserStatus] = useState<UserStatus>('anonymous');
  const [showModal, setShowModal] = useState(false);
  const [showLimitMessage, setShowLimitMessage] = useState(false);


  // --- FUNÇÕES DE GERENCIAMENTO DE ESTADO ---

  // 1. Verifica o LocalStorage na Inicialização
  useEffect(() => {
    const email = localStorage.getItem('user_email');
    const anonCount = parseInt(localStorage.getItem('anon_eval_count') || '0', 10);
    
    if (email) {
        setUserStatus('registered');
    } else if (anonCount >= 5) {
        // Se já passou de 5 usos e não registrou, mostra o modal
        setUserStatus('needs_register');
    }
  }, []);

  // 2. Handlers para o Classifier/Batch chamar
  const handleShowRegister = () => {
    // Quando Classifier diz: "Ei, atingi o limite de 5 usos anônimos"
    setUserStatus('needs_register');
    setShowModal(true);
  };
  
  const handleShowLimitReached = () => {
    // Quando o Backend diz: "Ei, o usuário registrado atingiu o limite de 10"
    setUserStatus('limit_reached');
    setShowLimitMessage(true); // Mostra o modal com a mensagem de contato
  };

  const handleRegisterSuccess = (email: string, name: string) => {
    // Chamado pelo QuotaModal.tsx após o registro bem-sucedido
    localStorage.setItem('user_email', email);
    localStorage.setItem('user_name', name);
    // Remove o contador anônimo para não interferir
    localStorage.removeItem('anon_eval_count'); 
    
    setUserStatus('registered');
    setShowModal(false);
    setShowLimitMessage(false);
  };

  // 3. Funções de Manipulação de Dados (Mantidas)
  const addRecord = (record: FailureRecord) => {
    setHistory(prev => [record, ...prev]);
    setCurrentTab(TabView.DASHBOARD);
  };

  const addBatchRecords = (records: FailureRecord[]) => {
    setHistory(prev => [...records, ...prev]);
    setCurrentTab(TabView.DASHBOARD);
  };

  const getTitle = () => {
    // ... (Mantida a lógica de tradução do título) ...
    switch (currentTab) {
      case TabView.DASHBOARD: return t('nav_dashboard');
      case TabView.CLASSIFIER: return t('nav_classifier');
      case TabView.BATCH: return t('nav_batch');
      case TabView.DICTIONARY: return t('nav_dictionary');
      default: return t('app_title');
    }
  };

  // 4. Lógica de Quota para o Classificador
  const isQuotaEnforced = userStatus === 'limit_reached';
  
  // O Classifier deve ser desabilitado se o status for 'needs_register' (forçando a abertura do modal)
  const disableClassifier = userStatus === 'needs_register'; 

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* ... (Header e main) ... */}
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
           <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 capitalize">
                {getTitle()}
              </h2>
            </div>

            {currentTab === TabView.DASHBOARD && <Dashboard data={history} />}
            {currentTab === TabView.CLASSIFIER && (
              <Classifier 
                onSave={addRecord} 
                onShowRegister={handleShowRegister} // <--- NOVO
                onShowLimitReached={handleShowLimitReached} // <--- NOVO
                isQuotaEnforced={isQuotaEnforced || disableClassifier} // <--- NOVO
              />
            )}
            {currentTab === TabView.BATCH && (
              <BatchProcessor 
                 onBatchComplete={addBatchRecords}
                 // Batch também precisa de checagem de status aqui
              />
            )}
            {currentTab === TabView.DICTIONARY && <Dictionary />}
           </div>
        </main>
      </div>
      
      {/* 5. RENDERIZAÇÃO CONDICIONAL DOS MODAIS */}
      {(showModal || userStatus === 'needs_register') && (
        <QuotaModal 
          onRegister={handleRegisterSuccess}
          onClose={() => setShowModal(false)}
          showContactMessage={false}
        />
      )}
      
      {showLimitMessage && (
        <QuotaModal 
          onRegister={handleRegisterSuccess}
          onClose={() => setShowLimitMessage(false)}
          showContactMessage={true} // Diz ao modal para mostrar a mensagem de limite atingido
        />
      )}
    </div>
  );
};

// --- COMPONENTE PAI QUE ENVOLVE TUDO ---
const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
