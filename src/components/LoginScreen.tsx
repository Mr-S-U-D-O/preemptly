import { Button } from '@/components/ui/button';
import { Target, Radar, Sparkles } from 'lucide-react';

export function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-950">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex w-1/2 bg-slate-950 relative overflow-hidden flex-col justify-between p-12 border-r border-slate-800">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#5a8c12] to-transparent opacity-50"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#5a8c12] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#84b53b] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5a8c12] to-[#304513] flex items-center justify-center shadow-lg shadow-[#5a8c12]/20">
            <Target className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">IntentFirst<span className="text-[#84b53b]">Hunter</span></span>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-lg mt-20">
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Find high-intent leads on autopilot.
          </h1>
          <p className="text-lg text-slate-400 mb-12 leading-relaxed">
            Stop scrolling. Start closing. We monitor Reddit 24/7, use Google's Gemini AI to score intent, and deliver warm leads directly to your dashboard.
          </p>

          {/* Feature Cards */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform hover:-translate-y-1">
              <div className="p-2 rounded-lg bg-[#5a8c12]/20 text-[#84b53b]">
                <Radar size={20} />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Real-time Monitoring</h3>
                <p className="text-sm text-slate-400">Track specific subreddits and keywords around the clock.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-transform hover:-translate-y-1">
              <div className="p-2 rounded-lg bg-[#5a8c12]/20 text-[#84b53b]">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">AI Lead Scoring</h3>
                <p className="text-sm text-slate-400">Gemini AI analyzes post context to filter out noise and highlight true intent.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-slate-500">
          © {new Date().getFullYear()} IntentFirstHunter. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 relative dark:bg-slate-950">
        <div className="max-w-md w-full space-y-8 relative z-10">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5a8c12] to-[#304513] flex items-center justify-center shadow-lg shadow-[#5a8c12]/20">
                <Target className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">IntentFirst<span className="text-[#5a8c12]">Hunter</span></span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Welcome back</h2>
            <p className="text-slate-500 dark:text-slate-400">Sign in to your account to view your latest leads.</p>
          </div>

          <div className="mt-10">
            <Button 
              onClick={onSignIn} 
              className="w-full h-12 text-base font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm flex items-center justify-center gap-3 rounded-xl"
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
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              By signing in, you agree to our{' '}
              <a href="#" className="font-medium text-[#5a8c12] hover:text-[#446715] dark:hover:text-[#84b53b] transition-colors">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="font-medium text-[#5a8c12] hover:text-[#446715] dark:hover:text-[#84b53b] transition-colors">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
