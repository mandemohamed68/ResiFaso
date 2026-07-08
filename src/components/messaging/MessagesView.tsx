import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Conversation, Message, UserProfile } from '../../types';
import { Send, User as UserIcon, Check, CheckCheck, Clock, MessageSquare, Briefcase, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const MessagesView: React.FC<{ initialConversationId?: string | null }> = ({ initialConversationId }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [participantsInfo, setParticipantsInfo] = useState<Record<string, UserProfile>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;

    const fetchConversations = () => {
      fetch('/api/conversations', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(data => {
          setConversations(data || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    fetchConversations();
    const intv = setInterval(fetchConversations, 10000);
    return () => clearInterval(intv);
  }, [user]);

  // Handle initial selected conversation link
  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === initialConversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [initialConversationId, conversations]);

  // Fetch participant profiles for conversations
  useEffect(() => {
    if (conversations.length === 0) return;

    const otherParticipants = Array.from(new Set(
      conversations.flatMap(c => c.participants.filter(p => p !== user?.uid))
    ));

    if (otherParticipants.length === 0) return;

    const fetchProfiles = async () => {
      try {
        const res = await fetch('/api/users/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ uids: otherParticipants })
        });
        const data = await res.json();
        setParticipantsInfo(prev => ({ ...prev, ...data }));
      } catch (err) {}
    };
    fetchProfiles();
  }, [conversations, user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const fetchMessages = () => {
      fetch(`/api/conversations/${selectedConversation.id}/messages`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
        .then(res => res.json())
        .then(data => {
          setMessages(data || []);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        });
    };
    fetchMessages();
    const intv = setInterval(fetchMessages, 3000);
    return () => clearInterval(intv);
  }, [selectedConversation]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    try {
      const msgText = newMessage;
      setNewMessage(''); // Clear immediately for UX

      await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ senderId: user.uid, text: msgText })
      });
    } catch (err) {
      console.error("Message send error:", err);
    }
  };

  const getOpponent = (conv: Conversation) => {
    const oppId = conv.participants.find(p => p !== user?.uid);
    return participantsInfo[oppId || ''] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex h-[calc(100vh-160px)]">
        {/* Sidebar - Conversation List */}
        <div className="w-80 border-r border-slate-100 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/30">
            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="text-red-600" size={20} />
              Messages
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-400 text-sm font-medium">Aucune conversation trouvée.</p>
              </div>
            ) : (
              conversations.map(conv => {
                const opponent = getOpponent(conv);
                const isSelected = selectedConversation?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      "w-full p-4 flex items-center gap-3 border-b border-slate-50 hover:bg-slate-50 transition-colors text-left",
                      isSelected && "bg-red-50/50 border-l-4 border-l-red-600"
                    )}
                  >
                    <div className="relative">
                      {opponent?.photoURL ? (
                        <img src={opponent.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <UserIcon size={24} />
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-bold text-slate-900 truncate">
                          {opponent?.displayName || opponent?.email || 'Utilisateur'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                          {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate font-medium">
                        {conv.lastMessage || 'Débutez la discussion...'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Main Content - Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-50/30">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  {getOpponent(selectedConversation)?.photoURL ? (
                    <img src={getOpponent(selectedConversation)?.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <UserIcon size={20} />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 leading-none mb-1">
                      {getOpponent(selectedConversation)?.displayName || 'Utilisateur'}
                    </h3>
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">En ligne</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer">
                    <Briefcase size={20} />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer">
                    <Clock size={20} />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white/50 pattern-bg">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4 scale-150">
                      <MessageSquare size={32} />
                    </div>
                    <h4 className="font-black text-slate-900 text-lg mb-2">Démarrez la conversation</h4>
                    <p className="text-slate-400 text-sm max-w-xs font-medium">Votre sécurité est notre priorité. Échangez uniquement via la plateforme.</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                      <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={cn(
                          "flex flex-col max-w-[80%]",
                          isMe ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        <div className={cn(
                          "px-4 py-2.5 rounded-2xl shadow-sm text-sm font-medium",
                          isMe 
                            ? "bg-red-600 text-white rounded-tr-none shadow-red-100" 
                            : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                        )}>
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            msg.isRead ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} className="text-slate-300" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Tapez votre message ici..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 transition-all"
                  />
                  <button 
                    type="submit"
                    className="bg-red-600 text-white p-3.5 rounded-2xl hover:bg-black hover:shadow-lg active:scale-95 transition-all shadow-md shadow-red-100 cursor-pointer"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="w-24 h-24 bg-white shadow-2xl rounded-[32px] flex items-center justify-center text-red-600 mb-8 border-4 border-slate-50">
                <MessageSquare size={44} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Vos conversations</h3>
              <p className="text-slate-400 max-w-sm font-medium">Sélectionnez une discussion à gauche pour commencer à échanger avec vos hôtes ou admins.</p>
              
              <div className="mt-12 grid grid-cols-3 gap-8 w-full max-w-2xl opacity-40">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                  <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                   <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                   <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
