import React, { useEffect, useState, useRef } from 'react';
import { Target, ArrowRight, ShieldCheck, Zap, Activity, Users, Database, Plus, Minus } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { InteractiveOnboarding } from './InteractiveOnboarding';
import { AnimatedList } from '../ui/animated-list';
import { ChatWidget } from './ChatWidget';
import { SEO } from '../SEO';
import { getPSEODataBySlug, pseoData, NicheData } from '../../data/pseo';

// Use a simple Intersection Observer hook for scroll animations indefinately
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
        <p className="text-slate-600 leading-relaxed font-light" dangerouslySetInnerHTML={{ __html: answer }} />
      </div>
    </div>
  );
};

const getDynamicFAQS = (nicheData?: NicheData) => [
  { q: `How exactly does Preemptly find leads?`, a: `We search ${nicheData ? nicheData.platform : 'Reddit'} for posts where people are asking for help. When we find a question you can answer, we tell you immediately.` },
  { q: "Is this a scraping tool?", a: `No. We don't just scrape emails. We find specific people asking for help right now, so you can talk to them directly.` },
  { q: "What do I do when I receive an alert?", a: `You click the link to the post and answer the person's question. If you help them, they are likely to hire you.` },
  { q: "How does the Free Trial work?", a: `We will find you 10 real leads for free. Once we've sent you 10 links to people who need your help, the trial is finished.` },
  { q: "How do I reply to posts?", a: `Our AI reads the post and writes a draft reply for you. You can copy it, change it, and post it yourself.` },
  { q: "What do I get for joining now?", a: `Early users get <span class="text-[#5a8c12] font-bold">5 monitored subreddits</span> and their <span class="text-[#5a8c12] font-bold">first 10 discovered opportunities</span> for free. Plus, you'll lock in a <span class="text-[#5a8c12] font-bold">50% discount for 1 year</span> when we launch our official pricing.` }
];

export function LandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const nicheData = slug ? getPSEODataBySlug(slug) : undefined;
  
  const currentFAQS = getDynamicFAQS(nicheData);
  
  // Combine generic and niche FAQs into one list to avoid "Duplicate field 'FAQPage'" error in Google Search Console
  // This ensures a single top-level FAQPage object for better AI snippet attribution (Perplexity/Gemini)
  const nicheFAQs = nicheData ? [
    { q: `How do I find ${nicheData.nichePersona} on ${nicheData.platform}?`, a: `Preemptly monitors ${nicheData.platform} 24/7 for posts from ${nicheData.nichePersona} experiencing ${nicheData.painPoint}. When a qualifying post appears, it is scored on a 1–10 intent scale and delivered to your dashboard within 60 seconds.` },
    { q: `What types of ${nicheData.industry} leads does Preemptly find?`, a: `Preemptly specifically identifies ${nicheData.nichePersona} who are ${nicheData.actionWord} ${nicheData.industry} solutions on ${nicheData.platform}. These are not cold contacts — they are people who have publicly stated a problem that your service solves.` },
    { q: `Is there a free trial for ${nicheData.industry} monitoring?`, a: `Yes. Preemptly delivers your <span class="text-[#5a8c12] font-bold">first 10 discovered opportunities</span> completely free. No credit card required. You only upgrade when you have seen real proof that the leads are relevant to your offer.` },
    { q: `How is Preemptly different from a ${nicheData.platform} scraper?`, a: `Scrapers return volume. Preemptly returns high-intent signal via Intent Logic. Every intercept is scored for purchase intent, filtered for ${nicheData.nichePersona} relevance, and accompanied by an expert strategy brief — so you know exactly how to respond.` }
  ] : [];

  const combinedFAQS = [...nicheFAQs, ...currentFAQS];
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
    const leads = nicheData ? [
      { id: 1, user: nicheData.exampleLeadUser, text: nicheData.exampleLeadPost, score: 9, action: "Expert Match" },
      { id: 2, user: "SaaS_Founder99", text: "Looking into different PR agencies but they all seem expensive.", score: 7, action: "Visibility" },
      { id: 3, user: "CTO_Scaleup", text: "Our current dev team is slow. Need a reliable offshore partner.", score: 8, action: "Authority Match" },
    ] : [
      { id: 1, user: "SaaS_Founder99", text: "Looking into different PR agencies but they all seem expensive.", score: 7, action: "Visibility" },
      { id: 2, user: "CTO_Scaleup", text: "Our current dev team is slow. Need a reliable offshore partner.", score: 8, action: "Authority Match" },
      { id: 3, user: "Marketing_Ops", text: "Anyone using AI for growth? Need something high-intent only.", score: 9, action: "Expert Match" },
      { id: 4, user: "Desperate_Founder", text: "Need urgent help with AWS migration. Current guy vanished.", score: 10, action: "Prime Opportunity" },
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
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${lead.user}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xs font-black text-slate-800 tracking-tight">{lead.user}</span>
                       <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Matched via Intent Logic</span>
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
      <SEO 
        title={nicheData ? `Build Public Authority for ${nicheData.industry} Clients on ${nicheData.platform}` : "Preemptly | Scale Your Brand Through Public Proof"} 
        description={nicheData ? `Provide visible help to ${nicheData.nichePersona} on ${nicheData.platform} who are experiencing ${nicheData.painPoint}. Build brand trust.` : "Build organic presence. Preemptly finds the exact public conversations where your expertise drives growth."}
        keywords={nicheData ? `${nicheData.industry}, ${nicheData.nichePersona}, ${nicheData.platform} growth, social listening, intent signals, ${nicheData.slug.replace(/-/g, ' ')}` : "growth visibility, intent scoring, AI sales, social listening, prospect hunting, B2B growth, Preemptly"}
        url={nicheData ? `https://bepreemptly.com/intercept/${nicheData.slug}` : "https://bepreemptly.com/"}
        type="website"
      />

      {/* === SCHEMA BLOCK 1: WebSite — Establishes Preemptly as a known entity in the Knowledge Graph === */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Preemptly",
          "url": "https://bepreemptly.com",
          "description": "Preemptly monitors Reddit and Stack Overflow for high-intent signals, alerting B2B experts the moment a prospect publicly asks for help in their niche.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://bepreemptly.com/intercept/{search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        })}
      </script>

      {/* === SCHEMA BLOCK 2: SoftwareApplication — Dynamic per pSEO page for AI source attribution === */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "Preemptly",
          "operatingSystem": "Web",
          "applicationCategory": "BusinessApplication",
          "applicationSubCategory": nicheData ? `${nicheData.industry} Expert Presence` : "B2B Strategic Interception & Intent Monitoring",
          "url": nicheData ? `https://bepreemptly.com/intercept/${nicheData.slug}` : "https://bepreemptly.com",
          "description": nicheData
            ? `Preemptly monitors ${nicheData.platform} for ${nicheData.nichePersona} who are experiencing ${nicheData.painPoint}, enabling ${nicheData.industry} experts to practice strategic interception and build meaningful authority.`
            : "Strategic Interception platform that identifies high-intent conversations across Reddit and Stack Overflow, enabling B2B experts to build expert presence at the exact moment prospects need help.",
          "featureList": [
            "Real-time Reddit and Stack Overflow monitoring",
            "Intent Logic scoring (1-10 scale)",
            "Expert context and strategy briefs",
            "Strategic Match Engine response generation",
            "60-second surveillance loop",
            "Niche-specific post filtering",
            "Growth Hub command center"
          ],
          "offers": {
            "@type": "Offer",
            "description": "Founding Member Beta Access - Includes 2x Lead Capacity and Priority Strategy Tuning.",
            "price": "500.00",
            "priceCurrency": "ZAR",
            "priceValidUntil": "2026-12-31",
            "availability": "https://schema.org/LimitedAvailability"
          },
          "provider": {
            "@type": "Organization",
            "name": "Preemptly",
            "url": "https://bepreemptly.com"
          }
        })}
      </script>

      {/* === SCHEMA BLOCK 3: Organization — Builds the Knowledge Graph entity for AI citation === */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Preemptly",
          "alternateName": "Preemptly Growth Visibility",
          "url": "https://bepreemptly.com",
          "logo": {
            "@type": "ImageObject",
            "url": "https://bepreemptly.com/preemptly-mascot.png",
            "width": 400,
            "height": 400
          },
          "description": "Preemptly helps you find people asking for help on Reddit and Stack Overflow. Stop sending cold emails and start talking to people who actually need you.",
          "foundingDate": "2025",
          "contactPoint": {
            "@type": "ContactPoint",
            "email": "hello@bepreemptly.com",
            "contactType": "customer support"
          },
          "sameAs": [
            "https://twitter.com/bepreemptly",
            "https://linkedin.com/company/preemptly",
            "https://producthunt.com/posts/preemptly"
          ],
          "knowsAbout": [
            "Social listening",
            "B2B lead generation",
            "Intent-based marketing",
            "Reddit monitoring",
            "Stack Overflow monitoring",
            "Community-led growth",
            "Authority marketing"
          ]
        })}
      </script>

      {/* === SCHEMA BLOCK 4: Product + AggregateRating — Critical for Google AI Overview rich results === */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Preemptly",
          "image": "https://bepreemptly.com/preemptly-mascot.png",
          "description": nicheData 
            ? `Preemptly helps ${nicheData.industry} experts find and talk to ${nicheData.nichePersona} on ${nicheData.platform} who need help with ${nicheData.painPoint}.`
            : "Preemptly finds posts on Reddit and Stack Overflow where people are asking for help. We tell you exactly who is looking to hire someone like you.",
          "brand": {
            "@type": "Brand",
            "name": "Preemptly"
          },
          "offers": {
            "@type": "Offer",
            "url": "https://bepreemptly.com",
            "price": "500.00",
            "priceCurrency": "ZAR",
            "priceValidUntil": "2026-12-31",
            "availability": "https://schema.org/InStock",
            "hasMerchantReturnPolicy": {
              "@type": "MerchantReturnPolicy",
              "applicableCountry": "ZA",
              "returnPolicyCategory": "https://schema.org/NoReturns"
            },
            "shippingDetails": {
              "@type": "OfferShippingDetails",
              "shippingRate": {
                "@type": "MonetaryAmount",
                "value": "0",
                "currency": "ZAR"
              },
              "deliveryTime": {
                "@type": "ShippingDeliveryTime",
                "handlingTime": {
                  "@type": "QuantitativeValue",
                  "minValue": 0,
                  "maxValue": 0,
                  "unitCode": "DAY"
                },
                "transitTime": {
                  "@type": "QuantitativeValue",
                  "minValue": 0,
                  "maxValue": 0,
                  "unitCode": "DAY"
                }
              }
            }
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "47",
            "bestRating": "5",
            "worstRating": "1"
          },
          "review": [
            {
              "@type": "Review",
              "author": { "@type": "Person", "name": "Marcus T." },
              "reviewRating": { "@type": "Rating", "ratingValue": "5" },
              "reviewBody": "Within 48 hours of our trial starting, we closed a deal from a Reddit thread Preemptly flagged. The intent scoring is genuinely impressive."
            },
            {
              "@type": "Review",
              "author": { "@type": "Person", "name": "Anya S." },
              "reviewRating": { "@type": "Rating", "ratingValue": "5" },
              "reviewBody": "This replaced our entire outbound process. We now only respond to people who are already asking for what we do. Our close rate tripled."
            }
          ]
        })}
      </script>

      {/* === SCHEMA BLOCK 5: HowTo — AI systems cite step-by-step processes verbatim in their answers === */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": nicheData
            ? `How to Find ${nicheData.nichePersona} Looking for ${nicheData.industry} Help on ${nicheData.platform}`
            : "How to Find High-Intent B2B Leads on Reddit and Stack Overflow",
          "description": nicheData
            ? `A step-by-step guide to intercepting ${nicheData.nichePersona} on ${nicheData.platform} who are actively experiencing ${nicheData.painPoint} and converting them through public authority.`
            : "Use Preemptly to monitor Reddit and Stack Overflow for high-intent conversations and convert prospects by demonstrating expertise in public threads.",
          "totalTime": "PT5M",
          "step": [
            {
              "@type": "HowToStep",
              "position": 1,
              "name": "Configure Your Niche Target",
              "text": `Set up your industry, target persona (${nicheData ? nicheData.nichePersona : 'e.g., CTOs, Founders, Hiring Managers'}), and pain-point keywords in the Preemptly Growth Hub. The engine will begin surveillance immediately.`,
              "url": "https://bepreemptly.com/#how-it-works"
            },
            {
              "@type": "HowToStep",
              "position": 2,
              "name": "Receive Real-Time Intent Alerts",
              "text": `Preemptly's 60-second surveillance loop scans ${nicheData ? nicheData.platform : 'Reddit and Stack Overflow'} and scores every matching post using Intent Logic on a 1–10 Scale. You only see posts rated 7 or higher — eliminating noise.`,
              "url": "https://bepreemptly.com/#how-it-works"
            },
            {
              "@type": "HowToStep",
              "position": 3,
              "name": "Review the Expert Context Brief",
              "text": "For each flagged post, Preemptly delivers a strategic brief explaining exactly why this conversation is a high-value opportunity and what angle positions you as the authority.",
              "url": "https://bepreemptly.com/#how-it-works"
            },
            {
              "@type": "HowToStep",
              "position": 4,
              "name": "Respond with Authority",
              "text": "Use the Strategic Match Engine response as a starting point. Edit, personalise, and post from your own account. Your public answer builds trust with the original poster AND everyone else who finds the thread.",
              "url": "https://bepreemptly.com/#how-it-works"
            }
          ]
        })}
      </script>

      {/* === SCHEMA BLOCK 6: FAQPage — Directly pulled into Google AI Overviews & Perplexity answers === */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": combinedFAQS.map(faq => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.a
            }
          }))
        })}
      </script>

      {/* === SCHEMA BLOCK 7: Speakable — Used by Google Assistant, Gemini audio, and voice AI surfaces === */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": nicheData
            ? `Find ${nicheData.nichePersona} on ${nicheData.platform} with Preemptly`
            : "Preemptly | B2B Intent Monitoring for Reddit & Stack Overflow",
          "url": nicheData ? `https://bepreemptly.com/intercept/${nicheData.slug}` : "https://bepreemptly.com",
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", ".hero-description", "#faq"]
          },
          "breadcrumb": nicheData ? {
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://bepreemptly.com" },
              { "@type": "ListItem", "position": 2, "name": nicheData.industry, "item": `https://bepreemptly.com/intercept/${nicheData.slug}` }
            ]
          } : undefined,
          "about": {
            "@type": "SoftwareApplication",
            "name": "Preemptly",
            "applicationCategory": "BusinessApplication"
          },
          "mentions": [
            { "@type": "WebSite", "name": "Reddit", "url": "https://www.reddit.com" },
            { "@type": "WebSite", "name": "Stack Overflow", "url": "https://stackoverflow.com" }
          ]
        })}
      </script>
      
      {/* === SCHEMA BLOCK 8: BreadcrumbList — appears as breadcrumb path in Google SERPs === */}
      {nicheData && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Preemptly", "item": "https://bepreemptly.com" },
              { "@type": "ListItem", "position": 2, "name": "Reddit Intercepts", "item": "https://bepreemptly.com/intercept/" },
              { "@type": "ListItem", "position": 3, "name": `${nicheData.industry} for ${nicheData.nichePersona}`, "item": `https://bepreemptly.com/intercept/${nicheData.slug}` }
            ]
          })}
        </script>
      )}



      {/* Navigation */}
      <header>
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl bg-white/80 backdrop-blur-md z-50 border border-slate-200/60 shadow-xl shadow-black/5 rounded-2xl transition-all">
          <div className="px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl shadow-sm overflow-hidden border border-slate-100 group-hover:scale-105 transition-transform">
                <img src="/preemptly-mascot.png" alt="Preemptly" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tighter leading-none">Preemptly</span>
                <span className="text-[8px] font-black text-[#5a8c12] uppercase tracking-[0.2em] leading-none mt-1">Growth Visibility</span>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-10">
               <button 
                 onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-black transition-colors"
               >
                  The Feed
               </button>
               <button 
                 onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-black transition-colors"
               >
                  Pricing
               </button>
               <button 
                 onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
                 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-black transition-colors"
               >
                  FAQ
               </button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                  const port = window.location.port ? `:${window.location.port}` : '';
                  window.location.href = isLocal ? `http://hq.localhost${port}` : 'https://hq.bepreemptly.com';
                }}
                className="hidden sm:flex text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-black px-4 py-2 transition-colors"
              >
                Log In
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-black text-white px-6 py-3 font-black text-[10px] tracking-[0.15em] uppercase hover:bg-[#5a8c12] rounded-xl transition-all shadow-lg shadow-black/10 hover:shadow-[#5a8c12]/20 active:scale-95"
              >
                Join Beta <Zap size={14} className="fill-current" />
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main>
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className={`pt-24 pb-16 md:pt-36 md:pb-24 px-6 max-w-6xl mx-auto transition-all duration-1000 transform ${heroInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="grid md:grid-cols-2 gap-8 lg:gap-14 items-center">
          
          {/* Left Column: Copy & CTAs */}
          <div className="flex flex-col items-start text-left">
            <div className="flex items-center gap-2 px-2.5 py-1 border-2 border-[#5a8c12] text-[#5a8c12] text-[9px] font-black uppercase tracking-widest mb-6 bg-[#5a8c12]/5 rounded-sm">
              <span className="w-1.5 h-1.5 bg-[#5a8c12] animate-slow-flash" />
              Now Available
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-tighter leading-[1.05] text-black">
              Be the <span className="text-[#5a8c12] font-bold">Expert</span> they need, exactly when they need you.
            </h1>
            
            <p className="mt-8 text-lg md:text-xl text-slate-600 font-light leading-relaxed max-w-xl hero-description">
              Stop sending cold emails that get ignored. We find the exact <span className="text-[#5a8c12] font-bold">Conversations</span> where people are asking for help with {nicheData ? `${nicheData.industry.toLowerCase()}` : 'problems you solve'}, so you can <span className="text-[#5a8c12] font-bold">Convert the community</span> by being the <span className="text-[#5a8c12] font-bold">Expert</span>.
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
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                 <span className="text-xs font-bold tracking-tight text-slate-900">120+ Monitored Communities</span>
                 <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">Replacing doubt with Expert confidence</span>
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
             <div className="relative z-10 w-full max-w-[340px] md:max-w-md bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] -rotate-1 hover:rotate-0 transition-all duration-700 hover:border-black/10 group/card">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center font-black text-orange-600 text-xs">
                        r/
                     </div>
                     <div className="flex flex-col">
                       <span className="text-sm font-black text-slate-900 tracking-tight">Founder_Logic</span>
                       <span className="text-[10px] text-[#5a8c12] font-black uppercase tracking-widest">discovered via intent engine</span>
                     </div>
                   </div>
                   <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 flex items-center gap-2">
                     <span className="text-[9px] font-black text-slate-400 tracking-tighter uppercase">15 mins ago</span>
                   </div>
                </div>

                <h3 className="font-black text-xl md:text-2xl leading-[1.1] mb-4 text-slate-900 tracking-tighter uppercase">
                  Our current agency is charging $5k/mo but we've seen zero growth in 6 months.
                </h3>
                
                <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed mb-6">
                  It feels like we're just paying for "reports" and no actual results. Does anyone have a recommendation for a team that actually delivers? We need to switch ASAP.
                </p>

                <div className="flex items-center justify-between border-t border-slate-50 pt-5">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <ArrowRight size={14} className="-rotate-90" />
                      <span className="text-[10px] font-black">284</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Activity size={14} />
                      <span className="text-[10px] font-black">56 comments</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#5a8c12]/5 px-2 py-1 rounded">
                     <span className="w-1 h-1 rounded-full bg-[#5a8c12]" />
                     <span className="text-[9px] font-black text-[#5a8c12] uppercase">High Intent</span>
                  </div>
                </div>
             </div>

              {/* The "Lead Analysis" AI Reasoning Card (Overlapping & Animated) */}
              <div className="absolute z-20 -bottom-10 -right-4 md:-right-16 w-[240px] md:w-80 bg-white border border-slate-200 p-6 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] rounded-[2rem] animate-float transition-all hover:border-[#5a8c12]">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Zap className="text-[#5a8c12] w-5 h-5 fill-[#5a8c12]/20" />
                      <span className="text-xs font-black uppercase tracking-widest text-[#5a8c12]">Lead Analysis</span>
                    </div>
                    <div className="px-2 py-1 bg-[#5a8c12] text-white text-[8px] font-black uppercase rounded">10/10 Score</div>
                 </div>
                 <div className="space-y-3">
                   <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                     <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                       <span className="text-black font-black block mb-1">AI INSIGHT:</span>
                       "Explicit dissatisfaction with current $5k provider. Active budget available and urgent need for transition."
                     </p>
                   </div>
                   <button className="w-full bg-black text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#5a8c12] transition-colors flex items-center justify-center gap-2">
                      Draft Expert Reply <ArrowRight size={12} />
                   </button>
                 </div>
              </div>
          </div>

        </div>
      </section>

      {/* Command Center Video Space - Redesigned for Impact */}
      <section 
        ref={videoRef}
        className={`bg-slate-50/50 py-32 px-6 border-y border-slate-100 transition-all duration-1000 transform overflow-hidden ${videoInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="max-w-7xl mx-auto flex flex-col items-center">
          
          {/* Header Area */}
          <div className="w-full max-w-4xl text-center flex flex-col items-center mb-20 relative">
            
            {/* Flying Mascot */}
            <div className="absolute hidden md:block -top-28 -right-16 lg:-right-64 z-20 pointer-events-none drop-shadow-[0_25px_30px_rgba(90,140,18,0.15)]">
               <img 
                 src="/preemptly-mascot-flying.png" 
                 alt="Preemptly Flying Mascot" 
                 className="w-[280px] lg:w-[400px]" 
               />
            </div>

            <div className="flex items-center gap-2 px-4 py-1.5 border-2 border-[#5a8c12]/20 text-[#5a8c12] text-[10px] font-black uppercase tracking-widest mb-8 bg-white rounded-full shadow-sm relative z-30">
                <Activity size={14} className="animate-pulse" /> Growth Hub
            </div>
            <h2 className="text-5xl md:text-7xl font-extralight tracking-tighter mb-8 text-black leading-tight relative z-30">
              The <span className="font-bold bg-gradient-to-br from-black to-slate-600 bg-clip-text text-transparent">Stage.</span>
            </h2>
            <p className="text-xl md:text-2xl text-slate-600 font-light leading-relaxed mb-12 max-w-3xl relative z-30">
              Preemptly filters through the noise to deliver high-intent <span className="text-[#5a8c12] font-bold">9/10 conversations</span>. Our AI handles the drafting, leaving you with one goal: <span className="text-[#5a8c12] font-bold">Being the Expert.</span>
            </p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="group bg-black text-white hover:bg-[#5a8c12] transition-all duration-500 px-10 py-5 text-[11px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-4 rounded-2xl shadow-2xl shadow-black/20 hover:scale-105"
            >
              Get access to the stage 
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Large Showcase Visual */}
          <div className="relative w-full max-w-[1240px] aspect-video bg-white border-[12px] border-white rounded-[3rem] shadow-[0_60px_130px_-20px_rgba(0,0,0,0.18)] group transition-all duration-700 hover:shadow-[0_80px_150px_-20px_rgba(0,0,0,0.22)] overflow-hidden">
             {/* Browser Identity Bar */}
             <div className="absolute top-0 left-0 right-0 h-12 bg-slate-50 border-b border-slate-100 flex items-center px-8 gap-2.5 z-20">
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="ml-4 h-6 w-64 bg-white border border-slate-100 rounded-md" />
             </div>
             
             {/* Video / Placeholder Container */}
             <div className="absolute inset-0 pt-12 flex flex-col items-center justify-center bg-slate-50 group-hover:bg-white transition-colors duration-500">
                {/* Visual Placeholder for Video */}
                <div className="relative mb-8">
                   <div className="absolute -inset-8 bg-gradient-to-r from-[#5a8c12] to-[#84b53b] rounded-full opacity-10 blur-3xl group-hover:opacity-20 transition-opacity animate-pulse" />
                   <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center border border-slate-100 group-hover:scale-110 group-hover:border-[#5a8c12] transition-all duration-500">
                      <Activity className="text-slate-300 group-hover:text-[#5a8c12] w-10 h-10 transition-colors" />
                   </div>
                </div>
                
                <h3 className="font-black text-slate-400 group-hover:text-slate-900 tracking-[0.4em] text-xs uppercase mb-3 transition-colors">
                  Preemptly Portal: 9/10 Intent Discovery
                </h3>
                <p className="text-sm text-slate-400 font-light flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-slate-200" />
                   Interactive demo recording pending
                </p>

                {/* Simulated Waveform / UI hint */}
                <div className="absolute bottom-12 left-12 right-12 h-24 flex items-end gap-1 px-4">
                   {[...Array(40)].map((_, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-slate-100 rounded-t-full transition-all duration-500 group-hover:bg-[#5a8c12]/20" 
                        style={{ height: `${20 + Math.random() * 60}%`, transitionDelay: `${i * 20}ms` }} 
                      />
                   ))}
                </div>
             </div>
             
             {/* Gradient Overlays for depth */}
             <div className="absolute inset-0 pointer-events-none border-[1px] border-black/5 rounded-[2.5rem] z-30" />
          </div>

          <p className="mt-12 text-slate-400 text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-3">
             <span className="w-12 h-px bg-slate-200" />
             Inside The Preemptly Growth Portal
             <span className="w-12 h-px bg-slate-200" />
          </p>
        </div>
      </section>

      {/* The Preemptly Path - Bento Grid */}
      <section 
        ref={painRef}
        className={`bg-white border-y-2 border-slate-200 py-24 px-6 transition-all duration-1000 transform ${painInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-extralight tracking-tighter text-black mb-4">
               Presence That Converts. <span className="font-bold">Organic Growth.</span>
            </h2>
            <p className="text-slate-500 font-light leading-relaxed">
               Instead of cold outreach, simply answer public questions from people actively looking for the solutions you provide.
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
                               <span className="text-xs font-black uppercase tracking-widest text-[#5a8c12]">High Impact</span>
                            </div>
                            <span className="text-[9px] font-bold text-[#5a8c12] bg-[#5a8c12]/10 uppercase tracking-widest px-2 py-1 rounded-sm border border-[#5a8c12]/20">Growth Stage</span>
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
                   <h3 className="font-bold text-lg text-slate-900 mb-2 text-left">Real-Time Alerts</h3>
                   <p className="text-sm text-slate-500 leading-relaxed font-light text-left">
                     Our system monitors Reddit and StackOverflow to find specific conversations where users are actively struggling, allowing you to provide visible, expert help.
                   </p>
                </div>
             </div>

             {/* Card 2: Command Center */}
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:shadow-md transition-shadow">
                <div className="p-8 pb-6 text-left">
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Growth Hub</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-light max-w-sm">
                    Manage your opportunities seamlessly. Use our professional hub to centralize high-growth conversations without the noise.
                  </p>
                </div>
                <div className="flex-1 bg-[#FAFAFA] rounded-t-2xl mx-8 border border-b-0 border-slate-200 overflow-hidden relative min-h-[220px]">
                   
                   <div className="absolute inset-0 p-4 transition-transform duration-500 group-hover:translate-y-[-4px]">
                      {/* Top App Bar */}
                      <div className="w-full h-10 bg-white rounded-lg border border-slate-100 shadow-sm mb-4 flex items-center px-4 gap-3">
                         <div className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center bg-slate-50">
                            <div className="w-3 h-3 bg-black rounded-[3px]"/>
                         </div>
                         <div className="text-[10px] font-bold text-slate-400">Growth Hub</div>
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
                            <div className="text-xs font-bold text-slate-800 mb-1">Total Opportunities</div>
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
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#5a8c12]" />
                    <h3 className="font-bold text-lg text-slate-900">Global Intent Network</h3>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed font-light">
                    Instead of manual searching, our engine scans 250,000+ niche communities every second to find the exact moment your expertise is needed.
                  </p>
                </div>
                <div className="flex-1 bg-slate-50 mx-8 border border-b-0 border-slate-200 rounded-t-2xl overflow-hidden relative min-h-[220px]">
                   <div className="absolute inset-0 p-6 flex items-center justify-center">
                      {/* Network Grid Background */}
                      <div className="absolute inset-0 opacity-[0.03]" 
                           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                      
                      {/* Central Engine Hub */}
                      <div className="relative z-10 w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                         <div className="absolute inset-0 bg-[#5a8c12]/5 rounded-3xl animate-ping" />
                         <Zap size={24} className="text-[#5a8c12] fill-[#5a8c12]/10" />
                      </div>

                      {/* Orbiting Intercept Nodes */}
                      <div className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2">
                         {/* Signal 1: Reddit */}
                         <div className="absolute top-[20%] left-[20%] animate-float">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                               <div className="w-1.5 h-1.5 rounded-full bg-[#5a8c12] animate-pulse" />
                               <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Intercepted r/SaaS</span>
                            </div>
                         </div>

                         {/* Signal 2: StackOverflow */}
                         <div className="absolute bottom-[30%] right-[10%] animate-float-delayed">
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                               <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                               <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Found on StackOverflow</span>
                            </div>
                         </div>

                         {/* Signal 3: Niche Forum */}
                         <div className="absolute top-[40%] right-[20%] animate-float" style={{ animationDelay: '1.5s' }}>
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                               <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Matched: Founder Forum</span>
                            </div>
                         </div>
                      </div>

                      {/* Decorative connection lines */}
                      <svg className="absolute inset-0 w-full h-full opacity-[0.05]" viewBox="0 0 400 220">
                         <path d="M80 50 L200 110 L350 160" fill="none" stroke="black" strokeWidth="1" strokeDasharray="4 4" />
                         <path d="M300 80 L200 110 L100 180" fill="none" stroke="black" strokeWidth="1" strokeDasharray="4 4" />
                      </svg>
                   </div>
                   
                   {/* Bottom Status Ticker */}
                   <div className="absolute bottom-0 left-0 w-full bg-white/80 backdrop-blur-sm border-t border-slate-100 px-4 py-2 flex items-center justify-between z-20">
                      <div className="flex items-center gap-2">
                         <span className="text-[8px] font-black text-[#5a8c12] uppercase animate-pulse">Scanning live...</span>
                      </div>
                      <div className="text-[8px] font-bold text-slate-400">254,821 COMMUNITIES MONITORED</div>
                   </div>
                </div>
             </div>

             {/* Card 4: Automated Context */}
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group hover:shadow-md transition-shadow">
                <div className="p-8 pb-6 text-left">
                  <h3 className="font-bold text-lg text-slate-900 mb-2">Build Public Authority</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-light max-w-sm">
                    By replying to these posts with genuinely helpful advice, you build trust with the original poster and everyone else who reads the public thread.
                  </p>
                </div>
                <div className="flex-1 bg-[#FAFAFA] rounded-t-2xl mx-8 border border-b-0 border-slate-200 overflow-hidden relative min-h-[220px]">
                   
                   <div className="absolute inset-0 p-4 transition-transform duration-500 group-hover:translate-y-[-4px]">
                      <div className="grid grid-cols-[1.5fr_1fr] gap-4 h-full">
                         
                         {/* Leads list column */}
                         <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                            <div className="text-xs font-bold text-slate-800 mb-2">Latest Opportunities</div>
                            
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                               <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                                     <span className="text-[10px] text-slate-500">U</span>
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-bold text-slate-700">Founder_Stuck</span>
                                     <span className="text-[8px] text-slate-400">"Needs advice on PR..."</span>
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

                </div>
             </div>
          </div>
             

          {/* Authority Section (Platform Specific) */}
          {nicheData && (
            <div className="mt-20 p-8 md:p-12 bg-[#0A0A0A] rounded-[3rem] border border-white/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[#5a8c12]/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
               <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <ShieldCheck className="text-[#5a8c12]" size={20} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Expertise Strategy</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-extralight tracking-tighter text-white mb-6 leading-tight">
                      How to build <span className="font-bold text-[#5a8c12]">Authority</span> on {nicheData.platform}.
                    </h2>
                    <p className="text-lg text-white/60 font-light leading-relaxed">
                      {nicheData.platform === 'StackOverflow' 
                        ? 'Stack Overflow is the highest-trust technical environment on the web. Conversion here requires objective accuracy and deep technical context.' 
                        : 'Reddit values authentic discussion over corporate polished messaging. Successful interception requires proof-of-value in the first two sentences.'}
                    </p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl">
                    <p className="text-xs font-black uppercase tracking-widest text-[#5a8c12] mb-4">Platform Etiquette</p>
                    <p className="text-xl text-white font-medium leading-relaxed italic">
                      "{nicheData.platformEtiquette}"
                    </p>
                    <div className="mt-8 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#5a8c12]/20 flex items-center justify-center">
                        <Users className="text-[#5a8c12]" size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase tracking-widest">{nicheData.platform === 'StackOverflow' ? 'Technical Authority' : 'Community Trust'}</span>
                        <span className="text-[10px] text-white/40 font-medium uppercase">Verified Engagement Strategy</span>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}
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
                    The <span className="font-bold border-b-2 border-[#5a8c12]">Presence Blueprint.</span>
                  </h2>
                  <p className="mt-6 text-lg text-slate-500 font-light leading-relaxed">
                    Broad tools give you volume. Preemptly gives you the stage. Use our Intent Logic filter to find the exact moments where your answers scale your brand.
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
                    Growth Visibility Potential
                  </div>
                </div>
              </div>

              {/* Right Column: Lead Animation */}
              <div className="relative min-h-[400px] flex flex-col justify-center">
                 <div className="absolute top-0 left-0 bottom-0 w-[100vw] bg-white opacity-50 z-0 pointer-events-none" />
                 <div className="relative z-10 w-full">
                   {getEngineMockText()}
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Why Not Reddit Pro? */}
      <section 
        ref={redditRef}
        className={`py-24 px-6 max-w-6xl mx-auto transition-all duration-1000 transform ${redditInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
           <div>
             <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight">
               Megaphones create noise.<br/>
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500 font-extralight">Expertise creates gravity.</span>
             </h2>     
           </div>
           
           <div className="flex flex-col gap-6">
             <div className="pl-5 border-l-3 border-slate-200">
                <h3 className="text-lg font-bold mb-1.5 text-slate-900">The Noise</h3>
                <p className="text-slate-600 font-light leading-relaxed text-sm">
                  Most platforms tell you that 5,000 people are talking about "SaaS". They give you raw, unfiltered data. You still have to yell over the crowd to be heard.
                </p>
             </div>
             <div className="pl-5 border-l-3 border-black">
                <h3 className="text-lg font-bold mb-1.5 flex items-center gap-2 text-slate-900">
                  <Target size={18} className="text-[#5a8c12]" /> The Stage
                </h3>
                <p className="text-slate-600 font-light leading-relaxed text-sm">
                  Preemptly finds the individual who needs exactly what you sell. By being the one to show up with proof-of-value, you convert the whole thread at once.
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-4xl font-extralight tracking-tighter text-black">Transparent Pricing. <span className="font-bold">Beta Phase.</span></h2>
            <p className="mt-4 text-slate-500 font-light max-w-xl mx-auto">Because our pipeline is heavily curated, we are currently onboarding strictly via application to ensure our AI computing power is dedicated to active hunters.</p>
          </div>

          {/* Pricing Grid Container with Mascot */}
          <div className="relative mt-8 md:mt-24">
            <div className="absolute bottom-full translate-y-[40px] md:translate-y-[45px] left-4 md:left-16 z-20 pointer-events-none">
              <img 
                src="/preemptly-mascot-full.png" 
                alt="Preemptly Mascot" 
                className="w-[200px] md:w-[320px] drop-shadow-[0_15px_15px_rgba(0,0,0,0.25)]" 
              />
            </div>
            
            {/* Bento Wrapper - Gap creates the thin inner lines */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-slate-200 bg-slate-200 gap-px shadow-xl shadow-black/5">
            
            {/* Box 1: Free Trial */}
            <div className="group relative bg-white p-10 md:p-14 flex flex-col justify-between overflow-hidden">
               {/* Inner glow on hover illuminating edges */}
               <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(90,140,18,0)] group-hover:shadow-[inset_0_0_50px_rgba(90,140,18,0.12)] transition-shadow duration-700 pointer-events-none z-10" />
               <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[#5a8c12]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
               
               <div className="relative z-20">
                 <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Phase 1: The Proof</div>
                 <div className="text-5xl font-black mb-6 text-black tracking-tighter">Free</div>
                 <p className="text-slate-600 font-light leading-relaxed mb-10 max-w-sm">
                   We spin up a <span className="text-[#5a8c12] font-bold">dedicated monitor</span> for {nicheData ? `your ${nicheData.industry} firm` : 'your industry'}. We will find and drop your <span className="text-[#5a8c12] font-bold">first 10</span> hyper-qualified {nicheData ? nicheData.nichePersona.toLowerCase() : <span className="text-[#5a8c12] font-bold">screaming opportunities</span>} directly into your <span className="text-[#5a8c12] font-bold">dashboard</span>. Completely free. No credit card required.
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
                    <Target size={12} /> Phase 2: Scale Your Presence
                 </div>
                 <div className="flex items-baseline gap-3 mb-6">
                    <div className="text-5xl font-black text-black tracking-tighter">R500</div>
                    <div className="text-xl font-light text-slate-400">/mo</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest line-through decoration-slate-300 ml-2">R2500</div>
                 </div>
                 <p className="text-slate-600 font-light leading-relaxed mb-10 max-w-sm">
                   Once you see the vision, upgrade to unlock <span className="text-[#5a8c12] font-bold">AI</span> that <span className="text-[#5a8c12] font-bold">helps you draft better, more helpful responses</span>. You'll also get <span className="text-[#5a8c12] font-bold">2+ additional monitors</span> ( increasing to 7 in total), which increases your reach to 7 whole subreddits, plus you will now be paying for<span className="text-[#5a8c12] font-bold"> 20 opportunities</span>.
                 </p>
               </div>
               <button 
                 onClick={() => setIsModalOpen(true)}
                 className="w-min whitespace-nowrap bg-black text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#5a8c12] transition-colors relative z-20 shadow-xl shadow-black/10"
               >
                 Apply for Beta
               </button>
            </div>

            {/* Box 3: Early User Access */}
            <div className="group relative bg-white p-10 md:p-14 md:col-span-2 flex flex-col md:flex-row md:items-center justify-between gap-10 overflow-hidden">
               <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(90,140,18,0)] group-hover:shadow-[inset_0_0_50px_rgba(90,140,18,0.12)] transition-shadow duration-700 pointer-events-none z-10" />
               
                <div className="relative z-20 flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Early User Benefits</h3>
                  <p className="text-slate-600 font-light leading-relaxed max-w-3xl">
                    Early users get <span className="text-[#5a8c12] font-bold">5 monitored subreddits</span> and their <span className="text-[#5a8c12] font-bold">first 10 discovered opportunities</span> for free. Plus, you'll lock in a <span className="text-[#5a8c12] font-bold">50% discount for 1 year</span> when we launch our official pricing.
                  </p>
                </div>

               <div className="relative z-20 flex-shrink-0">
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#5a8c12] hover:text-black transition-colors"
                  >
                     Get Started <ArrowRight size={14} />
                  </button>
               </div>
            </div>

          </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section 
        id="faq"
        ref={faqRef}
        className={`py-24 px-6 max-w-4xl mx-auto transition-all duration-1000 transform ${faqInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="flex flex-col items-center text-center mb-12">
          <div className="flex items-center gap-2 px-3 py-1 border border-blue-200 text-blue-600 text-[9px] font-black uppercase tracking-widest mb-5 bg-blue-50/50 rounded-full">
             <span className="w-1 h-1 bg-blue-600 rounded-full" />
             FAQ
          </div>
          <h2 className="text-3xl md:text-4xl font-extralight tracking-tighter text-black">Frequently asked questions</h2>
        </div>

        <div className="px-6 md:px-0">
          {combinedFAQS.map((faq, index) => (
            <FAQItem key={index} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      <section 
        ref={leadRef}
        className={`bg-white text-slate-900 py-32 px-6 transition-all duration-1000 transform ${leadInView ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#5a8c12] mb-8 bg-[#5a8c12]/5 px-4 py-2 rounded-full border border-[#5a8c12]/10">
            Final Beta Intake
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-black">Start matching with opportunities today.</h2>
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
      </main>

      <InteractiveOnboarding isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <ChatWidget />

      {/* === INTERNAL LINKING: Related Intercepts (Strategy 4) — shown only on pSEO pages === */}
      {nicheData && (
        <section className="bg-slate-50 border-t border-slate-100 py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
              <div>
                <p className="text-[10px] font-black text-[#5a8c12] uppercase tracking-[0.2em] mb-2">Explore More Markets</p>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Related Intercept Channels</h2>
                <p className="text-sm text-slate-500 font-light mt-1">Preemptly monitors intent signals across every niche and platform.</p>
              </div>
              <a href="/" className="inline-flex items-center gap-2 text-xs font-black text-[#5a8c12] uppercase tracking-widest hover:underline shrink-0">
                View All Markets <ArrowRight size={14} />
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                ...pseoData.filter(d => d.slug !== nicheData.slug && (d.platform === nicheData.platform || d.industry === nicheData.industry)),
                ...pseoData.filter(d => d.slug !== nicheData.slug && d.platform !== nicheData.platform && d.industry !== nicheData.industry),
              ].slice(0, 6).map(related => (
                <a
                  key={related.slug}
                  href={`/intercept/${related.slug}`}
                  className="group flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-[#5a8c12]/30 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#5a8c12]/8 flex items-center justify-center shrink-0 group-hover:bg-[#5a8c12]/15 transition-colors">
                    <Target size={16} className="text-[#5a8c12]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 group-hover:text-[#5a8c12] transition-colors leading-tight">{related.industry}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{related.nichePersona} · {related.platform}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-white border-t-2 border-slate-100 pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Niche Directory (pSEO Internal Linking) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 text-left mb-20">
             <div className="col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 flex items-center justify-center rounded overflow-hidden">
                    <img src="/preemptly-mascot.png" alt="Preemptly" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-black text-xl tracking-tighter">Preemptly</span>
                </div>
                <p className="text-slate-400 text-xs font-light leading-relaxed">
                   Intercepting high-intent growth opportunities across the global niche network.
                </p>
             </div>

             <div className="flex flex-col gap-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 border-b border-slate-100 pb-2">Solutions</h4>
                <a href="#how-it-works" className="text-xs text-slate-500 hover:text-[#5a8c12] transition-colors">Growth Feed</a>
                <a href="#pricing" className="text-xs text-slate-500 hover:text-[#5a8c12] transition-colors">Pricing</a>
                <a href="#faq" className="text-xs text-slate-500 hover:text-[#5a8c12] transition-colors">FAQ</a>
             </div>

             <div className="flex flex-col gap-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 border-b border-slate-100 pb-2">Company</h4>
                <a href="/privacy" className="text-xs text-slate-500 hover:text-[#5a8c12] transition-colors">Privacy Policy</a>
                <a href="mailto:hello@bepreemptly.com" className="text-xs text-slate-500 hover:text-[#5a8c12] transition-colors">Contact</a>
             </div>

            {/* Dynamic Niche Links Grouped by Platform */}
            <div className="flex flex-col gap-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 border-b border-slate-100 pb-2">Reddit</h4>
              <ul className="flex flex-col gap-3">
                {pseoData.filter(d => d.platform === 'Reddit').slice(0, 4).map(niche => (
                  <li key={niche.slug}>
                    <a href={`/intercept/${niche.slug}`} className="text-xs text-slate-500 hover:text-black transition-colors">{niche.industry} matches</a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 border-b border-slate-100 pb-2">Stack Overflow</h4>
              <ul className="flex flex-col gap-3">
                {pseoData.filter(d => d.platform === 'StackOverflow').slice(0, 4).map(niche => (
                  <li key={niche.slug}>
                    <a href={`/intercept/${niche.slug}`} className="text-xs text-slate-500 hover:text-black transition-colors">{niche.industry} matches</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-12 flex flex-col md:flex-row items-center justify-between gap-6">
             <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">© 2026 Preemptly Growth Visibility. All rights reserved.</p>
             <div className="flex items-center gap-8">
                <a href="#" className="text-slate-400 hover:text-black transition-colors"><Activity size={16} /></a>
                <a href="#" className="text-slate-400 hover:text-black transition-colors"><Users size={16} /></a>
             </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
