/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Student,
  Subject,
  Mark,
  AttendanceRecord,
  AttendanceStatus,
  UserRole
} from './types';
import {
  SEED_SUBJECTS,
  SEED_STUDENTS,
  generateSeedMarks,
  generateSeedAttendance
} from './seedData';
import {
  CheckCircle2,
  AlertTriangle,
  X,
  Info,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import Navigation from './components/Navigation';
import TeacherDashboard from './components/TeacherDashboard';
import ParentPortal from './components/ParentPortal';
import StudentDetailsModal from './components/StudentDetailsModal';
import TeacherLoginForm from './components/TeacherLoginForm';

export default function App() {
  // 1. DATABASE STATES (Initialized with LocalStorage or Seed Fallback)
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects] = useState<Subject[]>(SEED_SUBJECTS);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [studentRemarks, setStudentRemarks] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // 2. WORKSPACE NAV STATES
  const [currentRole, setCurrentRole] = useState<UserRole>('Teacher');
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('schooltrack_teacher_auth') === 'true';
  });
  const [selectedParentStudent, setSelectedParentStudent] = useState<Student | null>(null);
  const [activeDetailStudent, setActiveDetailStudent] = useState<Student | null>(null);

  // Custom UI Confirmation & Notification States
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync / Bootstrapping databases on mount
  useEffect(() => {
    let active = true;

    async function loadDatabase() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/data');
        if (!response.ok) {
          throw new Error(`Failed to contact MongoDB server: ${response.statusText}`);
        }
        const data = await response.json();
        if (active) {
          setStudents(data.students || []);
          setMarks(data.marks || []);
          setAttendance(data.attendance || []);
          setStudentRemarks(data.remarks || {});
          setDbError(null);
        }
      } catch (err: any) {
        console.error('MongoDB load error. Falling back to LocalStorage:', err);
        if (active) {
          setDbError(err.message || 'Connection failed');
          
          // Fallback to offline LocalStorage state
          const localStudents = localStorage.getItem('schooltrack_students');
          const localMarks = localStorage.getItem('schooltrack_marks');
          const localAttendance = localStorage.getItem('schooltrack_attendance');
          const localRemarks = localStorage.getItem('schooltrack_remarks');

          if (localStudents && localMarks && localAttendance) {
            setStudents(JSON.parse(localStudents));
            setMarks(JSON.parse(localMarks));
            setAttendance(JSON.parse(localAttendance));
          } else {
            const seedStudents = SEED_STUDENTS;
            const seedMarks = generateSeedMarks();
            const seedAttendance = generateSeedAttendance();

            setStudents(seedStudents);
            setMarks(seedMarks);
            setAttendance(seedAttendance);

            localStorage.setItem('schooltrack_students', JSON.stringify(seedStudents));
            localStorage.setItem('schooltrack_marks', JSON.stringify(seedMarks));
            localStorage.setItem('schooltrack_attendance', JSON.stringify(seedAttendance));
          }

          if (localRemarks) {
            setStudentRemarks(JSON.parse(localRemarks));
          }
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadDatabase();
    return () => { active = false; };
  }, []);

  // Helper to reset database back to fresh seeds
  const handleResetDatabase = () => {
    setConfirmConfig({
      title: 'Reset Sandbox Database?',
      message: 'Are you sure you want to reset all students, attendance logs, and marks back to original sandbox seeds? All manual changes will be discarded.',
      confirmLabel: 'Reset Seeds',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        const seedStudents = SEED_STUDENTS;
        const seedMarks = generateSeedMarks();
        const seedAttendance = generateSeedAttendance();

        setStudents(seedStudents);
        setMarks(seedMarks);
        setAttendance(seedAttendance);
        setStudentRemarks({});
        setSelectedParentStudent(null);
        setActiveDetailStudent(null);

        localStorage.setItem('schooltrack_students', JSON.stringify(seedStudents));
        localStorage.setItem('schooltrack_marks', JSON.stringify(seedMarks));
        localStorage.setItem('schooltrack_attendance', JSON.stringify(seedAttendance));
        localStorage.removeItem('schooltrack_remarks');

        try {
          const res = await fetch('/api/reset', { method: 'POST' });
          if (!res.ok) throw new Error('Failed to reset data on MongoDB');
          showToast('Database successfully reset to original seed vector across MongoDB Atlas and local browser storage!', 'success');
        } catch (err) {
          console.error(err);
          showToast('Database reset locally, but could not sync with MongoDB Atlas. Please verify your connection.', 'error');
        }
        setConfirmConfig(null);
      }
    });
  };

  // 3. EVENT HANDLERS (With automatic MongoDB sync and LocalStorage mirroring)

  // Add new student
  const handleAddStudent = async (studentData: Omit<Student, 'id'>) => {
    const newId = `std-${Date.now()}`;
    const student: Student = {
      ...studentData,
      id: newId,
      avatarUrl: `https://images.unsplash.com/photo-${getRandomProfileId()}?auto=format&fit=crop&w=150&h=150&q=80`
    };

    const nextStudents = [...students, student];
    setStudents(nextStudents);
    localStorage.setItem('schooltrack_students', JSON.stringify(nextStudents));

    try {
      await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });
    } catch (err) {
      console.error('Database write error:', err);
    }
  };

  const getRandomProfileId = () => {
    const IDs = [
      '1534528741775-53994a69daeb',
      '1506794778202-cad84cf45f1d',
      '1438761681033-6461ffad8d80',
      '1517841905240-472988babdf9',
      '1539571696357-5a69c17a67c6',
      '1494790108377-be9c29b29330'
    ];
    return IDs[Math.floor(Math.random() * IDs.length)];
  };

  // Record daily attendance
  const handleUpdateAttendance = async (date: string, records: { studentId: string; status: AttendanceStatus }[]) => {
    let filtered = attendance.filter(a => a.date !== date);

    const newLogs: AttendanceRecord[] = records.map((rec, index) => ({
      id: `att-update-${date}-${rec.studentId}-${index}`,
      date,
      studentId: rec.studentId,
      status: rec.status
    }));

    const nextAttendance = [...filtered, ...newLogs];
    setAttendance(nextAttendance);
    localStorage.setItem('schooltrack_attendance', JSON.stringify(nextAttendance));

    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, records })
      });
    } catch (err) {
      console.error('Database attendance sync error:', err);
    }
  };

  // Record subject grades
  const handleUpdateMarks = async (marksList: Omit<Mark, 'id'>[]) => {
    let updatedMarks = [...marks];

    marksList.forEach(item => {
      const matchIndex = updatedMarks.findIndex(
        m => m.studentId === item.studentId && m.subjectId === item.subjectId && m.examType === item.examType
      );

      if (matchIndex > -1) {
        updatedMarks[matchIndex] = {
          ...updatedMarks[matchIndex],
          marksObtained: item.marksObtained,
          maxMarks: item.maxMarks
        };
      } else {
        updatedMarks.push({
          id: `mark-gen-${Date.now()}-${Math.random()}`,
          ...item
        });
      }
    });

    setMarks(updatedMarks);
    localStorage.setItem('schooltrack_marks', JSON.stringify(updatedMarks));

    try {
      await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marksList })
      });
    } catch (err) {
      console.error('Database marks sync error:', err);
    }
  };

  // Save report card commentary notes
  const handleSaveRemarks = async (studentId: string, remarks: string) => {
    const nextRemarks = {
      ...studentRemarks,
      [studentId]: remarks
    };
    setStudentRemarks(nextRemarks);
    localStorage.setItem('schooltrack_remarks', JSON.stringify(nextRemarks));

    if (activeDetailStudent && activeDetailStudent.id === studentId) {
      setActiveDetailStudent({ ...activeDetailStudent });
    }

    try {
      await fetch('/api/remarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, remarks })
      });
    } catch (err) {
      console.error('Database remarks sync error:', err);
    }
  };

  // Update student details
  const handleUpdateStudent = async (updatedStudent: Student) => {
    const nextStudents = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    setStudents(nextStudents);
    localStorage.setItem('schooltrack_students', JSON.stringify(nextStudents));

    if (activeDetailStudent && activeDetailStudent.id === updatedStudent.id) {
      setActiveDetailStudent(updatedStudent);
    }
    if (selectedParentStudent && selectedParentStudent.id === updatedStudent.id) {
      setSelectedParentStudent(updatedStudent);
    }

    try {
      await fetch(`/api/students/${updatedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStudent)
      });
    } catch (err) {
      console.error('Database student update error:', err);
    }
  };

  // Delete student and clean up all their related data
  const handleDeleteStudent = (studentId: string) => {
    setConfirmConfig({
      title: 'Delete Student Record?',
      message: 'Are you sure you want to delete this student and all of their academic records (attendance history, marks, grades, and comments)? This action cannot be undone.',
      confirmLabel: 'Delete Student',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        const nextStudents = students.filter(s => s.id !== studentId);
        const nextMarks = marks.filter(m => m.studentId !== studentId);
        const nextAttendance = attendance.filter(a => a.studentId !== studentId);

        setStudents(nextStudents);
        setMarks(nextMarks);
        setAttendance(nextAttendance);

        localStorage.setItem('schooltrack_students', JSON.stringify(nextStudents));
        localStorage.setItem('schooltrack_marks', JSON.stringify(nextMarks));
        localStorage.setItem('schooltrack_attendance', JSON.stringify(nextAttendance));

        const nextRemarks = { ...studentRemarks };
        delete nextRemarks[studentId];
        setStudentRemarks(nextRemarks);
        localStorage.setItem('schooltrack_remarks', JSON.stringify(nextRemarks));

        if (activeDetailStudent && activeDetailStudent.id === studentId) {
          setActiveDetailStudent(null);
        }
        if (selectedParentStudent && selectedParentStudent.id === studentId) {
          setSelectedParentStudent(null);
        }

        try {
          await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
          showToast('Student record deleted successfully.', 'success');
        } catch (err) {
          console.error('Database student delete error:', err);
          showToast('Failed to sync student deletion with Cloud Database.', 'error');
        }
        setConfirmConfig(null);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <div className="space-y-4 text-center max-w-xs animate-pulse">
          <div className="relative flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-indigo-600"></div>
          </div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-600 uppercase font-display">SchoolTrack Pro</h2>
          <p className="text-[11px] text-slate-400 font-medium">Connecting to MongoDB Atlas Database Cluster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* 1. Global Navigation Header */}
      <Navigation
        currentRole={currentRole}
        onChangeRole={(role) => setCurrentRole(role)}
        onResetData={handleResetDatabase}
        selectedStudentName={selectedParentStudent?.name}
        onLogoutStudent={selectedParentStudent ? () => setSelectedParentStudent(null) : undefined}
        isTeacherAuthenticated={isTeacherAuthenticated}
        onLogoutTeacher={() => {
          setIsTeacherAuthenticated(false);
          sessionStorage.removeItem('schooltrack_teacher_auth');
        }}
      />

      {/* 2. Page Content Body */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {currentRole === 'Teacher' || currentRole === 'Admin' ? (
          !isTeacherAuthenticated ? (
            <TeacherLoginForm
              onLoginSuccess={() => {
                setIsTeacherAuthenticated(true);
                sessionStorage.setItem('schooltrack_teacher_auth', 'true');
              }}
              onBackToParentPortal={() => setCurrentRole('Parent')}
            />
          ) : (
            <TeacherDashboard
              students={students}
              subjects={subjects}
              marks={marks}
              attendance={attendance}
              onAddStudent={handleAddStudent}
              onUpdateAttendance={handleUpdateAttendance}
              onUpdateMarks={handleUpdateMarks}
              onOpenStudentDetails={(s) => setActiveDetailStudent(s)}
              onDeleteStudent={handleDeleteStudent}
              onUpdateStudent={handleUpdateStudent}
              showToast={showToast}
            />
          )
        ) : (
          <ParentPortal
            students={students}
            subjects={subjects}
            marks={marks}
            attendance={attendance}
            onLoginStudent={(s) => setSelectedParentStudent(s)}
            selectedStudent={selectedParentStudent}
          />
        )}
      </main>

      {/* 3. Detailed Student Information Overlay Drawer (Teacher View) */}
      {activeDetailStudent && (
        <StudentDetailsModal
          student={activeDetailStudent}
          allSubjects={subjects}
          allMarks={marks}
          allAttendance={attendance}
          onClose={() => setActiveDetailStudent(null)}
          onSaveRemarks={handleSaveRemarks}
          savedRemarks={studentRemarks[activeDetailStudent.id]}
          showToast={showToast}
        />
      )}

      {/* Footer */}
      <footer className="shrink-0 border-t border-slate-200/60 bg-white py-6 text-center text-xs font-semibold text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} SchoolTrack Pro. Built on Google Cloud Core. Fully Compliant Sandbox Mode.</p>
        </div>
      </footer>

      {/* Custom Confirmation Modal */}
      {confirmConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">{confirmConfig.title}</h3>
            <p className="mt-2 text-xs font-semibold text-slate-500 leading-relaxed">{confirmConfig.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmConfig(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {confirmConfig.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmConfig.onConfirm}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-md shadow-red-100 transition-colors"
              >
                {confirmConfig.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-150 bg-white px-4 py-3.5 shadow-xl animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm">
          {toast.type === 'success' && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
          {toast.type === 'error' && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 shrink-0">
              <AlertCircle className="h-4 w-4" />
            </div>
          )}
          {toast.type === 'info' && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Info className="h-4 w-4" />
            </div>
          )}
          <p className="text-xs font-bold text-slate-700 mr-2">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-600 shrink-0 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
