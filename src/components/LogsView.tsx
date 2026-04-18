import { useData } from './DataProvider';
import { format } from 'date-fns';
import { 
  Clock, 
  Activity, 
  Target, 
  AlertCircle, 
  Plus, 
  Pause, 
  Play, 
  ChevronLeft,
  Trash2,
  Filter,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ConfirmModal } from './ConfirmModal';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { SEO } from './SEO';

export function LogsView() {
  const { logs, scrapers } = useData();
  const navigate = useNavigate();
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [scraperFilter, setScraperFilter] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesType = typeFilter === 'all' || log.type === typeFilter;
      const matchesScraper = scraperFilter === 'all' || log.scraperId === scraperFilter;
      return matchesType && matchesScraper;
    });
  }, [logs, typeFilter, scraperFilter]);

  const handleResetLogs = async () => {
    const batch = writeBatch(db);
    logs.forEach(log => {
      batch.delete(doc(db, 'logs', log.id));
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  };

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

  const getLogLabel = (type: string) => {
    switch (type) {
      case 'scraper_run': return 'Tracker Active';
      case 'lead_found': return 'Growth Feed';
      case 'scraper_error': return 'System Alert';
      case 'scraper_created': return 'Tracker Launched';
      case 'scraper_paused': return 'Tracker Paused';
      case 'scraper_resumed': return 'Tracker Resumed';
      default: return type.replace('_', ' ');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <SEO title="Logs | Preemptly" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
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
        <Button 
          variant="outline" 
          onClick={() => setResetModalOpen(true)}
          className="rounded-xl border-red-100 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-xs uppercase tracking-widest"
        >
          <Trash2 size={14} className="mr-2" />
          Clear All Logs
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Full Event History</h2>
            <p className="text-sm text-slate-500">Real-time log of visibility trackers and growth identification</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters:</span>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-xs font-bold">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-2 border-slate-100 dark:border-slate-800">
                 <SelectItem value="all">All Events</SelectItem>
                 <SelectItem value="scraper_run">Activity</SelectItem>
                 <SelectItem value="lead_found">Growth Events</SelectItem>
                 <SelectItem value="scraper_error">System</SelectItem>
                 <SelectItem value="scraper_created">Launched</SelectItem>
                 <SelectItem value="scraper_paused">Paused</SelectItem>
                 <SelectItem value="scraper_resumed">Resumed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={scraperFilter} onValueChange={setScraperFilter}>
              <SelectTrigger className="w-[160px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-xs font-bold">
              </SelectTrigger>
              <SelectContent className="rounded-xl border-2 border-slate-100 dark:border-slate-800">
                <SelectItem value="all">All Trackers</SelectItem>
                {scrapers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(typeFilter !== 'all' || scraperFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setTypeFilter('all'); setScraperFilter('all'); }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                <X size={14} className="mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">
              {logs.length === 0 ? "No system logs available yet." : "No logs match your filters."}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="mt-1 w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    {getLogIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {log.scraperName ? `${log.scraperName}: ` : ''}{log.message}
                      </span>
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
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
                        {getLogLabel(log.type)}
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

      <ConfirmModal 
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        title="Clear All Logs"
        description="Are you sure you want to permanently delete all system activity logs? This cannot be undone."
        onConfirm={handleResetLogs}
        confirmText="Clear Logs"
      />
    </div>
  );
}
