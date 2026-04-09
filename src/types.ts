export interface Scraper {
  id: string;
  name: string;
  subreddit: string;
  keyword: string;
  intervalMinutes: number;
  status: 'active' | 'paused';
  createdAt: any;
  lastRunAt?: any;
  userId: string;
  icon?: string;
}

export interface Lead {
  id: string;
  scraperId: string;
  subreddit: string;
  keyword: string;
  postTitle: string;
  postUrl: string;
  postAuthor: string;
  postContent?: string;
  score?: number;
  reason?: string;
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
