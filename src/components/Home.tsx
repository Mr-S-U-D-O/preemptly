import { useMemo, useState, useEffect } from 'react';
import { useData } from './DataProvider';
import { LeadsTable } from './LeadsTable';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Database, 
  AlertCircle, 
  TrendingUp, 
  Star, 
  MapPin, 
  Zap, 
  Clock, 
  Target, 
  Plus, 
  Pause, 
  Play,
  RefreshCcw,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Area, 
  AreaChart,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

import { format, subDays, startOfDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { ConfirmModal } from './ConfirmModal';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';

export function Home() {
  const { scrapers, leads, logs } = useData();
  const navigate = useNavigate();
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetType, setResetType] = useState<'leads' | 'scrapers' | 'logs' | 'all' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReset = async () => {
    if (!resetType) return;

    const batch = writeBatch(db);
    
    if (resetType === 'leads' || resetType === 'all') {
      leads.forEach(lead => {
        batch.delete(doc(db, 'leads', lead.id));
      });
    }
    
    if (resetType === 'scrapers' || resetType === 'all') {
      scrapers.forEach(scraper => {
        batch.delete(doc(db, 'scrapers', scraper.id));
      });
    }
    
    if (resetType === 'logs' || resetType === 'all') {
      logs.forEach(log => {
        batch.delete(doc(db, 'logs', log.id));
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error resetting dashboard:", error);
    }
  };

  const getResetTitle = () => {
    switch(resetType) {
      case 'leads': return "Reset All Leads";
      case 'scrapers': return "Reset All Scrapers";
      case 'logs': return "Reset All Logs";
      case 'all': return "Reset Entire Dashboard";
      default: return "Reset Confirmation";
    }
  };

  const getResetDescription = () => {
    switch(resetType) {
      case 'leads': return "Are you sure you want to delete all leads? This action cannot be undone.";
      case 'scrapers': return "Are you sure you want to delete all scrapers? This will also stop all background monitoring.";
      case 'logs': return "Are you sure you want to clear all system logs?";
      case 'all': return "This will delete ALL leads, scrapers, and logs. Your dashboard will be completely empty. Are you absolutely sure?";
      default: return "";
    }
  };

  // Process analytics
  const stats = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    const leadsToday = leads.filter(l => l.createdAt && (l.createdAt.toMillis?.() || 0) >= today).length;
    
    const scores = leads.map(l => l.score || 0).filter(s => s > 0);
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0.0';

    const subreddits = leads.reduce((acc, lead) => {
      acc[lead.subreddit] = (acc[lead.subreddit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topSubreddit = Object.entries(subreddits).sort((a: [string, number], b: [string, number]) => b[1] - a[1])[0]?.[0] || 'N/A';

    const keywords = leads.reduce((acc, lead) => {
      acc[lead.keyword] = (acc[lead.keyword] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topKeywordsData = Object.entries(keywords)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
      .slice(0, 5);

    return { leadsToday, avgScore, topSubreddit, topKeywordsData };
  }, [leads]);

  // Process chart data for multiple scrapers
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dayData: any = {
        date: format(d, 'MMM dd'),
        total: 0,
        rawDate: d
      };
      // Initialize each scraper's count for this day
      scrapers.forEach(s => {
        dayData[s.name] = 0;
      });
      return dayData;
    });

    leads.forEach(lead => {
      if (!lead.createdAt) return;
      const leadDate = new Date(lead.createdAt.toMillis?.() || 0);
      const formatted = format(leadDate, 'MMM dd');
      const day = last7Days.find(d => d.date === formatted);
      if (day) {
        day.total += 1;
        const scraper = scrapers.find(s => s.id === lead.scraperId);
        if (scraper) {
          day[scraper.name] = (day[scraper.name] || 0) + 1;
        }
      }
    });

    return last7Days;
  }, [leads, scrapers]);

  const activeScrapers = scrapers.filter(s => s.status === 'active').length;
  const failedJobs = logs.filter(l => l.type === 'scraper_error' && l.createdAt && (Date.now() - (l.createdAt.toMillis?.() || 0)) < 86400000).length;
  
  const pieData = [
    { name: 'Active', value: activeScrapers, color: '#5a8c12' },
    { name: 'Paused', value: scrapers.length - activeScrapers, color: '#94a3b8' },
    { name: 'Failed', value: failedJobs, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const SCRAPER_COLORS = [
    '#008cff', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'
  ];

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'scraper_run': return <Activity size={14} className="text-blue-500" />;
      case 'lead_found': return <Target size={14} className="text-[#5a8c12]" />;
      case 'scraper_error': return <AlertCircle size={14} className="text-red-500" />;
      case 'scraper_created': return <Plus size={14} className="text-green-500" />;
      case 'scraper_paused': return <Pause size={14} className="text-amber-500" />;
      case 'scraper_resumed': return <Play size={14} className="text-[#5a8c12]" />;
      default: return <Clock size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 uppercase tracking-wider">Overview</span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Intelligence Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
              <RefreshCcw size={14} className="mr-2" />
              Reset Dashboard
              <ChevronDown size={14} className="ml-2 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-2 border-slate-100 dark:border-slate-800 p-2">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-1.5">Reset Options</DropdownMenuLabel>
                <DropdownMenuItem 
                  onClick={() => { setResetType('leads'); setResetModalOpen(true); }}
                  className="rounded-xl focus:bg-red-50 focus:text-red-600 cursor-pointer p-3"
                >
                  <Database size={16} className="mr-3" />
                  <span className="font-bold">Reset Leads</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { setResetType('scrapers'); setResetModalOpen(true); }}
                  className="rounded-xl focus:bg-red-50 focus:text-red-600 cursor-pointer p-3"
                >
                  <Zap size={16} className="mr-3" />
                  <span className="font-bold">Reset Scrapers</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => { setResetType('logs'); setResetModalOpen(true); }}
                  className="rounded-xl focus:bg-red-50 focus:text-red-600 cursor-pointer p-3"
                >
                  <Activity size={16} className="mr-3" />
                  <span className="font-bold">Reset Logs</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="my-2 bg-slate-100 dark:bg-slate-800" />
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  onClick={() => { setResetType('all'); setResetModalOpen(true); }}
                  className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 focus:bg-red-100 focus:text-red-700 cursor-pointer p-3"
                >
                  <Trash2 size={16} className="mr-3" />
                  <span className="font-black">Reset All Data</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">System Live</span>
          </div>
        </div>
      </div>

      <ConfirmModal 
        open={resetModalOpen}
        onOpenChange={setResetModalOpen}
        title={getResetTitle()}
        description={getResetDescription()}
        onConfirm={handleReset}
        confirmText="Yes, Reset"
      />
      
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-[#5a8c12] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#5a8c12]/10 text-[#5a8c12] flex items-center justify-center">
              <Database size={20} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">+{stats.leadsToday} today</span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Leads</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{leads.length}</p>
        </div>

        <div className="group bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-[#5a8c12] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Star size={20} />
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">Avg Intent</span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Intent Score</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.avgScore}<span className="text-sm text-slate-400 font-normal">/10</span></p>
        </div>

        <div className="group bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-[#5a8c12] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">Top Source</span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Best Subreddit</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter truncate">r/{stats.topSubreddit}</p>
        </div>

        <div className="group bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-[#5a8c12] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#5a8c12]/10 text-[#5a8c12] flex items-center justify-center">
              <Zap size={20} />
            </div>
            <span className="text-xs font-bold text-[#5a8c12] bg-[#5a8c12]/10 px-2 py-1 rounded-lg">Active</span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Running Scrapers</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{activeScrapers}<span className="text-sm text-slate-400 font-normal">/{scrapers.length}</span></p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Generation Area Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Lead Generation Velocity</h3>
              <p className="text-sm text-slate-500">Breakdown of leads found by each scraper over the last 7 days</p>
            </div>
          </div>
          <div className="overflow-hidden border border-slate-200 rounded-xl bg-white w-full flex justify-center items-center" style={{ minHeight: '320px' }}>
            {!mounted ? (
              <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
            ) : chartData && chartData.length > 0 ? (
              <AreaChart width={800} height={300} data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    backgroundColor: '#0f172a',
                    color: '#fff'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                {scrapers.map((scraper, index) => (
                  <Area 
                    key={scraper.id}
                    type="monotone" 
                    dataKey={scraper.name} 
                    stroke={SCRAPER_COLORS[index % SCRAPER_COLORS.length]} 
                    strokeWidth={3} 
                    fillOpacity={0.1} 
                    fill={SCRAPER_COLORS[index % SCRAPER_COLORS.length]} 
                    stackId="1"
                  />
                ))}
              </AreaChart>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No chart data available</div>
            )}
          </div>
        </div>
        
        {/* Scraper Health & Distribution */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">Scraper Health</h3>
          <p className="text-sm text-slate-500 mb-8">Real-time status distribution</p>
          
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="overflow-hidden border border-slate-200 rounded-xl bg-white w-full flex justify-center items-center relative" style={{ minHeight: '200px' }}>
              {!mounted ? (
                <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-full"></div>
              ) : pieData && pieData.length > 0 ? (
                <PieChart width={200} height={200}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">No health data</div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{scrapers.length}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
              </div>
            </div>

            <div className="w-full space-y-3 mt-8">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Keywords Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">Top Keywords</h3>
          <p className="text-sm text-slate-500 mb-8">Highest performing search terms</p>
          <div className="overflow-hidden border border-slate-200 rounded-xl bg-white w-full flex justify-center items-center" style={{ minHeight: '250px' }}>
            {!mounted ? (
              <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
            ) : stats.topKeywordsData && stats.topKeywordsData.length > 0 ? (
              <BarChart width={300} height={250} data={stats.topKeywordsData} layout="vertical" margin={{ left: -20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} width={100} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }}
                />
                <Bar dataKey="value" fill="#008cff" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No keyword data</div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">System Activity</h3>
              <p className="text-sm text-slate-500">Latest events and lead detections</p>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/logs')}
              className="text-xs font-bold text-[#5a8c12] uppercase tracking-widest hover:bg-[#5a8c12]/10"
            >
              View Log
            </Button>
          </div>
          
          <div className="space-y-6">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-start gap-4 group">
                <div className="mt-1 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  {getLogIcon(log.type)}
                </div>
                <div className="flex-1 border-b border-slate-100 dark:border-slate-800 pb-4 group-last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                      {log.scraperName ? `${log.scraperName}: ` : ''}{log.message}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap ml-2">
                      {log.createdAt ? formatDistanceToNow(log.createdAt.toMillis()) : 'Just now'}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm italic">No recent activity detected.</div>
            )}
          </div>
        </div>
      </div>

      {/* Leads Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#5a8c12] text-white flex items-center justify-center shadow-lg shadow-[#5a8c12]/20">
              <Database size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Recent Leads</h2>
              <p className="text-sm text-slate-500">Manage and export your latest high-intent opportunities</p>
            </div>
          </div>
        </div>
        <LeadsTable leads={leads} scrapers={scrapers} />
      </div>
    </div>
  );
}

// Helper for relative time in the activity feed
function formatDistanceToNow(date: number) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
