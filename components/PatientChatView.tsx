import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { MOCK_USER_DOCTOR } from '../services/mockData';
import { Send, User as UserIcon, MoreVertical, Phone, Video, Sparkles } from 'lucide-react';
import { generateSmartReplies } from '../services/geminiService';

interface PatientChatViewProps {
  user: User;
}

interface ChatMsg {
  id: string;
  sender: 'doctor' | 'patient';
  text: string;
  time: string;
}

export const PatientChatView: React.FC<PatientChatViewProps> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { 
      id: '1', 
      sender: 'doctor', 
      text: `Hello ${user.name}, checking in on your new dosage. Any side effects?`, 
      time: '09:00 AM' 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions when the last message is from the doctor
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender === 'doctor') {
      const fetchSuggestions = async () => {
        const replies = await generateSmartReplies(lastMsg.text, 'patient');
        setSuggestions(replies);
      };
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [messages]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const newMsg: ChatMsg = {
      id: Date.now().toString(),
      sender: 'patient',
      text: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setSuggestions([]);

    // Simulate Doctor Reply
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'doctor',
        text: "Thanks for the update. Keep monitoring your symptoms and let me know if anything changes.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 4000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
             <img src={MOCK_USER_DOCTOR.avatar} alt="Doctor" className="w-10 h-10 rounded-full object-cover" />
             <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <h2 className="font-bold text-slate-800">{MOCK_USER_DOCTOR.name}</h2>
            <p className="text-xs text-slate-500">{(MOCK_USER_DOCTOR.details as any).specialty || 'General Practitioner'}</p>
          </div>
        </div>
        <div className="flex gap-2 text-slate-400">
           <button className="p-2 hover:bg-slate-100 rounded-full transition"><Phone size={20} /></button>
           <button className="p-2 hover:bg-slate-100 rounded-full transition"><Video size={20} /></button>
           <button className="p-2 hover:bg-slate-100 rounded-full transition"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center text-xs text-slate-400 my-4">Today</div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
             <div className={`max-w-[80%] md:max-w-[70%] p-4 rounded-2xl shadow-sm relative group ${
               msg.sender === 'patient' 
                 ? 'bg-gradient-to-br from-medical-600 to-medical-700 text-white rounded-tr-none' 
                 : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
             }`}>
               <p className="text-sm leading-relaxed">{msg.text}</p>
               <p className={`text-[10px] mt-1 text-right opacity-70 ${msg.sender === 'patient' ? 'text-medical-100' : 'text-slate-400'}`}>
                 {msg.time}
               </p>
             </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start animate-in fade-in">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex gap-1">
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
              </div>
           </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
         <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/80 backdrop-blur-sm border-t border-slate-100 animate-in slide-in-from-bottom-2">
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

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200 shadow-lg z-10">
         <div className="flex gap-2">
            <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
              placeholder="Type your message..."
              className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-medical-500 outline-none transition-all"
            />
            <button 
              onClick={() => handleSendMessage(inputText)}
              disabled={!inputText.trim()}
              className="bg-medical-600 text-white p-3 rounded-xl hover:bg-medical-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-medical-200"
            >
               <Send size={20} />
            </button>
         </div>
      </div>
    </div>
  );
};