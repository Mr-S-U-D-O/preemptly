import { useParams, useNavigate } from 'react-router-dom';
import { useData } from './DataProvider';
import { format } from 'date-fns';
import { ExternalLink, Activity, PauseCircle, Trash2, Database, Clock, PlayCircle, Search, BrainCircuit, MessageCircle, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { doc, deleteDoc, collection, query, where, getDocs, setDoc, serverTimestamp, updateDoc, addDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { ConfirmModal } from './ConfirmModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function ScraperView() {
  const { id } = useParams<{ id: string }>();
  const { scrapers, leads } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scraper = scrapers.find(s => s.id === id);
  const scraperLeads = leads.filter(l => l.scraperId === id);

  // Search/Filter state
  const [localLeads, setLocalLeads] = useState<any[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);

  // Sync leads when data provider updates
  useEffect(() => {
    setLocalLeads(scraperLeads);
  }, [scraperLeads]);

  // Countdown logic
  useEffect(() => {
    if (!scraper || scraper.status !== 'active') {
      setCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const lastRun = scraper.lastRunAt?.toMillis?.() || scraper.createdAt?.toMillis?.() || Date.now();
      const nextRun = lastRun + (scraper.intervalMinutes * 60 * 1000);
      const remaining = Math.max(0, Math.floor((nextRun - Date.now()) / 1000));
      setCountdown(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [scraper]);

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return scraperLeads;
    const query = searchQuery.toLowerCase();
    return scraperLeads.filter(lead => 
      lead.postTitle.toLowerCase().includes(query) ||
      lead.subreddit.toLowerCase().includes(query) ||
      lead.keyword.toLowerCase().includes(query)
    );
  }, [scraperLeads, searchQuery]);

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });

  if (!scraper) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Scraper not found or loading...
      </div>
    );
  }

  const handleToggleStatus = async () => {
    try {
      const newStatus = scraper.status === 'active' ? 'paused' : 'active';
      await updateDoc(doc(db, 'scrapers', scraper.id), { status: newStatus });
      
      // Log the action
      await addDoc(collection(db, 'logs'), {
        type: newStatus === 'active' ? 'scraper_resumed' : 'scraper_paused',
        scraperId: scraper.id,
        scraperName: scraper.name,
        message: `Scraper "${scraper.name}" ${newStatus === 'active' ? 'resumed' : 'paused'}`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'scrapers');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'leads');
    }
  };

  const handleStatusChange = async (leadId: string, status: 'new' | 'viewed' | 'sent' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'leads');
    }
  };

  const handleDeployPortal = async () => {
    if (!scraper.clientName) return;
    setIsDeploying(true);
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
      const sameClientScrapers = scrapers.filter(s => s.clientName === scraper.clientName && s.userId === user?.uid);
      
      const batch = writeBatch(db);
      for (const s of sameClientScrapers) {
        batch.update(doc(db, 'scrapers', s.id), {
          portalToken: token,
          trialLimit: s.trialLimit || 10,
          isPaid: s.isPaid || false
        });
      }
      await batch.commit();

      // Log the deployment
      await addDoc(collection(db, 'logs'), {
        type: 'portal_deployed',
        scraperId: scraper.id,
        scraperName: scraper.name,
        message: `Client portal deployed for "${scraper.clientName}" across ${sameClientScrapers.length} scraper(s)`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'scrapers');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleKillPortal = async () => {
    if (!scraper.clientName) return;
    setIsDeploying(true);
    try {
      const sameClientScrapers = scrapers.filter(s => s.clientName === scraper.clientName && s.userId === user?.uid);
      const batch = writeBatch(db);
      for (const s of sameClientScrapers) {
        batch.update(doc(db, 'scrapers', s.id), {
          portalToken: null
        });
      }
      await batch.commit();

      // Log the kill
      await addDoc(collection(db, 'logs'), {
        type: 'portal_killed',
        scraperId: scraper.id,
        scraperName: scraper.name,
        message: `Client portal killed for "${scraper.clientName}" across ${sameClientScrapers.length} scraper(s)`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'scrapers');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleExtendTrial = async () => {
    try {
      const newLimit = (scraper.trialLimit || 10) + 10;
      await updateDoc(doc(db, 'scrapers', scraper.id), {
        trialLimit: newLimit
      });

      await addDoc(collection(db, 'logs'), {
        type: 'trial_extended',
        scraperId: scraper.id,
        scraperName: scraper.name,
        message: `Trial extended for "${scraper.clientName}" — new limit: ${newLimit} leads`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'scrapers');
    }
  };

  const handlePushToPortal = async (lead: any) => {
    try {
      // 1. Update Lead in Firestore
      await updateDoc(doc(db, 'leads', lead.id), {
        pushedToPortal: true,
        status: 'sent'
      });

      // 2. Increment Scraper counter
      await updateDoc(doc(db, 'scrapers', scraper.id), {
        totalPushedLeads: (scraper.totalPushedLeads || 0) + 1
      });

      // 3. Open WhatsApp
      const clientPhone = scraper.clientPhone || '';
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${clientPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(lead.whatsappMessage || '')}`;
      window.open(whatsappUrl, '_blank');

      // 4. Log the push
      await addDoc(collection(db, 'logs'), {
        type: 'lead_found',
        scraperId: scraper.id,
        scraperName: scraper.name,
        message: `Lead pushed to ${scraper.clientName || 'client'} dashboard`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      console.error("Failed to push lead:", error);
    }
  };

  const handleDelete = async () => {
    try {
      // Delete all associated leads first to clean up the database
      for (const lead of scraperLeads) {
        await deleteDoc(doc(db, 'leads', lead.id));
      }
      // Then delete the scraper
      await deleteDoc(doc(db, 'scrapers', scraper.id));
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'scrapers');
    }
  };



  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col mb-6">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 truncate max-w-full">Pages / Scrapers / {scraper.name}</span>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight break-words leading-tight">
              {scraper.name}
            </h1>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${scraper.status === 'active' ? 'bg-[#5a8c12]/10 text-[#5a8c12]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                {scraper.status === 'active' ? <Activity size={12} strokeWidth={2} /> : <PauseCircle size={12} strokeWidth={2} />}
                {scraper.status}
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest">
                {scraper.platform}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isDeploying ? (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border-2 border-slate-100 rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[10px] text-slate-400">
                <Icons.RefreshCw size={14} className="animate-spin text-[#5a8c12]" />
                Syncing Portal...
              </div>
            ) : scraper.portalToken ? (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border-2 border-[#5a8c12] rounded-xl px-3 py-1.5 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Live Client Portal</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700 max-w-[120px] truncate">
                      {window.location.origin}/portal/{scraper.portalToken}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-[#5a8c12]"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/portal/${scraper.portalToken}`);
                        setCopiedId('portal-link');
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                    >
                      {copiedId === 'portal-link' ? <Icons.Check size={12} /> : <Icons.Copy size={12} />}
                    </Button>
                    <div className="h-4 w-px bg-slate-100 dark:bg-slate-800" />
                    <Button 
                      variant="ghost" 
                      onClick={handleKillPortal}
                      className="h-7 text-[10px] font-black uppercase text-red-500 hover:text-red-600 hover:bg-red-50 px-2"
                    >
                      Kill Dashboard
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button 
                onClick={handleDeployPortal}
                className="bg-[#5a8c12] hover:bg-[#4a730f] text-white gap-2 rounded-xl shadow-lg shadow-[#5a8c12]/20"
              >
                <Icons.Rocket size={16} /> Deploy Client Dashboard
              </Button>
            )}

            <Button 
              onClick={handleToggleStatus} 
              variant="outline" 
              className={`flex-1 sm:flex-none gap-2 rounded-xl border-2 transition-colors ${
                scraper.status === 'active' 
                  ? 'border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' 
                  : 'border-[#5a8c12] text-[#5a8c12] hover:bg-[#5a8c12]/10'
              }`}
            >
              {scraper.status === 'active' ? (
                <><PauseCircle size={16} strokeWidth={1.5} /> Pause</>
              ) : (
                <><PlayCircle size={16} strokeWidth={1.5} /> Unpause</>
              )}
            </Button>

            <Button 
              onClick={() => setIsDeleteModalOpen(true)} 
              variant="destructive" 
              className="flex-1 sm:flex-none gap-2 rounded-xl"
            >
              <Trash2 size={16} strokeWidth={1.5} />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
          <div className="flex items-center gap-2 mb-1">
            {(() => {
              const platform = scraper.platform || 'reddit';
              if (platform === 'reddit') return <Icons.MessageSquare size={14} className="text-[#5a8c12]" />;
              if (platform === 'hackernews') return <Icons.Hash size={14} className="text-[#5a8c12]" />;
              if (platform === 'stackoverflow') return <Icons.Code size={14} className="text-[#5a8c12]" />;
              if (platform === 'craigslist') return <Icons.MapPin size={14} className="text-[#5a8c12]" />;
              return null;
            })()}
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 capitalize">Target ({scraper.platform || 'reddit'})</p>
          </div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {scraper.platform === 'craigslist' 
              ? `${scraper.city} (${scraper.category})`
              : scraper.platform === 'hackernews'
                ? `HN: ${scraper.category || 'newest'}`
                : (scraper.platform === 'reddit' || !scraper.platform) 
                  ? `r/${scraper.target || scraper.subreddit}` 
                  : scraper.target
            }
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Target Keywords</p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
            {(scraper.keyword || '').split(',').map((kw: string, i: number) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
                {kw.trim()}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Total Leads Found</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{scraperLeads.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-slate-500 dark:text-slate-400" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Last Run</p>
          </div>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {scraper.lastRunAt?.toDate ? format(scraper.lastRunAt.toDate(), 'MMM d, h:mm a') : 'Never'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Icons.ShieldCheck size={14} className="text-slate-500 dark:text-slate-400" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Trial Usage</p>
            </div>
            {scraper.portalToken && (
               <Button variant="ghost" className="h-5 px-1.5 text-[9px] font-black text-[#5a8c12] hover:bg-[#5a8c12]/10 uppercase tracking-widest" onClick={handleExtendTrial}>
                 Extend +10
               </Button>
            )}
          </div>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {scraper.totalPushedLeads || 0} / {scraper.trialLimit || 10}
            <span className="text-[10px] text-slate-400 ml-2 font-medium">Leads Pushed</span>
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                ((scraper.totalPushedLeads || 0) / (scraper.trialLimit || 10)) > 0.8 ? 'bg-amber-500' : 'bg-[#5a8c12]'
              }`} 
              style={{ width: `${Math.min(100, ((scraper.totalPushedLeads || 0) / (scraper.trialLimit || 10)) * 100)}%` }}
            />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
          <div className="flex items-center gap-2 mb-1">
            <Icons.MousePointer2 size={14} className="text-slate-500 dark:text-slate-400" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Engagement</p>
          </div>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {scraper.totalClientClicks || 0}
            <span className="text-[10px] text-slate-400 ml-2 font-medium uppercase tracking-widest">Clicks</span>
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Ideal Customer Profile (AI Instructions)</p>
        <p className="text-slate-700 dark:text-slate-300 italic text-sm leading-relaxed">
          "{scraper.idealCustomerProfile || scraper.leadDefinition || 'No specific definition provided. Using general intent scoring.'}"
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50 overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Database size={20} strokeWidth={1.5} className="text-[#5a8c12]" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Generated Leads Database</h2>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search leads by title, subreddit, or keyword..." 
              className="pl-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-10 focus-visible:ring-[#5a8c12] dark:text-slate-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {scraperLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No leads generated yet for this scraper.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[80px]">Score</TableHead>
                  <TableHead className="w-[150px]">User</TableHead>
                  <TableHead>Post Title & Content</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">🚀 Push</TableHead>
                  <TableHead className="w-[100px]">👁️ Activity</TableHead>
                  <TableHead className="text-right w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeads.map((lead) => {
                  const dateObj = lead.createdAt?.toMillis ? new Date(lead.createdAt.toMillis()) : new Date();
                  const clientPhone = scraper?.clientPhone || '';
                  // Use web.whatsapp.com for a more direct experience on desktop
                  const whatsappUrl = `https://web.whatsapp.com/send?phone=${clientPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(lead.whatsappMessage || '')}`;
                  
                  const handleCopyMessage = (text: string, id: string) => {
                    navigator.clipboard.writeText(text);
                    setCopiedId(id);
                    setTimeout(() => setCopiedId(null), 2000);
                  };
                  return (
                    <TableRow key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{format(dateObj, 'MMM dd')}</span>
                          <span className="text-[10px] text-slate-400">{format(dateObj, 'HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.score !== undefined ? (
                          <Tooltip>
                            <TooltipTrigger 
                              render={
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold cursor-help transition-all hover:scale-105 ${
                                  lead.score >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  lead.score >= 6 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {lead.score}/10
                                </span>
                              }
                            />
                            <TooltipContent side="top" className="w-80 p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                              <div className="bg-white dark:bg-slate-900">
                                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-[#5a8c12]/10 text-[#5a8c12]">
                                    <BrainCircuit size={14} />
                                  </div>
                                  <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">AI Analysis</span>
                                  <div className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    lead.score >= 8 ? 'bg-green-100 text-green-700' :
                                    lead.score >= 6 ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {lead.score}/10 Match
                                  </div>
                                </div>
                                <div className="p-4">
                                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">
                                    "{lead.reason}"
                                  </p>
                                </div>
                                <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">Scored by Gemini 1.5 Pro</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium whitespace-nowrap">
                          {(scraper.platform === 'reddit' || !scraper.platform) ? `u/${lead.postAuthor}` : lead.postAuthor}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 min-w-[300px] max-w-[500px]">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={lead.postTitle}>
                            {lead.postTitle}
                          </span>
                          {lead.postContent && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2" title={lead.postContent}>
                              {lead.postContent}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="outline-none">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${
                              lead.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                              lead.status === 'rejected' ? 'bg-slate-100 text-slate-500' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {lead.status || 'new'}
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 rounded-xl">
                            <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'new')} className="cursor-pointer font-bold text-xs uppercase">New</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'sent')} className="cursor-pointer font-bold text-xs uppercase">Sent</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'rejected')} className="cursor-pointer font-bold text-xs uppercase">Rejected</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                         <Button
                           size="sm"
                           onClick={() => handlePushToPortal(lead)}
                           className={`h-8 rounded-lg gap-2 font-black text-[10px] uppercase tracking-widest ${
                             lead.pushedToPortal 
                               ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100' 
                               : 'bg-[#5a8c12] hover:bg-[#4a730f] text-white'
                           }`}
                         >
                           {lead.pushedToPortal ? <Icons.CheckCheck size={12} /> : <Icons.Zap size={12} />}
                           {lead.pushedToPortal ? 'Pushed' : 'Push'}
                         </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className={`text-xs font-black ${lead.clientViewCount ? 'text-[#5a8c12]' : 'text-slate-300'}`}>
                            {lead.clientViewCount || 0} CLICKS
                          </span>
                          {lead.clientFeedback && (
                            <Tooltip>
                              <TooltipTrigger render={<span className="text-[9px] text-amber-600 font-bold truncate max-w-[80px] cursor-help">💬 Feedback</span>} />
                              <TooltipContent>{lead.clientFeedback}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <a 
                            href={lead.postUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800 hover:bg-[#5a8c12]/10 text-[#5a8c12] transition-colors"
                            title="View Source"
                          >
                            <ExternalLink size={14} />
                          </a>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800 hover:bg-red-50 text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <ConfirmModal 
        open={isDeleteModalOpen} 
        onOpenChange={setIsDeleteModalOpen} 
        title="Delete Scraper"
        description="Are you sure you want to delete this scraper? All associated leads will remain."
        onConfirm={handleDelete}
        confirmText="Delete"
      />
    </div>
  );
}
