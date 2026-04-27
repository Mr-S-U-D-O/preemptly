import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from './AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfile } from 'firebase/auth';
import { Camera, Edit2, Save, User, Mail, Hash, CheckCircle2, ShieldAlert } from 'lucide-react';

export function ProfileModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
      setIsEditing(false);
      setSuccess(false);
    }
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setSuccess(false);
    try {
      await updateProfile(user, {
        displayName: displayName.trim(),
        photoURL: photoURL.trim()
      });
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 rounded-3xl overflow-hidden border-2 border-slate-200/50 shadow-2xl bg-white dark:bg-slate-950">
        <div className="h-32 bg-gradient-to-br from-[#5a8c12] to-[#446715] relative overflow-hidden">
           <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
           <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
        
        <div className="px-8 pb-8 pt-0 relative">
          <div className="flex justify-between items-end -mt-12 mb-6">
            <div className="relative group">
              <Avatar className="h-28 w-28 border-4 border-white dark:border-slate-950 shadow-xl bg-white dark:bg-slate-900">
                <AvatarImage src={isEditing ? photoURL : (user?.photoURL || '')} alt={user?.displayName || 'User'} className="object-cover" />
                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-400 text-3xl font-bold">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="text-white w-8 h-8" />
                </div>
              )}
            </div>
            {!isEditing ? (
              <Button 
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="rounded-xl border-slate-200 dark:border-slate-800 shadow-sm gap-2 text-slate-600 dark:text-slate-300 font-medium"
              >
                <Edit2 size={16} /> Edit Profile
              </Button>
            ) : (
               <div className="flex gap-2">
                 <Button 
                  onClick={() => setIsEditing(false)}
                  variant="ghost"
                  className="rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                 >
                   Cancel
                 </Button>
                 <Button 
                  onClick={handleSave}
                  disabled={loading}
                  className="rounded-xl bg-[#5a8c12] hover:bg-[#446715] shadow-md shadow-[#5a8c12]/20 gap-2 font-semibold text-white"
                 >
                   <Save size={16} /> {loading ? 'Saving...' : 'Save'}
                 </Button>
               </div>
            )}
          </div>

          <div className="space-y-6">
            {success && (
              <div className="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 p-3 rounded-xl flex items-center gap-2 text-sm font-medium border border-green-100 dark:border-green-500/20">
                <CheckCircle2 size={16} className="text-green-500" /> Profile updated successfully!
              </div>
            )}

            {!isEditing ? (
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  {user?.displayName || 'Unknown User'}
                </h2>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Mail size={14} />
                  <span className="text-sm font-medium">{user?.email}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-9 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-[#5a8c12] h-11 dark:bg-slate-900"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-600 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">Avatar URL</Label>
                  <div className="relative">
                    <Camera className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input 
                      value={photoURL}
                      onChange={(e) => setPhotoURL(e.target.value)}
                      className="pl-9 rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-[#5a8c12] h-11 dark:bg-slate-900"
                      placeholder="https://example.com/avatar.png"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Account Details</h3>
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                      <Hash size={16} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Account ID</p>
                      <p className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">{user?.uid}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                      {user?.emailVerified ? (
                        <CheckCircle2 size={16} className="text-[#5a8c12]" />
                      ) : (
                        <ShieldAlert size={16} className="text-amber-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Verification Status</p>
                      <p className={`text-sm font-semibold ${user?.emailVerified ? 'text-slate-700 dark:text-slate-300' : 'text-amber-600 dark:text-amber-500'}`}>
                        {user?.emailVerified ? 'Email Verified' : 'Unverified Email'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
