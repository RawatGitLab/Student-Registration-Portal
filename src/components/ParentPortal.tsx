import React, { useState, useRef, useEffect } from 'react';
import {
  UserCircle,
  GraduationCap,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  Lock,
  Printer,
  ChevronRight,
  Lightbulb,
  Award,
  AlertCircle
} from 'lucide-react';
import { Student, Subject, Mark, AttendanceRecord } from '../types';
import { AttendanceProgressRing, PerformanceTrendLine, SubjectBarChart, calculateGrade } from './AnalyticsCharts';

interface ParentPortalProps {
  students: Student[];
  subjects: Subject[];
  marks: Mark[];
  attendance: AttendanceRecord[];
  onLoginStudent: (student: Student) => void;
  selectedStudent: Student | null;
}

export default function ParentPortal({
  students,
  subjects,
  marks,
  attendance,
  onLoginStudent,
  selectedStudent
}: ParentPortalProps) {
  // Login input
  const [rollNumberInput, setRollNumberInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'grades' | 'attendance' | 'ai-coach'>('grades');

  // AI Chat States
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([
    {
      sender: 'ai',
      text: `Hello! I am your SchoolTrack Pro AI Academic Coach. I have analysed your child's recent grade book and attendance logs. How can I help you support their learning journey at home today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loadingChat, setLoadingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loadingChat]);

  // Handle Roll Number Sign In
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const match = students.find(s => s.rollNumber.trim() === rollNumberInput.trim());
    if (match) {
      onLoginStudent(match);
      setRollNumberInput('');
    } else {
      setLoginError('Invalid Roll Number. Please try a valid seeded number (e.g. 101, 102).');
    }
  };

  // If no student session is active, render the welcome screen
  if (!selectedStudent) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl text-slate-700 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl font-black text-slate-900">Parent-Student Portal</h2>
          <p className="text-xs font-semibold text-slate-400 leading-normal">
            Authenticate using your official student roll number to access real-time grades, attendance sheets, and our AI Academic Coach.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Student Roll Number</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Enter roll number (e.g. 101)"
                value={rollNumberInput}
                onChange={(e) => setRollNumberInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 pl-4 pr-12 text-xs font-semibold focus:border-indigo-500 focus:outline-none focus:bg-white"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loginError && (
            <p className="text-[10px] font-bold text-rose-500">{loginError}</p>
          )}
        </form>

        {/* Dev Seed account quick shortcut list */}
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <span>Quick Sandbox Sessions</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Click any seeded student profile to log in instantly:</p>
          <div className="grid grid-cols-2 gap-2">
            {students.slice(0, 4).map((s) => (
              <button
                key={s.id}
                onClick={() => onLoginStudent(s)}
                className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2 text-left hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-xs"
              >
                <img
                  src={s.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                  alt={s.name}
                  className="h-6 w-6 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="truncate">
                  <div className="font-bold text-slate-800 truncate">{s.name}</div>
                  <div className="font-mono text-[9px] font-bold text-slate-400">Roll #{s.rollNumber}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // LOGGED-IN PORTAL DASHBOARD CODE
  const student = selectedStudent;
  const studentMarks = marks.filter(m => m.studentId === student.id);
  const studentAttendance = attendance.filter(a => a.studentId === student.id);

  // Compute stats
  const totalSchoolDays = studentAttendance.length;
  const presentCount = studentAttendance.filter(a => a.status === 'Present').length;
  const absentCount = studentAttendance.filter(a => a.status === 'Absent').length;
  const leaveCount = studentAttendance.filter(a => a.status === 'Leave').length;
  const attendancePercentage = totalSchoolDays > 0 ? (presentCount / totalSchoolDays) * 100 : 100;

  const subjectAverages = subjects.map(sub => {
    const subMarks = studentMarks.filter(m => m.subjectId === sub.id);
    const averagePct = subMarks.length > 0 
      ? subMarks.reduce((acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100, 0) / subMarks.length
      : 0;
    return { name: sub.name, score: averagePct };
  });

  const overallAveragePercentage = studentMarks.length > 0
    ? studentMarks.reduce((acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100, 0) / studentMarks.length
    : 0;

  const examProgressData = [
    { label: 'Unit Test', score: computeExamAverage('Unit Test') },
    { label: 'Half-Yearly', score: computeExamAverage('Half-Yearly') },
    { label: 'Final', score: computeExamAverage('Final') }
  ].filter(d => d.score > 0);

  function computeExamAverage(examType: 'Unit Test' | 'Half-Yearly' | 'Final'): number {
    const examMarks = studentMarks.filter(m => m.examType === examType);
    return examMarks.length > 0
      ? examMarks.reduce((acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100, 0) / examMarks.length
      : 0;
  }

  // Chat Submission to server API
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatMessage('');
    
    const userMsg = {
      sender: 'user' as const,
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    setLoadingChat(true);

    try {
      const response = await fetch('/api/parent-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student,
          marks: studentMarks,
          attendanceStats: {
            percentage: Math.round(attendancePercentage),
            present: presentCount,
            absent: absentCount,
            leave: leaveCount
          },
          subjects,
          message: userText,
          chatHistory: nextHistory.slice(-6) // Send recent message history contexts
        })
      });

      if (!response.ok) {
        throw new Error('AI Server is unresponsive.');
      }

      const data = await response.json();
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'ai' as const,
          text: data.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'ai' as const,
          text: 'I apologize, but I am having trouble connecting to my cognitive center. Please check that the Gemini API Key is configured in your workspace secrets, or ask again in a moment.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const sendQuickQuestion = (q: string) => {
    setChatMessage(q);
    // Submit in next tick
    setTimeout(() => {
      const btn = document.getElementById('chat-submit-btn');
      if (btn) btn.click();
    }, 100);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Student Overview Header Widget */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
            alt={student.name}
            className="h-14 w-14 rounded-2xl object-cover ring-4 ring-indigo-50 shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div>
            <h2 className="font-display text-xl font-bold text-slate-800">{student.name}</h2>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-600 font-mono">Roll #{student.rollNumber}</span>
              <span>•</span>
              <span>{student.class}</span>
            </div>
          </div>
        </div>

        {/* Quick overall numbers */}
        <div className="flex items-center gap-4 border-t border-slate-50 pt-3 sm:border-t-0 sm:pt-0">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
            <span className={`font-mono text-sm font-black ${
              attendancePercentage >= 85 ? 'text-emerald-600' : 'text-amber-500'
            }`}>{attendancePercentage.toFixed(0)}%</span>
          </div>
          <div className="border-l border-slate-100 h-8 pl-4 text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Grade Standing</span>
            <span className="font-mono text-sm font-black text-indigo-600">
              {calculateGrade(overallAveragePercentage)} ({overallAveragePercentage.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-1">
        {[
          { id: 'grades', label: 'Report Cards & Grades', icon: Award },
          { id: 'attendance', label: 'Real-time Attendance', icon: Calendar },
          { id: 'ai-coach', label: '✨ AI Academic Coach', icon: Sparkles }
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

      {/* Tab Screens */}

      {/* TAB A: REPORT CARD & GRADES */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Subject bars */}
            <SubjectBarChart data={subjectAverages} />

            {/* Growth history */}
            <PerformanceTrendLine data={examProgressData} />
          </div>

          {/* Printable Report Card view */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-6 print:border-0 print:p-0 print:shadow-none">
            
            {/* Print trigger heading bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="h-4 w-4" />
                Official Report Card Segment
              </span>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <Printer className="h-3.5 w-3.5" />
                Print / Export PDF
              </button>
            </div>

            {/* Official Report Card Blueprint Header */}
            <div className="text-center space-y-2">
              <h3 className="font-display text-xl font-bold text-slate-900 tracking-tight">ST. JUDE ACADEMIC CORE</h3>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">OFFICIAL TERM PROGRESS REPORT CARD</p>
              <p className="text-[10px] text-slate-400 font-semibold">Affiliated School Track Core - Session 2026-2027</p>
            </div>

            {/* Report Card Meta Grid */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50/50 p-4 border border-slate-100 text-xs font-semibold">
              <div className="space-y-1">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Student Name</div>
                <div className="text-slate-800 font-bold">{student.name}</div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Class Section</div>
                <div className="text-slate-800 font-bold">{student.class}</div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Roll Register</div>
                <div className="text-slate-800 font-bold font-mono">#{student.rollNumber}</div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Term Standings</div>
                <div className="text-indigo-600 font-bold">{calculateGrade(overallAveragePercentage)} ({overallAveragePercentage.toFixed(1)}%)</div>
              </div>
            </div>

            {/* Grading matrix table */}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-100 font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                  <th className="p-3 pl-4">Subject Core</th>
                  <th className="p-3">Exam Segment</th>
                  <th className="p-3">Obtained Marks</th>
                  <th className="p-3 pr-4 text-right">Segment Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {studentMarks.map((m) => {
                  const sub = subjects.find(s => s.id === m.subjectId);
                  const pct = (m.marksObtained / m.maxMarks) * 100;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="p-3 pl-4 font-bold text-slate-900">{sub ? sub.name : 'Subject'}</td>
                      <td className="p-3 text-slate-500">{m.examType}</td>
                      <td className="p-3 font-mono">{m.marksObtained} <span className="text-slate-400">/ {m.maxMarks}</span></td>
                      <td className="p-3 pr-4 text-right">
                        <span className="font-mono text-indigo-600 font-bold">{calculateGrade(pct)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Official stamps */}
            <div className="flex items-center justify-between pt-10 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="text-center">
                <div className="border-t border-slate-200 w-32 mx-auto pt-2">Class Teacher</div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-200 w-32 mx-auto pt-2">Principal Seal</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: REAL-TIME ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* KPI Progress Ring */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-center justify-center space-y-4">
              <h4 className="font-display font-bold text-slate-800 text-xs self-start">Cumulative Attendance</h4>
              <AttendanceProgressRing percentage={attendancePercentage} size={120} strokeWidth={8} />
              <div className="text-center space-y-1">
                <div className="text-xs font-bold text-slate-700">{presentCount} / {totalSchoolDays} Days Attended</div>
                <p className="text-[10px] text-slate-400 leading-normal font-medium">Standard school compliance requires a threshold of &ge;80% attendance.</p>
              </div>
            </div>

            {/* Logs List Grid */}
            <div className="col-span-2 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <h4 className="font-display font-bold text-slate-800 text-xs">Term Attendance History Logs</h4>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {studentAttendance.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-xs font-semibold">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No attendance vectors registered yet.
                  </div>
                ) : (
                  studentAttendance.slice().reverse().map((record) => {
                    let badge = 'bg-emerald-50 text-emerald-700';
                    if (record.status === 'Absent') badge = 'bg-rose-50 text-rose-700';
                    else if (record.status === 'Leave') badge = 'bg-amber-50 text-amber-700';

                    return (
                      <div key={record.id} className="flex items-center justify-between py-3 text-xs font-semibold">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-indigo-400" />
                          <span className="font-mono text-slate-700 font-semibold">{record.date}</span>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${badge}`}>{record.status}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB C: AI COACH CHATBOT */}
      {activeTab === 'ai-coach' && (
        <div className="rounded-3xl border border-slate-100 bg-white shadow-md flex flex-col h-[500px] overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-amber-300 fill-amber-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-xs">AI Academic Coach</h4>
                <p className="text-[10px] text-indigo-100 font-semibold tracking-wider uppercase">Adaptive Home Study Counselor</p>
              </div>
            </div>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-50">Online</span>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {chatHistory.map((msg, idx) => {
              const isAi = msg.sender === 'ai';
              return (
                <div key={idx} className={`flex gap-2.5 max-w-[85%] ${isAi ? 'self-start' : 'ml-auto flex-row-reverse'}`}>
                  {isAi ? (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-display font-black text-xs">AI</div>
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-display font-black text-xs">ME</div>
                  )}
                  <div className={`rounded-2xl p-3 text-xs leading-relaxed font-medium shadow-sm border ${
                    isAi 
                      ? 'bg-white border-slate-100 text-slate-700 rounded-tl-none' 
                      : 'bg-indigo-600 border-indigo-700 text-white rounded-tr-none'
                  }`}>
                    {msg.text}
                    <div className={`text-[9px] text-right mt-1.5 font-semibold ${isAi ? 'text-slate-400' : 'text-indigo-200'}`}>
                      {msg.time}
                    </div>
                  </div>
                </div>
              );
            })}

            {loadingChat && (
              <div className="flex gap-2.5 items-center text-slate-400 text-xs font-semibold animate-pulse">
                <div className="h-6 w-6 rounded-lg bg-slate-100 animate-spin border-2 border-slate-200 border-t-indigo-600" />
                <span>Coach is analysing grade vectors...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Coach Quick Question Prompts */}
          <div className="px-4 py-2 border-t border-slate-100 bg-white flex flex-wrap gap-2 shrink-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block self-center">Suggested Topics:</span>
            {[
              `How is ${student.name}'s performance?`,
              `Generate a study plan for ${student.name}.`,
              `Where can ${student.name} improve?`
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendQuickQuestion(q)}
                className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[10px] font-bold text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/20 transition-all cursor-pointer whitespace-nowrap"
              >
                <Lightbulb className="h-3 w-3 text-amber-500" />
                <span>{q}</span>
              </button>
            ))}
          </div>

          {/* Form Input bar */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={chatMessage}
              disabled={loadingChat}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Ask for home study plans, grade comments, or revision tip vectors..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              id="chat-submit-btn"
              disabled={loadingChat || !chatMessage.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
