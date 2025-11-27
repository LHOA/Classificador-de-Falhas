// src/App.tsx (Versão Final com Lógica Premium Completa)
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classifier from './components/Classifier';
import BatchProcessor from './components/BatchProcessor';
import Dictionary from './components/Dictionary';
import QuotaModal from './components/QuotaModal';
import { FailureRecord, TabView } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { registrarUsuarioNoBackend, getUserId } from './services/aiService';

// Limite global para usuários FREE
const GLOBAL_USAGE_LIMIT = 30;

type UserStatus = 'needs_register' | 'registered' | 'limit_reached';

const AppContent: React.FC = () => {
  const { t } = useLanguage(); 
  const [currentTab, setCurrentTab] = useState<TabView>(TabView.DASHBOARD);
  const [history, setHistory] = useState<FailureRecord[]>([]);
  
  const [userStatus, setUserStatus] = useState<UserStatus>('needs_register');
  const [showModal, setShowModal] = useState(true); 
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  
  // --- NOVO ESTADO PREMIUM ---
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisteringBackend, setIsRegisteringBackend] = useState(false);

  // --- LÓGICA DE INICIALIZAÇÃO ---
  useEffect(() => {
    const checkUserStatusOnLoad = async () => {
        setIsLoading(true);
        // Usa a função auxiliar que já lê tudo
        const { email, name, isPremium: initialPremiumState } = getUserId();
        
        // Define estado inicial baseado no cache local
        setIsPremiumUser(initialPremiumState);

        if (email && name) {
            try {
                // Sincroniza com o backend para ter certeza
                const response = await registrarUsuarioNoBackend(email, name);
                
                // Atualiza estado e cache com a resposta fresca do servidor
                setIsPremiumUser(response.is_premium);
                localStorage.setItem('user_premium', response.is_premium.toString());

                // --- LÓGICA PRINCIPAL DE ACESSO ---
                if (response.is_premium) {
                    // Se é PREMIUM, está sempre liberado, não importa o total_uses
                    setUserStatus('registered');
                    setShowLimitMessage(false);
                } else if (response.total_uses >= GLOBAL_USAGE_LIMIT) {
                    // Se é FREE e passou do limite, bloqueia
                    setUserStatus('limit_reached');
                    setShowLimitMessage(true);
                } else {
                    // Se é FREE e ainda tem quota, libera
                    setUserStatus('registered');
                    setShowLimitMessage(false);
                }
                setShowModal(false);

            } catch (error) {
                console.error("Erro de sincronização. Usando estado local por segurança.");
                // Se falhar a sincronização, confiamos no cache local se existir, senão pedimos registro
                if (initialPremiumState) {
                     setUserStatus('registered');
                     setShowModal(false);
                } else {
                     setUserStatus('needs_register');
                     setShowModal(true);
                }
            } finally {
                setIsLoading(false);
            }
        } else {
            setUserStatus('needs_register');
            setShowModal(true);
            setIsLoading(false);
        }
    };

    checkUserStatusOnLoad();
  }, []);

  // ... (handleShowRegister e handleShowLimitReached permanecem iguais)
  const handleShowRegister = () => {
    if (userStatus === 'limit_reached') { setShowLimitMessage(true); } 
    else { setUserStatus('needs_register'); setShowModal(true); }
  };
  const handleShowLimitReached = () => {
    setUserStatus('limit_reached'); setShowLimitMessage(true);
  };

  // --- HANDLER DE SUCESSO NO REGISTRO (Atualizado) ---
  const handleRegisterSuccess = async (email: string, name: string) => {
    setIsRegisteringBackend(true);
    try {
        const response = await registrarUsuarioNoBackend(email, name);
        
        // Salva tudo no navegador
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_name', name);
        localStorage.setItem('user_premium', response.is_premium.toString());
        
        setIsPremiumUser(response.is_premium);

        // Aplica a mesma lógica de acesso
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

  // ... (addRecord, addBatchRecords, getTitle permanecem iguais)
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
        <div className="flex h-screen bg-slate-50 items-center justify-center">
            <div className="text-center animate-in fade-in duration-500">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Iniciando Failure Map...</h2>
                <p className="text-slate-500 text-sm mt-2">Sincronizando perfil e permissões.</p>
            </div>
        </div>
    );
  }

  const isQuotaEnforced = userStatus === 'limit_reached';
  const disableClassifier = userStatus === 'needs_register'; 

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden animate-in fade-in">
      {/* PASSANDO A NOVA PROP PARA A SIDEBAR */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} isPremium={isPremiumUser} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {disableClassifier && !showModal && !showLimitMessage && (
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
                isQuotaEnforced={isQuotaEnforced}
              />
            )}
            
            {currentTab === TabView.BATCH && (
              <BatchProcessor 
                 onBatchComplete={addBatchRecords}
                 onShowRegister={handleShowRegister}
                 onShowLimitReached={handleShowLimitReached}
                 // Se for premium, consideramos sempre registrado para liberar o botão
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
