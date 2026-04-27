import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, MessageCircle, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  type: 'bot' | 'user';
  text: string;
}

interface QA {
  q: string;
  a: string;
  followUps: string[];
}

const KNOWLEDGE_BASE: Record<string, QA> = {
  "What is Preemptly?": {
    q: "What is Preemptly?",
    a: "Preemptly finds people on Reddit and Stack Overflow who are asking for help with things you can do. It tells you when they post so you can talk to them and get hired.",
    followUps: ["How does it work?", "Is there a free trial?"]
  },
  "How does it work?": {
    q: "How does it work?",
    a: "We search Reddit for questions related to your business. When we find a match, we alert you and give you a draft response so you can reply quickly.",
    followUps: ["What do I actually get?", "Which platforms?"]
  },
  "What do I actually get?": {
    q: "What do I actually get?",
    a: "You get a list of links to Reddit posts where people need your help. We also give you a written explanation of why each post is a good lead for you.",
    followUps: ["How do I use it?", "How much does it cost?"]
  },
  "How do I use it?": {
    q: "How do I use it?",
    a: "1. Create a search alert. 2. Wait for us to find a post. 3. Click the link and reply to the person asking for help.",
    followUps: ["Is there a free trial?", "How much does it cost?"]
  },
  "Is there a free trial?": {
    q: "Is there a free trial?",
    a: "Yes. We will find your first 10 leads for free. You don't need a credit card to start.",
    followUps: ["How do I get started?", "How much does it cost?"]
  },
  "How much does it cost?": {
    q: "How much does it cost?",
    a: "It costs R500 per month during our early testing phase. If you join now, we'll give you double the number of search alerts for free.",
    followUps: ["Who is it for?", "How do I get started?"]
  },
  "Which platforms?": {
    q: "Which platforms?",
    a: "We currently find leads on Reddit and Stack Overflow.",
    followUps: ["How do I get started?"]
  },
  "Is this just social listening?": {
    q: "Is this just social listening?",
    a: "No. Social listening just tells you what people are saying. Preemptly tells you when someone is actually looking to buy what you sell.",
    followUps: ["How do I get started?"]
  }
};

const INITIAL_SUGGESTIONS = ["What is Preemptly?", "How does it work?"];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', type: 'bot', text: "Welcome to Preemptly! I'm here to help you understand how we find the conversations where your expertise drives organic growth. What would you like to know?" }
  ]);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSuggestionClick = (question: string) => {
    // Add user message
    const newMessage: Message = { id: Date.now().toString(), type: 'user', text: question };
    setMessages(prev => [...prev, newMessage]);
    setIsTyping(true);

    // Find answer
    const currentQA = KNOWLEDGE_BASE[question];
    
    // Simulate bot thinking
    setTimeout(() => {
      const botResponse: Message = { 
        id: (Date.now() + 1).toString(), 
        type: 'bot', 
        text: currentQA ? currentQA.a : "That's a great question. I'm still learning about that, but feel free to ask about our engine, pricing, or the free trial!" 
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);

      // Update suggestions
      if (currentQA && currentQA.followUps.length >= 2) {
        setSuggestions(currentQA.followUps.slice(0, 2));
      } else {
        // Fallback to random or initial if no specific followups
        setSuggestions(INITIAL_SUGGESTIONS);
      }
    }, 1000);
  };

  const openWhatsApp = () => {
    const phone = "0738349023";
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] md:w-[400px] h-[550px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-black p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#5a8c12] rounded-xl flex items-center justify-center shadow-lg shadow-[#5a8c12]/20 overflow-hidden">
                <img src="/preemptly-mascot.png" alt="Owl Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black text-sm tracking-tight">Preemptly Visibility</span>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-[#5a8c12] rounded-full animate-pulse" />
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Presence</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white opacity-50 hover:opacity-100 transition-opacity"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAFAFA]"
          >
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                  m.type === 'user' 
                    ? 'bg-black text-white rounded-br-none' 
                    : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-bl-none'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-bl-none animate-pulse flex gap-1">
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                </div>
              </div>
            )}
          </div>

          {/* Suggestions area */}
          <div className="p-4 bg-white border-t border-slate-100 space-y-2">
            {!isTyping && suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(s)}
                className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all hover:border-[#5a8c12] hover:translate-x-1"
              >
                {s}
              </button>
            ))}
            
            {/* Fixed WhatsApp Suggestion */}
            <button
              onClick={openWhatsApp}
              className="w-full text-left p-3.5 bg-[#5a8c12]/5 hover:bg-[#5a8c12]/10 border border-[#5a8c12]/20 rounded-xl text-xs font-black text-[#5a8c12] transition-all flex items-center justify-between group"
            >
              <span>Chat with us on WhatsApp</span>
              <MessageCircle size={14} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-500 scale-110 hover:scale-125 ${
          isOpen ? 'bg-black rotate-90' : 'bg-[#5a8c12] hover:bg-[#6baa15] animate-bounce'
        }`}
        style={{ animationDuration: '3s' }}
      >
        {isOpen ? (
          <X className="text-white" size={24} />
        ) : (
          <div className="relative">
             <MessageSquare className="text-white" size={24} />
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-[#5a8c12] flex items-center justify-center">
                <div className="w-1 h-1 bg-black rounded-full animate-ping" />
             </div>
          </div>
        )}
      </button>
    </div>
  );
}
