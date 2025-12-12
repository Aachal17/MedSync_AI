import React, { useState } from 'react';
import { User, Medication, DoseLog, PatientDetails } from '../types';
import { Search, User as UserIcon, Activity, FileText, ChevronRight } from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

interface DoctorViewProps {
  doctor: User;
  patients: User[];
  allLogs: DoseLog[];
}

export const DoctorView: React.FC<DoctorViewProps> = ({ doctor, patients, allLogs }) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Mock adherence data generator for the chart
  const data = [
    { name: 'W1', adherence: 85 },
    { name: 'W2', adherence: 88 },
    { name: 'W3', adherence: 92 },
    { name: 'W4', adherence: 75 },
    { name: 'W5', adherence: 95 },
  ];

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50">
      {/* Patient List Sidebar */}
      <div className={`w-full md:w-80 bg-white border-r border-slate-200 flex flex-col ${selectedPatientId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100">
           <h2 className="font-bold text-lg text-slate-800">My Patients</h2>
           <div className="mt-2 relative">
             <Search className="absolute left-2 top-2.5 text-slate-400" size={16} />
             <input className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 py-2 text-sm" placeholder="Search name..." />
           </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {patients.map(patient => (
            <div 
              key={patient.id} 
              onClick={() => setSelectedPatientId(patient.id)}
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedPatient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center hidden md:flex">
             <Activity size={48} className="mb-4 text-slate-300" />
             <h3 className="text-lg font-medium text-slate-600">Select a patient to view details</h3>
             <p className="text-sm">Monitor adherence, vitals, and adjust prescriptions.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <button onClick={() => setSelectedPatientId(null)} className="md:hidden text-sm text-slate-500 mb-4 flex items-center gap-1">
              ← Back to list
            </button>

            {/* Patient Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-center md:items-start">
               <img src={selectedPatient.avatar} className="w-20 h-20 rounded-full object-cover" />
               <div className="flex-1 text-center md:text-left">
                  <h1 className="text-2xl font-bold text-slate-800">{selectedPatient.name}</h1>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">Age: 38</span>
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">Weight: {(selectedPatient.details as PatientDetails)?.weight}kg</span>
                    <span className="px-3 py-1 bg-red-50 text-red-700 text-xs rounded-full">Allergy: {(selectedPatient.details as PatientDetails)?.allergies.join(', ')}</span>
                  </div>
               </div>
               <div className="flex gap-2">
                 <button className="bg-medical-600 hover:bg-medical-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Message</button>
                 <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">Profile</button>
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
                     <button className="w-full mt-4 py-2 border-2 border-dashed border-slate-200 text-slate-500 rounded-lg text-sm hover:bg-slate-50">
                       + New Prescription
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