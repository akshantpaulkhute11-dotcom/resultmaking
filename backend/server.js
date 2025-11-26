
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Institution, Student, Result, Exam, Submission, Notification, File, Attendance, Feedback } = require('./models');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/edumatrix', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// --- Routes ---

// 1. Auth & Institutions

// Register New Institution
app.post('/api/institutions/register', async (req, res) => {
  try {
    const { name, type, address, contact, principalName, password } = req.body;
    
    // Generate Unique Institute Code
    const prefix = type === 'SCHOOL' ? 'SCH' : 'COL';
    let code;
    let isUnique = false;
    
    // Simple retry logic to ensure uniqueness
    while(!isUnique) {
      const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
      code = `${prefix}-${random}`;
      const existing = await Institution.findOne({ id: code });
      if (!existing) isUnique = true;
    }

    const newInst = new Institution({
      id: code,
      name,
      type,
      address,
      contact,
      principalName,
      password
    });
    
    await newInst.save();
    res.json({ success: true, code, message: "Institution registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Check Institution Code
app.post('/api/auth/institution', async (req, res) => {
  const { code } = req.body;
  if(!code) return res.status(400).json({message: "Code required"});
  
  const inst = await Institution.findOne({ id: code.toUpperCase() });
  if (inst) {
    // Return safe data (no password)
    return res.json({
      id: inst.id,
      name: inst.name,
      type: inst.type,
      address: inst.address,
      contact: inst.contact,
      principalName: inst.principalName
    });
  }
  res.status(404).json({ message: "Institution not found" });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { role, institutionId, userId, password } = req.body;
  
  if (role === 'ADMIN') {
    const inst = await Institution.findOne({ id: institutionId });
    if (inst && inst.password === password) {
      return res.json({
        id: `admin_${inst.id}`,
        name: inst.principalName || (inst.type === 'SCHOOL' ? 'Principal' : 'Dean'),
        role,
        institutionId
      });
    }
  } else {
    // Student or Parent
    const student = await Student.findOne({ _id: userId, institutionId });
    if (student) {
      if (student.password === password) {
        return res.json({
          id: student._id,
          name: role === 'PARENT' ? `Parent of ${student.name}` : student.name,
          role,
          institutionId,
          studentId: student._id
        });
      } else {
        return res.status(401).json({ message: "Invalid Password" });
      }
    } else {
        return res.status(404).json({ message: "Student record not found" });
    }
  }
  res.status(401).json({ message: "Invalid credentials" });
});

// 2. Students
app.get('/api/students', async (req, res) => {
  const { institutionId } = req.query;
  const students = await Student.find({ institutionId });
  res.json(students.map(s => ({...s._doc, id: s._id})));
});

app.post('/api/students', async (req, res) => {
  const newStudent = new Student(req.body);
  await newStudent.save();
  res.json(newStudent);
});

// Update Student Password
app.put('/api/students/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "Password required" });
    
    await Student.findByIdAndUpdate(req.params.id, { password });
    res.json({ success: true, message: "Password updated" });
  } catch (e) {
    res.status(500).json({ message: "Update failed" });
  }
});

// 3. Results
app.get('/api/results', async (req, res) => {
  const { institutionId } = req.query;
  const results = await Result.find({ institutionId });
  res.json(results.map(r => ({...r._doc, id: r._id})));
});

app.post('/api/results', async (req, res) => {
  const newResult = new Result(req.body);
  await newResult.save();
  res.json(newResult);
});

// 4. Exams
app.get('/api/exams', async (req, res) => {
  const { institutionId } = req.query;
  const exams = await Exam.find({ institutionId });
  res.json(exams.map(e => ({...e._doc, id: e._id})));
});

app.post('/api/exams', async (req, res) => {
  const newExam = new Exam(req.body);
  await newExam.save();
  res.json(newExam);
});

app.put('/api/exams/:id/status', async (req, res) => {
  await Exam.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.json({ success: true });
});

// 5. Submissions
app.get('/api/submissions', async (req, res) => {
  const { examId } = req.query;
  const subs = await Submission.find({ examId });
  res.json(subs.map(s => ({...s._doc, id: s._id})));
});

app.post('/api/submissions', async (req, res) => {
  const sub = new Submission(req.body);
  await sub.save();
  res.json({ ...sub._doc, id: sub._id });
});

app.put('/api/submissions/:id', async (req, res) => {
  await Submission.findByIdAndUpdate(req.params.id, req.body);
  res.json({ success: true });
});

// 6. Files
app.get('/api/files', async (req, res) => {
  const { institutionId } = req.query;
  const files = await File.find({ institutionId });
  res.json(files.map(f => ({...f._doc, id: f._id})));
});

app.post('/api/files', async (req, res) => {
  const file = new File(req.body);
  await file.save();
  res.json(file);
});

app.delete('/api/files/:id', async (req, res) => {
  await File.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// 7. Attendance
app.get('/api/attendance', async (req, res) => {
  const { institutionId } = req.query;
  const att = await Attendance.find({ institutionId });
  res.json(att.map(a => ({...a._doc, id: a._id})));
});

app.post('/api/attendance', async (req, res) => {
  const { studentId, term } = req.body;
  const existing = await Attendance.findOne({ studentId, term });
  if (existing) {
    existing.totalDays = req.body.totalDays;
    existing.presentDays = req.body.presentDays;
    existing.lastUpdated = new Date().toISOString();
    await existing.save();
  } else {
    await new Attendance(req.body).save();
  }
  res.json({ success: true });
});

// 8. Notifications
app.get('/api/notifications', async (req, res) => {
  const { institutionId } = req.query;
  const notifs = await Notification.find({ institutionId }).sort({ _id: -1 });
  res.json(notifs.map(n => ({...n._doc, id: n._id})));
});

app.post('/api/notifications', async (req, res) => {
  await new Notification(req.body).save();
  res.json({ success: true });
});

// 9. Feedback
app.get('/api/feedback', async (req, res) => {
  const { institutionId } = req.query;
  const fb = await Feedback.find({ institutionId });
  res.json(fb.map(f => ({...f._doc, id: f._id})));
});

app.post('/api/feedback', async (req, res) => {
  await new Feedback(req.body).save();
  res.json({ success: true });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
