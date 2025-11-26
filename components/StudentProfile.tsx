
import React, { useState, useEffect } from 'react';
import { Student, ExamResult, AttendanceRecord } from '../types';
import { getResults, getAttendance, updateStudentPassword } from '../services/storageService';
import { X, Calendar, GraduationCap, Lock, Save } from 'lucide-react';
import { Button } from './Button';

interface StudentProfileProps {
  student: Student;
  institutionId: string;
  onClose: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ student, institutionId, onClose }) => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allResults = await getResults(institutionId);
        const studentRes = allResults
            .filter(r => r.studentId === student.id)
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setResults(studentRes);

        const allAtt = await getAttendance(institutionId);
        const studentAtt = allAtt.find(a => a.studentId === student.id);
        setAttendance(studentAtt || null);
      } catch (e) {
        console.error("Failed to load profile data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [student.id, institutionId]);

  const handleUpdatePassword = async () => {
      if(!newPassword) return;
      setPassLoading(true);
      await updateStudentPassword(student.id, newPassword);
      setPassLoading(false);
      setNewPassword('');
      alert("✅ Password updated successfully.");
  };

  const avgScore = results.length 
    ? (results.reduce((acc, curr) => acc + (curr.marksObtained / curr.totalMarks) * 100, 0) / results.length).toFixed(1)
    : '0';

  const attPercent = attendance 
    ? Math.round((attendance.presentDays / attendance.totalDays) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white relative shrink-0">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                <X size={20} />
            </button>
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl border-2 border-white/30 backdrop-blur-md">
                    👤
                </div>
                <div>
                    <h2 className="text-2xl font-bold">{student.name}</h2>
                    <div className="flex items-center gap-2 text-blue-100 text-sm mt-1">
                        <span className="bg-blue-900/40 px-2 py-0.5 rounded border border-blue-400/30 font-mono">
                            {student.enrollmentId}
                        </span>
                        <span>•</span>
                        <span>{student.batch} - {student.section}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
            {loading ? (
                <div className="flex justify-center py-10 text-gray-400">Loading profile data...</div>
            ) : (
                <div className="space-y-6">
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Avg Score</p>
                            <p className={`text-2xl font-bold ${Number(avgScore) >= 75 ? 'text-green-600' : 'text-blue-600'}`}>{avgScore}%</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Attendance</p>
                            <p className={`text-2xl font-bold ${attPercent >= 75 ? 'text-green-600' : 'text-orange-500'}`}>{attPercent}%</p>
                        </div>
                         <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Exams Taken</p>
                            <p className="text-2xl font-bold text-gray-700">{results.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Contact</p>
                            <p className="text-sm font-bold text-gray-700 truncate" title={student.parentPhone}>{student.parentPhone || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Security Section (Admin Only) */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100">
                        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Lock size={16} className="text-red-500"/> Security Settings
                        </h3>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Set new password..."
                                className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                            />
                            <Button 
                                onClick={handleUpdatePassword} 
                                disabled={!newPassword || passLoading}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-2"
                            >
                                {passLoading ? '...' : 'Reset'}
                            </Button>
                        </div>
                    </div>

                    {/* Recent Activity / Results */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <GraduationCap size={20} className="text-blue-500"/> Academic History
                        </h3>
                        {results.length === 0 ? (
                            <div className="bg-white p-8 rounded-2xl text-center text-gray-400 border border-gray-100 border-dashed">
                                No exam results found for this student.
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="p-3 pl-4">Exam / Date</th>
                                            <th className="p-3">Subject</th>
                                            <th className="p-3 text-right pr-4">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {results.map(r => {
                                            const percent = Math.round((r.marksObtained / r.totalMarks) * 100);
                                            return (
                                                <tr key={r.id} className="hover:bg-blue-50/50 transition-colors">
                                                    <td className="p-3 pl-4">
                                                        <div className="font-bold text-gray-700">{r.examName}</div>
                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                            <Calendar size={10} /> {r.date}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-gray-600">{r.subject}</td>
                                                    <td className="p-3 text-right pr-4">
                                                        <span className={`font-bold ${percent >= 40 ? 'text-gray-800' : 'text-red-500'}`}>
                                                            {r.marksObtained}/{r.totalMarks}
                                                        </span>
                                                        <div className="text-[10px] text-gray-400">
                                                            {percent}%
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
