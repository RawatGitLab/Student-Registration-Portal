import React, { useState } from 'react';
import {
  Users,
  CalendarCheck,
  ClipboardList,
  BarChart3,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  Calendar,
  Save,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Mail,
  Phone,
  User,
  Activity,
  AlertTriangle,
  Trash2,
  Eye,
  Edit
} from 'lucide-react';
import { Student, Subject, Mark, AttendanceRecord, AttendanceStatus, ExamType } from '../types';
import { calculateGrade, SubjectBarChart } from './AnalyticsCharts';

interface TeacherDashboardProps {
  students: Student[];
  subjects: Subject[];
  marks: Mark[];
  attendance: AttendanceRecord[];
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onUpdateAttendance: (date: string, records: { studentId: string; status: AttendanceStatus }[]) => void;
  onUpdateMarks: (marksList: Omit<Mark, 'id'>[]) => void;
  onOpenStudentDetails: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => void;
  onUpdateStudent?: (student: Student) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function TeacherDashboard({
  students,
  subjects,
  marks,
  attendance,
  onAddStudent,
  onUpdateAttendance,
  onUpdateMarks,
  onOpenStudentDetails,
  onDeleteStudent,
  onUpdateStudent,
  showToast
}: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<'roster' | 'attendance' | 'marks' | 'analytics'>('roster');

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (showToast) {
      showToast(message, type);
    } else {
      alert(message);
    }
  };

  // Roster Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('All');
  
  // Add Student Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    rollNumber: '',
    name: '',
    class: 'Grade 10-A',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    parentName: '',
    parentEmail: '',
    parentPhone: ''
  });

  // Edit Student Form state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Daily Attendance Marker States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceEdits, setAttendanceEdits] = useState<Record<string, AttendanceStatus>>({});

  // Marks recorder states
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.id || '');
  const [selectedExam, setSelectedExam] = useState<ExamType>('Unit Test');
  const [marksEdits, setMarksEdits] = useState<Record<string, number>>({});

  // Trigger when attendance date changes or attendance tab is loaded
  React.useEffect(() => {
    // Pre-populate with existing logs if they exist for the date
    const dateLogs = attendance.filter(a => a.date === selectedDate);
    const newEdits: Record<string, AttendanceStatus> = {};
    
    students.forEach(student => {
      const match = dateLogs.find(l => l.studentId === student.id);
      newEdits[student.id] = match ? match.status : 'Present'; // Default to present
    });
    setAttendanceEdits(newEdits);
  }, [selectedDate, attendance, students, activeTab]);

  // Trigger when marks subject/exam segment changes
  React.useEffect(() => {
    const newEdits: Record<string, number> = {};
    students.forEach(student => {
      const match = marks.find(
        m => m.studentId === student.id && m.subjectId === selectedSubject && m.examType === selectedExam
      );
      newEdits[student.id] = match ? match.marksObtained : 0;
    });
    setMarksEdits(newEdits);
  }, [selectedSubject, selectedExam, marks, students, activeTab]);

  // Handle Add Student
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.rollNumber || !newStudent.parentEmail) {
      notify('Please fill out all required fields.', 'error');
      return;
    }
    // Check if roll number already exists
    if (students.some(s => s.rollNumber === newStudent.rollNumber)) {
      notify(`Roll Number ${newStudent.rollNumber} already exists.`, 'error');
      return;
    }
    onAddStudent(newStudent);
    setShowAddForm(false);
    // Reset form
    setNewStudent({
      rollNumber: '',
      name: '',
      class: 'Grade 10-A',
      gender: 'Male',
      parentName: '',
      parentEmail: '',
      parentPhone: ''
    });
  };

  // Handle Save Edited Student
  const handleSaveEditedStudent = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!editingStudent) return;

    if (!editingStudent.name || !editingStudent.rollNumber || !editingStudent.parentEmail) {
      notify('Please fill out all required fields.', 'error');
      return;
    }

    // Check if roll number already exists for another student
    if (students.some(s => s.rollNumber === editingStudent.rollNumber && s.id !== editingStudent.id)) {
      notify(`Roll Number ${editingStudent.rollNumber} already exists for another student.`, 'error');
      return;
    }

    onUpdateStudent?.(editingStudent);
    setEditingStudent(null);
  };

  // Bulk Attendance Marking Actions
  const bulkMarkAttendance = (status: AttendanceStatus) => {
    const updated = { ...attendanceEdits };
    students.forEach(s => {
      updated[s.id] = status;
    });
    setAttendanceEdits(updated);
  };

  const handleSaveAttendance = () => {
    const list = Object.entries(attendanceEdits).map(([studentId, status]) => ({
      studentId,
      status: status as AttendanceStatus
    }));
    onUpdateAttendance(selectedDate, list);
    notify(`Attendance log saved successfully for ${selectedDate}!`, 'success');
  };

  // Bulk Marks Actions
  const handleSaveMarks = () => {
    const max = selectedExam === 'Unit Test' ? 50 : 100;
    const records = Object.entries(marksEdits).map(([studentId, marksObtained]) => {
      // Validate bounds
      const clamped = Math.max(0, Math.min(max, Number(marksObtained)));
      return {
        studentId,
        subjectId: selectedSubject,
        examType: selectedExam,
        marksObtained: clamped,
        maxMarks: max
      };
    });
    onUpdateMarks(records);
    notify(`Subject grades committed successfully for ${selectedExam}!`, 'success');
  };

  // Compute Overall KPI Metrics for Dashboard Header
  const classAverages = subjects.map(sub => {
    const subMarks = marks.filter(m => m.subjectId === sub.id);
    const avg = subMarks.length > 0 
      ? subMarks.reduce((acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100, 0) / subMarks.length
      : 0;
    return { name: sub.name, score: avg };
  });

  const overallClassAvg = classAverages.length > 0
    ? classAverages.reduce((acc, c) => acc + c.score, 0) / classAverages.length
    : 0;

  const totalSchoolAttendanceLogs = attendance.length;
  const totalPresentCount = attendance.filter(a => a.status === 'Present').length;
  const overallAttendanceRate = totalSchoolAttendanceLogs > 0
    ? (totalPresentCount / totalSchoolAttendanceLogs) * 100
    : 92; // default high-quality baseline

  // Count at risk (attendance < 75%)
  const atRiskStudents = students.filter(student => {
    const logs = attendance.filter(a => a.studentId === student.id);
    if (logs.length === 0) return false;
    const presents = logs.filter(a => a.status === 'Present').length;
    const rate = (presents / logs.length) * 100;
    return rate < 75;
  }).length;

  // Filter students based on filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          student.rollNumber.includes(searchQuery);
    const matchesGender = genderFilter === 'All' || student.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Dashboard Metrics Summary Panels */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Students */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Enrolled</span>
            <p className="font-display text-2xl font-extrabold text-slate-800">{students.length}</p>
          </div>
        </div>

        {/* Attendance Index */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class Attendance</span>
            <p className="font-display text-2xl font-extrabold text-slate-800">
              {overallAttendanceRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Class GPA Index */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Academics Index</span>
            <p className="font-display text-2xl font-extrabold text-slate-800">
              {calculateGrade(overallClassAvg)} ({overallClassAvg.toFixed(1)}%)
            </p>
          </div>
        </div>

        {/* At risk alerts */}
        <div className={`rounded-2xl border p-5 shadow-sm flex items-center gap-4 transition-colors ${
          atRiskStudents > 0 
            ? 'border-rose-100 bg-rose-50/20 text-rose-800' 
            : 'border-slate-100 bg-white text-slate-800'
        }`}>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
            atRiskStudents > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">At-Risk Students</span>
            <p className="font-display text-2xl font-extrabold">{atRiskStudents}</p>
          </div>
        </div>
      </div>

      {/* 2. Workspace Tabs Selection */}
      <div className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-1">
        {[
          { id: 'roster', label: 'Student Roster', icon: Users },
          { id: 'attendance', label: 'Mark Attendance', icon: CalendarCheck },
          { id: 'marks', label: 'Grades Entry Matrix', icon: ClipboardList },
          { id: 'analytics', label: 'Class Insights', icon: BarChart3 }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. WORKSPACE CONTENTS */}

      {/* TAB A: ROSTER LISTING */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          
          {/* Quick Filters Panel */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-xs font-medium focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              {/* Gender filter */}
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 p-1 bg-slate-50 text-xs font-semibold text-slate-600">
                <span className="px-2 text-[11px] text-slate-400 uppercase tracking-wider">Gender:</span>
                {['All', 'Male', 'Female'].map((gender) => (
                  <button
                    key={gender}
                    onClick={() => setGenderFilter(gender)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      genderFilter === gender
                        ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                        : 'hover:text-slate-950'
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>

              {/* Add Student Toggle */}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Enroll Student
              </button>
            </div>
          </div>

          {/* Add Student Inline Dialog */}
          {showAddForm && (
            <form onSubmit={handleCreateStudent} className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 space-y-4">
              <div className="border-b border-indigo-100/50 pb-2">
                <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-indigo-500" />
                  Enroll New Student Details
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 107"
                    value={newStudent.rollNumber}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. James Smith"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Gender Profile</label>
                  <select
                    value={newStudent.gender}
                    onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Michael Smith"
                    value={newStudent.parentName}
                    onChange={(e) => setNewStudent({ ...newStudent, parentName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Parent Email ID *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. parent@example.com"
                    value={newStudent.parentEmail}
                    onChange={(e) => setNewStudent({ ...newStudent, parentEmail: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Parent Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 555-019-2834"
                    value={newStudent.parentPhone}
                    onChange={(e) => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-100"
                >
                  Enroll Student
                </button>
              </div>
            </form>
          )}

          {/* Detailed Student Roster Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="p-4 pl-6">Roll Number</th>
                    <th className="p-4">Student</th>
                    <th className="p-4">Gender</th>
                    <th className="p-4">Parent / Guardian</th>
                    <th className="p-4">Contact Details</th>
                    <th className="p-4">Attendance</th>
                    <th className="p-4">Grade Average</th>
                    <th className="p-4 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 font-semibold">
                        <Users className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                        No matching students found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      // Compute individual stats for quick preview
                      const sMarks = marks.filter(m => m.studentId === student.id);
                      const sAttendance = attendance.filter(a => a.studentId === student.id);
                      
                      const sAvgPct = sMarks.length > 0
                        ? sMarks.reduce((acc, c) => acc + (c.marksObtained / c.maxMarks) * 100, 0) / sMarks.length
                        : 0;

                      const presents = sAttendance.filter(a => a.status === 'Present').length;
                      const attPct = sAttendance.length > 0 ? (presents / sAttendance.length) * 100 : 100;

                      const isEditing = editingStudent && editingStudent.id === student.id;

                      return (
                        <tr
                          key={student.id}
                          className={`transition-colors group ${
                            isEditing ? 'bg-amber-50/40 hover:bg-amber-50/50' : 'hover:bg-slate-50/50'
                          }`}
                        >
                          {/* Roll Number */}
                          <td className="p-4 pl-6 font-mono font-bold text-slate-500">
                            {isEditing ? (
                              <input
                                type="text"
                                required
                                value={editingStudent.rollNumber}
                                onChange={(e) => setEditingStudent({ ...editingStudent, rollNumber: e.target.value })}
                                className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:border-amber-500 focus:outline-none font-mono"
                              />
                            ) : (
                              `#${student.rollNumber}`
                            )}
                          </td>

                          {/* Student Info */}
                          <td className="p-4">
                            {isEditing ? (
                              <div className="flex items-center gap-3">
                                <img
                                  src={student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                                  alt={student.name}
                                  className="h-10 w-10 rounded-xl object-cover ring-2 ring-amber-100 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="space-y-1 flex-1 min-w-[120px]">
                                  <input
                                    type="text"
                                    required
                                    value={editingStudent.name}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-amber-500 focus:outline-none text-slate-800"
                                    placeholder="Name"
                                  />
                                  <input
                                    type="text"
                                    required
                                    value={editingStudent.class}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, class: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] focus:border-amber-500 focus:outline-none text-slate-600"
                                    placeholder="Class"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <img
                                  src={student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                                  alt={student.name}
                                  className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-100 group-hover:ring-indigo-100 transition-all"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <span className="block font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                    {student.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    {student.class}
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Gender */}
                          <td className="p-4">
                            {isEditing ? (
                              <select
                                value={editingStudent.gender}
                                onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as any })}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs focus:border-amber-500 focus:outline-none font-medium text-slate-700"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            ) : (
                              <span className="text-slate-600 font-medium">{student.gender}</span>
                            )}
                          </td>

                          {/* Parent Name */}
                          <td className="p-4">
                            {isEditing ? (
                              <div className="min-w-[120px]">
                                <input
                                  type="text"
                                  required
                                  value={editingStudent.parentName}
                                  onChange={(e) => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-amber-500 focus:outline-none text-slate-800"
                                  placeholder="Parent/Guardian"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="font-semibold text-slate-800">{student.parentName}</div>
                                <span className="text-[10px] text-slate-400 font-normal">Guardian</span>
                              </>
                            )}
                          </td>

                          {/* Contacts */}
                          <td className="p-4 text-slate-500">
                            {isEditing ? (
                              <div className="space-y-1 min-w-[150px]">
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                  <input
                                    type="email"
                                    required
                                    value={editingStudent.parentEmail}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, parentEmail: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs focus:border-amber-500 focus:outline-none font-mono"
                                    placeholder="Parent Email"
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                  <input
                                    type="text"
                                    value={editingStudent.parentPhone || ''}
                                    onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs focus:border-amber-500 focus:outline-none font-mono"
                                    placeholder="Parent Phone"
                                  />
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <Mail className="h-3.5 w-3.5 text-slate-300" />
                                  <span className="font-mono">{student.parentEmail}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                                  <Phone className="h-3.5 w-3.5 text-slate-300" />
                                  <span className="font-mono">{student.parentPhone}</span>
                                </div>
                              </>
                            )}
                          </td>

                          {/* Attendance */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-bold ${
                                attPct >= 85 ? 'text-emerald-600' :
                                attPct < 75 ? 'text-rose-600' : 'text-amber-600'
                              }`}>
                                {attPct.toFixed(0)}%
                              </span>
                              <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    attPct >= 85 ? 'bg-emerald-500' :
                                    attPct < 75 ? 'bg-rose-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${attPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Grade Average */}
                          <td className="p-4">
                            <span className="font-mono font-black text-indigo-600">
                              {sAvgPct > 0 ? `${calculateGrade(sAvgPct)} (${sAvgPct.toFixed(0)}%)` : 'N/A'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right pr-6">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveEditedStudent(e);
                                  }}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-sm transition-colors"
                                  title="Save Changes"
                                >
                                  <Save className="h-3.5 w-3.5" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingStudent(null);
                                  }}
                                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                  title="Cancel"
                                >
                                  <XCircle className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => onOpenStudentDetails(student)}
                                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Details</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingStudent(student);
                                    setShowAddForm(false);
                                  }}
                                  className="flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-colors"
                                  title="Edit Student"
                                >
                                  <Edit className="h-3.5 w-3.5 text-amber-500" />
                                  <span>Edit</span>
                                </button>
                                {onDeleteStudent && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteStudent(student.id);
                                    }}
                                    className="flex items-center gap-1 rounded-lg border border-red-100 bg-red-50/50 px-2.5 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                                    title="Delete Student"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: DAILY ATTENDANCE MARKER */}
      {activeTab === 'attendance' && (
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm space-y-4 p-5">
          
          {/* Header & Date Configuration */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              <div>
                <h3 className="font-display font-bold text-slate-800 text-sm">Classroom Attendance Register</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Configure daily status logs</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-500">Date Log:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Bulk Marking Tool rails */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-semibold">
            <span className="text-slate-500">Bulk Mark Entire Class:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkMarkAttendance('Present')}
                className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
              >
                Mark All Present
              </button>
              <button
                onClick={() => bulkMarkAttendance('Leave')}
                className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-100 hover:bg-amber-100 transition-colors"
              >
                Mark All Leave
              </button>
              <button
                onClick={() => bulkMarkAttendance('Absent')}
                className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-100 hover:bg-rose-100 transition-colors"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {/* Student attendance roster grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4 pl-6">Roll Number</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Current Registered Status</th>
                  <th className="p-4 text-right pr-6">Status Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {students.map((student) => {
                  const status = attendanceEdits[student.id] || 'Present';
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/30">
                      <td className="p-4 pl-6 font-mono font-bold text-slate-500">#{student.rollNumber}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                            alt={student.name}
                            className="h-8 w-8 rounded-lg object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-semibold text-slate-900">{student.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          status === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                          status === 'Absent' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                          <button
                            onClick={() => setAttendanceEdits({ ...attendanceEdits, [student.id]: 'Present' })}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                              status === 'Present'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => setAttendanceEdits({ ...attendanceEdits, [student.id]: 'Leave' })}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                              status === 'Leave'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            Leave
                          </button>
                          <button
                            onClick={() => setAttendanceEdits({ ...attendanceEdits, [student.id]: 'Absent' })}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                              status === 'Absent'
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Submit Attendance */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveAttendance}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              Save Attendance Logs
            </button>
          </div>
        </div>
      )}

      {/* TAB C: SUBJECT MARKS GRID ENTRY */}
      {activeTab === 'marks' && (
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm space-y-4 p-5">
          
          {/* Filtering segments */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-500" />
              <div>
                <h3 className="font-display font-bold text-slate-800 text-sm">Subject Marks Grades Matrix</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Record grade vectors for report cards</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Subject selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Subject:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                >
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              {/* Exam segment selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Segment:</span>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value as ExamType)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                >
                  <option value="Unit Test">Unit Test (Max: 50)</option>
                  <option value="Half-Yearly">Half-Yearly (Max: 100)</option>
                  <option value="Final">Final Exam (Max: 100)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inline input grid matrix */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4 pl-6">Roll Number</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Marks Obtained (Editable)</th>
                  <th className="p-4">Percentage Score</th>
                  <th className="p-4 pr-6">Calculated Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {students.map((student) => {
                  const score = marksEdits[student.id] || 0;
                  const max = selectedExam === 'Unit Test' ? 50 : 100;
                  const pct = (score / max) * 100;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/30">
                      <td className="p-4 pl-6 font-mono font-bold text-slate-500">#{student.rollNumber}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                            alt={student.name}
                            className="h-8 w-8 rounded-lg object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-semibold text-slate-900">{student.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={max}
                            value={score || ''}
                            placeholder="0"
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setMarksEdits({ ...marksEdits, [student.id]: val });
                            }}
                            className="w-20 rounded-lg border border-slate-200 px-2.5 py-1 text-center font-mono text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none bg-slate-50/50 hover:bg-slate-50 focus:bg-white"
                          />
                          <span className="text-slate-400 font-bold">/ {max}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-indigo-600">
                        {pct.toFixed(0)}%
                      </td>
                      <td className="p-4 pr-6">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          pct >= 85 ? 'bg-emerald-50 text-emerald-700' :
                          pct < 60 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {calculateGrade(pct)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Submit Grades */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveMarks}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              Commit Marks
            </button>
          </div>
        </div>
      )}

      {/* TAB D: ANALYTICS VISUALIZERS */}
      {activeTab === 'analytics' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Subject averages */}
          <SubjectBarChart data={classAverages} />

          {/* Attendance dispersion */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-indigo-500" />
              <div>
                <h3 className="font-display font-bold text-slate-800 text-xs">Attendance Distribution</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Presenteeism Tiers</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="font-display text-lg font-black text-emerald-700">
                  {students.filter(student => {
                    const logs = attendance.filter(a => a.studentId === student.id);
                    if (logs.length === 0) return true;
                    const rate = (logs.filter(a => a.status === 'Present').length / logs.length) * 100;
                    return rate >= 85;
                  }).length}
                </div>
                <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Regular (&ge;85%)</div>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <div className="font-display text-lg font-black text-amber-700">
                  {students.filter(student => {
                    const logs = attendance.filter(a => a.studentId === student.id);
                    if (logs.length === 0) return false;
                    const rate = (logs.filter(a => a.status === 'Present').length / logs.length) * 100;
                    return rate >= 75 && rate < 85;
                  }).length}
                </div>
                <div className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Marginal (75-85%)</div>
              </div>

              <div className="rounded-xl bg-rose-50 p-4">
                <div className="font-display text-lg font-black text-rose-700">
                  {students.filter(student => {
                    const logs = attendance.filter(a => a.studentId === student.id);
                    if (logs.length === 0) return false;
                    const rate = (logs.filter(a => a.status === 'Present').length / logs.length) * 100;
                    return rate < 75;
                  }).length}
                </div>
                <div className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">Critical (&lt;75%)</div>
              </div>
            </div>

            <p className="text-[10px] font-medium leading-relaxed text-slate-400 text-center">
              School protocol mandates standard academic intervention and parent notifications for students logging into the Critical &lt;75% Attendance Bracket.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
