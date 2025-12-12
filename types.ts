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

export interface PatientDetails {
  dob: string;
  allergies: string[];
  conditions: string[];
  weight?: number;
  height?: number;
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
