import React, { useState, useRef, useEffect } from 'react';
import { User, StoredChatMessage } from '../types';
import { MOCK_USER_DOCTOR } from '../services/mockData';
import { Send, Phone, Video, MoreVertical, Sparkles, Trash2 } from 'lucide-react';
import { generateSmartReplies } from '../services/geminiService';
import { getChatHistory, sendMessage, formatTime, formatDateHeader, deleteChatHistory } from '../services/chatService';

interface PatientChatViewProps {
  user: User;
}

export const PatientChatView: React.FC<PatientChatViewProps> = ({ user }) => {
  const [messages, setMessages] = useState<StoredChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // We assume the patient is chatting with their primary doctor (Mock Doctor for now)
  const doctorId = MOCK_USER_DOCTOR.id;

  const fetchMessages = () => {
    const history = getChatHistory(user.id, doctorId);
    setMessages(history);
  };

  // Poll for new messages (simulate real-time)
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [user.id, doctorId]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Generate AI Suggestions based on last message from Doctor
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.senderRole === 'doctor') {
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

    sendMessage(user.id, doctorId, 'patient', text);
    setInputText('');
    setSuggestions([]);
    fetchMessages(); // Update immediately
  };

  const handleDeleteChat = () => {
    if (window.confirm("Are you sure you want to delete the entire chat history with this doctor?")) {
        deleteChatHistory(user.id, doctorId);
        fetchMessages();
    }
  };

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
           <button 
             onClick={handleDeleteChat} 
             className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition" 
             title="Clear Chat History"
           >
             <Trash2 size={20} />
           </button>
           <button className="p-2 hover:bg-slate-100 rounded-full transition"><Phone size={20} /></button>
           <button className="p-2 hover:bg-slate-100 rounded-full transition"><Video size={20} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
            <div className="text-center text-slate-400 text-sm mt-10">
                No messages yet. Start a conversation with your doctor.
            </div>
        )}
        
        {messages.map((msg, index) => {
          const showDate = index === 0 || formatDateHeader(msg.timestamp) !== formatDateHeader(messages[index-1].timestamp);
          
          return (
            <React.Fragment key={msg.id}>
                {showDate && (
                    <div className="text-center text-xs text-slate-400 my-4 font-medium bg-slate-100/50 py-1 rounded-full w-fit mx-auto px-3">
                        {formatDateHeader(msg.timestamp)}
                    </div>
                )}
                <div className={`flex ${msg.senderRole === 'patient' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 duration-200`}>
                    <div className={`max-w-[80%] md:max-w-[70%] p-4 rounded-2xl shadow-sm relative group ${
                    msg.senderRole === 'patient' 
                        ? 'bg-gradient-to-br from-medical-600 to-medical-700 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-[10px] mt-1 text-right opacity-70 ${msg.senderRole === 'patient' ? 'text-medical-100' : 'text-slate-400'}`}>
                        {formatTime(msg.timestamp)}
                    </p>
                    </div>
                </div>
            </React.Fragment>
          );
        })}
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
              className="flex-1 bg-slate-100 text-slate-900 placeholder:text-slate-400 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-medical-500 outline-none transition-all"
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