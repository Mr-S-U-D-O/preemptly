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
  const [isStatusToggling, setIsStatusToggling] = useState(false);

  const scraper = scrapers.find(s => s.id === id);
  const scraperLeads = leads.filter(l => l.scraperId === id);

  // Search/Filter state
  const [isDeploying, setIsDeploying] = useState(false);

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
    let base = scraperLeads;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      base = base.filter(lead => 
        lead.postTitle.toLowerCase().includes(query) ||
        lead.subreddit?.toLowerCase().includes(query) ||
        lead.keyword?.toLowerCase().includes(query)
      );
    }
    return base.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  }, [scraperLeads, searchQuery]);

  const inboxLeads = filteredLeads.filter(l => !l.pushedToPortal);
  const sentLeads = filteredLeads.filter(l => l.pushedToPortal);

  if (!scraper) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Monitor not found or loading...
      </div>
    );
  }

  const handleToggleStatus = async () => {
    setIsStatusToggling(true);
    try {
      const newStatus = scraper.status === 'active' ? 'paused' : 'active';
      await updateDoc(doc(db, 'scrapers', scraper.id), { status: newStatus });
      
      // Log the action
      await addDoc(collection(db, 'logs'), {
        type: newStatus === 'active' ? 'scraper_resumed' : 'scraper_paused',
        scraperId: scraper.id,
        scraperName: scraper.name,
        message: `Monitor "${scraper.name}" ${newStatus === 'active' ? 'resumed' : 'paused'}`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'scrapers');
    } finally {
      setIsStatusToggling(false);
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
        message: `Intelligence alert pushed to ${scraper.clientName || 'client'} dashboard`,
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
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1 truncate max-w-full">Surveillance / Monitors / {scraper.name}</span>
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
            <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="gap-2 rounded-xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <Icons.LayoutDashboard size={16} /> Manage Portals
              </Button>

            <Button 
              onClick={handleToggleStatus} 
              variant="outline" 
              disabled={isStatusToggling}
              className={`flex-1 sm:flex-none gap-2 rounded-xl border-2 transition-colors ${
                scraper.status === 'active' 
                  ? 'border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' 
                  : 'border-[#5a8c12] text-[#5a8c12] hover:bg-[#5a8c12]/10'
              }`}
            >
              {isStatusToggling ? (
                <><Icons.Loader2 className="animate-spin" size={16} strokeWidth={1.5} /> Processing...</>
              ) : scraper.status === 'active' ? (
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
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Intelligence Alerts</p>
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
            <div className="flex items-center gap-2">
              <Icons.ShieldCheck size={14} className="text-slate-500 dark:text-slate-400" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Trial Usage</p>
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
            <div className="w-10 h-10 rounded-xl bg-[#5a8c12]/10 border border-[#5a8c12]/20 flex items-center justify-center">
              <Activity size={18} strokeWidth={2} className="text-[#5a8c12]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Intelligence Inbox</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Process new opportunities</p>
            </div>
          </div>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search matches..." 
              className="pl-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-10 focus-visible:ring-[#5a8c12] dark:text-slate-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {inboxLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
             <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} className="text-[#5a8c12]" />
             </div>
             <p className="text-sm font-bold">Mailbox Empty!</p>
             <p className="text-xs text-slate-400">No new leads to process for this scraper.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[80px]">Score</TableHead>
                  <TableHead>Opportunity Analysis</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[120px]">🚀 Dispatch</TableHead>
                  <TableHead className="text-right w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inboxLeads.map((lead) => {
                  const dateObj = lead.createdAt?.toMillis ? new Date(lead.createdAt.toMillis()) : new Date();
                  return (
                    <TableRow key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group">
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{format(dateObj, 'MMM dd')}</span>
                          <span className="text-[10px] text-slate-400">{format(dateObj, 'HH:mm')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger 
                            render={
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black cursor-help transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                                lead.score >= 8 ? 'bg-gradient-to-r from-green-100 to-emerald-50 text-green-700 dark:from-green-900/40 dark:to-emerald-900/20 dark:text-green-400 ring-1 ring-green-200/50 dark:ring-green-800/30' :
                                lead.score >= 6 ? 'bg-gradient-to-r from-amber-100 to-yellow-50 text-amber-700 dark:from-amber-900/40 dark:to-yellow-900/20 dark:text-amber-400 ring-1 ring-amber-200/50 dark:ring-amber-800/30' :
                                'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-600 dark:from-slate-800 dark:to-slate-800/50 dark:text-slate-400 ring-1 ring-slate-200/50 dark:ring-slate-700/30'
                              }`}>
                                <BrainCircuit size={11} />
                                {lead.score}/10
                              </span>
                            }
                          />
                          <TooltipContent side="top" className="w-96 p-0 overflow-hidden border-none shadow-2xl shadow-black/20 rounded-2xl backdrop-blur-xl">
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                              {/* Header */}
                              <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-800/40 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#5a8c12]/20 to-[#84b53b]/10 text-[#5a8c12]">
                                  <BrainCircuit size={14} strokeWidth={2.5} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-200">AI Analysis</span>
                                <div className={`ml-auto px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
                                  lead.score >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  lead.score >= 6 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                  'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {lead.score >= 8 ? '🔥' : lead.score >= 6 ? '⚡' : '○'} {lead.score}/10
                                </div>
                              </div>
                              {/* Body */}
                              <div className="p-4">
                                <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                  "{lead.reason}"
                                </p>
                              </div>
                              {/* Footer */}
                              <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50/80 to-transparent dark:from-slate-800/40 border-t border-slate-100/50 dark:border-slate-700/30 flex items-center justify-between">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em]">Powered by Gemini AI</span>
                                <div className={`w-2 h-2 rounded-full animate-pulse ${
                                  lead.score >= 8 ? 'bg-green-400' : lead.score >= 6 ? 'bg-amber-400' : 'bg-slate-300'
                                }`} />
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <div className="flex flex-col gap-1 max-w-md cursor-help">
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {lead.postTitle}
                                </span>
                                <div className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 whitespace-normal break-words">
                                  {lead.postContent}
                                </div>
                              </div>
                            }
                          />
                          <TooltipContent side="bottom" className="w-[420px] p-0 overflow-hidden border-none shadow-2xl shadow-black/20 rounded-2xl backdrop-blur-xl">
                            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                              {/* Header */}
                              <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-800/40 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/15 to-indigo-500/10 text-blue-600 dark:text-blue-400">
                                  <MessageCircle size={14} strokeWidth={2.5} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-200">Full Post Preview</span>
                              </div>
                              {/* Body */}
                              <div className="p-4 space-y-3">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                  {lead.postTitle}
                                </h4>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                  <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                                    {lead.postContent || 'No content available for this post.'}
                                  </p>
                                </div>
                              </div>
                              {/* Footer */}
                              <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50/80 to-transparent dark:from-slate-800/40 border-t border-slate-100/50 dark:border-slate-700/30 flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em]">
                                  {lead.postAuthor ? `by ${lead.postAuthor}` : 'Source post'}
                                </span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="outline-none">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer ${
                              lead.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                              lead.status === 'rejected' ? 'bg-red-50 text-red-500' :
                              lead.status === 'viewed' ? 'bg-slate-100 text-[#5a8c12]' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {lead.status || 'new'}
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 rounded-xl">
                            <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'new')} className="cursor-pointer font-bold text-xs uppercase">New</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'viewed')} className="cursor-pointer font-bold text-xs uppercase">Viewed</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'rejected')} className="cursor-pointer font-bold text-xs uppercase">Rejected</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                         <Button
                           size="sm"
                           onClick={() => handlePushToPortal(lead)}
                           className="h-8 rounded-lg bg-[#5a8c12] hover:bg-[#4a730f] text-white gap-2 font-black text-[10px] uppercase tracking-widest"
                         >
                           <Icons.Zap size={12} /> Push
                         </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={lead.postUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-[#5a8c12]">
                            <ExternalLink size={14} />
                          </a>
                          <button onClick={() => handleDeleteLead(lead.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
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

      {/* Leads Sent Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Icons.Zap size={18} className="text-blue-500" />
             </div>
             <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Intelligence Dispatch</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Track client engagement & review feedback</p>
             </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full">
             {sentLeads.length} Total Dispatched
          </div>
        </div>

        {sentLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic text-sm">
             No leads have been pushed to the client yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
                  <TableHead className="w-[120px]">Sent Date</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead className="w-[120px] text-center">Engagement</TableHead>
                  <TableHead className="w-[150px]">Current Status</TableHead>
                  <TableHead>Client Feedback</TableHead>
                  <TableHead className="text-right w-[80px]">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentLeads.map((lead) => {
                  const dateObj = lead.createdAt?.toMillis ? new Date(lead.createdAt.toMillis()) : new Date();
                  return (
                    <TableRow key={lead.id} className="hover:bg-blue-50/30">
                      <TableCell className="whitespace-nowrap">
                         <div className="text-[11px] font-bold text-slate-500">{format(dateObj, 'MMM dd, HH:mm')}</div>
                      </TableCell>
                      <TableCell>
                         <div className="text-sm font-bold text-slate-700 truncate max-w-[200px]" title={lead.postTitle}>
                            {lead.postTitle}
                         </div>
                      </TableCell>
                      <TableCell className="text-center">
                         <div className={`text-xs font-black px-2 py-1 rounded-lg ${lead.clientViewCount ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300'}`}>
                            {lead.clientViewCount || 0} CLICKS
                         </div>
                      </TableCell>
                      <TableCell>
                         <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                           lead.status === 'sent' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                           lead.status === 'viewed' ? 'bg-green-50 text-green-600 border-green-100' :
                           'bg-slate-50 text-slate-400 border-slate-100'
                         }`}>
                           {lead.status === 'sent' ? <Icons.Send size={10}/> : null}
                           {lead.status}
                         </span>
                      </TableCell>
                      <TableCell>
                         {lead.clientFeedback ? (
                           <div className="text-xs text-blue-600 italic bg-blue-50/50 p-2 rounded-lg border border-blue-100 max-w-[200px]">
                              "{lead.clientFeedback}"
                           </div>
                         ) : (
                           <span className="text-[10px] text-slate-300 italic">No feedback yet</span>
                         )}
                      </TableCell>
                      <TableCell className="text-right">
                         <a href={lead.postUrl} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-blue-500">
                            <ExternalLink size={14} />
                         </a>
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
        title="Delete Monitor"
        description="Are you sure you want to delete this intelligence monitor? Existing alerts will remain in the system."
        onConfirm={handleDelete}
        confirmText="Delete"
      />
    </div>
  );
}
