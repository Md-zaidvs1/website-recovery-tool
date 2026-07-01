import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Key, Eye, EyeOff, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Access Denied: Invalid credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-[400px]">
        {/* Card Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-8 space-y-6"
        >
          {/* Logo Title */}
          <div className="text-center space-y-2">
            <h1 className="text-[20px] font-bold text-[#111827] tracking-tight">
              Website Recovery Tool
            </h1>
            <p className="text-[12px] text-[#6B7280]">
              Sign in to manage extraction operations
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-md p-3 flex items-start gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-[#DC2626] shrink-0 mt-0.5" />
                <span className="text-[12px] text-[#991B1B]">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">
                Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-white border border-[#D1D5DB] rounded-md text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[14px] transition-colors"
                  placeholder="admin@recovery.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[12px] font-semibold text-[#6B7280] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2 bg-white border border-[#D1D5DB] rounded-md text-[#374151] placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] text-[14px] transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9CA3AF] hover:text-[#374151] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 flex justify-center items-center gap-2 text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-md text-[13px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Helper Credentials Info */}
          <div className="pt-4 border-t border-[#E5E7EB]">
            <h4 className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
              Authorized Credentials
            </h4>
            <div className="bg-[#F9FAFB] p-3 rounded-md border border-[#E5E7EB] text-[11px] text-[#6B7280] space-y-1.5">
              <div>
                <span className="font-semibold text-[#374151]">Username:</span> Plant2tree Admin
              </div>
              <div>
                <span className="font-semibold text-[#374151]">Password:</span> admin@786
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
