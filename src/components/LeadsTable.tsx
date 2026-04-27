import { Lead, Scraper } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, BrainCircuit, CheckCircle2, XCircle, Clock, MessageCircle, Copy, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { LiveTimestamp } from './LiveTimestamp';

type SortColumn = 'postTitle' | 'subreddit' | 'keyword' | 'score' | 'postAuthor' | 'createdAt' | 'status';
type SortDirection = 'asc' | 'desc';

export function LeadsTable({ leads, scrapers }: { leads: Lead[], scrapers: Scraper[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { user } = useAuth();

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'leads');
    }
  };

  const handlePushToPortal = async (lead: any, scraper: any) => {
    if (!scraper) return;
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
        message: `Opportunity shared with ${scraper.clientName || 'client'} portal`,
        createdAt: serverTimestamp(),
        userId: user?.uid
      });
    } catch (error) {
      console.error("Failed to push lead:", error);
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-slate-400" />;
    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-[#5a8c12]" /> : <ArrowDown className="ml-2 h-4 w-4 text-[#5a8c12]" />;
  };

  const filteredAndSortedLeads = useMemo(() => {
    let result = leads;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(lead => 
        lead.postTitle.toLowerCase().includes(query) ||
        lead.subreddit.toLowerCase().includes(query) ||
        lead.keyword.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      if (sortColumn === 'createdAt') {
        aValue = a.createdAt?.toMillis?.() || 0;
        bValue = b.createdAt?.toMillis?.() || 0;
      }

      // Handle undefined scores
      if (sortColumn === 'score') {
        aValue = aValue ?? -1;
        bValue = bValue ?? -1;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [leads, searchQuery, sortColumn, sortDirection]);

  // Reset to first page when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredAndSortedLeads.length / pageSize);
  const paginatedLeads = filteredAndSortedLeads.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  if (leads.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No matches found yet. Add an active monitor and wait for growth opportunities.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search matches by content, brand, or community..." 
            className="pl-9 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl h-10 focus-visible:ring-[#5a8c12] dark:text-slate-100"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
      <TableHeader>
        <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
          <TableHead className="w-[300px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('postTitle')}>
            <div className="flex items-center">Match <SortIcon column="postTitle" /></div>
          </TableHead>
          <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('subreddit')}>
            <div className="flex items-center">Target <SortIcon column="subreddit" /></div>
          </TableHead>
          <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('keyword')}>
            <div className="flex items-center">Keyword Matched <SortIcon column="keyword" /></div>
          </TableHead>
          <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('score')}>
            <div className="flex items-center">Score <SortIcon column="score" /></div>
          </TableHead>
          <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('postAuthor')}>
            <div className="flex items-center">Author <SortIcon column="postAuthor" /></div>
          </TableHead>
          <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('createdAt')}>
            <div className="flex items-center">Visibility Speed <SortIcon column="createdAt" /></div>
          </TableHead>
          <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('status')}>
            <div className="flex items-center">Status <SortIcon column="status" /></div>
          </TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          {paginatedLeads.map((lead) => {
            const scraper = scrapers.find(s => s.id === lead.scraperId);
            
            const clientPhone = scraper?.clientPhone || '';
            const whatsappUrl = `https://web.whatsapp.com/send?phone=${clientPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(lead.whatsappMessage || '')}`;
            
            const handleCopyMessage = (text: string, id: string) => {
              navigator.clipboard.writeText(text);
              setCopiedId(id);
              setTimeout(() => setCopiedId(null), 2000);
            };
            return (
              <TableRow key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
              <TableCell>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="flex flex-col gap-1 max-w-[300px] cursor-help">
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
                      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/80 dark:to-slate-800/40 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/15 to-indigo-500/10 text-blue-600 dark:text-blue-400">
                          <MessageCircle size={14} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-200">Full Post Preview</span>
                      </div>
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
                      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50/80 to-transparent dark:from-slate-800/40 border-t border-slate-100/50 dark:border-slate-700/30 flex items-center gap-2">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em]">
                          {lead.postAuthor ? `by ${(lead.platform === 'reddit' || !lead.platform) ? 'u/' : ''}${lead.postAuthor}` : 'Source post'}
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#5a8c12]/10 text-[#446715] dark:text-[#5a8c12] text-xs font-medium">
                  {(() => {
                    const platform = lead.platform || 'reddit';
                    if (platform === 'reddit') return <Icons.MessageSquare size={12} />;
                    if (platform === 'stackoverflow') return <Icons.Code size={12} />;
                    return null;
                  })()}
                  {(lead.platform === 'reddit' || !lead.platform) 
                      ? `r/${lead.target || lead.subreddit}` 
                      : (lead.target || lead.subreddit)
                  }
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#304513]/10 text-[#304513] dark:text-[#84b53b] text-xs font-medium">
                  "{lead.keyword}"
                </span>
              </TableCell>
              <TableCell>
                {lead.score !== undefined ? (
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
                        <div className="p-4">
                          <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            "{lead.reason}"
                          </p>
                        </div>
                        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50/80 to-transparent dark:from-slate-800/40 border-t border-slate-100/50 dark:border-slate-700/30 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em]">Powered by Gemini AI</span>
                          <div className={`w-2 h-2 rounded-full animate-pulse ${
                            lead.score >= 8 ? 'bg-green-400' : lead.score >= 6 ? 'bg-amber-400' : 'bg-slate-300'
                          }`} />
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                )}
              </TableCell>
              <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                {(lead.platform === 'reddit' || !lead.platform) ? `u/${lead.postAuthor}` : lead.postAuthor}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  {lead.pubDate && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tight ${
                        (() => {
                          const created = lead.createdAt?.toMillis?.() || Date.now();
                          const published = new Date(lead.pubDate).getTime();
                          const diffMinutes = Math.floor((created - published) / 60000);
                          if (diffMinutes < 15) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
                          if (diffMinutes < 60) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                          return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
                        })()
                      }`}>
                        <Icons.Zap size={8} />
                        {(() => {
                          const created = lead.createdAt?.toMillis?.() || Date.now();
                          const published = new Date(lead.pubDate).getTime();
                          const diff = created - published;
                          const mins = Math.max(1, Math.floor(diff / 60000));
                          if (mins < 60) return `${mins}m Reaction`;
                          const hrs = Math.floor(mins / 60);
                          if (hrs < 24) return `${hrs}h Reaction`;
                          return `${Math.floor(hrs / 24)}d Reaction`;
                        })()}
                      </span>
                    </div>
                  )}
                  <LiveTimestamp date={lead.createdAt} />
                </div>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  lead.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  lead.status === 'rejected' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {lead.status === 'sent' && <CheckCircle2 size={12} />}
                  {lead.status === 'rejected' && <XCircle size={12} />}
                  {(!lead.status || lead.status === 'new') && <Clock size={12} />}
                  {(!lead.status || lead.status === 'new') ? 'New' : lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {scraper && lead.whatsappMessage && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handlePushToPortal(lead, scraper)}
                          className={`h-8 rounded-lg gap-2 font-black text-[10px] uppercase tracking-widest ${
                            lead.pushedToPortal 
                              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100' 
                              : 'bg-[#5a8c12] hover:bg-[#4a730f] text-white'
                          }`}
                        >
                          {lead.pushedToPortal ? <Icons.CheckCheck size={12} /> : <Icons.Zap size={12} />}
                          {lead.pushedToPortal ? 'Pushed' : 'Push'}
                        </Button>
                      </>
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
                    title="Delete Match"
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

    {/* Pagination Controls */}
    {totalPages > 1 && (
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30">
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="text-slate-900 dark:text-slate-300">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-slate-900 dark:text-slate-300">{Math.min(currentPage * pageSize, filteredAndSortedLeads.length)}</span> of <span className="text-slate-900 dark:text-slate-300">{filteredAndSortedLeads.length}</span> matches
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 rounded-lg border-2"
          >
            <Icons.ChevronLeft size={16} />
          </Button>
          
          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 p-0 rounded-lg border-2 ${currentPage === pageNum ? 'bg-[#5a8c12] border-[#5a8c12]' : ''}`}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0 rounded-lg border-2"
          >
            <Icons.ChevronRight size={16} />
          </Button>
        </div>
      </div>
    )}
    </div>
  );
}
