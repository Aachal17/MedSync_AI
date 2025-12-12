import { User, Role, Medication, DoseLog, MedStatus, DoseStatus, Product } from '../types';

export const MOCK_USER_PATIENT: User = {
  id: 'p1',
  name: 'Sarah Jenkins',
  email: 'sarah.j@example.com',
  role: Role.PATIENT,
  avatar: 'https://picsum.photos/200',
  details: {
    dob: '1985-04-12',
    allergies: ['Penicillin', 'Peanuts'],
    conditions: ['Hypertension', 'Type 2 Diabetes'],
    weight: 70
  }
};

export const MOCK_USER_DOCTOR: User = {
  id: 'd1',
  name: 'Dr. Alistair Ray',
  email: 'dr.ray@medisync.com',
  role: Role.DOCTOR,
  avatar: 'https://picsum.photos/201',
  details: {
    specialty: 'Cardiology',
    licenseNumber: 'CARD-NY-4421',
    patients: ['p1']
  }
};

export const INITIAL_MEDS: Medication[] = [
  {
    id: 'm1',
    name: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Daily',
    times: ['09:00'],
    instructions: 'Take with water. May cause dry cough.',
    startDate: '2023-01-01',
    status: MedStatus.ACTIVE,
    stock: 4, // Low stock to trigger reminder
    prescribedBy: 'd1'
  },
  {
    id: 'm2',
    name: 'Metformin',
    dosage: '500mg',
    frequency: '2x Daily',
    times: ['08:00', '20:00'],
    instructions: 'Take with meals to reduce stomach upset.',
    startDate: '2023-02-15',
    status: MedStatus.ACTIVE,
    stock: 45,
    prescribedBy: 'd1'
  }
];

// Generate last 7 days of logs for history view
const generateLogs = () => {
  const logs: DoseLog[] = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Add logs for m1 (Lisinopril) - Daily 09:00
    logs.push({
      id: `l-m1-${i}`,
      medicationId: 'm1',
      scheduledTime: `${dateStr}T09:00:00`,
      takenTime: i === 1 ? undefined : `${dateStr}T09:15:00`, // Missed yesterday
      status: i === 1 ? DoseStatus.SKIPPED : DoseStatus.TAKEN
    });

    // Add logs for m2 (Metformin) - 2x Daily 08:00 & 20:00
    logs.push({
      id: `l-m2-am-${i}`,
      medicationId: 'm2',
      scheduledTime: `${dateStr}T08:00:00`,
      takenTime: `${dateStr}T08:05:00`,
      status: DoseStatus.TAKEN
    });
    
    logs.push({
      id: `l-m2-pm-${i}`,
      medicationId: 'm2',
      scheduledTime: `${dateStr}T20:00:00`,
      takenTime: i === 0 ? undefined : `${dateStr}T20:30:00`, // Pending today PM if i=0
      status: i === 0 ? DoseStatus.PENDING : DoseStatus.TAKEN
    });
  }
  return logs;
};

export const INITIAL_LOGS: DoseLog[] = generateLogs();

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'PainAway Ibuprofen', category: 'Pain Relief', price: 12.99, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400', description: 'Fast acting pain relief for headaches and body aches.' },
  { id: 'p2', name: 'MegaVitamin C', category: 'Vitamins', price: 15.50, image: 'https://images.unsplash.com/photo-1550572017-ed10857476e3?auto=format&fit=crop&q=80&w=400', description: 'Boost your immune system with 1000mg Vitamin C.' },
  { id: 'p3', name: 'SoothCough Syrup', category: 'Cold & Flu', price: 9.99, image: 'https://images.unsplash.com/photo-1626880155030-97f268b80983?auto=format&fit=crop&q=80&w=400', description: 'Relieves dry and chesty coughs immediately.' },
  { id: 'p4', name: 'FlexBandages', category: 'First Aid', price: 5.99, image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=400', description: 'Waterproof sterile bandages for cuts and scrapes.' },
  { id: 'p5', name: 'DigestEase', category: 'Digestive', price: 18.00, image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=400', description: 'Relief from heartburn, indigestion, and bloating.' },
  { id: 'p6', name: 'SleepWell Melatonin', category: 'Wellness', price: 14.25, image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd0?auto=format&fit=crop&q=80&w=400', description: 'Natural sleep aid for a restful night.' },
  { id: 'p7', name: 'Antiseptic Cream', category: 'First Aid', price: 8.50, image: 'https://images.unsplash.com/photo-1624454002302-36b824d7f8a4?auto=format&fit=crop&q=80&w=400', description: 'Prevents infection in minor burns, cuts, and scrapes.' },
  { id: 'p8', name: 'Zinc Lozenges', category: 'Cold & Flu', price: 7.25, image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400', description: 'Reduces duration of cold symptoms.' },
];