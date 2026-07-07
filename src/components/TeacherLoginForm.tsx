import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, User, GraduationCap } from 'lucide-react';

interface TeacherLoginFormProps {
  onLoginSuccess: () => void;
  onBackToParentPortal: () => void;
}

export default function TeacherLoginForm({ onLoginSuccess, onBackToParentPortal }: TeacherLoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Short artificial delay for realistic feeling
    setTimeout(() => {
      if (username.trim() === 'admin' && password === 'admin@123') {
        onLoginSuccess();
      } else {
        setError('Invalid username or password. Please try again.');
        setIsSubmitting(false);
      }
    }, 450);
  };

  return (
    <div id="teacher-login-container" className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div id="teacher-login-card" className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100/50">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Teacher & Admin Portal
            </h2>
            <p className="text-xs text-slate-400 font-medium font-sans">
              Sign in with your administrative credentials
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div id="login-error" className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs font-bold text-red-600 animate-shake">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Field */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <User className="h-4 w-4" />
              </span>
              <input
                id="login-username-input"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Password</label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="button"
                id="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              id="login-submit-btn"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 focus:outline-none disabled:bg-indigo-400 disabled:shadow-none transition-all"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            <button
              type="button"
              id="login-back-btn"
              onClick={onBackToParentPortal}
              className="w-full flex justify-center items-center rounded-xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-all"
            >
              Go to Student / Parent Portal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
