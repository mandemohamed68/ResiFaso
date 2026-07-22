import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRole } from '../../contexts/RoleContext';
import { useToast } from '../../contexts/ToastContext';
import { 
  Home, Search, Heart, User, LogOut, Shield, Briefcase, 
  LayoutDashboard, MessageSquare, Bell, ShieldAlert, CalendarCheck, Check, Sun, Moon,
  Info, AlertTriangle, CheckCircle2, AlertCircle, Clock, HelpCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types';
import { AuthModal } from './AuthModal';
import { apiFetch } from '../../lib/api';
import { requestNotificationPermission, showNotification } from '../../lib/notifications';

export const Navbar: React.FC<{ 
  onNavigate: (view: any) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  activeView: string;
}> = ({ onNavigate, isDarkMode, onToggleDarkMode, activeView }) => {
  const { user, profile, logOut } = useAuth();
  const { currentRole, setCurrentRole, canSwitch } = useRole();
  const { addToast } = useToast();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isSuperAdmin = profile?.email === 'mandemohamed68@gmail.com' || user?.email === 'mandemohamed68@gmail.com';

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const prevUnreadIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Expose notification callback to navigate when clicked
  useEffect(() => {
    (window as any).onNavigateNotification = (url: string) => {
      if (url === 'notifications' || url === 'chat' || url === 'bookings') {
        if (url === 'chat') {
          onNavigate('messaging');
        } else if (url === 'bookings') {
          onNavigate('bookings');
        } else {
          setIsNotifOpen(true);
        }
      }
    };
    return () => {
      delete (window as any).onNavigateNotification;
    };
  }, [onNavigate]);

  // Request notification permissions when user logs in
  useEffect(() => {
    if (user) {
      requestNotificationPermission();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const response = await apiFetch('/api/user-alerts');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);

        // Check for new unread notifications to trigger native / web alerts
        const unreadItems = data.filter((n: any) => {
          const isRead = n.is_read !== undefined ? !!n.is_read : !!n.isRead;
          return !isRead;
        });

        if (isFirstLoadRef.current) {
          // On first load, just record the existing unread IDs to avoid spamming
          const initialSet = new Set<string>();
          unreadItems.forEach((n: any) => initialSet.add(String(n.id)));
          prevUnreadIdsRef.current = initialSet;
          isFirstLoadRef.current = false;
        } else {
          // Identify any new unread item that we haven't seen in this session
          for (const item of unreadItems) {
            const idStr = String(item.id);
            if (!prevUnreadIdsRef.current.has(idStr)) {
              prevUnreadIdsRef.current.add(idStr);
              // Determine routing payload based on type
              let redirectUrl = 'notifications';
              if (item.type === 'message') redirectUrl = 'chat';
              if (item.type === 'booking') redirectUrl = 'bookings';

              // Show native notification with custom WhatsApp sound & alert chimes!
              showNotification(
                item.id,
                item.title || "ResiFaso",
                item.message || item.body || "Nouvelle notification reçue",
                { url: redirectUrl }
              );
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await apiFetch(`/api/user-alerts/${id}/read`, {
        method: 'POST'
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1, isRead: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => {
        const isRead = n.is_read !== undefined ? !!n.is_read : !!n.isRead;
        return !isRead;
      });
      await Promise.all(unread.map(n => apiFetch(`/api/user-alerts/${n.id}/read`, {
        method: 'POST'
      })));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => {
    const isRead = n.is_read !== undefined ? !!n.is_read : !!n.isRead;
    return !isRead;
  }).length;

  const roleLabels: Record<UserRole, string> = {
    client: 'Voyageur',
    owner: 'Hôte',
    admin: isSuperAdmin ? 'Super Admin' : 'Admin',
    manager: 'Manager'
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-xs">
      {/* National colors brand accent bar */}
      <div className="h-1 bg-gradient-to-r from-red-600 via-yellow-400 to-green-600 w-full absolute top-0 left-0" />
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 mt-1">
        {/* Logo */}
        <div 
          onClick={() => onNavigate('home')} 
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm relative">
            <img 
              src="/logoresifaso_new.jpg" 
              alt="ResiFaso logo" 
              className="w-full h-full object-contain p-0.5" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/logoresifasoORG.png";
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 leading-none group-hover:text-red-600 transition-colors">
              Resi<span className="text-red-600 group-hover:text-slate-900 transition-colors">Faso</span>
            </span>
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1.5">
              Résidences du Burkina
            </span>
          </div>
        </div>

        {/* Role Switcher (Admin only) */}
        {canSwitch && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full hidden lg:flex">
            {(['client', 'owner', 'admin'] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => {
                  setCurrentRole(role);
                  if (role === 'admin') onNavigate('admin');
                  else if (role === 'owner') onNavigate('owner-dashboard');
                  else onNavigate('home');
                }}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  currentRole === role ? "bg-white text-red-600 shadow-sm font-bold" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {roleLabels[role]}
              </button>
            ))}
          </div>
        )}

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center gap-2">
          {!user && (
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="bg-red-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-red-700 transition-all shadow-sm"
            >
              Connexion / Inscription
            </button>
          )}
          <button
            onClick={onToggleDarkMode}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-all flex items-center justify-center border border-slate-150"
            title={isDarkMode ? "Passer en mode Clair" : "Passer en mode Sombre"}
          >
            {isDarkMode ? <Sun size={18} className="text-amber-500 animate-pulse" /> : <Moon size={18} className="text-slate-700" />}
          </button>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          {/* Desktop Theme Switcher */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 mr-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-all flex items-center justify-center border border-slate-150"
            title={isDarkMode ? "Passer en mode Clair" : "Passer en mode Sombre"}
          >
            {isDarkMode ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-slate-600" />}
          </button>
          <button 
            onClick={() => onNavigate('home')}
            className="text-slate-650 hover:text-red-600 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer px-2"
          >
            Rechercher
          </button>

          {user && (
            <>
              {currentRole === 'client' && (
                <>
                  <div className="h-6 w-px bg-slate-200 mx-2"></div>
                  <button onClick={() => onNavigate('favorites')} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <Heart size={18} />
                  </button>
                  <button onClick={() => onNavigate('messages')} className="p-2 text-slate-400 hover:text-green-500 transition-colors relative">
                    <MessageSquare size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full"></span>
                  </button>
                  <button 
                    onClick={() => onNavigate('bookings')}
                    className="text-slate-650 hover:text-red-600 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer px-2 ml-1"
                  >
                    Mes réservations
                  </button>
                </>
              )}
              {currentRole === 'owner' && (
                <button 
                  onClick={() => onNavigate('owner-dashboard')}
                  className="text-slate-650 hover:text-red-600 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ml-3 px-2"
                >
                  Espace Hôte
                </button>
              )}
              {currentRole === 'admin' && (
                <button 
                  onClick={() => onNavigate('admin')}
                  className="text-slate-650 hover:text-red-600 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ml-3 px-2"
                >
                  Tableau de bord Admin
                </button>
              )}
            </>
          )}

          <div className="h-6 w-px bg-slate-200 mx-3"></div>

          {/* User Actions */}
          {user ? (
            <div className="flex items-center">
              {/* Notifications Bell */}
              <div className="relative mr-3">
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full cursor-pointer relative transition-all flex items-center justify-center"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-3 w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 py-4 px-4 z-50 flex flex-col max-h-[460px] animate-in fade-in slide-in-from-top-2 duration-200">
                      
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900 tracking-tight">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full">
                              {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] font-extrabold text-red-600 hover:text-red-700 uppercase tracking-wider transition-colors cursor-pointer hover:underline"
                          >
                            Tout marquer comme lu
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div className="overflow-y-auto no-scrollbar flex-1 space-y-3 pb-3 pr-0.5">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                              <Bell size={24} className="animate-wiggle" />
                            </div>
                            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-1">Silence radio</p>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-[200px]">
                              Toutes vos notifications de séjour, messages et alertes apparaîtront ici.
                            </p>
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const isRead = notif.is_read !== undefined ? !!notif.is_read : !!notif.isRead;
                            let Icon = Info;
                            let iconColor = "text-blue-600";
                            let bgColor = "bg-blue-50/60";
                            let unreadBorder = "border-blue-200 ring-1 ring-blue-50/50";
                            
                            if (notif.type === 'booking') {
                              Icon = CalendarCheck;
                              iconColor = "text-emerald-600";
                              bgColor = "bg-emerald-50/60";
                              unreadBorder = "border-emerald-200 ring-1 ring-emerald-50/50";
                            } else if (notif.type === 'alert' || notif.type === 'danger') {
                              Icon = AlertCircle;
                              iconColor = "text-red-600";
                              bgColor = "bg-red-50/60";
                              unreadBorder = "border-red-200 ring-1 ring-red-50/50";
                            } else if (notif.type === 'warning') {
                              Icon = AlertTriangle;
                              iconColor = "text-amber-600";
                              bgColor = "bg-amber-50/60";
                              unreadBorder = "border-amber-200 ring-1 ring-amber-50/50";
                            } else if (notif.type === 'success') {
                              Icon = CheckCircle2;
                              iconColor = "text-emerald-600";
                              bgColor = "bg-emerald-50/60";
                              unreadBorder = "border-emerald-200 ring-1 ring-emerald-50/50";
                            }

                            return (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  handleMarkAsRead(notif.id);
                                  if (notif.type === 'booking') {
                                    if (currentRole === 'owner') onNavigate('owner-dashboard');
                                    else onNavigate('bookings');
                                    
                                    if (notif.referenceId) {
                                      setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('openBookingDetails', { detail: notif.referenceId }));
                                      }, 100);
                                    }
                                  }
                                  setIsNotifOpen(false);
                                }}
                                className={cn(
                                  "group relative p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex gap-3.5 hover:bg-slate-50/50 hover:scale-[1.01] hover:shadow-xs",
                                  isRead 
                                    ? "bg-white border-slate-100 opacity-75 hover:opacity-100" 
                                    : cn("bg-white border-slate-200 shadow-xs", unreadBorder)
                                )}
                              >
                                {/* Unread dot badge indicator */}
                                {!isRead && (
                                  <div className="absolute top-3 right-3 w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-sm shadow-red-200" />
                                )}
                                
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                  bgColor,
                                  iconColor
                                )}>
                                  <Icon size={18} className="stroke-[2.5]" />
                                </div>

                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className={cn(
                                      "text-xs font-extrabold tracking-tight truncate",
                                      isRead ? "text-slate-600" : "text-slate-900"
                                    )}>
                                      {notif.title}
                                    </span>
                                  </div>
                                  <p className={cn(
                                    "text-[11px] leading-relaxed font-medium line-clamp-2",
                                    isRead ? "text-slate-400" : "text-slate-600"
                                  )}>
                                    {notif.message}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Clock size={11} className="text-slate-300 stroke-[2.5]" />
                                    <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                                      {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="border-t border-slate-100 pt-2 shrink-0 mt-1">
                        <button
                          onClick={() => {
                            if (currentRole === 'owner') onNavigate('owner-dashboard');
                            else onNavigate('bookings');
                            setIsNotifOpen(false);
                          }}
                          className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition duration-200 uppercase tracking-widest cursor-pointer"
                        >
                          Voir toutes les alertes
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-4 border border-slate-200 rounded-full hover:shadow-md transition-shadow cursor-pointer bg-white"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User size={18} />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[11px] font-black text-slate-900 leading-tight">{profile?.displayName?.split(' ')[0]}</p>
                  </div>
                </button>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50">
                    {currentRole === 'client' && (
                      <>
                        <button onClick={() => { setIsUserMenuOpen(false); onNavigate('bookings'); }} className="w-full text-left px-5 py-2.5 hover:bg-slate-50 font-bold text-sm text-slate-700">Mes réservations</button>
                        <button onClick={() => { setIsUserMenuOpen(false); onNavigate('favorites'); }} className="w-full text-left px-5 py-2.5 hover:bg-slate-50 font-bold text-sm text-slate-700">Mes favoris</button>
                        <button onClick={() => { setIsUserMenuOpen(false); onNavigate('messages'); }} className="w-full text-left px-5 py-2.5 hover:bg-slate-50 font-bold text-sm text-slate-700 flex justify-between items-center">
                          Messagerie <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">Pro</span>
                        </button>
                        <div className="h-px bg-slate-100 my-2"></div>
                        <button onClick={() => { setIsUserMenuOpen(false); onNavigate('favorites'); }} className="w-full text-left px-5 py-2.5 hover:bg-slate-50 text-sm font-medium text-slate-600">Mes Favoris</button>
                        <button onClick={() => { setIsUserMenuOpen(false); onNavigate('profile'); }} className="w-full text-left px-5 py-2.5 hover:bg-slate-50 text-sm font-medium text-slate-600">Profil & Paramètres</button>
                        <button onClick={() => { setIsUserMenuOpen(false); addToast("Centre d'aide", 'info'); }} className="w-full text-left px-5 py-2.5 hover:bg-slate-50 text-sm font-medium text-slate-600">Centre d'aide</button>
                      </>
                    )}
                    {currentRole === 'owner' && (
                      <>
                        <button onClick={() => { setIsUserMenuOpen(false); addToast('Profil public', "error"); }} className="w-full text-left px-5 py-2.5 hover:bg-slate-50 font-bold text-sm text-slate-700">Profil public</button>
                        <button onClick={() => { setIsUserMenuOpen(false); onNavigate('profile'); }} className="w-full text-left px-5 py-2.5 hover:bg-slate-50 font-bold text-sm text-slate-700">Paramètres du compte</button>
                        <div className="h-px bg-slate-100 my-2"></div>
                      </>
                    )}
                    {currentRole === 'admin' && (
                      <>
                        <button onClick={() => { setIsUserMenuOpen(false); addToast('Profil personnel à venir', "error"); }} className="w-full text-left px-5 py-2.5 hover:bg-slate-50 font-bold text-sm text-slate-700">Profil personnel</button>
                        <div className="h-px bg-slate-100 my-2"></div>
                      </>
                    )}
                    <button onClick={() => { logOut(); setIsUserMenuOpen(false); onNavigate('home'); }} className="w-full text-left px-5 py-2.5 hover:bg-slate-50 text-sm font-bold text-red-600">Déconnexion</button>
                  </div>
                </>
              )}
            </div>
          </div>
          ) : (
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="bg-red-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-sm"
            >
              Connexion / Inscription
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2.5 flex justify-between items-center z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => onNavigate('home')} 
          className={cn(
            "flex flex-col items-center gap-1 transition-all cursor-pointer",
            activeView === 'home' ? "text-red-600 scale-110" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <Home size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Accueil</span>
        </button>
        
        {user && currentRole === 'client' && (
          <button 
            onClick={() => onNavigate('bookings')} 
            className={cn(
              "flex flex-col items-center gap-1 transition-all cursor-pointer",
              activeView === 'bookings' ? "text-red-600 scale-110" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Search size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Réservations</span>
          </button>
        )}

        {(currentRole === 'owner' || currentRole === 'admin') && (
          <button 
            onClick={() => onNavigate('owner-dashboard')} 
            className={cn(
              "flex flex-col items-center gap-1 transition-all cursor-pointer",
              activeView === 'owner-dashboard' ? "text-red-600 scale-110" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Hôte</span>
          </button>
        )}

        {currentRole === 'admin' && (
          <button 
            onClick={() => onNavigate('admin')} 
            className={cn(
              "flex flex-col items-center gap-1 transition-all cursor-pointer",
              activeView === 'admin' ? "text-red-600 scale-110" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <Shield size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Admin</span>
          </button>
        )}

        <button 
          onClick={() => onNavigate('contact')} 
          className={cn(
            "flex flex-col items-center gap-1 transition-all cursor-pointer",
            activeView === 'contact' ? "text-red-600 scale-110" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <HelpCircle size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Support</span>
        </button>

        {user && (
          <button 
            onClick={() => onNavigate('profile')} 
            className={cn(
              "flex flex-col items-center gap-1 transition-all cursor-pointer",
              activeView === 'profile' ? "text-red-600 scale-110" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <User size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Profil</span>
          </button>
        )}
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onNavigate={onNavigate} />
    </nav>
  );
};
