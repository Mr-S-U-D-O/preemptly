import { useParams, useNavigate } from 'react-router-dom';
import { useData } from './DataProvider';
import { format } from 'date-fns';
import { ExternalLink, Activity, PauseCircle, Trash2, RefreshCw, Database, Clock, PlayCircle, Search, BrainCircuit, MessageCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { doc, deleteDoc, collection, query, where, getDocs, setDoc, serverTimestamp, updateDoc, addDoc } from 'firebase/firestore';
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
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);

  const scraper = scrapers.find(s => s.id === id);
  const scraperLeads = leads.filter(l => l.scraperId === id);

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

      if (remaining === 0 && !isRetrying) {
        handleRetry();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scraper, isRetrying]);

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
    const timeA = a.createdAt?.toMillis?.() || 0;
    const timeB = b.createdAt?.toMillis?.() || 0;
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

  const handleStatusChange = async (leadId: string, status: 'new' | 'sent' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'leads');
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

  const handleRetry = async () => {
    if (!user) return;
    setIsRetrying(true);
    try {
      const response = await fetch(`/api/scrapers/${scraper.id}/run`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API returned ${response.status}`);
      }
      
      console.log("Scraper run completed successfully");
    } catch (error) {
      console.error("Manual scan failed:", error);
      alert("Failed to run scraper. Please check the logs.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col mb-6">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Pages / Scrapers / {scraper.name}</span>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{scraper.name}</h1>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${scraper.status === 'active' ? 'bg-[#5a8c12]/10 text-[#5a8c12]' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
              {scraper.status === 'active' ? <Activity size={14} strokeWidth={1.5} /> : <PauseCircle size={14} strokeWidth={1.5} />}
              {scraper.status.toUpperCase()}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
              onClick={handleRetry} 
              disabled={isRetrying}
              variant="outline" 
              className="flex-1 sm:flex-none gap-2 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl"
            >
              <RefreshCw size={16} strokeWidth={1.5} className={isRetrying ? 'animate-spin' : ''} />
              {isRetrying ? 'Running...' : 'Force Run'}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Target Subreddit</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">r/{scraper.subreddit}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Target Keyword</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">"{scraper.keyword}"</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
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
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-slate-500 dark:text-slate-400" />
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Next Auto-Run</p>
          </div>
          <p className={`text-lg font-bold ${countdown !== null && countdown < 60 ? 'text-[#5a8c12] animate-pulse' : 'text-slate-800 dark:text-slate-100'}`}>
            {countdown !== null ? (
              countdown > 60 
                ? `${Math.floor(countdown / 60)}m ${countdown % 60}s` 
                : `${countdown}s`
            ) : 'Paused'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-[#5a8c12] dark:border-[#5a8c12]/50">
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Lead Definition (AI Target)</p>
        <p className="text-slate-700 dark:text-slate-300 italic text-sm leading-relaxed">
          "{scraper.leadDefinition || 'No specific definition provided. Using general intent scoring.'}"
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
                  <TableHead className="w-[100px]">Time</TableHead>
                  <TableHead className="w-[80px]">Score</TableHead>
                  <TableHead className="w-[150px]">User</TableHead>
                  <TableHead>Post Title & Content</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="text-right w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLeads.map((lead) => {
                  const dateObj = lead.createdAt?.toMillis ? new Date(lead.createdAt.toMillis()) : new Date();
                  const clientPhone = scraper?.clientPhone || '';
                  const whatsappUrl = `https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(lead.whatsappMessage || '')}`;
                  
                  return (
                    <TableRow key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <TableCell className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {format(dateObj, 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {format(dateObj, 'HH:mm')}
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
                          u/{lead.postAuthor}
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="outline-none">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                              lead.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200' :
                              lead.status === 'rejected' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200'
                            }`}>
                              {lead.status === 'sent' && <CheckCircle2 size={12} />}
                              {lead.status === 'rejected' && <XCircle size={12} />}
                              {(!lead.status || lead.status === 'new') && <Clock size={12} />}
                              {(!lead.status || lead.status === 'new') ? 'New' : lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32 rounded-xl">
                            <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'new')} className="cursor-pointer">
                              <Clock className="mr-2 h-4 w-4 text-amber-500" /> New
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'sent')} className="cursor-pointer">
                              <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500" /> Sent
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(lead.id, 'rejected')} className="cursor-pointer">
                              <XCircle className="mr-2 h-4 w-4 text-slate-500" /> Rejected
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {clientPhone && lead.whatsappMessage && (
                            <a 
                              href={whatsappUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 transition-colors"
                              title="Send via WhatsApp"
                            >
                              <MessageCircle size={16} strokeWidth={1.5} />
                            </a>
                          )}
                          <a 
                            href={lead.postUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#5a8c12]/10 text-[#5a8c12] transition-colors"
                            title="View on Reddit"
                          >
                            <ExternalLink size={16} strokeWidth={1.5} />
                          </a>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 size={16} strokeWidth={1.5} />
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
