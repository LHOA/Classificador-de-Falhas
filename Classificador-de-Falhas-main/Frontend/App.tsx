// src/App.tsx (Versão: Registro Obrigatório no Início)
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classifier from './components/Classifier';
import BatchProcessor from './components/BatchProcessor';
import Dictionary from './components/Dictionary';
import QuotaModal from './components/QuotaModal';
import { FailureRecord, TabView } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

// Enum para status do usuário
// Removemos 'anonymous' pois não existe mais esse estado intermediário
type UserStatus = 'needs_register' | 'registered' | 'limit_reached';

const AppContent: React.FC = () => {
  const { t } = useLanguage(); 
  const [currentTab, setCurrentTab] = useState<TabView>(TabView.DASHBOARD);
  const [history, setHistory] = useState<FailureRecord[]>([]);
  
  // Estado inicial agora é 'needs_register' até provar o contrário
  const [userStatus, setUserStatus] = useState<UserStatus>('needs_register');
  // O modal já começa aberto se não estiver registrado
  const [showModal, setShowModal] = useState(false);
  const [showLimitMessage, setShowLimitMessage] = useState(false);

  // --- 1. LÓGICA NOVA: Verifica Registro na Inicialização ---
  useEffect(() => {
    const email = localStorage.getItem('user_email');
    
    if (email) {
        // Se já tem email salvo, está registrado.
        setUserStatus('registered');
        setShowModal(false);
    } else {
        // Se NÃO tem email, força o registro imediatamente.
        setUserStatus('needs_register');
        setShowModal(true);
    }
    // Removemos qualquer menção a 'anon_eval_count'
  }, []);
  // ----------------------------------------------------------

  // Handlers de Quota
  const handleShowRegister = () => {
    // Esse handler agora é menos usado, pois o registro é forçado no início,
    // mas mantemos para casos onde o usuário talvez limpe o cache com o app aberto.
    setUserStatus('needs_register');
    setShowModal(true);
  };
  
  const handleShowLimitReached = () => {
    setUserStatus('limit_reached');
    setShowLimitMessage(true);
  };

  const handleRegisterSuccess = (email: string, name: string) => {
    localStorage.setItem('user_email', email);
    localStorage.setItem('user_name', name);
    // Não precisamos mais limpar 'anon_eval_count' pois não o usamos.
    
    setUserStatus('registered');
    setShowModal(false);
    setShowLimitMessage(false);
  };

  // Funções de Dados
  const addRecord = (record: FailureRecord) => {
    setHistory(prev => [record, ...prev]);
    setCurrentTab(TabView.DASHBOARD);
  };

  const addBatchRecords = (records: FailureRecord[]) => {
    setHistory(prev => [...records, ...prev]);
    setCurrentTab(TabView.DASHBOARD);
  };

  const getTitle = () => {
    switch (currentTab) {
      case TabView.DASHBOARD: return t('nav_dashboard');
      case TabView.CLASSIFIER: return t('nav_classifier');
      case TabView.BATCH: return t('nav_batch');
      case TabView.DICTIONARY: return t('nav_dictionary');
      default: return t('app_title');
    }
  };

  const isQuotaEnforced = userStatus === 'limit_reached';
  // Se precisa registrar, desabilita o classificador
  const disableClassifier = userStatus === 'needs_register'; 

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* <Header /> */}
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {/* Adicionei um overlay para bloquear a tela se não estiver registrado */}
           {disableClassifier && !showModal && (
             <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-lg animate-bounce">
                    Clique para Registrar e Acessar
                </button>
             </div>
           )}

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
                onShowRegister={handleShowRegister} 
                onShowLimitReached={handleShowLimitReached} 
                isQuotaEnforced={isQuotaEnforced || disableClassifier}
              />
            )}
            
            {currentTab === TabView.BATCH && (
              <BatchProcessor 
                 onBatchComplete={addBatchRecords}
                 onShowRegister={handleShowRegister}
                 onShowLimitReached={handleShowLimitReached}
              />
            )}
            
            {currentTab === TabView.DICTIONARY && <Dictionary />}
           </div>
        </main>
      </div>
      
      {/* Modais */}
      {/* O modal de registro agora não tem botão de fechar (X) se for o registro inicial obrigatório */}
      {showModal && userStatus === 'needs_register' && (
        <QuotaModal 
          onRegister={handleRegisterSuccess}
          // Passamos uma função vazia para o onClose se o registro for obrigatório,
          // impedindo que o usuário feche o modal clicando fora ou no X (se houver).
          onClose={() => {}} 
          showContactMessage={false}
        />
      )}
      
      {showLimitMessage && (
        <QuotaModal 
          onRegister={handleRegisterSuccess}
          onClose={() => setShowLimitMessage(false)}
          showContactMessage={true}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
