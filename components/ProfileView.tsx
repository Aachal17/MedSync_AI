import React, { useState, useEffect } from 'react';
import { User, PatientDetails, Role } from '../types';
import { Edit2, Save, X, Camera } from 'lucide-react';

interface ProfileViewProps {
  user: User;
  onSave: (updatedUser: User) => void;
}

interface ProfileFormState {
  name: string;
  weight: string;
  conditions: string;
  allergies: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<ProfileFormState>({
    name: '',
    weight: '',
    conditions: '',
    allergies: ''
  });

  const isPatient = user.role === Role.PATIENT;
  const patientDetails = user.details as PatientDetails;

  useEffect(() => {
    if (user) {
      setFormState({
        name: user.name || '',
        weight: isPatient && patientDetails?.weight !== undefined ? patientDetails.weight.toString() : '',
        conditions: isPatient && patientDetails?.conditions ? patientDetails.conditions.join(', ') : '',
        allergies: isPatient && patientDetails?.allergies ? patientDetails.allergies.join(', ') : ''
      });
    }
  }, [user, isPatient, patientDetails]);

  const handleSave = () => {
    let updatedUser: User = { ...user, name: formState.name.trim() };

    if (isPatient) {
      updatedUser = {
        ...updatedUser,
        details: {
          ...patientDetails,
          weight: formState.weight ? parseFloat(formState.weight) : undefined,
          conditions: formState.conditions.split(',').map(s => s.trim()).filter(s => s.length > 0),
          allergies: formState.allergies.split(',').map(s => s.trim()).filter(s => s.length > 0)
        }
      };
    }

    onSave(updatedUser);
    setIsEditing(false);
  };

  const handleCancel = () => {
     // Reset form state to current user values
     setFormState({
        name: user.name || '',
        weight: isPatient && patientDetails?.weight !== undefined ? patientDetails.weight.toString() : '',
        conditions: isPatient && patientDetails?.conditions ? patientDetails.conditions.join(', ') : '',
        allergies: isPatient && patientDetails?.allergies ? patientDetails.allergies.join(', ') : ''
     });
     setIsEditing(false);
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm max-w-md mx-auto border border-slate-100 transition-all">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-xl font-bold text-slate-800">My Profile</h2>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)} 
            className="text-medical-600 hover:text-medical-700 p-2 bg-medical-50 hover:bg-medical-100 rounded-lg transition-colors"
            title="Edit Profile"
          >
            <Edit2 size={18} />
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={handleCancel} 
              className="text-slate-400 p-2 hover:bg-slate-50 rounded-lg transition-colors"
              title="Cancel"
            >
              <X size={18} />
            </button>
            <button 
              onClick={handleSave} 
              className="text-white p-2 bg-medical-600 hover:bg-medical-700 rounded-lg transition-colors shadow-sm"
              title="Save Changes"
            >
              <Save size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="relative group cursor-pointer">
          <img 
            src={user.avatar} 
            className="w-28 h-28 rounded-full border-4 border-slate-50 object-cover shadow-sm group-hover:border-medical-50 transition-colors" 
            alt="Profile" 
          />
          {isEditing && (
            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center backdrop-blur-[1px]">
              <Camera size={24} className="text-white opacity-90" />
            </div>
          )}
        </div>
        {!isEditing && <h2 className="text-center font-bold text-xl mt-3 text-slate-800">{user.name}</h2>}
      </div>

      {!isEditing ? (
        <div className="space-y-5">
          {isPatient ? (
            <>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <span className="text-slate-500 text-sm font-medium">Date of Birth</span>
                <span className="font-semibold text-slate-700 text-sm">{patientDetails?.dob}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <span className="text-slate-500 text-sm font-medium">Weight</span>
                <span className="font-semibold text-slate-700 text-sm">{patientDetails?.weight ? `${patientDetails.weight} kg` : '-'}</span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                <span className="text-slate-500 text-sm font-medium pt-0.5">Conditions</span>
                <span className="font-semibold text-slate-700 text-sm text-right max-w-[60%] leading-snug">
                  {patientDetails?.conditions && patientDetails.conditions.length > 0 ? patientDetails.conditions.join(', ') : 'None'}
                </span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                <span className="text-slate-500 text-sm font-medium pt-0.5">Allergies</span>
                <span className="font-semibold text-red-600 text-sm text-right max-w-[60%] leading-snug bg-red-50 px-2 py-0.5 rounded">
                  {patientDetails?.allergies && patientDetails.allergies.length > 0 ? patientDetails.allergies.join(', ') : 'None'}
                </span>
              </div>
            </>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg text-center">
               <p className="text-sm text-slate-500">Professional details are managed by your administrator.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Full Name</label>
            <input 
              type="text"
              value={formState.name} 
              onChange={(e) => setFormState({...formState, name: e.target.value})}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white"
              placeholder="Your full name"
            />
          </div>
          
          {isPatient && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Weight (kg)</label>
                <input 
                  type="number"
                  value={formState.weight} 
                  onChange={(e) => setFormState({...formState, weight: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white"
                  placeholder="e.g. 70"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Conditions</label>
                <textarea 
                  value={formState.conditions} 
                  onChange={(e) => setFormState({...formState, conditions: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white resize-none"
                  placeholder="Hypertension, Diabetes (comma separated)"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide text-red-600">Allergies</label>
                <textarea 
                  value={formState.allergies} 
                  onChange={(e) => setFormState({...formState, allergies: e.target.value})}
                  className="w-full border border-red-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-red-50 focus:bg-white text-red-900 placeholder:text-red-300"
                  placeholder="Penicillin, Peanuts (comma separated)"
                  rows={2}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};