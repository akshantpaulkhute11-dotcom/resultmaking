
import React, { useState, useEffect, useRef } from 'react';
import { Student, ExamResult, User, Institution, SharedFile, UserRole, AttendanceRecord, AppNotification, ExamSchedule, ExamSubmission } from '../types';
import { getResults, getStudents, getInstitutionById, getFiles, getAttendance, getNotifications, addFeedback, getExams, getStudentSubmission, startExam, submitExam, updateSubmissionProgress } from '../services/storageService';
import { analyzePerformanceFast, analyzeCareerDeep, generateSpeech, playRawAudio, editImage } from '../services/geminiService';
import { LineChart, Line, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from './Button';
import { Loader2 } from 'lucide-react';

interface Props {
  user: User;
}

export const StudentDashboard: React.FC<Props> = ({ user }) => {
  const isParent = user.role === UserRole.PARENT;
  const [activeTab, setActiveTab] = useState<'academic' | 'studio' | 'notifications' | 'exams'>('academic');
  const [student, setStudent] = useState<Student | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [institution, setInstitution] = useState<Institution | undefined>(undefined);
  const [attendance, setAttendance] = useState<AttendanceRecord | undefined>(undefined);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]); // simplified for now

  // AI States
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  // Image Editor States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz State
  const [activeQuiz, setActiveQuiz] = useState<ExamSchedule | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizTimer, setQuizTimer] = useState(0);
  const [quizSubmission, setQuizSubmission] = useState<ExamSubmission | undefined>(undefined);

  useEffect(() => {
    const loadData = async () => {
        const inst = await getInstitutionById(user.institutionId);
        if (inst) setInstitution(inst);

        const allStudents = await getStudents(user.institutionId);
        const foundStudent = allStudents.find(s => s.id === user.studentId);
        
        if (foundStudent) {
            setStudent(foundStudent);
            
            const allResults = await getResults(user.institutionId);
            const studentResults = allResults.filter(r => r.studentId === foundStudent.id);
            studentResults.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setResults(studentResults);

            const allFiles = await getFiles(user.institutionId);
            setFiles(allFiles.filter(f => !f.targetBatch || f.targetBatch === foundStudent.batch));

            const allAttendance = await getAttendance(user.institutionId);
            setAttendance(allAttendance.find(a => a.studentId === foundStudent.id));

            const allNotifs = await getNotifications(user.institutionId);
            setNotifications(allNotifs.filter(n => !n.targetBatch || n.targetBatch === foundStudent.batch));

            const allExams = await getExams(user.institutionId);
            setExams(allExams.filter(e => e.batch === foundStudent.batch).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        }
    };
    loadData();
  }, [user]);

  // Quiz Timer Effect
  useEffect(() => {
    let interval: any;
    if (activeQuiz && quizTimer > 0) {
      interval = setInterval(() => {
         setQuizTimer(prev => prev - 1);
      }, 1000);
    } else if (activeQuiz && quizTimer === 0) {
       handleSubmitQuiz();
    }
    return () => clearInterval(interval);
  }, [activeQuiz, quizTimer]);

  const handleFastAnalysis = async () => {
    if (!student || !institution) return;
    setLoadingAi(true);
    const attPercent = attendance ? Math.round((attendance.presentDays / attendance.totalDays) * 100) : undefined;
    const analysis = await analyzePerformanceFast(student, results, institution.type, attPercent);
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  const handleDeepAnalysis = async () => {
    if (!student) return;
    setLoadingAi(true);
    setThinkingMode(true);
    const analysis = await analyzeCareerDeep(student, results);
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  const handleTTS = async () => {
    if (!aiAnalysis) return;
    setPlayingAudio(true);
    const audioData = await generateSpeech(aiAnalysis);
    if (audioData) await playRawAudio(audioData);
    setPlayingAudio(false);
  };

  const handleImageEdit = async () => {
    if (!selectedImage || !imagePrompt) return;
    setProcessingImage(true);
    const result = await editImage(selectedImage, imagePrompt);
    if (result) setEditedImage(result);
    setProcessingImage(false);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackMsg || !student) return;
    await addFeedback({
        id: '', // backend gen
        institutionId: user.institutionId,
        studentId: student.id,
        studentName: student.name,
        message: feedbackMsg,
        date: new Date().toISOString().split('T')[0]
    });
    setFeedbackMsg('');
    alert("Feedback sent to admin!");
  };

  const handleStartQuiz = async (exam: ExamSchedule) => {
    if (!student) return;
    const sub = await startExam(exam.id, student.id, student.name);
    setQuizSubmission(sub);
    setActiveQuiz(exam);
    setQuizTimer(exam.durationMinutes * 60);
    setQuizAnswers({});
  };

  const handleSubmitQuiz = async () => {
    if(!activeQuiz || !student || !quizSubmission) return;
    await submitExam(quizSubmission.id, quizAnswers, activeQuiz.questions || []);
    setActiveQuiz(null);
    alert("Quiz Submitted Successfully!");
  };

  const checkSubmission = async (examId: string) => {
    // Helper to check status on fly if needed, but simplistic check used in render below
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getPerformanceEmoji = (percentage: number) => {
     if (percentage >= 90) return '🚀 Excellent';
     if (percentage >= 75) return '👍 Good';
     if (percentage >= 50) return '😐 Average';
     return '🤔 Needs Improvement';
  };

  if (!student) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

  const chartData = results.map(r => ({
    name: r.examName.substring(0, 8), 
    score: Math.round((r.marksObtained / r.totalMarks) * 100),
  }));

  const attPercent = attendance ? Math.round((attendance.presentDays / attendance.totalDays) * 100) : 0;
  const attData = [
    { name: 'Present', value: attPercent, color: '#22c55e' },
    { name: 'Absent', value: 100 - attPercent, color: '#e5e7eb' },
  ];

  const overallAvg = results.length > 0 
    ? (results.reduce((acc, curr) => acc + (curr.marksObtained / curr.totalMarks) * 100, 0) / results.length).toFixed(1)
    : "0";

  // Active Quiz View
  if (activeQuiz && activeQuiz.questions) {
     return (
        <div className="fixed inset-0 bg-white z-50 p-4 flex flex-col animate-fade-in">
           <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                 <h2 className="text-xl font-bold text-gray-800">{activeQuiz.title}</h2>
                 <p className="text-sm text-gray-500">{activeQuiz.subject}</p>
              </div>
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-mono font-bold text-lg border border-red-100 flex items-center gap-2">
                 ⏳ {formatTime(quizTimer)}
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-6 pb-20">
              {activeQuiz.questions.map((q, i) => (
                 <div key={q.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <p className="font-bold text-gray-800 mb-4 text-lg">❓ {i+1}. {q.text}</p>
                    <div className="grid grid-cols-1 gap-3">
                       {q.options.map((opt, optIndex) => (
                          <label key={optIndex} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${quizAnswers[q.id] === optIndex ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${quizAnswers[q.id] === optIndex ? 'border-blue-500' : 'border-gray-300'}`}>
                                {quizAnswers[q.id] === optIndex && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"/>}
                             </div>
                             <input type="radio" name={q.id} className="hidden" onChange={() => {
                                 const newAnswers = {...quizAnswers, [q.id]: optIndex};
                                 setQuizAnswers(newAnswers);
                                 if(quizSubmission) updateSubmissionProgress(quizSubmission.id, newAnswers);
                             }} checked={quizAnswers[q.id] === optIndex} />
                             <span className="text-gray-700">{opt}</span>
                          </label>
                       ))}
                    </div>
                 </div>
              ))}
           </div>
           
           <div className="border-t pt-4">
              <Button onClick={handleSubmitQuiz} fullWidth>📤 Submit Quiz</Button>
           </div>
        </div>
     );
  }

  return (
    <div className="pb-20 space-y-6 animate-fade-in print:p-0 print:pb-0">
      
      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 print:hidden overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('academic')} className={`flex-1 py-2.5 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'academic' ? 'bg-blue-50 text-primary' : 'text-gray-500'}`}>
          📈 {isParent ? "Progress" : "Academic"}
        </button>
        <button onClick={() => setActiveTab('exams')} className={`flex-1 py-2.5 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'exams' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500'}`}>
          📝 Exams
        </button>
        <button onClick={() => setActiveTab('notifications')} className={`flex-1 py-2.5 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'notifications' ? 'bg-orange-50 text-orange-600' : 'text-gray-500'}`}>
          🔔 Alerts {notifications.length > 0 && <span className="text-xs bg-red-500 text-white rounded-full px-1.5 ml-1">{notifications.length}</span>}
        </button>
        {!isParent && (
            <button onClick={() => setActiveTab('studio')} className={`flex-1 py-2.5 px-3 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'studio' ? 'bg-purple-50 text-purple-600' : 'text-gray-500'}`}>
            🎨 Studio
            </button>
        )}
      </div>

      {activeTab === 'academic' && (
        <>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
             <div className="relative z-10 flex justify-between items-start">
                <div>
                   <h2 className="text-2xl font-bold text-gray-800">👋 {student.name}</h2>
                   <p className="text-sm text-gray-500">🏫 {student.batch} • {student.section}</p>
                </div>
                <div className="bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 text-center">
                    <p className="text-[10px] text-blue-400 uppercase font-bold">Avg Score</p>
                    <p className="font-bold text-blue-700 text-lg">{overallAvg}%</p>
                </div>
             </div>
             <div className="mt-4 text-sm font-medium text-gray-600">
                Performance: {getPerformanceEmoji(Number(overallAvg))}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-gray-800 text-sm">📅 Attendance</h3>
                </div>
                {attendance ? (
                    <div className="flex items-center justify-between">
                        <div className="h-24 w-24">
                            <ResponsiveContainer>
                                <PieChart>
                                <Pie data={attData} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                                    {attData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-right pr-4">
                            <p className="text-2xl font-bold text-gray-800">{attPercent}%</p>
                            <p className="text-xs text-gray-400">{attendance.presentDays}/{attendance.totalDays} Days</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 text-center py-8">No records yet.</p>
                )}
             </div>

             <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                 <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-bold text-gray-800 text-sm">📈 Trend</h3>
                 </div>
                 <div className="h-24 w-full">
                    <ResponsiveContainer>
                        <LineChart data={chartData}>
                            <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={false} />
                            <Tooltip />
                        </LineChart>
                    </ResponsiveContainer>
                 </div>
             </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2"><span className="text-xl">🤖</span><h3 className="font-bold">AI Insight</h3></div>
                {aiAnalysis && <button onClick={handleTTS} className="bg-white/10 p-2 rounded-full">{playingAudio ? <Loader2 className="animate-spin"/> : '🔊'}</button>}
            </div>
            {!aiAnalysis ? (
                <div className="grid grid-cols-2 gap-3">
                    <Button onClick={handleFastAnalysis} disabled={loadingAi} className="bg-white text-gray-900 text-xs py-2">{loadingAi ? "..." : "⚡ Analyze Now"}</Button>
                    {!isParent && <Button onClick={handleDeepAnalysis} className="bg-purple-600 text-white text-xs py-2 border-none">🧠 Career Plan</Button>}
                </div>
            ) : (
                <div className="bg-white/10 p-4 rounded-2xl text-sm text-gray-200 mb-2 max-h-40 overflow-y-auto">{aiAnalysis}</div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📂 Downloads</h3>
             <div className="space-y-2">
                {files.length > 0 ? files.map(f => (
                    <div key={f.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <span className="text-xl">📄</span>
                           <span className="text-sm font-medium text-gray-700 truncate">{f.name}</span>
                        </div>
                        <a href={f.data} download={f.name} className="text-primary">📥</a>
                    </div>
                )) : <p className="text-xs text-gray-400 text-center">No files available.</p>}
             </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📬 Feedback</h3>
             <div className="flex gap-2">
                <input type="text" value={feedbackMsg} onChange={(e) => setFeedbackMsg(e.target.value)} placeholder="💬 Send message to admin..." className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                <Button onClick={handleSubmitFeedback} variant="secondary" className="px-4">📤</Button>
             </div>
          </div>
        </>
      )}

      {activeTab === 'exams' && (
         <div className="animate-fade-in space-y-4">
            <h2 className="text-xl font-bold text-gray-800 px-2">📅 Scheduled Exams</h2>
            {exams.length === 0 ? <p className="text-center text-gray-400 py-10">No upcoming exams.</p> : (
               exams.map(exam => (
                  <div key={exam.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">{exam.subject}</div>
                              <h3 className="font-bold text-gray-800 text-lg">{exam.title}</h3>
                           </div>
                           <div className="text-right">
                              <div className="text-lg font-bold text-primary">{exam.date}</div>
                              <div className="text-xs text-gray-500">🕒 {exam.startTime}</div>
                           </div>
                        </div>
                        
                        <div className="bg-gray-100 text-gray-500 p-3 rounded-xl text-center text-sm font-medium">
                            {exam.status === 'LIVE' ? '🟢 Exam is Live' : (exam.status === 'COMPLETED' ? '🛑 Exam Ended' : '⏳ Starts Soon')}
                        </div>
                     </div>
                  )
               )
            )}
         </div>
      )}

      {activeTab === 'notifications' && (
         <div className="animate-fade-in space-y-4">
            <h2 className="text-xl font-bold text-gray-800 px-2">📢 Notice Board</h2>
            {notifications.length === 0 ? <p className="text-center text-gray-400 py-10">No new notifications.</p> : 
               notifications.map(n => (
                  <div key={n.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative">
                     <div className="absolute top-4 right-4 text-[10px] text-gray-400">{n.date}</div>
                     <h3 className="font-bold text-gray-800 mb-1 pr-12">📌 {n.title}</h3>
                     <p className="text-sm text-gray-600 leading-relaxed">{n.message}</p>
                     <p className="text-xs text-primary font-medium mt-3">👨‍🏫 - {n.senderName}</p>
                  </div>
               ))
            }
         </div>
      )}

      {activeTab === 'studio' && !isParent && (
         <div className="animate-fade-in bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">🎨 Creative Studio</h2>
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer mb-4">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r = new FileReader(); r.onload = () => setSelectedImage(r.result as string); r.readAsDataURL(f); } }} />
                <div className="text-4xl mb-2">📸</div>
                <p className="text-sm text-gray-500">Upload Image</p>
            </div>
            {selectedImage && (
                <div className="space-y-4">
                    <img src={editedImage || selectedImage} alt="Preview" className="w-full rounded-xl" />
                    <div className="flex gap-2">
                        <input type="text" value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="e.g. Add a retro filter 🎞️" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl" />
                        <Button onClick={handleImageEdit} disabled={processingImage} className="bg-purple-600 text-white">✨ Magic Edit</Button>
                    </div>
                </div>
            )}
         </div>
      )}
    </div>
  );
};
