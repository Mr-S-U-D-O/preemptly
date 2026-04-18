import React, { useEffect, useState, useMemo } from 'react';
import { 
  Target, 
  Search, 
  Mail, 
  MessageCircle, 
  ExternalLink, 
  CheckCircle2, 
  Users, 
  Trash2, 
  Zap,
  Filter,
  ArrowRight
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SEO } from './SEO';
import { ConfirmModal } from './ConfirmModal';
import { AddScraperModal } from './AddScraperModal';
import { toast } from './ui/toast';

interface BetaApplicant {
  id: string;
  name: string;
  company: string;
  website: string;
  email: string;
  whatsapp: string;
  prospect: string;
  keywords: string;
  agreedToTerms: boolean;
  status: 'pending' | 'contacted' | 'approved';
  createdAt: any;
}

export function CRMView() {
  const [applicants, setApplicants] = useState<BetaApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState<BetaApplicant | null>(null);
  
  // Filtering & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'contacted' | 'approved'>('all');
  
  // Modals
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddScraperOpen, setIsAddScraperOpen] = useState(false);
  const [scraperInitialData, setScraperInitialData] = useState<any>(null);

  useEffect(() => {
    const q = query(
      collection(db, "beta_applicants"),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BetaApplicant[];
      
      setApplicants(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "beta_applicants", id), { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDeleteApplicant = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, "beta_applicants", deleteId));
      if (selectedApplicant?.id === deleteId) {
        setSelectedApplicant(null);
      }
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting applicant:", error);
      toast("Failed to delete applicant.", "error");
    }
  };

  const handleLaunchTracker = (applicant: BetaApplicant) => {
    setScraperInitialData({
      clientName: applicant.company || applicant.name,
      clientPhone: applicant.whatsapp.replace(/[^0-9]/g, ''),
      idealCustomerProfile: applicant.prospect,
      keyword: applicant.keywords === 'Not sure' ? '' : applicant.keywords
    });
    
    // Auto-approve if they launch a tracker
    if (applicant.status !== 'approved') {
      handleUpdateStatus(applicant.id, 'approved');
    }
    
    setIsAddScraperOpen(true);
  };

  const openWhatsApp = (applicant: BetaApplicant) => {
    const cleanNumber = applicant.whatsapp.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hey ${applicant.name.split(' ')[0]}, I saw your application for Preemptly...`);
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, '_blank');
  };

  // Memoized Filtered List
  const filteredApplicants = useMemo(() => {
    return applicants.filter(app => {
      const matchesSearch = 
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [applicants, searchTerm, statusFilter]);

  const stats = {
    total: applicants.length,
    pending: applicants.filter(a => a.status === 'pending').length,
    approved: applicants.filter(a => a.status === 'approved').length,
  };

  return (
    <div className="flex-1 overflow-auto bg-[#FAFAFA] min-h-screen">
      <SEO title="CRM | Preemptly" />
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Users size={28} className="text-[#5a8c12]" /> Growth Pipeline
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Manage visibility applications and launch client operations.</p>
            
            <div className="flex items-center gap-4 mt-4">
               <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Inbound</span>
                  <span className="text-xl font-black">{stats.total}</span>
               </div>
               <div className="w-px h-8 bg-slate-200" />
               <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Active Trials</span>
                  <span className="text-xl font-black text-[#5a8c12]">{stats.approved}</span>
               </div>
               <div className="w-px h-8 bg-slate-200" />
               <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Pending Review</span>
                  <span className="text-xl font-black text-amber-500">{stats.pending}</span>
               </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search leads..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:border-black transition-colors"
              />
            </div>
            
            {/* Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
               {(['all', 'pending', 'contacted', 'approved'] as const).map((s) => (
                 <button
                   key={s}
                   onClick={() => setStatusFilter(s)}
                   className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                     statusFilter === s 
                       ? 'bg-white text-black shadow-sm' 
                       : 'text-slate-500 hover:text-slate-800'
                   }`}
                 >
                   {s}
                 </button>
               ))}
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-medium text-sm">
              <thead className="bg-[#FAFAFA] border-b text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-4 pl-6 text-slate-400">Applicant</th>
                  <th className="p-4 text-slate-400">Contact</th>
                  <th className="p-4 hidden md:table-cell text-slate-400">Targeting</th>
                  <th className="p-4 text-slate-400">Status</th>
                  <th className="p-4 text-right pr-6 text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y relative">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-slate-400">Loading pipeline...</td>
                  </tr>
                ) : filteredApplicants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-slate-400">No matching applications found.</td>
                  </tr>
                ) : (
                  filteredApplicants.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedApplicant(app)}>
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-400 group-hover:border-black transition-colors">
                             {app.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-black transition-colors">{app.name}</div>
                            <div className="text-xs text-slate-500 font-normal">{app.company}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-600 flex items-center gap-1.5"><Mail size={12}/> {app.email}</span>
                          <span className="text-xs text-slate-600 flex items-center gap-1.5"><MessageCircle size={12}/> {app.whatsapp}</span>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <div className="max-w-[200px] truncate text-xs text-slate-500 font-normal" title={app.prospect}>
                          {app.prospect || 'Not provided'}
                        </div>
                        {app.keywords && app.keywords !== 'Not sure' && (
                          <div className="text-[10px] text-[#5a8c12] font-bold mt-1 uppercase tracking-tighter truncate max-w-[150px]">
                             {app.keywords}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          app.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); setDeleteId(app.id); }}
                             className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                             title="Delete Lead"
                           >
                             <Trash2 size={16} />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); openWhatsApp(app); }}
                             className="bg-[#25D366]/10 text-[#1DA851] p-2 rounded-lg hover:bg-[#25D366] hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                             title="Message on WhatsApp"
                           >
                             <MessageCircle size={16} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Detail Modal Overlay */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedApplicant(null)} />
          <div className="relative w-full max-w-md bg-white h-full border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight">Growth Visibility Profile</h2>
              <button onClick={() => setSelectedApplicant(null)} className="text-slate-400 hover:text-black font-bold text-xs uppercase tracking-widest">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center text-2xl font-black text-slate-300">
                  {selectedApplicant.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight leading-none mb-2">{selectedApplicant.name}</h3>
                  <a href={selectedApplicant.website} target="_blank" rel="noreferrer" className="text-sm font-bold text-[#5a8c12] hover:underline flex items-center gap-1">
                    {selectedApplicant.company} <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Quick Actions in Detail */}
              <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => handleLaunchTracker(selectedApplicant)}
                   className="flex items-center justify-center gap-2 bg-black text-white p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#5a8c12] transition-colors"
                 >
                   <Zap size={14} className="fill-current" /> Launch Tracker
                 </button>
                 <button 
                    onClick={() => openWhatsApp(selectedApplicant)}
                    className="flex items-center justify-center gap-2 border-2 border-slate-100 text-slate-600 p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:border-black transition-colors"
                 >
                    <MessageCircle size={14} /> WhatsApp
                 </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Mail size={12}/> Primary Email</div>
                   <div className="text-sm font-bold text-slate-800 break-all">{selectedApplicant.email}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MessageCircle size={12}/> WhatsApp Contact</div>
                   <div className="text-sm font-bold text-slate-800">{selectedApplicant.whatsapp}</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                   <Target size={12} className="text-[#5a8c12]" /> The Frustration (ICP)
                </div>
                <div className="p-5 bg-[#FAFAFA] border-2 border-slate-100 rounded-2xl text-sm leading-relaxed text-slate-700 italic font-medium">
                  "{selectedApplicant.prospect}"
                </div>
              </div>

              {selectedApplicant.keywords && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Seed Keywords / Platforms</div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm leading-relaxed text-[#5a8c12] font-black uppercase tracking-tighter">
                    {selectedApplicant.keywords}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Lifecycle Status
                </div>
                <select 
                  value={selectedApplicant.status}
                  onChange={(e) => {
                    handleUpdateStatus(selectedApplicant.id, e.target.value);
                    setSelectedApplicant({...selectedApplicant, status: e.target.value as any});
                  }}
                  className="w-full bg-white border-2 border-slate-100 p-4 rounded-2xl font-bold text-sm outline-none focus:border-black transition-colors appearance-none"
                >
                  <option value="pending">Pending Review</option>
                  <option value="contacted">Phase 1: Contacted</option>
                  <option value="approved">Phase 2: Approved / Active</option>
                </select>
              </div>

            </div>

            <div className="p-6 border-t bg-slate-50 mt-auto flex items-center gap-3">
              <button 
                onClick={() => setDeleteId(selectedApplicant.id)}
                className="p-4 text-slate-300 hover:text-red-500 transition-colors"
                title="Permanently Delete Lead"
              >
                <Trash2 size={20} />
              </button>
              <button 
                onClick={() => setSelectedApplicant(null)}
                className="flex-1 bg-white border-2 border-slate-200 text-black p-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:border-black transition-colors"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Deletion Confirmation */}
      <ConfirmModal
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Applicant?"
        description="This will permanently remove the lead from your growth pipeline and cannot be undone."
        confirmText="Permanently Delete"
        onConfirm={handleDeleteApplicant}
      />

      {/* Add Scraper Modal Integration */}
      <AddScraperModal 
        open={isAddScraperOpen}
        onOpenChange={setIsAddScraperOpen}
        initialData={scraperInitialData}
      />

    </div>
  );
}
