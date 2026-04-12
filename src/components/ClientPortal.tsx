import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { ExternalLink, MessageCircle, Star, Clock, Zap, Lock, ChevronDown, ChevronUp, Send } from 'lucide-react';

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
}

interface PortalData {
  clientName: string;
  scraperName: string;
  totalLeads: number;
  trialLimit: number;
  isPaid: boolean;
  leads: PortalLead[];
}

export function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});

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
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPortal();
  }, [fetchPortal]);

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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#5a8c12] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading your leads...</p>
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
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#5a8c12] flex items-center justify-center shadow-md">
                <Zap size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900 leading-tight">
                  {data.clientName}'s Leads
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Powered by IntentFirstHunter
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-[#5a8c12]/10 text-[#5a8c12] px-3 py-1.5 rounded-full text-xs font-black">
                {data.totalLeads} Lead{data.totalLeads !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-4">
          <div className="flex-1 text-center">
            <p className="text-lg font-black text-slate-900">{data.totalLeads}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Opportunities</p>
          </div>
          <div className="w-px bg-slate-100" />
          <div className="flex-1 text-center">
            <p className="text-lg font-black text-[#5a8c12]">
              {data.leads.filter(l => (l.score || 0) >= 8).length}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hot Leads</p>
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

      {/* Leads */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {data.leads.map((lead, index) => {
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
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock size={10} />
                    {formatDate(lead.createdAt)}
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-sm font-bold text-slate-800 leading-snug mb-2 ${
                  isBlurred ? 'blur-sm select-none' : ''
                }`}>
                  {lead.postTitle}
                </h3>

                {/* AI Reason */}
                {lead.reason && (
                  <p className={`text-xs text-slate-500 leading-relaxed mb-3 ${
                    isBlurred ? 'blur-sm select-none' : ''
                  }`}>
                    <span className="font-bold text-[#5a8c12]">Why this is a lead:</span> {lead.reason}
                  </p>
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
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                    <button
                      onClick={() => handleClickLead(lead.id, lead.postUrl)}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#5a8c12] hover:bg-[#4a730f] text-white text-xs font-black uppercase tracking-widest py-3 rounded-xl transition-colors shadow-sm"
                    >
                      <ExternalLink size={14} />
                      Contact This Lead
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-50">
                    <Lock size={14} className="text-slate-300" />
                    <span className="text-xs font-bold text-slate-400">Upgrade to unlock</span>
                  </div>
                )}
              </div>

              {/* Feedback Section (only for non-blurred leads) */}
              {!isBlurred && (
                <div className="px-4 pb-4">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      {feedbackSent[lead.id] ? '✓ Feedback Sent!' : 'Was this lead helpful?'}
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
                </div>
              )}
            </div>
          );
        })}

        {/* Trial Exhausted Banner */}
        {trialExhausted && (
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-6 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-amber-500" />
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-2">Trial Limit Reached</h2>
            <p className="text-sm text-slate-500 mb-4">
              You've used all {data.trialLimit} free leads. To unlock unlimited access, contact your account manager.
            </p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hi! I'd like to upgrade my IntentFirstHunter plan for ${data.clientName}. Portal: ${window.location.href}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-black text-sm uppercase tracking-widest px-6 py-3 rounded-xl transition-colors shadow-md"
            >
              <MessageCircle size={16} />
              WhatsApp to Unlock
            </a>
          </div>
        )}

        {/* Empty State */}
        {data.leads.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
              <Clock size={24} className="text-slate-300" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">No leads yet</h2>
            <p className="text-sm text-slate-500">
              Your leads are being hunted. You'll receive a WhatsApp notification when we find one.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white mt-8">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Leads powered by IntentFirstHunter • AI-Driven Lead Generation
          </p>
        </div>
      </footer>
    </div>
  );
}
