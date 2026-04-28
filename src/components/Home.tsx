import React, { useMemo, useState, useEffect } from 'react';
import { useData } from './DataProvider';
import { LeadsTable } from './LeadsTable';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  ChevronDown,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageCircle,
  BarChart3,
  Hash,
  Code,
  MessageSquare,
  Rocket,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ShieldCheck,
  MousePointer2,
  User,
  Sparkles,
  LayoutDashboard,
  Loader2,
  Send
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
  RadialBarChart,
  RadialBar,
  LineChart,
  Line,
  ReferenceLine,
  ComposedChart
} from 'recharts';

import { format, subDays, subMonths, startOfDay, startOfHour, isWithinInterval } from 'date-fns';
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
import { writeBatch, doc, updateDoc, addDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthProvider';
import { SEO } from './SEO';

// ─────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────
const BRAND = '#5a8c12';
const BRAND_LIGHT = '#7ab820';
const SCRAPER_COLORS = ['#5a8c12', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];
const PLATFORM_COLORS: Record<string, string> = {
  reddit: '#FF4500',
  stackoverflow: '#F48024',
};

// ─────────────────────────────────────────────────────────────
// Tiny helpers
// ─────────────────────────────────────────────────────────────
function relativeTime(ms: number) {
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function scoreColor(score: number) {
  if (score >= 8) return '#22c55e';
  if (score >= 6) return BRAND;
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
}

// ─────────────────────────────────────────────────────────────
// Custom tooltip (dark glassmorphic style)
// ─────────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 shadow-2xl text-white min-w-[120px]">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs font-bold">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.stroke }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Scrollable Legend for many scrapers
// ─────────────────────────────────────────────────────────────
const ScrollableLegend = (props: any) => {
  const { payload } = props;
  if (!payload || payload.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-6 max-h-[90px] overflow-y-auto px-4 py-2 custom-scrollbar">
      {payload.map((entry: any, index: number) => (
        <div key={`item-${index}`} className="flex items-center gap-2 flex-shrink-0 min-w-[140px] max-w-[180px]">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0" 
            style={{ backgroundColor: entry.color }}
          />
          <span 
            className="text-[10px] font-bold text-slate-500 truncate" 
            title={entry.value}
          >
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Metric KPI card
// ─────────────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  iconColor,
  badge,
  badgeColor,
}: {
  icon: any; label: string; value: string | number; sub?: string;
  iconBg: string; iconColor: string; badge?: string; badgeColor?: string;
}) {
  return (
    <div className="group bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-[#5a8c12]/40 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
        {badge && (
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${badgeColor || 'bg-slate-100 text-slate-500'}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chart section wrapper
// ─────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, className = '', action }: {
  title: string; subtitle: string; children: React.ReactNode; className?: string; action?: React.ReactNode | null;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden ${className}`}>
      <div className="px-8 pt-8 pb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="px-6 pb-8">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export function Home() {
  const { scrapers, leads, logs, totalLeadsCount, leadsTodayCount } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetType, setResetType] = useState<'leads' | 'scrapers' | 'logs' | 'all' | null>(null);
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [isDeploying, setIsDeploying] = useState<Record<string, boolean>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Reset handler ────────────────────────────────────────────
  const handleReset = async () => {
    if (!resetType) return;
    const batch = writeBatch(db);
    if (resetType === 'leads' || resetType === 'all') leads.forEach(l => batch.delete(doc(db, 'leads', l.id)));
    if (resetType === 'scrapers' || resetType === 'all') scrapers.forEach(s => batch.delete(doc(db, 'scrapers', s.id)));
    if (resetType === 'logs' || resetType === 'all') logs.forEach(l => batch.delete(doc(db, 'logs', l.id)));
    try { await batch.commit(); } catch (e) { console.error('Reset error:', e); }
  };

  const generateReadableToken = (clientName: string) => {
    const slug = clientName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')     // Remove non-alphanumeric
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Remove consecutive hyphens
      .substring(0, 32);             // Limit length

    // Add a short 6-char random suffix for uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    return `${slug || 'portal'}-${randomSuffix}`;
  };

  const handleDeployPortal = async (clientName: string, scraperIds: string[]) => {
    setIsDeploying(prev => ({ ...prev, [clientName]: true }));
    const token = generateReadableToken(clientName);
    try {
      const batch = writeBatch(db);
      for (const id of scraperIds) {
        batch.update(doc(db, 'scrapers', id), {
          portalToken: token,
          trialLimit: 10,
          isPaid: false
        });
      }
      await batch.commit();

      await addDoc(collection(db, 'logs'), {
        type: 'portal_deployed',
        message: `Client portal deployed for "${clientName}" across ${scraperIds.length} monitor(s)`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'scrapers');
    } finally {
      setIsDeploying(prev => ({ ...prev, [clientName]: false }));
    }
  };

  const handleKillPortal = async (clientName: string, scraperIds: string[]) => {
    setIsDeploying(prev => ({ ...prev, [clientName]: true }));
    try {
      const batch = writeBatch(db);
      for (const id of scraperIds) {
        batch.update(doc(db, 'scrapers', id), {
          portalToken: null
        });
      }
      await batch.commit();

      await addDoc(collection(db, 'logs'), {
        type: 'portal_killed',
        message: `Client portal deactivated for "${clientName}"`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'scrapers');
    } finally {
      setIsDeploying(prev => ({ ...prev, [clientName]: false }));
    }
  };

  const handleExtendTrial = async (clientName: string, scraperIds: string[], currentLimit: number) => {
    try {
      const newLimit = currentLimit + 10;
      const batch = writeBatch(db);
      for (const id of scraperIds) {
        batch.update(doc(db, 'scrapers', id), {
          trialLimit: newLimit
        });
      }
      await batch.commit();

      await addDoc(collection(db, 'logs'), {
        type: 'trial_extended',
        message: `Trial extended for "${clientName}" — new limit: ${newLimit} matches`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'scrapers');
    }
  };

  const handleDeleteClient = async (clientName: string, scrapersArray: any[]) => {
    if (!confirm(`Are you sure you want to delete client "${clientName}" and all ${scrapersArray.length} associated monitors?`)) return;
    
    try {
      const batch = writeBatch(db);
      for (const s of scrapersArray) {
        // Find leads for this scraper to delete them too
        const scraperLeads = leads.filter(l => l.scraperId === s.id);
        for (const l of scraperLeads) {
          batch.delete(doc(db, 'leads', l.id));
        }
        batch.delete(doc(db, 'scrapers', s.id));
      }
      await batch.commit();

      await addDoc(collection(db, 'logs'), {
        type: 'client_deleted',
        message: `Client "${clientName}" and all associated data deleted`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'scrapers');
    }
  };

  const handleToggleAi = async (clientName: string, scraperIds: string[], currentlyEnabled: boolean) => {
    try {
      const newState = !currentlyEnabled;
      const batch = writeBatch(db);
      for (const id of scraperIds) {
        batch.update(doc(db, 'scrapers', id), {
          isAiEnabled: newState
        });
      }
      await batch.commit();

      await addDoc(collection(db, 'logs'), {
        type: newState ? 'scraper_resumed' : 'scraper_paused',
        message: `AI Power-ups ${newState ? 'enabled' : 'disabled'} for "${clientName}"`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'scrapers');
    }
  };

  const handleMarkAllViewedForClient = async (clientName: string, scraperIds: string[]) => {
    try {
      const batch = writeBatch(db);
      const clientLeads = leads.filter(l => scraperIds.includes(l.scraperId) && (!l.status || l.status === 'new'));
      
      clientLeads.forEach(lead => {
        batch.update(doc(db, 'leads', lead.id), { status: 'viewed' });
      });
      
      await batch.commit();

      await addDoc(collection(db, 'logs'), {
        type: 'leads_marked_viewed',
        message: `All ${clientLeads.length} pending matches marked as viewed for client "${clientName}"`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'leads');
    }
  };

  const handlePauseAllForClient = async (clientName: string, scraperIds: string[]) => {
    try {
      const batch = writeBatch(db);
      for (const id of scraperIds) {
        batch.update(doc(db, 'scrapers', id), { status: 'paused' });
      }
      await batch.commit();

      await addDoc(collection(db, 'logs'), {
        type: 'scraper_paused',
        message: `All monitors paused for client "${clientName}"`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'scrapers');
    }
  };

  const getResetTitle = () => ({ leads: 'Reset All Matches', scrapers: 'Reset All Monitors', logs: 'Reset All Logs', all: 'Reset Entire Dashboard' })[resetType!] || 'Reset';
  const getResetDescription = () => ({
    leads: 'Are you sure? All match data will be permanently deleted.',
    scrapers: 'This will stop all background monitoring permanently.',
    logs: 'All system logs will be cleared.',
    all: 'THIS WILL DELETE EVERYTHING. Your dashboard will be completely wiped.'
  })[resetType!] || '';

  // ── Core KPI stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const leadsToday = leads.filter(l => {
      const ms = typeof l.createdAt?.toMillis === 'function' ? l.createdAt.toMillis() : 0;
      return ms >= todayStart;
    }).length;

    const scores = leads.map(l => l.score || 0).filter(s => s > 0);
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0.0';

    const sentLeads = leads.filter(l => l.status === 'sent').length;
    const newLeads = leads.filter(l => !l.status || l.status === 'new').length;
    const rejectedLeads = leads.filter(l => l.status === 'rejected').length;
    const highIntent = leads.filter(l => (l.score || 0) >= 8).length;
    const conversionRate = leads.length > 0 ? Math.round((sentLeads / leads.length) * 100) : 0;

    // Platform breakdown
    const platformCounts = leads.reduce((acc, lead) => {
      const p = lead.platform || 'reddit';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const platformData = (Object.entries(platformCounts) as [string, number][])
      .map(([name, value]) => ({ name, value, color: PLATFORM_COLORS[name] || '#64748b' }))
      .sort((a, b) => b.value - a.value);

    // Top performing targets
    const targetCounts = leads.reduce((acc, lead) => {
      let t = lead.target || lead.subreddit || 'Unknown';
      if (lead.platform === 'reddit' || !lead.platform) t = `r/${t}`;
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topTarget = (Object.entries(targetCounts) as [string, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topTargetsData = (Object.entries(targetCounts) as [string, number][])
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    // Score distribution buckets
    const scoreBuckets = [
      { range: '1–3', min: 1, max: 3, color: '#ef4444', label: 'Low' },
      { range: '4–6', min: 4, max: 6, color: '#f59e0b', label: 'Medium' },
      { range: '7–8', min: 7, max: 8, color: BRAND, label: 'High' },
      { range: '9–10', min: 9, max: 10, color: '#22c55e', label: 'Elite' },
    ].map(bucket => ({
      ...bucket,
      count: leads.filter(l => (l.score || 0) >= bucket.min && (l.score || 0) <= bucket.max).length
    }));

    // Client stats
    type ClientStat = { 
      found: number; 
      sent: number; 
      phone: string; 
      scraperIds: string[]; 
      portalToken?: string | null;
      trialLimit: number;
      totalPushedLeads: number;
      totalClientClicks: number;
      isPaid: boolean;
      isAiEnabled: boolean;
      createdAt: any;
      scrapers: any[];
    };
    const clientMap = scrapers.reduce<Record<string, ClientStat>>((acc, s) => {
      const sl = leads.filter(l => l.scraperId === s.id);
      const key = s.clientName || 'Unknown';
      if (!acc[key]) {
        acc[key] = { 
          found: 0, 
          sent: 0, 
          phone: s.clientPhone || '', 
          scraperIds: [], 
          portalToken: s.portalToken,
          trialLimit: s.trialLimit || 10,
          totalPushedLeads: 0,
          totalClientClicks: 0,
          isPaid: s.isPaid || false,
          isAiEnabled: s.isAiEnabled || false,
          createdAt: s.createdAt,
          scrapers: []
        };
      }
      acc[key].found += sl.length;
      acc[key].sent += sl.filter(l => l.status === 'sent').length;
      acc[key].scraperIds.push(s.id);
      acc[key].scrapers.push(s);
      acc[key].totalPushedLeads += (s.totalPushedLeads || 0);
      acc[key].totalClientClicks += (s.totalClientClicks || 0);
      
      // Use the earliest created date
      if (s.createdAt && (!acc[key].createdAt || (s.createdAt.toMillis?.() < acc[key].createdAt.toMillis?.()))) {
        acc[key].createdAt = s.createdAt;
      }
      
      // If any scraper has paid status, client is paid
      if (s.isPaid) acc[key].isPaid = true;
      // If any scraper has AI enabled, consider the client AI enabled
      if (s.isAiEnabled) acc[key].isAiEnabled = true;
      // If any scraper has a portal token, use it
      if (s.portalToken) acc[key].portalToken = s.portalToken;
      // Use max trial limit
      if (s.trialLimit > acc[key].trialLimit) acc[key].trialLimit = s.trialLimit;

      return acc;
    }, {});
    const clientMapTyped = clientMap as Record<string, ClientStat>;
    const clientStatsArray = (Object.entries(clientMapTyped) as [string, ClientStat][])
      .map(([name, d]) => ({ 
        name, 
        found: d.found, 
        sent: d.sent, 
        phone: d.phone, 
        rate: d.found > 0 ? Math.round((d.sent / d.found) * 100) : 0,
        scraperIds: d.scraperIds,
        portalToken: d.portalToken,
        trialLimit: d.trialLimit,
        totalPushedLeads: d.totalPushedLeads,
        totalClientClicks: d.totalClientClicks,
        isPaid: d.isPaid,
        isAiEnabled: d.isAiEnabled,
        createdAt: d.createdAt,
        scrapers: d.scrapers
      }))
      .sort((a, b) => b.sent - a.sent);

    return {
      leadsToday, avgScore, topTarget, topTargetsData, clientStatsArray,
      sentLeads, newLeads, rejectedLeads, highIntent, conversionRate,
      platformData, scoreBuckets
    };
  }, [leads, scrapers]);

  // ── Time-series chart data ──────────────────────────────────
  const chartData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 60;
    return Array.from({ length: days }).map((_, i) => {
      const d = subDays(new Date(), days - 1 - i);
      const dayStart = startOfDay(d).getTime();
      const dayEnd = dayStart + 86400000;
      const dayLeads = leads.filter(l => {
        const ms = l.createdAt?.toMillis?.() || 0;
        return ms >= dayStart && ms < dayEnd;
      });
      const entry: any = {
        date: format(d, days <= 7 ? 'EEE' : days <= 30 ? 'MMM d' : 'MMM d'),
        total: dayLeads.length,
        highIntent: dayLeads.filter(l => (l.score || 0) >= 8).length,
        sent: dayLeads.filter(l => l.status === 'sent').length,
      };
      scrapers.forEach(s => { entry[s.name] = dayLeads.filter(l => l.scraperId === s.id).length; });
      return entry;
    });
  }, [leads, scrapers, timeRange]);

  // ── Scraper health ──────────────────────────────────────────
  const activeScrapers = scrapers.filter(s => s.status === 'active').length;
  const erroredScrapers = scrapers.filter(s => s.lastError && s.lastErrorAt &&
    (Date.now() - (s.lastErrorAt?.toMillis?.() || 0)) < 3600000 * 3
  );
  const failedJobs24h = logs.filter(l => l.type === 'scraper_error' && (Date.now() - (l.createdAt?.toMillis?.() || 0)) < 86400000).length;

  const scraperPerformance = scrapers.map(s => ({
    name: s.name.length > 16 ? s.name.substring(0, 16) + '…' : s.name,
    leads: leads.filter(l => l.scraperId === s.id).length,
    sent: leads.filter(l => l.scraperId === s.id && l.status === 'sent').length,
    status: s.status,
    hasError: !!erroredScrapers.find(e => e.id === s.id),
  })).sort((a, b) => b.leads - a.leads);

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

  const getPlatformIcon = (platform?: string) => {
    switch (platform) {
      case 'reddit': return <MessageSquare size={12} />;
      case 'stackoverflow': return <Code size={12} />;
      default: return <MessageSquare size={12} />;
    }
  };

  const confirmReset = (type: 'leads' | 'scrapers' | 'logs' | 'all') => {
    setResetType(type as any);
    setTimeout(() => {
      setResetModalOpen(true);
    }, 0);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      <SEO title="Dashboard | Preemptly" />
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            Overview
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            Command Center
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Reset dashboard dropdown */}
          <DropdownMenu>
            <div
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "flex items-center gap-2 cursor-pointer select-none outline-none text-xs uppercase tracking-widest font-bold shadow-sm",
              )}
            >
              <DropdownMenuTrigger className="flex items-center gap-2 w-full outline-none">
                <RefreshCcw size={14} className="mr-1" />
                Reset Dashboard
              </DropdownMenuTrigger>
            </div>

            <DropdownMenuContent
              align="end"
              className="w-52 rounded-2xl border-2 border-slate-100 dark:border-slate-800 p-2 bg-white dark:bg-slate-900 shadow-xl z-50"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 py-1.5">
                  Reset Options
                </DropdownMenuLabel>
                {[
                  { icon: Database, label: "Reset Matches", type: "leads" },
                  { icon: Zap, label: "Reset Monitors", type: "scrapers" },
                  { icon: Activity, label: "Reset Logs", type: "logs" },
                ].map(({ icon: Icon, label, type }) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => confirmReset(type as any)}
                    className="rounded-xl focus:bg-red-50 focus:text-red-600 hover:bg-slate-50 cursor-pointer p-3 flex items-center outline-none"
                  >
                    <Icon size={15} className="mr-3" />{" "}
                    <span className="font-bold text-sm text-slate-700">
                      {label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="my-2 border-t border-slate-100 dark:border-slate-800" />
              <DropdownMenuItem
                onClick={() => confirmReset("all")}
                className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 focus:bg-red-100 hover:bg-red-100 cursor-pointer p-3 flex items-center outline-none"
              >
                <Trash2 size={15} className="mr-3" />{" "}
                <span className="font-black text-sm">Reset ALL Data</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* System status */}
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm transition-colors ${
              erroredScrapers.length > 0
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${erroredScrapers.length > 0 ? "bg-red-500" : "bg-green-500"}`}
            />
            <span
              className={`text-xs font-bold uppercase tracking-tighter ${erroredScrapers.length > 0 ? "text-red-600 dark:text-red-400" : "text-slate-600 dark:text-slate-300"}`}
            >
              {erroredScrapers.length > 0
                ? `${erroredScrapers.length} Error${erroredScrapers.length > 1 ? "s" : ""}`
                : "System Live"}
            </span>
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

      {/* Error alerts removed as per user request - errors now appear in System Activity */}

      {/* ── Primary KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          icon={Activity}
          label="Opportunities Found"
          value={totalLeadsCount !== undefined ? totalLeadsCount : leads.length}
          iconBg="bg-[#5a8c12]/10"
          iconColor="text-[#5a8c12]"
          badge={`+${leadsTodayCount !== undefined ? leadsTodayCount : stats.leadsToday} today`}
          badgeColor="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
        />
        <KpiCard
          icon={Star}
          label="Avg Match Score"
          value={`${stats.avgScore}/10`}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
          badge={`${stats.highIntent} elite`}
          badgeColor="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
          sub={`${stats.highIntent} moments scored 8+`}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Matches Shared"
          value={stats.sentLeads}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          badge={`${stats.conversionRate}% rate`}
          badgeColor="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
          sub={`${stats.newLeads} pending review`}
        />
        <KpiCard
          icon={Zap}
          label="Active Monitors"
          value={`${activeScrapers}/${scrapers.length}`}
          iconBg="bg-[#5a8c12]/10"
          iconColor="text-[#5a8c12]"
          badge={
            failedJobs24h > 0
              ? `${failedJobs24h} alert${failedJobs24h > 1 ? "s" : ""}`
              : "Healthy"
          }
          badgeColor={
            failedJobs24h > 0
              ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
              : "bg-[#5a8c12]/10 text-[#5a8c12]"
          }
          sub={`${scrapers.length - activeScrapers} paused`}
        />
      </div>

      {/* ── Lead Velocity + Platform Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard
          className="lg:col-span-2"
          title="Opportunity Velocity"
          subtitle="How many opportunities we are finding for you"
          action={
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(["7d", "30d", "all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    timeRange === r
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {r === "all" ? "60D" : r.toUpperCase()}
                </button>
              ))}
            </div>
          }
        >
          {!mounted ? (
            <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  {scrapers.map((s, i) => (
                    <linearGradient
                      key={s.id}
                      id={`grad-${i}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={SCRAPER_COLORS[i % SCRAPER_COLORS.length]}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={SCRAPER_COLORS[i % SCRAPER_COLORS.length]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                  <linearGradient id="grad-total" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }}
                  allowDecimals={false}
                />
                <RechartsTooltip content={<DarkTooltip />} />
                <Legend content={<ScrollableLegend />} />
                {scrapers.length > 1 ? (
                  scrapers.map((s, i) => (
                    <Area
                      key={s.id}
                      type="monotone"
                      dataKey={s.name}
                      stroke={SCRAPER_COLORS[i % SCRAPER_COLORS.length]}
                      strokeWidth={2}
                      fill={`url(#grad-${i})`}
                      stackId="1"
                    />
                  ))
                ) : (
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Opportunities"
                    stroke={BRAND}
                    strokeWidth={2.5}
                    fill="url(#grad-total)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Platform breakdown donut */}
        <ChartCard title="Visibility Sources" subtitle="Platform distribution across trackers">
          {!mounted || stats.platformData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm italic">
              No platform data yet
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stats.platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.platformData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-2">
                {stats.platformData.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 flex-1">
                      {getPlatformIcon(p.name)}
                      <span className="capitalize">{p.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {p.value}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium w-8 text-right">
                      {leads.length > 0
                        ? Math.round((p.value / leads.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Lead Quality Heatmap + Status Funnel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score distribution */}
        <ChartCard
          title="Expertise Score Distribution"
          subtitle="Volume of opportunities across expertise brackets"
        >
          {!mounted ? (
            <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ) : (
            <div className="space-y-3 mt-2">
              {stats.scoreBuckets.map((bucket) => (
                <div key={bucket.range} className="flex items-center gap-4">
                  <div className="w-12 text-right text-xs font-black text-slate-500 shrink-0">
                    {bucket.range}
                  </div>
                  <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-700 relative flex items-center justify-end pr-3"
                      style={{
                        width:
                          leads.length > 0
                            ? `${Math.max(4, (bucket.count / leads.length) * 100)}%`
                            : "4%",
                        backgroundColor: bucket.color + "33",
                        borderRight: `3px solid ${bucket.color}`,
                      }}
                    >
                      <span
                        className="text-xs font-black"
                        style={{ color: bucket.color }}
                      >
                        {bucket.count}
                      </span>
                    </div>
                  </div>
                  <div
                    className="w-16 text-xs font-bold shrink-0"
                    style={{ color: bucket.color }}
                  >
                    {bucket.label}
                  </div>
                </div>
              ))}
              {leads.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm italic">
                  No data yet
                </div>
              )}
            </div>
          )}
        </ChartCard>

        {/* Outreach status funnel */}
        <ChartCard
          title="Growth Funnel"
          subtitle="Opportunity lifecycle from discovery to delivery"
        >
          <div className="space-y-4 mt-2">
            {[
              {
                label: "Discovered",
                value: leads.length,
                color: "#64748b",
                pct: 100,
                icon: Database,
              },
              {
                label: "High Intent (8+)",
                value: stats.highIntent,
                color: BRAND,
                pct: leads.length
                  ? Math.round((stats.highIntent / leads.length) * 100)
                  : 0,
                icon: Star,
              },
              {
                label: "New (Actionable)",
                value: stats.newLeads,
                color: "#f59e0b",
                pct: leads.length
                  ? Math.round((stats.newLeads / leads.length) * 100)
                  : 0,
                icon: Clock,
              },
              {
                label: "Sent to Client",
                value: stats.sentLeads,
                color: "#3b82f6",
                pct: leads.length
                  ? Math.round((stats.sentLeads / leads.length) * 100)
                  : 0,
                icon: MessageCircle,
              },
              {
                label: "Rejected",
                value: stats.rejectedLeads,
                color: "#ef4444",
                pct: leads.length
                  ? Math.round((stats.rejectedLeads / leads.length) * 100)
                  : 0,
                icon: XCircle,
              },
            ].map(({ label, value, color, pct, icon: Icon }) => (
              <div key={label} className="flex items-center gap-4">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: color + "20" }}
                >
                  <Icon size={13} style={{ color }} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">
                        {pct}%
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white w-8 text-right">
                        {value}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Scraper Leaderboard + High-Intent Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scraper performance leaderboard */}
        <ChartCard
          className="lg:col-span-2"
          title="Tracker Performance Leaderboard"
          subtitle="Ranked by total moments found — error state shown in red"
        >
          {!mounted ? (
            <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ) : scraperPerformance.length > 0 ? (
            <div className="max-h-[420px] overflow-y-auto custom-scrollbar pr-4 -mr-4">
              <ResponsiveContainer
                width="100%"
                height={Math.max(240, scraperPerformance.length * 42)}
              >
                <BarChart
                  data={scraperPerformance}
                  layout="vertical"
                  margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                    width={110}
                  />
                  <RechartsTooltip content={<DarkTooltip />} />
                  <Bar
                    dataKey="leads"
                    name="Total"
                    radius={[0, 6, 6, 0]}
                    barSize={12}
                  >
                    {scraperPerformance.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.hasError
                            ? "#ef4444"
                            : SCRAPER_COLORS[i % SCRAPER_COLORS.length]
                        }
                        fillOpacity={entry.status === "paused" ? 0.35 : 1}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="sent"
                    name="Sent"
                    radius={[0, 6, 6, 0]}
                    barSize={6}
                    fill="#3b82f6"
                    fillOpacity={0.7}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-slate-400 text-sm italic">
              No scrapers deployed yet
            </div>
          )}
          {/* Legend */}
          {scraperPerformance.length > 0 && (
            <div className="flex items-center gap-6 mt-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              {[
                { label: "Total Matches", color: BRAND, opacity: 1 },
                { label: "Sent to Client", color: "#3b82f6", opacity: 0.7 },
                { label: "Has Error", color: "#ef4444", opacity: 1 },
                { label: "Paused", color: "#94a3b8", opacity: 0.35 },
              ].map(({ label, color, opacity }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: color, opacity }}
                  />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* Top targets bar */}
        <ChartCard
          title="High-Intent Communities"
          subtitle="Communities generating the most growth"
        >
          {!mounted || stats.topTargetsData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
              No target data yet
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topTargetsData.map((t, i) => (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 w-4 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[130px]"
                        title={t.name}
                      >
                        {t.name}
                      </span>
                      <span className="text-xs font-black text-slate-900 dark:text-white shrink-0 ml-2">
                        {t.value}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(t.value / stats.topTargetsData[0].value) * 100}%`,
                          backgroundColor:
                            SCRAPER_COLORS[i % SCRAPER_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Client Delivery Board + Activity Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client delivery */}
        <ChartCard
          className="lg:col-span-2"
          title="Partner Growth Hub"
          subtitle="Manage growth portals and expertise strategies"
        >
          {stats.clientStatsArray.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                <Briefcase size={20} className="text-slate-300" />
              </div>
              <p>No client profiles found. Create a scraper to begin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {stats.clientStatsArray.map((client, i) => (
                <div
                  key={client.name}
                  className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:border-[#5a8c12]/50 hover:shadow-xl hover:shadow-[#5a8c12]/5 transition-all duration-500 overflow-hidden"
                >
                  {/* Decorative background accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#5a8c12]/5 rounded-bl-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500" />
                  
                  <div className="relative flex flex-col md:flex-row gap-8">
                    {/* Client Identity & Stats */}
                    <div className="flex-1 space-y-6">
                      <div className="flex items-start gap-4">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-[#5a8c12]/20 shrink-0"
                          style={{ backgroundColor: SCRAPER_COLORS[i % SCRAPER_COLORS.length] }}
                        >
                          {client.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-xl text-slate-900 dark:text-white truncate">
                              {client.name}
                            </h4>
                              {client.isPaid && (
                                <span className="px-2 py-0.5 rounded-full bg-[#5a8c12]/10 text-[#5a8c12] text-[10px] font-black uppercase tracking-widest border border-[#5a8c12]/20">
                                  Paid Client
                                </span>
                              )}
                              {client.isAiEnabled && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 flex items-center gap-1">
                                  <Sparkles size={10} /> AI Powered
                                </span>
                              )}
                            </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                              <User size={12} />
                              {client.name}
                            </div>
                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-tight font-mono">
                              <MessageCircle size={12} />
                              {client.phone || "No phone"}
                            </div>
                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                              <Clock size={12} />
                              Created {client.createdAt?.toMillis ? format(client.createdAt.toMillis(), 'MMM d, yyyy') : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* KPI Grid for Client */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Monitors</p>
                          <div className="flex items-center gap-2">
                             <Zap size={14} className="text-[#5a8c12]" />
                             <span className="text-lg font-black text-slate-900 dark:text-white">{client.scraperIds.length}</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Opportunities</p>
                          <div className="flex items-center gap-2">
                             <Database size={14} className="text-blue-500" />
                             <span className="text-lg font-black text-slate-900 dark:text-white">{client.found}</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sent</p>
                          <div className="flex items-center gap-2">
                             <Rocket size={14} className="text-amber-500" />
                             <span className="text-lg font-black text-slate-900 dark:text-white">{client.totalPushedLeads}</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Client Clicks</p>
                          <div className="flex items-center gap-2">
                             <MousePointer2 size={14} className="text-pink-500" />
                             <span className="text-lg font-black text-slate-900 dark:text-white">{client.totalClientClicks}</span>
                          </div>
                        </div>
                      </div>

                      {/* Health Progress */}
                      <div className="flex flex-col sm:flex-row gap-6 mt-4">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <ShieldCheck size={14} className="text-[#5a8c12]" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trial Usage ({client.totalPushedLeads}/{client.trialLimit})</span>
                            </div>
                            <span className="text-[10px] font-black text-[#5a8c12] bg-[#5a8c12]/10 px-2 py-0.5 rounded-full">
                              {Math.round((client.totalPushedLeads / client.trialLimit) * 100)}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                             <div 
                               className="h-full bg-[#5a8c12] transition-all duration-1000" 
                               style={{ width: `${Math.min(100, (client.totalPushedLeads / client.trialLimit) * 100)}%` }} 
                             />
                          </div>
                        </div>

                        {/* AI Switch */}
                        <div className="flex flex-col justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${client.isAiEnabled ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-200 text-slate-400'}`}>
                                <Sparkles size={12} />
                              </div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">AI Power-ups</span>
                            </div>
                            <button
                              onClick={() => handleToggleAi(client.name, client.scraperIds, client.isAiEnabled)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${client.isAiEnabled ? 'bg-[#5a8c12]' : 'bg-slate-200'}`}
                            >
                              <span
                                className={`pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-lg ring-0 transition-transform ${client.isAiEnabled ? 'translate-x-[18px]' : 'translate-x-[4px]'}`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Portal Management Controls */}
                    <div className="md:w-72 flex flex-col gap-3 justify-center md:border-l border-slate-100 dark:border-slate-800 md:pl-8">
                       {isDeploying[client.name] ? (
                         <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 animate-pulse">
                            <RefreshCcw size={20} className="animate-spin text-[#5a8c12] mb-2" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Dashboard...</p>
                         </div>
                       ) : client.portalToken ? (
                         <div className="space-y-3">
                           <div className="p-4 bg-[#5a8c12]/5 rounded-2xl border border-[#5a8c12]/20">
                             <h5 className="text-[9px] font-black text-[#5a8c12] uppercase tracking-[0.2em] mb-2 text-center">Live Dashboard</h5>
                             <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                               <span className="text-[10px] font-mono text-slate-500 flex-1 truncate">
                                 portal.bepreemptly.com/{client.portalToken}
                               </span>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-7 w-7 text-[#5a8c12] hover:bg-[#5a8c12]/10"
                                 onClick={() => {
                                   navigator.clipboard.writeText(`https://portal.bepreemptly.com/${client.portalToken}`);
                                   setCopiedToken(client.portalToken);
                                   setTimeout(() => setCopiedToken(null), 2000);
                                 }}
                               >
                                 {copiedToken === client.portalToken ? <Check size={14} /> : <Copy size={14} />}
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-7 w-7 text-blue-500 hover:bg-blue-50"
                                 onClick={() => window.open(`https://portal.bepreemptly.com/${client.portalToken}`, '_blank')}
                               >
                                 <ExternalLink size={14} />
                               </Button>
                             </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-2">
                             <Button 
                               variant="outline" 
                               className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50 gap-2"
                               onClick={() => handleExtendTrial(client.name, client.scraperIds, client.trialLimit)}
                             >
                               <ShieldCheck size={14} /> +10 Matches
                             </Button>
                             <Button 
                               variant="outline" 
                               className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 border-red-100 hover:bg-red-50 gap-2"
                               onClick={() => handleKillPortal(client.name, client.scraperIds)}
                             >
                               <XCircle size={14} /> Kill Portal
                             </Button>
                           </div>
                           <Button 
                             className="w-full bg-[#5a8c12] hover:bg-[#4a730f] h-11 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
                             onClick={() => handleDeployPortal(client.name, client.scraperIds)}
                           >
                             <RefreshCcw size={14} /> Redeploy Dashboard
                           </Button>
                         </div>
                       ) : (
                         <div className="space-y-3">
                           <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                             <Rocket size={32} className="mx-auto text-slate-300 mb-3" />
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Dashboard Deployed</p>
                           </div>
                           <Button 
                             className="w-full bg-[#5a8c12] hover:bg-[#4a730f] h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-3 shadow-lg shadow-[#5a8c12]/20"
                             onClick={() => handleDeployPortal(client.name, client.scraperIds)}
                           >
                             <Rocket size={18} /> Deploy Dashboard
                           </Button>
                         </div>
                       )}

                       <Button 
                         variant="ghost"
                         className="mt-2 text-[10px] font-black text-red-400 hover:text-red-500 hover:bg-red-50/50 uppercase tracking-widest gap-2"
                         onClick={() => handleDeleteClient(client.name, client.scrapers)}
                       >
                         <Trash2 size={12} /> Delete Client Profile
                       </Button>

                       <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-4 flex flex-col gap-2">
                          <Button 
                            variant="outline" 
                            className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50 gap-2 w-full"
                            onClick={() => handleMarkAllViewedForClient(client.name, client.scraperIds)}
                            disabled={leads.filter(l => client.scraperIds.includes(l.scraperId) && (!l.status || l.status === 'new')).length === 0}
                          >
                            <CheckCircle2 size={14} /> Mark all viewed
                          </Button>
                          <Button 
                            variant="outline" 
                            className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest border-red-100 text-red-500 hover:bg-red-50 gap-2 w-full"
                            onClick={() => handlePauseAllForClient(client.name, client.scraperIds)}
                            disabled={client.scrapers.every(s => s.status === 'paused')}
                          >
                            <Pause size={14} /> Pause All Monitors
                          </Button>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        {/* Activity feed */}
        <ChartCard
          title="System Activity"
          subtitle="Latest scraper events & detections"
          action={
            <button
              onClick={() => navigate("/logs")}
              className="text-[10px] font-black uppercase tracking-widest text-[#5a8c12] hover:underline"
            >
              View All
            </button>
          }
        >
          <div className="space-y-0">
            {logs.slice(0, 8).map((log, i) => (
              <div
                key={log.id}
                className={`flex items-start gap-3 py-3 px-2 rounded-xl transition-colors ${log.type === 'scraper_error' ? 'bg-red-50/50 dark:bg-red-900/10' : ''} ${i < logs.slice(0, 8).length - 1 ? "border-b border-slate-100 dark:border-slate-800" : ""}`}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getLogIcon(log.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate"
                    title={log.message}
                  >
                    {log.message}
                  </p>
                  {log.scraperName && (
                    <p className="text-[10px] text-slate-400 truncate">
                      {log.scraperName}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                  {log.createdAt
                    ? relativeTime(log.createdAt.toMillis?.() || 0)
                    : ""}
                </span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm italic">
                No activity yet.
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* ── Full Leads Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#5a8c12] text-white flex items-center justify-center shadow-lg shadow-[#5a8c12]/20">
            <Database size={22} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Opportunity Archive
            </h2>
            <p className="text-sm text-slate-500">
              Manage and export every high-intent opportunity discovered
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs font-bold text-slate-500">
            <TrendingUp size={14} className="text-[#5a8c12]" />
            {leads.length.toLocaleString()} total
          </div>
        </div>
        <LeadsTable leads={leads} scrapers={scrapers} />
      </div>
    </div>
  );
}
