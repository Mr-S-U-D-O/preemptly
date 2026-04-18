export interface Scraper {
  id: string;
  name: string;
  subreddit: string;
  platform?: string;
  target?: string;
  city?: string;
  category?: string;
  keyword: string;
  intervalMinutes: number;
  leadDefinition?: string;
  clientName?: string;
  clientPhone?: string;
  idealCustomerProfile?: string;
  status: 'active' | 'paused';
  createdAt: any;
  lastRunAt?: any;
  lastError?: string | null;
  lastErrorAt?: any;
  userId: string;
  icon?: string;
  
  // Client Portal & Personalization
  portalToken?: string | null;
  trialLimit?: number;
  isPaid?: boolean;
  totalPushedLeads?: number;
  totalClientClicks?: number;
  
  // Custom Context for Outreach
  portalSetupCompleted?: boolean;
  isSoloFreelancer?: boolean;
  clientBusiness?: string;
  clientSells?: string;
  clientDoes?: string;
  clientTone?: 'professional' | 'friendly' | 'technical';
  isAiEnabled?: boolean;
}

export interface Lead {
  id: string;
  scraperId: string;
  subreddit: string;
  platform?: string;
  target?: string;
  city?: string;
  category?: string;
  keyword: string;
  postTitle: string;
  postUrl: string;
  postAuthor: string;
  postContent?: string;
  score?: number;
  reason?: string;
  status?: 'new' | 'viewed' | 'sent' | 'rejected';
  whatsappMessage?: string;
  email?: string;
  phone?: string;
  location?: string;
  company?: string;
  createdAt: any;
  pubDate?: string;
  userId: string;

  // Tracking, Portal & Context
  pushedToPortal?: boolean;
  clientViewCount?: number;
  clientFeedback?: string;
  engagementOutcome?: 'engaged' | 'meeting_booked' | 'not_interested' | 'none';
  
  // Snapshotted Context used for AI generation
  clientBusiness?: string;
  isSoloFreelancer?: boolean;
}

export interface SystemLog {
  id: string;
  type: 'scraper_run' | 'lead_found' | 'scraper_error' | 'scraper_created' | 'scraper_paused' | 'scraper_resumed';
  scraperId?: string;
  scraperName?: string;
  message: string;
  details?: string;
  createdAt: any;
  userId: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'client' | 'admin';
  timestamp: string;
  isRead: boolean;
}
