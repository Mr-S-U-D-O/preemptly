import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, query, where, onSnapshot, doc, orderBy,
  setDoc, addDoc, serverTimestamp, getDoc, getDocs, deleteDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthProvider';
import { ChatRoom, ChatMessage, Scraper } from '../types';
import {
  MessageSquare, Send, Smile, Paperclip, CheckCheck,
  ChevronLeft, X, Plus, Search, Circle, ExternalLink,
  Clock, Users, Wifi, WifiOff, MoreVertical, Image as ImageIcon,
  Trash2, AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { toast } from './ui/toast';
import { ConfirmModal } from './ConfirmModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRoomTime(ts: any): string {
  if (!ts) return '';
  const ms = ts.toMillis ? ts.toMillis() : Date.now();
  const date = new Date(ms);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

function formatLastSeen(ts: any): string {
  if (!ts) return 'Offline';
  const ms = ts.toMillis ? ts.toMillis() : Number(ts);
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'Just now';
  return `Last seen ${formatDistanceToNow(new Date(ms), { addSuffix: true })}`;
}

function Avatar({ name, online, size = 'md' }: { name: string; online?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' };
  const dotMap = { sm: 'w-2.5 h-2.5 border', md: 'w-3 h-3 border-2', lg: 'w-3.5 h-3.5 border-2' };
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-[#5a8c12]'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="relative shrink-0">
      <div className={`${sizeMap[size]} ${color} rounded-2xl flex items-center justify-center shadow-sm`}>
        <span className="font-black text-white uppercase">{name?.charAt(0) || '?'}</span>
      </div>
      {online !== undefined && (
        <span className={`absolute -bottom-0.5 -right-0.5 ${dotMap[size]} rounded-full border-white ${online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
      )}
    </div>
  );
}

// ─── New Chat Modal ──────────────────────────────────────────────────────────

function NewChatModal({
  onClose,
  onOpen,
  userId
}: {
  onClose: () => void;
  onOpen: (token: string) => void;
  userId: string;
}) {
  const [scrapers, setScrapers] = useState<Scraper[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'scrapers'),
      where('userId', '==', userId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data: Scraper[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Scraper));
      setScrapers(data.filter(s => s.portalToken));
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const grouped = scrapers.reduce((acc, s) => {
    const client = s.clientName || 'Unknown';
    if (!acc[client]) acc[client] = { token: s.portalToken!, scrapers: [] };
    acc[client].scrapers.push(s);
    return acc;
  }, {} as Record<string, { token: string; scrapers: Scraper[] }>);

  const filtered = Object.entries(grouped).filter(([name]) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (clientName: string, token: string) => {
    // Ensure the room document exists
    await setDoc(doc(db, 'portal_chats', token), {
      clientName,
      userId,
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      lastSender: 'admin',
      hasUnreadAdmin: false,
      hasUnreadClient: false,
    }, { merge: true });
    onOpen(token);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[28px] w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-slate-900">Start New Chat</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5a8c12]/20 focus:border-[#5a8c12]/50 text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-72 p-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#5a8c12]/30 border-t-[#5a8c12] rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Users size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No clients with portals found</p>
            </div>
          ) : (
            filtered.map(([name, { token }]) => (
              <button
                key={token}
                onClick={() => handleSelect(name, token)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <Avatar name={name} size="sm" />
                <div>
                  <p className="text-sm font-bold text-slate-800">{name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{token.substring(0, 12)}...</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ChatManager() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; data: string; type: string } | null>(null);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteRoom, setShowDeleteRoom] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const [deletingMsg, setDeletingMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load Rooms ──
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'portal_chats'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data: ChatRoom[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as ChatRoom));
      data.sort((a, b) => {
        const tA = a.lastMessageAt?.toMillis?.() || 0;
        const tB = b.lastMessageAt?.toMillis?.() || 0;
        return tB - tA;
      });
      setRooms(data);
    });
    return () => unsub();
  }, [user]);

  // ── Load Messages ──
  useEffect(() => {
    if (!activeToken) { setMessages([]); return; }
    const q = query(
      collection(db, `portal_chats/${activeToken}/messages`),
      orderBy('timestamp', 'asc')
    );
    let initial = true;
    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = [];
      snap.forEach(d => {
        const data = d.data();
        msgs.push({
          id: d.id,
          text: data.text,
          sender: data.sender,
          isRead: data.isRead,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          fileData: data.fileData,
          fileName: data.fileName,
          fileType: data.fileType,
        });
      });
      setMessages(msgs);
      // Mark unread admin messages as read in the room meta
      // ONLY if the room currently says it has unread messages.
      // This prevents an infinite loop of updates.
      if (msgs.some(m => m.sender === 'client' && !m.isRead) && activeRoom?.hasUnreadAdmin) {
        setDoc(doc(db, 'portal_chats', activeToken), { hasUnreadAdmin: false }, { merge: true }).catch(console.error);
      }
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: initial ? 'auto' : 'smooth' });
        initial = false;
      }, 80);
    });
    return () => unsub();
  }, [activeToken]);

  // ── Focus input when room opens ──
  useEffect(() => {
    if (activeToken) setTimeout(() => inputRef.current?.focus(), 200);
  }, [activeToken]);

  const emitTyping = useCallback((isTyping: boolean) => {
    if (!activeToken) return;
    setDoc(doc(db, 'portal_chats', activeToken), { adminTyping: isTyping }, { merge: true }).catch(() => {});
  }, [activeToken]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping(true);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('File too large. Max 5MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setAttachedFile({ name: file.name, type: file.type, data: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeToken || (!newMessage.trim() && !attachedFile) || sendingMsg) return;
    const msgText = newMessage.trim();
    const fileToSend = attachedFile;
    setNewMessage('');
    setAttachedFile(null);
    setShowEmojis(false);
    setSendingMsg(true);
    emitTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    try {
      await addDoc(collection(db, `portal_chats/${activeToken}/messages`), {
        text: msgText || '',
        sender: 'admin',
        isRead: false,
        timestamp: serverTimestamp(),
        ...(fileToSend ? { fileData: fileToSend.data, fileName: fileToSend.name, fileType: fileToSend.type } : {}),
      });
      const snippet = msgText || (fileToSend?.name ? `📎 ${fileToSend.name}` : 'Attachment');
      await setDoc(doc(db, 'portal_chats', activeToken), {
        lastMessage: snippet,
        lastMessageAt: serverTimestamp(),
        lastSender: 'admin',
        hasUnreadClient: true,
      }, { merge: true });
    } catch (err: any) {
      toast(err.message || 'Failed to send.', 'error');
      setNewMessage(msgText);
      if (fileToSend) setAttachedFile(fileToSend);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleLevelDeleteRoom = async () => {
    if (!activeToken) return;
    setDeletingRoom(true);
    try {
      // 1. Delete all messages first (batch delete)
      const msgsRef = collection(db, `portal_chats/${activeToken}/messages`);
      const msgsSnap = await getDocs(msgsRef);
      const batch = writeBatch(db);
      msgsSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();

      // 2. Delete the room
      await deleteDoc(doc(db, 'portal_chats', activeToken));
      
      setActiveToken(null);
      toast('Chat deleted permanently.');
    } catch (err: any) {
      toast('Failed to delete chat.', 'error');
    } finally {
      setDeletingRoom(false);
      setShowDeleteRoom(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeToken) return;
    try {
      await deleteDoc(doc(db, `portal_chats/${activeToken}/messages`, msgId));
    } catch (err: any) {
      toast('Failed to delete message.', 'error');
    }
  };

  const activeRoom = rooms.find(r => r.id === activeToken);
  const filteredRooms = rooms.filter(r =>
    r.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalUnread = rooms.filter(r => r.hasUnreadAdmin).length;

  // ── Render ──
  return (
    <div className="flex h-full gap-0 overflow-hidden bg-white dark:bg-slate-900 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 shadow-sm">

      {/* ── LEFT: Rooms Sidebar ── */}
      <div className={`
        w-full md:w-[320px] flex flex-col border-r border-slate-100 dark:border-slate-800 shrink-0 overflow-hidden
        ${activeToken ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Inbox</h2>
              {totalUnread > 0 && (
                <span className="bg-[#5a8c12] text-white text-[10px] font-black min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center animate-pulse">
                  {totalUnread}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowNewChat(true)}
              className="w-9 h-9 bg-[#5a8c12] hover:bg-[#4a730f] text-white rounded-xl flex items-center justify-center transition-colors shadow-md shadow-[#5a8c12]/20"
              title="Start new chat"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl pl-8 pr-4 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#5a8c12]/20 focus:border-[#5a8c12]/40 text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare size={20} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">No conversations yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Press + to start a chat with any client who has a portal</p>
              <button
                onClick={() => setShowNewChat(true)}
                className="flex items-center gap-2 bg-[#5a8c12]/10 hover:bg-[#5a8c12]/20 text-[#5a8c12] text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
              >
                <Plus size={14} /> New Chat
              </button>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const isActive = activeToken === room.id;
              // Optimization: Use a 5-minute window for "Online" status instead of a heartbeat-driven flag
              const lastSeenMs = room.clientLastSeen?.toMillis?.() || 0;
              const isOnline = lastSeenMs > Date.now() - 5 * 60 * 1000;
              return (
                <button
                  key={room.id}
                  onClick={() => setActiveToken(room.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all mb-1 ${
                    isActive
                      ? 'bg-[#5a8c12]/8 border border-[#5a8c12]/15 dark:bg-[#5a8c12]/15'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Avatar name={room.clientName || '?'} online={isOnline} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate pr-2 ${room.hasUnreadAdmin ? 'font-black text-slate-900 dark:text-slate-100' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                        {room.clientName || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {formatRoomTime(room.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${room.hasUnreadAdmin ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        {room.clientTyping ? (
                          <span className="text-[#5a8c12] font-bold italic flex items-center gap-1">
                            <span className="flex gap-0.5">
                              <span className="w-1 h-1 bg-[#5a8c12] rounded-full animate-bounce [animation-delay:0ms]" />
                              <span className="w-1 h-1 bg-[#5a8c12] rounded-full animate-bounce [animation-delay:150ms]" />
                              <span className="w-1 h-1 bg-[#5a8c12] rounded-full animate-bounce [animation-delay:300ms]" />
                            </span>
                            typing
                          </span>
                        ) : (
                          <>
                            {room.lastSender === 'admin' && <span className="text-slate-400">You: </span>}
                            {room.lastMessage || <span className="italic text-slate-400">No messages yet</span>}
                          </>
                        )}
                      </p>
                      {room.hasUnreadAdmin && (
                        <span className="w-2.5 h-2.5 bg-[#5a8c12] rounded-full shrink-0 animate-pulse" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Chat Area ── */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!activeToken ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!activeToken || !activeRoom ? (
          /* Empty State */
          <div className="text-center px-8 max-w-xs">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <MessageSquare size={30} className="text-slate-200 dark:text-slate-700" />
            </div>
            <h3 className="text-lg font-black text-slate-700 dark:text-slate-300 mb-2">Select a conversation</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">Pick a client from the inbox, or start a new chat to reach out directly.</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="inline-flex items-center gap-2 bg-[#5a8c12] hover:bg-[#4a730f] text-white text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-colors shadow-lg shadow-[#5a8c12]/20"
            >
              <Plus size={14} /> New Chat
            </button>
          </div>
        ) : (
          <>
            {/* ── Chat Header ── */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                {/* Back button (mobile) */}
                <button
                  onClick={() => setActiveToken(null)}
                  className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>

                <Avatar name={activeRoom.clientName || '?'} online={activeRoom.clientOnline} size="md" />

                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {activeRoom.clientName}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {activeRoom.clientTyping ? (
                      <span className="text-[11px] text-[#5a8c12] font-bold italic">typing...</span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatLastSeen(activeRoom.clientLastSeen)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/portal/${activeToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors border border-slate-100 dark:border-slate-700"
                  >
                    <ExternalLink size={12} /> View Portal
                  </a>
                  <button
                    onClick={() => setShowDeleteRoom(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Delete entire chat"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-1 bg-slate-50/40 dark:bg-slate-900/40">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-slate-100 dark:border-slate-700">
                    <MessageSquare size={18} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No messages yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Send the first message to get the conversation started.</p>
                </div>
              )}

              {/* Group messages by date */}
              {messages.reduce((groups: { date: string; msgs: ChatMessage[] }[], msg) => {
                const d = format(new Date(msg.timestamp), 'yyyy-MM-dd');
                if (!groups.length || groups[groups.length - 1].date !== d) {
                  groups.push({ date: d, msgs: [msg] });
                } else {
                  groups[groups.length - 1].msgs.push(msg);
                }
                return groups;
              }, []).map(({ date, msgs: dayMsgs }) => {
                const dateLabel = isToday(new Date(date)) ? 'Today' :
                  isYesterday(new Date(date)) ? 'Yesterday' :
                  format(new Date(date), 'MMMM d, yyyy');
                return (
                  <div key={date}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 py-4">
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
                        {dateLabel}
                      </span>
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                    </div>

                    {dayMsgs.map((msg, i) => {
                      const isAdmin = msg.sender === 'admin';
                      const nextMsg = dayMsgs[i + 1];
                      const isSameNext = nextMsg?.sender === msg.sender;
                      const showTime = !isSameNext;

                      return (
                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} ${isSameNext ? 'mb-0.5' : 'mb-3'} group/msg relative`}>
                          <div className={`max-w-[72%] flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                              isAdmin
                                ? 'bg-[#5a8c12] text-white rounded-br-md'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-md'
                            }`}>
                              {msg.text && <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}

                              {msg.fileName && msg.fileData && (
                                <div className={`${msg.text ? 'mt-2' : ''} rounded-xl overflow-hidden border ${isAdmin ? 'border-white/20' : 'border-slate-100 dark:border-slate-700'}`}>
                                  {msg.fileType?.startsWith('image/') ? (
                                    <img src={msg.fileData} alt={msg.fileName} className="w-full max-w-[220px] h-auto object-cover" />
                                  ) : (
                                    <div className={`p-3 flex items-center gap-3 ${isAdmin ? 'bg-black/10' : 'bg-slate-50 dark:bg-slate-900'}`}>
                                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isAdmin ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                        <Paperclip size={14} className={isAdmin ? 'text-white' : 'text-slate-500'} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate">{msg.fileName}</p>
                                        <a href={msg.fileData} download={msg.fileName} className={`text-[10px] font-black hover:underline ${isAdmin ? 'text-white/80' : 'text-[#5a8c12]'}`}>
                                          Download
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Message Delete Button (Admin Only or Any for now) */}
                              <div className={`absolute top-0 ${isAdmin ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Delete message"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Timestamp + read receipt */}
                            {showTime && (
                              <div className={`flex items-center gap-1 mt-1 px-1 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {format(new Date(msg.timestamp), 'h:mm a')}
                                </span>
                                {isAdmin && (
                                  <CheckCheck
                                    size={12}
                                    className={msg.isRead ? 'text-[#5a8c12]' : 'text-slate-300'}
                                    strokeWidth={2.5}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {activeRoom.clientTyping && (
                <div className="flex justify-start mb-3">
                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-slate-300 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-slate-300 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-slate-300 dark:bg-slate-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* ── Input Area ── */}
            <div className="shrink-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 py-3">
              {/* Attached file preview */}
              {attachedFile && (
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex-1 bg-[#5a8c12]/8 border border-[#5a8c12]/20 rounded-xl px-3 py-2 flex items-center gap-2">
                    {attachedFile.type.startsWith('image/') ? (
                      <ImageIcon size={14} className="text-[#5a8c12] shrink-0" />
                    ) : (
                      <Paperclip size={14} className="text-[#5a8c12] shrink-0" />
                    )}
                    <span className="text-xs font-bold text-[#5a8c12] truncate flex-1">{attachedFile.name}</span>
                    <button onClick={() => setAttachedFile(null)} className="text-[#5a8c12]/60 hover:text-[#5a8c12] shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Emoji picker */}
              {showEmojis && (
                <div className="mb-2 flex gap-1.5 overflow-x-auto custom-scrollbar py-1">
                  {['👍','🔥','✅','🙌','🚀','👀','💡','💯','🤔','👋','❤️','😊','🎉','⚡','🛠️'].map(e => (
                    <button
                      key={e}
                      onClick={() => { setNewMessage(p => p + e); setShowEmojis(false); }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0 text-lg transition-transform hover:scale-110"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

                <button
                  type="button"
                  onClick={() => setShowEmojis(s => !s)}
                  className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
                >
                  <Smile size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
                >
                  <Paperclip size={20} />
                </button>

                <div className="flex-1 relative bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus-within:border-[#5a8c12]/50 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all flex items-center gap-2 pl-4 pr-2 py-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage(e as any)}
                    placeholder={`Message ${activeRoom.clientName}...`}
                    className="flex-1 bg-transparent border-none py-2 text-sm focus:outline-none dark:text-slate-100 placeholder:text-slate-400 font-medium disabled:opacity-50"
                    disabled={sendingMsg}
                  />
                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && !attachedFile) || sendingMsg}
                    className="w-9 h-9 shrink-0 bg-[#5a8c12] hover:bg-[#4a730f] text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-[#5a8c12]/20 active:scale-95"
                  >
                    {sendingMsg
                      ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <Send size={15} className="translate-x-px" />
                    }
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      {/* ── New Chat Modal ── */}
      {showNewChat && user && (
        <NewChatModal
          userId={user.uid}
          onClose={() => setShowNewChat(false)}
          onOpen={(token) => setActiveToken(token)}
        />
      )}

      {/* Delete Room Confirmation */}
      <ConfirmModal
        open={showDeleteRoom}
        onOpenChange={setShowDeleteRoom}
        title="Delete Conversation?"
        description="This will permanently delete this entire chat history for both you and the client. This action cannot be undone."
        confirmText={deletingRoom ? "Deleting..." : "Delete Permanently"}
        destructive
        onConfirm={handleLevelDeleteRoom}
      />
    </div>
  );
}
