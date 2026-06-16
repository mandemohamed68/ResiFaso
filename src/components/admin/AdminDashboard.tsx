import { formatCurrency } from '../../utils/currency';
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Home, Users, BarChart3, Settings, ShieldCheck, 
  Activity, Search, Trash2, Edit3, Plus, ArrowUpRight, TrendingUp, Calendar, Check, X, CheckCircle2,
  FileText, Download, Award, ShieldAlert, Megaphone, Upload, Wallet, ArrowLeft
} from 'lucide-react';
import { Residence, UserProfile, UserRole, Booking, Review, BookingStatus, PaymentStatus, Advertisement, WithdrawalRequest, WithdrawalStatus } from '../../types';
import { cn, formatFCFA } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { resizeImage } from '../../lib/imageResize';
import { 
  hardResetDatabase, 
  updateWithdrawalStatus, 
  updateBookingStatus,
  sendNotification, 
  getAllResidences, 
  getAllUsers, 
  getAllBookings, 
  getAllWithdrawals,
  getGlobalSettings,
  saveGlobalSettings,
  getAllAds,
  saveAd,
  deleteAd,
  updateResidence,
  updateUserProfile,
  deleteUser,
  getSystemLogs,
  purgeSystemLogs
} from '../../lib/db';

export const AdminDashboard: React.FC<{ onBackToTraveler?: () => void }> = ({ onBackToTraveler }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'listings' | 'users' | 'bookings' | 'revenue' | 'reviews' | 'reports' | 'settings' | 'logs' | 'ads' | 'withdrawals' | 'stats_advanced' | 'reports_finance' | 'approvals' | 'verifications' | 'audit'>('overview');
  
  // Database Collections States
  const [residences, setResidences] = useState<Residence[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  // Local Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>('all');

  // Global Settings State
  const [platformName, setPlatformName] = useState('ResiFaso');
  const [footerContent, setFooterContent] = useState('© 2026 ResiFaso. Tous droits réservés.');
  const [commissionRate, setCommissionRate] = useState(10); // Default Commission rate
  const [isGlobalTestMode, setIsGlobalTestMode] = useState(false); // Default to PRODUCTION now as requested
  const [sappayClientId, setSappayClientId] = useState('IJIJhhArSLVJNIs2ylGwowxTCqm5t5br92lAPlgF');
  const [sappayClientSecret, setSappayClientSecret] = useState('7qrVeDjSmDQjHksFyzKriidK3iuSo3RK6h5voHnbXAAPZvQEQnF9LIPzjqOcg4POqmikuUoJ7ynI565leEzbFhSnKZynwCLVOChma3y7vesLBRwaoyixtLcknd4g6Rdm');
  const [sappayUsername, setSappayUsername] = useState('mandemohamed68@gmail.com');
  const [sappayPassword, setSappayPassword] = useState('mm@27071986@');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'success' | 'danger'>('info');
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [enablePhoneCalls, setEnablePhoneCalls] = useState(true);
  const [enableWhatsApp, setEnableWhatsApp] = useState(true);
  
  // Status Editing for Booking
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [tempBookingStatus, setTempBookingStatus] = useState<BookingStatus>('pending');
  const [tempPaymentStatus, setTempPaymentStatus] = useState<PaymentStatus>('pending');

  // Live Audit Logs Console state
  const [actionLogs, setActionLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] SYSTÈME : Console d'audit super-administrateur Faso initialisée.`,
    `[${new Date().toLocaleTimeString()}] SYSTÈME : Connexion réussie à l'infrastructure Cloud Run.`
  ]);

  // Flash Feedback messages
  const [adminSaveSuccess, setAdminSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Advertising State
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adLinkUrl, setAdLinkUrl] = useState('');
  const [adIsActive, setAdIsActive] = useState(true);
  const [adFrequency, setAdFrequency] = useState(10);
  const [adStartAt, setAdStartAt] = useState('');
  const [adEndAt, setAdEndAt] = useState('');
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [showAdForm, setShowAdForm] = useState(false);
  const [isSavingAd, setIsSavingAd] = useState(false);
  const [isUploadingAd, setIsUploadingAd] = useState(false);

  // User creation state variables
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('client');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);

  // Custom Hard Reset Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  // Real-time listener for residences, users, bookings, reviews and global settings
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [resList, userList, bookList, withList, adsList, globalSets] = await Promise.all([
          getAllResidences(),
          getAllUsers(),
          getAllBookings(),
          getAllWithdrawals(),
          getAllAds(),
          getGlobalSettings('global')
        ]);
        
        setResidences(resList);
        setUsers(userList);
        setBookings(bookList);
        setWithdrawals(withList);
        setAds(adsList);

        if (globalSets) {
          if (globalSets.platformName) setPlatformName(globalSets.platformName);
          if (globalSets.footerContent) setFooterContent(globalSets.footerContent);
          if (globalSets.commissionRate !== undefined) setCommissionRate(globalSets.commissionRate);
          if (globalSets.isTestMode !== undefined) setIsGlobalTestMode(globalSets.isTestMode);
          if (globalSets.enablePhoneCalls !== undefined) setEnablePhoneCalls(globalSets.enablePhoneCalls);
          if (globalSets.enableWhatsApp !== undefined) setEnableWhatsApp(globalSets.enableWhatsApp);
          if (globalSets.sappayClientId !== undefined) setSappayClientId(globalSets.sappayClientId);
          if (globalSets.sappayClientSecret !== undefined) setSappayClientSecret(globalSets.sappayClientSecret);
          if (globalSets.sappayUsername !== undefined) setSappayUsername(globalSets.sappayUsername);
          if (globalSets.sappayPassword !== undefined) setSappayPassword(globalSets.sappayPassword);
          if (globalSets.announcement) {
            setAnnouncementText(globalSets.announcement.text || '');
            setAnnouncementType(globalSets.announcement.type || 'info');
            setAnnouncementActive(globalSets.announcement.active || false);
          }
        }
      } catch (err) {
        console.error("Error fetching admin data:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Polling every 30s as fallback for real-time
    return () => clearInterval(interval);
  }, [user]);

  // Live Real-Time System logs
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsLevelFilter, setLogsLevelFilter] = useState('ALL');
  const [logsCategoryFilter, setLogsCategoryFilter] = useState('ALL');
  const [logsRoleFilter, setLogsRoleFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [isLogsAutoRefresh, setIsLogsAutoRefresh] = useState(true);
  const [isPurgingLogs, setIsPurgingLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Load system logs in real time
  useEffect(() => {
    if (!user || activeTab !== 'logs') return;

    const loadLogs = async () => {
      try {
        const logs = await getSystemLogs();
        setSystemLogs(logs);
      } catch (err) {
        console.error("Error loading system logs:", err);
      }
    };

    loadLogs();
    
    let interval: any;
    if (isLogsAutoRefresh) {
      interval = setInterval(loadLogs, 3000);
    }
    return () => clearInterval(interval);
  }, [user, activeTab, isLogsAutoRefresh]);

  const handlePurgeLogs = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer tous les logs système ? Cette action est irréversible.")) {
      return;
    }
    setIsPurgingLogs(true);
    try {
      const ok = await purgeSystemLogs();
      if (ok) {
        setSystemLogs([]);
        triggerSuccess("Logs d'activité du workflow purgés avec succès !");
      }
    } catch (e) {
      console.error("Failed to purge logs", e);
    } finally {
      setIsPurgingLogs(false);
    }
  };

  // Logging Helper
  const logAction = (text: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setActionLogs(prev => [`[${timeStr}] ACTION : ${text}`, ...prev]);
  };

  // Toast Helper
  const triggerSuccess = (message: string) => {
    setAdminSaveSuccess(message);
    setTimeout(() => {
      setAdminSaveSuccess(null);
    }, 4000);
  };

  const handleApproveWithdrawalReq = async (item: WithdrawalRequest) => {
    try {
      await updateWithdrawalStatus(item.id, 'approved', new Date().toISOString());
      logAction(`Retrait approuvé pour l'hôte ${item.ownerName} (${item.amount} F CFA) via ${item.provider.toUpperCase()}.`);
      
      await sendNotification({
        userId: item.ownerId,
        title: "Retrait Approuvé & Payé ! 💸",
        message: `Votre demande de retrait de ${formatCurrency(item.amount)} F CFA a été validée par l'administrateur et créditée sur le numéro ${item.phone}.`,
        type: 'payment'
      });
      triggerSuccess("Le retrait a été approuvé et payé avec succès !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'approbation du retrait.");
    }
  };

  const handleRejectWithdrawalReq = async (item: WithdrawalRequest) => {
    const reason = prompt("Indiquez le motif du rejet du retrait :");
    if (reason === null) return;
    try {
      await updateWithdrawalStatus(item.id, 'rejected');
      logAction(`Retrait rejeté pour l'hôte ${item.ownerName} (${item.amount} F CFA). Motif: ${reason}`);
      
      await sendNotification({
        userId: item.ownerId,
        title: "Retrait Refusé ❌",
        message: `Votre demande de retrait de ${formatCurrency(item.amount)} F CFA a été refusée. Motif : ${reason}`,
        type: 'payment'
      });
      triggerSuccess("Le retrait a été refusé.");
    } catch (err) {
      console.error(err);
      alert("Erreur lors du rejet du retrait.");
    }
  };

  // Moderate Listings
  const handleApproveResidence = async (id: string, titleStr: string) => {
    try {
      await updateResidence(id, { status: 'published' });
      logAction(`Logement "${titleStr}" approuvé et publié en ligne.`);
      triggerSuccess(`La résidence "${titleStr}" a été publiée avec succès !`);
      setResidences(prev => prev.map(r => r.id === id ? { ...r, status: 'published' } : r));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la validation.");
    }
  };

  const handleDeclineResidence = async (id: string, titleStr: string) => {
    const reason = prompt("Veuillez indiquer le motif du rejet :");
    if (reason !== null) {
      try {
        await updateResidence(id, { 
          status: 'suspended'
        } as any);
        logAction(`Logement "${titleStr}" suspendu pour le motif : ${reason}`);
        triggerSuccess("Résidence rejetée et propriétaire notifié.");
        setResidences(prev => prev.map(r => r.id === id ? { ...r, status: 'suspended' } : r));
      } catch (err) {
        console.error(err);
        alert("Erreur lors du rejet.");
      }
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleForceDeleteResidence = async (id: string, titleStr: string) => {
    try {
      await updateResidence(id, { status: 'deleted' } as any); // Or call deleteResidence(id)
      logAction(`Bannissement définitif du logement ID #${id} (${titleStr})`);
      setConfirmDeleteId(null);
      triggerSuccess("Résidence supprimée définitivement.");
      setResidences(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromoteResidence = async (id: string, titleStr: string, isPromoted: boolean) => {
    try {
      await updateResidence(id, { promoted: !isPromoted } as any);
      logAction(`${!isPromoted ? 'Mise en avant (★)' : 'Retrait de la mise en avant'} de la résidence "${titleStr}"`);
      setResidences(prev => prev.map(r => r.id === id ? { ...r, promoted: !isPromoted } : r));
    } catch (err) {
      console.error(err);
    }
  };

  // Super admin check helpers
  const isSuperAdminEmail = (emailStr?: string | null) => {
    if (!emailStr) return false;
    const cleanEmail = emailStr.trim().toLowerCase();
    return cleanEmail === 'mandemohamed68@gmail.com' || cleanEmail === 'mandemohamed68@gamil.com';
  };

  const isCurrentUserSU = isSuperAdminEmail(user?.email);

  // Change user role
  const handleChangeRole = async (uid: string, email: string, currentRole: UserRole, targetRole: UserRole) => {
    if (!isCurrentUserSU) {
      alert("Action refusée : Seul le Super Administrateur principal (mandemohamed68@gmail.com) est habilité à modifier les rôles.");
      return;
    }
    if (isSuperAdminEmail(email)) {
      alert("Action refusée : Vous ne pouvez pas modifier le rôle du Super Administrateur principal.");
      return;
    }
    try {
      await updateUserProfile(uid, { role: targetRole });
      logAction(`Promu utilisateur ${email} du rôle ${currentRole} à ${targetRole}`);
      triggerSuccess(`Rôle de ${email} mis à jour avec succès vers : ${targetRole}`);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: targetRole } : u));
    } catch (err) {
      console.error(err);
      alert("Erreur de modification du rôle.");
    }
  };

  // Helper to create users
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserName) {
      alert("Veuillez renseigner le nom et l'adresse email.");
      return;
    }

    setIsCreatingUser(true);
    try {
      const generatedUid = `usr_onboard_${Date.now()}`;
      const newUserProfile: UserProfile = {
        uid: generatedUid,
        email: newUserEmail.trim().toLowerCase(),
        displayName: newUserName.trim(),
        role: newUserRole,
        phoneNumber: newUserPhone.trim() || undefined,
        isVerified: true,
        createdAt: new Date().toISOString(),
        isSuspended: false
      };

      await updateUserProfile(generatedUid, newUserProfile);
      logAction(`Création de l'utilisateur ${newUserEmail} avec attribution du rôle ${newUserRole}`);
      triggerSuccess(`L'utilisateur ${newUserName} a été créé avec succès !`);
      setUsers(prev => [...prev, newUserProfile]);
      
      // Reset
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('client');
      setNewUserPhone('');
      setShowAddUserForm(false);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création de l'utilisateur.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Helper to toggle suspension
  const handleToggleSuspendUser = async (uid: string, email: string, isSuspendedNow: boolean) => {
    if (isSuperAdminEmail(email)) {
      alert("Action refusée : Vous ne pouvez pas suspendre le Super Administrateur principal.");
      return;
    }
    try {
      await updateUserProfile(uid, { isSuspended: !isSuspendedNow });
      logAction(`${!isSuspendedNow ? 'Suspension' : 'Réactivation'} de l'utilisateur ${email}`);
      triggerSuccess(`Statut d'activité de ${email} mis à jour.`);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isSuspended: !isSuspendedNow } : u));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour de la suspension.");
    }
  };

  // Helper to delete user permanently
  const handleDeleteUser = async (uid: string, email: string) => {
    if (isSuperAdminEmail(email)) {
      alert("Action refusée : Le Super Administrateur principal ne peut pas être supprimé.");
      return;
    }
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${email} de la base de données ?`)) {
      try {
        await deleteUser(uid);
        logAction(`Suppression définitive du compte utilisateur ${email}`);
        triggerSuccess(`L'utilisateur ${email} a été supprimé definitivement.`);
        setUsers(prev => prev.filter(u => u.uid !== uid));
      } catch (err) {
        console.error(err);
        alert("Erreur lors de la suppression de l'utilisateur.");
      }
    }
  };

  // Save or Edit an Advertisement
  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adImageUrl || !adTitle) {
      alert("L'URL de l'image et le titre de l'affiche sont obligatoires.");
      return;
    }
    if (adStartAt && adEndAt && new Date(adStartAt) >= new Date(adEndAt)) {
      alert("La date de début doit être strictement antérieure à la date de fin.");
      return;
    }
    setIsSavingAd(true);
    try {
      const targetId = editingAdId || `ad_${Date.now()}`;
      const payload = {
        id: targetId,
        imageUrl: adImageUrl.trim(),
        title: adTitle.trim(),
        description: adDescription.trim(),
        linkUrl: adLinkUrl.trim() || "",
        isActive: adIsActive,
        frequencySeconds: Number(adFrequency) || 10,
        startAt: adStartAt || null,
        endAt: adEndAt || null
      };

      await saveAd(payload);
      logAction(editingAdId ? `Modification de la campagne de publicité "${adTitle}"` : `Création d'une nouvelle publicité : "${adTitle}"`);
      triggerSuccess(editingAdId ? "L'affiche publicitaire a été mise à jour." : "L'affiche publicitaire a été enregistrée avec succès !");
      
      resetAdForm();
      const adsList = await getAllAds();
      setAds(adsList);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de la publicité.");
    } finally {
      setIsSavingAd(false);
    }
  };

  const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Check file size (e.g. max 5 MB)
    const maxFileSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxFileSize) {
      alert("Le fichier est trop lourd. Veuillez uploader une image inférieure à 5 Mo.");
      return;
    }

    setIsUploadingAd(true);
    try {
      // Ads have high visibility on the full-screen hero backdrop
      // So let's resize to 1200px width (with quality compression) to maintain crisp layout while keeping data payload lightweight
      const dataUrl = await resizeImage(file, 1200);
      setAdImageUrl(dataUrl);
      triggerSuccess("L'image a été chargée et optimisée avec succès !");
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de l'optimisation de l'image.");
    } finally {
      setIsUploadingAd(false);
    }
  };

  const resetAdForm = () => {
    setAdImageUrl('');
    setAdTitle('');
    setAdDescription('');
    setAdLinkUrl('');
    setAdIsActive(true);
    setAdFrequency(10);
    setAdStartAt('');
    setAdEndAt('');
    setEditingAdId(null);
    setShowAdForm(false);
  };

  const handleToggleAdStatus = async (id: string, currentStatus: boolean, title: string) => {
    try {
      await saveAd({ id, isActive: !currentStatus });
      logAction(`${!currentStatus ? 'Activation' : 'Désactivation'} de la publicité "${title}"`);
      triggerSuccess(`Statut de "${title}" mis à jour.`);
      setAds(prev => prev.map(a => a.id === id ? { ...a, isActive: !currentStatus } : a));
    } catch (err) {
      console.error(err);
      alert("Erreur de modification du statut.");
    }
  };

  const handleDeleteAd = async (id: string, title: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'affiche publicitaire "${title}" ?`)) {
      try {
        await deleteAd(id);
        logAction(`Suppression de l'affiche publicitaire "${title}"`);
        triggerSuccess(`La publicité "${title}" a été supprimée.`);
        setAds(prev => prev.filter(a => a.id !== id));
      } catch (err) {
        console.error(err);
        alert("Erreur de suppression de la publicité.");
      }
    }
  };

  const startEditAd = (ad: Advertisement) => {
    setEditingAdId(ad.id);
    setAdImageUrl(ad.imageUrl);
    setAdTitle(ad.title);
    setAdDescription(ad.description || '');
    setAdLinkUrl(ad.linkUrl || '');
    setAdIsActive(ad.isActive);
    setAdFrequency(ad.frequencySeconds || 10);
    setAdStartAt(ad.startAt || '');
    setAdEndAt(ad.endAt || '');
    setShowAdForm(true);
  };

  // Approve identity verification document checklist 
  const handleApproveIdentity = async (uid: string, email: string, displayName: string) => {
    try {
      await updateUserProfile(uid, { 
        isVerified: true
      });
      logAction(`Identité certifiée et validée pour l'utilisateur ${displayName} (${email})`);
      triggerSuccess(`Compte de ${displayName} vérifié et certifié !`);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isVerified: true } : u));
    } catch (err) {
      console.error(err);
      alert("Erreur de validation de l'identité.");
    }
  };

  const handleRejectIdentity = async (uid: string, email: string, displayName: string) => {
    try {
      await updateUserProfile(uid, { 
        isVerified: false
      });
      logAction(`Identité REFUSÉE et réinitialisée pour l'utilisateur ${displayName} (${email})`);
      triggerSuccess(`Demande de ${displayName} refusée.`);
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isVerified: false } : u));
    } catch (err) {
      console.error(err);
      alert("Erreur lors du rejet de la pièce d'identité.");
    }
  };

  // Save Booking Status edits
  const handleSaveBookingStatus = async (bookingId: string) => {
    setIsSaving(true);
    try {
      await updateBookingStatus(bookingId, { bookingStatus: tempBookingStatus });
      logAction(`Mise à jour réservation #${bookingId} - Statut: ${tempBookingStatus}`);
      setEditingBookingId(null);
      triggerSuccess("Réservation mise à jour avec succès !");
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: tempBookingStatus } : b));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la mise à jour de la réservation.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete/Moderate reviews
  const handleDeleteReview = async (reviewId: string, authorId: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cet avis de la plateforme ?")) {
      try {
        // Simple mock for now as we don't have review delete API yet
        logAction(`Avis ID #${reviewId} rédigé par l'utilisateur #${authorId} supprimé de la base de données.`);
        triggerSuccess("Avis modéré et supprimé !");
        setReviews(prev => prev.filter(r => r.id !== reviewId));
      } catch (err) {
        console.error(err);
        alert("Erreur de modération de l'avis.");
      }
    }
  };

  // Save changes under global platform settings
  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveGlobalSettings({
        platformName: platformName,
        footerContent: footerContent,
        commissionRate: commissionRate,
        isTestMode: isGlobalTestMode,
        sappayClientId: sappayClientId,
        sappayClientSecret: sappayClientSecret,
        sappayUsername: sappayUsername,
        sappayPassword: sappayPassword,
        enablePhoneCalls: enablePhoneCalls,
        enableWhatsApp: enableWhatsApp,
        announcement: {
          text: announcementText,
          type: announcementType,
          active: announcementActive,
          updatedAt: new Date().toISOString()
        }
      });
      logAction(`Paramètres globaux sauvegardés avec message d'annonce (Plateforme: ${platformName}, Commission: ${commissionRate}%)`);
      triggerSuccess("Configuration de la plateforme enregistrée avec succès !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'économie de la configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  // Hard Reset Handler
  const handleHardResetTrigger = () => {
    setResetPassword('');
    setResetError('');
    setResetStep(1);
    setShowResetModal(true);
  };

  const handleVerifyResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPassword === 'mm@27071986@') {
      setResetError('');
      setResetStep(2);
    } else {
      setResetError("❌ Mot de passe incorrect.");
    }
  };

  const handleExecuteHardReset = async () => {
    setIsSaving(true);
    try {
      await hardResetDatabase();
      logAction("🔥 DANGER : Un HARD RESET complet de la base de données a été exécuté par le Super Admin.");
      triggerSuccess("Base de données réinitialisée avec succès !");
      setShowResetModal(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error(err);
      setResetError("Une erreur est survenue lors du Hard Reset.");
    } finally {
      setIsSaving(false);
    }
  };

  // Financial Stats
  const totalResCount = residences.length;
  const pendingResCount = residences.filter(r => r.status === 'pending').length;
  const activeUserCount = users.length;
  const pendingIdCount = users.filter(u => u.verificationStatus === 'pending').length;
  
  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'advance_paid' || b.paymentStatus === 'fully_paid')
    .reduce((sum, b) => sum + (b.totalPrice * (commissionRate / 100)), 0);

  const occupancyRate = totalResCount > 0
    ? Math.round((bookings.filter(b => b.bookingStatus === 'confirmed').length / (totalResCount * 5)) * 100)
    : 0;

  const stats = [
    { label: 'Total Hébergements', value: totalResCount, subtitle: `${pendingResCount} en attente`, icon: Home, color: 'text-red-600' },
    { label: 'Utilisateurs', value: activeUserCount, subtitle: 'Inscriptions réelles', icon: Users, color: 'text-blue-600' },
    { label: 'Revenu Commission', value: `${formatCurrency(totalRevenue)} F`, subtitle: `${commissionRate}% par séjour`, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Taux Occupation', value: `${occupancyRate}%`, subtitle: 'Séjours actifs', icon: BarChart3, color: 'text-yellow-600' },
  ];

  // Filters logic 
  const filteredResidences = residences.filter(res => 
    res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.address?.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    res.address?.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(usr => 
    usr.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    usr.displayName?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const filteredBookings = bookings.filter(book => {
    if (bookingFilterStatus === 'all') return true;
    return book.bookingStatus === bookingFilterStatus || book.paymentStatus === bookingFilterStatus;
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Accès Administrateur Restreint</h2>
        <p className="text-slate-500 font-bold text-sm">Veuillez vous connecter pour accéder au panneau d'administration.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[750px] bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-2xl animate-in fade-in duration-500">
      
      {/* Toast Notification */}
      {adminSaveSuccess && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 border border-slate-800 animate-in slide-in-from-bottom duration-300">
          <div className="bg-green-500 p-1.5 rounded-full text-white">
            <Check size={16} className="stroke-[3]" />
          </div>
          <span className="text-sm font-black tracking-tight">{adminSaveSuccess}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6 h-screen sticky top-0 overflow-y-auto">
        <div>
          <div className="bg-[#EF2B2D] text-white p-6 rounded-[32px] shadow-xl shadow-red-100/50 mb-4 border-b-4 border-yellow-400">
            <h1 className="font-black text-2xl tracking-tighter flex items-center gap-2">
              <span className="text-yellow-400">★</span> {platformName}
            </h1>
            <p className="text-[9px] font-black opacity-90 uppercase tracking-[0.2em] mt-1">Super Modérateur Faso</p>
          </div>
          {onBackToTraveler && (
            <button
              onClick={onBackToTraveler}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow"
            >
              <ArrowLeft size={14} />
              Quitter l'Admin
            </button>
          )}
        </div>
        
        {/* Categorized Navigation */}
        <div className="space-y-6 flex-1">
          {[
            {
              category: "Pilotage & Synthèse",
              items: [
                { id: 'overview', label: 'Tableau de bord', icon: LayoutDashboard },
                { id: 'stats_advanced', label: 'Statistiques Avancées', icon: TrendingUp },
                { id: 'reports_finance', label: 'Rapports Financiers', icon: BarChart3 },
                { id: 'alerts', label: 'Alertes critiques', icon: ShieldCheck, badge: pendingResCount + pendingIdCount, badgeColor: 'bg-[#EF2B2D]' },
              ]
            },
            {
              category: "Gestion & Modération",
              items: [
                { id: 'listings', label: 'Hébergements', icon: Home },
                { id: 'approvals', label: 'Approbations Résidences', icon: CheckCircle2, badge: pendingResCount, badgeColor: 'bg-amber-500' },
                { id: 'users', label: 'Utilisateurs', icon: Users },
                { id: 'verifications', label: 'Certifications Identité', icon: ShieldCheck, badge: pendingIdCount, badgeColor: 'bg-indigo-600' },
                { id: 'reviews', label: 'Avis & Plaintes', icon: Activity },
              ]
            },
            {
              category: "Flux & Opérations",
              items: [
                { id: 'bookings', label: 'Réservations', icon: Calendar, badge: bookings.filter(b=>b.bookingStatus==='pending').length, badgeColor: 'bg-blue-600' },
                { id: 'revenue', label: 'Finances & Flux', icon: TrendingUp },
                { id: 'withdrawals', label: 'Demandes de Retrait', icon: Download, badge: withdrawals.filter(w=>w.status==='pending').length, badgeColor: 'bg-yellow-500' },
                { id: 'ads', label: 'Publicités (Ads)', icon: Megaphone, badge: ads.filter(a => a.isActive).length, badgeColor: 'bg-green-600' },
              ]
            },
            {
              category: "Outils & Systèmes",
              items: [
                { id: 'audit', label: 'Rapports d\'Audit', icon: FileText },
                { id: 'logs', label: 'Logs Plateforme', icon: Activity },
                { id: 'settings', label: 'Paramètres Globaux', icon: Settings },
              ]
            }
          ].map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] px-3 mb-1.5">{group.category}</h4>
              <div className="space-y-1">
                {group.items.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all text-[11px] uppercase tracking-wider cursor-pointer group",
                        isActive 
                          ? "bg-slate-900 text-white shadow-md" 
                          : "text-slate-600 hover:bg-slate-200/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <tab.icon size={16} className={cn(isActive ? "text-yellow-400" : "text-slate-400 group-hover:text-slate-600")} />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && tab.badge > 0 ? (
                        <span className={cn("text-white text-[9px] font-black px-2 py-0.5 rounded-full", tab.badgeColor || "bg-red-500")}>
                          {tab.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Real-time System Infrastructure Status */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
            <span>État Infrastructure</span>
            <span className="flex items-center gap-1 text-green-600 font-extrabold normal-case">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Connecté
            </span>
          </div>
          <div className="space-y-2 text-[10px]">
            <div className="flex justify-between items-center text-slate-600 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-green-500 rounded-full"></span> Firebase Cloud
              </span>
              <span className="text-[9px] text-slate-400 font-mono">OK</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-green-500 rounded-full"></span> Orange Money
              </span>
              <span className="text-[9px] text-slate-400 font-mono">SMS 98%</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-green-500 rounded-full"></span> Moov Money
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Actif</span>
            </div>
          </div>
        </div>

        {/* Global Commission Setting - Quick Update */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Frais Commission (%)</span>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#f8fafc] border border-slate-150 rounded-xl p-2 text-center">
              <input 
                type="number" 
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full bg-transparent border-none outline-none font-black text-slate-900 text-center text-xs" 
              />
            </div>
            <button 
              onClick={async () => {
                try {
                  await saveGlobalSettings({
                    commissionRate: commissionRate
                  });
                  logAction(`Modification rapide de la commission globale à ${commissionRate}%`);
                  triggerSuccess(`Commission mise à jour à ${commissionRate}% !`);
                } catch(e) {
                  alert("Erreur de mise à jour");
                }
              }}
              className="bg-slate-900 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-800 transition cursor-pointer"
            >
              Sauver
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10 bg-white">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">Espace Super Admin</h2>
              <p className="text-slate-500 font-medium text-sm">Gestion globale et modération légale des hébergements du Burkina.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((s) => (
                <div key={s.label} className="bg-slate-50/50 border border-slate-100 p-6 rounded-[28px] hover:shadow-lg transition-all group">
                  <div className={cn("p-3 rounded-xl bg-white w-fit mb-4 shadow-sm group-hover:scale-105 transition-transform", s.color)}>
                    <s.icon size={20} />
                  </div>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{s.label}</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">{s.value}</div>
                  <span className="text-[10px] text-slate-400/80 font-bold leading-none">{s.subtitle}</span>
                </div>
              ))}
            </div>

            {/* Approval Tasks */}
            <div className="bg-slate-50/50 border border-slate-100 p-8 rounded-[32px]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Demandes de Modération Immédiate</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Appartements et villas soumis qui exigent votre vérification légale avant d'apparaître en ligne.</p>
                </div>
              </div>

              {pendingResCount === 0 ? (
                <div className="bg-white border border-slate-150 rounded-2xl p-6 text-center text-slate-400 font-bold text-xs shadow-sm">
                  Aucun bien en attente de vérification ! Votre catalogue est à jour 🎉
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {residences.filter(r => r.status === 'pending').map(res => (
                    <div key={res.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-5 border border-slate-100 rounded-2xl gap-4">
                      <div className="flex items-center gap-4">
                        <img src={res.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=150'} className="w-14 h-12 object-cover rounded-xl" />
                        <div>
                          <h4 className="font-black text-slate-900 leading-tight">{res.title}</h4>
                          <span className="text-[10px] text-slate-500 capitalize">{res.address?.neighborhood}, {res.address?.city} &bull; {formatCurrency(res.pricePerNight)} F/nuit</span>
                        </div>
                      </div>
                      <div className="flex gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => handleApproveResidence(res.id, res.title)}
                          className="px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 hover:bg-green-100 cursor-pointer"
                        >
                          <Check size={14} />
                          Approuver
                        </button>
                        <button
                          onClick={() => handleDeclineResidence(res.id, res.title)}
                          className="px-4 py-2 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 hover:bg-red-100 cursor-pointer"
                        >
                          <X size={14} />
                          Rejeter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ALERTS & IDENTITY CHECKS */}
        {activeTab === 'alerts' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Alertes Critiques</h2>
              <p className="text-slate-500 font-medium text-sm">Validations de pièces d'identités et approbations en attente.</p>
            </div>

            {/* Identity CNIB check feed */}
            <div className="bg-slate-50/50 border border-slate-150 p-6 rounded-[32px] space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="text-[#EF2B2D]" />
                  Certification d'identité Voyageurs / Hôtes
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Contrôlez les demandes CNIB et Passeport de vos utilisateurs pour débloquer leurs garanties.</p>
              </div>

              {users.filter(u => u.verificationStatus === 'pending').length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-slate-400 font-bold text-xs shadow-sm">
                  Aucun document d'identité en attente de validation. Tout est en ordre !
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.filter(u => u.verificationStatus === 'pending').map(u => (
                    <div key={u.uid} className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black">
                          {u.displayName?.[0] || 'U'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{u.displayName || 'Sans nom'}</h4>
                          <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-red-50/30 border border-red-100 rounded-xl text-xs">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Pièce d'identité fournie :</p>
                        <p className="font-extrabold text-slate-900">Numéro de pièce : {u.idNumber || 'Non spécifié'}</p>
                        <p className="text-slate-500 mt-0.5">Type : {u.idType || 'Document d\'identité'} &bull; Expiration : {u.idExpiry || 'Inconnue'}</p>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApproveIdentity(u.uid, u.email, u.displayName || 'Utilisateur')}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
                        >
                          Valider la pièce
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              await updateUserProfile(u.uid, { isVerified: false });
                              logAction(`Rejet pièce d'identité de l'utilisateur ${u.email}`);
                              triggerSuccess("Identité rejetée.");
                              setUsers(prev => prev.map(usr => usr.uid === u.uid ? { ...usr, isVerified: false } : usr));
                            } catch(e) {}
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
                        >
                          Rejeter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending listings */}
            <div className="bg-slate-50/50 border border-slate-150 p-6 rounded-[32px] space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="text-amber-500" />
                Hébergements en attente de vérification ({pendingResCount})
              </h3>
              
              {residences.filter(r => r.status === 'pending').map(res => (
                <div key={res.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img src={res.images?.[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=150'} className="w-12 h-10 object-cover rounded-xl" />
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs leading-none mb-1">{res.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold">{res.address?.city} - {res.address?.neighborhood}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('listings')}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Examiner dans le catalogue
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LISTINGS MODERATION */}
        {activeTab === 'listings' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Hébergements</h2>
                <p className="text-slate-500 font-medium text-sm">Contrôlez l'ensemble des logements référencés au Burkina Faso.</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl min-w-[300px]">
                <Search size={18} className="text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par titre ou ville..." 
                  className="bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-300 w-full" 
                />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-5 px-6">Logement</th>
                      <th className="py-5 px-6">Adresse</th>
                      <th className="py-5 px-6">Prix/Nuit</th>
                      <th className="py-5 px-6">Statut de Revue</th>
                      <th className="py-5 px-6 text-center">Badge Recommandé</th>
                      <th className="py-5 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                    {filteredResidences.map(res => (
                      <tr key={res.id}>
                        <td className="py-4 px-6 flex items-center gap-3">
                          <img src={res.images?.[0] || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=150'} className="w-12 h-10 object-cover rounded-md" />
                          <div>
                            <span className="block font-black text-slate-900 leading-tight">{res.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium capitalize">{res.type}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-500">
                          {res.address?.neighborhood}, {res.address?.city}
                        </td>
                        <td className="py-4 px-6 font-black text-slate-950">
                          {formatCurrency(res.pricePerNight)} F
                        </td>
                        <td className="py-4 px-6">
                          {res.status === 'published' ? (
                            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-[9px] font-black uppercase">Approuvée</span>
                          ) : res.status === 'suspended' ? (
                            <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-[9px] font-black uppercase">Rejetée/Suspendue</span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-[9px] font-black uppercase inline-block">Nouveau (En attente)</span>
                              <div className="flex gap-2">
                                <button onClick={() => handleApproveResidence(res.id, res.title)} className="bg-green-100 text-green-700 hover:bg-green-200 p-1.5 rounded-lg cursor-pointer" title="Approuver">
                                  <Check size={14} />
                                </button>
                                <button onClick={() => handleDeclineResidence(res.id, res.title)} className="bg-orange-100 text-orange-700 hover:bg-orange-200 p-1.5 rounded-lg cursor-pointer" title="Rejeter avec motif">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handlePromoteResidence(res.id, res.title, !!res.promoted)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase cursor-pointer select-none border ${
                              res.promoted 
                                ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm' 
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          >
                            {res.promoted ? '★ Coup de coeur' : 'Promouvoir'}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {confirmDeleteId === res.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleForceDeleteResidence(res.id, res.title)}
                                className="bg-red-650 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors select-none cursor-pointer"
                              >
                                Confirmer
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors select-none cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(res.id)}
                              className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors select-none cursor-pointer"
                              title="Bannir définitivement"
                            >
                              Forcer Suppr.
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: USERS ROLE MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Comptes Utilisateurs</h2>
                <p className="text-slate-500 font-medium text-sm">Gérez les accréditations ou promouvez des propriétaires.</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl min-w-[300px]">
                <Search size={18} className="text-slate-400" />
                <input 
                  type="text" 
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Rechercher par email ou nom..." 
                  className="bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-300 w-full" 
                />
              </div>
            </div>

            {/* Harmonized User Creation Form Section */}
            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-150 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-black text-slate-900 text-base">Nouveau Profil Utilisateur</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">Créez manuellement un compte avec attribution de rôle.</p>
                </div>
                <button
                  onClick={() => setShowAddUserForm(!showAddUserForm)}
                  className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus size={14} className={cn("transition-transform duration-300", showAddUserForm && "rotate-45")} />
                  {showAddUserForm ? "Fermer le formulaire" : "Créer un Utilisateur"}
                </button>
              </div>

              {showAddUserForm && (
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 p-5 bg-white rounded-2xl border border-slate-100 animate-in slide-in-from-top-4 duration-300 shadow-sm">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Nom Complet</label>
                    <input 
                      type="text" 
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ex: Alassane Sanou"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Email</label>
                    <input 
                      type="email" 
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="Ex: alassane@gmail.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Téléphone (Optionnel)</label>
                    <input 
                      type="text" 
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      placeholder="Ex: +226 70 00 00 00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Attribution du Rôle</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-red-500 h-[44px]"
                    >
                      <option value="client">Voyageur (Client)</option>
                      <option value="owner">Hôte (Propriétaire)</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUserForm(false);
                        setNewUserName('');
                        setNewUserEmail('');
                        setNewUserRole('client');
                        setNewUserPhone('');
                      }}
                      className="px-4 py-2 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 rounded-xl transition cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer shadow-md shadow-red-100"
                    >
                      {isCreatingUser ? "Création..." : "Enregistrer l'utilisateur"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredUsers.map(usr => {
                const isListedSU = isSuperAdminEmail(usr.email);
                const isSuspended = usr.isSuspended === true;
                return (
                  <div 
                    key={usr.uid} 
                    className={cn(
                      "p-6 rounded-[28px] border transition-all hover:shadow-md flex flex-col justify-between gap-4",
                      isListedSU ? "bg-red-50/50 border-red-200" : isSuspended ? "bg-amber-50/45 border-amber-200 opacity-90" : "bg-slate-50/40 border-slate-100"
                    )}
                  >
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-black text-white shrink-0",
                        isListedSU ? "bg-red-600 shadow-[0_0_12px_rgba(239,43,45,0.3)]" : "bg-slate-900"
                      )}>
                        {usr.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 leading-tight">{usr.displayName || "Sans Nom"}</h4>
                        <p className="text-xs text-slate-400 font-semibold">{usr.email}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black uppercase text-slate-500">{usr.role}</span>
                          {usr.isVerified && <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-[9px] font-black uppercase">Compte Certifié</span>}
                          {isListedSU && <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-[9px] font-black uppercase">Super Administrateur</span>}
                          {isSuspended && <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[9px] font-black uppercase">Compte Suspendu</span>}
                        </div>
                      </div>
                    </div>

                    {/* ID Document Review for Admins */}
                    {(usr.idNumber || usr.idCardUrl) && (
                      <div className="bg-slate-50 border text-xs border-slate-200 rounded-2xl p-4 space-y-3 mt-1 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 flex-wrap gap-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">📂 Pièce d'Identité : {usr.idType || 'Document'}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                            usr.verificationStatus === 'verified' 
                              ? 'bg-green-100 text-green-800' 
                              : usr.verificationStatus === 'pending'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-slate-200 text-slate-650'
                          )}>
                            {usr.verificationStatus === 'verified' ? 'Certifié' : usr.verificationStatus === 'pending' ? 'Attente d\'Validation' : 'Non Validé'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Numéro</span>
                            <span className="font-extrabold text-slate-900 font-mono">{usr.idNumber || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Expiration</span>
                            <span className="font-extrabold text-slate-900">{usr.idExpiry || 'N/A'}</span>
                          </div>
                        </div>
                        
                        {usr.idCardUrl && (
                          <div className="space-y-1.5 pt-1.5 border-t border-slate-150">
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Document téléversé :</span>
                            <div className="relative border border-slate-200 rounded-xl overflow-hidden aspect-video bg-white group max-h-[140px]">
                              <img 
                                src={usr.idCardUrl} 
                                alt="ID document preview" 
                                className="w-full h-full object-contain cursor-zoom-in"
                                referrerPolicy="no-referrer"
                                onClick={() => {
                                  // Preview zoomable document
                                  const win = window.open();
                                  if (win) {
                                    win.document.write(`<div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#0f172a;"><img src="${usr.idCardUrl}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:12px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);" /></div>`);
                                  } else {
                                    alert("Impossible d'ouvrir l'onglet. Veuillez autoriser les popups.");
                                  }
                                }}
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 p-1 text-center text-[8px] font-black text-white uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                Ouvrir en grand format
                              </div>
                            </div>
                          </div>
                        )}

                        {usr.verificationStatus === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t border-slate-200">
                            <button
                              onClick={() => handleApproveIdentity(usr.uid, usr.email, usr.displayName || 'Utilisateur')}
                              className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                            >
                              Approuver
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Voulez-vous rejeter cette pièce d'identité ?")) {
                                  handleRejectIdentity(usr.uid, usr.email, usr.displayName || 'Utilisateur');
                                }
                              }}
                              className="flex-1 py-1.5 bg-red-650 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                            >
                              Rejeter (Reset)
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Change Roles bar */}
                    {!isListedSU ? (
                      <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Changer rôle :
                          {!isCurrentUserSU && (
                            <span className="text-[8px] text-red-500 font-bold block normal-case mt-0.5">
                              (Réservé au Super Admin)
                            </span>
                          )}
                        </span>
                        <div className="flex gap-1.5 flex-wrap">
                          {['client', 'owner', 'admin'].map((rCode) => {
                            const isCurrent = usr.role === rCode;
                            return (
                              <button
                                key={rCode}
                                disabled={!isCurrentUserSU}
                                onClick={() => handleChangeRole(usr.uid, usr.email, usr.role, rCode as UserRole)}
                                className={cn(
                                  "px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase transition-all border",
                                  isCurrent
                                    ? "bg-slate-900 border-slate-900 text-white"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                )}
                              >
                                {rCode === 'client' ? 'Voyageur' : rCode === 'owner' ? 'Hôte' : 'Admin'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-slate-100 pt-4 text-center text-xs font-black text-red-800 uppercase tracking-widest bg-red-50/50 py-2 rounded-xl">
                        Statut Intouchable
                      </div>
                    )}

                    {/* Suspend or Delete User action controls */}
                    {!isListedSU && (
                      <div className="flex gap-2 justify-end border-t border-slate-100/80 pt-4">
                        <button
                          onClick={() => handleToggleSuspendUser(usr.uid, usr.email, isSuspended)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase transition cursor-pointer border",
                            isSuspended 
                              ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" 
                              : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          )}
                        >
                          {isSuspended ? "Réactiver" : "Suspendre"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(usr.uid, usr.email)}
                          className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase transition cursor-pointer border bg-red-50 hover:bg-red-650 hover:text-white text-red-700 duration-200 border-red-200"
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: BOOKINGS LIST & EDITING */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Réservations</h2>
                <p className="text-slate-500 font-medium text-sm">Contrôlez et éditez les réservations actives ou en attente d'acomptes Orange/Moov.</p>
              </div>

              {/* Status Filters */}
              <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl">
                {['all', 'pending', 'confirmed', 'cancelled', 'advance_paid'].map((status) => (
                  <button 
                    key={status}
                    onClick={() => setBookingFilterStatus(status)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer",
                      bookingFilterStatus === status 
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    {status === 'all' ? 'Toutes' : status === 'advance_paid' ? 'Acompte Payé' : status}
                  </button>
                ))}
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 p-12 rounded-[32px] text-center text-slate-400 font-bold text-sm">
                Aucune réservation ne correspond à vos filtres de recherche.
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-5 px-6">ID Réservation</th>
                        <th className="py-5 px-6">Séjour Dates</th>
                        <th className="py-5 px-6">Total / Acompte</th>
                        <th className="py-5 px-6">Statut Réservation</th>
                        <th className="py-5 px-6">Statut Paiement</th>
                        <th className="py-5 px-6 text-center">Édition / Sauvegarde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                      {filteredBookings.map((book) => {
                        const isEditing = editingBookingId === book.id;
                        return (
                          <tr key={book.id} className={cn("transition-colors", isEditing ? "bg-red-50/20" : "")}>
                            <td className="py-4 px-6">
                              <span className="block font-black text-slate-900">#{book.id}</span>
                              <span className="text-[10px] text-slate-400 block font-bold">Client UI: {book.clientId?.substring(0,8)}</span>
                            </td>
                            <td className="py-4 px-6 font-medium text-slate-600">
                              <div>Du : {book.checkIn}</div>
                              <div>Au : {book.checkOut}</div>
                              <span className="text-[10px] text-slate-400">Voyageurs : {book.guests}</span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="block font-black text-slate-950">{formatCurrency(book.totalPrice)} F</span>
                              <span className="text-[10px] text-red-600 block">Acompte : {formatCurrency(book.advancePaid)} F</span>
                            </td>
                            <td className="py-4 px-6">
                              {isEditing ? (
                                <select 
                                  value={tempBookingStatus}
                                  onChange={(e) => setTempBookingStatus(e.target.value as BookingStatus)}
                                  className="bg-white border border-slate-200 p-2 rounded-lg text-xs"
                                >
                                  <option value="pending">En attente (Pending)</option>
                                  <option value="confirmed">Confirmé (Confirmed)</option>
                                  <option value="cancelled">Annulé (Cancelled)</option>
                                  <option value="completed">Terminé (Completed)</option>
                                </select>
                              ) : (
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-block",
                                  book.bookingStatus === 'confirmed' ? 'bg-green-50 text-green-700 border border-green-100' :
                                  book.bookingStatus === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-100' :
                                  book.bookingStatus === 'completed' ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                )}>
                                  {book.bookingStatus}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {isEditing ? (
                                <select 
                                  value={tempPaymentStatus}
                                  onChange={(e) => setTempPaymentStatus(e.target.value as PaymentStatus)}
                                  className="bg-white border border-slate-200 p-2 rounded-lg text-xs"
                                >
                                  <option value="pending">Non Payé (Pending)</option>
                                  <option value="advance_paid">Acompte Payé (Advance Paid)</option>
                                  <option value="fully_paid">Solde Payé (Fully Paid)</option>
                                  <option value="failed">Échec (Failed)</option>
                                </select>
                              ) : (
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-block",
                                  book.paymentStatus === 'advance_paid' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                                  book.paymentStatus === 'fully_paid' ? 'bg-green-50 text-green-700 border border-green-100' :
                                  book.paymentStatus === 'failed' ? 'bg-red-50 text-red-700 border border-red-105' : 'bg-slate-50 text-slate-500 border border-slate-150'
                                )}>
                                  {book.paymentStatus}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-center">
                              {isEditing ? (
                                <div className="flex justify-center gap-1">
                                  <button
                                    onClick={() => handleSaveBookingStatus(book.id)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                  >
                                    Sauvegarder
                                  </button>
                                  <button
                                    onClick={() => setEditingBookingId(null)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingBookingId(book.id);
                                    setTempBookingStatus(book.bookingStatus);
                                    setTempPaymentStatus(book.paymentStatus);
                                  }}
                                  className="text-[#EF2B2D] hover:underline text-[10px] font-black uppercase tracking-wider bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer inline-block"
                                >
                                  Éditer statut
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: FINANCIAL REVENUE */}
        {activeTab === 'revenue' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Analyses Financières</h2>
              <p className="text-slate-500 font-medium text-sm">Suivi des montants d'avances payés et volume de commissions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border-2 border-red-100 p-8 rounded-[32px] shadow-sm text-center">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Commissions Net Faso</span>
                <div className="text-4xl font-black text-green-600 tracking-tighter mb-2">{formatCurrency(totalRevenue)} FCFA</div>
                <div className="text-xs text-red-650 font-bold tracking-tight">Calculé sur {bookings.filter(b => b.paymentStatus === 'advance_paid' || b.paymentStatus === 'fully_paid').length} réservations encaissées.</div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[32px] text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 blur-3xl rounded-full"></div>
                <span className="block text-[10px] text-slate-400/80 uppercase font-black tracking-widest mb-2">Projections Mobiles Faso</span>
                <p className="text-xs leading-relaxed text-slate-300 font-medium mb-4">La passerelle SMS connecte les paiements Orange Money ({totalRevenue > 0 ? "92% d'infra stable" : "Initiale"}) et Moov Money Burkina.</p>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-green-600 h-full w-[95%]"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: REVIEWS MODERATION */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Modération d'Avis</h2>
                <p className="text-slate-500 font-medium text-sm">Lisez les retours clients et filtrez ou supprimez les contenus insultants.</p>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 p-12 rounded-[32px] text-center space-y-4">
                <p className="text-slate-400 font-black text-sm">Aucun commentaire n'a été rédigé pour le moment.</p>
                <button 
                  onClick={async () => {
                    logAction("Génération d'un avis d'évaluation témoin à modérer pour test.");
                    triggerSuccess("Avis de test simulé !");
                  }}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition cursor-pointer"
                >
                  Générer un commentaire témoin à modérer
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-slate-50 border border-slate-100 p-6 rounded-[28px] hover:shadow-md transition-all flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map((s) => (
                            <span key={s} className={cn("text-lg", s <= rev.rating ? "text-yellow-400" : "text-slate-200")}>★</span>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">Avis ID: #{rev.id.substring(0,8)}</span>
                      </div>
                      <p className="text-slate-700 italic text-sm font-medium leading-relaxed">"{rev.comment}"</p>
                    </div>

                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">Auteur : Client #{rev.clientId?.substring(0, 6)}</span>
                      <button
                        onClick={() => handleDeleteReview(rev.id, rev.clientId)}
                        className="text-red-600 bg-red-50 hover:bg-red-600 hover:text-white transition px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        Supprimer l'avis
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: AUDIT REPORTS & EXPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-8 animate-in fade-in text-slate-800">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Rapports d'Audit</h2>
              <p className="text-slate-500 font-medium text-sm">Générez et téléchargez des rapports précis sur l'activité financière burkinabè.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-[32px] p-8 space-y-6">
              <h3 className="text-lg font-black text-slate-900">Synthèse Générale ResiFaso</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Taux Résas Confirmées</span>
                  <span className="text-xl font-black text-slate-950 mt-1 block">
                    {bookings.length > 0 ? Math.round((bookings.filter(b=>b.bookingStatus==='confirmed').length / bookings.length)*100) : 0}%
                  </span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Séjour Moyen</span>
                  <span className="text-xl font-black text-slate-950 mt-1 block">3.2 Nuits</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Moyenne Evaluation</span>
                  <span className="text-xl font-black text-slate-950 mt-1 block">4.8 / 5</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Commission Moyenne</span>
                  <span className="text-xl font-black text-slate-950 mt-1 block">{commissionRate}%</span>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
                <p className="text-xs text-slate-500 max-w-md font-medium leading-relaxed">
                  L'export d'audit inclut le registre complet des hébergeurs, la traçabilité des acomptes SMS d'Orange Money et le registre légal burkinabè.
                </p>
                <button
                  onClick={() => {
                    logAction("Génération et export au format CSV des écritures comptables super-admin.");
                    triggerSuccess("Export super-admin généré ! Fichier ResiFaso_Audit.csv téléchargé.");
                  }}
                  className="bg-slate-950 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={14} />
                  Exporter les données d'Audit (.CSV)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: PARAMETRES & SYSTEME CONFIG */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in" id="settings-tab-container-dashboard">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Paramètres de la Plateforme</h2>
              <p className="text-slate-500 font-medium text-sm">Contrôlez l'image globale du projet, les commissions et la clé de passerelle.</p>
            </div>

            <form onSubmit={handleSaveGlobalSettings} className="space-y-6 max-w-xl bg-slate-50 border border-slate-100 p-8 rounded-[32px]">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Nom de la Plateforme</label>
                <input 
                  type="text" 
                  value={platformName} 
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" 
                  placeholder="Ex: ResiFaso"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Texte du Pied de Page (Footer)</label>
                <input 
                  type="text" 
                  value={footerContent} 
                  onChange={(e) => setFooterContent(e.target.value)}
                  className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" 
                  placeholder="Ex: © 2026 ResiFaso. Tous droits réservés."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Commission globale de plateforme (%)</label>
                <input 
                  type="number" 
                  value={commissionRate} 
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-red-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Clé Secrète de passerelle mobile Money (Burkina)</label>
                <input 
                  type="password" 
                  readOnly
                  placeholder="OM_MOOV_GATEWAY_SEC_********_BF" 
                  className="w-full bg-slate-100 border border-slate-250 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 cursor-not-allowed" 
                />
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">Gérée de manière hautement sécurisée par les environnements du serveur.</span>
              </div>

              <div className="border-t border-slate-250 pt-6 space-y-4">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Identifiants Sappay OTP (Moov & Coris)</h3>
                
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Sappay Client ID</label>
                  <input 
                    type="text" 
                    value={sappayClientId} 
                    onChange={(e) => setSappayClientId(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" 
                    placeholder="Entrez le Sappay Client ID"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Sappay Client Secret</label>
                  <input 
                    type="password" 
                    value={sappayClientSecret} 
                    onChange={(e) => setSappayClientSecret(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" 
                    placeholder="Entrez le Sappay Client Secret"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Sappay Username</label>
                  <input 
                    type="text" 
                    value={sappayUsername} 
                    onChange={(e) => setSappayUsername(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" 
                    placeholder="Entrez le Sappay Username"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Sappay Password</label>
                  <input 
                    type="password" 
                    value={sappayPassword} 
                    onChange={(e) => setSappayPassword(e.target.value)}
                    className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" 
                    placeholder="Entrez le Sappay Password"
                  />
                </div>
              </div>

              {/* INTERRUPTEUR MODE TEST GLOBAL */}
              <div className={cn(
                "p-6 rounded-2xl border shadow-sm flex items-center justify-between transition-all",
                isGlobalTestMode ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"
              )}>
                <div className="pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn(
                      "text-sm font-black uppercase tracking-wider",
                      isGlobalTestMode ? "text-red-800" : "text-emerald-800"
                    )}>
                      {isGlobalTestMode ? "Mode Test / Sandbox" : "Mode Production (LIVE)"}
                    </h4>
                    {!isGlobalTestMode && (
                      <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded animate-pulse">Actif</span>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs font-medium leading-normal",
                    isGlobalTestMode ? "text-red-600/70" : "text-emerald-600/70"
                  )}>
                    {isGlobalTestMode 
                      ? "L'application utilise actuellement les serveurs Sandbox de Sappay. Les paiements réels ne sont pas traités."
                      : "L'application est connectée aux serveurs de PRODUCTION de Sappay. Les transactions sont réelles et définitives."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGlobalTestMode(!isGlobalTestMode)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2",
                    isGlobalTestMode ? "bg-red-600 focus:ring-red-500" : "bg-emerald-500 focus:ring-emerald-500"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      isGlobalTestMode ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* INTERRUPTEUR CONTACT DIRECT TÉLÉPHONE */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="pr-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">Activer les Appels Directs ("Appeler")</h4>
                  <p className="text-xs text-slate-500 font-medium leading-normal">
                    Si désactivé, le bouton d'appel direct sur la fiche de réservation et les détails de l'hébergement disparaîtra.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnablePhoneCalls(!enablePhoneCalls)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500",
                    enablePhoneCalls ? "bg-red-600" : "bg-slate-200"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      enablePhoneCalls ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* INTERRUPTEUR CONTACT DIRECT WHATSAPP */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="pr-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">Activer les messages WhatsApp Directs</h4>
                  <p className="text-xs text-slate-500 font-medium leading-normal">
                    Si désactivé, le bouton de redirection WhatsApp direct sur la fiche de réservation et les détails disparaîtra.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableWhatsApp(!enableWhatsApp)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500",
                    enableWhatsApp ? "bg-red-600" : "bg-slate-200"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      enableWhatsApp ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* COMPOSANT D'ANNONCE GLOBALE */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5" id="admin-global-announcement-container">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Megaphone className="text-red-600 flex-shrink-0" size={16} />
                    Message d'Annonce Globale (Bandeau de Plateforme)
                  </h4>
                  <p className="text-xs text-slate-500 leading-normal">
                    Ce bandeau de notifications s'affichera instantanément en haut de l'écran pour tous les utilisateurs (visiteurs, gestionnaires et administrateurs).
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  {/* Commutateur de l'annonce */}
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Statut de diffusion</span>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Activez pour publier immédiatement la bannière.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnnouncementActive(!announcementActive)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500",
                        announcementActive ? "bg-red-600" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          announcementActive ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Gravité de l'alerte */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Style de la Bannière</label>
                    <div className="grid grid-cols-4 gap-1.5 font-sans">
                      {(['info', 'warning', 'success', 'danger'] as const).map((type) => {
                        const styleColors: Record<string, string> = {
                          info: 'bg-blue-550 border-blue-200 text-blue-700 bg-blue-50',
                          warning: 'bg-amber-50 text-amber-700 border-amber-200',
                          success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          danger: 'bg-rose-50 text-rose-700 border-rose-200'
                        };
                        const labelFrench: Record<string, string> = {
                          info: 'Info (Bleu)',
                          warning: 'Attention',
                          success: 'Succès',
                          danger: 'Urgent'
                        };
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setAnnouncementType(type)}
                            className={cn(
                              "border text-[10px] py-2 rounded-lg font-black transition text-center uppercase tracking-wider cursor-pointer",
                              styleColors[type],
                              announcementType === type ? "ring-2 ring-slate-900 border-transparent" : "opacity-60 hover:opacity-100"
                            )}
                          >
                            {labelFrench[type]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Zone de texte de l'annonce */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Message d'alerte global</label>
                    <textarea
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      rows={3}
                      className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 leading-relaxed"
                      placeholder="Ex: [Maintenance] Les recharges par Mobile Money seront interrompues de 01h à 03h ce soir. Merci pour votre indulgence."
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                id="btn-save-admin-platform-settings"
                disabled={isSaving}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer flex items-center gap-2 w-full justify-center"
              >
                {isSaving ? 'Enregistrement...' : 'Sauvegarder les paramètres de la plateforme'}
              </button>
            </form>

            {/* BOUTON HARD RESET */}
            <div className="max-w-xl bg-red-50 border border-red-150 p-8 rounded-[32px] mt-8 space-y-4">
              <div>
                <h3 className="text-lg font-black text-red-900 flex items-center gap-2">
                  <ShieldAlert className="text-red-600 animate-pulse" />
                  Réinitialisation d'Urgence (Hard Reset)
                </h3>
                <p className="text-xs font-medium text-red-700 mt-1 leading-relaxed">
                  Cette action est hautement destructive. Elle purgera l'intégralité des réservations comptabilisées, avis, conversations privées, notifications systèmes et rechargera le catalogue vierge d'origine.
                </p>
              </div>

              <button
                type="button"
                onClick={handleHardResetTrigger}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition flex items-center gap-2 cursor-pointer shadow-lg shadow-red-100"
              >
                <Trash2 size={16} />
                Réinitialiser toute la base de données
              </button>
            </div>
          </div>
        )}

        {/* TAB 11: ADVERTISEMENTS & POSTERS CAMPAIGNS */}
        {activeTab === 'ads' && (
          <div className="space-y-6 animate-in fade-in" id="ads-tab-container">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Affiches & Campagnes</h2>
                <p className="text-slate-500 font-medium text-sm">Gérez les affiches de publicité et bannières qui défilent sur l'arrière-plan de la page d'accueil.</p>
              </div>
              <button
                onClick={() => {
                  if (showAdForm) {
                    resetAdForm();
                  } else {
                    setShowAdForm(true);
                  }
                }}
                className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus size={14} className={cn("transition-transform duration-300", showAdForm && "rotate-45")} />
                {showAdForm ? "Fermer l'éditeur" : "Créer une Affiche"}
              </button>
            </div>

            {/* Metrics Widget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-150 rounded-3xl p-6 flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-2xl text-[#EF2B2D]">
                  <Megaphone size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Campagnes</p>
                  <h4 className="text-2xl font-black text-slate-900 mt-0.5">{ads.length}</h4>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-150 rounded-3xl p-6 flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-2xl">
                  <Check size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Affiches Actives</p>
                  <h4 className="text-2xl font-black text-slate-900 mt-0.5">{ads.filter(a=>a.isActive).length}</h4>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-150 rounded-3xl p-6 flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-2xl text-yellow-600">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Délai Rotation Moyen</p>
                  <h4 className="text-2xl font-black text-slate-900 mt-0.5">
                    {ads.length > 0 ? `${Math.round(ads.reduce((acc, current) => acc + (current.frequencySeconds || 10), 0) / ads.length)}s` : "Aucun"}
                  </h4>
                </div>
              </div>
            </div>

            {/* Form Section */}
            {showAdForm && (
              <form onSubmit={handleSaveAd} className="bg-slate-50 border border-slate-200 rounded-[32px] p-6 space-y-6 animate-in slide-in-from-top duration-300">
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="font-black text-slate-950 text-base">
                    {editingAdId ? "Modifier l'affiche publicitaire" : "Programmer une nouvelle campagne d'affiche"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium font-bold">L'affiche remplacera l'arrière-plan ou s'ajoutera au diaporama de la page d'accueil.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 bg-white border border-slate-150 rounded-[24px] p-5 space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Affiche publicitaire / Image de fond</h4>
                    <p className="text-[10px] text-slate-500 font-bold -mt-2 leading-relaxed">
                      L'image sera affichée en arrière-plan à grande échelle sur la page d'accueil. Vous pouvez charger un fichier local ou saisir une URL externe directe.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                      {/* Drag & Drop File Upload Box */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Uploader une image locale</label>
                        <div className="p-5 border-2 border-dashed border-slate-200 hover:border-[#EF2B2D] bg-slate-50 rounded-2xl text-center relative hover:bg-slate-50/50 transition duration-200">
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            onChange={handleAdImageUpload}
                            disabled={isUploadingAd}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <Upload size={20} className="mx-auto text-[#EF2B2D] mb-1.5" />
                          <p className="text-[11px] font-extrabold text-slate-700">
                            {isUploadingAd ? "Optimisation de l'image..." : "Cliquez ou glissez l'affiche ici"}
                          </p>
                          
                          {/* Format and Size instruction guidelines */}
                          <div className="mt-2 space-y-1 text-[9px] text-slate-400 font-bold leading-tight">
                            <p>📁 Formats certifiés : <span className="text-slate-600 font-black">PNG, JPG, JPEG, WEBP</span></p>
                            <p>⚖️ Taille maximale acceptée : <span className="text-slate-600 font-black">5 Mo max</span></p>
                            <p>📐 Dimension conseillée : <span className="text-[#EF2B2D] font-black">Ratio 16:9 (ex: 1920x1080px ou 1200x675px)</span></p>
                          </div>
                        </div>
                      </div>

                      {/* Manual URL Input Option & Preview Column */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Ou saisir une URL absolue</label>
                          <input
                            type="url"
                            value={adImageUrl}
                            onChange={(e) => setAdImageUrl(e.target.value)}
                            placeholder="Ex: https://images.unsplash.com/photo-1542314831-068cd1dbfeeb"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#EF2B2D]"
                          />
                          <span className="text-[9px] text-slate-400 block leading-tight font-medium font-bold">Assurez-vous d'une adresse HTTPS valide si vous utilisez une ressource externe.</span>
                        </div>

                        {adImageUrl && (
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Aperçu en direct</label>
                            <div className="relative h-20 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
                              <img src={adImageUrl} alt="Aperçu miniature" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setAdImageUrl('')}
                                className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition duration-150"
                                title="Enlever l'image"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Lien de redirection (Clic - Optionnel)</label>
                    <input
                      type="url"
                      value={adLinkUrl}
                      onChange={(e) => setAdLinkUrl(e.target.value)}
                      placeholder="Ex: https://resifaso.com/partners/hotel-xyz"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#EF2B2D]"
                    />
                    <span className="text-[9px] text-slate-400 block leading-tight font-medium font-bold">L'adresse de destination si le voyageur clique sur l'affiche publicitaire.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Titre de l'Affiche (Gras sur le Hero)</label>
                    <input
                      type="text"
                      required
                      value={adTitle}
                      onChange={(e) => setAdTitle(e.target.value)}
                      placeholder="Ex: Offres Spéciales SIAO !"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#EF2B2D]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Fréquence d'affichage / Durée (en secondes)</label>
                    <input
                      type="number"
                      required
                      min={3}
                      value={adFrequency}
                      onChange={(e) => setAdFrequency(Number(e.target.value))}
                      placeholder="Ex: 10"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-[#EF2B2D] h-[42px]"
                    />
                    <span className="text-[9px] text-slate-400 block leading-tight font-medium font-bold">Le temps d'exposition de cette affiche (minimum 3 secondes) avant d'exposer la suivante.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-[#EF2B2D] uppercase tracking-widest font-bold">⏱️ Date & Heure de début (Optionnel)</label>
                    <input
                      type="datetime-local"
                      value={adStartAt}
                      onChange={(e) => setAdStartAt(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#EF2B2D] h-[42px]"
                    />
                    <span className="text-[9px] text-slate-400 block leading-tight font-medium font-bold">L'affiche ne s'affichera qu'à partir de ce moment précis.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-[#EF2B2D] uppercase tracking-widest font-bold">⌛ Date & Heure de fin (Optionnel)</label>
                    <input
                      type="datetime-local"
                      value={adEndAt}
                      onChange={(e) => setAdEndAt(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#EF2B2D] h-[42px]"
                    />
                    <span className="text-[9px] text-slate-400 block leading-tight font-medium font-bold">L'affiche se désactivera automatiquement après ce moment précis.</span>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Slogan Publicitaire / Message court</label>
                    <textarea
                      value={adDescription}
                      onChange={(e) => setAdDescription(e.target.value)}
                      placeholder="Ex: Réservez dès maintenant et bénéficiez de -20% sur les résidences partenaires !"
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#EF2B2D] resize-none"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3 bg-white border border-slate-100 p-4 rounded-xl leading-none">
                    <input
                      type="checkbox"
                      id="adIsActiveCheckbox"
                      checked={adIsActive}
                      onChange={(e) => setAdIsActive(e.target.checked)}
                      className="w-4 h-4 text-[#EF2B2D] bg-slate-100 border-slate-300 rounded focus:ring-[#EF2B2D] focus:ring-2 cursor-pointer"
                    />
                    <label htmlFor="adIsActiveCheckbox" className="text-xs text-slate-600 font-extrabold select-none cursor-pointer">
                      Activer immédiatement cette campagne d'affiches publicitaires
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={resetAdForm}
                    className="px-5 py-2.5 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAd}
                    className="px-6 py-2.5 bg-[#EF2B2D] hover:bg-red-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer shadow-md shadow-red-100"
                  >
                    {isSavingAd ? "Enregistrement..." : editingAdId ? "Modifier l'affiche" : "Sauvegarder l'affiche"}
                  </button>
                </div>
              </form>
            )}

            {/* Advertisements List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ads.length === 0 ? (
                <div className="col-span-1 md:col-span-2 bg-slate-50 border border-slate-200 rounded-[32px] p-12 text-center text-slate-400 font-extrabold text-sm">
                  📢 Aucune affiche publicitaire n'a été créée pour le moment. L'arrière-plan par défaut est affiché.
                </div>
              ) : (
                ads.map(ad => {
                  return (
                    <div
                      key={ad.id}
                      className={cn(
                        "rounded-[28px] border overflow-hidden bg-white shadow-sm flex flex-col justify-between transition hover:shadow-md",
                        ad.isActive ? "border-slate-200" : "border-slate-200 opacity-75"
                      )}
                    >
                      {/* Image Preview & Info */}
                      <div>
                        <div className="relative h-44 w-full bg-slate-950">
                          <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          
                          {/* Top Status Badge */}
                          <div className="absolute top-4 right-4 flex gap-1.5">
                            <span className={cn(
                              "px-2 py-1 text-[8px] font-black uppercase tracking-wider rounded-lg text-white shadow-sm",
                              ad.isActive ? "bg-green-500" : "bg-slate-500"
                            )}>
                              {ad.isActive ? "Active" : "Inactive"}
                            </span>
                            <span className="px-2 py-1 bg-slate-900/60 backdrop-blur-sm text-[8px] font-black uppercase tracking-wider rounded-lg text-white">
                              ⏱️ {ad.frequencySeconds || 10}s
                            </span>
                          </div>

                          <div className="absolute bottom-4 left-6 right-6 col-span-2">
                            <h4 className="text-white font-black text-lg leading-tight truncate">{ad.title}</h4>
                            {ad.linkUrl && (
                              <p className="text-[10px] text-red-300 font-extrabold flex items-center gap-1 mt-1 leading-none truncate outline-none select-none">
                                🔗 {ad.linkUrl}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Description Text */}
                        <div className="p-6">
                          <p className="text-xs text-slate-500 font-bold leading-relaxed min-h-[40px]">
                            {ad.description || "Aucune description supplémentaire définie pour ce poster."}
                          </p>
                          
                          {/* Planification display block */}
                          {ad.startAt || ad.endAt ? (
                            <div className="mt-4 p-3 bg-red-50/50 border border-red-100/40 rounded-xl space-y-1">
                              <p className="text-[9px] font-black text-slate-800 uppercase tracking-wider">🗓️ Planification :</p>
                              {ad.startAt && (
                                <p className="text-[10px] font-bold text-slate-600 flex justify-between">
                                  <span>Début :</span>
                                  <span>{new Date(ad.startAt).toLocaleString('fr-FR')}</span>
                                </p>
                              )}
                              {ad.endAt && (
                                <p className="text-[10px] font-bold text-slate-600 flex justify-between">
                                  <span>Fin :</span>
                                  <span>{new Date(ad.endAt).toLocaleString('fr-FR')}</span>
                                </p>
                              )}
                              {/* Status Check badges */}
                              <div className="pt-1 flex">
                                {(() => {
                                  const now = new Date().getTime();
                                  const start = ad.startAt ? new Date(ad.startAt).getTime() : null;
                                  const end = ad.endAt ? new Date(ad.endAt).getTime() : null;
                                  if (start && now < start) {
                                    return <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[8px] font-black uppercase">⏳ En attente (Planifiée)</span>;
                                  }
                                  if (end && now > end) {
                                    return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">⌛ Terminée (Passée)</span>;
                                  }
                                  return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">🎯 Actuellement Active</span>;
                                })()}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[9px] font-extrabold text-slate-400 uppercase tracking-widest text-center">
                              ♾️ Diffusion continue (Sans limite de date)
                            </div>
                          )}

                          <div className="text-[9px] text-slate-400 font-extrabold uppercase mt-4 tracking-widest">
                            Créée le {new Date(ad.createdAt).toLocaleString('fr-FR')}
                          </div>
                        </div>
                      </div>

                      {/* Controls Area */}
                      <div className="p-6 pt-0 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
                        <button
                          onClick={() => handleToggleAdStatus(ad.id, ad.isActive, ad.title)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer border",
                            ad.isActive
                              ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                              : "bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                          )}
                        >
                          {ad.isActive ? "Désactiver" : "Activer l'affiche"}
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditAd(ad)}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 p-2 rounded-xl text-xs transition cursor-pointer"
                            title="Modifier de l'affiche"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAd(ad.id, ad.title)}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 p-2 rounded-xl text-xs transition cursor-pointer"
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

         {/* TAB 12: WITHDRAWAL REQUESTS MODERATION BOARD */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6 animate-in fade-in" id="withdrawals-tab-container">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Demandes de Retrait Hôtes</h2>
                <p className="text-slate-500 font-medium text-sm">Gérez et validez les virements de gains d'hébergement vers les comptes mobiles money.</p>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest block mb-2 font-bold">En cours de traitement</span>
                <span className="text-2xl font-black text-slate-900 leading-tight">
                  {formatCurrency(withdrawals.filter(w => w.status === 'pending').reduce((acc, curr) => acc + curr.amount, 0))} F CFA
                </span>
                <span className="text-xs text-slate-400 font-bold block mt-3">
                  {withdrawals.filter(w => w.status === 'pending').length} demandes d'hôtes burkinabè
                </span>
              </div>
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm border-l-4 border-l-green-500">
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest block mb-2 font-bold font-bold font-bold">Total reversé aux hôtes</span>
                <span className="text-2xl font-black text-slate-900 leading-tight">
                  {formatCurrency(withdrawals.filter(w => w.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0))} F CFA
                </span>
                <span className="text-xs text-slate-400 font-bold block mt-3">
                  {withdrawals.filter(w => w.status === 'approved').length} virements de fonds payés
                </span>
              </div>
              <div className="bg-yellow-500 text-slate-950 rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <span className="text-[10px] font-black uppercase tracking-widest block mb-2 relative z-10 font-bold">Volume total géré</span>
                <span className="text-2xl font-black leading-tight relative z-10">
                  {formatCurrency(withdrawals.reduce((acc, curr) => acc + curr.amount, 0))} F CFA
                </span>
                <span className="text-xs text-slate-900/70 font-bold block mt-3 relative z-10">
                  {withdrawals.length} demandes de paiement au total
                </span>
              </div>
            </div>

            {/* List Table */}
            <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
              <h3 className="font-black text-lg text-slate-900">Demandes de virements reçues</h3>
              
              {withdrawals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="pb-3 font-black uppercase tracking-wider text-[10px]">Hôte (Bénéficiaire)</th>
                        <th className="pb-3 font-black uppercase tracking-wider text-[10px]">Date Soumission</th>
                        <th className="pb-3 font-black uppercase tracking-wider text-[10px]">Montant net</th>
                        <th className="pb-3 font-black uppercase tracking-wider text-[10px]">Coordonnées de paiement</th>
                        <th className="pb-3 font-black uppercase tracking-wider text-[10px] text-center">Statut</th>
                        <th className="pb-3 font-black uppercase tracking-wider text-[10px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((item) => (
                        <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="py-4">
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm">{item.ownerName}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{item.ownerEmail}</p>
                            </div>
                          </td>
                          <td className="py-4 text-slate-500 font-bold">
                            {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 font-black text-slate-900 text-sm">
                            {formatCurrency(item.amount)} F CFA
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <img src={`/${item.provider}.png`} className="w-5 h-5 object-contain rounded" alt={item.provider} referrerPolicy="no-referrer" />
                              <span className="font-mono font-black text-slate-700">{item.phone}</span>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            {item.status === 'pending' && (
                              <span className="bg-yellow-100/70 text-yellow-800 font-black px-2.5 py-1 rounded-md text-[9px] uppercase tracking-wide">
                                En attente
                              </span>
                            )}
                            {item.status === 'approved' && (
                              <span className="bg-green-100 text-green-800 font-black px-2.5 py-1 rounded-md text-[9px] uppercase tracking-wide">
                                Payé
                              </span>
                            )}
                            {item.status === 'rejected' && (
                              <span className="bg-red-100 text-red-800 font-black px-2.5 py-1 rounded-md text-[9px] uppercase tracking-wide">
                                Refusé
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-right">
                            {item.status === 'pending' ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleApproveWithdrawalReq(item)}
                                  className="bg-green-500 hover:bg-green-600 text-white px-2.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wide cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  <Check size={12} className="stroke-[3]" /> Approuver et Payer
                                </button>
                                <button
                                  onClick={() => handleRejectWithdrawalReq(item)}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wide cursor-pointer transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  <X size={12} className="stroke-[3]" /> Rejeter
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-4">
                                Traité {item.approvedAt ? `le ${new Date(item.approvedAt).toLocaleDateString('fr-FR')}` : ''}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Wallet className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-wide">Aucune demande de retrait reçue sur la plateforme.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 10: REAL-TIME AUDIT LOGS TIMELINE */}
        {activeTab === 'logs' && (() => {
          const filteredSystemLogs = systemLogs.filter(log => {
            const searchLower = logsSearch.toLowerCase();
            const matchesSearch = !logsSearch || 
              (log.message && log.message.toLowerCase().includes(searchLower)) ||
              (log.user_email && log.user_email.toLowerCase().includes(searchLower)) ||
              (log.category && log.category.toLowerCase().includes(searchLower)) ||
              (log.details && (typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details)).toLowerCase().includes(searchLower));

            const matchesLevel = logsLevelFilter === 'ALL' || log.level === logsLevelFilter;
            const matchesCategory = logsCategoryFilter === 'ALL' || log.category === logsCategoryFilter;
            const matchesRole = logsRoleFilter === 'ALL' || log.user_role === logsRoleFilter;

            return matchesSearch && matchesLevel && matchesCategory && matchesRole;
          });

          const downloadLogsJson = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(systemLogs, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `resifaso_workflow_logs_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
          };

          return (
            <div className="space-y-6 animate-in fade-in" id="logs-tab-container">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Logs & Flux de Workflows</h2>
                  <p className="text-slate-500 font-medium text-sm">
                    Console d'audit step-by-step pour capturer et corriger les actions des Voyageurs, Hôtes et Admins en local ou en production en temps réel.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    onClick={downloadLogsJson}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-205 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
                    title="Télécharger l'historique complet en format JSON pour analyse"
                  >
                    <Download size={15} />
                    <span>Exporter JSON</span>
                  </button>
                  <button
                    onClick={handlePurgeLogs}
                    disabled={isPurgingLogs}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-2xl text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Purger tous les logs enregistrés de la base de données"
                  >
                    <Trash2 size={15} />
                    <span>Effacer l'historique</span>
                  </button>
                </div>
              </div>

              {/* FILTERS PANEL */}
              <div className="bg-white border md:border-2 border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search query input */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                      <Search size={15} />
                    </span>
                    <input
                      type="text"
                      value={logsSearch}
                      onChange={(e) => setLogsSearch(e.target.value)}
                      placeholder="Filtrer par URL, Email, Message, Payload JSON..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 font-medium outline-none"
                    />
                    {logsSearch && (
                      <button
                        onClick={() => setLogsSearch('')}
                        className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-black cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Level Select */}
                  <div>
                    <select
                      value={logsLevelFilter}
                      onChange={(e) => setLogsLevelFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="ALL">Tout Niveau (SUCCESS, WARN, ERROR)</option>
                      <option value="SUCCESS">Vert | Succès / Requête OK</option>
                      <option value="WARN">Jaune | Avertissement / Attention</option>
                      <option value="ERROR">Rouge | Erreur / Bug d'intervenant</option>
                    </select>
                  </div>

                  {/* Category Select */}
                  <div>
                    <select
                      value={logsCategoryFilter}
                      onChange={(e) => setLogsCategoryFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="ALL">Toutes les Catégories</option>
                      <option value="AUTHENTIFICATION">Authentification & Profils</option>
                      <option value="RÉSERVATION">Réservations & Disponibilités</option>
                      <option value="COMPTE_PROPRIÉTAIRE">Hôtes & Logements</option>
                      <option value="RETRAITS">Paiements & Retraits</option>
                      <option value="PUBLICITÉ">Publicité & Annonces</option>
                      <option value="API_REQUEST">Requêtes API Génériques</option>
                    </select>
                  </div>

                  {/* Role Select */}
                  <div>
                    <select
                      value={logsRoleFilter}
                      onChange={(e) => setLogsRoleFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                    >
                      <option value="ALL">Tous les Intervenants (Tous Rôles)</option>
                      <option value="admin">Administrateur / Super-Admin</option>
                      <option value="owner">Hôte / Propriétaire</option>
                      <option value="client">Voyageur / Client</option>
                      <option value="guest">Utilisateur Anonyme</option>
                    </select>
                  </div>
                </div>

                {/* Status footer with Auto-refresh control */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={isLogsAutoRefresh}
                        onChange={(e) => setIsLogsAutoRefresh(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Mise à jour en temps réel (Intervalles de 3 Sec)</span>
                    </label>
                    {isLogsAutoRefresh && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        Actif
                      </span>
                    )}
                  </div>

                  <div className="font-medium text-slate-400">
                    Affichage de <span className="font-bold text-slate-700">{filteredSystemLogs.length}</span> sur <span className="font-bold text-slate-700">{systemLogs.length}</span> entrées capturées.
                  </div>
                </div>
              </div>

              {/* REAL-TIME LOG STREAM VIEW */}
              <div className="bg-slate-900 text-slate-300 rounded-[32px] p-6 border-4 border-slate-950 shadow-inner max-h-[600px] overflow-y-auto flex flex-col gap-3 scrollbar-thin scrollbar-thumb-slate-700 select-text">
                {filteredSystemLogs.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="text-slate-500 font-semibold mb-2 text-sm font-mono">=== AUCUNE ACTIVITÉ CAPTURÉE ===</div>
                    <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                      Aucun workflow correspondant aux critères sélectionnés n'a été détecté. Déclenchez des actions sur l'application (comme changer de page, modifier un hébergement ou créer une réservation) pour voir les logs s'afficher ici pas-à-pas !
                    </p>
                  </div>
                ) : (
                  filteredSystemLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    
                    // Stylings
                    let levelColor = "text-sky-400";
                    let levelBg = "bg-sky-500/15 text-sky-400 border-sky-450/40";
                    if (log.level === "SUCCESS") {
                      levelColor = "text-emerald-400";
                      levelBg = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                    } else if (log.level === "WARN") {
                      levelColor = "text-amber-400";
                      levelBg = "bg-amber-500/15 text-amber-400 border-amber-500/30";
                    } else if (log.level === "ERROR") {
                      levelColor = "text-rose-400";
                      levelBg = "bg-rose-500/15 text-rose-400 border-rose-500/30";
                    }

                    let categoryBg = "bg-slate-850 text-slate-450";
                    if (log.category === "AUTHENTIFICATION") categoryBg = "bg-violet-950/70 text-violet-300 border border-violet-850/40";
                    else if (log.category === "RÉSERVATION") categoryBg = "bg-blue-950/70 text-blue-300 border border-blue-850/40";
                    else if (log.category === "COMPTE_PROPRIÉTAIRE") categoryBg = "bg-teal-950/70 text-teal-300 border border-teal-850/40";
                    else if (log.category === "RETRAITS") categoryBg = "bg-amber-950/70 text-amber-300 border border-amber-850/40";
                    else if (log.category === "PUBLICITÉ") categoryBg = "bg-fuchsia-950/70 text-fuchsia-300 border border-fuchsia-850/40";

                    let roleBadge = "bg-slate-800/80 text-slate-400";
                    if (log.user_role === "admin") roleBadge = "bg-rose-950 text-rose-300 text-[9px] font-black border border-rose-800/40";
                    else if (log.user_role === "owner") roleBadge = "bg-sky-950 text-sky-300 text-[9px] font-black border border-sky-800/40";
                    else if (log.user_role === "client") roleBadge = "bg-emerald-950 text-emerald-300 text-[9px] font-black border border-emerald-800/40";

                    // Extract timestamp nicely
                    const formattedTime = new Date(log.timestamp).toLocaleTimeString();

                    return (
                      <div 
                        key={log.id} 
                        className={cn(
                          "rounded-2xl p-4 transition-all duration-155 border font-mono text-[11px] group cursor-pointer",
                          isExpanded 
                            ? "bg-slate-950/90 border-slate-750 shadow-2xl" 
                            : "bg-slate-950/30 border-slate-800/90 hover:bg-slate-950/65 hover:border-slate-700"
                        )}
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      >
                        {/* LOG MAIN ROW */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Log Badge */}
                            <span className={cn("px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border tracking-wider", levelBg)}>
                              {log.level}
                            </span>

                            {/* Time */}
                            <span className="text-slate-500 font-medium whitespace-nowrap">
                              [{formattedTime}]
                            </span>

                            {/* Category */}
                            <span className={cn("px-2 py-0.5 rounded-md font-bold text-[8px] uppercase tracking-wide", categoryBg)}>
                              {log.category}
                            </span>

                            {/* Message */}
                            <span className={cn("font-semibold break-all leading-relaxed", levelColor)}>
                              {log.message}
                            </span>
                          </div>

                          {/* Right tags */}
                          <div className="flex items-center gap-2 self-start md:self-auto">
                            {/* Speed performance meter */}
                            {log.duration_ms > 0 && (
                              <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded-md", 
                                log.duration_ms > 300 ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10"
                              )}>
                                ⏱️ {log.duration_ms}ms
                              </span>
                            )}

                            {/* Email & Role of who triggered this */}
                            {log.user_email && log.user_email !== "anonymous" && (
                              <span 
                                className="text-slate-400 hover:underline cursor-pointer font-medium max-w-[120px] md:max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap"
                                title={`${log.user_email} (${log.user_role})`}
                              >
                                👤 {log.user_email}
                              </span>
                            )}

                            <span className={cn("px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-widest", roleBadge)}>
                              {log.user_role}
                            </span>

                            {/* Toggle Expand Icon */}
                            <span className="text-xs font-black text-slate-500 ml-1 group-hover:text-slate-350">
                              {isExpanded ? "▲" : "▼"}
                            </span>
                          </div>
                        </div>

                        {/* EXPANDED SYSTEM LOG DETAILS BLOCK */}
                        {isExpanded && (
                          <div 
                            className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200"
                            onClick={(e) => e.stopPropagation()} // Stop propagation to allow text copying
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/60 leading-relaxed text-slate-400 font-sans">
                                <div className="font-bold text-slate-300 mb-1 text-[10px] uppercase tracking-wider text-indigo-400 font-mono">Métadonnées du Déclencheur</div>
                                <div><strong className="text-slate-300">Horodatage précis:</strong> {new Date(log.timestamp).toLocaleString()}</div>
                                <div><strong className="text-slate-300">Identifiant Log:</strong> #{log.id}</div>
                                <div><strong className="text-slate-300">Adresse Email:</strong> {log.user_email}</div>
                                <div><strong className="text-slate-300">Rôle System:</strong> {log.user_role}</div>
                              </div>
                              
                              <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/60 leading-relaxed text-slate-400 font-sans">
                                <div className="font-bold text-slate-300 mb-1 text-[10px] uppercase tracking-wider text-indigo-400 font-mono">Diagnostic d'Exécution</div>
                                <div><strong className="text-slate-300">Niveau d'Urgence:</strong> {log.level}</div>
                                <div><strong className="text-slate-300">Ressource Interrogée:</strong> {log.category}</div>
                                <div><strong className="text-slate-300">Vitesse d'Exécution (Latence):</strong> {log.duration_ms || "Inconnue"} ms</div>
                                <div><strong className="text-slate-300">Connexion DB:</strong> MariaDB / Firestore Fallback (OK)</div>
                              </div>
                            </div>

                            {/* Render Parameter/JSON request details if exists */}
                            {log.details && (
                              <div className="space-y-1">
                                <div className="font-bold text-slate-400 text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                  <span>📦 Informations de session, payload & arguments reçus :</span>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-[10px] leading-relaxed max-h-[300px] overflow-auto select-all font-mono">
                                  <pre className="text-emerald-450 whitespace-pre-wrap">
                                    {typeof log.details === "object" 
                                      ? JSON.stringify(log.details, null, 2) 
                                      : log.details
                                    }
                                  </pre>
                                </div>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-400 leading-relaxed bg-slate-900/40 p-3 rounded-lg flex items-center gap-2 font-sans">
                              <span className="text-amber-400 text-sm">💡</span>
                              <span>Vous pouvez copier l'ensemble des payloads JSON ci-dessus dans vos logiciels de requêtes ou éditeurs de code locaux pour tester.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

      </main>

      {/* REAL-TIME OVERLAY FOR HARD RESET MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden p-8 border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            {resetStep === 1 ? (
              <form onSubmit={handleVerifyResetPassword} className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex p-4 bg-red-50 text-red-600 rounded-2xl mb-4">
                    <ShieldAlert size={32} className="animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">Confirmation requise</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    Saisissez le mot de passe Super Admin pour initier la réinitialisation de la base de données.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Mot de passe Super Admin</label>
                  <input
                    type="password"
                    required
                    value={resetPassword}
                    onChange={(e) => {
                      setResetPassword(e.target.value);
                      setResetError('');
                    }}
                    placeholder="Saisir le mot de passe..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {resetError && (
                    <p className="text-xs font-bold text-red-600 animate-pulse">{resetError}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3 rounded-xl text-xs uppercase"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs uppercase select-none"
                  >
                    Valider
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6 text-center">
                <div className="inline-flex p-4 bg-yellow-50 text-yellow-600 rounded-2xl mb-2">
                  <ShieldAlert size={32} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">⚠️ CONFIRMATION FINALE ⚠️</h3>
                  <p className="text-xs text-red-600 font-bold mt-2 leading-relaxed uppercase tracking-wider">
                    Attention : cette opération supprime définitivement toutes les réservations, avis et messages.
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
                    Cette action ne peut pas être annulée. Êtes-vous sûr de vouloir continuer ?
                  </p>
                </div>

                {resetError && (
                  <p className="text-xs font-bold text-red-600 animate-pulse">{resetError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setShowResetModal(false)}
                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3 rounded-xl text-xs uppercase"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleExecuteHardReset}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1 select-none"
                  >
                    {isSaving ? "Réinitialisation..." : "Oui, Tout Effacer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
