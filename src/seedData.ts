import { Student, Subject, Mark, AttendanceRecord } from './types';

export const SEED_SUBJECTS: Subject[] = [
  { id: 'sub-math', name: 'Mathematics', teacherName: 'Mr. Alan Turing' },
  { id: 'sub-sci', name: 'Science', teacherName: 'Dr. Marie Curie' },
  { id: 'sub-eng', name: 'English', teacherName: 'Mrs. Jane Austen' },
  { id: 'sub-soc', name: 'Social Studies', teacherName: 'Mr. Winston Churchill' },
  { id: 'sub-cs', name: 'Computer Science', teacherName: 'Dr. Grace Hopper' }
];

export const SEED_STUDENTS: Student[] = [
  {
    id: 'std-1',
    rollNumber: '101',
    name: 'Aarav Sharma',
    class: 'Grade 10-A',
    gender: 'Male',
    parentName: 'Ramesh Sharma',
    parentEmail: 'ramesh.sharma@gmail.com',
    parentPhone: '+91 98765 43210',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    id: 'std-2',
    rollNumber: '102',
    name: 'Emily Watson',
    class: 'Grade 10-A',
    gender: 'Female',
    parentName: 'David Watson',
    parentEmail: 'david.watson@gmail.com',
    parentPhone: '+1 (555) 019-2834',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    id: 'std-3',
    rollNumber: '103',
    name: 'Kabir Mehta',
    class: 'Grade 10-A',
    gender: 'Male',
    parentName: 'Sanjay Mehta',
    parentEmail: 'sanjay.mehta@gmail.com',
    parentPhone: '+91 91234 56789',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    id: 'std-4',
    rollNumber: '104',
    name: 'Sophia Chen',
    class: 'Grade 10-A',
    gender: 'Female',
    parentName: 'Yong Chen',
    parentEmail: 'yong.chen@gmail.com',
    parentPhone: '+1 (555) 014-9876',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    id: 'std-5',
    rollNumber: '105',
    name: 'Arjun Das',
    class: 'Grade 10-A',
    gender: 'Male',
    parentName: 'Prosenjit Das',
    parentEmail: 'prosenjit.das@gmail.com',
    parentPhone: '+91 98300 12345',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80'
  },
  {
    id: 'std-6',
    rollNumber: '106',
    name: 'Zara Patel',
    class: 'Grade 10-A',
    gender: 'Female',
    parentName: 'Vikram Patel',
    parentEmail: 'vikram.patel@gmail.com',
    parentPhone: '+91 99887 76655',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80'
  }
];

// Helper to generate seed marks
export const generateSeedMarks = (): Mark[] => {
  const marks: Mark[] = [];
  const performanceProfiles: Record<string, { math: number; sci: number; eng: number; soc: number; cs: number }> = {
    'std-1': { math: 85, sci: 78, eng: 92, soc: 88, cs: 95 }, // Aarav (Excellence in Computer Sci & English, good in other)
    'std-2': { math: 92, sci: 95, eng: 85, soc: 80, cs: 88 }, // Emily (Strong in Science & Math)
    'std-3': { math: 45, sci: 55, eng: 62, soc: 58, cs: 50 }, // Kabir (Needs improvement, struggles slightly)
    'std-4': { math: 98, sci: 97, eng: 95, soc: 94, cs: 99 }, // Sophia (Topper, brilliant in all)
    'std-5': { math: 72, sci: 68, eng: 75, soc: 82, cs: 70 }, // Arjun (Average student, strong in humanities)
    'std-6': { math: 64, sci: 85, eng: 80, soc: 75, cs: 78 }  // Zara (Strong in Science, average in math)
  };

  const exams: { type: 'Unit Test' | 'Half-Yearly' | 'Final'; multiplier: number; max: number }[] = [
    { type: 'Unit Test', multiplier: 0.95, max: 50 },
    { type: 'Half-Yearly', multiplier: 0.98, max: 100 },
    { type: 'Final', multiplier: 1.02, max: 100 }
  ];

  let idCounter = 1;
  SEED_STUDENTS.forEach(student => {
    const profile = performanceProfiles[student.id];
    if (!profile) return;

    exams.forEach(exam => {
      SEED_SUBJECTS.forEach(subject => {
        let baseMark = 75;
        if (subject.id === 'sub-math') baseMark = profile.math;
        else if (subject.id === 'sub-sci') baseMark = profile.sci;
        else if (subject.id === 'sub-eng') baseMark = profile.eng;
        else if (subject.id === 'sub-soc') baseMark = profile.soc;
        else if (subject.id === 'sub-cs') baseMark = profile.cs;

        // Apply exam factor and clamp to max
        let score = Math.round((baseMark / 100) * exam.max * exam.multiplier);
        // Add tiny random fluctuation (-2 to +2)
        score += Math.floor(Math.random() * 5) - 2;
        score = Math.max(0, Math.min(exam.max, score));

        marks.push({
          id: `mark-${idCounter++}`,
          studentId: student.id,
          subjectId: subject.id,
          examType: exam.type,
          marksObtained: score,
          maxMarks: exam.max
        });
      });
    });
  });

  return marks;
};

// Helper to generate seed attendance records for the past 14 days
export const generateSeedAttendance = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  let idCounter = 1;

  // Let's create dates for the past 15 calendar days (excluding weekends)
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 15; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sat (6) and Sun (0)
      const dateString = d.toISOString().split('T')[0];
      dates.push(dateString);
    }
  }

  // Attendance behavior profile for each student
  const profiles: Record<string, { presentProb: number; leaveProb: number }> = {
    'std-1': { presentProb: 0.95, leaveProb: 0.03 }, // Very regular
    'std-2': { presentProb: 0.98, leaveProb: 0.01 }, // Perfect attendance
    'std-3': { presentProb: 0.80, leaveProb: 0.10 }, // Frequently absent/on leave
    'std-4': { presentProb: 0.96, leaveProb: 0.02 }, // Regular
    'std-5': { presentProb: 0.90, leaveProb: 0.05 }, // Normal
    'std-6': { presentProb: 0.88, leaveProb: 0.07 }  // Slights absences
  };

  dates.forEach(date => {
    SEED_STUDENTS.forEach(student => {
      const profile = profiles[student.id] || { presentProb: 0.90, leaveProb: 0.05 };
      const rand = Math.random();
      let status: 'Present' | 'Absent' | 'Leave' = 'Present';
      
      if (rand > profile.presentProb) {
        if (Math.random() < profile.leaveProb / (1 - profile.presentProb)) {
          status = 'Leave';
        } else {
          status = 'Absent';
        }
      }

      records.push({
        id: `att-${idCounter++}`,
        date,
        studentId: student.id,
        status
      });
    });
  });

  return records;
};
