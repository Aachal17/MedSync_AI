import React, { useState, useEffect, useRef } from 'react';
import { Medication, DoseLog, DoseStatus, MedStatus } from '../types';
import { Check, X, Clock, Pill, AlertCircle, Plus, FileText, ScanLine, Loader2, ShoppingCart, Calendar, ScanEye, CheckCircle2, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { checkDrugInteractions, identifyPill } from '../services/geminiService';

interface PatientViewProps {
  medications: Medication[];
  logs: DoseLog[];
  onTakeDose: (log: DoseLog) => void;
  onAddMed: (med: Medication) => void;
  onRefill: (medId: string) => void;
}

export const PatientView: React.FC<PatientViewProps> = ({ medications, logs, onTakeDose, onAddMed, onRefill }) => {
  const [activeTab, setActiveTab] = useState<'today' | 'meds' | 'history'>('today');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  
  // States for verification
  const [isScanning, setIsScanning] = useState(false);
  const [pillImage, setPillImage] = useState<string | null>(null);
  const [pillResult, setPillResult] = useState<{name: string, description: string, confidence: string, warning?: string} | null>(null);

  const [interactionWarning, setInteractionWarning] = useState<string | null>(null);

  // State for expanded details in My Meds tab
  const [expandedMeds, setExpandedMeds] = useState<Set<string>>(new Set());

  // State for refill loading
  const [isRefilling, setIsRefilling] = useState(false);
  
  // Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const lastCheckedMinuteRef = useRef<string>('');

  const toggleDetails = (id: string) => {
    const newSet = new Set(expandedMeds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedMeds(newSet);
  };

  // Check interactions when meds change
  useEffect(() => {
    const fetchInteractions = async () => {
        if (medications.length > 1) {
            const warning = await checkDrugInteractions(medications);
            setInteractionWarning(warning);
        }
    };
    fetchInteractions();
  }, [medications]);

  // Check for notifications
  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const checkReminders = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      const dateString = now.toISOString().split('T')[0];

      // Only check once per minute
      if (lastCheckedMinuteRef.current === timeString) return;
      lastCheckedMinuteRef.current = timeString;

      medications.forEach(med => {
        if (med.status === MedStatus.ACTIVE && med.times.includes(timeString)) {
           // Check if already taken for this specific time slot
           const isTaken = logs.some(log => 
             log.medicationId === med.id && 
             log.scheduledTime.startsWith(dateString) &&
             log.scheduledTime.includes(timeString) &&
             log.status === DoseStatus.TAKEN
           );

           if (!isTaken) {
             new Notification(`Time for ${med.name}`, {
               body: `It's ${timeString}. Take ${med.dosage}. ${med.instructions}`,
               requireInteraction: false
             });
           }
        }
      });
    };

    const timer = setInterval(checkReminders, 5000); // Check every 5 seconds
    return () => clearInterval(timer);
  }, [notificationPermission, medications, logs]);

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      alert("Browser notifications are not supported on this device.");
      return;
    }
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
  };

  const today = new Date().toISOString().split('T')[0];
  const lowStockMeds = medications.filter(m => m.stock <= 5 && m.status === MedStatus.ACTIVE);

  // Quick helper to generate tasks for today based on active meds
  const todaysTasks = medications.flatMap(med => {
    if (med.status !== MedStatus.ACTIVE) return [];
    return med.times.map(time => {
       const existingLog = logs.find(l => l.medicationId === med.id && l.scheduledTime.startsWith(today) && l.scheduledTime.includes(time));
       return {
         ...med,
         scheduledTime: time,
         log: existingLog
       };
    });
  }).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const adherenceData = [
    { name: 'Mon', taken: 4, missed: 0 },
    { name: 'Tue', taken: 3, missed: 1 },
    { name: 'Wed', taken: 4, missed: 0 },
    { name: 'Thu', taken: 2, missed: 2 },
    { name: 'Fri', taken: 4, missed: 0 },
    { name: 'Sat', taken: 4, missed: 0 },
    { name: 'Sun', taken: 4, missed: 0 },
  ];

  const handleTakeDose = (medId: string, time: string) => {
    const newLog: DoseLog = {
      id: Date.now().toString(),
      medicationId: medId,
      scheduledTime: `${today}T${time}:00`,
      takenTime: new Date().toISOString(),
      status: DoseStatus.TAKEN
    };
    onTakeDose(newLog);
  };

  const handleRefillAll = () => {
    setIsRefilling(true);
    setTimeout(() => {
      lowStockMeds.forEach(med => onRefill(med.id));
      setIsRefilling(false);
    }, 1500);
  };

  const handleScanImport = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const importedMed: Medication = {
        id: Date.now().toString(),
        name: 'Amoxicillin',
        dosage: '500mg',
        frequency: '3x Daily',
        times: ['08:00', '14:00', '20:00'],
        instructions: 'Finish entire course. Take with food.',
        startDate: today,
        status: MedStatus.ACTIVE,
        stock: 21,
        prescribedBy: 'AI-Scan'
      };
      onAddMed(importedMed);
      setShowImportModal(false);
    }, 2500);
  };

  const handlePillVerification = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64 = reader.result as string;
        setPillImage(base64);
        setIsScanning(true);
        setPillResult(null);

        const base64Data = base64.split(',')[1];
        const result = await identifyPill(base64Data);
        setPillResult(result);
        setIsScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const formatLogDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const sortedLogs = [...logs].sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());

  return (
    <div className="space-y-6">
      {/* Prominent Low Stock Alert */}
      {lowStockMeds.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-start">
              <div className="bg-red-100 p-2 rounded-full mr-3 shrink-0">
                 <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-800">Medication Supply Low</h4>
                <p className="text-xs text-red-600 mt-1 max-w-[250px] sm:max-w-none">
                  You have low stock for: <span className="font-medium">{lowStockMeds.map(m => m.name).join(', ')}</span>.
                  Please order a refill to avoid missing doses.
                </p>
              </div>
            </div>
            <button 
              onClick={handleRefillAll}
              disabled={isRefilling}
              className="ml-auto text-xs bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
            >
              {isRefilling ? (
                <>
                  <Loader2 className="animate-spin h-3 w-3" />
                  Ordering...
                </>
              ) : (
                <>
                  <ShoppingCart size={14} />
                  Order Refill
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Improved Interaction Alert UI */}
      {interactionWarning && interactionWarning.toLowerCase().includes('interaction') && (
        <div className="bg-white border-l-4 border-orange-500 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-orange-50 p-3 flex items-center border-b border-orange-100">
             <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
             <h3 className="font-bold text-orange-800 text-sm">Interaction Analysis</h3>
          </div>
          <div className="p-4">
             {interactionWarning.split('\n').map((line, idx) => (
                 <p key={idx} className={`text-sm text-slate-700 mb-1 ${line.trim().startsWith('-') ? 'ml-4' : 'font-medium'}`}>
                   {line}
                 </p>
             ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 bg-white p-1 rounded-xl shadow-sm border border-slate-100">
        {(['today', 'meds', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
              activeTab === tab ? 'bg-medical-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {tab === 'meds' ? 'My Meds' : tab}
          </button>
        ))}
      </div>

      {/* TODAY VIEW */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-lg font-bold text-slate-800">Schedule</h2>
            <div className="flex items-center gap-2">
              {notificationPermission === 'default' && (
                <button 
                  onClick={enableNotifications}
                  className="text-xs bg-medical-50 text-medical-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-medical-100 transition-colors font-medium border border-medical-200"
                >
                  <Bell size={12} /> Enable Reminders
                </button>
              )}
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{new Date().toDateString()}</span>
            </div>
          </div>

          {todaysTasks.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-400">No medications scheduled for today.</p>
            </div>
          ) : (
            todaysTasks.map((task, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${task.log ? 'bg-green-100 text-green-600' : 'bg-medical-50 text-medical-600'}`}>
                    {task.log ? <Check size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{task.name}</h3>
                    <p className="text-sm text-slate-500">{task.dosage} • {task.instructions}</p>
                    <p className="text-xs font-mono text-medical-600 mt-1">{task.scheduledTime}</p>
                  </div>
                </div>
                {!task.log ? (
                  <button 
                    onClick={() => handleTakeDose(task.id, task.scheduledTime)}
                    className="bg-medical-600 hover:bg-medical-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    Take
                  </button>
                ) : (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                    Taken
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* MEDS VIEW */}
      {activeTab === 'meds' && (
        <div className="space-y-4">
           <div className="grid grid-cols-3 gap-2">
             <button 
               onClick={() => setShowAddModal(true)}
               className="py-3 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 flex flex-col items-center justify-center gap-1"
             >
               <Plus size={16} className="text-medical-600" /> Add Manually
             </button>
             <button 
               onClick={() => setShowImportModal(true)}
               className="py-3 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 flex flex-col items-center justify-center gap-1"
             >
               <ScanLine size={16} className="text-medical-600" /> Import Rx
             </button>
             <button 
               onClick={() => setShowVerifyModal(true)}
               className="py-3 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 flex flex-col items-center justify-center gap-1"
             >
               <ScanEye size={16} className="text-medical-600" /> Verify Pill
             </button>
           </div>

           <div className="grid gap-4">
             {medications.map(med => (
               <div key={med.id} className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${med.stock <= 5 ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-100'}`}>
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="font-bold text-slate-800 text-lg">{med.name}</h3>
                     <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{med.frequency}</span>
                   </div>
                   <div className="text-right">
                     <div className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${med.stock <= 5 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
                       {med.stock <= 5 && <AlertCircle size={10} />}
                       {med.stock} left
                     </div>
                   </div>
                 </div>
                 <div className="text-sm text-slate-500 space-y-1">
                   <p className="flex items-center gap-2"><Pill size={14} /> {med.dosage}</p>
                   <p className="flex items-center gap-2"><Clock size={14} /> {med.times.join(', ')}</p>
                 </div>
                 <div className="mt-4 flex gap-2">
                    <button 
                      onClick={() => toggleDetails(med.id)}
                      className={`flex-1 text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1 ${expandedMeds.has(med.id) ? 'bg-slate-200 text-slate-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'}`}
                    >
                      {expandedMeds.has(med.id) ? 'Hide Details' : 'Details'}
                      {expandedMeds.has(med.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <button 
                        onClick={() => onRefill(med.id)}
                        className={`flex-1 text-xs py-2 rounded-lg transition-all active:scale-95 ${med.stock <= 5 ? 'bg-red-50 text-red-600 font-bold hover:bg-red-100' : 'bg-medical-50 text-medical-700 hover:bg-medical-100'}`}>
                      {med.stock <= 5 ? 'Refill Now' : 'Refill'}
                    </button>
                 </div>
                 
                 {/* Expanded Details Section */}
                 {expandedMeds.has(med.id) && (
                   <div className="mt-3 pt-3 border-t border-slate-100 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                     <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Schedule</p>
                          <div className="flex flex-wrap gap-1">
                            {med.times.map(t => (
                              <span key={t} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-xs font-mono text-slate-600">{t}</span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                          <p className="text-slate-700 text-xs font-medium">
                            {new Date(med.startDate).toLocaleDateString()}
                            <span className="block text-slate-400">to {med.endDate ? new Date(med.endDate).toLocaleDateString() : 'Ongoing'}</span>
                          </p>
                        </div>
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instructions</p>
                       <div className="flex items-start gap-2 text-slate-700 bg-blue-50/50 p-2 rounded-lg border border-blue-50">
                         <FileText size={14} className="text-blue-400 mt-0.5 shrink-0" />
                         <span className="text-xs italic">"{med.instructions}"</span>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             ))}
           </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6">Weekly Adherence</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adherenceData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: '#f0fdfa'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Bar dataKey="taken" stackId="a" fill="#0d9488" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="missed" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-medical-600 rounded-full"></div> Taken
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-200 rounded-full"></div> Missed
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-800 mb-2">Stats</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                   <p className="text-2xl font-bold text-blue-600">92%</p>
                   <p className="text-xs text-blue-800">Adherence</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg text-center">
                   <p className="text-2xl font-bold text-orange-600">4</p>
                   <p className="text-xs text-orange-800">Current Streak</p>
                </div>
             </div>
          </div>

          {/* Detailed Log History */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                <Calendar size={18} className="text-slate-400" />
                <h3 className="font-bold text-slate-800">Recent Activity</h3>
             </div>
             <div className="divide-y divide-slate-50">
               {sortedLogs.map((log) => {
                 const med = medications.find(m => m.id === log.medicationId);
                 return (
                   <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                     <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.status === DoseStatus.TAKEN ? 'bg-green-100 text-green-600' : log.status === DoseStatus.SKIPPED ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                         {log.status === DoseStatus.TAKEN ? <Check size={16} /> : log.status === DoseStatus.SKIPPED ? <X size={16} /> : <Clock size={16} />}
                       </div>
                       <div>
                         <p className="font-medium text-slate-800 text-sm">{med?.name || 'Unknown Med'}</p>
                         <p className="text-xs text-slate-500">{formatLogDate(log.scheduledTime)}</p>
                       </div>
                     </div>
                     <span className={`text-xs font-medium px-2 py-1 rounded ${log.status === DoseStatus.TAKEN ? 'bg-white border border-green-200 text-green-700' : log.status === DoseStatus.SKIPPED ? 'bg-white border border-red-200 text-red-700' : 'bg-white border border-yellow-200 text-yellow-700'}`}>
                        {log.status}
                     </span>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      )}

      {/* Add Med Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Add Medication</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const newMed: Medication = {
                id: Date.now().toString(),
                name: (form.elements.namedItem('name') as HTMLInputElement).value,
                dosage: (form.elements.namedItem('dose') as HTMLInputElement).value,
                frequency: 'Daily',
                times: ['09:00'],
                instructions: 'Follow label',
                startDate: today,
                status: MedStatus.ACTIVE,
                stock: 30
              };
              onAddMed(newMed);
              setShowAddModal(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Name</label>
                  <input name="name" required className="w-full border border-slate-300 rounded-lg p-2" placeholder="e.g. Ibuprofen" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dosage</label>
                  <input name="dose" required className="w-full border border-slate-300 rounded-lg p-2" placeholder="e.g. 200mg" />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="flex-1 py-2 text-white bg-medical-600 rounded-lg">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Med Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center">
            <h3 className="text-xl font-bold mb-4">Scan Prescription</h3>
            
            {isScanning ? (
              <div className="py-8">
                 <Loader2 className="animate-spin text-medical-600 mx-auto mb-4" size={48} />
                 <p className="text-slate-600 font-medium">Analyzing document...</p>
                 <p className="text-xs text-slate-400 mt-2">Extracting medication details, dosage, and frequency.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8">
                   <FileText size={48} className="mx-auto text-slate-300 mb-2" />
                   <p className="text-sm text-slate-500">Take a photo of your prescription bottle or paper.</p>
                </div>
                <div className="flex gap-3">
                   <button onClick={() => setShowImportModal(false)} className="flex-1 py-2 text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                   <button onClick={handleScanImport} className="flex-1 py-2 text-white bg-medical-600 rounded-lg flex items-center justify-center gap-2">
                     <ScanLine size={16} /> Scan Now
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pill Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4 text-center">Verify Pill</h3>
            
            {!pillImage ? (
                <div className="space-y-4">
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center relative">
                        <ScanEye size={48} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">Upload a clear photo of the pill to identify it.</p>
                        <input type="file" accept="image/*" onChange={handlePillVerification} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <button onClick={() => setShowVerifyModal(false)} className="w-full py-2 text-slate-600 bg-slate-100 rounded-lg">Cancel</button>
                </div>
            ) : isScanning ? (
                <div className="py-8 text-center">
                    <Loader2 className="animate-spin text-medical-600 mx-auto mb-4" size={48} />
                    <p className="text-slate-600 font-medium">Identifying pill...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative h-40 w-full rounded-xl overflow-hidden bg-black/5">
                        <img src={pillImage} className="w-full h-full object-contain" />
                    </div>
                    {pillResult && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                             <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-slate-800">{pillResult.name}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${pillResult.confidence === 'High' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {pillResult.confidence} Confidence
                                </span>
                             </div>
                             <p className="text-sm text-slate-600 mb-2">{pillResult.description}</p>
                             {pillResult.warning && (
                                 <div className="text-xs bg-orange-100 text-orange-800 p-2 rounded">
                                     {pillResult.warning}
                                 </div>
                             )}
                        </div>
                    )}
                    <div className="flex gap-3">
                        <button onClick={() => { setPillImage(null); setPillResult(null); }} className="flex-1 py-2 text-slate-600 bg-slate-100 rounded-lg">Retry</button>
                        <button onClick={() => setShowVerifyModal(false)} className="flex-1 py-2 text-white bg-medical-600 rounded-lg">Done</button>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};