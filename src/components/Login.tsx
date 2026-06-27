import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Mail, AlertTriangle, Cpu, Terminal, Eye, EyeOff } from 'lucide-react';
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
      setError('SECURITY AUDIT: Input parameters missing.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'ACCESS DENIED: Passcode challenge failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02040a] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden cyber-scanlines">
      {/* Background Matrix/Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* Animated Scan Line */}
      <div className="cyber-scan-overlay" />

      {/* Futuristic glow lights */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#0074d9]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#00f0ff]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center gap-2 mb-2">
          <div className="bg-[#050b14] border border-[#00f0ff]/40 p-3 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.25)] animate-pulse-cyber">
            <Cpu className="h-8 w-8 text-[#00f0ff]" />
          </div>
          <div className="text-center">
            <span className="text-3xl font-black tracking-widest text-white uppercase font-mono block">
              PLANT<span className="text-[#00f0ff] font-extrabold glow-text-cyan">2</span>TREE
            </span>
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#0074d9] block mt-1">
              Enterprise Recovery System
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#050b14]/85 backdrop-blur-md py-8 px-6 shadow-[0_0_30px_rgba(0,240,255,0.12)] border border-[#00f0ff]/15 rounded-xl sm:px-10 relative"
        >
          {/* Neon side corner brackets for futuristic panel look */}
          <div className="absolute -top-[1px] -left-[1px] w-6 h-6 border-t border-l border-[#00f0ff]/50" />
          <div className="absolute -top-[1px] -right-[1px] w-6 h-6 border-t border-r border-[#00f0ff]/50" />
          <div className="absolute -bottom-[1px] -left-[1px] w-6 h-6 border-b border-l border-[#00f0ff]/50" />
          <div className="absolute -bottom-[1px] -right-[1px] w-6 h-6 border-b border-r border-[#00f0ff]/50" />

          {/* Terminal Panel Header */}
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-[#00f0ff]/10">
            <Terminal className="h-4 w-4 text-[#00f0ff] animate-pulse" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
              Secured Auth Node [P2T-GATEWAY]
            </span>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-950/20 border border-red-600/30 rounded p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span className="text-xs text-red-300 font-mono">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                Operator Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#0074d9]">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs transition-all font-mono"
                  placeholder="Plant2tree Admin or admin@recovery.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                Access Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#0074d9]">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-black/60 border border-[#00f0ff]/15 focus:border-[#00f0ff] rounded text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-[#00f0ff] text-xs transition-all font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-[#00f0ff] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-[#00f0ff]/35 rounded shadow-[0_0_12px_rgba(0,240,255,0.1)] text-xs font-bold font-mono text-white bg-[#0074d9]/25 hover:bg-[#0074d9] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] focus:outline-none focus:ring-1 focus:ring-[#00f0ff] transition-all duration-300 disabled:opacity-40 cursor-pointer uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3 w-3 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    Authenticating Node...
                  </>
                ) : (
                  'Authorize Secure Access'
                )}
              </button>
            </div>
          </form>

          {/* Test Accounts Help Section */}
          <div className="mt-6 pt-6 border-t border-[#00f0ff]/10">
            <h4 className="text-[10px] font-bold text-[#00f0ff] uppercase tracking-widest mb-3 flex items-center gap-2 font-mono">
              <Shield className="h-3.5 w-3.5" />
              Secured Gateway Credentials
            </h4>
            <div className="bg-black/40 p-3 rounded border border-[#00f0ff]/10 font-mono text-[10px] text-slate-400 space-y-1">
              <div><span className="text-[#0074d9] font-bold">IDENTITY:</span> Plant2tree Admin</div>
              <div><span className="text-[#0074d9] font-bold">PASSCODE:</span> admin@786</div>
              <div className="text-[9px] text-slate-500 mt-2 italic leading-relaxed">
                Notice: Security telemetry tracks all access requests. This gateway is restricted to authorized Plant2Tree website recovery operators.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
