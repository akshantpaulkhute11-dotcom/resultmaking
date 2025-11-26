
const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Institute Code (e.g. SCH-1001)
  name: { type: String, required: true },
  type: { type: String, enum: ['SCHOOL', 'COLLEGE'], required: true },
  address: { type: String, required: true },
  contact: { type: String, required: true },
  principalName: { type: String, required: true },
  password: { type: String, required: true }, // Admin Password
  createdAt: { type: Date, default: Date.now }
});

const studentSchema = new mongoose.Schema({
  institutionId: { type: String, required: true },
  name: { type: String, required: true },
  enrollmentId: { type: String, required: true },
  batch: { type: String, required: true },
  section: { type: String, required: true },
  parentPhone: String,
  password: { type: String, default: 'student123' } // Default password
});

const resultSchema = new mongoose.Schema({
  institutionId: String,
  studentId: String,
  subject: String,
  marksObtained: Number,
  totalMarks: Number,
  examName: String,
  term: String,
  date: Date,
  uploadedBy: String
});

const examScheduleSchema = new mongoose.Schema({
  institutionId: String,
  title: String,
  type: String,
  batch: String,
  subject: String,
  date: String,
  startTime: String,
  durationMinutes: Number,
  questions: Array,
  status: { type: String, default: 'SCHEDULED' },
  createdBy: String
});

const submissionSchema = new mongoose.Schema({
  examId: String,
  studentId: String,
  studentName: String,
  answers: Object,
  score: Number,
  status: String,
  startTime: Date,
  submitTime: Date,
  lastActive: Date
});

const notificationSchema = new mongoose.Schema({
  institutionId: String,
  title: String,
  message: String,
  date: String,
  targetBatch: String,
  senderName: String
});

const fileSchema = new mongoose.Schema({
  institutionId: String,
  name: String,
  type: String,
  size: Number,
  data: String,
  uploadedBy: String,
  uploadedAt: String,
  category: String,
  targetBatch: String
});

const attendanceSchema = new mongoose.Schema({
  institutionId: String,
  studentId: String,
  term: String,
  totalDays: Number,
  presentDays: Number,
  lastUpdated: String
});

const feedbackSchema = new mongoose.Schema({
  institutionId: String,
  studentId: String,
  studentName: String,
  message: String,
  date: String
});

module.exports = {
  Institution: mongoose.model('Institution', institutionSchema),
  Student: mongoose.model('Student', studentSchema),
  Result: mongoose.model('Result', resultSchema),
  Exam: mongoose.model('Exam', examScheduleSchema),
  Submission: mongoose.model('Submission', submissionSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  File: mongoose.model('File', fileSchema),
  Attendance: mongoose.model('Attendance', attendanceSchema),
  Feedback: mongoose.model('Feedback', feedbackSchema)
};
