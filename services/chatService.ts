import { StoredChatMessage } from '../types';
import { MOCK_USER_DOCTOR, MOCK_USER_PATIENT } from './mockData';

const STORAGE_KEY = 'medisync_chat_history';

// Initialize with some mock data if empty
const initializeChatStorage = () => {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    const initialMessages: StoredChatMessage[] = [
      {
        id: 'init-1',
        senderId: MOCK_USER_PATIENT.id,
        receiverId: MOCK_USER_DOCTOR.id,
        senderRole: 'patient',
        text: 'Hi Dr. Ray, I have been feeling a bit dizzy after the morning dose.',
        timestamp: Date.now() - 86400000 // 1 day ago
      },
      {
        id: 'init-2',
        senderId: MOCK_USER_DOCTOR.id,
        receiverId: MOCK_USER_PATIENT.id,
        senderRole: 'doctor',
        text: 'Hello Sarah. That is a known side effect of Lisinopril. Please monitor your blood pressure and let me know if it persists.',
        timestamp: Date.now() - 82000000
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialMessages));
  }
};

export const getChatHistory = (userId1: string, userId2: string): StoredChatMessage[] => {
  initializeChatStorage();
  const raw = localStorage.getItem(STORAGE_KEY);
  const allMessages: StoredChatMessage[] = raw ? JSON.parse(raw) : [];

  // Filter messages exchanged between these two users
  const thread = allMessages.filter(msg => 
    (msg.senderId === userId1 && msg.receiverId === userId2) ||
    (msg.senderId === userId2 && msg.receiverId === userId1)
  );

  return thread.sort((a, b) => a.timestamp - b.timestamp);
};

export const sendMessage = (
  senderId: string, 
  receiverId: string, 
  senderRole: 'doctor' | 'patient', 
  text: string
): StoredChatMessage => {
  const raw = localStorage.getItem(STORAGE_KEY);
  const allMessages: StoredChatMessage[] = raw ? JSON.parse(raw) : [];

  const newMessage: StoredChatMessage = {
    id: Date.now().toString(),
    senderId,
    receiverId,
    senderRole,
    text,
    timestamp: Date.now()
  };

  allMessages.push(newMessage);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allMessages));
  
  return newMessage;
};

export const deleteChatHistory = (userId1: string, userId2: string): void => {
  initializeChatStorage();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  
  const allMessages: StoredChatMessage[] = JSON.parse(raw);
  
  // Keep messages that do NOT involve this pair of users
  const remainingMessages = allMessages.filter(msg => 
    !((msg.senderId === userId1 && msg.receiverId === userId2) ||
      (msg.senderId === userId2 && msg.receiverId === userId1))
  );
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingMessages));
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDateHeader = (timestamp: number): string => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    return date.toLocaleDateString();
};