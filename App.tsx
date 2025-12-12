import React, { useState } from 'react';
import { Role, User, Medication, DoseLog, PatientDetails } from './types';
import { MOCK_USER_PATIENT, MOCK_USER_DOCTOR, INITIAL_MEDS, INITIAL_LOGS } from './services/mockData';
import { PatientView } from './components/PatientView';
import { DoctorView } from './components/DoctorView';
import { AIView } from './components/AIView';
import { ProfileView } from './components/ProfileView';
import { MarketplaceView } from './components/MarketplaceView';
import { PatientChatView } from './components/PatientChatView';
import { Activity, Pill, User as UserIcon, LogOut, ShieldCheck, ShoppingBag, MessageSquare } from 'lucide-react';

// Simple Router State
type View = 'dashboard' | 'ai' | 'profile' | 'marketplace' | 'messages';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // App Data State
  const [meds, setMeds] = useState<Medication[]>(INITIAL_MEDS);
  const [logs, setLogs] = useState<DoseLog[]>(INITIAL_LOGS);

  const handleLogin = (role: Role) => {
    if (role === Role.PATIENT) {
      setCurrentUser(MOCK_USER_PATIENT);
    } else {
      setCurrentUser(MOCK_USER_DOCTOR);
    }
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  // Logic to take a dose: Add log AND decrement stock
  const handleTakeDose = (log: DoseLog) => {
    setLogs(prev => [...prev, log]);
    setMeds(prev => prev.map(med => 
      med.id === log.medicationId 
        ? { ...med, stock: Math.max(0, med.stock - 1) } 
        : med
    ));
  };

  // Logic to refill medication
  const handleRefill = (medId: string) => {
    setMeds(prev => prev.map(med => 
      med.id === medId 
        ? { ...med, stock: med.stock + 30 } // Mock refill of 30 units
        : med
    ));
  };

  // Logic for doctor to prescribe (adds to global meds list)
  const handlePrescribe = (newMed: Medication, patientId: string) => {
    // In a real app, we would filter by patientId. 
    // Here we assume the mock patient is the target for simplicity.
    if (patientId === MOCK_USER_PATIENT.id) {
       setMeds(prev => [...prev, newMed]);
       alert(`Prescription sent to ${MOCK_USER_PATIENT.name}`);
    }
  };

  // Render Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-500 to-teal-700 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-medical-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Activity className="text-medical-600" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">MediSync AI</h1>
          <p className="text-slate-500 mb-8">Intelligent healthcare management for everyone.</p>
          
          <div className="space-y-4">
            <button 
              onClick={() => handleLogin(Role.PATIENT)}
              className="w-full bg-medical-600 hover:bg-medical-700 text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-medical-200"
            >
              Log in as Patient
            </button>
            <button 
              onClick={() => handleLogin(Role.DOCTOR)}
              className="w-full bg-white border-2 border-slate-100 hover:border-medical-200 text-slate-700 font-semibold py-3 px-4 rounded-xl transition"
            >
              Log in as Doctor
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-center text-xs text-slate-400 gap-1">
              <ShieldCheck size={12} />
              <span>HIPAA Compliant & Secure</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row max-w-7xl mx-auto shadow-2xl overflow-hidden md:h-screen">
      
      {/* Sidebar Navigation (Desktop) / Bottom Bar (Mobile) */}
      <nav className="bg-white md:w-20 md:flex-col flex-row flex md:border-r border-t md:border-t-0 border-slate-200 order-2 md:order-1 items-center justify-between md:justify-start py-2 md:py-6 px-6 md:px-0 z-10 shrink-0">
        <div className="hidden md:block mb-8">
           <Activity className="text-medical-600 mx-auto" size={28} />
        </div>
        
        <div className="flex md:flex-col gap-8 md:gap-6 w-full md:w-auto justify-between md:justify-start">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-medical-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Pill size={24} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          
          {currentUser.role === Role.PATIENT && (
            <>
              <button 
                onClick={() => setCurrentView('ai')}
                className={`flex flex-col items-center gap-1 ${currentView === 'ai' ? 'text-medical-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <div className="relative">
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-medical-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-medical-500"></span>
                  </span>
                  <Activity size={24} />
                </div>
                <span className="text-[10px] font-medium">AI Hub</span>
              </button>

              <button 
                onClick={() => setCurrentView('messages')}
                className={`flex flex-col items-center gap-1 ${currentView === 'messages' ? 'text-medical-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <MessageSquare size={24} />
                <span className="text-[10px] font-medium">Messages</span>
              </button>
              
              <button 
                onClick={() => setCurrentView('marketplace')}
                className={`flex flex-col items-center gap-1 ${currentView === 'marketplace' ? 'text-medical-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <ShoppingBag size={24} />
                <span className="text-[10px] font-medium">Store</span>
              </button>
            </>
          )}

          <button 
             onClick={() => setCurrentView('profile')}
             className={`flex flex-col items-center gap-1 ${currentView === 'profile' ? 'text-medical-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <UserIcon size={24} />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>

        <div className="hidden md:block mt-auto pb-4">
           <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition">
             <LogOut size={20} className="mx-auto" />
           </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-50 overflow-hidden flex flex-col order-1 md:order-2 h-[calc(100vh-60px)] md:h-screen">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-800 capitalize">
              {currentView === 'ai' ? 'Medical Assistant' : 
               currentView === 'marketplace' ? 'Pharmacy Store' :
               currentView === 'messages' ? 'Doctor Chat' :
               currentUser.role === Role.DOCTOR ? 'Doctor Portal' : 'My Health'}
            </h1>
            <p className="text-xs text-slate-500">Welcome back, {currentUser.name}</p>
          </div>
          <div className="md:hidden">
             <button onClick={handleLogout}><LogOut size={20} className="text-slate-400" /></button>
          </div>
        </header>

        {/* View Router */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {currentUser.role === Role.PATIENT ? (
            <>
              {currentView === 'dashboard' && (
                <PatientView 
                  medications={meds} 
                  logs={logs}
                  user={currentUser}
                  onTakeDose={handleTakeDose}
                  onAddMed={(med) => setMeds([...meds, med])}
                  onRefill={handleRefill}
                />
              )}
              {currentView === 'ai' && <AIView user={currentUser} medications={meds} />}
              {currentView === 'messages' && <PatientChatView user={currentUser} />}
              {currentView === 'marketplace' && <MarketplaceView />}
              {currentView === 'profile' && (
                <ProfileView user={currentUser} onSave={handleUpdateUser} />
              )}
            </>
          ) : (
            // DOCTOR VIEWS
            <>
               {currentView === 'dashboard' && (
                 <DoctorView 
                   doctor={currentUser} 
                   patients={[MOCK_USER_PATIENT]}
                   allLogs={logs}
                   onPrescribe={handlePrescribe}
                 />
               )}
               {currentView === 'profile' && (
                  <ProfileView user={currentUser} onSave={handleUpdateUser} />
               )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;