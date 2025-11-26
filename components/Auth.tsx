
import React, { useState, useEffect } from 'react';
import { UserRole, Institution, User, Student } from '../types';
import { getInstitutionById, getStudents, loginUser, registerInstitution } from '../services/storageService';
import { Button } from './Button';
import { ChevronRight, ArrowLeft, Copy, Check } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
}

const BACKGROUND_IMAGES = [
  {
    main: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=800&q=80",
    secondary: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=400&q=80",
    overlay: "bg-blue-900/40"
  },
  {
    main: "https://images.unsplash.com/photo-1507842217153-e21f4066827c?auto=format&fit=crop&w=800&q=80",
    secondary: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=400&q=80",
    overlay: "bg-indigo-900/40"
  }
];

export const Auth: React.FC<Props> = ({ onLogin }) => {
  // Views: 'login' | 'register'
  const [view, setView] = useState<'login' | 'register'>('login');
  
  // Login State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [institutionId, setInstitutionId] = useState('');
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Registration State
  const [regData, setRegData] = useState({
    name: '', type: 'SCHOOL', address: '', contact: '', principalName: '', password: ''
  });
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Visuals
  const [bgIndex, setBgIndex] = useState(0);
  useEffect(() => {
    setBgIndex(Math.floor(Math.random() * BACKGROUND_IMAGES.length));
  }, []);

  // --- Registration Logic ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const res = await registerInstitution(regData);
        setGeneratedCode(res.code);
        setRegData({ name: '', type: 'SCHOOL', address: '', contact: '', principalName: '', password: '' });
    } catch (err: any) {
        setError("Registration failed. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const copyCode = () => {
    if(generatedCode) {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- Login Logic ---
  const handleInstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const inst = await getInstitutionById(institutionId.toUpperCase());
    setLoading(false);
    if (inst) {
      setInstitution(inst);
      setStep(2);
      setError('');
    } else {
      setError('❌ Invalid Institute Code. Please register if you are new.');
    }
  };

  const handleFetchStudents = async () => {
     if (institution) {
        setLoading(true);
        const list = await getStudents(institution.id);
        setStudents(list);
        setLoading(false);
     }
  };

  useEffect(() => {
    if (step === 3 && role !== UserRole.ADMIN) {
        handleFetchStudents();
    }
  }, [step, role]);

  const handleLogin = async (studentId?: string) => {
    if (!institution || !role) return;
    try {
        setLoading(true);
        setError(''); // Clear previous errors
        
        const user = await loginUser(role, institution.id, studentId || institutionId, password);
        onLogin(user);
    } catch (err: any) {
        // Specific Error Mapping
        let msg = 'Login Failed';
        if (err.message.includes('401') || err.message.toLowerCase().includes('credentials')) {
            if (role === UserRole.ADMIN) {
                msg = '🔒 Incorrect Admin Password';
            } else {
                msg = '🚫 Authentication Failed';
            }
        } else if (err.message.includes('404')) {
             msg = `❌ ${role === UserRole.ADMIN ? 'Institution' : 'Student'} record not found`;
        } else {
            msg = err.message || '⚠️ Network Error or Server Offline';
        }
        setError(msg);
    } finally {
        setLoading(false);
    }
  };

  const bg = BACKGROUND_IMAGES[bgIndex];

  // --- Render Views ---

  if (view === 'register') {
    return (
      <div className="min-h-[90vh] flex flex-col justify-center items-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-lg border border-gray-100">
           {!generatedCode ? (
             <div className="animate-fade-in">
                <button onClick={() => setView('login')} className="flex items-center text-gray-500 mb-6 hover:text-gray-800"><ArrowLeft size={16} className="mr-1"/> Back to Login</button>
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-100 p-2 rounded-lg text-2xl">🏛️</div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Register Institute</h2>
                        <p className="text-xs text-gray-500">Create account for School or College</p>
                    </div>
                </div>
                
                <form onSubmit={handleRegister} className="space-y-4 mt-6">
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Institution Name</label>
                      <input type="text" required value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="e.g. Springfield High"/>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                        <select value={regData.type} onChange={e => setRegData({...regData, type: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl">
                            <option value="SCHOOL">School</option>
                            <option value="COLLEGE">College</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Principal / Dean</label>
                        <input type="text" required value={regData.principalName} onChange={e => setRegData({...regData, principalName: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="Full Name"/>
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                      <input type="text" required value={regData.address} onChange={e => setRegData({...regData, address: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="City, State"/>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact No</label>
                      <input type="text" required value={regData.contact} onChange={e => setRegData({...regData, contact: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="+1 234..."/>
                   </div>
                   <div className="border-t pt-4 mt-4">
                      <label className="block text-xs font-bold text-gray-800 uppercase mb-1">Create Admin Password</label>
                      <p className="text-[10px] text-gray-400 mb-2">You will use this password to login as Admin.</p>
                      <input type="password" required value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})} className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl" placeholder="Strong password"/>
                   </div>

                   <Button type="submit" fullWidth disabled={loading} className="mt-4">{loading ? 'Creating...' : '🚀 Register & Get Code'}</Button>
                </form>
             </div>
           ) : (
             <div className="text-center animate-slide-up py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Successful!</h2>
                <p className="text-gray-500 mb-6">Your Institute has been registered.</p>
                
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl mb-6 relative group">
                    <p className="text-xs text-blue-500 uppercase font-bold mb-2">Your Institute Code</p>
                    <div className="flex items-center justify-center gap-3">
                        <div className="text-4xl font-mono font-bold text-blue-900 tracking-wider">
                            {generatedCode}
                        </div>
                        <button onClick={copyCode} className="p-2 hover:bg-blue-200 rounded-full transition-colors text-blue-600">
                            {copied ? <Check size={20}/> : <Copy size={20}/>}
                        </button>
                    </div>
                    <p className="text-[10px] text-blue-400 mt-2">Share this code with your students and parents.</p>
                </div>
                
                <p className="text-xs text-red-500 bg-red-50 p-3 rounded-xl mb-6 border border-red-100">
                    ⚠️ <strong>Important:</strong> Save this code immediately. You cannot recover it easily without support.
                </p>
                
                <Button onClick={() => { setView('login'); setInstitutionId(generatedCode); setGeneratedCode(null); }} fullWidth>🔐 Login Now</Button>
             </div>
           )}
        </div>
      </div>
    );
  }

  // LOGIN VIEW
  return (
    <div className="min-h-[90vh] flex flex-col md:flex-row bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 max-w-6xl mx-auto my-auto animate-fade-in">
      {/* Left Banner */}
      <div className="hidden md:flex md:w-5/12 relative overflow-hidden bg-gray-900">
        <img src={bg.main} alt="Background" className="absolute inset-0 w-full h-full object-cover opacity-60"/>
        <div className={`absolute inset-0 ${bg.overlay} backdrop-blur-[2px]`}></div>
        <div className="relative z-10 flex flex-col h-full p-10 justify-between">
            <div>
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-2xl mb-6 shadow-lg border border-white/20">🎓</div>
                <h1 className="text-4xl font-bold text-white leading-tight mb-2">EduMatrix</h1>
                <p className="text-blue-100 font-light">Result Management System</p>
            </div>
            <div className="relative">
                <img src={bg.secondary} alt="Student" className="w-full h-48 object-cover rounded-2xl shadow-2xl border-4 border-white/10 rotate-2 hover:rotate-0 transition-transform duration-500"/>
                <div className="absolute -bottom-4 -right-4 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg max-w-[200px]">
                    <p className="text-xs text-gray-600 italic">"Empowering institutions with seamless management."</p>
                </div>
            </div>
        </div>
      </div>

      {/* Right Content */}
      <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-white relative">
        <div className="max-w-sm mx-auto w-full mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Welcome Back</h2>
            <p className="text-sm font-medium text-gray-400 mt-1">
                {step === 1 ? 'Enter your Institute Code to continue' : `Login to ${institution?.name}`}
            </p>
        </div>

        {/* Step 1: Institute Code */}
        {step === 1 && (
            <div className="space-y-6 animate-fade-in w-full max-w-sm mx-auto">
              <form onSubmit={handleInstitutionSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide">🔑 Institute Code</label>
                  <div className="relative">
                    <input 
                        type="text" 
                        value={institutionId}
                        onChange={e => setInstitutionId(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none text-center text-xl tracking-[0.1em] font-mono uppercase transition-all"
                        placeholder="SCH-XXXX"
                        autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">Your unique code (e.g., SCH-1234)</p>
                </div>
                {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-xl border border-red-100 animate-pulse">{error}</p>}
                <Button type="submit" fullWidth disabled={loading} className="h-14 text-lg shadow-xl shadow-blue-500/20">{loading ? 'Verifying...' : 'Next ➡️'}</Button>
              </form>
              
              <div className="text-center pt-6 border-t border-gray-100 mt-4">
                 <p className="text-xs text-gray-400 mb-3">Don't have an Institute Code?</p>
                 <button onClick={() => setView('register')} className="px-6 py-3 rounded-xl bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 transition-colors">
                    🚀 Register New Institute
                 </button>
              </div>
            </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 2 && (
            <div className="space-y-4 animate-slide-up w-full max-w-sm mx-auto">
              <div className="text-center mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <h2 className="text-xl font-bold text-blue-900">{institution?.name}</h2>
                <div className="flex items-center justify-center gap-2 mt-1">
                     <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">{institution?.type}</span>
                     <span className="text-gray-400 text-xs">•</span>
                     <span className="text-gray-500 text-xs font-mono">{institution?.id}</span>
                </div>
              </div>

              <div className="grid gap-3">
                <button onClick={() => { setRole(UserRole.ADMIN); setStep(3); }} className="w-full p-4 border border-gray-200 rounded-2xl hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center gap-4 group bg-white shadow-sm hover:shadow-md">
                  <div className="bg-blue-100 p-3 rounded-xl group-hover:scale-110 transition-transform">👨‍🏫</div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-gray-800 text-sm">{institution?.type === 'SCHOOL' ? 'Principal / Staff' : 'Dean / Staff'}</h3>
                    <p className="text-xs text-gray-500">Manage Results & Data</p>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-blue-500"/>
                </button>

                <button onClick={() => { setRole(UserRole.STUDENT); setStep(3); }} className="w-full p-4 border border-gray-200 rounded-2xl hover:bg-orange-50 hover:border-orange-300 transition-all flex items-center gap-4 group bg-white shadow-sm hover:shadow-md">
                  <div className="bg-orange-100 p-3 rounded-xl group-hover:scale-110 transition-transform">🎓</div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-gray-800 text-sm">Student</h3>
                    <p className="text-xs text-gray-500">View My Results</p>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-orange-500"/>
                </button>

                <button onClick={() => { setRole(UserRole.PARENT); setStep(3); }} className="w-full p-4 border border-gray-200 rounded-2xl hover:bg-green-50 hover:border-green-300 transition-all flex items-center gap-4 group bg-white shadow-sm hover:shadow-md">
                  <div className="bg-green-100 p-3 rounded-xl group-hover:scale-110 transition-transform">👪</div>
                  <div className="text-left flex-1">
                    <h3 className="font-bold text-gray-800 text-sm">Parent</h3>
                    <p className="text-xs text-gray-500">Track Child's Progress</p>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-green-500"/>
                </button>
              </div>

              <button onClick={() => { setStep(1); setInstitution(null); }} className="text-xs text-gray-400 hover:text-gray-600 block mx-auto mt-6 font-medium transition-colors">
                ↩️ Change Institute Code
              </button>
            </div>
        )}

        {/* Step 3: Credentials */}
        {step === 3 && (
            <div className="space-y-6 animate-slide-up w-full max-w-sm mx-auto">
                <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
                    {role === UserRole.ADMIN ? '👨‍🏫 Admin Access' : (role === UserRole.PARENT ? '👪 Parent Portal' : '🎓 Student Portal')}
                </h2>
                </div>

                {role === UserRole.ADMIN ? (
                <div className="space-y-5">
                    <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-4 focus:ring-primary/10 transition-all" autoFocus />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
                    <Button onClick={() => handleLogin()} fullWidth disabled={loading} className="h-14 text-lg shadow-xl shadow-blue-500/20">{loading ? 'Verifying...' : '🔓 Login'}</Button>
                </div>
                ) : (
                <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Select Profile</p>
                    {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
                    {loading ? <p className="text-center text-gray-400">Loading students...</p> : (
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {students.length > 0 ? (
                        students.map(s => (
                        <button
                            key={s.id}
                            onClick={() => handleLogin(s.id)}
                            className="w-full p-4 text-left bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-2xl flex justify-between items-center group transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg group-hover:bg-blue-200 transition-colors">
                                👤
                            </div>
                            <div>
                                <div className="font-bold text-gray-700 group-hover:text-blue-700 transition-colors">{s.name}</div>
                                <div className="text-xs text-gray-400 group-hover:text-blue-500">🆔 {s.enrollmentId} • {s.batch}</div>
                            </div>
                            </div>
                            <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                        <div className="text-2xl mb-2">🚫</div>
                        No students found for this Institute.
                        </div>
                    )}
                    </div>
                    )}
                </div>
                )}
                <button onClick={() => setStep(2)} className="text-xs text-gray-400 hover:text-gray-600 block mx-auto mt-6 font-medium transition-colors">⬅️ Back to Roles</button>
            </div>
        )}
      </div>
    </div>
  );
};
