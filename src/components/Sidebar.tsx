import { Scraper } from '../types';
import * as Icons from 'lucide-react';
import { Activity, PauseCircle, Database, Home, Plus, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function Sidebar({ scrapers, onAddMonitor, className }: { scrapers: Scraper[], onAddMonitor: (initialData?: any) => void, className?: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const [openClients, setOpenClients] = useState<Record<string, boolean>>({});
  const [openPlatforms, setOpenPlatforms] = useState<Record<string, boolean>>({});
  const [newMatchesCounts, setNewMatchesCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'leads'),
      where('userId', '==', user.uid),
      where('status', '==', 'new')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const scraperId = data.scraperId;
        if (scraperId) {
          counts[scraperId] = (counts[scraperId] || 0) + 1;
        }
      });
      setNewMatchesCounts(counts);
    });

    return () => unsubscribe();
  }, []);

  const groupedScrapers = useMemo(() => {
    return scrapers.reduce((acc, scraper) => {
      const client = scraper.clientName || 'Unknown Client';
      const platform = scraper.platform || 'reddit';
      
      if (!acc[client]) acc[client] = {};
      if (!acc[client][platform]) acc[client][platform] = [];
      
      acc[client][platform].push(scraper);
      return acc;
    }, {} as Record<string, Record<string, Scraper[]>>);
  }, [scrapers]);

  const toggleClient = (client: string) => {
    setOpenClients(prev => ({ ...prev, [client]: !prev[client] }));
  };

  const togglePlatform = (client: string, platform: string) => {
    const key = `${client}-${platform}`;
    setOpenPlatforms(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const platformIcons: Record<string, any> = {
    reddit: Icons.MessageSquare,
    hackernews: Icons.Hash,
    stackoverflow: Icons.Code,
    craigslist: Icons.MapPin
  };

  const platformNames: Record<string, string> = {
    reddit: 'Reddit',
    hackernews: 'Hacker News',
    stackoverflow: 'Stack Overflow',
    craigslist: 'Craigslist'
  };

  return (
    <aside className={`w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50 flex flex-col h-full shrink-0 overflow-hidden transition-colors ${className}`}>
      <div className="h-24 flex flex-col justify-center px-8 shrink-0">
        <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-[#5a8c12] text-white flex items-center justify-center shadow-md">
            <Activity size={16} strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span>Preemptly</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest -mt-1">Real-time Intelligence</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-4 custom-scrollbar">
        <div className="mb-8 space-y-2">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                isActive 
                  ? 'bg-white dark:bg-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-slate-800 dark:text-slate-100 border border-slate-50 dark:border-slate-700' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${isActive ? 'bg-[#5a8c12] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                  <Home size={16} strokeWidth={1.5} />
                </div>
                Home
              </>
            )}
          </NavLink>

          <NavLink 
            to="/crm" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                isActive 
                  ? 'bg-white dark:bg-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-slate-800 dark:text-slate-100 border border-slate-50 dark:border-slate-700' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${isActive ? 'bg-[#5a8c12] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                  <Icons.Users size={16} strokeWidth={1.5} />
                </div>
                CRM Applications
              </>
            )}
          </NavLink>
          
          <Button 
            onClick={() => onAddMonitor()} 
            variant="outline" 
            className="w-full justify-start gap-3 px-4 py-6 rounded-xl border-dashed border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#5a8c12] dark:hover:text-[#5a8c12] hover:border-[#5a8c12]/30 dark:hover:border-[#5a8c12]/50 hover:bg-[#5a8c12]/5 dark:hover:bg-[#5a8c12]/10 transition-all font-semibold"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center group-hover:bg-[#5a8c12]/10 group-hover:text-[#5a8c12]">
              <Plus size={16} strokeWidth={1.5} />
            </div>
            Deploy Monitor
          </Button>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Intelligence Monitors
            {isOpen ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {scrapers.length === 0 ? (
              <p className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 italic">No monitors active.</p>
            ) : (
              Object.entries(groupedScrapers).map(([clientName, platforms]) => (
                <div key={clientName} className="space-y-1">
                  {(() => {
                    const clientScrapers = Object.values(platforms).flat();
                    const clientNewMatches = clientScrapers.reduce((sum, s) => sum + (newMatchesCounts[s.id] || 0), 0);
                    
                    return (
                      <button 
                        onClick={() => toggleClient(clientName)}
                        className="flex items-center gap-2 w-full px-4 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                      >
                        {openClients[clientName] ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
                        <Icons.User size={14} className="text-[#5a8c12]" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate flex-1 text-left">
                          {clientName}
                        </span>
                        {clientNewMatches > 0 && (
                          <span className="bg-[#5a8c12] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                            {clientNewMatches}
                          </span>
                        )}
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-500">
                          {clientScrapers.length}
                        </span>
                      </button>
                    );
                  })()}

                  {openClients[clientName] && (
                    <div className="space-y-2 pl-4 border-l border-slate-100 dark:border-slate-800 ml-4 mt-1">
                      {Object.entries(platforms).map(([platform, platformScrapers]) => {
                        const platformKey = `${clientName}-${platform}`;
                        const PlatformIcon = platformIcons[platform] || Icons.Globe;
                        const platformNewMatches = platformScrapers.reduce((sum, s) => sum + (newMatchesCounts[s.id] || 0), 0);
                        
                        return (
                          <div key={platform} className="space-y-1">
                            <div className="flex items-center group">
                              <button 
                                onClick={() => togglePlatform(clientName, platform)}
                                className="flex items-center gap-2 flex-1 px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-[#5a8c12] transition-colors"
                              >
                                {openPlatforms[platformKey] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                <PlatformIcon size={12} className="text-[#5a8c12] opacity-80" />
                                <span className="flex-1 text-left truncate">{platformNames[platform] || platform}</span>
                                {platformNewMatches > 0 && (
                                  <span className="bg-[#5a8c12] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[14px] text-center">
                                    {platformNewMatches}
                                  </span>
                                )}
                              </button>
                              
                              <Tooltip>
                                <TooltipTrigger
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddMonitor({ 
                                      clientName, 
                                      clientPhone: platformScrapers[0]?.clientPhone, 
                                      platform 
                                    });
                                  }}
                                  className="p-1 rounded-md hover:bg-[#5a8c12]/10 text-slate-400 hover:text-[#5a8c12] transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Plus size={12} strokeWidth={2.5} />
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <p className="text-[10px]">Add monitor for this platform</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            {openPlatforms[platformKey] && (
                              <div className="space-y-1 pl-2 border-l border-slate-50 dark:border-slate-800/50 ml-2 mt-1">
                                {platformScrapers.map(scraper => {
                                  const IconComponent = (Icons as any)[scraper.icon || 'Activity'] || Activity;
                                  return (
                                    <div key={scraper.id}>
                                      <NavLink 
                                        to={`/scraper/${scraper.id}`}
                                        className={({ isActive }) => 
                                          `flex items-center justify-between px-3 py-2 rounded-xl group cursor-pointer transition-colors ${
                                            isActive ? 'bg-[#5a8c12]/10 dark:bg-[#5a8c12]/20 border border-[#5a8c12]/20 dark:border-[#5a8c12]/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                          }`
                                        }
                                      >
                                        <div className="flex items-center gap-3 overflow-hidden w-full">
                                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm shrink-0 ${scraper.status === 'active' ? 'bg-[#5a8c12] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                                            {scraper.status === 'active' ? (
                                              <IconComponent size={14} strokeWidth={1.5} />
                                            ) : (
                                              <PauseCircle size={14} strokeWidth={1.5} />
                                            )}
                                          </div>
                                          <div className="flex flex-col min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate block">
                                                {scraper.name}
                                              </span>
                                              {newMatchesCounts[scraper.id] > 0 && (
                                                <span className="bg-[#5a8c12] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full min-w-[14px] text-center shrink-0">
                                                  {newMatchesCounts[scraper.id]}
                                                </span>
                                              )}
                                            </div>
                                            {scraper.status === 'active' && (
                                              <SidebarCountdown scraper={scraper} />
                                            )}
                                          </div>
                                        </div>
                                      </NavLink>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </aside>
  );
}

function SidebarCountdown({ scraper }: { scraper: Scraper }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const lastRun = scraper.lastRunAt?.toMillis?.() || scraper.createdAt?.toMillis?.() || Date.now();
      const nextRun = lastRun + (scraper.intervalMinutes * 60 * 1000);
      const remaining = Math.max(0, Math.floor((nextRun - Date.now()) / 1000));
      
      if (remaining > 60) {
        setTimeLeft(`${Math.floor(remaining / 60)}m`);
      } else {
        setTimeLeft(`${remaining}s`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [scraper]);

  return (
    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
      <Clock size={10} />
      <span>Next run in {timeLeft}</span>
    </div>
  );
}
