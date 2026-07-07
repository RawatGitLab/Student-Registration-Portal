export interface Student {
  id: string;
  rollNumber: string;
  name: string;
  class: string; // e.g., "Grade 10-A", "Grade 11-B"
  gender: 'Male' | 'Female' | 'Other';
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  avatarUrl?: string;
}

export interface Subject {
  id: string;
  name: string;
  teacherName: string;
}

export type ExamType = 'Unit Test' | 'Half-Yearly' | 'Final';

export interface Mark {
  id: string;
  studentId: string;
  subjectId: string;
  examType: ExamType;
  marksObtained: number;
  maxMarks: number;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Leave';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
}

export type UserRole = 'Admin' | 'Teacher' | 'Student' | 'Parent';

export interface PerformanceComment {
  studentId: string;
  comment: string;
  generatedAt: string;
}
