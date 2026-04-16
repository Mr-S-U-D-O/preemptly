import React, { useState } from 'react';
import { Target, ArrowRight, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface InteractiveOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveOnboarding: React.FC<InteractiveOnboardingProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    website: '',
    email: '',
    whatsapp: '',
    prospect: '',
    keywords: '',
    agreedToTerms: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (step < 6) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!formData.agreedToTerms) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "beta_applicants"), {
        ...formData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setIsSuccess(true);
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Heavy Blur Backdrop */}
      <div 
        className="absolute inset-0 bg-white/60 backdrop-blur-xl animate-in fade-in duration-500"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white border-2 border-slate-200 shadow-2xl shadow-black/10 rounded-3xl overflow-hidden flex flex-col h-[600px] max-h-[90vh] animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-slate-100">
          <div className="flex items-center gap-3 opacity-50">
            <div className="w-8 h-8 bg-black flex items-center justify-center rounded-lg">
              <Target className="text-white w-4 h-4" />
            </div>
            <span className="font-black text-xl tracking-tighter">Preemptly</span>
          </div>
          
          {/* Step Indicator */}
          {!isSuccess && (
             <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
               Step {step} of 6
             </div>
          )}
          
          <button onClick={onClose} className="text-slate-400 hover:text-black transition-colors font-bold text-xs uppercase tracking-widest px-3 py-1.5 border-2 border-transparent hover:border-slate-200 rounded-full">
            Close
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 md:p-14 relative flex flex-col justify-center">
          
          {isSuccess ? (
            <div className="text-center flex flex-col items-center animate-in zoom-in duration-500">
              <div className="w-24 h-24 bg-[#5a8c12]/10 border-2 border-[#5a8c12] rounded-full flex items-center justify-center text-[#5a8c12] mb-8">
                 <CheckCircle2 size={48} />
              </div>
              <h2 className="text-4xl font-black tracking-tight mb-4 text-black">Application Received.</h2>
              <p className="text-lg text-slate-500 font-light max-w-md mx-auto leading-relaxed">
                We're spinning up a dedicated listening environment for your targets. You will receive a WhatsApp message on <span className="font-medium text-black">{formData.whatsapp}</span> shortly with your Command Center access link.
              </p>
              <button onClick={onClose} className="mt-10 bg-black text-white hover:bg-slate-800 transition-colors px-10 py-5 text-sm font-bold uppercase tracking-widest rounded-2xl shadow-xl shadow-black/10">
                Return to Site
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 w-full max-w-lg mx-auto">
               
               {step === 1 && (
                 <div className="flex flex-col gap-6">
                   <h2 className="text-3xl lg:text-4xl font-extralight tracking-tight text-black leading-tight">
                     Let's build your pipeline.<br/>
                     <span className="font-bold border-b-2 border-slate-200 pb-1">What's your full name?</span>
                   </h2>
                   <input 
                     autoFocus
                     name="name"
                     value={formData.name}
                     onChange={handleChange}
                     onKeyDown={(e) => e.key === 'Enter' && formData.name && handleNext()}
                     type="text" 
                     className="w-full text-2xl font-medium bg-transparent border-b-2 border-slate-200 outline-none pb-4 focus:border-black transition-colors placeholder-slate-300"
                     placeholder="John Doe"
                   />
                 </div>
               )}

               {step === 2 && (
                 <div className="flex flex-col gap-6">
                   <h2 className="text-3xl lg:text-4xl font-extralight tracking-tight text-black leading-tight">
                     Nice to meet you, {formData.name.split(' ')[0]}.<br/>
                     <span className="font-bold border-b-2 border-slate-200 pb-1">What company are you with?</span>
                   </h2>
                   <div className="flex flex-col gap-8">
                     <input 
                       autoFocus
                       name="company"
                       value={formData.company}
                       onChange={handleChange}
                       type="text" 
                       className="w-full text-2xl font-medium bg-transparent border-b-2 border-slate-200 outline-none pb-4 focus:border-black transition-colors placeholder-slate-300"
                       placeholder="Company Name"
                     />
                     <input 
                       name="website"
                       value={formData.website}
                       onChange={handleChange}
                       onKeyDown={(e) => e.key === 'Enter' && formData.company && handleNext()}
                       type="url" 
                       className="w-full text-xl font-medium bg-transparent border-b-2 border-slate-200 outline-none pb-4 focus:border-black transition-colors placeholder-slate-300"
                       placeholder="Website URL (e.g. https://)"
                     />
                   </div>
                 </div>
               )}

               {step === 3 && (
                 <div className="flex flex-col gap-6">
                   <h2 className="text-3xl lg:text-4xl font-extralight tracking-tight text-black leading-tight mb-2">
                     How should we reach you?
                   </h2>
                   <p className="text-slate-500 mb-4 font-light">We need your email for login, and your WhatsApp number for instant lead alerts.</p>
                   
                   <div className="flex flex-col gap-8">
                     <div className="relative">
                       <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 absolute -top-4 left-0">Email Address</label>
                       <input 
                         autoFocus
                         name="email"
                         type="email"
                         value={formData.email}
                         onChange={handleChange}
                         className="w-full text-xl font-medium bg-transparent border-b-2 border-slate-200 outline-none pb-3 focus:border-black transition-colors placeholder-slate-300 pt-2"
                         placeholder="founder@company.com"
                       />
                     </div>
                     <div className="relative">
                       <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 absolute -top-4 left-0">WhatsApp Number</label>
                       <input 
                         name="whatsapp"
                         type="tel"
                         value={formData.whatsapp}
                         onChange={handleChange}
                         onKeyDown={(e) => e.key === 'Enter' && formData.email && formData.whatsapp && handleNext()}
                         className="w-full text-xl font-medium bg-transparent border-b-2 border-slate-200 outline-none pb-3 focus:border-black transition-colors placeholder-slate-300 pt-2"
                         placeholder="+1 (555) 000-0000"
                       />
                     </div>
                   </div>
                 </div>
               )}

               {step === 4 && (
                 <div className="flex flex-col gap-6">
                   <div className="flex items-center gap-2 px-3 py-1 border-2 border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest w-max rounded-lg">
                      <Target size={12} className="text-[#5a8c12]" /> Target Definition
                   </div>
                   <h2 className="text-3xl font-extralight tracking-tight text-black leading-tight">
                     Describe your ideal prospect's <span className="font-bold">biggest frustration</span> right now.
                   </h2>
                   <textarea 
                     autoFocus
                     name="prospect"
                     value={formData.prospect}
                     onChange={handleChange}
                     rows={3}
                     className="w-full text-lg leading-relaxed font-medium bg-transparent border-b-2 border-slate-200 outline-none pb-4 focus:border-black transition-colors placeholder-slate-300 resize-none mt-4"
                     placeholder="e.g. 'CFOs who are totally fed up with their current accounting automation failing during month-end close.'"
                   />
                 </div>
               )}

               {step === 5 && (
                 <div className="flex flex-col gap-6">
                   <h2 className="text-3xl font-extralight tracking-tight text-black leading-tight">
                     Any specific <span className="font-bold">keywords</span> or <span className="font-bold">platforms</span> they hang out in?
                   </h2>
                   <p className="text-slate-500 mb-2 font-light">Optional, but it gives our AI a huge head start.</p>
                   <textarea 
                     autoFocus
                     name="keywords"
                     value={formData.keywords}
                     onChange={handleChange}
                     rows={3}
                     className="w-full text-lg leading-relaxed font-medium bg-transparent border-b-2 border-slate-200 outline-none pb-4 focus:border-black transition-colors placeholder-slate-300 resize-none"
                     placeholder="e.g. r/accounting, 'Xero migration', 'NetSuite alternative'"
                   />
                 </div>
               )}

               {step === 6 && (
                 <div className="flex flex-col gap-6">
                   <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-black leading-tight mb-2">
                     The Preemptly Deal.
                   </h2>
                   
                   <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phase 1</div>
                        <h4 className="text-lg font-bold text-black flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-[#5a8c12]" /> 10-Intercept Free Trial
                        </h4>
                        <p className="text-sm text-slate-500 font-light">We will hunt down and deliver 10 highly-qualified, high-intent conversations to your Command Center for completely free.</p>
                      </div>
                      
                      <div className="h-px w-full bg-slate-200 my-2" />
                      
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phase 2</div>
                        <h4 className="text-lg font-bold text-black flex items-center gap-2">
                          <Target size={18} className="text-[#5a8c12]" /> Closed Beta Upgrade
                        </h4>
                        <p className="text-sm text-slate-500 font-light">After your trial, you have the option to bump up to our Beta Tier for unlimited loop access at <span className="font-bold">R500/mo</span> (Discounted from R2500).</p>
                      </div>
                   </div>

                   <button 
                     onClick={() => setFormData(prev => ({ ...prev, agreedToTerms: !prev.agreedToTerms }))}
                     className="flex items-center gap-4 mt-4 group cursor-pointer text-left"
                   >
                     <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${formData.agreedToTerms ? 'bg-black border-black' : 'border-slate-300 group-hover:border-black'}`}>
                        {formData.agreedToTerms && <Check size={14} className="text-white" />}
                     </div>
                     <span className="text-sm font-medium text-slate-600 transition-colors group-hover:text-black">
                       I agree to the deal. Let's hunt.
                     </span>
                   </button>
                 </div>
               )}

            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isSuccess && (
          <div className="p-6 border-t-2 border-slate-100 flex items-center justify-between bg-slate-50">
            <button 
              onClick={() => setStep(s => Math.max(1, s - 1))}
              className={`text-slate-400 hover:text-black font-bold uppercase tracking-widest text-xs transition-opacity ${step === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              Back
            </button>
            
            {step < 6 ? (
              <button 
                onClick={handleNext}
                className="bg-black text-white hover:bg-slate-800 transition-colors px-10 py-5 text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-black/10 rounded-xl"
              >
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={!formData.agreedToTerms || isSubmitting}
                className={`transition-colors px-10 py-5 text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-xl rounded-xl ${
                  formData.agreedToTerms && !isSubmitting 
                    ? 'bg-[#5a8c12] hover:bg-[#4a7310] text-white shadow-[#5a8c12]/20 shadow-xl' 
                    : 'bg-slate-200 text-slate-400 shadow-none'
                }`}
              >
                {isSubmitting ? 'Starting Engine...' : 'Confirm & Launch Ops'} <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
