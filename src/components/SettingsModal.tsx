import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, Moon, Download, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useData } from './DataProvider';
import { useNavigate } from 'react-router-dom';

export function SettingsModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return document.documentElement.classList.contains('dark');
  });
  const { leads } = useData();
  const navigate = useNavigate();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [isDarkMode]);

  const handleExport = () => {
    if (leads.length === 0) return;
    
    const headers = ['Post Title', 'Subreddit', 'Keyword', 'Score', 'Author', 'URL', 'Date'];
    const csvContent = [
      headers.join(','),
      ...leads.map(lead => {
        const date = lead.createdAt?.toMillis ? new Date(lead.createdAt.toMillis()).toISOString() : new Date().toISOString();
        return `"${lead.postTitle.replace(/"/g, '""')}","${lead.subreddit}","${lead.keyword}",${lead.score || ''},"${lead.postAuthor}","${lead.postUrl}","${date}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrivacyClick = () => {
    onOpenChange(false);
    navigate('/privacy');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl border-2 border-[#5a8c12] dark:border-[#5a8c12]/50 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferences</h4>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#5a8c12]/10 text-[#5a8c12] flex items-center justify-center">
                  <Bell size={16} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Email Notifications</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Receive alerts for new leads</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#5a8c12]/10 text-[#5a8c12] flex items-center justify-center">
                  <Moon size={16} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Dark Mode</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Toggle dark theme</p>
                </div>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data & Privacy</h4>
            
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#5a8c12]/10 text-[#5a8c12] flex items-center justify-center">
                  <Download size={16} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Export Data</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Download all your leads as CSV</p>
                </div>
              </div>
              <Button onClick={handleExport} variant="outline" size="sm" className="border-2 border-[#5a8c12] text-[#5a8c12] hover:bg-[#5a8c12] hover:text-white rounded-lg transition-colors dark:hover:text-white">Export</Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#5a8c12]/10 text-[#5a8c12] flex items-center justify-center">
                  <Shield size={16} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Privacy Policy</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Review our data policies</p>
                </div>
              </div>
              <Button onClick={handlePrivacyClick} variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg">View</Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
