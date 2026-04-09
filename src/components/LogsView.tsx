import { useData } from './DataProvider';
import { format } from 'date-fns';
import { Clock, Activity, Target, AlertCircle, Plus, Pause, Play, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function LogsView() {
  const { logs } = useData();
  const navigate = useNavigate();

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'scraper_run': return <Activity size={16} className="text-blue-500" />;
      case 'lead_found': return <Target size={16} className="text-[#5a8c12]" />;
      case 'scraper_error': return <AlertCircle size={16} className="text-red-500" />;
      case 'scraper_created': return <Plus size={16} className="text-green-500" />;
      case 'scraper_paused': return <Pause size={16} className="text-amber-500" />;
      case 'scraper_resumed': return <Play size={16} className="text-[#5a8c12]" />;
      default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronLeft size={24} />
        </Button>
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 uppercase tracking-wider">System</span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Activity Logs</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Full Event History</h2>
          <p className="text-sm text-slate-500">Real-time log of all scraper operations and lead detections</p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">
              No system logs available yet.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {getLogIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {log.scraperName ? `${log.scraperName}: ` : ''}{log.message}
                      </span>
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap ml-4">
                        {log.createdAt ? format(log.createdAt.toMillis(), 'MMM dd, HH:mm:ss') : 'Just now'}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 p-2 rounded-lg mt-2">
                        {log.details}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                        log.type === 'lead_found' ? 'bg-[#5a8c12]/10 text-[#5a8c12]' :
                        log.type === 'scraper_error' ? 'bg-red-50 text-red-600' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {log.type.replace('_', ' ')}
                      </span>
                      {log.scraperId && (
                        <span className="text-[10px] font-medium text-slate-400">
                          ID: {log.scraperId.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
