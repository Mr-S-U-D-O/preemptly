import React, { useEffect, useState } from 'react';
import { Target, Search, MoreHorizontal, User, Mail, MessageCircle, ExternalLink, Calendar, CheckCircle2, Users } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

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

  const openWhatsApp = (applicant: BetaApplicant) => {
    // Basic formatting: remove spaces/dashes. If it doesn't have a country code, the user might need to ensure it when entering.
    const cleanNumber = applicant.whatsapp.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hey ${applicant.name.split(' ')[0]}, I saw your application for Preemptly...`);
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, '_blank');
  };

  return (
    <div className="flex-1 overflow-auto bg-[#FAFAFA] min-h-screen">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Users size={28} className="text-[#5a8c12]" /> Beta Applicants
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Manage inbound beta signups and create client portals.</p>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search applicants..." 
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:border-black transition-colors"
            />
          </div>
        </div>

        {/* Content Table */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-medium text-sm">
              <thead className="bg-slate-50 border-b text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-4 pl-6">Applicant</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4 hidden md:table-cell">Target Persona</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y relative">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-slate-400">Loading applicants...</td>
                  </tr>
                ) : applicants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-slate-400">No applications yet.</td>
                  </tr>
                ) : (
                  applicants.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedApplicant(app)}>
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
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
                        <button 
                          onClick={(e) => { e.stopPropagation(); openWhatsApp(app); }}
                          className="bg-[#25D366] text-white p-2 rounded-lg opacity-80 hover:opacity-100 transition-opacity flex items-center gap-2 text-xs font-bold float-right"
                          title="Message on WhatsApp"
                        >
                          <MessageCircle size={14} /> <span className="hidden lg:inline">Message</span>
                        </button>
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
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedApplicant(null)} />
          <div className="relative w-full max-w-md bg-white h-full border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-black">Application Details</h2>
              <button onClick={() => setSelectedApplicant(null)} className="text-slate-400 hover:text-black font-bold text-xs uppercase">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-500">
                  {selectedApplicant.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black">{selectedApplicant.name}</h3>
                  <a href={selectedApplicant.website} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1 mt-1">
                    {selectedApplicant.company} <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 shadow-none flex items-center gap-1.5"><Mail size={12}/> Email</div>
                   <div className="text-sm font-medium break-all">{selectedApplicant.email}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 shadow-none flex items-center gap-1.5"><MessageCircle size={12}/> WhatsApp</div>
                   <div className="text-sm font-medium">{selectedApplicant.whatsapp}</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 shadow-none">The Target Persona</div>
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm leading-relaxed text-slate-700">
                  {selectedApplicant.prospect}
                </div>
              </div>

              {selectedApplicant.keywords && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 shadow-none">Seed Keywords</div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed text-slate-700">
                    {selectedApplicant.keywords}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 shadow-none flex items-center justify-between">
                  Status Management
                </div>
                <select 
                  value={selectedApplicant.status}
                  onChange={(e) => {
                    handleUpdateStatus(selectedApplicant.id, e.target.value);
                    setSelectedApplicant({...selectedApplicant, status: e.target.value as any});
                  }}
                  className="w-full bg-white border border-slate-200 p-3 rounded-xl font-medium outline-none focus:border-black"
                >
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="approved">Approved</option>
                </select>
              </div>

            </div>

            <div className="p-6 border-t bg-slate-50">
              <button 
                onClick={() => openWhatsApp(selectedApplicant)}
                className="w-full bg-[#25D366] text-white hover:bg-[#1DA851] transition-colors py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20"
              >
                <MessageCircle size={16} /> Open WhatsApp Chat
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Ensure you import Users at the top if adding to lucide-react imports
