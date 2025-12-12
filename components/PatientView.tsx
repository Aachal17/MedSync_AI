import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Medication, DoseLog, DoseStatus, MedStatus, User, PatientDetails, Vitals } from '../types';
import { Check, X, Clock, Pill, AlertCircle, Plus, FileText, ScanLine, Loader2, ShoppingCart, Calendar, ScanEye, ChevronDown, ChevronUp, Bell, Info, ArrowRight, Sparkles, Utensils, ThumbsUp, ThumbsDown, AlertTriangle, Bot, Heart, Activity, Droplets, Thermometer, Gauge } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { checkDrugInteractions, identifyPill, getDetailedInteractionExplanation, extractMedicationDetails, getDietaryRecommendations } from '../services/geminiService';

interface PatientViewProps {
  medications: Medication[];
  logs: DoseLog[];
  user: User;
  onUpdateUser: (user: User) => void;
  onTakeDose: (log: DoseLog) => void;
  onAddMed: (med: Medication) => void;
  onRefill: (medId: string) => void;
}

export const PatientView: React.FC<PatientViewProps> = ({ medications, logs, user, onUpdateUser, onTakeDose, onAddMed, onRefill }) => {
  const [activeTab, setActiveTab] = useState<'today' | 'meds' | 'history'>('today');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  
  // UI Toggles
  const [showDietSection, setShowDietSection] = useState(false);
  const [showInteractionSection, setShowInteractionSection] = useState(false);

  // Verification & Import
  const [isScanning, setIsScanning] = useState(false);
  const [pillImage, setPillImage] = useState<string | null>(null);
  const [pillResult, setPillResult] = useState<{name: string, description: string, confidence: string, warning?: string} | null>(null);
  const [scannedMed, setScannedMed] = useState<Partial<Medication> | null>(null);

  // AI Analysis Data
  const [interactionWarning, setInteractionWarning] = useState<string | null>(null);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const [dietPlan, setDietPlan] = useState<{recommended: any[], avoid: any[], summary: string} | null>(null);
  const [isDietLoading, setIsDietLoading] = useState(false);

  const [expandedMeds, setExpandedMeds] = useState<Set<string>>(new Set());
  
  // Refill Button Animations
  const [addingToCart, setAddingToCart] = useState<string | null>(null); // holds medId being added
  
  // Vitals State
  const patientDetails = user.details as PatientDetails;
  const vitals = patientDetails?.vitals || {
    heartRate: 0,
    systolicBP: 0,
    diastolicBP: 0,
    bloodGlucose: 0,
    oxygenSaturation: 0,
    temperature: 0,
    lastUpdated: new Date().toISOString()
  };
  const [vitalsForm, setVitalsForm] = useState<Vitals>(vitals);

  // Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const lastCheckedMinuteRef = useRef<string>('');

  const toggleDetails = (id: string) => {
    const newSet = new Set(expandedMeds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedMeds(newSet);
  };

  useEffect(() => {
    const fetchInteractions = async () => {
        if (medications.length > 1) {
            const result = await checkDrugInteractions(medications);
            if (result.hasInteractions) {
               setInteractionWarning(result.summary);
            } else {
               setInteractionWarning(null);
            }
            setExplanationText(null);
        } else {
            setInteractionWarning(null);
        }
    };
    fetchInteractions();
  }, [medications]);

  const handleGetDiet = async () => {
     setShowDietSection(!showDietSection);
     if (!dietPlan && !isDietLoading) {
         setIsDietLoading(true);
         const details = user.details as PatientDetails;
         const result = await getDietaryRecommendations(details?.conditions || [], medications);
         setDietPlan(result);
         setIsDietLoading(false);
     }
  };

  useEffect(() => {
    if (notificationPermission !== 'granted') return;
    const checkReminders = () => {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const dateString = now.toISOString().split('T')[0];
      if (lastCheckedMinuteRef.current === timeString) return;
      lastCheckedMinuteRef.current = timeString;

      medications.forEach(med => {
        if (med.status === MedStatus.ACTIVE && med.times.includes(timeString)) {
           const isTaken = logs.some(log => 
             log.medicationId === med.id && 
             log.scheduledTime.startsWith(dateString) &&
             log.scheduledTime.includes(timeString) &&
             log.status === DoseStatus.TAKEN
           );
           if (!isTaken) {
             new Notification(`Time for ${med.name}`, { body: `Take ${med.dosage}. ${med.instructions}` });
           }
        }
      });
    };
    const timer = setInterval(checkReminders, 5000);
    return () => clearInterval(timer);
  }, [notificationPermission, medications, logs]);

  const enableNotifications = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
  };

  const today = new Date().toISOString().split('T')[0];
  const lowStockMeds = medications.filter(m => m.stock <= 5 && m.status === MedStatus.ACTIVE);

  const adherenceData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayDate = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        const dayName = days[d.getDay()];
        const dateStr = d.toISOString().split('T')[0];
        const dayLogs = logs.filter(l => l.scheduledTime.startsWith(dateStr));
        data.push({
            name: dayName,
            taken: dayLogs.filter(l => l.status === DoseStatus.TAKEN).length,
            missed: dayLogs.filter(l => l.status === DoseStatus.SKIPPED || l.status === DoseStatus.LATE).length
        });
    }
    return data;
  }, [logs]);

  const stats = useMemo(() => {
    const totalTaken = logs.filter(l => l.status === DoseStatus.TAKEN).length;
    const totalScheduled = logs.length;
    const adherence = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;
    return { adherence, streak: adherence > 80 ? 5 : 2 };
  }, [logs]);

  const todaysTasks = medications.flatMap(med => {
    if (med.status !== MedStatus.ACTIVE) return [];
    return med.times.map(time => {
       const existingLog = logs.find(l => l.medicationId === med.id && l.scheduledTime.startsWith(today) && l.scheduledTime.includes(time));
       return { ...med, scheduledTime: time, log: existingLog };
    });
  }).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const handleTakeDose = (medId: string, time: string) => {
    onTakeDose({
      id: Date.now().toString(),
      medicationId: medId,
      scheduledTime: `${today}T${time}:00`,
      takenTime: new Date().toISOString(),
      status: DoseStatus.TAKEN
    });
  };

  const handleRefillClick = (medId: string) => {
    setAddingToCart(medId);
    onRefill(medId);
    setTimeout(() => setAddingToCart(null), 2000);
  };

  const handleUpdateVitals = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser = {
      ...user,
      details: {
        ...patientDetails,
        vitals: {
          ...vitalsForm,
          lastUpdated: new Date().toISOString()
        }
      }
    };
    onUpdateUser(updatedUser);
    setShowVitalsModal(false);
  };

  const handleSimulateVitals = () => {
    setIsScanning(true);
    // Simulate AI measuring process
    setTimeout(() => {
       setVitalsForm({
         heartRate: Math.floor(Math.random() * (85 - 65) + 65),
         systolicBP: Math.floor(Math.random() * (130 - 110) + 110),
         diastolicBP: Math.floor(Math.random() * (85 - 70) + 70),
         bloodGlucose: Math.floor(Math.random() * (110 - 90) + 90),
         oxygenSaturation: Math.floor(Math.random() * (100 - 97) + 97),
         temperature: 36.6,
         lastUpdated: new Date().toISOString()
       });
       setIsScanning(false);
    }, 2000);
  };

  const handleScanImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      setIsScanning(true);
      setScannedMed(null);
      const result = await extractMedicationDetails((reader.result as string).split(',')[1]);
      if (result) setScannedMed(result);
      else alert("Could not extract medication details.");
      setIsScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const confirmImportedMed = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!scannedMed) return;
    const form = e.target as HTMLFormElement;
    onAddMed({
        id: Date.now().toString(),
        name: (form.elements.namedItem('name') as HTMLInputElement).value,
        dosage: (form.elements.namedItem('dosage') as HTMLInputElement).value,
        frequency: (form.elements.namedItem('frequency') as HTMLInputElement).value,
        times: (form.elements.namedItem('times') as HTMLInputElement).value.split(',').map(t => t.trim()),
        instructions: (form.elements.namedItem('instructions') as HTMLInputElement).value,
        startDate: today,
        status: MedStatus.ACTIVE,
        stock: 30,
        prescribedBy: 'AI-Scan'
    });
    setScannedMed(null);
    setShowImportModal(false);
  };

  const handlePillVerification = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
        setPillImage(reader.result as string);
        setIsScanning(true);
        setPillResult(null);
        const result = await identifyPill((reader.result as string).split(',')[1]);
        setPillResult(result);
        setIsScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const handleExplainInteraction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (explanationText) {
      setExplanationText(null);
      return;
    }
    setIsExplaining(true);
    const text = await getDetailedInteractionExplanation(medications);
    setExplanationText(text);
    setIsExplaining(false);
  };

  const formatLogDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 pb-20">
       
       {/* DASHBOARD HEADER & STATS GRID */}
       <div className="space-y-4">
          <div className="flex justify-between items-end">
             <h2 className="text-xl font-bold text-slate-800">Health Snapshot</h2>
             <button 
               onClick={() => { setVitalsForm(vitals); setShowVitalsModal(true); }}
               className="text-xs font-bold text-medical-600 bg-medical-50 hover:bg-medical-100 px-3 py-1.5 rounded-lg transition-colors border border-medical-200 flex items-center gap-1"
             >
               <Plus size={14} /> Log Vitals
             </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             {/* Heart Rate */}
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Heart size={48} className="text-pink-500" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                   <div className="bg-pink-100 text-pink-600 p-1.5 rounded-lg"><Heart size={16} /></div>
                   <span className="text-xs font-bold text-slate-500 uppercase">Heart Rate</span>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-bold text-slate-800">{vitals.heartRate || '--'}</span>
                   <span className="text-xs text-slate-400 font-medium">bpm</span>
                </div>
                <div className={`text-[10px] mt-2 font-medium ${vitals.heartRate > 100 ? 'text-red-500' : 'text-slate-400'}`}>
                   {vitals.heartRate > 100 ? 'High' : 'Normal Resting'}
                </div>
             </div>

             {/* Blood Pressure */}
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Activity size={48} className="text-indigo-500" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                   <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg"><Activity size={16} /></div>
                   <span className="text-xs font-bold text-slate-500 uppercase">Blood Pressure</span>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-bold text-slate-800">{vitals.systolicBP || '--'}/{vitals.diastolicBP || '--'}</span>
                   <span className="text-xs text-slate-400 font-medium">mmHg</span>
                </div>
                <div className={`text-[10px] mt-2 font-medium ${vitals.systolicBP > 140 ? 'text-red-500' : 'text-slate-400'}`}>
                   {vitals.systolicBP > 140 ? 'High BP' : 'Optimal'}
                </div>
             </div>

             {/* Blood Glucose */}
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Droplets size={48} className="text-emerald-500" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                   <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg"><Droplets size={16} /></div>
                   <span className="text-xs font-bold text-slate-500 uppercase">Glucose</span>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-bold text-slate-800">{vitals.bloodGlucose || '--'}</span>
                   <span className="text-xs text-slate-400 font-medium">mg/dL</span>
                </div>
                 <div className={`text-[10px] mt-2 font-medium ${vitals.bloodGlucose > 140 ? 'text-amber-500' : 'text-slate-400'}`}>
                   {vitals.bloodGlucose > 140 ? 'Elevated' : 'Fasting'}
                </div>
             </div>

             {/* SpO2 */}
             <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Gauge size={48} className="text-cyan-500" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                   <div className="bg-cyan-100 text-cyan-600 p-1.5 rounded-lg"><Gauge size={16} /></div>
                   <span className="text-xs font-bold text-slate-500 uppercase">SpO2</span>
                </div>
                <div className="flex items-baseline gap-1">
                   <span className="text-2xl font-bold text-slate-800">{vitals.oxygenSaturation || '--'}%</span>
                </div>
                 <div className={`text-[10px] mt-2 font-medium ${vitals.oxygenSaturation < 95 ? 'text-red-500' : 'text-slate-400'}`}>
                   {vitals.oxygenSaturation < 95 ? 'Low Oxygen' : 'Normal'}
                </div>
             </div>
          </div>
       </div>

       {/* ADHERENCE CHART SECTION */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="col-span-1 md:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-48 relative">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 absolute top-4 left-4 z-10">Adherence History</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adherenceData} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip cursor={{fill: '#f0fdfa'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Bar dataKey="taken" stackId="a" fill="#0d9488" radius={[0, 0, 4, 4]} barSize={20} />
                    <Bar dataKey="missed" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
         </div>
         <div className="col-span-1 space-y-3">
             <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                   <div>
                       <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Weekly Score</p>
                       <p className={`text-3xl font-bold mt-1 ${stats.adherence >= 80 ? 'text-green-600' : 'text-orange-500'}`}>{stats.adherence}%</p>
                   </div>
                   <div className={`p-2 rounded-full ${stats.adherence >= 80 ? 'bg-green-100' : 'bg-orange-100'}`}>
                        <Check size={20} className={stats.adherence >= 80 ? 'text-green-600' : 'text-orange-600'} />
                   </div>
                </div>
                <div className="pt-3 border-t border-slate-50 mt-2">
                   <div className="flex justify-between items-center">
                       <p className="text-xs font-bold text-slate-500">Current Streak</p>
                       <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                          <Sparkles size={10} /> {stats.streak} Days
                       </span>
                   </div>
                </div>
             </div>
         </div>
       </div>

      {/* Prominent Low Stock Alert */}
      {lowStockMeds.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm animate-in slide-in-from-top-2">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-start">
              <div className="bg-red-100 p-2 rounded-full mr-3 shrink-0">
                 <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-800">Medication Supply Low</h4>
                <p className="text-xs text-red-600 mt-1 max-w-[250px] sm:max-w-none">
                  Low stock for: <span className="font-medium">{lowStockMeds.map(m => m.name).join(', ')}</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLLAPSIBLE INTERACTION ALERT */}
      {interactionWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden shadow-sm">
           <div 
             className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition-colors" 
             onClick={() => setShowInteractionSection(!showInteractionSection)}
           >
              <div className="flex items-center gap-3">
                 <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                    <AlertTriangle size={20} />
                 </div>
                 <div>
                    <h3 className="font-bold text-amber-900">Interaction Detected</h3>
                    <p className="text-xs text-amber-700">Review potential risks with your current meds</p>
                 </div>
              </div>
              <button className="text-amber-600">
                  {showInteractionSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
           </div>
           
           {showInteractionSection && (
             <div className="p-5 border-t border-amber-200/50 bg-white/50 animate-in slide-in-from-top-2">
                 <div className="space-y-2 mb-4">
                   {interactionWarning.split('\n').map((line, idx) => {
                     const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
                     if (!cleanLine) return null;
                     return (
                       <div key={idx} className="flex gap-2 items-start text-slate-700 text-sm font-medium">
                         <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                         <span className="leading-relaxed">{cleanLine}</span>
                       </div>
                     );
                   })}
                 </div>

                 <button 
                   onClick={handleExplainInteraction}
                   disabled={isExplaining}
                   className="w-full bg-white border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl font-bold hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm mb-4"
                 >
                   {isExplaining ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles size={16} />}
                   {explanationText ? "Hide Analysis" : "Analyze with AI"}
                 </button>

                 {explanationText && (
                   <div className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm">
                       <div className="flex items-center gap-2 mb-3">
                          <Bot size={18} className="text-amber-600" />
                          <h4 className="font-bold text-slate-800 text-sm uppercase">AI Insight</h4>
                       </div>
                       <div className="prose prose-sm max-w-none text-slate-600 space-y-4">
                          {explanationText.split('###').map((section, i) => {
                              if (!section.trim()) return null;
                              const [title, ...content] = section.split('\n');
                              return (
                                  <div key={i}>
                                      <h5 className="font-bold text-slate-800 mb-1">{title.trim()}</h5>
                                      <p className="text-slate-600 text-sm pl-3 border-l-2 border-amber-200">{content.join('\n').trim()}</p>
                                  </div>
                              )
                          })}
                       </div>
                   </div>
                 )}
             </div>
           )}
        </div>
      )}

      {/* COLLAPSIBLE DIET SECTION */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl overflow-hidden shadow-sm">
         <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-50/80" onClick={handleGetDiet}>
             <div className="flex items-center gap-3">
                 <div className="bg-white p-2 rounded-full shadow-sm text-emerald-600">
                     <Utensils size={20} />
                 </div>
                 <div>
                     <h3 className="font-bold text-emerald-900">Diet Recommendations</h3>
                     <p className="text-xs text-emerald-700">AI analysis based on your condition & meds</p>
                 </div>
             </div>
             <button className="text-emerald-600">
                 {showDietSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
             </button>
         </div>
         
         {showDietSection && (
             <div className="p-4 border-t border-emerald-100/50 bg-white/40">
                 {isDietLoading ? (
                     <div className="py-6 flex flex-col items-center text-emerald-600">
                         <Loader2 className="animate-spin mb-2" />
                         <span className="text-xs font-medium">Generating plan...</span>
                     </div>
                 ) : dietPlan ? (
                     <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                         <div className="bg-emerald-100/50 p-3 rounded-lg text-sm text-emerald-900 italic font-medium border border-emerald-100">
                            "{dietPlan.summary}"
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {/* Recommended Column */}
                             <div className="space-y-3">
                                <h4 className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                                   <ThumbsUp size={16} /> Recommended
                                </h4>
                                {dietPlan.recommended.map((item: any, i: number) => (
                                   <div key={i} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex items-start gap-3">
                                      <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg shrink-0 mt-0.5">
                                         <Check size={14} />
                                      </div>
                                      <div>
                                         <p className="font-bold text-slate-800 text-sm">{item.item}</p>
                                         <p className="text-xs text-slate-500 mt-0.5">{item.benefit}</p>
                                      </div>
                                   </div>
                                ))}
                             </div>
                             {/* Avoid Column */}
                             <div className="space-y-3">
                                <h4 className="font-bold text-red-800 text-sm flex items-center gap-2">
                                   <ThumbsDown size={16} /> Limit / Avoid
                                </h4>
                                {dietPlan.avoid.map((item: any, i: number) => (
                                   <div key={i} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex items-start gap-3">
                                      <div className="bg-red-50 text-red-600 p-1.5 rounded-lg shrink-0 mt-0.5">
                                         <X size={14} />
                                      </div>
                                      <div>
                                         <p className="font-bold text-slate-800 text-sm">{item.item}</p>
                                         <p className="text-xs text-slate-500 mt-0.5">{item.risk}</p>
                                      </div>
                                   </div>
                                ))}
                             </div>
                         </div>
                     </div>
                 ) : (
                     <div className="py-2 text-center">
                         <button onClick={handleGetDiet} className="text-xs font-bold text-emerald-600 underline">Tap to load recommendations</button>
                     </div>
                 )}
             </div>
         )}
      </div>

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
                <button onClick={enableNotifications} className="text-xs bg-medical-50 text-medical-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium border border-medical-200">
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
                  <button onClick={() => handleTakeDose(task.id, task.scheduledTime)} className="bg-medical-600 hover:bg-medical-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Take</button>
                ) : (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">Taken</span>
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
             <button onClick={() => setShowAddModal(true)} className="py-3 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 flex flex-col items-center justify-center gap-1 transition shadow-sm hover:shadow">
               <Plus size={16} className="text-medical-600 mb-1" /> Add Manually
             </button>
             <button onClick={() => setShowImportModal(true)} className="py-3 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 flex flex-col items-center justify-center gap-1 transition shadow-sm hover:shadow">
               <ScanLine size={16} className="text-medical-600 mb-1" /> Import Rx
             </button>
             <button onClick={() => setShowVerifyModal(true)} className="py-3 border border-slate-200 bg-white text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 flex flex-col items-center justify-center gap-1 transition shadow-sm hover:shadow">
               <ScanEye size={16} className="text-medical-600 mb-1" /> Verify Pill
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
                        onClick={() => handleRefillClick(med.id)}
                        className={`flex-1 text-xs py-2 rounded-lg transition-all active:scale-95 font-bold flex items-center justify-center gap-2 ${
                            addingToCart === med.id 
                            ? 'bg-green-600 text-white' 
                            : med.stock <= 5 
                                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                : 'bg-medical-50 text-medical-700 hover:bg-medical-100'
                        }`}
                    >
                      {addingToCart === med.id ? (
                          <>
                             <Check size={14} /> Added!
                          </>
                      ) : (
                          <>
                             <ShoppingCart size={14} />
                             {med.stock <= 5 ? 'Refill Now' : 'Refill'}
                          </>
                      )}
                    </button>
                 </div>
                 {expandedMeds.has(med.id) && (
                   <div className="mt-3 pt-3 border-t border-slate-100 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
                     <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Schedule</p>
                          <div className="flex flex-wrap gap-1">
                            {med.times.map(t => <span key={t} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-xs font-mono text-slate-600">{t}</span>)}
                          </div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                          <div className="text-slate-700 text-xs">
                             <div className="flex justify-between"><span className="text-slate-500">Start:</span><span className="font-medium">{new Date(med.startDate).toLocaleDateString()}</span></div>
                          </div>
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

      {/* HISTORY VIEW (Existing Code) */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-4 border-b border-slate-50 flex items-center gap-2">
                <Calendar size={18} className="text-slate-400" />
                <h3 className="font-bold text-slate-800">Recent Activity</h3>
             </div>
             <div className="divide-y divide-slate-50">
               {[...logs].sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()).map((log) => {
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
      )}

      {/* MODALS */}
      {showVitalsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
             <button onClick={() => setShowVitalsModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"><X size={16} /></button>
             <div className="flex items-center gap-3 mb-6">
                <div className="bg-medical-100 p-2 rounded-xl text-medical-600"><Activity size={24} /></div>
                <h3 className="text-xl font-bold text-slate-800">Log Health Vitals</h3>
             </div>
             
             {isScanning ? (
                 <div className="py-12 text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                       <div className="absolute inset-0 border-4 border-medical-200 rounded-full"></div>
                       <div className="absolute inset-0 border-4 border-medical-600 rounded-full border-t-transparent animate-spin"></div>
                       <Heart size={32} className="absolute inset-0 m-auto text-medical-600 animate-pulse" />
                    </div>
                    <p className="font-bold text-slate-800">Measuring...</p>
                    <p className="text-sm text-slate-500 mt-1">Place finger on camera or hold still.</p>
                 </div>
             ) : (
                <form onSubmit={handleUpdateVitals} className="space-y-4">
                    <button 
                      type="button" 
                      onClick={handleSimulateVitals}
                      className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 mb-4 hover:opacity-90 transition-opacity"
                    >
                       <ScanEye size={18} /> AI Quick Measure
                    </button>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Heart Rate (bpm)</label>
                          <input 
                             type="number" 
                             value={vitalsForm.heartRate || ''}
                             onChange={(e) => setVitalsForm({...vitalsForm, heartRate: Number(e.target.value)})}
                             className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-medical-500 text-gray-900 bg-white"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Glucose (mg/dL)</label>
                          <input 
                             type="number" 
                             value={vitalsForm.bloodGlucose || ''}
                             onChange={(e) => setVitalsForm({...vitalsForm, bloodGlucose: Number(e.target.value)})}
                             className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-medical-500 text-gray-900 bg-white"
                          />
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Systolic BP</label>
                          <input 
                             type="number" 
                             value={vitalsForm.systolicBP || ''}
                             onChange={(e) => setVitalsForm({...vitalsForm, systolicBP: Number(e.target.value)})}
                             className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-medical-500 text-gray-900 bg-white"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Diastolic BP</label>
                          <input 
                             type="number" 
                             value={vitalsForm.diastolicBP || ''}
                             onChange={(e) => setVitalsForm({...vitalsForm, diastolicBP: Number(e.target.value)})}
                             className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-medical-500 text-gray-900 bg-white"
                          />
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">SpO2 (%)</label>
                          <input 
                             type="number" 
                             value={vitalsForm.oxygenSaturation || ''}
                             onChange={(e) => setVitalsForm({...vitalsForm, oxygenSaturation: Number(e.target.value)})}
                             className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-medical-500 text-gray-900 bg-white"
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Temp (°C)</label>
                          <input 
                             type="number" 
                             step="0.1"
                             value={vitalsForm.temperature || ''}
                             onChange={(e) => setVitalsForm({...vitalsForm, temperature: Number(e.target.value)})}
                             className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-medical-500 text-gray-900 bg-white"
                          />
                       </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                       <button type="submit" className="w-full py-3.5 bg-medical-600 text-white rounded-xl font-bold shadow-md hover:bg-medical-700 transition">Save Log</button>
                    </div>
                </form>
             )}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"><X size={16} /></button>
            <div className="flex items-center gap-3 mb-6">
               <div className="bg-medical-100 p-2 rounded-xl text-medical-600"><Pill size={24} /></div>
               <h3 className="text-xl font-bold text-slate-800">Add Medication</h3>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              onAddMed({
                id: Date.now().toString(),
                name: (form.elements.namedItem('name') as HTMLInputElement).value,
                dosage: (form.elements.namedItem('dose') as HTMLInputElement).value,
                frequency: (form.elements.namedItem('frequency') as HTMLSelectElement).value,
                times: (form.elements.namedItem('times') as HTMLInputElement).value.split(',').map(s => s.trim()),
                instructions: (form.elements.namedItem('instructions') as HTMLInputElement).value || 'Follow instructions',
                startDate: today,
                status: MedStatus.ACTIVE,
                stock: 30
              });
              setShowAddModal(false);
            }} className="space-y-4">
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Medicine Name</label><input name="name" required className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-medical-500 outline-none text-gray-900 bg-white placeholder:text-gray-400" placeholder="e.g. Ibuprofen" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Dosage</label><input name="dose" required className="w-full border border-slate-200 rounded-xl p-3 text-sm text-gray-900 bg-white placeholder:text-gray-400" placeholder="e.g. 200mg" /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Frequency</label><select name="frequency" className="w-full border border-slate-200 rounded-xl p-3 text-sm text-gray-900 bg-white"><option value="Daily">Daily</option><option value="2x Daily">2x Daily</option><option value="Weekly">Weekly</option></select></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Times (Comma Sep)</label><input name="times" defaultValue="09:00" className="w-full border border-slate-200 rounded-xl p-3 text-sm text-gray-900 bg-white placeholder:text-gray-400" placeholder="09:00, 20:00" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Instructions</label><input name="instructions" className="w-full border border-slate-200 rounded-xl p-3 text-sm text-gray-900 bg-white placeholder:text-gray-400" placeholder="e.g. Take with food" /></div>
              <div className="pt-2 flex gap-3"><button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition">Cancel</button><button type="submit" className="flex-1 py-3 text-white bg-medical-600 rounded-xl font-semibold shadow-lg hover:bg-medical-700 transition">Save</button></div>
            </form>
          </div>
        </div>
      )}
      
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative">
            <button onClick={() => setShowImportModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full"><X size={16} /></button>
            <h3 className="text-xl font-bold mb-4 text-center">Scan Prescription</h3>
            {!scannedMed ? (
              <label className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center cursor-pointer">
                 <FileText size={48} className="text-slate-300 mb-2" />
                 <p className="text-sm text-slate-500">Tap to upload</p>
                 <input type="file" accept="image/*" className="hidden" onChange={handleScanImport} />
                 {isScanning && <Loader2 className="animate-spin mt-2" />}
              </label>
            ) : (
              <form onSubmit={confirmImportedMed} className="space-y-3">
                 <input name="name" defaultValue={scannedMed.name} className="w-full border border-slate-200 rounded-lg p-2 text-sm text-gray-900 bg-white" />
                 <input name="dosage" defaultValue={scannedMed.dosage} className="w-full border border-slate-200 rounded-lg p-2 text-sm text-gray-900 bg-white" />
                 <input name="frequency" defaultValue={scannedMed.frequency} className="w-full border border-slate-200 rounded-lg p-2 text-sm text-gray-900 bg-white" />
                 <input name="times" defaultValue={scannedMed.times?.join(', ')} className="w-full border border-slate-200 rounded-lg p-2 text-sm text-gray-900 bg-white" />
                 <input name="instructions" defaultValue={scannedMed.instructions} className="w-full border border-slate-200 rounded-lg p-2 text-sm text-gray-900 bg-white" />
                 <button type="submit" className="w-full py-3 mt-2 bg-medical-600 text-white rounded-xl font-bold">Confirm & Add</button>
              </form>
            )}
          </div>
        </div>
      )}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative">
            <button onClick={() => {setShowVerifyModal(false); setPillImage(null);}} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full"><X size={16} /></button>
            <h3 className="text-xl font-bold mb-4 text-center">Verify Pill</h3>
            {!pillImage ? (
                <label className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center cursor-pointer">
                    <ScanEye size={48} className="text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Take Photo</p>
                    <input type="file" accept="image/*" capture="environment" onChange={handlePillVerification} className="hidden" />
                </label>
            ) : isScanning ? <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto mb-2" /> Analyzing...</div> : (
                <div className="space-y-4">
                    <img src={pillImage} className="w-full h-40 object-contain bg-black/5 rounded-xl" />
                    {pillResult && <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h4 className="font-bold">{pillResult.name}</h4><p className="text-sm">{pillResult.description}</p></div>}
                    <button onClick={() => setPillImage(null)} className="w-full py-3 bg-slate-100 rounded-xl">Scan Another</button>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};