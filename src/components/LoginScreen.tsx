import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, Radar, Sparkles, AlertCircle, ArrowLeft, Mail, Lock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type LoginView = 'investor' | 'team' | 'forgot-password';

export function LoginScreen() {
  const { signIn, signInWithEmail, resetPassword } = useAuth();
  const [view, setView] = useState<LoginView>('investor');
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
      setError(err.message || 'Failed to sign in. Please check your credentials.');
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
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await resetPassword(email);
      setSuccess('Password reset email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950 font-sans text-slate-200 antialiased overflow-hidden">
      {/* Background Texture/Noise */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
      
      {/* Left Panel - Hero Info (Hidden on mobile) */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-16 border-r border-slate-900 bg-slate-950/50 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#5a8c12] flex items-center justify-center shadow-lg shadow-[#5a8c12]/10 border border-[#84b53b]/20">
            <Target className="text-white w-7 h-7" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">IntentFirst<span className="text-[#84b53b]">Hunter</span></span>
        </div>

        <div className="max-w-md">
          <h1 className="text-5xl font-bold text-white leading-tight mb-8 tracking-tight">
            The Hub for <span className="text-[#84b53b]">High-Intent</span> Growth.
          </h1>
          
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[#84b53b]">
                <Radar size={22} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Precision Monitoring</h3>
                <p className="text-slate-400 leading-relaxed">Continuous surveillance across targeted platforms to identify buyers in their moment of need.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[#84b53b]">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">AI-Powered Qualification</h3>
                <p className="text-slate-400 leading-relaxed">Deep context analysis ensures every lead in your dashboard is vetted for genuine commercial intent.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="mt-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[#84b53b]">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">Secure Investor Portal</h3>
                <p className="text-slate-400 leading-relaxed">Real-time access to performance metrics and lead generation velocity for authorized partners.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-slate-500 border-t border-slate-900 pt-8">
          <span>v2.4.0 Secure</span>
          <span>•</span>
          <span>© {new Date().getFullYear()} LaunchPad Studio</span>
        </div>
      </div>

      {/* Right Panel - Auth Logic */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-20">
        <div className="w-full max-w-[420px]">
          {/* Logo for mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-[#5a8c12] flex items-center justify-center shadow-lg shadow-[#5a8c12]/20">
              <Target className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">IntentFirst<span className="text-[#5a8c12]">Hunter</span></span>
          </div>

          <AnimatePresence mode="wait">
            {view === 'forgot-password' ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-6"
              >
                <div>
                  <button 
                    onClick={() => setView('investor')}
                    className="flex items-center gap-2 text-sm text-[#84b53b] hover:text-[#5a8c12] transition-colors mb-6 group"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to login
                  </button>
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Reset Password</h2>
                  <p className="text-slate-400">Enter your email and we'll send you a recovery link.</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-medium text-slate-300">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="investors@intentfirsthunter.co.za"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-slate-900/50 border-slate-800 text-white pl-10 h-11 focus:ring-1 focus:ring-[#5a8c12] focus:border-[#5a8c12]"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                      <ShieldCheck size={16} />
                      {success}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-11 bg-[#5a8c12] hover:bg-[#446715] text-white font-medium rounded-xl transition-all shadow-lg shadow-[#5a8c12]/10"
                  >
                    {loading ? 'Sending...' : 'Send Recovery Link'}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center lg:text-left">
                  <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Access Gateway</h2>
                  <p className="text-slate-400">Please authenticate to continue to the platform.</p>
                </div>

                {/* Custom Tab Switcher */}
                <div className="relative flex p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <motion.div 
                    layoutId="tab-bg"
                    className="absolute inset-y-1 bg-slate-800 border border-slate-700 rounded-xl shadow-sm pointer-events-none"
                    style={{ 
                      width: 'calc(50% - 4px)',
                      left: view === 'investor' ? '4px' : 'calc(50% + 1px)'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                  <button 
                    onClick={() => setView('investor')}
                    className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors ${view === 'investor' ? 'text-white' : 'text-slate-500'}`}
                  >
                    Partner Login
                  </button>
                  <button 
                    onClick={() => setView('team')}
                    className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors ${view === 'team' ? 'text-white' : 'text-slate-500'}`}
                  >
                    Team Dashboard
                  </button>
                </div>

                <div className="min-h-[280px]">
                  <AnimatePresence mode="wait">
                    {view === 'investor' ? (
                      <motion.form
                        key="investor-form"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        onSubmit={handleEmailLogin}
                        className="space-y-5"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Authorized Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="investors@intentfirsthunter.co.za"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              className="bg-slate-900/40 border-slate-800 text-white pl-11 h-12 rounded-xl focus:ring-1 focus:ring-[#5a8c12] focus:border-[#5a8c12] transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="pass" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Security Key</Label>
                            <button 
                              type="button"
                              onClick={() => setView('forgot-password')}
                              className="text-xs font-medium text-[#84b53b] hover:text-[#5a8c12] transition-colors"
                            >
                              Forgot Key?
                            </button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                            <Input
                              id="pass"
                              type="password"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              className="bg-slate-900/40 border-slate-800 text-white pl-11 h-12 rounded-xl focus:ring-1 focus:ring-[#5a8c12] focus:border-[#5a8c12] transition-all"
                            />
                          </div>
                        </div>

                        {error && (
                          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            <AlertCircle size={16} />
                            {error}
                          </div>
                        )}

                        <Button 
                          type="submit" 
                          disabled={loading}
                          className="w-full h-12 bg-[#5a8c12] hover:bg-[#446715] text-white font-semibold rounded-xl transition-all shadow-xl shadow-[#5a8c12]/10 mt-2"
                        >
                          {loading ? 'Authenticating...' : 'Secure Authorization'}
                        </Button>
                      </motion.form>
                    ) : (
                      <motion.div
                        key="team-form"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6 flex flex-col items-center justify-center py-4"
                      >
                        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-2">
                          <ShieldCheck className="text-[#84b53b] w-8 h-8" />
                        </div>
                        <div className="text-center space-y-2 mb-2">
                          <h3 className="text-white font-semibold">SSO Authentication</h3>
                          <p className="text-sm text-slate-500 max-w-[280px]">Internal staff members must use their company Google Workspace account.</p>
                        </div>

                        <Button 
                          onClick={handleGoogleLogin} 
                          disabled={loading}
                          className="w-full h-12 bg-white text-slate-950 hover:bg-slate-100 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-3"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Continue with Google
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-8 border-t border-slate-900 text-center">
                  <p className="text-xs text-slate-600 uppercase tracking-widest font-medium">
                    Corporate Asset — Restricted Access
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
