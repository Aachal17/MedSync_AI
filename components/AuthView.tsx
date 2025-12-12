import React, { useState } from 'react';
import { Role } from '../types';
import { Activity, Mail, Lock, User as UserIcon, ArrowRight, Loader2, Stethoscope, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { MOCK_USER_PATIENT, MOCK_USER_DOCTOR } from '../services/mockData';

interface AuthViewProps {
  onLogin: (email: string, role: Role) => void;
  onSignup: (name: string, email: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin, onSignup }) => {
  const [role, setRole] = useState<Role>(Role.PATIENT);
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Demo helper to pre-fill
  const fillDemo = () => {
    if (role === Role.PATIENT) {
      setFormData({ name: '', email: MOCK_USER_PATIENT.email, password: 'password' });
    } else {
      setFormData({ name: '', email: MOCK_USER_DOCTOR.email, password: 'password' });
    }
    setIsLogin(true);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simple validation
    if (!formData.email || !formData.password || (!isLogin && !formData.name)) {
        setError("Please fill in all fields.");
        setIsLoading(false);
        return;
    }
    
    // Simulate network delay for realism
    setTimeout(() => {
        if (isLogin) {
            // Basic validation logic for demo
            if (role === Role.PATIENT && formData.email !== MOCK_USER_PATIENT.email) {
                 // Allow new logins if they just signed up in a real app, 
                 // but for this demo, strictly check against mock or allow "demo" bypass
                 // We will pass it up to App.tsx to decide, but generally we want to succeed.
            }
            onLogin(formData.email, role);
        } else {
            onSignup(formData.name, formData.email);
        }
        setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-0">
       <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row min-h-[600px] border border-slate-100">
          
          {/* Left Side - Brand & Visuals */}
          <div className={`md:w-1/2 p-8 md:p-12 text-white flex flex-col justify-between transition-colors duration-500 relative overflow-hidden ${role === Role.PATIENT ? 'bg-gradient-to-br from-teal-600 to-emerald-800' : 'bg-gradient-to-br from-indigo-600 to-blue-900'}`}>
             {/* Abstract Shapes */}
             <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-16 -mt-16 blur-3xl"></div>
             <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mb-16 blur-3xl"></div>

             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-8">
                   <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                      <Activity className="text-white" size={24} />
                   </div>
                   <h1 className="text-2xl font-bold tracking-tight">MediSync AI</h1>
                </div>
                
                <div className="space-y-6">
                   <h2 className="text-4xl font-bold leading-tight">
                      {role === Role.PATIENT ? "Your Health Journey, Simplified." : "Empowering Modern Healthcare."}
                   </h2>
                   <p className="text-lg text-white/80 leading-relaxed">
                      {role === Role.PATIENT 
                        ? "Manage prescriptions, track adherence, and get instant AI health insights in one secure app."
                        : "Monitor patient adherence in real-time, screen interactions instantly, and streamline your practice."}
                   </p>
                </div>
             </div>

             <div className="relative z-10 mt-12 space-y-4">
                <div className="flex items-center gap-3 text-sm text-white/80 bg-black/20 p-3 rounded-xl backdrop-blur-sm">
                   <ShieldCheck size={18} className="text-emerald-300" />
                   <span>HIPAA Compliant & End-to-End Encrypted</span>
                </div>
                
                {/* Demo Helper */}
                <button 
                  onClick={fillDemo} 
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition border border-white/20 flex items-center gap-2"
                >
                   <SparklesIcon /> Auto-fill Demo Credentials
                </button>
             </div>
          </div>

          {/* Right Side - Form */}
          <div className="md:w-1/2 p-8 md:p-12 bg-white flex flex-col justify-center">
             
             {/* Role Toggle */}
             <div className="flex bg-slate-100 p-1 rounded-xl w-fit mx-auto mb-8">
                <button 
                   onClick={() => { setRole(Role.PATIENT); setIsLogin(true); setError(null); }}
                   className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === Role.PATIENT ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   <UserIcon size={16} /> Patient
                </button>
                <button 
                   onClick={() => { setRole(Role.DOCTOR); setIsLogin(true); setError(null); }}
                   className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === Role.DOCTOR ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   <Stethoscope size={16} /> Doctor
                </button>
             </div>

             <div className="max-w-sm mx-auto w-full">
                <div className="text-center mb-8">
                   <h3 className="text-2xl font-bold text-slate-800 mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h3>
                   <p className="text-slate-500 text-sm">
                      {isLogin ? 'Enter your credentials to access your account.' : 'Join MediSync to take control of your health.'}
                   </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                   {/* Name Field (Signup Only) */}
                   {!isLogin && (
                      <div className="space-y-1.5 animate-in slide-in-from-top-2">
                         <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                         <div className="relative">
                            <UserIcon className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input 
                               type="text" 
                               value={formData.name}
                               onChange={(e) => setFormData({...formData, name: e.target.value})}
                               className="w-full bg-slate-50 text-gray-900 border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-gray-400"
                               placeholder="e.g. John Doe"
                            />
                         </div>
                      </div>
                   )}

                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label>
                      <div className="relative">
                         <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                         <input 
                            type="email" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className={`w-full bg-slate-50 text-gray-900 border rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 transition-all ${role === Role.PATIENT ? 'focus:ring-teal-500' : 'focus:ring-indigo-500'} border-slate-200 placeholder:text-gray-400`}
                            placeholder="name@example.com"
                         />
                      </div>
                   </div>

                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                      <div className="relative">
                         <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                         <input 
                            type="password" 
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className={`w-full bg-slate-50 text-gray-900 border rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 transition-all ${role === Role.PATIENT ? 'focus:ring-teal-500' : 'focus:ring-indigo-500'} border-slate-200 placeholder:text-gray-400`}
                            placeholder="••••••••"
                         />
                      </div>
                   </div>

                   {error && (
                      <div className="text-red-500 text-xs font-medium bg-red-50 p-3 rounded-lg flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> {error}
                      </div>
                   )}

                   <button 
                      type="submit" 
                      disabled={isLoading}
                      className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 mt-2 ${role === Role.PATIENT ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                   >
                      {isLoading ? (
                         <Loader2 className="animate-spin" size={20} />
                      ) : (
                         <>
                            {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight size={18} />
                         </>
                      )}
                   </button>
                </form>

                {role === Role.PATIENT && (
                   <div className="mt-6 text-center">
                      <p className="text-sm text-slate-500">
                         {isLogin ? "Don't have an account? " : "Already have an account? "}
                         <button 
                            onClick={() => { setIsLogin(!isLogin); setError(null); }}
                            className="text-teal-600 font-bold hover:underline"
                         >
                            {isLogin ? "Sign Up" : "Log In"}
                         </button>
                      </p>
                   </div>
                )}
                
                {role === Role.DOCTOR && isLogin && (
                   <div className="mt-6 text-center">
                      <p className="text-xs text-slate-400">
                         Doctors must be verified by the hospital administration. 
                         <br/>Contact IT for access issues.
                      </p>
                   </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

const SparklesIcon = () => (
   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 9h4"/><path d="M3 5h4"/></svg>
);