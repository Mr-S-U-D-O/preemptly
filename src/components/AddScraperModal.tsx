import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from './AuthProvider';
import { useData } from './DataProvider';
import { collection, doc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Plus, 
  AlertCircle, 
  Activity, 
  Search, 
  Database, 
  Target, 
  Zap, 
  Hash, 
  MessageSquare, 
  Briefcase,
  Users,
  Globe,
  Cpu,
  Rocket,
  Flame,
  Shield,
  TrendingUp,
  Mail,
  Link,
  Terminal,
  Filter,
  Eye,
  Radar,
  Magnet
} from 'lucide-react';

const ICONS = [
  { name: 'Activity', icon: Activity },
  { name: 'Search', icon: Search },
  { name: 'Database', icon: Database },
  { name: 'Target', icon: Target },
  { name: 'Zap', icon: Zap },
  { name: 'Hash', icon: Hash },
  { name: 'MessageSquare', icon: MessageSquare },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Users', icon: Users },
  { name: 'Globe', icon: Globe },
  { name: 'Cpu', icon: Cpu },
  { name: 'Rocket', icon: Rocket },
  { name: 'Flame', icon: Flame },
  { name: 'Shield', icon: Shield },
  { name: 'TrendingUp', icon: TrendingUp },
  { name: 'Mail', icon: Mail },
  { name: 'Link', icon: Link },
  { name: 'Terminal', icon: Terminal },
  { name: 'Filter', icon: Filter },
  { name: 'Eye', icon: Eye },
  { name: 'Radar', icon: Radar },
  { name: 'Magnet', icon: Magnet },
];

export function AddScraperModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { scrapers } = useData();
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const [keyword, setKeyword] = useState('');
  const [idealCustomerProfile, setIdealCustomerProfile] = useState('');
  const [interval, setInterval] = useState('15');
  const [icon, setIcon] = useState('Activity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Check for duplicate name
    if (scrapers.some(s => s.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('A scraper with this name already exists.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const newScraperRef = doc(collection(db, 'scrapers'));
      const scraperData = {
        name: name.trim(),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        subreddit: subreddit.replace(/^r\//, ''), // Remove r/ if user typed it
        keyword,
        idealCustomerProfile: idealCustomerProfile.trim(),
        intervalMinutes: parseInt(interval, 10),
        status: 'active',
        icon,
        createdAt: serverTimestamp(),
        userId: user.uid
      };

      await setDoc(newScraperRef, scraperData);

      // Log the creation - wrapped in try-catch so it doesn't block the UI if logging fails
      try {
        await addDoc(collection(db, 'logs'), {
          type: 'scraper_created',
          scraperId: newScraperRef.id,
          scraperName: name.trim(),
          message: `New scraper "${name.trim()}" deployed for r/${scraperData.subreddit}`,
          createdAt: serverTimestamp(),
          userId: user.uid
        });
      } catch (logError) {
        console.error('Failed to log scraper creation:', logError);
      }
      
      // Close modal first for better UX
      onOpenChange(false);
      
      // Reset form
      setName('');
      setClientName('');
      setClientPhone('');
      setSubreddit('');
      setKeyword('');
      setIdealCustomerProfile('');
      setInterval('15');
      setIcon('Activity');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'scrapers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl border-2 border-[#5a8c12] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">Add New Scraper</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700 font-semibold">Scraper Name (Internal)</Label>
            <Input 
              id="name" 
              placeholder="e.g. Web Design Leads" 
              value={name} 
              onChange={(e) => { setName(e.target.value); setError(null); }} 
              required 
              className="rounded-xl border-slate-200 focus-visible:ring-[#5a8c12]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-slate-700 font-semibold">Client Name</Label>
              <Input 
                id="clientName" 
                placeholder="e.g. Bob's Web Design" 
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)} 
                required 
                className="rounded-xl border-slate-200 focus-visible:ring-[#5a8c12]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone" className="text-slate-700 font-semibold">Client WhatsApp Number</Label>
              <Input 
                id="clientPhone" 
                placeholder="e.g. 1234567890" 
                value={clientPhone} 
                onChange={(e) => setClientPhone(e.target.value)} 
                required 
                className="rounded-xl border-slate-200 focus-visible:ring-[#5a8c12]"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subreddit" className="text-slate-700 font-semibold">Target Subreddit</Label>
            <div className="flex items-center">
              <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 py-2 rounded-l-xl text-slate-500 text-sm font-medium h-10 flex items-center">r/</span>
              <Input 
                id="subreddit" 
                placeholder="Entrepreneur" 
                className="rounded-l-none rounded-r-xl border-slate-200 focus-visible:ring-[#5a8c12]"
                value={subreddit} 
                onChange={(e) => setSubreddit(e.target.value)} 
                required 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keyword" className="text-slate-700 font-semibold">Keyword to look for</Label>
            <Input 
              id="keyword" 
              placeholder="e.g. looking for a tool" 
              value={keyword} 
              onChange={(e) => setKeyword(e.target.value)} 
              required 
              className="rounded-xl border-slate-200 focus-visible:ring-[#5a8c12]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idealCustomerProfile" className="text-slate-700 font-semibold">Ideal Customer Profile (AI Instructions)</Label>
            <textarea 
              id="idealCustomerProfile" 
              placeholder="Describe the client's perfect lead... e.g. Someone asking for a lightweight CRM because Salesforce is too expensive." 
              value={idealCustomerProfile} 
              onChange={(e) => setIdealCustomerProfile(e.target.value)} 
              required 
              className="w-full min-h-[80px] p-3 rounded-xl border-2 border-slate-200 focus:border-[#5a8c12] focus:ring-0 transition-colors text-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            />
            <p className="text-[10px] text-slate-500">The AI will use this description to score posts and write the WhatsApp summary.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval" className="text-slate-700 font-semibold">Run Interval</Label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#5a8c12]">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#5a8c12]">
                <SelectItem value="1">Every 1 minute (Fast)</SelectItem>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every 1 hour</SelectItem>
                <SelectItem value="180">Every 3 hours</SelectItem>
                <SelectItem value="360">Every 6 hours</SelectItem>
                <SelectItem value="720">Every 12 hours</SelectItem>
                <SelectItem value="1440">Every 24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold">Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(({ name: iconName, icon: IconComponent }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`p-2 rounded-xl border-2 transition-all ${
                    icon === iconName 
                      ? 'border-[#5a8c12] bg-[#5a8c12]/10 text-[#5a8c12]' 
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <IconComponent size={20} strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-slate-200 hover:bg-slate-50">Cancel</Button>
            <Button type="submit" disabled={loading} className="rounded-xl bg-[#5a8c12] hover:bg-[#446715] text-white font-semibold shadow-md gap-2">
              <Plus size={16} strokeWidth={1.5} />
              {loading ? 'Deploying...' : 'Deploy Scraper'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
