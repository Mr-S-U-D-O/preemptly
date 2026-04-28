import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { ExternalLink, MessageCircle, Star, Clock, Zap, Lock, ChevronDown, ChevronUp, Send, LayoutGrid, List, ArrowUpDown, Trash2, CheckCircle, Sparkles, X, MessageSquare, Paperclip, Smile, ShieldCheck, ArrowRight, Infinity, Settings } from 'lucide-react';
import { ChatMessage } from '../types';
import { LiveTimestamp } from './LiveTimestamp';
import { ClientSetupModal } from './ClientSetupModal';
import { ClientSettingsModal } from './ClientSettingsModal';
import { SEO } from './SEO';
import { reportError } from '../utils/logger';
import { toast } from './ui/toast';

interface PortalLead {
  id: string;
  postTitle: string;
  postContent: string;
  postUrl: string;
  postAuthor: string;
  score?: number;
  reason?: string;
  platform?: string;
  createdAt: string;
  clientViewCount: number;
  clientFeedback: string;
  engagementOutcome?: string;
}

interface PortalData {
  clientName: string;
  scraperName: string;
  totalLeads: number;
  trialLimit: number;
  isPaid: boolean;
  leads: PortalLead[];
  isAiEnabled?: boolean;
  setupCompleted?: boolean;
  scrapers?: any[];
  clientSettings?: {
    isSoloFreelancer: boolean;
    clientBusiness: string;
    clientSells: string;
    clientDoes: string;
    clientTone: string;
    aiAggression: string;
    aiLength: string;
  };
}

export function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deletingLead, setDeletingLead] = useState<string | null>(null);
  const [generatingComment, setGeneratingComment] = useState<string | null>(null);
  const [aiComments, setAiComments] = useState<Record<string, string>>({});
  const [showAiModal, setShowAiModal] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [updatingOutcome, setUpdatingOutcome] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminTyping, setAdminTyping] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{name: string, data: string, type: string} | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatOpenRef = useRef(chatOpen);

  // Sync ref with state
  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  const fetchPortal = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${token}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Portal not found. This link may have expired.');
        throw new Error('Failed to load portal.');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
      reportError(err, { component: 'ClientPortal', action: 'fetchPortal', token });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPortal();
  }, [fetchPortal]);

  // Optimization: Update lastSeen once on mount/portal open
  useEffect(() => {
    if (!token) return;
    fetch(`/api/portal/${token}/presence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online: true }),
    }).catch(() => {});
  }, [token]);

  // SSE Chat stream
  useEffect(() => {
    if (!token) return;
    
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const setupSSE = () => {
      if (eventSource) eventSource.close();
      
      eventSource = new EventSource(`/api/portal/${token}/chat/stream`);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'messages') {
            setMessages(payload.messages);
            // Use ref to decide if we should show unread count
            if (!chatOpenRef.current) {
              const unreadMsgs = payload.messages.filter((m: ChatMessage) => m.sender === 'admin' && !m.isRead).length;
              setUnreadCount(unreadMsgs);
            }
          } else if (payload.type === 'meta') {
            setAdminTyping(payload.adminTyping);
          }
        } catch (e) {
          // Parse error, ignore incomplete streams
        }
      };

      eventSource.onerror = (err) => {
        // Stream broken. Native EventSource naturally retries, but we log for visibility.
        console.warn('SSE Chat Connection lost. Retrying...', err);
        // We don't need to manually reconnect, browser handles it, 
        // but we can monitor if it stays dead.
      };
    };

    setupSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [token]); // Removed chatOpen from dependencies to prevent reconnection on toggle

  useEffect(() => {
    // When chat opens, clear unread count and scroll to bottom
    if (chatOpen) {
      setUnreadCount(0);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [chatOpen, messages]);

  const emitTyping = (isTyping: boolean) => {
    fetch(`/api/portal/${token}/chat/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typing: isTyping, sender: 'client' })
    }).catch(() => {});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping(true);
    
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast('File is too large. Max 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({
        name: file.name,
        type: file.type,
        data: event.target?.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachedFile) || sendingMsg) return;

    const msg = newMessage.trim();
    const fileToSend = attachedFile;
    
    setNewMessage('');
    setAttachedFile(null);
    setShowEmojis(false);
    setSendingMsg(true);
    emitTyping(false);

    try {
      await fetch(`/api/portal/${token}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: msg, 
          sender: 'client',
          fileData: fileToSend?.data,
          fileName: fileToSend?.name,
          fileType: fileToSend?.type
        })
      });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch {
      toast('Failed to send message. Please try again.', 'error');
      setNewMessage(msg);
      if (fileToSend) setAttachedFile(fileToSend);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await fetch(`/api/portal/${token}/chat/messages/${msgId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('Are you sure you want to delete this entire chat? This will remove all messages from both ends.')) return;
    try {
      await fetch(`/api/portal/${token}/chat`, { method: 'DELETE' });
      setChatOpen(false);
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleClickLead = async (leadId: string, postUrl: string) => {
    // Track the click server-side
    fetch(`/api/portal/${token}/click/${leadId}`, { method: 'POST' }).catch(() => {});
    // Open the source
    window.open(postUrl, '_blank');
  };

  const handleFeedback = async (leadId: string) => {
    const text = feedbackText[leadId];
    if (!text?.trim()) return;

    try {
      await fetch(`/api/portal/${token}/feedback/${leadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: text.trim() }),
      });
      setFeedbackSent(s => ({ ...s, [leadId]: true }));
      setTimeout(() => setFeedbackSent(s => ({ ...s, [leadId]: false })), 3000);
    } catch {
      // Silent fail
    }
  };

  const handleOutcomeUpdate = async (leadId: string, outcome: string) => {
    setUpdatingOutcome(leadId);
    try {
      await fetch(`/api/portal/${token}/outcome/${leadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
      setData(prev => prev ? {
        ...prev,
        leads: prev.leads.map(l => l.id === leadId ? { ...l, engagementOutcome: outcome } : l)
      } : null);
      toast('Engagement updated.');
    } catch {
      toast('Failed to update engagement. Please try again.', 'error');
    } finally {
      setUpdatingOutcome(null);
    }
  };

  const handleDeleteLeadClick = (leadId: string) => {
    setConfirmDeleteId(leadId);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    const leadId = confirmDeleteId;
    setDeletingLead(leadId);
    setConfirmDeleteId(null);
    try {
      await fetch(`/api/portal/${token}/delete/${leadId}`, { method: 'POST' });
      // Update local state by removing the lead
      setData(prev => prev ? {
        ...prev,
        leads: prev.leads.filter(l => l.id !== leadId),
        totalLeads: prev.totalLeads - 1
      } : null);
      toast('Lead removed successfully.');
    } catch {
      toast('Failed to delete lead. Please try again.', 'error');
    } finally {
      setDeletingLead(null);
    }
  };

  const handleGenerateComment = async (leadId: string) => {
    setGeneratingComment(leadId);
    try {
      const res = await fetch(`/api/portal/${token}/generate-comment/${leadId}`, {
        method: 'POST'
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate comment');
      setAiComments(prev => ({ ...prev, [leadId]: json.comment }));
      setShowAiModal(leadId);
    } catch (err: any) {
      toast(err.message || 'AI Generation failed. Please try again.', 'error');
      reportError(err, { component: 'ClientPortal', action: 'handleGenerateComment', token, leadId });
    } finally {
      setGeneratingComment(null);
    }
  };

  const sortedLeads = data?.leads ? [...data.leads].sort((a, b) => {
    if (sortBy === 'date') {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    } else {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    }
  }) : [];

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#5a8c12] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading your matches...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-red-500" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-500 text-sm">{error || 'This portal link is invalid or has been deactivated.'}</p>
        </div>
      </div>
    );
  }

  const trialExhausted = !data.isPaid && data.totalLeads > data.trialLimit;

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO title={`${data?.clientName || 'Portal'} | Preemptly`} />
      {/* Setup Modal */}
      {!data.setupCompleted && data.scrapers && (
        <ClientSetupModal 
          scrapers={data.scrapers} 
          token={token || ''}
          onComplete={() => setData(prev => prev ? { ...prev, setupCompleted: true } : null)}
        />
      )}

      {/* Settings Modal */}
      {data.clientSettings && (
        <ClientSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          token={token || ''}
          currentSettings={data.clientSettings}
          onSave={(newSettings) => {
            setData(prev => prev ? {
              ...prev,
              clientSettings: newSettings
            } : null);
          }}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-md">
                <img src="/preemptly-mascot.png" alt="Preemptly" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 leading-tight">
                  {data.clientName}'s Matches
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Opportunity Portal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data.setupCompleted && data.isAiEnabled && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-[#5a8c12]/10 text-slate-400 hover:text-[#5a8c12] transition-all"
                  title="AI Settings"
                >
                  <Settings size={16} />
                </button>
              )}
              <div className="bg-[#5a8c12]/10 text-[#5a8c12] px-3 py-1.5 rounded-full text-xs font-black">
                {data.totalLeads} Lead{data.totalLeads !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="bg-white border-b border-slate-100 sticky top-[73px] z-40">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#5a8c12]' : 'text-slate-400'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-[#5a8c12]' : 'text-slate-400'}`}
            >
              <List size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
               <button 
                 onClick={() => {
                   if (sortBy === 'date') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                   else { setSortBy('date'); setSortOrder('desc'); }
                 }}
                 className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${sortBy === 'date' ? 'bg-white shadow-sm text-[#5a8c12]' : 'text-slate-400'}`}
               >
                 Date {sortBy === 'date' && <ArrowUpDown size={10} />}
               </button>
               <button 
                 onClick={() => {
                   if (sortBy === 'score') setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                   else { setSortBy('score'); setSortOrder('desc'); }
                 }}
                 className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5 ${sortBy === 'score' ? 'bg-white shadow-sm text-[#5a8c12]' : 'text-slate-400'}`}
               >
                 Score {sortBy === 'score' && <ArrowUpDown size={10} />}
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-4">
          <div className="flex-1 text-center">
            <p className="text-lg font-black text-slate-900">{data.totalLeads}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Opportunities Found</p>
          </div>
          <div className="w-px bg-slate-100" />
          <div className="flex-1 text-center">
            <p className="text-lg font-black text-[#5a8c12]">
              {data.leads.filter(l => (l.score || 0) >= 8).length}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">High Quality</p>
          </div>
          <div className="w-px bg-slate-100" />
          <div className="flex-1 text-center">
            <p className="text-lg font-black text-slate-900">
              {!data.isPaid ? `${Math.min(data.totalLeads, data.trialLimit)}/${data.trialLimit}` : '∞'}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {data.isPaid ? 'Unlimited' : 'Trial'}
            </p>
          </div>
        </div>
      </div>

      {/* Leads Container */}
      <div className={`max-w-4xl mx-auto px-4 py-6 ${viewMode === 'grid' ? 'space-y-4' : ''}`}>
        {viewMode === 'grid' ? (
          sortedLeads.map((lead, index) => {
            const isBlurred = !data.isPaid && index >= data.trialLimit;
            const isExpanded = expandedLead === lead.id;

            return (
              <div
                key={lead.id}
                className={`bg-white rounded-2xl border-2 transition-all duration-300 ${
                  isBlurred 
                    ? 'border-slate-100 opacity-60'
                    : (lead.score || 0) >= 8 
                      ? 'border-[#5a8c12]/30 shadow-[0_4px_20px_rgba(90,140,18,0.08)]' 
                      : 'border-slate-100 shadow-sm'
                }`}
              >
                {/* Lead Card */}
                <div className="p-4">
                  {/* Top Row: Score + Date */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {lead.score !== undefined && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black ${
                          lead.score >= 8 ? 'bg-green-50 text-green-700' :
                          lead.score >= 6 ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                          <Star size={10} fill="currentColor" />
                          {lead.score}/10
                        </span>
                      )}
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        {lead.platform || 'reddit'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <Clock size={12} />
                        <LiveTimestamp date={lead.createdAt} />
                      </div>
                       {!isBlurred && (
                         <button 
                           onClick={() => handleDeleteLeadClick(lead.id)}
                           disabled={deletingLead === lead.id}
                           className="text-slate-300 hover:text-red-400 transition-colors p-1"
                           title="Dismiss lead"
                         >
                           <Trash2 size={14} />
                         </button>
                       )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className={`text-sm font-bold text-slate-800 leading-snug mb-2 ${
                    isBlurred ? 'blur-sm select-none' : ''
                  }`}>
                    {lead.postTitle}
                  </h3>

                  {/* AI Rationale */}
                  {lead.reason && (
                    <div className={`flex gap-3 bg-[#5a8c12]/5 rounded-xl p-3 mb-3 border border-[#5a8c12]/10 ${isBlurred ? 'blur-sm select-none' : ''}`}>
                       <div className="shrink-0 mt-0.5">
                         <Sparkles size={14} className="text-[#5a8c12]" />
                       </div>
                       <p className="text-xs text-slate-600 leading-relaxed">
                        <span className="font-black text-[#5a8c12] uppercase text-[9px] tracking-wider block mb-1">Match Rationale</span>
                        {lead.reason}
                       </p>
                    </div>
                  )}

                  {/* Expandable Content */}
                  {!isBlurred && lead.postContent && (
                    <button
                      onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                      className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 mb-3 transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isExpanded ? 'Hide details' : 'Show full post'}
                    </button>
                  )}
                  
                  {isExpanded && !isBlurred && (
                    <div className="bg-slate-50 rounded-xl p-3 mb-3 text-xs text-slate-600 leading-relaxed max-h-48 overflow-y-auto">
                      {lead.postContent}
                    </div>
                  )}

                  {/* Actions */}
                  {!isBlurred ? (
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-50">
                      <button
                        onClick={() => handleClickLead(lead.id, lead.postUrl)}
                        className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-100 text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-sm"
                      >
                        <ExternalLink size={14} className="text-[#5a8c12]" />
                        Open Post on {lead.platform || 'Platform'}
                      </button>
                      
                      {data.isAiEnabled && (
                        <button
                          onClick={() => handleGenerateComment(lead.id)}
                          disabled={generatingComment === lead.id}
                          className="w-full flex items-center justify-center gap-2 bg-[#5a8c12] hover:bg-[#4a730f] text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-colors shadow-lg shadow-[#5a8c12]/20 disabled:opacity-70"
                        >
                          {generatingComment === lead.id ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          Draft a reply
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-50">
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-slate-900 to-slate-700 hover:from-[#5a8c12] hover:to-[#4a730f] text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-all duration-300 shadow-lg"
                      >
                        <Lock size={13} />
                        Unlock Full Access
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Feedback Section (only for non-blurred leads) */}
                {!isBlurred && (
                  <div className="px-4 pb-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        {feedbackSent[lead.id] ? '✓ Feedback Sent!' : 'Was this match helpful?'}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="e.g. Too far away, great lead..."
                          value={feedbackText[lead.id] || ''}
                          onChange={(e) => setFeedbackText(s => ({ ...s, [lead.id]: e.target.value }))}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5a8c12]/20 focus:border-[#5a8c12]"
                        />
                        <button
                          onClick={() => handleFeedback(lead.id)}
                          className="w-8 h-8 bg-[#5a8c12] hover:bg-[#4a730f] text-white rounded-lg flex items-center justify-center transition-colors shrink-0"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Engagement Tracker */}
                    <div className="bg-slate-50 rounded-xl p-3 mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Engagement Tracking
                        </p>
                        {updatingOutcome === lead.id && (
                          <div className="w-3 h-3 border-2 border-[#5a8c12]/30 border-t-[#5a8c12] rounded-full animate-spin" />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleOutcomeUpdate(lead.id, 'engaged')}
                          className={`flex items-center gap-1 justify-center text-[9px] font-bold uppercase tracking-widest py-1.5 px-1 rounded-lg transition-colors border ${lead.engagementOutcome === 'engaged' ? 'bg-[#5a8c12] text-white border-[#5a8c12]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#5a8c12]/50'}`}
                        >
                          <MessageCircle size={10} />
                          Engaged
                        </button>
                        <button
                          onClick={() => handleOutcomeUpdate(lead.id, 'meeting_booked')}
                          className={`flex items-center gap-1 justify-center text-[9px] font-bold uppercase tracking-widest py-1.5 px-1 rounded-lg transition-colors border ${lead.engagementOutcome === 'meeting_booked' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-500/50'}`}
                        >
                          <CheckCircle size={10} />
                          Booked
                        </button>
                        <button
                          onClick={() => handleOutcomeUpdate(lead.id, 'not_interested')}
                          className={`text-[9px] font-bold uppercase tracking-widest py-1.5 px-1 rounded-lg transition-colors border ${lead.engagementOutcome === 'not_interested' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                        >
                          Not Interested
                        </button>
                        <button
                          onClick={() => handleOutcomeUpdate(lead.id, 'none')}
                          className={`text-[9px] font-bold uppercase tracking-widest py-1.5 px-1 rounded-lg transition-colors border ${lead.engagementOutcome === 'none' || !lead.engagementOutcome ? 'bg-slate-200 text-slate-600 border-slate-200' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                        >
                          None
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Post</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeads.map((lead, index) => {
                  const isBlurred = !data.isPaid && index >= data.trialLimit;
                  return (
                    <tr key={lead.id} className={`border-b border-slate-50 transition-colors ${isBlurred ? 'opacity-50' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-4 py-4 whitespace-nowrap text-[11px] font-bold text-slate-400 font-mono">
                        {format(new Date(lead.createdAt), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                          (lead.score || 0) >= 8 ? 'bg-green-100 text-green-700' :
                          (lead.score || 0) >= 6 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {lead.score || 0}/10
                        </span>
                      </td>
                      <td className="px-4 py-4 min-w-[300px]">
                        <div className={isBlurred ? 'blur-sm select-none' : ''}>
                          <p className="text-sm font-bold text-slate-800 line-clamp-1 mb-0.5">{lead.postTitle}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 italic">"{lead.reason}"</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {!isBlurred ? (
                          <div className="relative group">
                            <select
                              value={lead.engagementOutcome || 'none'}
                              onChange={(e) => handleOutcomeUpdate(lead.id, e.target.value)}
                              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 rounded-lg border appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5a8c12]/20 transition-colors ${
                                lead.engagementOutcome === 'engaged' ? 'bg-[#5a8c12]/10 text-[#5a8c12] border-[#5a8c12]/30' :
                                lead.engagementOutcome === 'meeting_booked' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                lead.engagementOutcome === 'not_interested' ? 'bg-slate-100 text-slate-600 border-slate-300' :
                                'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <option value="none">Status: None</option>
                              <option value="engaged">Engaged</option>
                              <option value="meeting_booked">Booked</option>
                              <option value="not_interested">Not Interested</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <ChevronDown size={10} />
                            </div>
                            {updatingOutcome === lead.id && (
                              <div className="absolute -right-4 top-1/2 -translate-y-1/2">
                                <div className="w-3 h-3 border-2 border-[#5a8c12]/30 border-t-[#5a8c12] rounded-full animate-spin" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-8 bg-slate-100 rounded-lg blur-sm" />
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isBlurred ? (
                             <>
                               <button 
                                 onClick={() => handleClickLead(lead.id, lead.postUrl)}
                                 className="w-8 h-8 rounded-lg bg-[#5a8c12]/10 text-[#5a8c12] flex items-center justify-center hover:bg-[#5a8c12] hover:text-white transition-all"
                               >
                                 <ExternalLink size={14} />
                               </button>
                               <button 
                                 onClick={() => handleDeleteLeadClick(lead.id)}
                                 className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                               >
                                 <Trash2 size={14} />
                               </button>
                             </>
                          ) : (
                            <Lock size={14} className="text-slate-300 mr-2" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Trial Exhausted Banner */}
        {trialExhausted && (
          <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
            {/* Gradient Header */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-center overflow-hidden">
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#5a8c12] to-transparent" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-[#5a8c12]/10 border border-[#5a8c12]/20 px-3 py-1.5 rounded-full mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5a8c12] animate-pulse" />
                  <span className="text-[10px] font-black text-[#5a8c12] uppercase tracking-widest">Trial Complete</span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-2">You've Seen the Proof.<br/>Now Scale It.</h2>
                <p className="text-slate-400 text-sm font-light max-w-sm mx-auto leading-relaxed">
                  Your {data.trialLimit} free intercepts were designed to show you exactly what Preemptly can do — before you commit to anything.
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4">
              {/* What unlocks */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <Infinity size={16} />, label: 'Unlimited Intercepts' },
                  { icon: <Sparkles size={16} />, label: 'AI Expert Drafts' },
                  { icon: <Zap size={16} />, label: 'Priority Alerts' },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col items-center gap-2 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-[#5a8c12]/10 text-[#5a8c12] flex items-center justify-center">{f.icon}</div>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-tight">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full bg-gradient-to-r from-slate-900 to-slate-700 hover:from-[#5a8c12] hover:to-[#4a730f] text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all duration-500 shadow-xl shadow-black/10 flex items-center justify-center gap-2 group"
              >
                Unlock Full Access — R500/mo
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="text-center text-[10px] text-slate-400 font-medium">
                Closed Beta rate. Locked in forever when you join now.
              </p>
            </div>
          </div>
        )}

        {/* === UPGRADE MODAL === */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100">

              {/* Modal Header */}
              <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-center overflow-hidden">
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#5a8c12] to-transparent" />
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors z-20"
                >
                  <X size={16} />
                </button>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#5a8c12]/10 border border-[#5a8c12]/20 flex items-center justify-center mx-auto mb-5">
                    <img src="/preemptly-mascot.png" alt="Preemptly" className="w-10 h-10 object-cover rounded-xl" />
                  </div>
                  <div className="inline-flex items-center gap-2 bg-[#5a8c12]/10 border border-[#5a8c12]/20 px-3 py-1.5 rounded-full mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5a8c12] animate-pulse" />
                    <span className="text-[10px] font-black text-[#5a8c12] uppercase tracking-widest">Closed Beta Access</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight mb-2">Unlock Your Full Portal</h3>
                  <div className="flex items-baseline justify-center gap-2 mt-3">
                    <span className="text-4xl font-black text-white tracking-tighter">R500</span>
                    <span className="text-slate-400 font-light">/month</span>
                    <span className="text-slate-500 text-sm line-through">R2,500</span>
                  </div>
                  <p className="text-[10px] text-[#5a8c12] font-bold uppercase tracking-widest mt-1">80% Beta Discount — Locked Forever</p>
                </div>
              </div>

              {/* What You Unlock */}
              <div className="px-8 pt-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">What you unlock</p>
                <div className="space-y-2.5">
                  {[
                    { icon: <Infinity size={14} />, title: 'Unlimited Intercepts', desc: 'Every relevant post, delivered in real-time, forever.' },
                    { icon: <Sparkles size={14} />, title: 'AI Expert Response Drafts', desc: 'One-click authority drafts tailored to each opportunity.' },
                    { icon: <Zap size={14} />, title: 'Priority Intent Alerts', desc: 'High-score leads (8+) flagged immediately.' },
                    { icon: <ShieldCheck size={14} />, title: 'Permanent Beta Rate', desc: 'Your R500/mo is locked in. No price increases. Ever.' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-7 h-7 rounded-lg bg-[#5a8c12]/10 text-[#5a8c12] flex items-center justify-center shrink-0 mt-0.5">{item.icon}</div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500 font-light">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust Note */}
              <div className="mx-8 mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck size={14} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-amber-800 mb-1">A Note on Our Payment Process</p>
                    <p className="text-[11px] text-amber-700 font-light leading-relaxed">
                      We're in the process of integrating a self-serve payment system. For now, upgrading is handled personally — you'll receive your payment details directly from the Preemptly founder, and your portal will be unlocked within minutes of confirmation.
                    </p>
                    <p className="text-[11px] text-amber-600 font-medium mt-1.5">
                      This is why we gave you real leads first — so you know exactly what you're paying for.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="p-8 pt-5 flex flex-col gap-3">
                <a
                  href={`https://wa.me/27738349023?text=${encodeURIComponent(`Hi! I've completed my Preemptly trial and I'd like to upgrade to the Closed Beta plan for ${data.clientName}. Please send me the payment details.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#1da851] text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2 group"
                >
                  <MessageCircle size={16} />
                  Contact Founder on WhatsApp
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </a>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all"
                >
                  Continue Viewing Trial Leads
                </button>
              </div>

              {/* Footer Trust */}
              <div className="px-8 pb-6 text-center">
                <p className="text-[10px] text-slate-400 font-medium">
                  🔒 Your upgrade is handled by the Preemptly founder directly. No bots, no delays.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Empty State */}
        {data.leads.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <Clock size={24} className="text-slate-300" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">No matches yet</h2>
            <p className="text-sm text-slate-500">
              Your matches are being monitored. You'll receive a WhatsApp notification when we find one.
            </p>
          </div>
        )}
      </div>

      {/* AI Comment Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-300">
            <div className="bg-[#5a8c12] p-6 text-white text-center">
               <Sparkles size={24} className="mx-auto mb-2" />
               <h3 className="text-xl font-black uppercase tracking-tight">Smart Helpful Comment</h3>
               <p className="text-white/70 text-xs font-medium mt-1">AI-generated draft based on your business profile</p>
            </div>
            <div className="p-8">
               <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200 mb-6">
                 <p className="text-sm text-slate-700 leading-relaxed font-medium italic">
                   "{aiComments[showAiModal]}"
                 </p>
               </div>
               <div className="flex flex-col gap-3">
                 <button
                   onClick={() => {
                     navigator.clipboard.writeText(aiComments[showAiModal] || '');
                     toast('Draft copied to clipboard!');
                     setShowAiModal(null);
                   }}
                   className="w-full bg-[#5a8c12] hover:bg-[#4a730f] text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-[#5a8c12]/20 flex items-center justify-center gap-2"
                 >
                   <Send size={14} /> Copy to Clipboard
                 </button>
                 <button
                   onClick={() => setShowAiModal(null)}
                   className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all"
                 >
                   Discard
                 </button>
               </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Edit this draft to match your personal style before posting</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white mt-8">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Growth Visibility powered by Preemptly • Expertise Extraction
          </p>
        </div>
      </footer>

      {/* Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 flex flex-col p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Remove Lead?</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to remove this lead from your dashboard? This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-red-500/20"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Support Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
        
        {/* Chat Pane */}
        <div 
          className={`pointer-events-auto w-[340px] bg-white rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden transition-all duration-300 flex flex-col origin-bottom-right mb-4 ${
            chatOpen ? 'scale-100 opacity-100 h-[480px]' : 'scale-95 opacity-0 h-0 pointer-events-none'
          }`}
        >
          {/* Header */}
          <div className="bg-[#5a8c12] p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-black text-sm tracking-tight leading-none">Support Team</h3>
                <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">Usually replies instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleDeleteChat}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Delete Chat History"
              >
                <Trash2 size={14} />
              </button>
              <button 
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-3 custom-scrollbar">
            <div className="text-center py-4">
              <div className="inline-block bg-slate-200/50 text-slate-500 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                Today
              </div>
              <p className="text-xs text-slate-500">Welcome to your Growth Portal! Drop a message below if you have any questions or feedback.</p>
            </div>
            
            {messages.map((msg) => {
              const isClient = msg.sender === 'client';
              return (
                <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'} group/msg relative`}>
                  <div 
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm relative ${
                      isClient 
                        ? 'bg-[#5a8c12] text-white rounded-br-sm' 
                        : 'bg-white text-slate-700 border border-slate-100 shadow-sm rounded-bl-sm'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    
                    {msg.fileName && msg.fileData && (
                      <div className={`mt-2 p-2 rounded-xl border flex items-center gap-2 ${isClient ? 'bg-black/10 border-transparent' : 'bg-slate-50 border-slate-200'}`}>
                        {msg.fileType?.startsWith('image/') ? (
                          <img src={msg.fileData} alt={msg.fileName} className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isClient ? 'bg-white/20' : 'bg-slate-200'}`}>
                            <Paperclip size={14} className={isClient ? 'text-white' : 'text-slate-500'} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{msg.fileName}</p>
                          <a href={msg.fileData} download={msg.fileName} className={`text-[10px] uppercase font-black hover:underline ${isClient ? 'text-white/80' : 'text-[#5a8c12]'}`}>
                            Download
                          </a>
                        </div>
                      </div>
                    )}

                    <span 
                      className={`text-[9px] font-bold uppercase tracking-wider block mt-1 ${
                        isClient ? 'text-white/60 text-right' : 'text-slate-400'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>

                    {/* Delete Message Button */}
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className={`absolute top-1/2 -translate-y-1/2 ${isClient ? '-left-8' : '-right-8'} opacity-0 group-hover/msg:opacity-100 p-1.5 text-slate-300 hover:text-red-400 transition-all`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {adminTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 w-16">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-1" />
          </div>
          
          {/* Input Area */}
          <div className="bg-white border-t border-slate-100">
            {/* Attachment preview */}
            {attachedFile && (
              <div className="px-3 pt-3 pb-1 flex items-center gap-2">
                <div className="bg-[#5a8c12]/10 border border-[#5a8c12]/20 rounded-xl px-3 py-1.5 flex items-center gap-2 max-w-full">
                  <Paperclip size={12} className="text-[#5a8c12] shrink-0" />
                  <span className="text-xs font-bold text-[#5a8c12] truncate">{attachedFile.name}</span>
                  <button onClick={() => setAttachedFile(null)} className="text-[#5a8c12]/70 hover:text-[#5a8c12] shrink-0 ml-1">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
            
            {/* Emoji Panel */}
            {showEmojis && (
              <div className="px-3 py-2 border-b border-slate-50 flex gap-2 overflow-x-auto custom-scrollbar bg-slate-50">
                {['👍', '🔥', '✅', '🙌', '🚀', '👀', '💡', '💯', '🤔', '👋'].map(emoji => (
                  <button 
                    key={emoji} 
                    type="button"
                    onClick={() => { setNewMessage(prev => prev + emoji); setShowEmojis(false); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-100 shadow-sm hover:bg-slate-100 shrink-0 text-lg transition-transform hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <form 
              onSubmit={handleSendMessage} 
              className="p-3 flex items-center gap-2 shrink-0"
            >
              <button 
                type="button"
                onClick={() => setShowEmojis(!showEmojis)}
                className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                title="Emojis"
              >
                <Smile size={18} />
              </button>
              
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                title="Attach file"
              >
                <Paperclip size={18} />
              </button>

              <input 
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Write a message..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5a8c12]/20 focus:border-[#5a8c12]/30 transition-all font-medium placeholder:font-normal placeholder:text-slate-400"
                disabled={sendingMsg}
              />
              <button 
                type="submit"
                disabled={(!newMessage.trim() && !attachedFile) || sendingMsg}
                className="w-10 h-10 shrink-0 bg-[#5a8c12] text-white rounded-xl flex items-center justify-center hover:bg-[#4a730f] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#5a8c12]/20"
              >
                {sendingMsg ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} className="translate-x-[1px]" />}
              </button>
            </form>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`pointer-events-auto h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl shadow-[#5a8c12]/20 focus:outline-none focus:ring-4 focus:ring-[#5a8c12]/20 relative ${
            chatOpen 
              ? 'bg-slate-800 text-white w-14' 
              : 'bg-[#5a8c12] text-white w-auto px-6 gap-2 hover:-translate-y-1'
          }`}
        >
          {chatOpen ? (
            <X size={24} />
          ) : (
            <>
              <div className="relative">
                <MessageCircle size={22} className="fill-[#5a8c12]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center border-2 border-[#5a8c12] px-1">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="font-black text-sm tracking-tight pr-1">Growth Support</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
