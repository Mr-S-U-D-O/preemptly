import { Lead, Scraper } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';

type SortColumn = 'postTitle' | 'subreddit' | 'keyword' | 'score' | 'postAuthor' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export function LeadsTable({ leads, scrapers }: { leads: Lead[], scrapers: Scraper[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'leads');
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
      <Table>
      <TableHeader>
        <TableRow className="bg-slate-50/50 dark:bg-slate-800/50">
          <TableHead className="w-[200px] cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('postTitle')}>
            <div className="flex items-center">Post Title <SortIcon column="postTitle" /></div>
          </TableHead>
          <TableHead className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('subreddit')}>
            <div className="flex items-center">Subreddit <SortIcon column="subreddit" /></div>
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
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredAndSortedLeads.map((lead) => {
          const scraper = scrapers.find(s => s.id === lead.scraperId);
          const timeAgo = lead.createdAt?.toMillis 
            ? formatDistanceToNow(lead.createdAt.toMillis(), { addSuffix: true }) 
            : 'Just now';

          return (
            <TableRow key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
              <TableCell className="font-medium max-w-[200px] truncate dark:text-slate-200" title={lead.postTitle}>
                {lead.postTitle}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#5a8c12]/10 text-[#446715] dark:text-[#5a8c12] text-xs font-medium">
                  r/{lead.subreddit}
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#304513]/10 text-[#304513] dark:text-[#84b53b] text-xs font-medium">
                  "{lead.keyword}"
                </span>
              </TableCell>
              <TableCell>
                {lead.score !== undefined ? (
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                    lead.score >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    lead.score >= 6 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`} title={lead.reason}>
                    {lead.score}/10
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                )}
              </TableCell>
              <TableCell className="text-slate-500 dark:text-slate-400 text-sm">u/{lead.postAuthor}</TableCell>
              <TableCell className="text-slate-500 dark:text-slate-400 text-sm">{timeAgo}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
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
  );
}
