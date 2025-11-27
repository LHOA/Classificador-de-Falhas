import React, { useState, useEffect } from 'react';
import { Loader2, BrainCircuit } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classifier from './components/Classifier';
import BatchProcessor from './components/BatchProcessor';
import Dictionary from './components/Dictionary';
import QuotaModal from './components/QuotaModal';
import { FailureRecord, TabView } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { registrarUsuarioNoBackend, getUserId } from './services/aiService';

// Limite global
const GLOBAL_USAGE_LIMIT = 30;
const MINIMUM_LOAD_TIME = 2500;

// O status 'trial_run' foi removido
type UserStatus = 'needs_register' | 'registered' | 'limit_reached';

const AppContent: React.FC = () => {
  const { t } = useLanguage(); 
  const [currentTab, setCurrentTab] = useState<TabView>(TabView.DASHBOARD);
  const [history, setHistory] = useState<FailureRecord[]>([]);
  
  const [userStatus, setUserStatus] = useState<UserStatus>('needs_register');
  const [showModal, setShowModal] = useState(true); 
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisteringBackend, setIsRegisteringBackend] = useState(false);

  // NOVO ESTADO: Para controlar a abertura em mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  // --- LÓGICA DE INICIALIZAÇÃO BLINDADA COM DELAY MÍNIMO ---
  useEffect(() => {
    const checkUserStatusOnLoad = async () => {
        setIsLoading(true);
        
        const timerPromise = new Promise(resolve => setTimeout(resolve, MINIMUM_LOAD_TIME));
        
        const { email, name, isPremium: initialPremiumState } = getUserId();
        
        setIsPremiumUser(initialPremiumState);

        if (email && name) {
            // 1. USUÁRIO IDENTIFICADO: Sincroniza com o Backend
            try {
                const response = await registrarUsuarioNoBackend(email, name);
                
                setIsPremiumUser(response.is_premium);
                localStorage.setItem('user_premium', response.is_premium.toString());

                if (response.is_premium) {
                    setUserStatus('registered');
                    setShowLimitMessage(false);
                } else if (response.total_uses >= GLOBAL_USAGE_LIMIT) {
                    setUserStatus('limit_reached');
                    setShowLimitMessage(true);
                } else {
                    setUserStatus('registered');
                    setShowLimitMessage(false);
                }
                setShowModal(false);

            } catch (error) {
                console.error("Erro ao sincronizar usuário ao iniciar:", error);
                if (initialPremiumState) {
                     setUserStatus('registered');
                     setShowModal(false);
                } else {
                     setUserStatus('needs_register');
                     setShowModal(true);
                }
            } finally {
                await timerPromise;
                setIsLoading(false);
            }
        } else {
            // 2. USUÁRIO ANÔNIMO: BLOQUEIO TOTAL E IMEDIATO
            setUserStatus('needs_register');
            setShowModal(true);
            await timerPromise;
            setIsLoading(false);
        }
    };

    checkUserStatusOnLoad();
  }, []);
  // ------------------------------------

  const handleShowRegister = () => {
    if (userStatus === 'limit_reached') { setShowLimitMessage(true); } 
    else { setUserStatus('needs_register'); setShowModal(true); }
  };
  
  const handleShowLimitReached = () => {
    setUserStatus('limit_reached'); setShowLimitMessage(true);
  };

  const handleRegisterSuccess = async (email: string, name: string) => {
    setIsRegisteringBackend(true);
    try {
        const response = await registrarUsuarioNoBackend(email, name);
        
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_name', name);
        localStorage.setItem('user_premium', response.is_premium.toString());
        
        setIsPremiumUser(response.is_premium);

        if (response.is_premium) {
             setUserStatus('registered');
             setShowLimitMessage(false);
        } else if (response.total_uses >= GLOBAL_USAGE_LIMIT) {
             setUserStatus('limit_reached');
             setShowLimitMessage(true);
        } else {
             setUserStatus('registered');
             setShowLimitMessage(false);
        }
        setShowModal(false);

    } catch (error) {
        alert("Houve um problema ao conectar com o servidor de registro.");
    } finally {
        setIsRegisteringBackend(false);
    }
  };

  const addRecord = (record: FailureRecord) => { setHistory(prev => [record, ...prev]); setCurrentTab(TabView.DASHBOARD); };
  const addBatchRecords = (records: FailureRecord[]) => { setHistory(prev => [...records, ...prev]); setCurrentTab(TabView.DASHBOARD); };
  
  const getTitle = () => {
    switch (currentTab) {
      case TabView.DASHBOARD: return t('nav_dashboard');
      case TabView.CLASSIFIER: return t('nav_classifier');
      case TabView.BATCH: return t('nav_batch');
      case TabView.DICTIONARY: return t('nav_dictionary');
      default: return t('app_title');
    }
  };

  if (isLoading) {
    return (
        <div className="flex h-screen bg-white items-center justify-center overflow-hidden">
            <div className="text-center animate-in fade-in duration-1000 flex flex-col items-center">
                
                <div className="w-64 h-64 mb-6 relative rounded-2xl overflow-hidden shadow-2xl border border-slate-100 p-4">
                    <img 
                        src="/loading.gif" 
                        alt="Loading Animation"
                        className="w-full h-full object-contain"
                    />
                </div>

                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Failure Map</h2>
                <p className="text-slate-500 text-sm mt-2 font-medium animate-pulse">
                    Sincronizando perfil e permissões...
                </p>
            </div>
        </div>
    );
  }

  const isQuotaEnforced = userStatus === 'limit_reached';
  const disableClassifier = userStatus === 'needs_register'; 

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden animate-in fade-in">
      
      <div className={`fixed inset-y-0 left-0 z-30 w-full max-w-[280px] md:max-w-none md:w-64 bg-slate-900 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} isPremium={isPremiumUser} onCloseMobile={() => setIsSidebarOpen(false)} />
      </div>

      {isSidebarOpen && (
          <div className="fixed inset-0 z-20 bg-slate-900/50 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}
      
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        
        <header className="md:hidden h-16 flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-sm z-10">
           <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 hover:text-indigo-600">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
             </svg>
           </button>
           <span className="text-xl font-bold text-slate-900">{getTitle()}</span>
           <div className="w-6 h-6"></div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           
           {/* BLOQUEIO TOTAL AQUI SE NECESSÁRIO REGISTRO */}
           {disableClassifier && !showModal && !showLimitMessage && (
             <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold shadow-lg animate-bounce">
                    Clique para Registrar e Acessar
                </button>
             </div>
           )}

           <div className="max-w-7xl mx-auto">
            <div className="mb-6 hidden md:block">
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
                isQuotaEnforced={isQuotaEnforced}
              />
            )}
            
            {currentTab === TabView.BATCH && (
              <BatchProcessor 
                 onBatchComplete={addBatchRecords}
                 onShowRegister={handleShowRegister}
                 onShowLimitReached={handleShowLimitReached}
                 isRegistered={userStatus === 'registered' || isPremiumUser}
              />
            )}
            
            {currentTab === TabView.DICTIONARY && <Dictionary />}
           </div>
        </main>
      </div>
      
      {/* Modais */}
      {showModal && userStatus === 'needs_register' && !showLimitMessage && (
        <QuotaModal 
          onRegister={handleRegisterSuccess}
          onClose={() => {}} 
          showContactMessage={false}
          isRegistering={isRegisteringBackend}
        />
      )}
      
      {showLimitMessage && (
        <QuotaModal 
          onRegister={handleRegisterSuccess}
          onClose={() => setShowLimitMessage(false)}
          showContactMessage={true}
          isRegistering={false} 
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
