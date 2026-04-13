import React, { useState } from 'react';
import { X, Sparkles, User, Briefcase, MessageSquare, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Scraper } from '../types';

interface ClientSetupModalProps {
  scrapers: Scraper[];
  onComplete: () => void;
}

export function ClientSetupModal({ scrapers, onComplete }: ClientSetupModalProps) {
  const [step, setStep] = useState(1);
  const [isSolo, setIsSolo] = useState<string>('true');
  const [formData, setFormData] = useState({
    clientName: scrapers[0]?.clientName || '',
    businessName: '',
    clientSells: '',
    clientDoes: '',
    clientTone: 'friendly'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      scrapers.forEach(s => {
        batch.update(doc(db, 'scrapers', s.id), {
          isSoloFreelancer: isSolo === 'true',
          clientBusiness: isSolo === 'true' ? formData.clientName : formData.businessName,
          clientSells: formData.clientSells,
          clientDoes: formData.clientDoes,
          clientTone: formData.clientTone,
          portalSetupCompleted: true
        });
      });
      await batch.commit();
      onComplete();
    } catch (error) {
      console.error("Setup failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header - Discovery Theme */}
        <div className="bg-[#5a8c12] p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Discovery Session</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight">Personalize Your AI</h2>
            <p className="text-white/70 text-sm mt-2 font-medium">To generate the best outreach messages, we need to know who you are and what you offer.</p>
          </div>
          
          {/* Abstract background shapes */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-black/10 rounded-full blur-2xl" />
        </div>

        <div className="p-8 space-y-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Your Identity</Label>
                <RadioGroup 
                  value={isSolo} 
                  onValueChange={setIsSolo}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSolo === 'true' ? 'border-[#5a8c12] bg-[#5a8c12]/5' : 'border-slate-100'}`}>
                    <RadioGroupItem value="true" className="sr-only" />
                    <div className={`p-2 rounded-xl ${isSolo === 'true' ? 'bg-[#5a8c12] text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <User size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Solo Freelancer</p>
                      <p className="text-[10px] text-slate-500 font-medium">I work for myself</p>
                    </div>
                  </label>
                  
                  <label className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSolo === 'false' ? 'border-[#5a8c12] bg-[#5a8c12]/5' : 'border-slate-100'}`}>
                    <RadioGroupItem value="false" className="sr-only" />
                    <div className={`p-2 rounded-xl ${isSolo === 'false' ? 'bg-[#5a8c12] text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Company / Agency</p>
                      <p className="text-[10px] text-slate-500 font-medium">I represent a business</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {isSolo === 'true' ? 'Full Name' : 'Company Name'}
                </Label>
                <Input 
                  placeholder={isSolo === 'true' ? 'e.g. John Smith' : 'e.g. Smith Digital Agency'}
                  className="rounded-xl border-slate-200 h-12 font-bold px-4 focus:ring-[#5a8c12]"
                  value={isSolo === 'true' ? formData.clientName : formData.businessName}
                  onChange={(e) => setFormData({
                    ...formData, 
                    [isSolo === 'true' ? 'clientName' : 'businessName']: e.target.value
                  })}
                />
              </div>

              <Button 
                onClick={() => setStep(2)}
                disabled={!(isSolo === 'true' ? formData.clientName : formData.businessName)}
                className="w-full h-12 rounded-xl bg-[#5a8c12] hover:bg-[#4a730f] text-white font-black uppercase tracking-widest gap-2"
              >
                Continue <ArrowRight size={16} />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">What do you sell?</Label>
                  <Input 
                    placeholder="e.g. Website design, HVAC repair, SEO audits"
                    className="rounded-xl border-slate-200 h-12 font-bold px-4 focus:ring-[#5a8c12]"
                    value={formData.clientSells}
                    onChange={(e) => setFormData({...formData, clientSells: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Briefly list your products or services</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">What do you do for clients?</Label>
                  <Input 
                    placeholder="e.g. We build high-converting landing pages"
                    className="rounded-xl border-slate-200 h-12 font-bold px-4 focus:ring-[#5a8c12]"
                    value={formData.clientDoes}
                    onChange={(e) => setFormData({...formData, clientDoes: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400 font-medium">What is the primary value you provide?</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Message Tone</Label>
                  <RadioGroup 
                    value={formData.clientTone} 
                    onValueChange={(val) => setFormData({...formData, clientTone: val})}
                    className="flex flex-wrap gap-2"
                  >
                    {['Friendly', 'Professional', 'Technical'].map((tone) => (
                      <label 
                        key={tone}
                        className={`px-4 py-2 rounded-full border-2 text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${formData.clientTone === tone.toLowerCase() ? 'border-[#5a8c12] bg-[#5a8c12] text-white' : 'border-slate-100 text-slate-400'}`}
                      >
                        <RadioGroupItem value={tone.toLowerCase()} className="sr-only" />
                        {tone}
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="h-12 px-6 rounded-xl border-slate-200 font-black uppercase tracking-widest text-slate-400"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isSubmitting || !formData.clientSells || !formData.clientDoes}
                  className="flex-1 h-12 rounded-xl bg-[#5a8c12] hover:bg-[#4a730f] text-white font-black uppercase tracking-widest gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Complete Setup <Check size={16} /></>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
            This setup is only required once.<br/>Your privacy is our priority.
          </p>
        </div>
      </div>
    </div>
  );
}
