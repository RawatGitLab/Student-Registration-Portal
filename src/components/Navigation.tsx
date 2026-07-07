import React from 'react';
import { GraduationCap, ShieldCheck, UserCircle, Users, RotateCcw, Database, LogOut } from 'lucide-react';
import { UserRole } from '../types';

interface NavigationProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  onResetData: () => void;
  selectedStudentName?: string;
  onLogoutStudent?: () => void;
  isTeacherAuthenticated?: boolean;
  onLogoutTeacher?: () => void;
}

export default function Navigation({
  currentRole,
  onChangeRole,
  onResetData,
  selectedStudentName,
  onLogoutStudent,
  isTeacherAuthenticated,
  onLogoutTeacher
}: NavigationProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
              SchoolTrack <span className="text-indigo-600">Pro</span>
            </h1>
            <p className="text-[10px] font-medium tracking-wider uppercase text-slate-400 font-sans">
              Digital Academic Core
            </p>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="flex items-center gap-4">
          {/* Active Role Identifier */}
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
            <span>Mode: <span className="text-indigo-600">{currentRole}</span></span>
            {selectedStudentName && (
              <span className="ml-1 border-l border-slate-300 pl-1.5 text-slate-500">
                ({selectedStudentName})
              </span>
            )}
          </div>

          {/* Quick Role Switcher Buttons */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => onChangeRole('Teacher')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                currentRole === 'Teacher' || currentRole === 'Admin'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Teacher / Admin</span>
            </button>
            <button
              onClick={() => onChangeRole('Parent')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                currentRole === 'Parent' || currentRole === 'Student'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Student / Parent Portal</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Reset data */}
            <button
              onClick={onResetData}
              title="Reset Database to Seed State"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-red-500"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Logout from student account (only if selected) */}
            {selectedStudentName && (onLogoutStudent) && (
              <button
                onClick={onLogoutStudent}
                title="Exit Parent Portal Session"
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Exit Portal</span>
              </button>
            )}

            {/* Logout from teacher account (only if authenticated) */}
            {(currentRole === 'Teacher' || currentRole === 'Admin') && isTeacherAuthenticated && onLogoutTeacher && (
              <button
                onClick={onLogoutTeacher}
                title="Log Out Teacher Session"
                className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100/50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Log Out</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
