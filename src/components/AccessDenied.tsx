import React from 'react';
import { LogOut, Mail, Phone, ShieldAlert, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Home } from './Home';

interface AccessDeniedProps {
  onSignOut: () => void;
  userEmail: string | null;
}

export function AccessDenied({ onSignOut, userEmail }: AccessDeniedProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Blurred Background - The real dashboard, but inaccessible and blurred */}
      <div className="absolute inset-0 pointer-events-none select-none blur-xl opacity-40 scale-105 origin-center">
        <Home />
      </div>

      {/* Dark Overlay to make the content pop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />

      {/* Access Denied Content */}
      <div className="relative z-50 flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 overflow-hidden relative">
          
          {/* Decorative Gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
          
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400 animate-bounce">
              <ShieldAlert size={40} />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Access Restricted
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                The account <span className="text-slate-900 dark:text-slate-200 font-bold underline decoration-red-500/30">{userEmail}</span> is not authorized to access this intelligence dashboard.
              </p>
            </div>

            <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />

            {/* Owner Contact Card */}
            <div className="w-full text-left space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Contact Administrator for Access
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:border-[#5a8c12]/30">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm text-[#5a8c12]">
                    <Target size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Owner</p>
                    <p className="text-slate-900 dark:text-white font-black">Mosa Moleleki</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <a 
                    href="tel:0738349023"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#5a8c12] group transition-all"
                  >
                    <Phone size={16} className="text-[#5a8c12]" />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">073 834 9023</span>
                  </a>
                  <a 
                    href="mailto:molelekishoez@gmail.com"
                    className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#5a8c12] group transition-all"
                  >
                    <Mail size={16} className="text-[#5a8c12]" />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white">Email Owner</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="w-full pt-4 space-y-3">
              <Button 
                onClick={onSignOut}
                variant="outline"
                className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-bold border-2"
              >
                <LogOut size={18} />
                Sign Out & Try Different Account
              </Button>
              <p className="text-[10px] text-slate-400 font-medium">
                Preemptly Internal Tool v2.1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
