import { Scraper } from '../types';
import * as Icons from 'lucide-react';
import { Activity, PauseCircle, Database, Home, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

export function Sidebar({ scrapers, onAddScraper }: { scrapers: Scraper[], onAddScraper: () => void }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50 flex flex-col h-full shrink-0 overflow-hidden transition-colors">
      <div className="h-20 flex items-center px-8 shrink-0">
        <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100 font-bold text-lg">
          <div className="w-8 h-8 rounded-lg bg-[#5a8c12] text-white flex items-center justify-center shadow-md">
            <Database size={16} strokeWidth={1.5} />
          </div>
          <span>IntentFirstHunter</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-4">
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
          
          <Button 
            onClick={onAddScraper} 
            variant="outline" 
            className="w-full justify-start gap-3 px-4 py-6 rounded-xl border-dashed border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#5a8c12] dark:hover:text-[#5a8c12] hover:border-[#5a8c12]/30 dark:hover:border-[#5a8c12]/50 hover:bg-[#5a8c12]/5 dark:hover:bg-[#5a8c12]/10 transition-all font-semibold"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center group-hover:bg-[#5a8c12]/10 group-hover:text-[#5a8c12]">
              <Plus size={16} strokeWidth={1.5} />
            </div>
            Add Scraper
          </Button>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            Deployed Scrapers
            {isOpen ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {scrapers.length === 0 ? (
              <p className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 italic">No scrapers deployed.</p>
            ) : (
              scrapers.map(scraper => {
                const IconComponent = (Icons as any)[scraper.icon || 'Activity'] || Activity;
                return (
                <NavLink 
                  key={scraper.id} 
                  to={`/scraper/${scraper.id}`}
                  className={({ isActive }) => 
                    `flex items-center justify-between px-4 py-3 rounded-xl group cursor-pointer transition-colors ${
                      isActive ? 'bg-[#5a8c12]/10 dark:bg-[#5a8c12]/20 border border-[#5a8c12]/20 dark:border-[#5a8c12]/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${scraper.status === 'active' ? 'bg-[#5a8c12] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                      {scraper.status === 'active' ? (
                        <IconComponent size={16} strokeWidth={1.5} />
                      ) : (
                        <PauseCircle size={16} strokeWidth={1.5} />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{scraper.name}</span>
                  </div>
                </NavLink>
              )})
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </aside>
  );
}
