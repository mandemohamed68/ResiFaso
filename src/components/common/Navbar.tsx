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
import { useBrandingSettings } from '../../hooks/useQueries';

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

  const { data: branding } = useBrandingSettings();
  const bName1 = branding?.brandNamePart1 || 'Resi';
  const bName2 = branding?.brandNamePart2 || 'Faso';
  const activeTheme = branding?.activeTheme || 'default';
  const isChristmas = activeTheme === 'christmas';
  const isNewYear = activeTheme === 'newyear';
  const isValentines = activeTheme === 'valentines';
  const isRamadan = activeTheme === 'ramadan';
  const isBurkina = activeTheme === 'burkina';
  const isRainy = activeTheme === 'rainy';
  const isHarmattan = activeTheme === 'harmattan';
  const isSpring = activeTheme === 'spring';

  const themeBadges: Record<string, { label: string; icon: string; bg: string; text: string }> = {
    christmas: { label: 'Noël Féerique', icon: '🎄', bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-600' },
    newyear: { label: 'Bonne Année 2026', icon: '✨', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-600' },
    valentines: { label: 'Saint-Valentin', icon: '💖', bg: 'bg-pink-500/10 border-pink-500/20', text: 'text-pink-600' },
    ramadan: { label: 'Ramadan Moubarak', icon: '🌙', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-600' },
    burkina: { label: 'Fête Nationale', icon: '🇧🇫', bg: 'bg-green-500/10 border-green-500/20', text: 'text-green-600' },
    rainy: { label: 'Saison des Pluies', icon: '🌧️', bg: 'bg-sky-500/10 border-sky-500/20', text: 'text-sky-600' },
    harmattan: { label: 'Harmattan Doré', icon: '🌪️', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-700' },
    spring: { label: 'Printemps / Pâques', icon: '🌸', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-600' }
  };
  const activeBadge = themeBadges[activeTheme];

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
          const initialSet = new Set<string>();
          unreadItems.forEach((n: any) => initialSet.add(String(n.id)));
          prevUnreadIdsRef.current = initialSet;
          isFirstLoadRef.current = false;
        } else {
          for (const item of unreadItems) {
            const idStr = String(item.id);
            if (!prevUnreadIdsRef.current.has(idStr)) {
              prevUnreadIdsRef.current.add(idStr);
              let redirectUrl = 'notifications';
              if (item.type === 'message') redirectUrl = 'chat';
              if (item.type === 'booking') redirectUrl = 'bookings';

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
    <nav className={cn(
      "sticky top-0 z-50 border-b shadow-xs transition-colors duration-300",
      isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
    )}>
      {/* Dynamic theme brand accent bar */}
      <div 
        className={cn(
          "h-1 w-full absolute top-0 left-0 transition-all duration-500",
          isChristmas ? "bg-gradient-to-r from-red-600 via-amber-300 to-emerald-600 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
          isNewYear ? "bg-gradient-to-r from-blue-900 via-amber-400 to-indigo-900 shadow-[0_0_8px_rgba(251,191,36,0.5)]" :
          isValentines ? "bg-gradient-to-r from-pink-500 via-rose-400 to-red-600 shadow-[0_0_8px_rgba(236,72,153,0.5)]" :
          isRamadan ? "bg-gradient-to-r from-emerald-700 via-amber-400 to-emerald-900 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
          isBurkina ? "bg-gradient-to-r from-emerald-600 via-amber-400 to-red-600 shadow-[0_0_8px_rgba(22,163,74,0.5)]" :
          isRainy ? "bg-gradient-to-r from-sky-600 via-blue-400 to-teal-500 shadow-[0_0_8px_rgba(2,132,199,0.5)]" :
          isHarmattan ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 shadow-[0_0_8px_rgba(217,119,6,0.5)]" :
          isSpring ? "bg-gradient-to-r from-pink-400 via-emerald-400 to-rose-300 shadow-[0_0_8px_rgba(244,114,182,0.5)]" :
          "bg-gradient-to-r from-brand-primary via-amber-400 to-brand-secondary"
        )}
        style={{
          background: (!isChristmas && !isNewYear && !isValentines && !isRamadan && !isBurkina && !isRainy && !isHarmattan && !isSpring)
            ? `linear-gradient(to right, var(--brand-primary, #10b981), #fbbf24, var(--brand-secondary, #ef4444))`
            : undefined
        }}
      />
      <div className="max-w-7xl mx-auto flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 mt-1 gap-2 sm:gap-4">
        {/* Logo & Seasonal Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <div 
            onClick={() => onNavigate('home')} 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none relative min-w-0"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs relative group-hover:scale-105 transition-transform duration-200">
              {/* Christmas Santa Hat */}
              {isChristmas && (
                <div className="absolute -top-1 -left-1 w-6 h-6 sm:w-8 sm:h-8 rotate-[-15deg] z-20 pointer-events-none drop-shadow-md select-none animate-bounce" style={{ animationDuration: '3s' }}>
                  <svg viewBox="0 0 50 50" className="w-full h-full">
                    <path d="M10 30 Q12 12 35 15 C38 16 40 22 35 25 Q20 28 10 30 Z" fill="#ef4444" />
                    <path d="M8 26 Q14 26 22 28 Q30 29 36 26 C38 30 32 34 22 34 Q10 34 8 26 Z" fill="#ffffff" />
                    <circle cx="36" cy="16" r="4" fill="#ffffff" />
                  </svg>
                </div>
              )}
              {/* New Year Gold Sparkle */}
              {isNewYear && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rotate-[15deg] z-20 pointer-events-none select-none animate-pulse">
                  <span className="text-xs sm:text-base">✨</span>
                </div>
              )}
              {/* Valentines Heart Badge */}
              {isValentines && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rotate-[12deg] z-20 pointer-events-none select-none animate-bounce" style={{ animationDuration: '2s' }}>
                  <span className="text-xs sm:text-sm">💖</span>
                </div>
              )}
              {/* Ramadan Moon */}
              {isRamadan && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rotate-[-10deg] z-20 pointer-events-none select-none animate-pulse">
                  <span className="text-xs sm:text-sm">🌙</span>
                </div>
              )}
              {/* Burkina Star Flag Ribbon */}
              {isBurkina && (
                <div className="absolute -top-1 -left-1 w-4 h-4 sm:w-5 sm:h-5 z-20 pointer-events-none select-none flex items-center justify-center bg-red-600 rounded-full border border-amber-300 shadow-xs">
                  <span className="text-[8px] sm:text-[9px] text-amber-300 font-bold">★</span>
                </div>
              )}
              {/* Rainy Cloud */}
              {isRainy && (
                <div className="absolute -top-1 -right-1 w-5 h-5 z-20 pointer-events-none select-none animate-pulse">
                  <span className="text-xs sm:text-sm">🌧️</span>
                </div>
              )}
              {/* Harmattan Sun */}
              {isHarmattan && (
                <div className="absolute -top-1 -right-1 w-5 h-5 z-20 pointer-events-none select-none animate-pulse">
                  <span className="text-xs sm:text-sm">🌪️</span>
                </div>
              )}
              {/* Spring Blossom */}
              {isSpring && (
                <div className="absolute -top-1 -right-1 w-5 h-5 z-20 pointer-events-none select-none animate-spin" style={{ animationDuration: '10s' }}>
                  <span className="text-xs sm:text-sm">🌸</span>
                </div>
              )}

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
            <div className="flex flex-col min-w-0">
              <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tighter leading-none select-none truncate">
                <span className="text-brand-primary">{bName1}</span><span className="text-brand-secondary">{bName2}</span>
              </span>
              <span className={cn(
                "text-[7.5px] sm:text-[8.5px] md:text-[9px] font-bold uppercase tracking-[0.12em] mt-0.5 sm:mt-1 truncate max-w-[110px] sm:max-w-[180px] md:max-w-none",
                isDarkMode ? "text-slate-400" : "text-slate-500"
              )}>
                {branding?.brandSlogan || "Résidences du Burkina"}
              </span>
            </div>
          </div>

          {/* Active Festive Theme Badge Pill */}
          {activeBadge && (
            <div className={cn(
              "hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-xs animate-in fade-in duration-300 select-none",
              activeBadge.bg, activeBadge.text
            )}>
              <span>{activeBadge.icon}</span>
              <span>{activeBadge.label}</span>
            </div>
          )}
        </div>

        {/* Role Switcher (Admin only) */}
        {canSwitch && (
          <div className={cn(
            "items-center gap-1 p-1 rounded-full hidden lg:flex border shrink-0",
            isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
          )}>
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
                  "px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                  currentRole === role 
                    ? (isDarkMode ? "bg-slate-900 text-brand-primary shadow-sm font-bold" : "bg-white text-brand-primary shadow-sm font-bold")
                    : (isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-900")
                )}
              >
                {roleLabels[role]}
              </button>
            ))}
          </div>
        )}

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center gap-1.5 sm:gap-2 shrink-0">
          {!user && (
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="bg-brand-primary hover:bg-brand-primary-dark text-white px-3 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all shadow-sm cursor-pointer whitespace-nowrap flex items-center gap-1.5 active:scale-95"
            >
              <User size={13} />
              <span>Connexion</span>
            </button>
          )}
          <button
            onClick={onToggleDarkMode}
            className={cn(
              "p-2 rounded-lg cursor-pointer transition-all flex items-center justify-center border shrink-0",
              isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            )}
            title={isDarkMode ? "Passer en mode Clair" : "Passer en mode Sombre"}
          >
            {isDarkMode ? <Sun size={16} className="text-amber-400 animate-pulse" /> : <Moon size={16} className="text-slate-700" />}
          </button>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2">
          {/* Desktop Theme Switcher */}
          <button
            onClick={onToggleDarkMode}
            className={cn(
              "p-2 mr-2 rounded-lg cursor-pointer transition-all flex items-center justify-center border",
              isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            )}
            title={isDarkMode ? "Passer en mode Clair" : "Passer en mode Sombre"}
          >
            {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
          </button>
          <button 
            onClick={() => onNavigate('home')}
            className={cn(
              "font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer px-2.5 py-1 rounded-lg",
              activeView === 'home' || activeView === 'search' 
                ? (isDarkMode ? "bg-slate-800 text-white font-extrabold" : "bg-slate-100 text-slate-900 font-extrabold") 
                : (isDarkMode ? "text-slate-300 hover:text-brand-primary" : "text-slate-650 hover:text-brand-primary")
            )}
          >
            Rechercher
          </button>

          {user && (
            <>
              {currentRole === 'client' && (
                <>
                  <div className={cn("h-6 w-px mx-2", isDarkMode ? "bg-slate-800" : "bg-slate-200")}></div>
                  <button onClick={() => onNavigate('favorites')} className={cn("p-2 transition-colors cursor-pointer", isDarkMode ? "text-slate-400 hover:text-red-400" : "text-slate-400 hover:text-red-500")}>
                    <Heart size={18} />
                  </button>
                  <button onClick={() => onNavigate('messages')} className={cn("p-2 transition-colors relative cursor-pointer", isDarkMode ? "text-slate-400 hover:text-green-400" : "text-slate-400 hover:text-green-500")}>
                    <MessageSquare size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full"></span>
                  </button>
                  <button 
                    onClick={() => onNavigate('bookings')}
                    className={cn(
                      "font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer px-2 ml-1",
                      isDarkMode ? "text-slate-300 hover:text-brand-primary" : "text-slate-650 hover:text-brand-primary"
                    )}
                  >
                    Mes réservations
                  </button>
                </>
              )}
              {currentRole === 'owner' && (
                <button 
                  onClick={() => onNavigate('owner-dashboard')}
                  className={cn(
                    "font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ml-3 px-2",
                    isDarkMode ? "text-slate-300 hover:text-brand-primary" : "text-slate-650 hover:text-brand-primary"
                  )}
                >
                  Espace Hôte
                </button>
              )}
              {currentRole === 'admin' && (
                <button 
                  onClick={() => onNavigate('admin')}
                  className={cn(
                    "font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer ml-3 px-2",
                    isDarkMode ? "text-slate-300 hover:text-brand-primary" : "text-slate-650 hover:text-brand-primary"
                  )}
                >
                  Tableau de bord Admin
                </button>
              )}
            </>
          )}

          <div className={cn("h-6 w-px mx-3", isDarkMode ? "bg-slate-800" : "bg-slate-200")}></div>

          {/* User Actions */}
          {user ? (
            <div className="flex items-center">
              {/* Notifications Bell */}
              <div className="relative mr-3">
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer relative transition-all flex items-center justify-center"
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
                    <div className="absolute right-0 top-full mt-3 w-96 bg-white rounded-xl shadow-xl border border-slate-150 py-4 px-4 z-50 flex flex-col max-h-[460px] animate-in fade-in slide-in-from-top-2 duration-200">
                      
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900 tracking-tight">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-md">
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
                            <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                              <Bell size={22} className="animate-wiggle" />
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
                            }

                            return (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  handleMarkAsRead(notif.id);
                                  if (notif.type === 'message') onNavigate('messaging');
                                  else if (notif.type === 'booking') onNavigate('bookings');
                                  setIsNotifOpen(false);
                                }}
                                className={cn(
                                  "p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 relative group",
                                  isRead 
                                    ? "bg-white hover:bg-slate-50/80 border-slate-100 opacity-70 hover:opacity-100" 
                                    : cn("bg-slate-50/50 hover:bg-slate-100/60 shadow-xs", unreadBorder)
                                )}
                              >
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", bgColor, iconColor)}>
                                  <Icon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className={cn("text-xs leading-tight truncate", isRead ? "font-bold text-slate-700" : "font-extrabold text-slate-900")}>
                                      {notif.title || "Notification"}
                                    </p>
                                    {!isRead && (
                                      <span className="w-2 h-2 rounded-full bg-red-600 shrink-0"></span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5 line-clamp-2">
                                    {notif.message || notif.body}
                                  </p>
                                  <span className="text-[9px] text-slate-400 font-bold block mt-1">
                                    {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pl-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                    {profile?.displayName || user.email?.split('@')[0]}
                  </span>
                  <div className="w-7 h-7 rounded-md bg-brand-primary text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                    {(profile?.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
                  </div>
                </button>

                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{profile?.displayName || user.email}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      </div>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('profile');
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <User size={14} />
                        Mon Profil
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logOut();
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={14} />
                        Déconnexion
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="bg-brand-primary hover:bg-brand-primary-dark text-white px-4.5 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              Connexion
            </button>
          )}
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </nav>
  );
};
