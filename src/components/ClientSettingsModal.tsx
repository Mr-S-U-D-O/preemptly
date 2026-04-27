import React, { useState, useEffect } from 'react';
import { Settings, User, Briefcase, Save, X, AlertTriangle, Info, Sparkles, Shield, Megaphone, Eye, EyeOff, MessageSquare, FileText, BookOpen } from 'lucide-react';
import { reportError } from '../utils/logger';
import { toast } from './ui/toast';

interface ClientSettings {
  isSoloFreelancer: boolean;
  clientBusiness: string;
  clientSells: string;
  clientDoes: string;
  clientTone: string;
  aiAggression: string;
  aiLength: string;
}

interface ClientSettingsModalProps {
  open: boolean;
  onClose: () => void;
  token: string;
  currentSettings: ClientSettings;
  onSave: (settings: ClientSettings) => void;
}

const AGGRESSION_LEVELS = [
  { value: 'stealth', label: 'Stealth', icon: EyeOff, description: 'Pure expertise. Zero business mention.' },
  { value: 'subtle', label: 'Subtle', icon: Eye, description: 'One natural mention of your business name.' },
  { value: 'confident', label: 'Confident', icon: Megaphone, description: 'Clear business identity. Reader knows who you are.' },
  { value: 'direct', label: 'Direct', icon: Shield, description: 'Strong mention + CTA. Maximum exposure.' },
];

const LENGTH_LEVELS = [
  { value: 'concise', label: 'Concise', icon: MessageSquare, description: '80–120 words. Sharp and punchy.' },
  { value: 'medium', label: 'Medium', icon: FileText, description: '150–250 words. Balanced depth.' },
  { value: 'detailed', label: 'Detailed', icon: BookOpen, description: '300–500 words. Deep expertise essay.' },
];

const TONE_OPTIONS = ['friendly', 'professional', 'technical'];

function getWarning(aggression: string, length: string): { type: 'danger' | 'caution' | 'tip'; message: string } | null {
  if (length === 'concise' && aggression === 'direct') {
    return {
      type: 'danger',
      message: 'High ban risk. Short, self-promotional comments are frequently flagged and removed by Reddit moderators. Most subreddits will auto-remove or shadowban accounts that do this repeatedly.'
    };
  }
  if (length === 'concise' && aggression === 'confident') {
    return {
      type: 'caution',
      message: 'Caution — shorter comments with brand mentions can appear spammy. Consider using Medium length to give enough context around your mention.'
    };
  }
  if (length === 'detailed' && aggression === 'stealth') {
    return {
      type: 'tip',
      message: 'Long expert comments with no brand mention = missed opportunity. Your audience will appreciate the expertise but won\'t know who wrote it. Consider Subtle visibility.'
    };
  }
  if (aggression === 'direct') {
    return {
      type: 'caution',
      message: 'Direct brand visibility works best in communities that welcome self-promotion (like feedback threads or "show off" posts). Use with care in general discussion.'
    };
  }
  return null;
}

export function ClientSettingsModal({ open, onClose, token, currentSettings, onSave }: ClientSettingsModalProps) {
  const [isSolo, setIsSolo] = useState(currentSettings.isSoloFreelancer);
  const [formData, setFormData] = useState({
    clientBusiness: currentSettings.clientBusiness,
    clientSells: currentSettings.clientSells,
    clientDoes: currentSettings.clientDoes,
    clientTone: currentSettings.clientTone || 'friendly',
    aiAggression: currentSettings.aiAggression || 'subtle',
    aiLength: currentSettings.aiLength || 'medium',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens with new settings
  useEffect(() => {
    if (open) {
      setIsSolo(currentSettings.isSoloFreelancer);
      setFormData({
        clientBusiness: currentSettings.clientBusiness,
        clientSells: currentSettings.clientSells,
        clientDoes: currentSettings.clientDoes,
        clientTone: currentSettings.clientTone || 'friendly',
        aiAggression: currentSettings.aiAggression || 'subtle',
        aiLength: currentSettings.aiLength || 'medium',
      });
    }
  }, [open, currentSettings]);

  const warning = getWarning(formData.aiAggression, formData.aiLength);

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const payload: ClientSettings = {
        isSoloFreelancer: isSolo,
        clientBusiness: formData.clientBusiness,
        clientSells: formData.clientSells,
        clientDoes: formData.clientDoes,
        clientTone: formData.clientTone,
        aiAggression: formData.aiAggression,
        aiLength: formData.aiLength,
      };

      const res = await fetch(`/api/portal/${token}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save settings');
      
      onSave(payload);
      toast('AI settings updated. Your next generated comment will use these settings.', 'success');
      onClose();
    } catch (error: any) {
      console.error("Settings save failed:", error);
      reportError(error, { component: 'ClientSettingsModal', action: 'handleSave', token });
      toast("Failed to save settings. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#5a8c12] p-6 text-white relative overflow-hidden shrink-0">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Settings size={16} className="text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">AI Profile</span>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X size={16} className="text-white/70" />
              </button>
            </div>
            <h2 className="text-2xl font-black tracking-tight">AI Settings</h2>
            <p className="text-white/70 text-xs mt-1 font-medium">Control how the AI represents you and your business.</p>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-36 h-36 bg-black/10 rounded-full blur-2xl" />
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          
          {/* Identity Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <User size={12} /> Your Identity
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsSolo(true)}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${isSolo ? 'border-[#5a8c12] bg-[#5a8c12]/5' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className={`p-1.5 rounded-xl ${isSolo ? 'bg-[#5a8c12] text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <User size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">Solo</p>
                  <p className="text-[9px] text-slate-400">Freelancer</p>
                </div>
              </button>
              <button
                onClick={() => setIsSolo(false)}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${!isSolo ? 'border-[#5a8c12] bg-[#5a8c12]/5' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className={`p-1.5 rounded-xl ${!isSolo ? 'bg-[#5a8c12] text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Briefcase size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">Company</p>
                  <p className="text-[9px] text-slate-400">Agency / Team</p>
                </div>
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {isSolo ? 'Your Name / Brand' : 'Company Name'}
              </label>
              <input
                type="text"
                placeholder={isSolo ? 'e.g. John Smith' : 'e.g. Smith Digital Agency'}
                className="w-full rounded-xl border-2 border-slate-100 h-11 font-bold px-4 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5a8c12]/20 focus:border-[#5a8c12] transition-all"
                value={formData.clientBusiness}
                onChange={(e) => setFormData({ ...formData, clientBusiness: e.target.value })}
              />
            </div>
          </div>

          {/* What You Sell */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">What do you sell?</label>
            <textarea
              placeholder="e.g. AI-powered social listening & lead generation that finds high-intent buyers on Reddit before competitors do"
              className="w-full rounded-xl border-2 border-slate-100 font-medium px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5a8c12]/20 focus:border-[#5a8c12] transition-all resize-none"
              rows={3}
              value={formData.clientSells}
              onChange={(e) => setFormData({ ...formData, clientSells: e.target.value })}
            />
            <p className="text-[9px] text-slate-400 font-medium">Be specific. The AI uses this to position your expertise in comments.</p>
          </div>

          {/* What You Do For Clients */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">What do you do for clients?</label>
            <textarea
              placeholder="e.g. We monitor Reddit and Stack Overflow in real-time to find people actively looking for solutions like yours, then deliver AI-scored leads to your portal."
              className="w-full rounded-xl border-2 border-slate-100 font-medium px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5a8c12]/20 focus:border-[#5a8c12] transition-all resize-none"
              rows={3}
              value={formData.clientDoes}
              onChange={(e) => setFormData({ ...formData, clientDoes: e.target.value })}
            />
            <p className="text-[9px] text-slate-400 font-medium">Describe the value you provide. No character limit — the more context, the smarter the AI.</p>
          </div>

          {/* Message Tone */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message Tone</label>
            <div className="flex gap-2">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone}
                  onClick={() => setFormData({ ...formData, clientTone: tone })}
                  className={`px-4 py-2 rounded-full border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                    formData.clientTone === tone 
                      ? 'border-[#5a8c12] bg-[#5a8c12] text-white' 
                      : 'border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[10px] font-black uppercase tracking-widest text-[#5a8c12] flex items-center gap-1.5">
                <Sparkles size={10} /> AI Behavior
              </span>
            </div>
          </div>

          {/* Brand Visibility (Aggression) */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Brand Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              {AGGRESSION_LEVELS.map((level) => {
                const Icon = level.icon;
                const isSelected = formData.aiAggression === level.value;
                return (
                  <button
                    key={level.value}
                    onClick={() => setFormData({ ...formData, aiAggression: level.value })}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 transition-all text-left ${
                      isSelected 
                        ? 'border-[#5a8c12] bg-[#5a8c12]/5' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isSelected ? 'bg-[#5a8c12] text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isSelected ? 'text-[#5a8c12]' : 'text-slate-700'}`}>{level.label}</p>
                      <p className="text-[9px] text-slate-400 leading-relaxed mt-0.5">{level.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Response Length */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Response Length</label>
            <div className="grid grid-cols-3 gap-2">
              {LENGTH_LEVELS.map((level) => {
                const Icon = level.icon;
                const isSelected = formData.aiLength === level.value;
                return (
                  <button
                    key={level.value}
                    onClick={() => setFormData({ ...formData, aiLength: level.value })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all text-center ${
                      isSelected 
                        ? 'border-[#5a8c12] bg-[#5a8c12]/5' 
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-[#5a8c12] text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Icon size={14} />
                    </div>
                    <p className={`text-[10px] font-bold ${isSelected ? 'text-[#5a8c12]' : 'text-slate-700'}`}>{level.label}</p>
                    <p className="text-[8px] text-slate-400 leading-tight">{level.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warning Banner */}
          {warning && (
            <div className={`rounded-xl p-3 flex gap-2.5 animate-in slide-in-from-bottom-2 duration-300 ${
              warning.type === 'danger' 
                ? 'bg-red-50 border border-red-100' 
                : warning.type === 'caution'
                ? 'bg-amber-50 border border-amber-100'
                : 'bg-blue-50 border border-blue-100'
            }`}>
              <div className="shrink-0 mt-0.5">
                {warning.type === 'danger' ? (
                  <AlertTriangle size={14} className="text-red-500" />
                ) : warning.type === 'caution' ? (
                  <AlertTriangle size={14} className="text-amber-500" />
                ) : (
                  <Info size={14} className="text-blue-500" />
                )}
              </div>
              <p className={`text-[11px] leading-relaxed font-medium ${
                warning.type === 'danger' 
                  ? 'text-red-700' 
                  : warning.type === 'caution'
                  ? 'text-amber-700'
                  : 'text-blue-700'
              }`}>
                {warning.message}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50">
          <p className="text-[9px] text-slate-400 font-medium">
            Changes apply to your next generated comment.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border-2 border-slate-100 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !formData.clientBusiness || !formData.clientSells || !formData.clientDoes}
              className="px-5 py-2.5 rounded-xl bg-[#5a8c12] hover:bg-[#4a730f] text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#5a8c12]/20"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
