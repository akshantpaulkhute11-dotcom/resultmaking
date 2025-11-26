
import React, { useState, useEffect, useRef } from 'react';
import { Student, ExamResult, User, Institution, SharedFile, AttendanceRecord, AppNotification, Feedback, ExamSchedule, Question } from '../types';
import { getStudents, addStudent, addResult, getInstitutionById, getFiles, addFile, deleteFile, fileToBase64, updateAttendance, addNotification, getFeedback, parseCSVAndAddResults, getExams, addExam, getSubmissions, updateExamStatus } from '../services/storageService';
import { Button } from './Button';
import { Plus, Copy, Check } from 'lucide-react';
import { StudentProfile } from './StudentProfile';

interface Props {
  user: User;
}

export const TeacherDashboard: React.FC<Props> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'results' | 'attendance' | 'files' | 'communication' | 'exams'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [institution, setInstitution] = useState<Institution | undefined>(undefined);
  const [filterBatch, setFilterBatch] = useState<string>('');
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [copied, setCopied] = useState(false);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  
  const isSchool = institution?.type === 'SCHOOL';
  const labels = {
    batch: isSchool ? 'Class' : 'Year',
    section: isSchool ? 'Section' : 'Semester',
    exam: isSchool ? 'Exam Type' : 'Exam Name',
    term: isSchool ? 'Term' : 'Semester Term',
  };

  useEffect(() => {
    refreshData();
  }, [user.institutionId]);

  const [selectedMonitorExam, setSelectedMonitorExam] = useState<string | null>(null);
  useEffect(() => {
    let interval: any;
    if (activeTab === 'exams' && selectedMonitorExam) {
        interval = setInterval(async () => {
            const list = await getExams(user.institutionId);
            setExams(list.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        }, 3000); 
    }
    return () => clearInterval(interval);
  }, [activeTab, selectedMonitorExam, user.institutionId]);


  const refreshData = async () => {
    setStudents(await getStudents(user.institutionId));
    setInstitution(await getInstitutionById(user.institutionId) || undefined);
    setFiles(await getFiles(user.institutionId));
    setFeedbacks(await getFeedback(user.institutionId));
    const examList = await getExams(user.institutionId);
    setExams(examList.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  };
  
  const [newStudent, setNewStudent] = useState<Partial<Student>>({ name: '', enrollmentId: '', batch: '', section: '', parentPhone: '' });
  const [newResult, setNewResult] = useState<Partial<ExamResult>>({ studentId: '', subject: '', marksObtained: 0, totalMarks: 100, examName: '', term: '', date: new Date().toISOString().split('T')[0] });
  const [newAttendance, setNewAttendance] = useState<{studentId: string, total: number, present: number, term: string}>({ studentId: '', total: 100, present: 0, term: '' });
  const [newNotification, setNewNotification] = useState({ title: '', message: '', targetBatch: '' });
  const [csvText, setCsvText] = useState('');

  const [newExam, setNewExam] = useState<Partial<ExamSchedule>>({ title: '', type: 'OFFLINE', batch: '', subject: '', date: '', startTime: '', durationMinutes: 60, status: 'SCHEDULED' });
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currQuestion, setCurrQuestion] = useState<Partial<Question>>({ text: '', options: ['', '', '', ''], correctOptionIndex: 0, marks: 1 });

  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileCategory, setFileCategory] = useState<SharedFile['category']>('CIRCULAR');
  const [fileTargetBatch, setFileTargetBatch] = useState<string>('');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({msg, type});
    setTimeout(() => setNotification(null), 3000);
  };

  const copyCode = () => {
    if(institution?.id) {
        navigator.clipboard.writeText(institution.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.enrollmentId) return;
    await addStudent({
      id: '',
      institutionId: user.institutionId,
      name: newStudent.name!,
      enrollmentId: newStudent.enrollmentId!,
      batch: newStudent.batch || (isSchool ? 'Class 1' : 'Year 1'),
      section: newStudent.section || (isSchool ? 'A' : 'Sem 1'),
      parentPhone: newStudent.parentPhone || ''
    });
    refreshData();
    setNewStudent({ name: '', enrollmentId: '', batch: '', section: '', parentPhone: '' });
    showNotification("Student registered successfully!");
  };

  const handleAddResult = async (e: React.FormEvent) => {
    e.preventDefault();
    await addResult({
      id: '',
      institutionId: user.institutionId,
      studentId: newResult.studentId!,
      subject: newResult.subject!,
      marksObtained: Number(newResult.marksObtained),
      totalMarks: Number(newResult.totalMarks),
      examName: newResult.examName || 'Test',
      term: newResult.term || 'Term 1',
      date: newResult.date || new Date().toISOString().split('T')[0],
      uploadedBy: user.id
    });
    setNewResult({ ...newResult, marksObtained: 0 }); 
    showNotification("Result uploaded!");
  };

  const handleBulkResultUpload = async () => {
    if (!csvText) return;
    const { success, fail } = await parseCSVAndAddResults(csvText, user.institutionId, user.id);
    showNotification(`Bulk Upload: ${success} added, ${fail} failed.`);
    setCsvText('');
  };

  const handleUpdateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendance.studentId) return;
    await updateAttendance({
      id: '',
      institutionId: user.institutionId,
      studentId: newAttendance.studentId,
      term: newAttendance.term || 'Term 1',
      totalDays: Number(newAttendance.total),
      presentDays: Number(newAttendance.present),
      lastUpdated: new Date().toISOString().split('T')[0]
    });
    showNotification("Attendance updated!");
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    await addNotification({
      id: '',
      institutionId: user.institutionId,
      title: newNotification.title,
      message: newNotification.message,
      date: new Date().toISOString().split('T')[0],
      targetBatch: newNotification.targetBatch || undefined,
      senderName: user.name
    });
    setNewNotification({ title: '', message: '', targetBatch: '' });
    showNotification("Notification sent!");
  };

  const handleAddQuestion = () => {
    if(!currQuestion.text) return;
    setExamQuestions([...examQuestions, { ...currQuestion, id: Date.now().toString() } as Question]);
    setCurrQuestion({ text: '', options: ['', '', '', ''], correctOptionIndex: 0, marks: 1 });
  };

  const handleScheduleExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.title || !newExam.date) return;
    
    await addExam({
      id: '',
      institutionId: user.institutionId,
      title: newExam.title!,
      type: newExam.type!,
      batch: newExam.batch!,
      subject: newExam.subject!,
      date: newExam.date!,
      startTime: newExam.startTime || '09:00',
      durationMinutes: Number(newExam.durationMinutes),
      questions: newExam.type === 'ONLINE_QUIZ' ? examQuestions : undefined,
      status: 'SCHEDULED',
      createdBy: user.id
    });

    await addNotification({
      id: '',
      institutionId: user.institutionId,
      title: `📅 New Exam Scheduled: ${newExam.title}`,
      message: `👉 ${newExam.subject} exam for ${newExam.batch} is scheduled on ${newExam.date} at ${newExam.startTime}.`,
      date: new Date().toISOString().split('T')[0],
      targetBatch: newExam.batch,
      senderName: 'Exam Dept'
    });

    refreshData();
    setNewExam({ title: '', type: 'OFFLINE', batch: '', subject: '', date: '', startTime: '', durationMinutes: 60, status: 'SCHEDULED' });
    setExamQuestions([]);
    showNotification("Exam Scheduled & Notified!");
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { 
      showNotification("❌ File too large (Max 5MB)", 'error'); 
      return; 
    }
    
    setUploadProgress(10);
    try {
      await new Promise(r => setTimeout(r, 400));
      setUploadProgress(40);
      
      const base64Data = await fileToBase64(file);
      setUploadProgress(70);
      
      const success = await addFile({
        id: '',
        institutionId: user.institutionId,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: base64Data,
        uploadedBy: user.name,
        uploadedAt: new Date().toISOString().split('T')[0],
        category: fileCategory,
        targetBatch: fileTargetBatch || undefined
      });
      
      setUploadProgress(100);
      if (success) { 
        refreshData(); 
        showNotification("✅ File uploaded successfully!"); 
      } else { 
        showNotification("❌ Storage quota exceeded!", 'error'); 
      }
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (err) { 
      console.error(err); 
      setUploadProgress(0); 
      showNotification("❌ Upload failed.", 'error');
    }
  };

  const getFileIcon = (type: string, name: string) => {
    const lowerName = name.toLowerCase();
    if (type.includes('image') || lowerName.match(/\.(jpg|jpeg|png|gif)$/)) return '🖼️';
    if (type.includes('pdf') || lowerName.endsWith('.pdf')) return '📕';
    if (type.includes('sheet') || type.includes('excel') || lowerName.match(/\.(xls|xlsx|csv)$/)) return '📊';
    return '📄';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uniqueBatches = Array.from(new Set(students.map(s => s.batch))).sort();
  const filteredStudents = filterBatch ? students.filter(s => s.batch === filterBatch) : students;

  if (!institution) return <div>Loading...</div>;

  return (
    <div className="space-y-6 pb-24">
      {viewStudent && (
        <StudentProfile 
            student={viewStudent} 
            institutionId={user.institutionId} 
            onClose={() => setViewStudent(null)} 
        />
      )}

      {/* Dashboard Header Card */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            {isSchool ? '🏫' : '🎓'}
            {institution.type === 'SCHOOL' ? 'Principal Dashboard' : 'Dean Dashboard'}
            </h1>
            <p className="text-gray-500 text-sm">{institution.name}</p>
        </div>
        
        {/* Institute Code Widget */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-4">
            <div>
                <p className="text-[10px] text-blue-500 font-bold uppercase">Institute Code</p>
                <p className="font-mono text-xl font-bold text-blue-900 tracking-wider">{institution.id}</p>
            </div>
            <button 
                onClick={copyCode} 
                className="p-2 bg-white rounded-lg text-blue-600 hover:text-blue-800 shadow-sm border border-blue-100 transition-all active:scale-95"
                title="Copy Code"
            >
                {copied ? <Check size={18}/> : <Copy size={18}/>}
            </button>
        </div>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
        {[
          { id: 'students', icon: '👥', label: 'Students' },
          { id: 'results', icon: '📚', label: 'Results' },
          { id: 'attendance', icon: '📅', label: 'Attendance' },
          { id: 'exams', icon: '⏰', label: 'Exams' },
          { id: 'communication', icon: '📢', label: 'Notify' },
          { id: 'files', icon: '📂', label: 'Docs' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="text-lg">{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {notification && (
        <div className={`border px-4 py-3 rounded-xl flex items-center gap-2 animate-bounce shadow-sm ${notification.type === 'success' ? 'bg-green-100 border-green-200 text-green-700' : 'bg-red-100 border-red-200 text-red-700'}`}>
          {notification.msg}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">➕ Register Student</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <input type="text" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="👤 Full Name" required />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={newStudent.enrollmentId} onChange={e => setNewStudent({...newStudent, enrollmentId: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder={isSchool ? "🆔 Roll No" : "🆔 Reg No"} required />
                <input type="tel" value={newStudent.parentPhone} onChange={e => setNewStudent({...newStudent, parentPhone: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="📞 Parent Phone" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={newStudent.batch} onChange={e => setNewStudent({...newStudent, batch: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder={`🏫 ${labels.batch}`} required />
                <input type="text" value={newStudent.section} onChange={e => setNewStudent({...newStudent, section: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder={`🏫 ${labels.section}`} required />
              </div>
              <Button type="submit" fullWidth>💾 Save Student</Button>
            </form>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">🎓 Enrolled Students ({filteredStudents.length})</h3>
                <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-sm">
                   <option value="">🏫 All Batches</option>
                   {uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
             </div>
             <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
               {filteredStudents.map(s => (
                 <div 
                    key={s.id} 
                    onClick={() => setViewStudent(s)}
                    className="p-3 bg-gray-50 rounded-xl flex justify-between cursor-pointer hover:bg-blue-50 hover:border-blue-100 border border-transparent transition-all"
                 >
                    <div><div className="font-bold">👤 {s.name}</div><div className="text-xs text-gray-500">{s.batch} • {s.section}</div></div>
                    <div className="text-sm font-mono text-gray-400">🆔 {s.enrollmentId}</div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="animate-fade-in space-y-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">✏️ Single Entry</h2>
            <form onSubmit={handleAddResult} className="space-y-4">
               <select value={newResult.studentId} onChange={e => setNewResult({...newResult, studentId: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" required>
                 <option value="">👤 Select Student</option>
                 {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.enrollmentId})</option>)}
               </select>
               <div className="grid grid-cols-2 gap-4">
                 <input type="text" value={newResult.examName} onChange={e => setNewResult({...newResult, examName: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder={`📝 ${labels.exam}`} required />
                 <input type="text" value={newResult.subject} onChange={e => setNewResult({...newResult, subject: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="📖 Subject" required />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <input type="number" value={newResult.marksObtained} onChange={e => setNewResult({...newResult, marksObtained: Number(e.target.value)})} className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold" placeholder="🥇 Marks" required />
                 <input type="number" value={newResult.totalMarks} onChange={e => setNewResult({...newResult, totalMarks: Number(e.target.value)})} className="w-full p-3 bg-white border border-gray-200 rounded-xl" placeholder="💯 Total" required />
               </div>
               <Button type="submit" fullWidth>📤 Upload Result</Button>
            </form>
           </div>
           
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">📊 Bulk Upload (CSV)</h2>
             <p className="text-xs text-gray-500 mb-2">Format: EnrollmentID, Subject, Marks, Total, ExamName, Term, Date</p>
             <textarea 
               value={csvText}
               onChange={e => setCsvText(e.target.value)}
               className="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono mb-2"
               placeholder={`1001,Math,85,100,Unit Test 1,Term 1,2023-10-10\n1002,Science,78,100,Unit Test 1,Term 1,2023-10-10`}
             />
             <Button onClick={handleBulkResultUpload} variant="secondary" fullWidth>🔄 Process CSV</Button>
           </div>
        </div>
      )}

      {activeTab === 'exams' && (
        <div className="animate-fade-in space-y-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">📅 Schedule Exam / Quiz</h2>
              <form onSubmit={handleScheduleExam} className="space-y-4">
                 <input type="text" value={newExam.title} onChange={e => setNewExam({...newExam, title: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="📝 Exam Title (e.g. Mid Term Physics)" required />
                 <div className="grid grid-cols-2 gap-4">
                    <select value={newExam.type} onChange={e => setNewExam({...newExam, type: e.target.value as any})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl">
                       <option value="OFFLINE">📄 Offline Exam</option>
                       <option value="ONLINE_QUIZ">💻 Online Quiz</option>
                    </select>
                    <select value={newExam.batch} onChange={e => setNewExam({...newExam, batch: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" required>
                       <option value="">Select {labels.batch}</option>
                       {uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={newExam.date} onChange={e => setNewExam({...newExam, date: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" required />
                    <input type="time" value={newExam.startTime} onChange={e => setNewExam({...newExam, startTime: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" required />
                 </div>
                 <input type="text" value={newExam.subject} onChange={e => setNewExam({...newExam, subject: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="📖 Subject" required />
                 
                 {newExam.type === 'ONLINE_QUIZ' && (
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                       <h3 className="font-bold text-blue-900 mb-2">❓ Quiz Questions ({examQuestions.length})</h3>
                       <div className="space-y-3 mb-3">
                          <input type="text" value={currQuestion.text} onChange={e => setCurrQuestion({...currQuestion, text: e.target.value})} className="w-full p-2 bg-white rounded border border-blue-200 text-sm" placeholder="Question Text" />
                          <div className="grid grid-cols-2 gap-2">
                             {currQuestion.options?.map((opt, i) => (
                                <input key={i} type="text" value={opt} onChange={e => {
                                   const newOpts = [...(currQuestion.options || [])];
                                   newOpts[i] = e.target.value;
                                   setCurrQuestion({...currQuestion, options: newOpts});
                                }} className={`w-full p-2 bg-white rounded border text-sm ${currQuestion.correctOptionIndex === i ? 'border-green-500 ring-1 ring-green-500' : 'border-blue-200'}`} placeholder={`Option ${i+1}`} />
                             ))}
                          </div>
                          <div className="flex justify-between items-center">
                             <select value={currQuestion.correctOptionIndex} onChange={e => setCurrQuestion({...currQuestion, correctOptionIndex: Number(e.target.value)})} className="p-2 bg-white rounded border border-blue-200 text-sm">
                                <option value={0}>✅ Option 1</option>
                                <option value={1}>✅ Option 2</option>
                                <option value={2}>✅ Option 3</option>
                                <option value={3}>✅ Option 4</option>
                             </select>
                             <button type="button" onClick={handleAddQuestion} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={14}/> Add Q</button>
                          </div>
                       </div>
                    </div>
                 )}
                 <Button type="submit" fullWidth>📤 Publish Schedule</Button>
              </form>
           </div>

           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4">👀 Exam Monitor</h2>
              {exams.length === 0 ? <p className="text-gray-400">No exams scheduled.</p> : (
                 <div className="space-y-4">
                    {exams.map(exam => (
                       <div key={exam.id} className="border border-gray-100 p-4 rounded-xl hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                             <div>
                                <h3 className="font-bold text-gray-800">{exam.title}</h3>
                                <p className="text-xs text-gray-500">{exam.date} @ {exam.startTime} • {exam.batch} • {exam.type === 'ONLINE_QUIZ' ? '💻 Quiz' : '📄 Offline'}</p>
                             </div>
                             <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${exam.status === 'LIVE' ? 'bg-green-100 text-green-700 animate-pulse' : (exam.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700')}`}>
                                {exam.status === 'LIVE' ? '🟢 LIVE' : (exam.status === 'COMPLETED' ? '🛑 ENDED' : '🟡 SCHEDULED')}
                             </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                             {exam.status === 'SCHEDULED' && <button onClick={async () => { await updateExamStatus(exam.id, 'LIVE'); refreshData(); }} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold">▶️ Start Exam</button>}
                             {exam.status === 'LIVE' && <button onClick={async () => { await updateExamStatus(exam.id, 'COMPLETED'); refreshData(); }} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-xs font-bold">⏹️ End Exam</button>}
                             <button onClick={() => setSelectedMonitorExam(selectedMonitorExam === exam.id ? null : exam.id)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-bold">👀 Monitor</button>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="animate-fade-in bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">📅 Update Attendance</h2>
          <form onSubmit={handleUpdateAttendance} className="space-y-4">
             <select value={newAttendance.studentId} onChange={e => setNewAttendance({...newAttendance, studentId: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" required>
                 <option value="">👤 Select Student</option>
                 {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.batch})</option>)}
             </select>
             <input type="text" value={newAttendance.term} onChange={e => setNewAttendance({...newAttendance, term: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="🗓️ Term / Month" required />
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase">✅ Present Days</label>
                   <input type="number" value={newAttendance.present} onChange={e => setNewAttendance({...newAttendance, present: Number(e.target.value)})} className="w-full p-3 bg-white border border-gray-200 rounded-xl" />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase">🔢 Total Days</label>
                   <input type="number" value={newAttendance.total} onChange={e => setNewAttendance({...newAttendance, total: Number(e.target.value)})} className="w-full p-3 bg-white border border-gray-200 rounded-xl" />
                </div>
             </div>
             <Button type="submit" fullWidth>💾 Update Record</Button>
          </form>
        </div>
      )}

      {activeTab === 'communication' && (
         <div className="animate-fade-in space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">📢 Broadcast Notification</h2>
               <form onSubmit={handleSendNotification} className="space-y-4">
                 <input type="text" value={newNotification.title} onChange={e => setNewNotification({...newNotification, title: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="🏷️ Title" required />
                 <textarea value={newNotification.message} onChange={e => setNewNotification({...newNotification, message: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl h-24" placeholder="💬 Message content..." required />
                 <select value={newNotification.targetBatch} onChange={e => setNewNotification({...newNotification, targetBatch: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl">
                   <option value="">👥 All Batches</option>
                   {uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}
                 </select>
                 <Button type="submit" fullWidth>🚀 Send Alert</Button>
               </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
               <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">📬 Student Feedback</h3>
               <div className="space-y-3 max-h-60 overflow-y-auto">
                 {feedbacks.length === 0 ? <p className="text-gray-400 text-sm">No feedback received.</p> : 
                   feedbacks.map(f => (
                     <div key={f.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm font-bold text-gray-800">👤 {f.studentName}</p>
                        <p className="text-xs text-gray-600 mt-1">💬 {f.message}</p>
                        <p className="text-[10px] text-gray-400 mt-2 text-right">🕒 {f.date}</p>
                     </div>
                   ))
                 }
               </div>
            </div>
         </div>
      )}

      {activeTab === 'files' && (
        <div className="animate-fade-in space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <div className="grid grid-cols-2 gap-4 mb-4">
               <select value={fileCategory} onChange={(e) => setFileCategory(e.target.value as any)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                 <option value="CIRCULAR">🔔 Circular</option>
                 <option value="RESULT">📊 Result Sheet</option>
                 <option value="SCHEDULE">📅 Time Table</option>
               </select>
               <select value={fileTargetBatch} onChange={(e) => setFileTargetBatch(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                 <option value="">👥 All Batches</option>
                 {uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}
               </select>
             </div>
             <div 
               className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${dragActive ? 'border-primary bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
               onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
               onDragLeave={() => setDragActive(false)}
               onDrop={(e) => { e.preventDefault(); setDragActive(false); if(e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}
               onClick={() => fileInputRef.current?.click()}
             >
               <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,image/*" />
               <div className="text-4xl mb-2">📂</div>
               <p className="text-xs text-gray-500 font-medium">Drag & Drop or Click to Upload</p>
               <p className="text-[10px] text-gray-400 mt-1">Supports PDF, Excel, CSV, Images (Max 5MB)</p>
             </div>
             {uploadProgress > 0 && (
                <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                        <span>🚀 Uploading...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{width: `${uploadProgress}%`}}></div>
                    </div>
                </div>
             )}
          </div>

          <div className="space-y-3">
             <h3 className="font-bold text-gray-700 px-1 text-sm">📂 Uploaded Documents</h3>
             {files.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">No files uploaded yet.</p> : 
               files.map(file => (
                 <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 overflow-hidden">
                       <div className="text-2xl">
                           {getFileIcon(file.type, file.name)}
                       </div>
                       <div className="truncate">
                          <p className="text-sm font-bold text-gray-800 truncate">{file.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-medium">
                              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{file.category}</span>
                              <span>•</span>
                              <span>{file.targetBatch || '👥 All'}</span>
                              <span>•</span>
                              <span>{formatFileSize(file.size)}</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={async () => { await deleteFile(file.id); refreshData(); }} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete File">
                        🗑️
                    </button>
                 </div>
               ))
             }
          </div>
        </div>
      )}
    </div>
  );
};
