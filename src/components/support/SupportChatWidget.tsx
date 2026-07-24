import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/api';
import { getGlobalSettings } from '../../lib/db';

export const SupportChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [settings, setSettings] = useState<any>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getGlobalSettings().then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openSupportChat', handleOpen);
    return () => window.removeEventListener('openSupportChat', handleOpen);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      markRead();
    }
  }, [isOpen, user, messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const fetchMessages = async () => {
    try {
      const res = await apiFetch('/api/support/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markRead = async () => {
    const hasUnread = messages.some(m => (m.senderId || m.sender_id) !== user?.uid && !m.isRead && !m.is_read);
    if (!hasUnread) return;

    try {
      await apiFetch('/api/support/messages/read', { method: 'PUT' });
      setMessages(prev => prev.map(m => ({ ...m, isRead: true, is_read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    
    try {
      await apiFetch('/api/support/messages', {
        method: 'POST',
        body: JSON.stringify({ message: newMessage.trim() })
      });
      setNewMessage('');
      fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  // Check if chat is enabled and open
  if (settings.supportChatEnabled === false) return null;

  const now = new Date();
  const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const openTime = settings.supportChatOpenTime || '08:00';
  const closeTime = settings.supportChatCloseTime || '20:00';
  const isChatOpen = currentTimeStr >= openTime && currentTimeStr <= closeTime;

  const unreadCount = messages.filter(
    m => (m.senderId || m.sender_id) !== user?.uid && !m.isRead && !m.is_read
  ).length;

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          markRead();
        }}
        className={`fixed bottom-24 md:bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 z-[60] relative ${
          isOpen ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'
        } ${isChatOpen ? 'bg-red-600 text-white' : 'bg-slate-700 text-white'}`}
        title="Support ResiFaso"
      >
        <MessageSquare size={24} />
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 bg-white text-red-600 border-2 border-red-600 text-[11px] font-black rounded-full flex items-center justify-center animate-bounce shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 md:bottom-6 right-6 left-6 md:left-auto w-auto md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col z-[60] overflow-hidden"
            style={{ height: '500px', maxHeight: 'calc(100vh - 120px)' }}
          >
            <div className="bg-red-600 p-4 flex items-center justify-between text-white shrink-0">
              <div>
                <h3 className="font-black text-lg leading-tight">Support ResiFaso</h3>
                <p className="text-[10px] font-medium opacity-90 uppercase tracking-widest mt-0.5">
                  {isChatOpen ? 'En ligne' : `Hors ligne (Ouvert ${openTime} - ${closeTime})`}
                </p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-3">
              {!user ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <User size={32} className="text-slate-300 mb-3" />
                  <p className="text-sm font-bold">Veuillez vous connecter pour discuter avec notre équipe de support.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <MessageSquare size={32} className="text-slate-300 mb-3" />
                  <p className="text-sm font-bold">Posez-nous vos questions !</p>
                  <p className="text-xs mt-1">Nous sommes là pour vous aider.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = (msg.senderId || msg.sender_id) === 'admin';
                  const formatDate = (date: any) => {
                    if (!date) return '';
                    let d = new Date(date);
                    if (isNaN(d.getTime()) && typeof date === 'string') {
                      d = new Date(date.replace(' ', 'T'));
                    }
                    if (isNaN(d.getTime())) return '';
                    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  };

                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-3 text-sm font-medium shadow-sm ${
                        isAdmin 
                          ? 'bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none' 
                          : 'bg-red-600 text-white rounded-tr-none'
                      }`}>
                        {isAdmin && (
                          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">
                            Support ResiFaso
                          </div>
                        )}
                        {msg.message}
                        <div className={`text-[9px] mt-1 text-right ${isAdmin ? 'text-slate-400' : 'text-red-200'}`}>
                          {formatDate(msg.createdAt || msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {user && (
              <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100 shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isChatOpen ? "Votre message..." : "Laisser un message (Support hors ligne)..."}
                    className="w-full bg-slate-50 border border-slate-100 rounded-full py-3 pl-4 pr-12 text-sm font-medium outline-none focus:bg-white focus:border-red-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 w-10 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors"
                  >
                    <Send size={16} className="-ml-0.5" />
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
