import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from './AuthProvider';
import { useData } from './DataProvider';
import { collection, doc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import * as Icons from 'lucide-react';
import { CountryCodeSelector } from './CountryCodeSelector';
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

export function AddScraperModal({ 
  open, 
  onOpenChange,
  initialData
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  initialData?: {
    clientName?: string;
    clientPhone?: string;
    platform?: string;
  }
}) {
  const { user } = useAuth();
  const { scrapers } = useData();
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [countryCode, setCountryCode] = useState('+27');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['reddit']);
  const [target, setTarget] = useState('');
  const [city, setCity] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showCityResults, setShowCityResults] = useState(false);
  const [category, setCategory] = useState('sss');
  const [hnCategory, setHnCategory] = useState('newest');
  const [keyword, setKeyword] = useState('');
  const [idealCustomerProfile, setIdealCustomerProfile] = useState('');
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestedTargets, setSuggestedTargets] = useState<string[]>([]);
  const [isSuggestingTargets, setIsSuggestingTargets] = useState(false);
  const [interval, setInterval] = useState('15');
  const [icon, setIcon] = useState('Activity');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && initialData) {
      if (initialData.clientName) setClientName(initialData.clientName);
      if (initialData.clientPhone) setClientPhone(initialData.clientPhone);
      if (initialData.platform) setSelectedPlatforms([initialData.platform]);
    } else if (open) {
      // Reset if no initial data but modal is opening
      // (Optional: you might want to keep previous values or clear them)
      // For now, let's only clear if it's a fresh open without initial data
      if (!initialData) {
        setName('');
        setClientName('');
        setCountryCode('+27');
        setClientPhone('');
        setSelectedPlatforms(['reddit']);
        setTarget('');
        setCity('');
        setCitySearch('');
        setKeyword('');
        setIdealCustomerProfile('');
      }
    }
  }, [open, initialData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const CRAIGSLIST_CITIES = [
    // North America - USA
    { name: 'SF Bay Area', id: 'sfbay' },
    { name: 'New York City', id: 'newyork' },
    { name: 'Los Angeles', id: 'losangeles' },
    { name: 'Chicago', id: 'chicago' },
    { name: 'Houston', id: 'houston' },
    { name: 'Philadelphia', id: 'philadelphia' },
    { name: 'Phoenix', id: 'phoenix' },
    { name: 'San Diego', id: 'sandiego' },
    { name: 'Dallas', id: 'dallas' },
    { name: 'Austin', id: 'austin' },
    { name: 'Seattle', id: 'seattle' },
    { name: 'Boston', id: 'boston' },
    { name: 'Atlanta', id: 'atlanta' },
    { name: 'Miami', id: 'miami' },
    { name: 'Denver', id: 'denver' },
    { name: 'Portland', id: 'portland' },
    { name: 'Las Vegas', id: 'lasvegas' },
    { name: 'Washington DC', id: 'washingtondc' },
    { name: 'Minneapolis', id: 'minneapolis' },
    { name: 'Detroit', id: 'detroit' },
    { name: 'San Antonio', id: 'sanantonio' },
    { name: 'Columbus', id: 'columbus' },
    { name: 'Indianapolis', id: 'indianapolis' },
    { name: 'Charlotte', id: 'charlotte' },
    { name: 'Nashville', id: 'nashville' },
    { name: 'Jacksonville', id: 'jacksonville' },
    { name: 'Oklahoma City', id: 'oklahomacity' },
    { name: 'Memphis', id: 'memphis' },
    { name: 'Louisville', id: 'louisville' },
    { name: 'Milwaukee', id: 'milwaukee' },
    { name: 'Albuquerque', id: 'albuquerque' },
    { name: 'Tucson', id: 'tucson' },
    { name: 'Fresno', id: 'fresno' },
    { name: 'Sacramento', id: 'sacramento' },
    { name: 'Kansas City', id: 'kansascity' },
    { name: 'Mesa', id: 'mesa' },
    { name: 'Virginia Beach', id: 'virginiabeach' },
    { name: 'Atlanta', id: 'atlanta' },
    { name: 'Colorado Springs', id: 'cosprings' },
    { name: 'Raleigh', id: 'raleigh' },
    { name: 'Omaha', id: 'omaha' },
    { name: 'Miami', id: 'miami' },
    
    // North America - Canada
    { name: 'Toronto', id: 'toronto' },
    { name: 'Vancouver', id: 'vancouver' },
    { name: 'Montreal', id: 'montreal' },
    { name: 'Ottawa', id: 'ottawa' },
    { name: 'Calgary', id: 'calgary' },
    { name: 'Edmonton', id: 'edmonton' },
    { name: 'Winnipeg', id: 'winnipeg' },
    { name: 'Quebec City', id: 'quebec' },
    { name: 'Victoria', id: 'victoria' },
    
    // Europe
    { name: 'London', id: 'london' },
    { name: 'Paris', id: 'paris' },
    { name: 'Berlin', id: 'berlin' },
    { name: 'Madrid', id: 'madrid' },
    { name: 'Rome', id: 'rome' },
    { name: 'Amsterdam', id: 'amsterdam' },
    { name: 'Brussels', id: 'brussels' },
    { name: 'Vienna', id: 'vienna' },
    { name: 'Stockholm', id: 'stockholm' },
    { name: 'Dublin', id: 'dublin' },
    { name: 'Copenhagen', id: 'copenhagen' },
    { name: 'Oslo', id: 'oslo' },
    { name: 'Helsinki', id: 'helsinki' },
    { name: 'Lisbon', id: 'lisbon' },
    { name: 'Athens', id: 'athens' },
    { name: 'Prague', id: 'prague' },
    { name: 'Warsaw', id: 'warsaw' },
    { name: 'Budapest', id: 'budapest' },
    { name: 'Zurich', id: 'zurich' },
    { name: 'Geneva', id: 'geneva' },
    { name: 'Milan', id: 'milan' },
    { name: 'Barcelona', id: 'barcelona' },
    { name: 'Munich', id: 'munich' },
    { name: 'Frankfurt', id: 'frankfurt' },
    { name: 'Hamburg', id: 'hamburg' },
    { name: 'Luxembourg', id: 'luxembourg' },
    
    // Asia & Middle East
    { name: 'Tokyo', id: 'tokyo' },
    { name: 'Seoul', id: 'seoul' },
    { name: 'Hong Kong', id: 'hongkong' },
    { name: 'Singapore', id: 'singapore' },
    { name: 'Bangkok', id: 'bangkok' },
    { name: 'Manila', id: 'manila' },
    { name: 'Jakarta', id: 'jakarta' },
    { name: 'Mumbai', id: 'mumbai' },
    { name: 'Delhi', id: 'delhi' },
    { name: 'Dubai', id: 'dubai' },
    { name: 'Abu Dhabi', id: 'abudhabi' },
    { name: 'Tel Aviv', id: 'telaviv' },
    { name: 'Istanbul', id: 'istanbul' },
    { name: 'Shanghai', id: 'shanghai' },
    { name: 'Beijing', id: 'beijing' },
    { name: 'Taipei', id: 'taipei' },
    
    // Oceania
    { name: 'Sydney', id: 'sydney' },
    { name: 'Melbourne', id: 'melbourne' },
    { name: 'Brisbane', id: 'brisbane' },
    { name: 'Perth', id: 'perth' },
    { name: 'Adelaide', id: 'adelaide' },
    { name: 'Auckland', id: 'auckland' },
    { name: 'Wellington', id: 'wellington' },
    { name: 'Christchurch', id: 'christchurch' },
    
    // Latin America
    { name: 'Mexico City', id: 'mexicocity' },
    { name: 'Sao Paulo', id: 'saopaulo' },
    { name: 'Rio de Janeiro', id: 'rio' },
    { name: 'Buenos Aires', id: 'buenosaires' },
    { name: 'Santiago', id: 'santiago' },
    { name: 'Bogota', id: 'bogota' },
    { name: 'Lima', id: 'lima' },
    { name: 'Caracas', id: 'caracas' },
    { name: 'Panama City', id: 'panama' },
    { name: 'San Jose', id: 'sanjose' },
    
    // Africa
    { name: 'Cairo', id: 'cairo' },
    { name: 'Johannesburg', id: 'johannesburg' },
    { name: 'Cape Town', id: 'capetown' },
    { name: 'Nairobi', id: 'nairobi' },
    { name: 'Lagos', id: 'lagos' },
    { name: 'Casablanca', id: 'casablanca' },
    { name: 'Addis Ababa', id: 'addisababa' },
  ].sort((a, b) => a.name.localeCompare(b.name));

  const filteredCities = citySearch.trim() === '' 
    ? [] 
    : CRAIGSLIST_CITIES.filter(c => 
        c.name.toLowerCase().includes(citySearch.toLowerCase()) || 
        c.id.toLowerCase().includes(citySearch.toLowerCase())
      );

  const handleSuggestKeywords = async () => {
    if (!idealCustomerProfile.trim()) {
      setError('Please provide an Ideal Customer Profile first so the AI knows what to suggest.');
      return;
    }
    
    setIsSuggesting(true);
    setError(null);
    try {
      const response = await fetch('/api/suggest-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, idealCustomerProfile })
      });
      
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      
      const data = await response.json();
      setSuggestedKeywords(data.keywords || []);
    } catch (err) {
      console.error('Keyword suggestion failed:', err);
      setError('Failed to suggest keywords. Please try again.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSuggestTargets = async () => {
    if (!idealCustomerProfile.trim()) {
      setError('Please provide an Ideal Customer Profile first so the AI knows what to suggest.');
      return;
    }
    
    setIsSuggestingTargets(true);
    setError(null);
    try {
      const response = await fetch('/api/suggest-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, idealCustomerProfile, platforms: selectedPlatforms })
      });
      
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      
      const data = await response.json();
      setSuggestedTargets(data.targets || []);
    } catch (err) {
      console.error('Target suggestion failed:', err);
      setError('Failed to suggest targets. Please try again.');
    } finally {
      setIsSuggestingTargets(false);
    }
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(p) 
        ? (prev.length > 1 ? prev.filter(x => x !== p) : prev) 
        : [...prev, p]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (scrapers.some(s => s.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('A scraper with this name already exists.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Split keywords and targets
      const targetList = target.split(',').map(t => t.trim()).filter(t => t !== '');
      
      // If no targets specified but needed (like for Reddit), use a default or handle error
      // For HN, target is optional.
      const finalTargets = targetList.length > 0 ? targetList : [''];

      // Create a scraper for each selected platform AND each target
      for (const platform of selectedPlatforms) {
        for (const individualTarget of finalTargets) {
          // Skip empty targets for platforms that require them
          if (!individualTarget && (platform === 'reddit' || platform === 'stackoverflow')) continue;

          // Check if this client already has a portal token in any existing scraper
          const existingClientScraper = scrapers.find(s => s.clientName === clientName.trim() && s.portalToken);
          const portalToken = existingClientScraper ? existingClientScraper.portalToken : null;
          const trialLimit = existingClientScraper ? (existingClientScraper.trialLimit || 10) : 10;
          const isPaid = existingClientScraper ? (existingClientScraper.isPaid || false) : false;

          const newScraperRef = doc(collection(db, 'scrapers'));
          const scraperData: any = {
            name: (selectedPlatforms.length > 1 || finalTargets.length > 1) 
              ? `${name.trim()} (${platform}${individualTarget ? `: ${individualTarget}` : ''})` 
              : name.trim(),
            clientName: clientName.trim(),
            clientPhone: `${countryCode}${clientPhone.trim()}`.replace(/\+/g, ''),
            platform,
            target: platform === 'reddit' ? individualTarget.replace(/^r\//, '') : individualTarget,
            keyword,
            idealCustomerProfile: idealCustomerProfile.trim(),
            intervalMinutes: parseInt(interval, 10),
            status: 'active',
            icon,
            portalToken,
            trialLimit,
            isPaid,
            createdAt: serverTimestamp(),
            userId: user.uid
          };

          if (platform === 'reddit') {
            scraperData.subreddit = individualTarget.replace(/^r\//, '');
          }

          if (platform === 'craigslist') {
            scraperData.city = city.trim();
            scraperData.category = category;
          }

          if (platform === 'hackernews') {
            scraperData.category = hnCategory;
          }

          await setDoc(newScraperRef, scraperData);

          try {
            let displayTarget = scraperData.target;
            if (platform === 'reddit') displayTarget = `r/${scraperData.target}`;
            if (platform === 'craigslist') displayTarget = `${scraperData.city} (${scraperData.category})`;

            await addDoc(collection(db, 'logs'), {
              type: 'scraper_created',
              scraperId: newScraperRef.id,
              scraperName: scraperData.name,
              message: `New scraper "${scraperData.name}" deployed for ${displayTarget || 'all'}`,
              createdAt: serverTimestamp(),
              userId: user.uid
            });
          } catch (logError) {
            console.error('Failed to log scraper creation:', logError);
          }
        }
      }
      
      onOpenChange(false);
      
      setName('');
      setClientName('');
      setClientPhone('');
      setSelectedPlatforms(['reddit']);
      setTarget('');
      setCity('');
      setCitySearch('');
      setShowCityResults(false);
      setCategory('sss');
      setHnCategory('newest');
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
              <div className="flex gap-2">
                <CountryCodeSelector value={countryCode} onChange={setCountryCode} />
                <Input 
                  id="clientPhone" 
                  placeholder="e.g. 712345678" 
                  value={clientPhone} 
                  onChange={(e) => setClientPhone(e.target.value.replace(/^0+/, ''))} 
                  required 
                  className="rounded-xl border-slate-200 focus-visible:ring-[#5a8c12]"
                />
              </div>
              <p className="text-[10px] text-slate-500">Excluding leading zeros (e.g. 712345678)</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold">Select Platforms (Campaign Mode)</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'reddit', name: 'Reddit', icon: Icons.MessageSquare },
                { id: 'hackernews', name: 'Hacker News', icon: Icons.Hash },
                { id: 'stackoverflow', name: 'Stack Overflow', icon: Icons.Code },
                { id: 'craigslist', name: 'Craigslist', icon: Icons.MapPin },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm font-medium ${
                    selectedPlatforms.includes(p.id)
                      ? 'border-[#5a8c12] bg-[#5a8c12]/10 text-[#5a8c12]'
                      : 'border-slate-100 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  <p.icon size={14} />
                  {p.name}
                </button>
              ))}
            </div>
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

          {selectedPlatforms.includes('craigslist') && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-2 relative" ref={cityDropdownRef}>
                <Label htmlFor="city" className="text-slate-700 font-semibold">Craigslist City</Label>
                <div className="relative">
                  <Input 
                    id="city" 
                    placeholder="Search city..." 
                    value={citySearch} 
                    onChange={(e) => {
                      setCitySearch(e.target.value);
                      setShowCityResults(true);
                      if (e.target.value === '') setCity('');
                    }} 
                    onFocus={() => setShowCityResults(true)}
                    required={selectedPlatforms.includes('craigslist') && !city}
                    className="rounded-xl border-slate-200 focus-visible:ring-[#5a8c12] bg-white dark:bg-slate-900"
                  />
                  {showCityResults && filteredCities.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                      {filteredCities.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm hover:bg-[#5a8c12]/10 transition-colors dark:text-slate-200"
                          onClick={() => {
                            setCity(c.id);
                            setCitySearch(c.name);
                            setShowCityResults(false);
                          }}
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-[10px] text-slate-500">{c.id}.craigslist.org</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-slate-700 font-semibold">CL Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#5a8c12] bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#5a8c12]">
                    <SelectItem value="sss">All For Sale</SelectItem>
                    <SelectItem value="ggg">All Gigs</SelectItem>
                    <SelectItem value="bbb">All Services</SelectItem>
                    <SelectItem value="jjj">All Jobs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {selectedPlatforms.includes('hackernews') && (
            <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Label htmlFor="hnCategory" className="text-slate-700 font-semibold">Hacker News Category</Label>
              <Select value={hnCategory} onValueChange={setHnCategory}>
                <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#5a8c12] bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#5a8c12]">
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="frontpage">Front Page</SelectItem>
                  <SelectItem value="ask">Ask HN</SelectItem>
                  <SelectItem value="show">Show HN</SelectItem>
                  <SelectItem value="jobs">Jobs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="target" className="text-slate-700 font-semibold">
                Target (Subreddit / Tag / Search Term)
              </Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleSuggestTargets}
                disabled={isSuggestingTargets || !idealCustomerProfile}
                className="h-7 text-[10px] text-[#5a8c12] hover:text-[#446715] hover:bg-[#5a8c12]/10 gap-1 px-2"
              >
                {isSuggestingTargets ? (
                  <Icons.RefreshCw size={10} className="animate-spin" />
                ) : (
                  <Icons.Sparkles size={10} />
                )}
                Suggest Targets
              </Button>
            </div>
            <div className="flex items-center">
              {selectedPlatforms.includes('reddit') && !selectedPlatforms.includes('stackoverflow') && (
                <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 py-2 rounded-l-xl text-slate-500 text-sm font-medium h-10 flex items-center">r/</span>
              )}
              <Input 
                id="target" 
                placeholder="e.g. Entrepreneur, reactjs, or startup" 
                className={`${selectedPlatforms.includes('reddit') && !selectedPlatforms.includes('stackoverflow') ? 'rounded-l-none' : ''} rounded-r-xl border-slate-200 focus-visible:ring-[#5a8c12]`}
                value={target} 
                onChange={(e) => setTarget(e.target.value)} 
                required={!selectedPlatforms.includes('hackernews') || selectedPlatforms.length > 1} 
              />
            </div>
            {suggestedTargets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {suggestedTargets.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const currentTargets = target.split(',').map(k => k.trim()).filter(k => k !== '');
                      if (!currentTargets.includes(t)) {
                        setTarget(currentTargets.length > 0 ? `${target}, ${t}` : t);
                      }
                    }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 hover:bg-[#5a8c12]/20 hover:text-[#5a8c12] transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-500 italic">This will be used as the subreddit for Reddit and the tag for Stack Overflow.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="keyword" className="text-slate-700 font-semibold">Keywords to look for (comma separated)</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleSuggestKeywords}
                disabled={isSuggesting || !idealCustomerProfile}
                className="h-7 text-[10px] text-[#5a8c12] hover:text-[#446715] hover:bg-[#5a8c12]/10 gap-1 px-2"
              >
                {isSuggesting ? (
                  <Icons.RefreshCw size={10} className="animate-spin" />
                ) : (
                  <Icons.Sparkles size={10} />
                )}
                Suggest Keywords
              </Button>
            </div>
            <Input 
              id="keyword" 
              placeholder="e.g. looking for a tool, need help with, recommendation" 
              value={keyword} 
              onChange={(e) => setKeyword(e.target.value)} 
              required 
              className="rounded-xl border-slate-200 focus-visible:ring-[#5a8c12]"
            />
            {suggestedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {suggestedKeywords.map((kw, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const currentKeywords = keyword.split(',').map(k => k.trim()).filter(k => k !== '');
                      if (!currentKeywords.includes(kw)) {
                        setKeyword(currentKeywords.length > 0 ? `${keyword}, ${kw}` : kw);
                      }
                    }}
                    className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 hover:bg-[#5a8c12]/20 hover:text-[#5a8c12] transition-colors border border-slate-200 dark:border-slate-700"
                  >
                    + {kw}
                  </button>
                ))}
              </div>
            )}
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
