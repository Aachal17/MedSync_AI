import React, { useState } from 'react';
import { Role, User, Medication, DoseLog, PatientDetails, CartItem, Product } from './types';
import { MOCK_USER_PATIENT, MOCK_USER_DOCTOR, INITIAL_MEDS, INITIAL_LOGS } from './services/mockData';
import { PatientView } from './components/PatientView';
import { DoctorView } from './components/DoctorView';
import { AIView } from './components/AIView';
import { ProfileView } from './components/ProfileView';
import { MarketplaceView } from './components/MarketplaceView';
import { PatientChatView } from './components/PatientChatView';
import { AuthView } from './components/AuthView';
import { Activity, Pill, User as UserIcon, LogOut, ShieldCheck, ShoppingBag, MessageSquare } from 'lucide-react';

// Simple Router State
type View = 'dashboard' | 'ai' | 'profile' | 'marketplace' | 'messages';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // App Data State
  const [meds, setMeds] = useState<Medication[]>(INITIAL_MEDS);
  const [logs, setLogs] = useState<DoseLog[]>(INITIAL_LOGS);

  // Cart State (Lifted from Marketplace)
  const [cart, setCart] = useState<CartItem[]>([]);

  // Authentication Handlers
  const handleAuthLogin = (email: string, role: Role) => {
    // Validate against Mock Data for Demo
    if (role === Role.PATIENT) {
        if (email.toLowerCase() === MOCK_USER_PATIENT.email.toLowerCase()) {
            setCurrentUser(MOCK_USER_PATIENT);
            // Restore Mock Data for Sarah
            setMeds(INITIAL_MEDS);
            setLogs(INITIAL_LOGS);
        } else {
            // New user session
            const tempUser: User = {
                id: Date.now().toString(),
                name: email.split('@')[0],
                email: email,
                role: Role.PATIENT,
                avatar: `https://ui-avatars.com/api/?name=${email}&background=random`,
                details: { dob: '', allergies: [], conditions: [], weight: 0 }
            };
            setCurrentUser(tempUser);
            setMeds([]);
            setLogs([]);
        }
    } else {
         if (email.toLowerCase() === MOCK_USER_DOCTOR.email.toLowerCase()) {
            setCurrentUser(MOCK_USER_DOCTOR);
         } else {
            alert("Access Denied: Doctor credentials not found. Try 'dr.ray@medisync.com'");
            return;
         }
    }
    setCurrentView('dashboard');
  };

  const handleAuthSignup = (name: string, email: string) => {
      const newUser: User = {
          id: Date.now().toString(),
          name,
          email,
          role: Role.PATIENT,
          avatar: `https://ui-avatars.com/api/?name=${name}&background=0D9488&color=fff`,
          details: {
              dob: '',
              allergies: [],
              conditions: [],
              weight: undefined
          }
      };
      setCurrentUser(newUser);
      setMeds([]); 
      setLogs([]); 
      setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
    setCart([]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const handleTakeDose = (log: DoseLog) => {
    setLogs(prev => [...prev, log]);
    setMeds(prev => prev.map(med => 
      med.id === log.medicationId 
        ? { ...med, stock: Math.max(0, med.stock - 1) } 
        : med
    ));
  };

  // Centralized Add to Cart logic
  const handleAddToCart = (item: Product | Medication, quantity: number = 1) => {
    setCart(prev => {
      // Determine ID. If it's a Med, use its ID. If Product, use ID.
      const itemId = item.id;
      
      const existing = prev.find(i => i.id === itemId);
      if (existing) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i);
      }
      
      // If it's a Medication object, we need to adapt it to a Product shape for the cart
      // Check if it has 'price' property, if not it's a Medication
      const isMedication = !('price' in item);
      
      if (isMedication) {
          const med = item as Medication;
          const medProduct: CartItem = {
              id: med.id,
              name: med.name,
              category: 'Prescription',
              description: `Refill for ${med.name} ${med.dosage}`,
              price: 15.00, // Flat rate for demo
              image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=200',
              stock: 999, // Prescriptions effectively unlimited if authorized
              quantity: quantity
          };
          return [...prev, medProduct];
      }

      // Standard Product
      return [...prev, { ...(item as Product), quantity }];
    });
  };

  const handleUpdateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handlePrescribe = (newMed: Medication, patientId: string) => {
    if (patientId === MOCK_USER_PATIENT.id) {
       setMeds(prev => [...prev, newMed]);
       alert(`Prescription sent successfully.`);
    }
  };

  if (!currentUser) {
    return <AuthView onLogin={handleAuthLogin} onSignup={handleAuthSignup} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row max-w-7xl mx-auto shadow-2xl overflow-hidden md:h-screen">
      
      {/* Sidebar Navigation */}
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
                <div className="relative">
                   <ShoppingBag size={24} />
                   {cart.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                        {cart.reduce((a,b) => a + b.quantity, 0)}
                      </span>
                   )}
                </div>
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

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 overflow-hidden flex flex-col order-1 md:order-2 h-[calc(100vh-60px)] md:h-screen">
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {currentUser.role === Role.PATIENT ? (
            <>
              {currentView === 'dashboard' && (
                <PatientView 
                  medications={meds} 
                  logs={logs}
                  user={currentUser}
                  onUpdateUser={handleUpdateUser}
                  onTakeDose={handleTakeDose}
                  onAddMed={(med) => setMeds([...meds, med])}
                  onRefill={(medId) => {
                     const med = meds.find(m => m.id === medId);
                     if (med) handleAddToCart(med);
                  }}
                />
              )}
              {currentView === 'ai' && <AIView user={currentUser} medications={meds} />}
              {currentView === 'messages' && <PatientChatView user={currentUser} />}
              {currentView === 'marketplace' && (
                 <MarketplaceView 
                   cart={cart}
                   onAddToCart={handleAddToCart}
                   onUpdateQuantity={handleUpdateCartQuantity}
                   onRemoveFromCart={handleRemoveFromCart}
                   onClearCart={handleClearCart}
                 />
              )}
              {currentView === 'profile' && (
                <ProfileView user={currentUser} onSave={handleUpdateUser} />
              )}
            </>
          ) : (
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