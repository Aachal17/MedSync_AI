export enum Role {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  PHARMACY = 'PHARMACY'
}

export enum MedStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED'
}

export enum DoseStatus {
  PENDING = 'PENDING',
  TAKEN = 'TAKEN',
  SKIPPED = 'SKIPPED',
  LATE = 'LATE'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  details?: PatientDetails | DoctorDetails;
}

export interface Vitals {
  heartRate: number; // bpm
  systolicBP: number; // mmHg
  diastolicBP: number; // mmHg
  bloodGlucose: number; // mg/dL
  oxygenSaturation: number; // %
  temperature: number; // Celsius
  lastUpdated: string; // ISO String
}

export interface PatientDetails {
  dob: string;
  allergies: string[];
  conditions: string[];
  weight?: number;
  height?: number;
  vitals?: Vitals;
}

export interface DoctorDetails {
  specialty: string;
  licenseNumber: string;
  patients: string[]; // List of Patient IDs
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string; // e.g., "Daily", "2x Daily"
  times: string[]; // ["08:00", "20:00"]
  instructions: string; // "Take with food"
  startDate: string;
  endDate?: string;
  status: MedStatus;
  stock: number;
  prescribedBy?: string; // Doctor ID
}

export interface DoseLog {
  id: string;
  medicationId: string;
  scheduledTime: string; // ISO String
  takenTime?: string; // ISO String
  status: DoseStatus;
  notes?: string;
}

export interface WoundEntry {
  id: string;
  date: string;
  imageUrl: string;
  aiAnalysis?: string;
  severityScore?: number; // 1-10
  actionItems?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isThinking?: boolean;
}

export interface StoredChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderRole: 'doctor' | 'patient';
  text: string;
  timestamp: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  stock: number; // Added stock tracking
}

export interface CartItem extends Product {
  quantity: number;
}