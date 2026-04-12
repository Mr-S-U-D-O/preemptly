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

type SortColumn = 'postTitle' | 'subreddit' | 'keyword' | 'score' | 'postAuthor' | 'createdAt' | 'status';
type SortDirection = 'asc' | 'desc';

export function LeadsTable({ leads, scrapers }: { leads: Lead[], scrapers: Scraper[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        message: `Lead pushed to ${scraper.clientName || 'client'} dashboard`,
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

  if (leads.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No leads found yet. Add an active scraper and wait for it to find matches.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search leads by title, subreddit, or keyword..." 
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
          <TableHead className="w-[200px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('postTitle')}>
            <div className="flex items-center">Post Title <SortIcon column="postTitle" /></div>
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
            <div className="flex items-center">Found <SortIcon column="createdAt" /></div>
          </TableHead>
          <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('status')}>
            <div className="flex items-center">Status <SortIcon column="status" /></div>
          </TableHead>
          <TableHead>Enrichment</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          {filteredAndSortedLeads.map((lead) => {
            const scraper = scrapers.find(s => s.id === lead.scraperId);
            const timeAgo = lead.createdAt?.toMillis 
              ? formatDistanceToNow(lead.createdAt.toMillis(), { addSuffix: true }) 
              : 'Just now';
            
            const clientPhone = scraper?.clientPhone || '';
            const whatsappUrl = `https://web.whatsapp.com/send?phone=${clientPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(lead.whatsappMessage || '')}`;
            
            const handleCopyMessage = (text: string, id: string) => {
              navigator.clipboard.writeText(text);
              setCopiedId(id);
              setTimeout(() => setCopiedId(null), 2000);
            };
            return (
              <TableRow key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
              <TableCell className="font-medium max-w-[200px] truncate dark:text-slate-200" title={lead.postTitle}>
                {lead.postTitle}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#5a8c12]/10 text-[#446715] dark:text-[#5a8c12] text-xs font-medium">
                  {(() => {
                    const platform = lead.platform || 'reddit';
                    if (platform === 'reddit') return <Icons.MessageSquare size={12} />;
                    if (platform === 'hackernews') return <Icons.Hash size={12} />;
                    if (platform === 'stackoverflow') return <Icons.Code size={12} />;
                    if (platform === 'craigslist') return <Icons.MapPin size={12} />;
                    return null;
                  })()}
                  {lead.platform === 'craigslist'
                    ? `${lead.city} (${lead.category})`
                    : lead.platform === 'hackernews'
                      ? `HN: ${lead.category || 'newest'}`
                      : (lead.platform === 'reddit' || !lead.platform) 
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
              <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                {(lead.platform === 'reddit' || !lead.platform) ? `u/${lead.postAuthor}` : lead.postAuthor}
              </TableCell>
              <TableCell className="text-slate-500 dark:text-slate-400 text-sm">{timeAgo}</TableCell>
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
              <TableCell>
                <div className="flex flex-col gap-1">
                  {lead.email && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                      <Icons.Mail size={10} /> {lead.email}
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                      <Icons.Phone size={10} /> {lead.phone}
                    </div>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                      <Icons.MapPin size={10} /> {lead.location}
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400">
                      <Icons.Briefcase size={10} /> {lead.company}
                    </div>
                  )}
                  {!lead.email && !lead.phone && !lead.location && !lead.company && (
                    <span className="text-[10px] text-slate-400 italic">No enrichment</span>
                  )}
                </div>
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
    </div>
  );
}
