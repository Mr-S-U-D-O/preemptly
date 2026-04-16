import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { AddScraperModal } from './AddScraperModal';
import { ProfileModal } from './ProfileModal';
import { SettingsModal } from './SettingsModal';
import { useData } from './DataProvider';
import { useAuth } from './AuthProvider';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Search, Settings, User as UserIcon, LogOut, Menu, Database } from 'lucide-react';

export function Layout() {
  const { scrapers } = useData();
  const { user, logOut } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const openAddModal = (data?: any) => {
    setModalInitialData(data || null);
    setIsAddModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 p-2 md:p-4 gap-4 md:gap-6 transition-colors">
      <Sidebar scrapers={scrapers} onAddMonitor={openAddModal} className="hidden lg:flex" />
      
      <main className="flex-1 flex flex-col overflow-hidden bg-transparent">
        <header className="h-16 flex items-center justify-between lg:justify-end px-2 shrink-0 mb-4">
          <div className="flex lg:hidden items-center gap-3">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger className="p-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Menu size={20} />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-transparent border-none shadow-none">
                <Sidebar 
                  scrapers={scrapers} 
                  onAddMonitor={(data) => {
                    openAddModal(data);
                    setIsMobileMenuOpen(false);
                  }} 
                  className="w-full rounded-none h-full border-r-2"
                />
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-lg">
              <div className="w-8 h-8 rounded-lg bg-[#5a8c12] text-white flex items-center justify-center shadow-md">
                <Database size={16} strokeWidth={1.5} />
              </div>
              <span className="hidden sm:inline">Preemptly</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="relative w-40 sm:w-64">
              <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search..." 
                className="pl-9 bg-white dark:bg-slate-900 border-2 border-transparent focus-visible:border-[#5a8c12] shadow-sm rounded-xl h-10 focus-visible:ring-0 transition-colors dark:text-slate-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="h-10 w-10 border-2 border-[#5a8c12] shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
                  <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                  <AvatarFallback className="bg-[#5a8c12]/10 text-[#5a8c12] font-semibold">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 rounded-xl border-2 border-[#5a8c12] dark:bg-slate-900 dark:border-[#5a8c12]/50"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none dark:text-slate-200">{user?.displayName || 'User'}</p>
                      <p className="text-xs leading-none text-slate-500 dark:text-slate-400">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                  <DropdownMenuItem 
                    onClick={() => setIsProfileOpen(true)} 
                    className="cursor-pointer gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 dark:text-slate-200"
                  >
                    <UserIcon size={14} strokeWidth={1.5} /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setIsSettingsOpen(true)} 
                    className="cursor-pointer gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 dark:text-slate-200"
                  >
                    <Settings size={14} strokeWidth={1.5} /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                  <DropdownMenuItem 
                    onClick={() => logOut()} 
                    className="cursor-pointer gap-2 text-red-600 focus:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20"
                  >
                    <LogOut size={14} strokeWidth={1.5} /> Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto pb-4 px-2">
          <Outlet />
        </div>
      </main>

      <AddScraperModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} initialData={modalInitialData} />
      <ProfileModal open={isProfileOpen} onOpenChange={setIsProfileOpen} />
      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
}
