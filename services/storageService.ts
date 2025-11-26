
import { Student, ExamResult, User, UserRole, Institution, SharedFile, AttendanceRecord, AppNotification, Feedback, ExamSchedule, ExamSubmission, Question } from '../types';

const API_URL = 'http://localhost:5000/api';

// --- Helper: API Call with LocalStorage Fallback ---
const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

async function apiRequest<T>(endpoint: string, options: RequestInit = {}, fallback: () => Promise<T> | T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `API Error: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    if(err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
       console.warn(`[Backend Offline] Falling back to LocalStorage for ${endpoint}.`);
       return fallback();
    }
    throw err;
  }
}

// --- Institutions ---

export const getInstitutionById = async (id: string): Promise<Institution | null> => {
  return apiRequest<Institution | null>('/auth/institution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: id })
  }, () => {
    const insts = getLocal('institutions');
    return insts.find((i: Institution) => i.id === id) || null;
  });
};

export const registerInstitution = async (data: any): Promise<{ success: boolean, code: string, message: string }> => {
  return apiRequest('/institutions/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }, () => {
    const prefix = data.type === 'SCHOOL' ? 'SCH' : 'COL';
    const random = Math.floor(1000 + Math.random() * 9000);
    const code = `${prefix}-${random}`;
    const newInst = { ...data, id: code, type: data.type };
    const insts = getLocal('institutions');
    insts.push(newInst);
    setLocal('institutions', insts);
    return { success: true, code, message: "Registered locally" };
  });
};

// --- Students ---

export const getStudents = async (institutionId: string): Promise<Student[]> => {
  return apiRequest(`/students?institutionId=${institutionId}`, {}, () => {
    const all = getLocal('students');
    return all.filter((s: Student) => s.institutionId === institutionId);
  });
};

export const addStudent = async (student: Student) => {
  return apiRequest('/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student)
  }, () => {
    const all = getLocal('students');
    const newStudent = { ...student, id: `s_${Date.now()}` };
    all.push(newStudent);
    setLocal('students', all);
    return newStudent;
  });
};

export const updateStudentPassword = async (studentId: string, password: string) => {
  return apiRequest(`/students/${studentId}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  }, () => {
    const all = getLocal('students');
    const s = all.find((x: any) => x.id === studentId);
    if(s) {
        s.password = password;
        setLocal('students', all);
    }
    return { success: true };
  });
};

// --- Results ---

export const getResults = async (institutionId: string): Promise<ExamResult[]> => {
  return apiRequest(`/results?institutionId=${institutionId}`, {}, () => {
    const all = getLocal('results');
    return all.filter((r: ExamResult) => r.institutionId === institutionId);
  });
};

export const addResult = async (result: ExamResult) => {
  return apiRequest('/results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  }, () => {
    const all = getLocal('results');
    const newResult = { ...result, id: `r_${Date.now()}` };
    all.push(newResult);
    setLocal('results', all);
    return newResult;
  });
};

export const parseCSVAndAddResults = async (csvText: string, institutionId: string, adminId: string): Promise<{ success: number, fail: number }> => {
  const lines = csvText.split('\n');
  let success = 0;
  let fail = 0;
  const allStudents = await getStudents(institutionId);

  for (let i = 1; i < lines.length; i++) { 
    const line = lines[i].trim();
    if (!line) continue;
    
    const [enrollmentId, subject, marks, total, examName, term, date] = line.split(',');
    const student = allStudents.find(s => s.enrollmentId === enrollmentId?.trim());
    
    if (student && subject && marks) {
      const newResult: ExamResult = {
        id: '',
        institutionId,
        studentId: student.id,
        subject: subject.trim(),
        marksObtained: Number(marks),
        totalMarks: Number(total) || 100,
        examName: examName?.trim() || 'Imported Exam',
        term: term?.trim() || 'General',
        date: date?.trim() || new Date().toISOString().split('T')[0],
        uploadedBy: adminId
      };
      await addResult(newResult);
      success++;
    } else {
      fail++;
    }
  }
  return { success, fail };
};

// --- Files ---

export const getFiles = async (institutionId: string): Promise<SharedFile[]> => {
  return apiRequest(`/files?institutionId=${institutionId}`, {}, () => {
    const all = getLocal('files');
    return all.filter((f: SharedFile) => f.institutionId === institutionId);
  });
};

export const addFile = async (file: SharedFile): Promise<boolean> => {
  return apiRequest('/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(file)
  }, () => {
    try {
        const all = getLocal('files');
        const newFile = { ...file, id: `f_${Date.now()}` };
        all.push(newFile);
        setLocal('files', all);
        return true;
    } catch (e) {
        return false;
    }
  }).then(() => true).catch(() => false);
};

export const deleteFile = async (fileId: string) => {
  return apiRequest(`/files/${fileId}`, { method: 'DELETE' }, () => {
    const all = getLocal('files');
    const filtered = all.filter((f: SharedFile) => f.id !== fileId);
    setLocal('files', filtered);
  });
};

// --- Attendance ---

export const getAttendance = async (institutionId: string): Promise<AttendanceRecord[]> => {
  return apiRequest(`/attendance?institutionId=${institutionId}`, {}, () => {
    const all = getLocal('attendance');
    return all.filter((a: AttendanceRecord) => a.institutionId === institutionId);
  });
};

export const updateAttendance = async (record: AttendanceRecord) => {
  return apiRequest('/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  }, () => {
    const all = getLocal('attendance');
    const index = all.findIndex((a: AttendanceRecord) => a.studentId === record.studentId && a.term === record.term);
    if (index >= 0) {
        all[index] = { ...all[index], ...record, lastUpdated: new Date().toISOString() };
    } else {
        all.push({ ...record, id: `a_${Date.now()}` });
    }
    setLocal('attendance', all);
  });
};

// --- Notifications ---

export const getNotifications = async (institutionId: string): Promise<AppNotification[]> => {
  return apiRequest(`/notifications?institutionId=${institutionId}`, {}, () => {
     const all = getLocal('notifications');
     return all.filter((n: AppNotification) => n.institutionId === institutionId).reverse();
  });
};

export const addNotification = async (notif: AppNotification) => {
  return apiRequest('/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notif)
  }, () => {
    const all = getLocal('notifications');
    all.push({ ...notif, id: `n_${Date.now()}` });
    setLocal('notifications', all);
  });
};

// --- Feedback ---

export const getFeedback = async (institutionId: string): Promise<Feedback[]> => {
  return apiRequest(`/feedback?institutionId=${institutionId}`, {}, () => {
    const all = getLocal('feedback');
    return all.filter((f: Feedback) => f.institutionId === institutionId);
  });
};

export const addFeedback = async (feedback: Feedback) => {
  return apiRequest('/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feedback)
  }, () => {
    const all = getLocal('feedback');
    all.push({ ...feedback, id: `fb_${Date.now()}` });
    setLocal('feedback', all);
  });
};

// --- Exams ---

export const getExams = async (institutionId: string): Promise<ExamSchedule[]> => {
  return apiRequest(`/exams?institutionId=${institutionId}`, {}, () => {
    const all = getLocal('exams');
    return all.filter((e: ExamSchedule) => e.institutionId === institutionId);
  });
};

export const addExam = async (exam: ExamSchedule) => {
  return apiRequest('/exams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exam)
  }, () => {
    const all = getLocal('exams');
    all.push({ ...exam, id: `e_${Date.now()}` });
    setLocal('exams', all);
  });
};

export const updateExamStatus = async (examId: string, status: ExamSchedule['status']) => {
  return apiRequest(`/exams/${examId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  }, () => {
    const all = getLocal('exams');
    const exam = all.find((e: ExamSchedule) => e.id === examId);
    if (exam) exam.status = status;
    setLocal('exams', all);
  });
};

// --- Submissions ---

export const getSubmissions = async (examId: string): Promise<ExamSubmission[]> => {
  return apiRequest(`/submissions?examId=${examId}`, {}, () => {
    const all = getLocal('submissions');
    return all.filter((s: ExamSubmission) => s.examId === examId);
  });
};

export const getStudentSubmission = async (examId: string, studentId: string): Promise<ExamSubmission | undefined> => {
  const all = await getSubmissions(examId);
  return all.find(s => s.studentId === studentId);
};

export const startExam = async (examId: string, studentId: string, studentName: string): Promise<ExamSubmission> => {
  return apiRequest('/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        examId, studentId, studentName,
        answers: {}, score: 0, status: 'IN_PROGRESS',
        startTime: new Date().toISOString(),
        lastActive: new Date().toISOString()
    })
  }, async () => {
      const existing = await getStudentSubmission(examId, studentId);
      if (existing) return existing;
      const newSub = {
          id: `sub_${Date.now()}`,
          examId, studentId, studentName,
          answers: {}, score: 0, status: 'IN_PROGRESS',
          startTime: new Date().toISOString(),
          lastActive: new Date().toISOString()
      };
      const all = getLocal('submissions');
      all.push(newSub);
      setLocal('submissions', all);
      return newSub as ExamSubmission;
  });
};

export const updateSubmissionProgress = async (submissionId: string, answers: Record<string, number>) => {
  return apiRequest(`/submissions/${submissionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, lastActive: new Date().toISOString() })
  }, () => {
    const all = getLocal('submissions');
    const sub = all.find((s: any) => s.id === submissionId);
    if (sub) {
        sub.answers = answers;
        sub.lastActive = new Date().toISOString();
        setLocal('submissions', all);
    }
  });
};

export const submitExam = async (submissionId: string, answers: Record<string, number>, questions: Question[]) => {
  let score = 0;
  questions.forEach(q => {
    if (answers[q.id] === q.correctOptionIndex) {
      score += q.marks;
    }
  });

  return apiRequest(`/submissions/${submissionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        answers, 
        score, 
        status: 'SUBMITTED', 
        submitTime: new Date().toISOString(),
        lastActive: new Date().toISOString()
    })
  }, () => {
    const all = getLocal('submissions');
    const sub = all.find((s: any) => s.id === submissionId);
    if (sub) {
        sub.answers = answers;
        sub.score = score;
        sub.status = 'SUBMITTED';
        sub.submitTime = new Date().toISOString();
        setLocal('submissions', all);
    }
  });
};

// --- Auth ---

export const loginUser = async (role: UserRole, institutionId: string, userId: string, password?: string): Promise<User> => {
  return apiRequest('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, institutionId, userId, password })
  }, async () => {
      // Local Fallback
      const insts = getLocal('institutions');
      const inst = insts.find((i: any) => i.id === institutionId);
      
      if (!inst) throw new Error("Institution not found (Offline Mode)");
      
      if (role === UserRole.ADMIN) {
          if (inst.password === password) {
             return { id: `admin_${inst.id}`, name: inst.principalName, role, institutionId };
          } else {
             throw new Error("Invalid Credentials");
          }
      } else {
          const students = await getStudents(institutionId);
          const student = students.find(s => s.id === userId);
          if (student) {
              return {
                  id: student.id,
                  name: role === UserRole.PARENT ? `Parent of ${student.name}` : student.name,
                  role,
                  institutionId,
                  studentId: student.id
              };
          } else {
              throw new Error("Student not found");
          }
      }
  });
};

export const getCurrentUser = (): User | null => {
  const u = localStorage.getItem('currentUser');
  return u ? JSON.parse(u) : null;
};

export const logoutUser = () => {
  localStorage.removeItem('currentUser');
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
