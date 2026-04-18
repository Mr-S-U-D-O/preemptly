import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ArrowRight, ShieldCheck, Globe, Users, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SEO } from './SEO';

type UserType = 'visitor' | 'team';
type AuthView = 'login' | 'forgot-password';

export function LoginScreen() {
  const { signIn, signInWithEmail, resetPassword } = useAuth();
  const [userType, setUserType] = useState<UserType>('visitor');
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Background image URL - can be changed easily
  const backgroundImageUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1400";

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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess('Recovery link sent! Check your inbox.');
      setError(null);
    } catch (err: any) {
      setError('Failed to send reset link. Please check the email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex font-sans antialiased text-slate-900 selection:bg-slate-200">
      <SEO title="Login | Preemptly" />
      <motion.div 
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`flex w-full min-h-screen p-4 md:p-6 gap-6 ${userType === 'team' ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Photographic Side */}
        <div 
          className="relative flex-1 hidden lg:flex sticky top-6 h-[calc(100vh-3rem)] overflow-hidden rounded-[2rem] border-2 border-slate-900"
        >
          <img 
            src={backgroundImageUrl} 
            alt="Workspace" 
            className="absolute inset-0 w-full h-full object-cover filter contrast-[1.05] brightness-[0.95]"
          />
          <div className="absolute inset-0 bg-black/5" /> {/* Very subtle overlay */}
          
          {/* Subtle info on the image */}
          <div className="absolute bottom-10 left-10 text-white z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden">
                <img src="/preemptly-mascot.png" alt="Preemptly" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold tracking-tight text-xl">Preemptly</span>
            </div>
            <p className="text-white/70 max-w-sm text-sm font-medium leading-relaxed">
              Global visibility for organic growth. Powered by proprietary expertise extraction.
            </p>
          </div>
        </div>

        {/* Form Side */}
        <motion.div 
          layout
          className="w-full lg:w-[500px] xl:w-[600px] flex flex-col px-6 sm:px-12 md:px-20 py-12"
        >
          <div className="max-w-md w-full mx-auto my-auto">
            {/* Logo for mobile */}
            <div className="flex lg:hidden items-center gap-2 mb-12">
              <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100">
                <img src="/preemptly-mascot.png" alt="Preemptly" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-xl tracking-tight">Preemptly</span>
            </div>

            {/* Experience Toggler */}
            <div className="mb-12">
              <div className="flex p-1 bg-slate-100 rounded-full border border-slate-200">
                <button 
                  onClick={() => setUserType('visitor')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${userType === 'visitor' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Globe size={14} /> Visitor/Investor
                </button>
                <button 
                  onClick={() => setUserType('team')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-bold transition-all ${userType === 'team' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Users size={14} /> Team
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {view === 'login' ? (
                <motion.div
                  key="login-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                      {userType === 'team' ? 'Team Access' : 'Growth Visibility'}
                    </h1>
                    <p className="text-slate-500 font-medium">
                      {userType === 'team' ? 'Enter credentials to access the hub.' : 'Access your private organic growth portal.'}
                    </p>
                  </div>

                  <form onSubmit={handleEmailLogin} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-14 pl-12 border-2 border-slate-100 rounded-2xl focus:border-slate-900 focus:ring-0 transition-all bg-slate-50/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</Label>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-14 pl-12 border-2 border-slate-100 rounded-2xl focus:border-slate-900 focus:ring-0 transition-all bg-slate-50/50"
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold text-center">
                        {error}
                      </div>
                    )}

                    <div className="space-y-4">
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group shadow-xl shadow-slate-200"
                      >
                        {loading ? 'Verifying...' : (
                          <>Log In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                        )}
                      </Button>

                      <div className="flex flex-col items-center gap-3">
                        <button 
                          type="button" 
                          onClick={() => setView('forgot-password')}
                          className="text-xs font-bold text-slate-400 hover:text-slate-900 underline decoration-slate-200 underline-offset-4 transition-all"
                        >
                          Forgot Password?
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
                            const port = window.location.port ? `:${window.location.port}` : '';
                            window.location.href = isLocal ? `http://localhost${port}` : 'https://bepreemptly.com';
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-slate-900 underline decoration-slate-200 underline-offset-4 transition-all"
                        >
                          Don't have an account? Sign Up
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center md:hidden xl:flex"><div className="w-full border-t border-slate-100"></div></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-slate-300"><span className="bg-white px-4">Or alternative access</span></div>
                  </div>

                  <Button 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                    variant="outline"
                    className="w-full h-14 bg-white border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-200 text-slate-900 font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm"
                  >
                    <Globe size={20} className="text-[#4285F4]" />
                    Authorized Google Login
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="forgot-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recovery</h1>
                    <p className="text-slate-500 font-medium">Enter your email for a secure reset link.</p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pl-1">Registered Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="name@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-14 pl-12 border-2 border-slate-100 rounded-2xl focus:border-slate-900 focus:ring-0 transition-all bg-slate-50/50"
                        />
                      </div>
                    </div>

                    {success && (
                      <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 text-xs font-bold text-center">
                        {success}
                      </div>
                    )}

                    <div className="space-y-4">
                      <Button type="submit" className="w-full h-14 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all">
                        Send Reset Link
                      </Button>
                      <button 
                        onClick={() => { setView('login'); setSuccess(null); }}
                        className="w-full text-xs font-bold text-slate-400 hover:text-slate-900 underline decoration-slate-200 underline-offset-4 transition-all"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-16 flex items-center justify-center gap-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Secure Portal</span>
              <span className="w-1 h-1 bg-slate-200 rounded-full" />
              <span>v2.9.0</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
