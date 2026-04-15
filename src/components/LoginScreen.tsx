import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, ShieldCheck, Mail, Lock, ArrowRight, Chrome, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RadarBackground } from './RadarBackground';

type LoginView = 'client' | 'provider' | 'forgot-password';

export function LoginScreen() {
  const { signIn, signInWithEmail, resetPassword } = useAuth();
  const [view, setView] = useState<LoginView>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      let friendlyMessage = 'Authentication failed. Please try again.';
      if (err.code === 'auth/invalid-credential') friendlyMessage = 'Invalid email or password.';
      else if (err.code === 'auth/too-many-requests') friendlyMessage = 'Too many attempts. Locked temporarily.';
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      setError('Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] font-sans antialiased overflow-hidden selection:bg-[#5a8c12]/30">
      <RadarBackground />
      
      <div className="relative z-10 w-full max-w-[440px] px-6">
        {/* Logo Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-10"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#5a8c12] flex items-center justify-center shadow-[0_0_30px_rgba(90,140,18,0.3)] border border-[#5a8c12]/40 mb-4">
            <Target className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            IntentFirst<span className="text-[#5a8c12]">Hunter</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-[0.2em] font-medium">Growth Intelligence</p>
        </motion.div>

        {/* Main Auth Card */}
        <motion.div
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           className="relative overflow-hidden group"
        >
          {/* Subtle Glow Border */}
          <div className="absolute -inset-[1px] bg-gradient-to-r from-transparent via-[#5a8c12]/20 to-transparent rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl">
            <AnimatePresence mode="wait">
              {view === 'forgot-password' ? (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                   <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Recover Account</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">Enter your email and we'll send a recovery link.</p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); resetPassword(email); setSuccess('Link sent!'); }} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type="email"
                          placeholder="name@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-white/[0.03] border-white/10 text-white pl-12 h-13 rounded-2xl focus:ring-[#5a8c12] focus:border-[#5a8c12] transition-all placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                    {success && <p className="text-[#5a8c12] text-sm text-center font-medium">{success}</p>}
                    <Button type="submit" className="w-full h-13 bg-[#5a8c12] hover:bg-[#446715] text-white font-bold rounded-2xl shadow-lg shadow-[#5a8c12]/20">
                      Send Link
                    </Button>
                    <button onClick={() => setView('client')} className="w-full text-slate-400 text-sm hover:text-white transition-colors">Return to login</button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">Sign in to your intelligence profile.</p>
                  </div>

                  {/* Minimalist Tab Switcher */}
                  <div className="flex p-1 bg-white/[0.03] border border-white/10 rounded-2xl h-12">
                     <button 
                       onClick={() => setView('client')}
                       className={`flex-1 rounded-xl text-sm font-bold transition-all ${view === 'client' ? 'bg-[#5a8c12] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       Client
                     </button>
                     <button 
                       onClick={() => setView('provider')}
                       className={`flex-1 rounded-xl text-sm font-bold transition-all ${view === 'provider' ? 'bg-[#5a8c12] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       Provider
                     </button>
                  </div>

                  <form onSubmit={handleEmailLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type="email"
                          placeholder="name@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="bg-white/[0.03] border-white/10 text-white pl-12 h-13 rounded-2xl focus:ring-[#5a8c12] focus:border-[#5a8c12] transition-all placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</Label>
                        <button type="button" onClick={() => setView('forgot-password')} className="text-[10px] font-bold text-[#5a8c12] uppercase tracking-wider hover:underline">Forgot?</button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="bg-white/[0.03] border-white/10 text-white pl-12 h-13 rounded-2xl focus:ring-[#5a8c12] focus:border-[#5a8c12] transition-all placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-medium text-center">
                        {error}
                      </div>
                    )}

                    <Button type="submit" disabled={loading} className="w-full h-13 bg-[#5a8c12] hover:bg-[#446715] text-white font-bold rounded-2xl shadow-xl shadow-[#5a8c12]/20 transition-all active:scale-[0.98] group">
                      {loading ? 'Authenticating...' : (
                        <span className="flex items-center gap-2">
                          Sign In <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                      )}
                    </Button>
                  </form>

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0f172a]/0 px-2 text-slate-500 font-bold tracking-widest">Or continue with</span></div>
                  </div>

                  <Button 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                    variant="outline"
                    className="w-full h-13 bg-white hover:bg-slate-50 text-slate-950 font-bold border-none rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <Chrome size={18} />
                    Google Account
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-[#5a8c12]" /> Secure Access</span>
            <span className="w-1 h-1 bg-slate-800 rounded-full" />
            <span>v2.8.5.1</span>
          </div>
          <p className="text-[9px] text-slate-700 uppercase tracking-[0.3em]">© {new Date().getFullYear()} IntentFirstHunter Global</p>
        </motion.div>
      </div>
    </div>
  );
}
