import React, { useEffect, useState, useRef } from 'react';
import { Target, ArrowRight, ShieldCheck, Zap, Activity, Users, Database, Plus, Minus } from 'lucide-react';
import { InteractiveOnboarding } from './InteractiveOnboarding';
import { AnimatedList } from '../ui/animated-list';

// Use a simple Intersection Observer hook for scroll animations
function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return [ref, isIntersecting] as const;
}

const FAQItem: React.FC<{ question: string, answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 py-6 last:border-b-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 text-left focus:outline-none group"
      >
        <span className="font-medium text-lg text-slate-900">{question}</span>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-slate-500 group-hover:bg-slate-200 transition-colors">
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-slate-600 leading-relaxed font-light">{answer}</p>
      </div>
    </div>
  );
};

const FAQS = [
  { q: "How exactly does Preemptly find these leads?", a: "We use proprietary AI models to constantly monitor highly specific, niche communities looking for people expressing extreme frustration or asking highly specific questions related to your niche. We filter out the noise and only alert you to high-intent signals." },
  { q: "Is this just another scraping tool?", a: "Not at all. Most scraping tools give you a megaphone by throwing raw data at you. Preemptly only alerts you when our AI identifies a user who is frustrated and ready for a solution. It's a sniper rifle, not a megaphone." },
  { q: "Are the leads guaranteed to convert?", a: "We guarantee you are introduced to individuals experiencing the exact pain point you solve, right when they are asking about it. You still have to bring your expertise to the table, but you're no longer cold-calling." },
  { q: "How is the 10-Intercept Free Trial measured?", a: "Every time our AI scans a community and flags a post as a 'Match 8+' (highly relevant lead), that counts as 1 intercept. The trial ends when we have delivered 10 actionable leads to your dashboard." },
  { q: "Can I connect this to my current CRM?", a: "Currently, Preemptly acts as a standalone Command Center to keep your data pristine. You can review, approve, and respond directly from our system or export them. Direct CRM integrations are on our immediate roadmap." },
  { q: "Will I get banned from platforms like Reddit for using this?", a: "Absolutely not. Preemptly is a listening tool. When we find a lead, you or your team manually respond using your own authentic accounts. We don't automate spam; we automate discovery." },
  { q: "How do you generate the Strategic Rationale?", a: "Our AI doesn't just read keywords; it analyzes the context and emotion behind a post. It then suggests exactly why this person is a fit and drafts a context-aware, helpful comment for you to edit and send." },
  { q: "What happens if I join the Beta now?", a: "Closed Beta partners get priority support, direct input on our product roadmap, and a locked-in legacy rate of R500/mo (marked down from the standard R2500/mo) for the lifetime of their account." }
];

export function LandingPage() {
  const [heroRef, heroInView] = useIntersectionObserver();
  const [painRef, painInView] = useIntersectionObserver();
  const [engineRef, engineInView] = useIntersectionObserver();
  const [videoRef, videoInView] = useIntersectionObserver();
  const [redditRef, redditInView] = useIntersectionObserver();
  const [pricingRef, pricingInView] = useIntersectionObserver();
  const [faqRef, faqInView] = useIntersectionObserver();
  const [leadRef, leadInView] = useIntersectionObserver();

  const [intentScore, setIntentScore] = useState(5);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getEngineMockText = () => {
    const leads = [
      { id: 1, user: "SaaS_Founder99", text: "Looking into different PR agencies but they all seem expensive.", score: 7, action: "Intercepted" },
      { id: 2, user: "CTO_Scaleup", text: "Our current dev team is slow. Need a reliable offshore partner.", score: 8, action: "Priority Match" },
      { id: 3, user: "Marketing_Ops", text: "Anyone using AI for lead gen? Need something high-intent only.", score: 9, action: "Critical Lead" },
      { id: 4, user: "Desperate_Founder", text: "Need urgent help with AWS migration. Current guy vanished.", score: 10, action: "Golden Intercept" },
    ];

    const activeLeads = leads.filter(l => intentScore >= l.score);

    if (intentScore < 7) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 opacity-60">
           <Database className="text-slate-300 mb-3" size={32} />
           <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Filtering Noise... No Data</p>
           <div className="mt-4 flex gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse delay-75" />
              <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse delay-150" />
           </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 w-full">
        <AnimatedList className="w-full">
          {activeLeads.map((lead) => (
            <div key={lead.id} className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-xl shadow-black/5 hover:border-[#5a8c12] transition-all group/card overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#5a8c12] opacity-0 group-hover/card:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.user}`} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xs font-black text-slate-800 tracking-tight">{lead.user}</span>
                       <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Matched via Intent-AI</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#5a8c12]/5 rounded-lg border border-[#5a8c12]/10">
                    <Zap size={10} className="text-[#5a8c12] fill-[#5a8c12] animate-pulse" />
                    <span className="text-[10px] font-black text-[#5a8c12] uppercase tracking-tighter">{lead.action}</span>
                 </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3 group-hover/card:bg-white transition-colors">
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic">
                  "{lead.text}"
                </p>
              </div>

              <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-50">
                 <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5a8c12]" /> Match Confidence: {lead.score * 10}%
                 </div>
                 <span>Score {lead.score} / 10</span>
              </div>
            </div>
          ))}
        </AnimatedList>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-[#5a8c12] selection:text-white overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 bg-black flex items-center justify-center rounded-lg shadow-sm">
              <Target className="text-white w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tighter">Preemptly</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
             <button 
               onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
               className="text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-black transition-colors"
             >
                The Engine
             </button>
             <button 
               onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
               className="text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-black transition-colors"
             >
                Pricing
             </button>
             <button 
               onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
               className="text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-black transition-colors"
             >
                FAQ
             </button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                const port = window.location.port ? `:${window.location.port}` : '';
                window.location.href = isLocal ? `http://app.localhost${port}` : 'https://app.bepreemptly.com';
              }}
              className="hidden md:flex items-center gap-2 bg-white text-black px-5 py-2.5 font-bold text-[10px] tracking-widest uppercase hover:bg-slate-50 border border-slate-200 hover:border-black rounded-lg transition-colors shadow-sm"
            >
              Sign In <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        className={`pt-24 pb-16 md:pt-36 md:pb-24 px-6 max-w-6xl mx-auto transition-all duration-1000 transform ${heroInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="grid md:grid-cols-2 gap-8 lg:gap-14 items-center">
          
          {/* Left Column: Copy & CTAs */}
          <div className="flex flex-col items-start text-left">
            <div className="flex items-center gap-2 px-2.5 py-1 border-2 border-[#5a8c12] text-[#5a8c12] text-[9px] font-black uppercase tracking-widest mb-6 bg-[#5a8c12]/5 rounded-sm">
              <span className="w-1.5 h-1.5 bg-[#5a8c12] animate-pulse" />
              Now Available
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-tighter leading-[1.05] text-black">
              Be the expert they <span className="font-bold text-black border-b-2 border-[#5a8c12]">need</span>,<br className="hidden md:block"/>
              exactly when they <span className="font-bold text-black border-b-2 border-[#5a8c12]">need it</span>.
            </h1>
            
            <p className="mt-5 text-base md:text-lg text-slate-600 font-light leading-relaxed max-w-md">
              We monitor niche community discussions and alert you the moment a prospect expresses a deep frustration. Don't chase. Just be there with the solution.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center sm:items-start gap-3 w-full">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto bg-black text-white hover:bg-[#5a8c12] transition-colors px-6 py-3.5 text-xs font-bold uppercase tracking-widest border-2 border-black flex items-center justify-center gap-2 shadow-xl shadow-black/10 hover:shadow-2xl hover:shadow-[#5a8c12]/20"
              >
                Start Free Trial <ArrowRight size={14} />
              </button>
              <button className="w-full sm:w-auto bg-white text-black hover:bg-slate-50 transition-colors px-6 py-3.5 text-xs font-bold uppercase tracking-widest border-2 border-slate-200 hover:border-black flex items-center justify-center gap-2">
                Watch Demo
              </button>
            </div>
            
            <div className="flex items-center gap-3 mt-10">
              <div className="flex -space-x-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                 <span className="text-xs font-bold tracking-tight text-slate-900">100+ Elite Agencies</span>
                 <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">intercepting clients</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual of a 10/10 Lead */}
          <div className="relative w-full h-[350px] md:h-[450px] flex items-center justify-center mt-10 md:mt-0 perspective-1000 scale-[0.85] lg:scale-90 origin-center md:origin-right">
             
             {/* Subtle background frame */}
             <div className="absolute inset-0 bg-slate-50 rounded-3xl border-2 border-slate-100 overflow-hidden shadow-inner">
                {/* Abstract dot background grid */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)', backgroundSize: '16px 16px' }} />
             </div>
             
             {/* The Lead Post (Floating & Tilted) */}
             <div className="relative z-10 w-full max-w-[340px] md:max-w-md bg-white border-2 border-slate-200 p-6 md:p-8 shadow-2xl -rotate-2 hover:rotate-0 transition-transform duration-500 hover:border-black cursor-default">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=lostfounder`} alt="avatar" className="w-full h-full object-cover opacity-80" />
                     </div>
                     <div className="flex flex-col">
                       <span className="text-sm font-bold text-slate-800">Frustrated_Founder99</span>
                       <span className="text-xs text-slate-400 font-medium tracking-wide">posted in r/SaaS</span>
                     </div>
                   </div>
                   <div className="text-xs font-bold text-slate-300">2h ago</div>
                </div>
                <h3 className="font-black text-lg md:text-xl leading-tight mb-3 text-slate-900">Our current growth agency is completely failing us.</h3>
                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                  We just spent $10k on ads with zero return. It feels like they don't even understand our product. Has anyone found an agency that actually knows how to scale technical B2B platforms?
                </p>
                <div className="mt-4 flex gap-4 text-slate-300">
                  <div className="flex items-center gap-1.5"><ArrowRight size={14} className="-rotate-90" /> <span className="text-xs font-bold">142</span></div>
                  <div className="flex items-center gap-1.5"><Activity size={14} /> <span className="text-xs font-bold">28 comments</span></div>
                </div>
             </div>

             {/* The AI Reasoning Card (Overlapping & Animated) */}
             <div className="absolute z-20 bottom-4 md:bottom-12 right-0 md:-right-8 lg:-right-16 w-[280px] md:w-80 bg-white border-2 border-slate-200 p-5 shadow-2xl shadow-black/15 hover:border-black transition-colors rounded-xl animate-bounce" style={{ animationDuration: '4s' }}>
                <div className="flex items-center justify-between mb-3 border-b-2 border-slate-100 pb-3">
                   <div className="flex items-center gap-2">
                     <Zap className="text-[#5a8c12] w-5 h-5 fill-[#5a8c12]" />
                     <span className="text-xs font-black uppercase tracking-widest text-[#5a8c12]">10/10 Match</span>
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-sm">Intercepted</span>
                </div>
                <p className="text-[13px] text-slate-700 font-medium leading-relaxed">
                  <span className="font-bold text-black border-b border-[#5a8c12] inline-block mb-1">Strategic Rationale:</span><br/>
                  The user is expressing acute frustration with their current provider and actively seeking highly-specialized B2B expertise. Immediate intervention recommended.
                </p>
             </div>
          </div>

        </div>
      </section>

      {/* Main Demo Video Placeholder */}
      <section className="px-6 max-w-5xl mx-auto pb-24">
        <div className="w-full aspect-video bg-white border-2 border-slate-200 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-black transition-colors cursor-pointer shadow-xl shadow-black/5">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform shadow-xl">
            <div className="w-0 h-0 border-t-6 border-t-transparent border-l-[11px] border-l-white border-b-6 border-b-transparent ml-1" />
          </div>
          <p className="font-bold text-slate-400 tracking-widest uppercase text-[10px]">[ DEMO VIDEO PLACEHOLDER ]</p>
        </div>
      </section>

      {/* The Preemptly Path - Bento Grid */}
      <section 
        ref={painRef}
        className={`bg-white border-y-2 border-slate-200 py-24 px-6 transition-all duration-1000 transform ${painInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="max-w-6xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-extralight tracking-tighter text-black mb-4">
               Beyond Social Listening. <span className="font-bold">Growth Intelligence.</span>
            </h2>
            <p className="text-slate-500 font-light leading-relaxed">
               Sending cold DMs and praying for a reply damages your brand. Your massive, hidden audience is already complaining online. We find those exact conversations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6">
             
             {/* Card 1: The Preemptly Path */}
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:shadow-md transition-shadow">
                <div className="flex-1 bg-[#FAFAFA] min-h-[220px] flex items-center justify-center p-8 relative overflow-hidden">
                   
                   <div className="w-full relative z-10 transition-transform duration-500 group-hover:scale-105 group-hover:-translate-y-1">
                      <div className="bg-white rounded-xl border-2 border-[#5a8c12] shadow-xl shadow-[#5a8c12]/20 p-4">
                         <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-1.5">
                               <Zap className="text-[#5a8c12] w-4 h-4 fill-[#5a8c12]" />
                               <span className="text-xs font-black uppercase tracking-widest text-[#5a8c12]">10/10 Match</span>
                            </div>
                            <span className="text-[9px] font-bold text-[#5a8c12] bg-[#5a8c12]/10 uppercase tracking-widest px-2 py-1 rounded-sm border border-[#5a8c12]/20">Intercepted</span>
                         </div>
                         <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                               <span className="text-[10px] font-bold text-slate-400">J</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[11px] font-bold text-slate-800">Frustrated_Founder</span>
                               <span className="text-[9px] text-slate-400">posted in r/SaaS</span>
                            </div>
                         </div>
                         <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100 italic">
                           "Our current agency is completely ghosting us. Anyone know a team that actually delivers?"
                         </p>
                      </div>
                   </div>
                   
                   {/* Background decorative blurry elements */}
                   <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#5a8c12]/10 blur-3xl rounded-full" />
                   <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#5a8c12]/5 blur-3xl rounded-full" />
                </div>
                <div className="p-8 pt-6">
                   <h3 className="font-bold text-lg text-slate-900 mb-2 text-left">Laser-Focused Intent</h3>
                   <p className="text-sm text-slate-500 leading-relaxed font-light text-left">
                     Stop sifting through junk data. Our AI analyzes the context and emotion behind every post, scoring each lead from 1 to 10 so you only engage with red-hot prospects.
                   </p>
                </div>
             </div>

             {/* Card 2: Command Center */}
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:shadow-md transition-shadow">
                <div className="p-8 pb-6 text-left">
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Intuitive workflow</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-light max-w-sm">
                    Manage your intercepts seamlessly. Our intuitive command center centralizes high-intent leads without complex setups.
                  </p>
                </div>
                <div className="flex-1 bg-[#FAFAFA] rounded-t-2xl mx-8 border border-b-0 border-slate-200 overflow-hidden relative min-h-[220px]">
                   
                   <div className="absolute inset-0 p-4 transition-transform duration-500 group-hover:translate-y-[-4px]">
                      {/* Top App Bar */}
                      <div className="w-full h-10 bg-white rounded-lg border border-slate-100 shadow-sm mb-4 flex items-center px-4 gap-3">
                         <div className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center bg-slate-50">
                            <div className="w-3 h-3 bg-black rounded-[3px]"/>
                         </div>
                         <div className="text-[10px] font-bold text-slate-400">Command Center</div>
                      </div>

                      <div className="grid grid-cols-[1fr_2fr] gap-4">
                         {/* Sidebar lines */}
                         <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 flex flex-col gap-3 min-h-[140px]">
                            {[1,2,3,4,5].map(i => (
                               <div key={i} className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full bg-slate-100" />
                                  <div className={`h-2 bg-slate-100 rounded ${i % 2 === 0 ? 'w-12' : 'w-20'}`} />
                               </div>
                            ))}
                         </div>
                         {/* Main Graph Area */}
                         <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-5 relative overflow-hidden">
                            <div className="text-xs font-bold text-slate-800 mb-1">Total Intercepts</div>
                            <div className="text-2xl font-black text-black tracking-tighter mb-4">242,000</div>
                            <svg className="w-full h-16 text-blue-500 overflow-visible" viewBox="0 0 200 40">
                               <path d="M0 40 Q 40 20, 80 35 T 160 10 L 200 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                               <circle cx="160" cy="10" r="4" fill="white" stroke="currentColor" strokeWidth="2" className="drop-shadow-md" />
                               <rect x="140" y="-15" width="40" height="20" rx="4" fill="white" className="drop-shadow-md" />
                               <text x="160" y="-1" fontSize="10" fontWeight="bold" fill="#1e293b" textAnchor="middle">+14%</text>
                            </svg>
                         </div>
                      </div>
                   </div>
                   
                   <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#FAFAFA] to-transparent z-10" />
                </div>
             </div>

             {/* Card 3: Global Reach */}
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:shadow-md transition-shadow">
                <div className="p-8 pb-4 text-left">
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Global monitoring</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-light">
                    Our network of localized models monitors hidden communities globally, catching signals wherever they emerge.
                  </p>
                </div>
                <div className="flex-1 bg-[#FAFAFA] mx-8 border border-b-0 border-slate-200 rounded-t-2xl overflow-hidden relative min-h-[220px]">
                   <div className="absolute inset-0 bg-[#0A0A0A] overflow-hidden">
                      {/* Radar grid network */}
                      <div className="absolute inset-0 opacity-20"
                           style={{
                             backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                             backgroundSize: '24px 24px',
                           }}>
                      </div>
                      
                      {/* Radar sweep */}
                      <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5a8c12]/10 group-hover:border-[#5a8c12]/30 transition-colors duration-1000">
                         <div className="w-1/2 h-1/2 absolute top-0 right-0 bg-gradient-to-bl from-[#5a8c12]/20 to-transparent origin-bottom-left animate-[spin_4s_linear_infinite]" />
                      </div>

                      {/* Concentric rings */}
                      <div className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5a8c12]/20" />
                      <div className="absolute top-1/2 left-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5a8c12]/30" />
                      
                      {/* Intercept Nodes */}
                      <div className="absolute top-[25%] left-[55%] flex gap-2 items-center group-hover:scale-110 transition-transform">
                         <div className="w-1.5 h-1.5 bg-[#5a8c12] rounded-full shadow-[0_0_12px_3px_rgba(90,140,18,0.8)] animate-pulse" />
                         <span className="text-[7px] text-[#5a8c12] font-bold uppercase tracking-widest bg-[#5a8c12]/10 px-1.5 py-0.5 rounded border border-[#5a8c12]/20 hidden md:block">EU-WEST</span>
                      </div>

                      <div className="absolute top-[65%] left-[25%] flex gap-2 items-center group-hover:scale-110 transition-transform delay-75">
                         <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_8px_2px_rgba(255,255,255,0.8)] animate-pulse" style={{ animationDelay: '1s' }} />
                         <span className="text-[7px] text-slate-300 font-bold uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded border border-white/10 hidden md:block">US-EAST</span>
                      </div>
                      
                      <div className="absolute top-[75%] left-[65%] flex gap-2 items-center group-hover:scale-110 transition-transform delay-150">
                         <div className="w-2 h-2 bg-[#5a8c12] rounded-full shadow-[0_0_15px_4px_rgba(90,140,18,0.6)] animate-pulse" style={{ animationDelay: '0.5s' }} />
                         <span className="text-[7px] text-[#5a8c12] font-bold uppercase tracking-widest bg-[#5a8c12]/10 px-1.5 py-0.5 rounded border border-[#5a8c12]/20 hidden md:block">APAC</span>
                      </div>
                      
                      {/* Gradient overlay for fade effect */}
                      <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none" />
                      <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none" />
                   </div>
                </div>
             </div>

             {/* Card 4: Automated Context */}
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:shadow-md transition-shadow">
                <div className="p-8 pb-6 text-left">
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Automated Context</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-light max-w-sm">
                    We don't just deliver leads. Preemptly generates conversion-optimized rationale based on the exact complaint.
                  </p>
                </div>
                <div className="flex-1 bg-[#FAFAFA] rounded-t-2xl mx-8 border border-b-0 border-slate-200 overflow-hidden relative min-h-[220px]">
                   
                   <div className="absolute inset-0 p-4 transition-transform duration-500 group-hover:translate-y-[-4px]">
                      <div className="grid grid-cols-[1.5fr_1fr] gap-4 h-full">
                         
                         {/* Leads list column */}
                         <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                            <div className="text-xs font-bold text-slate-800 mb-2">Latest Intercepts</div>
                            
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                               <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                                     <span className="text-[10px] text-slate-500">U</span>
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-bold text-slate-700">LostFounder22</span>
                                     <span className="text-[8px] text-slate-400">"Looking for PR..."</span>
                                  </div>
                               </div>
                               <Zap className="w-3 h-3 text-[#5a8c12] fill-[#5a8c12]" />
                            </div>

                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                               <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                                     <span className="text-[10px] text-slate-500">C</span>
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-bold text-slate-700">CTO_Bob</span>
                                     <span className="text-[8px] text-slate-400">"Help with scaling"</span>
                                  </div>
                               </div>
                               <div className="w-3 h-3 rounded-full bg-slate-200" />
                            </div>

                         </div>
                         
                         {/* Rationale column */}
                         <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
                            <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-[9px] font-bold tracking-widest uppercase text-slate-500">
                               Generated Response
                            </div>
                            <div className="p-3 flex flex-col gap-2 mt-1">
                               <div className="w-full h-2 bg-slate-100 rounded-full" />
                               <div className="w-full h-2 bg-slate-100 rounded-full" />
                               <div className="w-3/4 h-2 bg-slate-100 rounded-full" />
                               
                               <div className="mt-3 text-[8px] font-bold text-white bg-black py-2 px-0 rounded text-center w-full shadow-sm hover:bg-[#5a8c12] transition-colors cursor-pointer">
                                  APPROVE
                               </div>
                            </div>
                         </div>

                      </div>
                   </div>

                   <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#FAFAFA] to-transparent z-10" />
                </div>
             </div>
             
          </div>
        </div>
      </section>

      {/* The Engine Diagram */}
      <section 
        id="how-it-works"
        ref={engineRef}
        className={`py-32 w-full transition-all duration-1000 transform overflow-hidden ${engineInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="max-w-7xl mx-auto px-6">
           <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
              
              {/* Left Column: UI + Slider */}
              <div className="flex flex-col">
                <div className="mb-12">
                  <h2 className="text-4xl md:text-5xl font-extralight tracking-tighter text-black leading-tight">
                    The <span className="font-bold border-b-2 border-[#5a8c12]">Intelligence Engine.</span>
                  </h2>
                  <p className="mt-6 text-lg text-slate-500 font-light leading-relaxed">
                    Most tools give you a megaphone. Preemptly gives you a sniper rifle. Drag the slider to see how AI intent scoring filters the noise and brings matching leads to you.
                  </p>
                </div>

                <div className="w-full max-w-sm">
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={intentScore}
                    onChange={(e) => setIntentScore(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                    <span>Score 1 (Noise)</span>
                    <span>Score 10 (High Intent)</span>
                  </div>

                  <div className="mt-12 flex items-baseline gap-2">
                    <div className="text-8xl font-black text-black tabular-nums tracking-tighter">
                      {intentScore}
                    </div>
                    <span className="text-3xl text-slate-300 font-light">/ 10</span>
                  </div>
                  <div className="text-[10px] flex items-center gap-2 font-bold tracking-widest uppercase text-[#5a8c12] mt-2">
                    <Activity size={12} />
                    Current AI Intent Score
                  </div>
                </div>
              </div>

              {/* Right Column: Lead Animation */}
              <div className="relative min-h-[400px] flex flex-col justify-center">
                 <div className="absolute top-0 right-[-50vw] bottom-0 w-[100vw] bg-white opacity-50 z-0 pointer-events-none" />
                 <div className="relative z-10 w-full">
                   {getEngineMockText()}
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Command Center Video Space */}
      <section 
        ref={videoRef}
        className={`bg-white py-24 px-6 border-y-2 border-slate-200 transition-all duration-1000 transform ${videoInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
             
             {/* Left Column: Visual Placement */}
             <div className="order-2 md:order-1 relative w-full aspect-[16/10] bg-slate-50 border-2 border-slate-200 rounded-3xl flex flex-col items-center justify-center shadow-xl shadow-black/5 group hover:border-black transition-colors overflow-hidden">
                <div className="absolute inset-0 bg-[#5a8c12]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Activity className="text-slate-300 w-12 h-12 mb-4 group-hover:text-[#5a8c12] group-hover:scale-110 transition-all z-10" />
                <p className="font-bold text-slate-400 tracking-widest uppercase text-[10px] z-10">[ DASHBOARD WALKTHROUGH PLACEHOLDER ]</p>
             </div>
             
             {/* Right Column: Copy */}
             <div className="order-1 md:order-2 flex flex-col items-start text-left">
               <div className="flex items-center gap-2 px-3 py-1 border-2 border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest mb-6 bg-white rounded-lg">
                  <Activity size={12} className="text-[#5a8c12]" /> Command Center
               </div>
               <h2 className="text-4xl font-extralight tracking-tighter mb-5 text-black leading-tight">
                 Your Private <span className="font-bold border-b-2 border-slate-200">Hub.</span>
               </h2>
               <p className="text-lg text-slate-600 font-light leading-relaxed mb-8">
                 Review AI-scored frustrations, approve Strategic Rationales, and generate context-aware, helpful comments with one click—all in a pristine, focused environment.
               </p>
               <button className="bg-white text-black hover:bg-slate-50 transition-colors px-6 py-3.5 text-xs font-bold uppercase tracking-widest border-2 border-slate-200 hover:border-black flex items-center justify-center gap-2 rounded-xl">
                 Explore Dashboard <ArrowRight size={14} />
               </button>
             </div>

          </div>
        </div>
      </section>

      {/* Why Not Reddit Pro? */}
      <section 
        ref={redditRef}
        className={`py-24 px-6 max-w-5xl mx-auto transition-all duration-1000 transform ${redditInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
           <div>
             <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight">
               Reddit Pro gives you a megaphone.<br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500 font-extralight">Preemptly gives you a sniper rifle.</span>
             </h2>     
           </div>
           
           <div className="flex flex-col gap-6">
             <div className="pl-5 border-l-3 border-slate-200">
                <h4 className="text-lg font-bold mb-1.5 text-slate-900">The Megaphone</h4>
                <p className="text-slate-600 font-light leading-relaxed text-sm">
                  Reddit Pro will tell you that 5,000 people are talking about "SaaS". It gives you raw, unfiltered social listening data. You still have to sift through the noise manually.
                </p>
             </div>
             <div className="pl-5 border-l-3 border-black">
                <h4 className="text-lg font-bold mb-1.5 flex items-center gap-2 text-slate-900">
                  <Target size={18} className="text-[#5a8c12]" /> The Sniper Rifle
                </h4>
                <p className="text-slate-600 font-light leading-relaxed text-sm">
                  Preemptly doesn't care about volume. Our AI scores sentiment and specific pain points. We filter out the 4,990 useless comments and deliver the 10 people screaming for exactly what you sell.
                </p>
             </div>
           </div>
        </div>
      </section>

      {/* Pricing / Bento Grid */}
      <section 
        id="pricing"
        ref={pricingRef}
        className={`bg-[#FAFAFA] py-32 px-6 transition-all duration-1000 transform ${pricingInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extralight tracking-tighter text-black">Transparent Pricing. <span className="font-bold">Beta Phase.</span></h2>
            <p className="mt-4 text-slate-500 font-light max-w-xl mx-auto">Because our pipeline is heavily curated, we are currently onboarding strictly via application to ensure our AI computing power is dedicated to active hunters.</p>
          </div>

          {/* Bento Wrapper - Gap creates the thin inner lines */}
          <div className="grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-slate-200 bg-slate-200 gap-px shadow-xl shadow-black/5">
            
            {/* Box 1: Free Trial */}
            <div className="group relative bg-white p-10 md:p-14 flex flex-col justify-between overflow-hidden">
               {/* Inner glow on hover illuminating edges */}
               <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(90,140,18,0)] group-hover:shadow-[inset_0_0_50px_rgba(90,140,18,0.12)] transition-shadow duration-700 pointer-events-none z-10" />
               <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[#5a8c12]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
               
               <div className="relative z-20">
                 <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Phase 1: The Proof</div>
                 <div className="text-5xl font-black mb-6 text-black tracking-tighter">Free</div>
                 <p className="text-slate-600 font-light leading-relaxed mb-10 max-w-sm">
                   We spin up a dedicated listener for your industry. We will find and drop your first 10 hyper-qualified, screaming leads directly into your dashboard. Completely free. No credit card required.
                 </p>
               </div>
               <button 
                 onClick={() => setIsModalOpen(true)}
                 className="w-min whitespace-nowrap bg-white border-2 border-slate-200 text-black px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:border-black transition-colors relative z-20 hover:bg-slate-50"
               >
                 Launch Free Trial
               </button>
            </div>

            {/* Box 2: Beta Access */}
            <div className="group relative bg-white p-10 md:p-14 flex flex-col justify-between overflow-hidden">
               <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(90,140,18,0)] group-hover:shadow-[inset_0_0_50px_rgba(90,140,18,0.12)] transition-shadow duration-700 pointer-events-none z-10" />
               <div className="absolute top-0 right-0 bg-[#5a8c12] text-white text-[9px] font-black uppercase tracking-widest px-4 py-2 opacity-90 rounded-bl-xl z-20">
                 Closed Beta
               </div>

               <div className="relative z-20">
                 <div className="text-[10px] font-bold tracking-widest uppercase text-[#5a8c12] mb-4 flex items-center gap-2">
                    <Target size={12} /> Phase 2: Unlimited Access
                 </div>
                 <div className="flex items-baseline gap-3 mb-6">
                    <div className="text-5xl font-black text-black tracking-tighter">R500</div>
                    <div className="text-xl font-light text-slate-400">/mo</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest line-through decoration-slate-300 ml-2">R2500</div>
                 </div>
                 <p className="text-slate-600 font-light leading-relaxed mb-10 max-w-sm">
                   Once you see the value, upgrade to unlock unlimited lead intercepts, comprehensive AI rationale generation, and priority access to our upcoming CRM integrations.
                 </p>
               </div>
               <button 
                 onClick={() => setIsModalOpen(true)}
                 className="w-min whitespace-nowrap bg-black text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#5a8c12] transition-colors relative z-20 shadow-xl shadow-black/10"
               >
                 Apply for Beta
               </button>
            </div>

            {/* Box 3: Lifetime Lock (Full width span bottom) */}
            <div className="group relative bg-white p-10 md:p-14 md:col-span-2 flex flex-col md:flex-row md:items-center justify-between gap-10 overflow-hidden">
               <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(90,140,18,0)] group-hover:shadow-[inset_0_0_50px_rgba(90,140,18,0.12)] transition-shadow duration-700 pointer-events-none z-10" />
               
               <div className="relative z-20 flex-1">
                 <h4 className="text-lg font-bold text-slate-900 mb-2">Lifetime Pricing Lock</h4>
                 <p className="text-slate-600 font-light leading-relaxed max-w-3xl">
                   By boarding during the closed beta application phase, your rate gets permanently locked at R500/mo. When self-serve launches at R2,500/mo, you will retain your priority discount forever.
                 </p>
               </div>

               <div className="relative z-20 flex-shrink-0">
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#5a8c12] hover:text-black transition-colors"
                  >
                     Start The Process <ArrowRight size={14} />
                  </button>
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section 
        id="faq"
        ref={faqRef}
        className={`py-24 px-6 max-w-3xl mx-auto transition-all duration-1000 transform ${faqInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="flex flex-col items-center text-center mb-12">
          <div className="flex items-center gap-2 px-3 py-1 border border-blue-200 text-blue-600 text-[9px] font-black uppercase tracking-widest mb-5 bg-blue-50/50 rounded-full">
             <span className="w-1 h-1 bg-blue-600 rounded-full" />
             FAQ
          </div>
          <h2 className="text-3xl md:text-4xl font-extralight tracking-tighter text-black">Frequently asked questions</h2>
        </div>

        <div className="px-6 md:px-0">
          {FAQS.map((faq, index) => (
            <FAQItem key={index} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      <section 
        ref={leadRef}
        className={`bg-white text-slate-900 py-32 px-6 transition-all duration-1000 transform ${leadInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="max-w-2xl mx-auto text-center flex flex-col items-center">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#5a8c12] mb-8 bg-[#5a8c12]/5 px-4 py-2 rounded-full border border-[#5a8c12]/10">
            Final Beta Intake
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-black">Start intercepting leads today.</h2>
          <p className="text-slate-400 text-lg mb-10 font-light max-w-xl mx-auto">
            Stop waiting for inbound. Tell us who you want to talk to, and we'll deliver them directly to your Command Center.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="group relative inline-flex h-16 items-center justify-center overflow-hidden rounded-xl bg-black px-12 font-medium text-white duration-300 hover:bg-[#5a8c12] shadow-xl shadow-black/10"
          >
            <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
              <div className="relative h-full w-8 bg-white/10" />
            </div>
            <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
               Launch Free Trial <ArrowRight size={16} />
            </span>
          </button>
        </div>
      </section>

      <InteractiveOnboarding isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Footer */}
      <footer className="bg-white border-t-2 border-slate-100 py-12 px-6 text-center">
         <div className="flex items-center justify-center gap-3 mb-6 opacity-30">
            <div className="w-8 h-8 bg-black flex items-center justify-center rounded">
              <Target className="text-white w-4 h-4" />
            </div>
            <span className="font-black text-xl tracking-tighter">Preemptly</span>
          </div>
          <p className="text-slate-400 text-sm font-light">© 2026 Preemptly Growth Intelligence. All rights reserved.</p>
      </footer>

    </div>
  );
}
