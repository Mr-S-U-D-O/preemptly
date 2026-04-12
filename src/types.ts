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
  userId: string;
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
