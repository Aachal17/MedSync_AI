import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, Image as ImageIcon, Loader2, AlertTriangle, MessageSquare } from 'lucide-react';
import { sendChatMessage, analyzeWoundImage } from '../services/geminiService';
import { ChatMessage } from '../types';

export const AIView: React.FC = () => {
  const [mode, setMode] = useState<'chat' | 'wound'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello! I am your MediSync assistant. How can I help you with your medications or health questions today?', timestamp: Date.now() }
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
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputText, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const responseText = await sendChatMessage(history, userMsg.text);

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
    <div className="h-full flex flex-col">
      <div className="flex bg-white border-b border-slate-200 p-2 gap-2">
        <button
          onClick={() => setMode('chat')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${mode === 'chat' ? 'bg-medical-100 text-medical-800' : 'text-slate-500'}`}
        >
          <MessageSquare size={16} /> Assistant
        </button>
        <button
          onClick={() => setMode('wound')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${mode === 'wound' ? 'bg-medical-100 text-medical-800' : 'text-slate-500'}`}
        >
          <Camera size={16} /> Wound Scan
        </button>
      </div>

      {mode === 'chat' ? (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-medical-600 text-white rounded-tr-none' : 'bg-white shadow-sm border border-slate-100 text-slate-800 rounded-tl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                   <Loader2 className="animate-spin text-medical-500" size={16} />
                </div>
              </div>
            )}
          </div>
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-full border border-slate-200">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about meds, side effects..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 outline-none"
              />
              <button onClick={handleSendMessage} disabled={isLoading} className="p-2 bg-medical-600 text-white rounded-full hover:bg-medical-700 disabled:opacity-50">
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              AI provides info, not diagnosis. Consult a doctor for emergencies.
            </p>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!selectedImage ? (
            <div className="h-64 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center bg-slate-50 text-slate-500 relative overflow-hidden">
               <Camera size={48} className="mb-2 text-slate-400" />
               <p className="text-sm">Upload or capture a photo</p>
               <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden shadow-sm">
              <img src={selectedImage} alt="Wound" className="w-full h-64 object-cover" />
              <button 
                onClick={() => setSelectedImage(null)} 
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
              >
                <AlertTriangle size={16} />
              </button>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="animate-spin text-medical-600 mx-auto mb-2" size={32} />
              <p className="text-sm text-slate-500">Analyzing tissue integrity...</p>
            </div>
          )}

          {woundResult && (
            <div className="space-y-4">
               <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                 <h3 className="font-bold text-slate-800">Severity Score</h3>
                 <div className={`text-2xl font-bold ${woundResult.severity < 4 ? 'text-green-600' : woundResult.severity < 7 ? 'text-yellow-600' : 'text-red-600'}`}>
                   {woundResult.severity}<span className="text-sm text-slate-400">/10</span>
                 </div>
               </div>

               <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                  <h4 className="font-semibold text-sm mb-2 text-slate-700">Analysis</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{woundResult.analysis}</p>
               </div>

               <div className="p-4 bg-medical-50 rounded-xl border border-medical-100">
                  <h4 className="font-semibold text-sm mb-2 text-medical-800">Recommendations</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {woundResult.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-medical-700">{rec}</li>
                    ))}
                  </ul>
               </div>
               
               <p className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                 ⚠️ This is an AI estimate. If you see spreading redness, fever, or severe pain, see a doctor immediately.
               </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
