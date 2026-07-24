import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { Search, Send, Clock, User, MessageSquare } from 'lucide-react';

export const AdminSupport: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await apiFetch('/api/support/messages?all=true');
      if (res.ok) {
        setMessages(await res.json());
      }
      
      const usersRes = await apiFetch('/api/admin/users');
      if (usersRes.ok) {
        setUsers(await usersRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUserId]);

  // Group messages by user
  const conversations = messages.reduce((acc, msg) => {
    const uid = msg.userId || msg.user_id;
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(msg);
    return acc;
  }, {} as Record<string, any[]>);

  const safeDate = (date: any) => {
    if (!date) return new Date();
    let d = new Date(date);
    if (isNaN(d.getTime()) && typeof date === 'string') {
      d = new Date(date.replace(' ', 'T'));
    }
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const sortedUsers = Object.keys(conversations).sort((a, b) => {
    const lastMsgA = conversations[a][conversations[a].length - 1];
    const lastMsgB = conversations[b][conversations[b].length - 1];
    const dateA = safeDate(lastMsgA.createdAt || lastMsgA.created_at).getTime();
    const dateB = safeDate(lastMsgB.createdAt || lastMsgB.created_at).getTime();
    return dateB - dateA;
  });

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUserId) return;

    try {
      await apiFetch('/api/support/messages', {
        method: 'POST',
        body: JSON.stringify({ message: newMessage.trim(), user_id: selectedUserId })
      });
      setNewMessage('');
      fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  const getUserDetails = (uid: string) => {
    return users.find(u => u.uid === uid) || { displayName: 'Utilisateur Inconnu', email: uid };
  };

  const handleSelectUser = async (uid: string) => {
    setSelectedUserId(uid);
    try {
      await apiFetch('/api/support/messages/read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid })
      });
      fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm h-[calc(100vh-120px)] flex flex-col">
      <div className="mb-6 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Support Client</h2>
          <p className="text-sm text-slate-500 font-medium">Gérez les discussions avec les utilisateurs</p>
        </div>
      </div>

      <div className="flex-1 border border-slate-100 rounded-3xl overflow-hidden flex bg-slate-50">
        {/* Sidebar */}
        <div className="w-1/3 bg-white border-r border-slate-100 flex flex-col">
          <div className="p-4 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-4 top-3 text-slate-300" size={16} />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:bg-white focus:border-red-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sortedUsers.map(uid => {
              const user = getUserDetails(uid);
              const lastMsg = conversations[uid][conversations[uid].length - 1];
              const unreadCount = (conversations[uid] || []).filter(
                m => (m.senderId || m.sender_id) !== 'admin' && !m.isRead && !m.is_read
              ).length;

              return (
                <button
                  key={uid}
                  onClick={() => handleSelectUser(uid)}
                  className={`w-full p-4 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    selectedUserId === uid ? 'bg-red-50 hover:bg-red-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-bold text-sm ${selectedUserId === uid ? 'text-red-900' : 'text-slate-900'} truncate`}>
                      {user.displayName}
                    </span>
                    <div className="flex items-center gap-1.5 ml-2">
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-red-600 text-white font-black text-[9px] rounded-full shrink-0 animate-bounce">
                          {unreadCount}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                        {safeDate(lastMsg.createdAt || lastMsg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{lastMsg.message}</p>
                </button>
              );
            })}
            {sortedUsers.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <p className="text-sm font-medium">Aucune discussion en cours</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        {selectedUserId ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 bg-white border-b border-slate-100 shrink-0 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{getUserDetails(selectedUserId).displayName}</h3>
                <p className="text-xs text-slate-500">{getUserDetails(selectedUserId).email}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {conversations[selectedUserId].map(msg => {
                const isAdmin = (msg.senderId || msg.sender_id) === 'admin';
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl p-4 text-sm font-medium shadow-sm ${
                      isAdmin 
                        ? 'bg-red-600 text-white rounded-tr-sm' 
                        : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'
                    }`}>
                      {msg.message}
                      <div className={`text-[10px] mt-2 text-right ${isAdmin ? 'text-red-200' : 'text-slate-400'}`}>
                        {safeDate(msg.createdAt || msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Répondre..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-4 pr-12 text-sm font-medium outline-none focus:bg-white focus:border-red-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <MessageSquare size={48} className="text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">Sélectionnez une discussion</h3>
            <p className="text-sm">Choisissez un utilisateur dans la liste pour voir l'historique et répondre.</p>
          </div>
        )}
      </div>
    </div>
  );
};
