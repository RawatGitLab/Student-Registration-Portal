import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';
import { SEED_STUDENTS, generateSeedMarks, generateSeedAttendance } from './src/seedData';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://varunrawatmailbox2507_db_user:GYVPiF8LG4HIbsSF@cluster0.8xfepsq.mongodb.net/?appName=Cluster0";
const DB_NAME = "School-Track-Pro";

let mongoClient: MongoClient | null = null;
let dbInstance: Db | null = null;

async function getDb(): Promise<Db> {
  if (!dbInstance) {
    if (!mongoClient) {
      console.log('Connecting to MongoDB Atlas...');
      mongoClient = new MongoClient(MONGODB_URI);
      await mongoClient.connect();
      console.log('Connected to MongoDB Atlas database:', DB_NAME);
    }
    dbInstance = mongoClient.db(DB_NAME);
  }
  return dbInstance;
}

// REST API for MongoDB Data Access

// 1. Fetch all data and seed if empty
app.get('/api/data', async (req, res) => {
  try {
    const db = await getDb();
    
    // Check if the students collection is empty; if so, seed the DB with initial data
    const studentsCount = await db.collection('students').countDocuments();
    if (studentsCount === 0) {
      console.log('MongoDB is empty. Seeding defaults into Atlas database...');
      
      const seedStudents = SEED_STUDENTS;
      const seedMarks = generateSeedMarks();
      const seedAttendance = generateSeedAttendance();

      await db.collection('students').insertMany(seedStudents);
      if (seedMarks.length > 0) {
        await db.collection('marks').insertMany(seedMarks);
      }
      if (seedAttendance.length > 0) {
        await db.collection('attendance').insertMany(seedAttendance);
      }
      console.log('MongoDB seeding complete!');
    }

    const students = await db.collection('students').find({}).toArray();
    const marks = await db.collection('marks').find({}).toArray();
    const attendance = await db.collection('attendance').find({}).toArray();
    const remarksDocs = await db.collection('remarks').find({}).toArray();

    const remarks: Record<string, string> = {};
    remarksDocs.forEach((doc: any) => {
      remarks[doc.studentId] = doc.content;
    });

    res.json({ students, marks, attendance, remarks });
  } catch (error: any) {
    console.error('Failed to fetch from MongoDB:', error);
    res.status(500).json({ error: 'Failed to retrieve data from database.', details: error.message });
  }
});

// 2. Add Student
app.post('/api/students', async (req, res) => {
  try {
    const student = req.body;
    if (!student.name || !student.rollNumber) {
      return res.status(400).json({ error: 'Missing required student properties' });
    }
    const db = await getDb();
    await db.collection('students').insertOne(student);
    res.status(201).json({ success: true, student });
  } catch (error: any) {
    console.error('Failed to create student in MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Edit Student Details
app.put('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedStudent = req.body;
    const db = await getDb();
    
    const { _id, ...updateFields } = updatedStudent;
    await db.collection('students').updateOne(
      { id: id },
      { $set: updateFields },
      { upsert: true }
    );
    res.json({ success: true, student: updatedStudent });
  } catch (error: any) {
    console.error('Failed to update student in MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Delete Student (and cascaded elements)
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    await db.collection('students').deleteOne({ id: id });
    await db.collection('marks').deleteMany({ studentId: id });
    await db.collection('attendance').deleteMany({ studentId: id });
    await db.collection('remarks').deleteOne({ studentId: id });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete student from MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Update Attendance
app.post('/api/attendance', async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Missing date or records array.' });
    }
    const db = await getDb();
    
    // Wipe previous logs for this exact date to prevent duplicate records
    await db.collection('attendance').deleteMany({ date });
    
    if (records.length > 0) {
      const newLogs = records.map((rec: any, index: number) => ({
        id: `att-update-${date}-${rec.studentId}-${index}`,
        date,
        studentId: rec.studentId,
        status: rec.status
      }));
      await db.collection('attendance').insertMany(newLogs);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to record attendance in MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Update Marks
app.post('/api/marks', async (req, res) => {
  try {
    const { marksList } = req.body;
    if (!Array.isArray(marksList)) {
      return res.status(400).json({ error: 'marksList must be an array.' });
    }
    const db = await getDb();
    
    for (const item of marksList) {
      const existing = await db.collection('marks').findOne({
        studentId: item.studentId,
        subjectId: item.subjectId,
        examType: item.examType
      });
      
      if (existing) {
        await db.collection('marks').updateOne(
          { _id: existing._id },
          { $set: { marksObtained: item.marksObtained, maxMarks: item.maxMarks } }
        );
      } else {
        const id = `mark-gen-${Date.now()}-${Math.random()}`;
        await db.collection('marks').insertOne({
          id,
          ...item
        });
      }
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update marks in MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Update Remarks
app.post('/api/remarks', async (req, res) => {
  try {
    const { studentId, remarks } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'Missing studentId.' });
    }
    const db = await getDb();
    
    await db.collection('remarks').updateOne(
      { studentId: studentId },
      { $set: { content: remarks } },
      { upsert: true }
    );
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update remarks in MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

// 8. Wipe and reset to initial seed values
app.post('/api/reset', async (req, res) => {
  try {
    const db = await getDb();
    
    await db.collection('students').deleteMany({});
    await db.collection('marks').deleteMany({});
    await db.collection('attendance').deleteMany({});
    await db.collection('remarks').deleteMany({});
    
    const seedStudents = SEED_STUDENTS;
    const seedMarks = generateSeedMarks();
    const seedAttendance = generateSeedAttendance();
    
    await db.collection('students').insertMany(seedStudents);
    if (seedMarks.length > 0) {
      await db.collection('marks').insertMany(seedMarks);
    }
    if (seedAttendance.length > 0) {
      await db.collection('attendance').insertMany(seedAttendance);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to reset MongoDB:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize Gemini SDK lazily, with safeguard for missing keys
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('WARNING: GEMINI_API_KEY environment variable is not defined.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'PLACEHOLDER_API_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// AI Endpoint: Analyze Student and Generate report-card feedback
app.post('/api/analyze-student', async (req, res) => {
  try {
    const { student, marks, attendanceStats, subjects } = req.body;

    if (!student || !marks || !attendanceStats) {
      return res.status(400).json({ error: 'Missing required student details, marks, or attendance stats.' });
    }

    const ai = getGeminiClient();

    // Prepare a highly readable prompt detailing the student's metrics
    const prompt = `
      Please perform a highly professional, constructive, and comprehensive academic performance review for the student below:
      
      Student Name: ${student.name}
      Class: ${student.class}
      Gender: ${student.gender}
      Roll Number: ${student.rollNumber}

      ATTENDANCE METRICS:
      - Total School Days: ${attendanceStats.totalDays}
      - Days Present: ${attendanceStats.present}
      - Days On Leave: ${attendanceStats.leave}
      - Days Absent: ${attendanceStats.absent}
      - Attendance Percentage: ${attendanceStats.percentage}%

      SUBJECT-WISE EXAM MARKS:
      ${marks.map((m: any) => {
        const sub = subjects.find((s: any) => s.id === m.subjectId);
        const subName = sub ? sub.name : 'Unknown Subject';
        return `- ${subName} (${m.examType}): ${m.marksObtained}/${m.maxMarks} (${Math.round((m.marksObtained / m.maxMarks) * 100)}%)`;
      }).join('\n')}

      INSTRUCTIONS:
      - Generate a supportive, professional, and encouraging performance summary suitable for an official school report card.
      - Identify 2-3 solid subject-specific strengths or learning habits (based on their marks and attendance).
      - Identify 1-2 constructive areas that need attention.
      - Create 2-3 highly actionable steps (study plans or tips) for parents to support the child at home.
      - Keep the tone polite, professional, and focused on helping the student succeed.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an experienced, highly supportive, and professional high school Academic Counselor. You analyze student grades and attendance to write official, encouraging, and clear feedback for report cards and parent teacher meetings.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A professional, encouraging report-card comment summarizing overall progress, attendance, and attitude."
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 key strengths or achievements (e.g. excels in Mathematics and shows high computer programming aptitude)."
            },
            needsImprovement: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "1-2 constructive learning or attendance habits to work on."
            },
            actionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 highly actionable, clear tips for parents to support study at home."
            }
          },
          required: ["summary", "strengths", "needsImprovement", "actionPlan"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('Gemini model returned empty response.');
    }

    const parsedResponse = JSON.parse(textOutput.trim());
    return res.json(parsedResponse);
  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate AI report comments. Please ensure your Gemini API Key is configured.',
      details: error.message
    });
  }
});

// AI Portal Assistant endpoint: Parent Ask an AI Academic Coach
app.post('/api/parent-coach', async (req, res) => {
  try {
    const { student, marks, attendanceStats, subjects, message, chatHistory } = req.body;

    if (!student || !message) {
      return res.status(400).json({ error: 'Missing student profile or chat message.' });
    }

    const ai = getGeminiClient();

    // System prompt setting up the AI Coach
    const systemInstruction = `
      You are 'SchoolTrack Pro AI Parent Coach', a friendly, encouraging, and highly professional academic guidance counselor.
      A parent is asking for advice or feedback regarding their child, ${student.name}.
      
      Here is the child's academic context:
      - Class: ${student.class}
      - Roll Number: ${student.rollNumber}
      - Attendance: ${attendanceStats.percentage}% (${attendanceStats.present} present, ${attendanceStats.absent} absent, ${attendanceStats.leave} leave)
      - Grades:
        ${marks.map((m: any) => {
          const sub = subjects.find((s: any) => s.id === m.subjectId);
          return `- ${sub ? sub.name : 'Subject'}: ${m.marksObtained}/${m.maxMarks} in ${m.examType}`;
        }).join('\n')}
      
      Provide helpful, highly specific, and encouraging answers. Keep responses concise (under 150 words), conversational, and focused on practical, positive steps parents can take at home. Always refer to the student by name. Do not invent any non-existent grades or attendance.
    `;

    const chatMessages = [
      ...(chatHistory || []).map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.text }]
      })),
      {
        role: 'user' as const,
        parts: [{ text: message }]
      }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: chatMessages,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return res.json({ reply: response.text });
  } catch (error: any) {
    console.error('AI Coach Error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve advice from AI Coach. Please check your API Key configuration.',
      details: error.message
    });
  }
});

// Vite middleware integration for asset serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA routing: send index.html for all non-file requests
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SchoolTrack Pro] Full-Stack server running on http://localhost:${PORT}`);
  });
}

startServer();
