import React, { useState, useRef, useEffect } from 'react';
import { User, Medication, DoseLog, PatientDetails, MedStatus, StoredChatMessage } from '../types';
import { COMMON_DRUGS } from '../services/mockData';
import { Search, Activity, FileText, ChevronRight, Plus, X, Pill, Clock, MessageSquare, Send, ArrowLeft, Sparkles, Trash2 } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { generateSmartReplies } from '../services/geminiService';
import { getChatHistory, sendMessage, formatTime, deleteChatHistory } from '../services/chatService';

interface DoctorViewProps {
  doctor: User;
  patients: User[];
  allLogs: DoseLog[];
  onPrescribe: (med: Medication, patientId: string) => void;
}

export const DoctorView: React.FC<DoctorViewProps> = ({ doctor, patients, allLogs, onPrescribe }) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Chat State
  const [activeTab, setActiveTab] = useState<'overview' | 'chat'>('overview');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<StoredChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-Suggest State
  const [drugName, setDrugName] = useState('');
  const [drugSuggestions, setDrugSuggestions] = useState<string[]>([]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Poll for messages when chat tab is active
  useEffect(() => {
    if (selectedPatientId && activeTab === 'chat') {
        const fetchMessages = () => {
            const history = getChatHistory(doctor.id, selectedPatientId);
            setChatHistory(history);
        };
        
        fetchMessages();
        const interval = setInterval(fetchMessages, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }
  }, [selectedPatientId, activeTab, doctor.id]);

  // Scroll to bottom
  useEffect(() => {
      if (activeTab === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [chatHistory, activeTab]);

  // Mock adherence data generator for the chart
  const data = [
    { name: 'W1', adherence: 85 },
    { name: 'W2', adherence: 88 },
    { name: 'W3', adherence: 92 },
    { name: 'W4', adherence: 75 },
    { name: 'W5', adherence: 95 },
  ];

  const handleDrugNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDrugName(val);
    if (val.length > 1) {
       const matched = COMMON_DRUGS.filter(d => d.toLowerCase().includes(val.toLowerCase()));
       setDrugSuggestions(matched.slice(0, 5)); // Limit to 5
    } else {
       setDrugSuggestions([]);
    }
  };

  const selectDrug = (name: string) => {
    setDrugName(name);
    setDrugSuggestions([]);
  };

  const handlePrescribeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    const form = e.target as HTMLFormElement;
    const newMed: Medication = {
      id: Date.now().toString(),
      name: drugName,
      dosage: (form.elements.namedItem('dosage') as HTMLInputElement).value,
      frequency: (form.elements.namedItem('frequency') as HTMLSelectElement).value,
      times: [(form.elements.namedItem('time') as HTMLInputElement).value],
      instructions: (form.elements.namedItem('instructions') as HTMLTextAreaElement).value,
      startDate: new Date().toISOString().split('T')[0],
      status: MedStatus.ACTIVE,
      stock: 30, // Default starter pack
      prescribedBy: doctor.id
    };

    onPrescribe(newMed, selectedPatientId);
    setShowPrescribeModal(false);
    setDrugName('');
  };

  // Generate suggestions when patient sends a message
  useEffect(() => {
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg && lastMsg.senderRole === 'patient') {
        const fetchSuggestions = async () => {
            const replies = await generateSmartReplies(lastMsg.text, 'doctor');
            setSuggestions(replies);
        };
        fetchSuggestions();
    } else {
        setSuggestions([]);
    }
  }, [chatHistory]);

  const handleSendMessage = (text: string) => {
      if (!text.trim() || !selectedPatientId) return;
      
      sendMessage(doctor.id, selectedPatientId, 'doctor', text);
      setChatMessage('');
      setSuggestions([]);
      // Immediate fetch update handled by polling or we could manually update state here
      setChatHistory(getChatHistory(doctor.id, selectedPatientId));
  };

  const handleDeleteChat = () => {
      if (selectedPatientId && window.confirm("Delete chat history with this patient?")) {
          deleteChatHistory(doctor.id, selectedPatientId);
          setChatHistory([]);
      }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50">
      {/* Patient List Sidebar */}
      <div className={`w-full md:w-80 bg-white border-r border-slate-200 flex flex-col ${selectedPatientId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100">
           <h2 className="font-bold text-lg text-slate-800">My Patients</h2>
           <div className="mt-2 relative">
             <Search className="absolute left-2 top-2.5 text-slate-400" size={16} />
             <input className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-lg pl-8 py-2 text-sm" placeholder="Search name..." />
           </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {patients.map(patient => (
            <div 
              key={patient.id} 
              onClick={() => { setSelectedPatientId(patient.id); setActiveTab('overview'); }}
              className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition flex items-center gap-3 ${selectedPatientId === patient.id ? 'bg-medical-50 border-l-4 border-l-medical-500' : ''}`}
            >
              <img src={patient.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-800">{patient.name}</h3>
                <p className="text-xs text-slate-500">Last visit: 2 days ago</p>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!selectedPatient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center hidden md:flex">
             <Activity size={48} className="mb-4 text-slate-300" />
             <h3 className="text-lg font-medium text-slate-600">Select a patient to view details</h3>
             <p className="text-sm">Monitor adherence, vitals, and adjust prescriptions.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
             {/* Header */}
             <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-3">
                     <button onClick={() => setSelectedPatientId(null)} className="md:hidden text-slate-500"><ArrowLeft /></button>
                     <img src={selectedPatient.avatar} className="w-10 h-10 rounded-full object-cover" />
                     <div>
                         <h2 className="font-bold text-slate-800">{selectedPatient.name}</h2>
                         <p className="text-xs text-slate-500">ID: #{selectedPatient.id.toUpperCase()}</p>
                     </div>
                 </div>
                 <div className="flex bg-slate-100 rounded-lg p-1">
                     <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'overview' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                     >
                         Overview
                     </button>
                     <button 
                        onClick={() => setActiveTab('chat')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${activeTab === 'chat' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                     >
                         Chat <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                     </button>
                 </div>
             </div>

             {activeTab === 'overview' ? (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                    {/* Patient Quick Stats */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-center md:items-start">
                        <div className="flex-1 w-full">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-slate-800 mb-2">Vitals Summary</h3>
                                <button onClick={() => setShowProfileModal(true)} className="text-xs text-medical-600 font-bold hover:underline">View Full Profile</button>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-2">
                                <div className="p-3 bg-slate-50 rounded-xl text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Age</p>
                                    <p className="font-bold text-slate-800">38</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Weight</p>
                                    <p className="font-bold text-slate-800">{(selectedPatient.details as PatientDetails)?.weight}kg</p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-xl text-center">
                                    <p className="text-xs text-red-500 uppercase font-bold">Risk</p>
                                    <p className="font-bold text-red-700">Moderate</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vitals & Adherence Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-medical-600" /> Adherence Trend
                        </h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                <linearGradient id="colorAdh" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                </linearGradient>
                                </defs>
                                <Tooltip />
                                <Area type="monotone" dataKey="adherence" stroke="#0d9488" fillOpacity={1} fill="url(#colorAdh)" />
                            </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-center mt-2">
                            <span className="text-2xl font-bold text-medical-600">95%</span>
                            <p className="text-xs text-slate-500">Current Month Average</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <FileText size={18} className="text-blue-600" /> Active Prescriptions
                        </h3>
                        <div className="space-y-3">
                            {[1, 2].map((_, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="font-medium text-slate-800">{i === 0 ? 'Lisinopril' : 'Metformin'}</p>
                                    <p className="text-xs text-slate-500">{i === 0 ? '10mg Daily' : '500mg 2x Daily'}</p>
                                </div>
                                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">Active</span>
                            </div>
                            ))}
                            <button 
                            onClick={() => setShowPrescribeModal(true)}
                            className="w-full mt-4 py-3 border-2 border-dashed border-medical-200 text-medical-600 rounded-xl text-sm font-bold hover:bg-medical-50 transition-colors flex items-center justify-center gap-2"
                            >
                            <Plus size={16} /> Prescribe Medication
                            </button>
                        </div>
                    </div>
                    </div>
                </div>
             ) : (
                 // CHAT INTERFACE
                 <div className="flex-1 flex flex-col bg-slate-50">
                     <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-white/50">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chat History</span>
                        <button onClick={handleDeleteChat} title="Clear History" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <Trash2 size={16} />
                        </button>
                     </div>
                     <div className="flex-1 overflow-y-auto p-4 space-y-4">
                         {chatHistory.length === 0 && (
                             <div className="text-center text-slate-400 text-sm mt-10">
                                 No chat history with this patient.
                             </div>
                         )}
                         {chatHistory.map(msg => (
                             <div key={msg.id} className={`flex ${msg.senderRole === 'doctor' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                                 <div className={`max-w-[75%] p-3 rounded-2xl shadow-sm text-sm ${msg.senderRole === 'doctor' ? 'bg-medical-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'}`}>
                                     <p className="whitespace-pre-wrap">{msg.text}</p>
                                     <p className={`text-[10px] mt-1 text-right ${msg.senderRole === 'doctor' ? 'text-medical-200' : 'text-slate-400'}`}>{formatTime(msg.timestamp)}</p>
                                 </div>
                             </div>
                         ))}
                         <div ref={chatEndRef} />
                     </div>
                     
                     {/* Suggestions */}
                     {suggestions.length > 0 && (
                        <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/80 backdrop-blur-sm border-t border-slate-100">
                            <div className="flex items-center gap-1 text-xs font-bold text-medical-600 shrink-0">
                                <Sparkles size={14} /> Suggested:
                            </div>
                            {suggestions.map((sug, i) => (
                                <button 
                                  key={i}
                                  onClick={() => handleSendMessage(sug)}
                                  className="px-3 py-1.5 bg-white border border-medical-200 text-medical-700 rounded-full text-xs hover:bg-medical-50 hover:border-medical-300 transition whitespace-nowrap shadow-sm"
                                >
                                  {sug}
                                </button>
                            ))}
                        </div>
                     )}

                     <div className="p-4 bg-white border-t border-slate-200 flex gap-2">
                         <input 
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatMessage)}
                            placeholder="Type a message to patient..." 
                            className="flex-1 bg-slate-100 text-slate-900 placeholder:text-slate-400 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-medical-500 outline-none transition-all"
                         />
                         <button onClick={() => handleSendMessage(chatMessage)} className="bg-medical-600 text-white p-2 rounded-xl hover:bg-medical-700 transition shadow-sm">
                             <Send size={20} />
                         </button>
                     </div>
                 </div>
             )}
          </div>
        )}

        {/* Improved Prescribe Modal with Type-Ahead */}
        {showPrescribeModal && (
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto relative">
                 <button onClick={() => setShowPrescribeModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition">
                      <X size={16} />
                 </button>
                 
                 <div className="flex items-center gap-3 mb-6">
                    <div className="bg-medical-100 p-2 rounded-xl text-medical-600">
                      <Pill size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">New Prescription</h3>
                 </div>
                 
                 <form onSubmit={handlePrescribeSubmit} className="space-y-4">
                    <div className="relative">
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Drug Name (Auto-Suggest)</label>
                       <input 
                         name="name"
                         value={drugName}
                         onChange={handleDrugNameChange}
                         autoComplete="off"
                         required
                         placeholder="Start typing..." 
                         className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-medical-500 outline-none bg-slate-50 focus:bg-white text-slate-900 transition-all"
                       />
                       {drugSuggestions.length > 0 && (
                          <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden animate-in fade-in">
                             {drugSuggestions.map(suggestion => (
                                <div 
                                  key={suggestion}
                                  onClick={() => selectDrug(suggestion)}
                                  className="px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer text-slate-700 font-medium"
                                >
                                   {suggestion}
                                </div>
                             ))}
                          </div>
                       )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Dosage</label>
                          <input 
                            name="dosage"
                            required
                            placeholder="e.g. 500mg" 
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-medical-500 outline-none bg-slate-50 focus:bg-white text-slate-900 transition-all"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Frequency</label>
                          <select 
                            name="frequency" 
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-medical-500 outline-none bg-slate-50 focus:bg-white text-slate-900 transition-all"
                          >
                             <option value="Daily">Daily</option>
                             <option value="2x Daily">2x Daily</option>
                             <option value="3x Daily">3x Daily</option>
                             <option value="Weekly">Weekly</option>
                          </select>
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Schedule Time</label>
                       <div className="relative">
                         <Clock size={16} className="absolute left-3 top-3.5 text-slate-400" />
                         <input 
                           type="time" 
                           name="time"
                           defaultValue="09:00"
                           className="w-full pl-10 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-medical-500 outline-none bg-slate-50 focus:bg-white text-slate-900 transition-all"
                         />
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide">Instructions</label>
                       <textarea 
                         name="instructions"
                         placeholder="e.g. Take with food. Finish full course." 
                         rows={3}
                         className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-medical-500 outline-none resize-none bg-slate-50 focus:bg-white text-slate-900 transition-all"
                       />
                    </div>

                    <div className="pt-2">
                       <button type="submit" className="w-full bg-medical-600 hover:bg-medical-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-medical-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                          <Send size={18} /> Send Prescription
                       </button>
                    </div>
                 </form>
              </div>
           </div>
        )}

        {/* Detailed Profile Modal (Existing...) */}
        {showProfileModal && selectedPatient && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-4">
                            <img src={selectedPatient.avatar} className="w-16 h-16 rounded-full border-2 border-slate-100" />
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{selectedPatient.name}</h2>
                                <p className="text-sm text-slate-500">{selectedPatient.email}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowProfileModal(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200"><X size={20} /></button>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Medical Profile</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <span className="text-xs text-slate-500">Date of Birth</span>
                                    <p className="font-semibold text-slate-800">{(selectedPatient.details as PatientDetails)?.dob}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg">
                                    <span className="text-xs text-slate-500">Weight</span>
                                    <p className="font-semibold text-slate-800">{(selectedPatient.details as PatientDetails)?.weight} kg</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Known Conditions</h4>
                            <div className="flex flex-wrap gap-2">
                                {(selectedPatient.details as PatientDetails)?.conditions.map((c, i) => (
                                    <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">{c}</span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Allergies</h4>
                            <div className="flex flex-wrap gap-2">
                                {(selectedPatient.details as PatientDetails)?.allergies.map((a, i) => (
                                    <span key={i} className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm font-medium">{a}</span>
                                ))}
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100">
                             <button 
                                onClick={() => { setShowProfileModal(false); setActiveTab('chat'); }}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                             >
                                 <MessageSquare size={18} /> Send Message
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};