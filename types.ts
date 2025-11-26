
export type InstitutionType = 'SCHOOL' | 'COLLEGE';

export enum UserRole {
  ADMIN = 'ADMIN', // Principal or Dean
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export interface Institution {
  id: string; // The Institute Code (e.g. SCH-1234)
  name: string;
  type: InstitutionType;
  address?: string;
  contact?: string;
  principalName?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  institutionId: string;
  studentId?: string; // Only if role is STUDENT or PARENT
}

export interface Student {
  id: string;
  institutionId: string;
  name: string;
  enrollmentId: string; // Roll No or Reg No
  batch: string; // e.g., "Class 10" or "Year 2"
  section: string; // e.g., "Section A" or "Semester 4"
  parentPhone?: string;
}

export interface ExamResult {
  id: string;
  institutionId: string;
  studentId: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  examName: string; // "Unit Test 1" or "Mid Semester"
  term: string; // "Term 1" or "Semester 3"
  date: string;
  uploadedBy: string;
}

export interface AttendanceRecord {
  id: string;
  institutionId: string;
  studentId: string;
  term: string; // e.g. "Term 1"
  totalDays: number;
  presentDays: number;
  lastUpdated: string;
}

export interface AppNotification {
  id: string;
  institutionId: string;
  title: string;
  message: string;
  date: string;
  targetBatch?: string; // If null, for everyone
  senderName: string;
}

export interface Feedback {
  id: string;
  institutionId: string;
  studentId: string;
  studentName: string;
  message: string;
  date: string;
}

export interface SharedFile {
  id: string;
  institutionId: string;
  name: string;
  type: string; // MIME type
  size: number; // bytes
  data: string; // Base64 string (simulated storage)
  uploadedBy: string;
  uploadedAt: string;
  category: 'RESULT' | 'SCHEDULE' | 'CIRCULAR' | 'OTHER';
  targetBatch?: string; // Optional: If null, visible to all
}

// --- Exam & Quiz Module Types ---

export type ExamType = 'OFFLINE' | 'ONLINE_QUIZ';

export interface Question {
  id: string;
  text: string;
  options: string[]; // For MCQs
  correctOptionIndex: number; 
  marks: number;
}

export interface ExamSchedule {
  id: string;
  institutionId: string;
  title: string;
  type: ExamType;
  batch: string;
  subject: string;
  date: string;
  startTime: string; // HH:mm
  durationMinutes: number;
  instructions?: string;
  questions?: Question[]; // Only for ONLINE_QUIZ
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  createdBy: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  score: number;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  startTime: string; // ISO String
  submitTime?: string; // ISO String
  lastActive?: string; // ISO String for monitoring
}
