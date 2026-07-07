import React, { useState } from 'react';
import { X, Calendar, BookOpen, Star, Sparkles, Send, Copy, Check, ShieldAlert, GraduationCap, ArrowUpRight } from 'lucide-react';
import { Student, Subject, Mark, AttendanceRecord } from '../types';
import { AttendanceProgressRing, PerformanceTrendLine, SubjectBarChart, calculateGrade } from './AnalyticsCharts';

interface StudentDetailsModalProps {
  student: Student;
  allSubjects: Subject[];
  allMarks: Mark[];
  allAttendance: AttendanceRecord[];
  onClose: () => void;
  onSaveRemarks?: (studentId: string, remarks: string) => void;
  savedRemarks?: string;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function StudentDetailsModal({
  student,
  allSubjects,
  allMarks,
  allAttendance,
  onClose,
  onSaveRemarks,
  savedRemarks = '',
  showToast
}: StudentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'attendance' | 'ai-insights'>('overview');
  
  // AI analysis state
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiReport, setAiReport] = useState<{
    summary: string;
    strengths: string[];
    needsImprovement: string[];
    actionPlan: string[];
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [draftRemarks, setDraftRemarks] = useState(savedRemarks);

  // Filter student-specific records
  const studentMarks = allMarks.filter(m => m.studentId === student.id);
  const studentAttendance = allAttendance.filter(a => a.studentId === student.id);

  // 1. Compute Attendance Stats
  const totalSchoolDays = studentAttendance.length;
  const presentCount = studentAttendance.filter(a => a.status === 'Present').length;
  const absentCount = studentAttendance.filter(a => a.status === 'Absent').length;
  const leaveCount = studentAttendance.filter(a => a.status === 'Leave').length;
  const attendancePercentage = totalSchoolDays > 0 ? (presentCount / totalSchoolDays) * 100 : 100;

  // 2. Compute Subject-Wise performance
  const subjectAverages = allSubjects.map(sub => {
    const subMarks = studentMarks.filter(m => m.subjectId === sub.id);
    const averagePct = subMarks.length > 0 
      ? subMarks.reduce((acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100, 0) / subMarks.length
      : 0;
    return { name: sub.name, score: averagePct };
  });

  // Overall average across all exams
  const overallAveragePercentage = studentMarks.length > 0
    ? studentMarks.reduce((acc, curr) => acc + (curr.marksObtained / curr.maxMarks) * 100, 0) / studentMarks.length
    : 0;

  // 3. Compute Exam Progress
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

  // Trigger server-side Gemini API analysis
  const handleGenerateAiInsights = async () => {
    setLoadingAi(true);
    setAiError(null);
    setAiReport(null);

    const stats = {
      totalDays: totalSchoolDays,
      present: presentCount,
      absent: absentCount,
      leave: leaveCount,
      percentage: Math.round(attendancePercentage)
    };

    try {
      const response = await fetch('/api/analyze-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student,
          marks: studentMarks,
          attendanceStats: stats,
          subjects: allSubjects
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.details || 'Server error generating remarks.');
      }

      const data = await response.json();
      setAiReport(data);
      // Automatically load summary into draft remarks
      if (data.summary) {
        setDraftRemarks(prev => prev ? prev + '\n\n' + data.summary : data.summary);
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed to generate comments. Please verify process.env.GEMINI_API_KEY.');
    } finally {
      setLoadingAi(false);
    }
  };

  const copyToClipboard = () => {
    if (!aiReport) return;
    const bulletStrengths = aiReport.strengths.map(s => `• ${s}`).join('\n');
    const bulletNeeds = aiReport.needsImprovement.map(n => `• ${n}`).join('\n');
    const bulletActions = aiReport.actionPlan.map(a => `• ${a}`).join('\n');

    const formatted = `SCHOOLTRACK PRO - STUDENT INSIGHTS REPORT\n` +
      `Student: ${student.name}\n` +
      `Class: ${student.class}\n\n` +
      `SUMMARY COMMENTS:\n${aiReport.summary}\n\n` +
      `KEY STRENGTHS:\n${bulletStrengths}\n\n` +
      `AREAS OF FOCUS:\n${bulletNeeds}\n\n` +
      `STUDY ACTION PLAN FOR HOME:\n${bulletActions}`;

    navigator.clipboard.writeText(formatted);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const saveRemarksToDb = () => {
    if (onSaveRemarks) {
      onSaveRemarks(student.id, draftRemarks);
      if (showToast) {
        showToast('Report card remarks saved successfully!', 'success');
      } else {
        alert('Remarks saved successfully!');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative flex h-full max-h-[85vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-4">
            <img
              src={student.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
              alt={student.name}
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-indigo-100 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-800">{student.name}</h2>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-600 font-mono">Roll #{student.rollNumber}</span>
                <span>•</span>
                <span>{student.class}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BookOpen },
            { id: 'academics', label: 'Performance Analytics', icon: Star },
            { id: 'attendance', label: 'Attendance Log', icon: Calendar },
            { id: 'ai-insights', label: '✨ AI Smart Remarks', icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Content Space */}
        <div className="flex-1 overflow-y-auto p-6 font-sans text-slate-600">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Profile Card & Info */}
              <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                <h3 className="font-display font-bold text-slate-800 text-sm">Personal Profile</h3>
                <div className="space-y-3 text-xs font-semibold text-slate-600">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Parent / Guardian Name</label>
                    <span className="text-slate-800 font-medium">{student.parentName}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Parent Contact Email</label>
                    <span className="text-slate-800 font-medium font-mono">{student.parentEmail}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Emergency Contact Phone</label>
                    <span className="text-slate-800 font-medium font-mono">{student.parentPhone}</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Gender Profile</label>
                    <span className="text-slate-800 font-medium">{student.gender}</span>
                  </div>
                </div>
              </div>

              {/* Primary KPIs (Attendance & GPA) */}
              <div className="flex flex-col justify-between items-center rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="font-display font-bold text-slate-800 text-sm self-start">Current Attendance</h3>
                <AttendanceProgressRing percentage={attendancePercentage} size={110} strokeWidth={8} />
                <div className="mt-2 text-center text-xs font-bold text-slate-500">
                  {presentCount} / {totalSchoolDays} Days Present
                </div>
              </div>

              {/* Academic Overall Status */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <h3 className="font-display font-bold text-slate-800 text-sm">Academic Standings</h3>
                <div className="my-auto text-center">
                  <div className="font-display text-4xl font-extrabold text-indigo-600">
                    {calculateGrade(overallAveragePercentage)}
                  </div>
                  <div className="mt-1 font-mono text-xs font-bold text-slate-500">
                    Average Score: {overallAveragePercentage.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 text-center text-[11px] font-semibold text-slate-500">
                  Evaluated from {studentMarks.length} subject tests
                </div>
              </div>

              {/* Remarks Field */}
              <div className="col-span-full space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-slate-800 text-sm">Official Remarks / Teacher Notes</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Saved locally in SchoolTrack Core</span>
                </div>
                <textarea
                  value={draftRemarks}
                  onChange={(e) => setDraftRemarks(e.target.value)}
                  placeholder="Record classroom behavior, disciplinary actions, performance improvements, or parent discussions here..."
                  className="h-28 w-full rounded-2xl border border-slate-200 p-4 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                />
                <button
                  onClick={saveRemarksToDb}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  Save Remarks
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PERFORMANCE ANALYTICS */}
          {activeTab === 'academics' && (
            <div className="space-y-6">
              {studentMarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <ShieldAlert className="h-10 w-10 mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">No marks recorded for this student yet.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Subject bars */}
                  <SubjectBarChart data={subjectAverages} />
                  
                  {/* Exam trend lines */}
                  <PerformanceTrendLine data={examProgressData} />

                  {/* Complete Grades Grid Sheet */}
                  <div className="col-span-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                      <h4 className="font-display font-bold text-xs text-slate-800">Grade Matrix Details</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                            <th className="p-4 pl-6">Subject</th>
                            <th className="p-4">Exam Segment</th>
                            <th className="p-4">Marks Obtained</th>
                            <th className="p-4">Percentage</th>
                            <th className="p-4 pr-6">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {studentMarks.map((mark) => {
                            const sub = allSubjects.find(s => s.id === mark.subjectId);
                            const pct = (mark.marksObtained / mark.maxMarks) * 100;
                            return (
                              <tr key={mark.id} className="hover:bg-slate-50/50">
                                <td className="p-4 pl-6 font-semibold text-slate-900">{sub ? sub.name : 'Unknown'}</td>
                                <td className="p-4 text-slate-500">{mark.examType}</td>
                                <td className="p-4 font-mono">{mark.marksObtained} <span className="text-slate-400">/ {mark.maxMarks}</span></td>
                                <td className="p-4 font-mono font-semibold text-indigo-600">{pct.toFixed(0)}%</td>
                                <td className="p-4 pr-6">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ATTENDANCE LOG */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              {studentAttendance.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <ShieldAlert className="h-10 w-10 mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">No attendance logged for this student yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Attendance Stats Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100/50 p-4 text-center">
                      <div className="font-display text-2xl font-black text-indigo-600">{totalSchoolDays}</div>
                      <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Total Days</div>
                    </div>
                    <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100/50 p-4 text-center">
                      <div className="font-display text-2xl font-black text-emerald-600">{presentCount}</div>
                      <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Present</div>
                    </div>
                    <div className="rounded-2xl bg-amber-50/50 border border-amber-100/50 p-4 text-center">
                      <div className="font-display text-2xl font-black text-amber-600">{leaveCount}</div>
                      <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">On Leave</div>
                    </div>
                    <div className="rounded-2xl bg-rose-50/50 border border-rose-100/50 p-4 text-center">
                      <div className="font-display text-2xl font-black text-rose-600">{absentCount}</div>
                      <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Absent</div>
                    </div>
                  </div>

                  {/* Attendance log calendar list */}
                  <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                      <h4 className="font-display font-bold text-xs text-slate-800">Historical Attendance Timeline</h4>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                      {studentAttendance.slice().reverse().map((record) => {
                        let badgeColor = 'bg-emerald-50 text-emerald-700';
                        if (record.status === 'Absent') badgeColor = 'bg-rose-50 text-rose-700';
                        else if (record.status === 'Leave') badgeColor = 'bg-amber-50 text-amber-700';

                        return (
                          <div key={record.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50/50 text-xs font-semibold">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-700 font-medium font-mono">{record.date}</span>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                              {record.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI REMARKS */}
          {activeTab === 'ai-insights' && (
            <div className="space-y-6">
              {/* Feature banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-md">
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-indigo-100 backdrop-blur-md">
                      <Sparkles className="h-4 w-4 text-amber-300 fill-amber-300" />
                    </div>
                    <h3 className="font-display font-bold text-sm">AI Performance Counsel & Comment Drafting</h3>
                  </div>
                  <p className="max-w-lg text-[11px] font-medium leading-relaxed text-indigo-100">
                    Compile attendance patterns and subject exam percentages, then prompt the Gemini model to write custom constructive feedback ready for report cards.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 top-0 hidden w-1/3 opacity-15 md:block">
                  <GraduationCap className="h-full w-full transform translate-x-10 translate-y-5" />
                </div>
              </div>

              {/* Analysis Trigger Panel */}
              <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 p-4 bg-slate-50/50">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">Generate New Insights</h4>
                  <p className="text-[10px] font-semibold text-slate-400">Requires a valid Gemini API key in the secrets panel.</p>
                </div>
                <button
                  onClick={handleGenerateAiInsights}
                  disabled={loadingAi}
                  className={`flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:from-indigo-700 hover:to-violet-700 transition-all ${
                    loadingAi ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  {loadingAi ? 'Drafting Report...' : 'Draft Comments'}
                </button>
              </div>

              {/* Loading AI feedback comments */}
              {loadingAi && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative mb-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                    <Sparkles className="absolute left-3 top-3 h-4 w-4 text-indigo-500 animate-pulse" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 animate-pulse">Consulting SchoolTrack Pro Counselor...</h4>
                  <p className="mt-1 max-w-xs text-[10px] text-slate-400 leading-normal">
                    Parsing subject grade vectors, analyzing attendance, and generating constructive study plans.
                  </p>
                </div>
              )}

              {/* AI Error */}
              {aiError && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <h4 className="text-xs font-bold">Analysis Generation Suspended</h4>
                      <p className="mt-1 text-[10px] leading-relaxed font-semibold text-red-600">{aiError}</p>
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/50 p-2 text-[10px] font-medium text-slate-500 border border-red-100">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>Ensure the <strong>GEMINI_API_KEY</strong> environment variable is defined in the Secrets Panel.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Generated AI Report */}
              {aiReport && (
                <div className="space-y-6">
                  {/* Action Bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 fill-indigo-100" />
                      Gemini Draft Complete
                    </span>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      {copiedText ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Report</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Summary card */}
                  <div className="rounded-2xl bg-indigo-50/30 border border-indigo-100/50 p-5 space-y-2">
                    <h4 className="text-xs font-extrabold text-indigo-900 font-display">Executive Summary Comment</h4>
                    <p className="text-xs leading-relaxed font-semibold text-indigo-950 font-sans">{aiReport.summary}</p>
                  </div>

                  {/* Strengths and needs lists */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-800">✨ Strengths & Achievements</h4>
                      <ul className="space-y-1.5 text-[11px] font-semibold text-slate-600">
                        {aiReport.strengths.map((str, idx) => (
                          <li key={idx} className="flex gap-2 items-start">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span className="leading-normal">{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-800">🎯 Areas for Improvement</h4>
                      <ul className="space-y-1.5 text-[11px] font-semibold text-slate-600">
                        {aiReport.needsImprovement.map((need, idx) => (
                          <li key={idx} className="flex gap-2 items-start">
                            <span className="text-rose-500 font-bold">•</span>
                            <span className="leading-normal">{need}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Plan */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-800">🏠 Academic Action Plan (At Home Tips)</h4>
                    <ul className="space-y-1.5 text-[11px] font-semibold text-slate-600">
                      {aiReport.actionPlan.map((act, idx) => (
                        <li key={idx} className="flex gap-2 items-start">
                          <span className="text-indigo-500 font-bold font-mono">{idx + 1}.</span>
                          <span className="leading-normal">{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Append action */}
                  <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-4 text-[11px] font-semibold text-amber-800">
                    <p>
                      <strong>Note:</strong> Generating AI insights has appended the summary comment to your <strong>Official Remarks</strong> draft under the <strong>Overview</strong> tab. Remember to click "Save Remarks" to store them in your local classroom archives.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
