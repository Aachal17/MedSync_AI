import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, Image as ImageIcon, Loader2, AlertTriangle, MessageSquare, Bot, User as UserIcon } from 'lucide-react';
import { sendChatMessage, analyzeWoundImage } from '../services/geminiService';
import { ChatMessage, User, Medication, PatientDetails } from '../types';

interface AIViewProps {
  user?: User;
  medications?: Medication[];
}

export const AIView: React.FC<AIViewProps> = ({ user, medications = [] }) => {
  const [mode, setMode] = useState<'chat' | 'wound'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'model', 
      text: user 
        ? `Hello ${user.name}! I have your health profile loaded. How can I help you with your medications today?` 
        : 'Hello! I am your MediSync assistant. How can I help you with your health questions today?', 
      timestamp: Date.now() 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Wound Analysis State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [woundResult, setWoundResult] = useState<{ severity: number; analysis: string; recommendations: string[] } | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputText, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    
    // Build context
    let context = '';
    if (user && user.details) {
      const pd = user.details as PatientDetails;
      context = `
        PATIENT PROFILE:
        Name: ${user.name}
        Age/DOB: ${pd.dob}
        Weight: ${pd.weight || 'Unknown'} kg
        Known Conditions: ${pd.conditions.join(', ') || 'None'}
        Allergies: ${pd.allergies.join(', ') || 'None'}
        
        CURRENT MEDICATIONS:
        ${medications.map(m => `- ${m.name} ${m.dosage} (${m.frequency})`).join('\n')}
      `;
    }

    const responseText = await sendChatMessage(history, userMsg.text, context);

    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, timestamp: Date.now() };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      setWoundResult(null);
      setIsLoading(true);

      const base64Data = base64.split(',')[1];
      const result = await analyzeWoundImage(base64Data);
      setWoundResult(result);
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      {/* View Switcher */}
      <div className="flex bg-white border-b border-slate-200 p-2 gap-2 shadow-sm shrink-0">
        <button
          onClick={() => setMode('chat')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            mode === 'chat' 
            ? 'bg-medical-50 text-medical-700 ring-1 ring-medical-200' 
            : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <MessageSquare size={16} /> Medical Assistant
        </button>
        <button
          onClick={() => setMode('wound')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            mode === 'wound' 
            ? 'bg-medical-50 text-medical-700 ring-1 ring-medical-200' 
            : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Camera size={16} /> Wound Scan
        </button>
      </div>

      {mode === 'chat' ? (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            {messages.map((msg, idx) => (
              <div 
                key={msg.id} 
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-medical-600 text-white'}`}>
                  {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={16} />}
                </div>
                
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-medical-600 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                   <Loader2 className="animate-spin text-medical-500" size={16} />
                   <span className="text-xs text-slate-500 font-medium">MediSync is thinking...</span>
                </div>
              </div>
            )}
            <div className="h-4" /> {/* Spacer */}
          </div>

          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-medical-100 focus-within:border-medical-300 transition-all shadow-sm">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about medications, side effects, or symptoms..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-3 py-1 outline-none text-gray-900 placeholder:text-gray-400"
                autoComplete="off"
              />
              <button 
                onClick={handleSendMessage} 
                disabled={isLoading || !inputText.trim()} 
                className="p-2.5 bg-medical-600 text-white rounded-xl hover:bg-medical-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              AI provides informational support only. Consult a doctor for emergencies.
            </p>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!selectedImage ? (
            <div className="h-full flex flex-col items-center justify-center">
               <div className="w-full max-w-sm aspect-[4/3] border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center bg-white text-slate-500 relative overflow-hidden group hover:border-medical-400 transition-colors">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <Camera size={32} className="text-slate-400 group-hover:text-medical-500" />
                  </div>
                  <h3 className="font-bold text-slate-700">Scan Wound</h3>
                  <p className="text-xs text-slate-400 mt-1">Upload or capture a photo for AI analysis</p>
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-lg mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                <img src={selectedImage} alt="Wound" className="w-full h-64 object-cover" />
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-3 flex justify-end">
                  <button 
                    onClick={() => setSelectedImage(null)} 
                    className="bg-white/20 backdrop-blur-md text-white p-2 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <AlertTriangle size={18} />
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                  <Loader2 className="animate-spin text-medical-600 mx-auto mb-3" size={32} />
                  <h4 className="font-semibold text-slate-800">Analyzing tissue integrity...</h4>
                  <p className="text-xs text-slate-500 mt-1">Checking for signs of infection and severity.</p>
                </div>
              ) : woundResult && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
                     <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${woundResult.severity < 4 ? 'bg-green-100 text-green-600' : woundResult.severity < 7 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                           <AlertTriangle size={24} />
                        </div>
                        <div>
                           <h3 className="font-bold text-slate-800 text-sm">Severity Score</h3>
                           <p className="text-xs text-slate-500">Based on visual analysis</p>
                        </div>
                     </div>
                     <div className="text-right">
                       <div className={`text-3xl font-bold ${woundResult.severity < 4 ? 'text-green-600' : woundResult.severity < 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                         {woundResult.severity}<span className="text-base text-slate-400 font-medium">/10</span>
                       </div>
                     </div>
                   </div>

                   <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <h4 className="font-bold text-sm mb-3 text-slate-800 flex items-center gap-2">
                        <Bot size={16} className="text-medical-600" /> AI Analysis
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {woundResult.analysis}
                      </p>
                   </div>

                   <div className="p-5 bg-medical-50/50 rounded-2xl border border-medical-100">
                      <h4 className="font-bold text-sm mb-3 text-medical-800">Recommended Actions</h4>
                      <ul className="space-y-2">
                        {woundResult.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-medical-900 flex items-start gap-2">
                            <span className="bg-medical-200 text-medical-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                   </div>
                   
                   <p className="text-xs text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 text-center font-medium">
                     ⚠️ This is an AI estimate. If you experience spreading redness, fever, or severe pain, please consult a doctor immediately.
                   </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};