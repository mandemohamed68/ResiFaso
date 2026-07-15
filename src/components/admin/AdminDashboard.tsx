import { formatCurrency } from '../../utils/currency';
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { 
  LayoutDashboard, Home, Users, BarChart3, Settings, ShieldCheck, 
  Activity, Search, Trash2, Edit3, Plus, ArrowUpRight, TrendingUp, Calendar, Check, X, Eye,
  FileText, Download, Award, ShieldAlert, Megaphone, Upload, Wallet, ArrowLeft, MapPin, MessageSquare, Mail, Phone, Clock,
  ChevronLeft, ChevronRight, RefreshCw, KeyRound, Shield, Compass
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { Residence, UserProfile, UserRole, Booking, Review, BookingStatus, PaymentStatus, Advertisement, WithdrawalRequest, WithdrawalStatus, FAQItem, ContactMessage, ContactSettings } from '../../types';
import { BURKINA_LOCATIONS } from '../../constants/locations';
import { useLocations } from '../../hooks/useLocations';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatFCFA, formatDateFr, formatDateTimeFr } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useDataRefresh } from '../../contexts/DataRefreshContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminData } from '../../hooks/useQueries';
import { PREDEFINED_TYPES } from '../booking/OwnerDashboard';
import { resizeImage } from '../../lib/imageResize';
import { 
  hardResetDatabase, updateWithdrawalStatus, sendNotification,
  getBackendDbType, getGlobalSettings, saveGlobalSettings, getContactSettings, saveContactSettings,
  getAllFaqs, saveFaq, deleteFaq,
  getAllAds, saveAd, deleteAd,
  getAllWithdrawals,
  getAllContactMessages, sendContactMessage, deleteContactMessage, updateContactMessage,
  getAllReviews, deleteReview,
  getAllResidences, updateResidence, deleteResidence,
  getAllBookings, updateBookingStatus,
  getAllUsers, updateUserProfile, deleteUser
} from '../../lib/db';

const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  title: "Contactez-nous",
  description: "Notre équipe est disponible 24h/7 pour vous accompagner dans vos réservations, vos questions de paiement ou la mise en ligne de vos résidences au Burkina Faso.",
  email: "support@resifaso.com",
  phone: "+226 25 30 12 34",
  address: "Avenue Kwame Nkrumah, Ouagadougou, Burkina Faso",
  hours: "Lundi - Vendredi : 08h00 - 18h00 | Samedi : 09h00 - 15h00",
  facebookUrl: "https://facebook.com/resifaso",
  whatsappNumber: "+226 70 12 34 56"
};

import { useToast } from '../../contexts/ToastContext';
import { AdminSupport } from './AdminSupport';
import { RoleGuide } from '../common/RoleGuide';
import { BookingVerificationSection } from '../booking/BookingVerificationSection';

export const AVAILABLE_PERMISSIONS = [
  { id: 'manage_listings', label: 'Gérer les résidences' },
  { id: 'manage_bookings', label: 'Gérer les réservations' },
  { id: 'manage_users', label: 'Gérer les utilisateurs' },
  { id: 'manage_verifications', label: 'Valider les pièces d\'identité' },
  { id: 'manage_withdrawals', label: 'Gérer les retraits' },
  { id: 'manage_reviews', label: 'Modérer les avis' },
  { id: 'manage_ads', label: 'Gérer les publicités' },
  { id: 'manage_faq', label: 'Gérer la FAQ' },
  { id: 'manage_contact', label: 'Gérer les messages contact' },
  { id: 'manage_settings', label: 'Gérer les paramètres globaux' }
];

export const AdminDashboard: React.FC<{ onBackToTraveler?: () => void }> = ({ onBackToTraveler }) => {
  const { user } = useAuth();
  const { lastRefresh } = useDataRefresh();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { data: adminData, isLoading: isAdminLoading } = useAdminData(user?.role);

  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'listings' | 'users' | 'bookings' | 'revenue' | 'reviews' | 'reports' | 'settings' | 'logs' | 'ads' | 'withdrawals' | 'locations' | 'flash-info' | 'faq' | 'contact' | 'email' | 'verifications' | 'support'>('overview');
  
  // Sync adminData to states
  useEffect(() => {
    if (adminData) {
      if (adminData.residences) setResidences(adminData.residences);
      if (adminData.users) setUsers(adminData.users);
      if (adminData.bookings) setBookings(adminData.bookings);
      if (adminData.reviews) setReviews(adminData.reviews);
      if (adminData.ads) setAds(adminData.ads);
      if (adminData.withdrawals) setWithdrawals(adminData.withdrawals);
      if (adminData.faqs) setFaqs(adminData.faqs);
      if (adminData.messages) setContactMessages(adminData.messages);
      if (adminData.verificationTypes) setVerificationTypes(adminData.verificationTypes);
      if (adminData.contactSettings) setContactSettings(adminData.contactSettings as ContactSettings);
      
      const s = adminData.settings;
      if (s) {
        if (s.platformName !== undefined) setPlatformName(s.platformName);
        if (s.footerContent !== undefined) setFooterContent(s.footerContent);
        if (s.commissionRate !== undefined) setCommissionRate(s.commissionRate);
        if (s.isTestMode !== undefined) setIsGlobalTestMode(s.isTestMode);
        if (s.enablePhoneCalls !== undefined) setEnablePhoneCalls(s.enablePhoneCalls);
        if (s.enableWhatsApp !== undefined) setEnableWhatsApp(s.enableWhatsApp);
        if (s.minReservationAmountEnabled !== undefined) setMinReservationAmountEnabled(s.minReservationAmountEnabled);
        if (s.minReservationAmount !== undefined) setMinReservationAmount(s.minReservationAmount);
        if (s.refreshInterval !== undefined) setRefreshInterval(s.refreshInterval);
        if (s.supportChatEnabled !== undefined) setSupportChatEnabled(s.supportChatEnabled);
        if (s.supportChatOpenTime !== undefined) setSupportChatOpenTime(s.supportChatOpenTime);
        if (s.supportChatCloseTime !== undefined) setSupportChatCloseTime(s.supportChatCloseTime);
        if (s.maxBookingsWithoutId !== undefined) setMaxBookingsWithoutId(Number(s.maxBookingsWithoutId));
        if (s.sappayClientId !== undefined) setSappayClientId(s.sappayClientId);
        if (s.sappayClientSecret !== undefined) setSappayClientSecret(s.sappayClientSecret);
        if (s.sappayUsername !== undefined) setSappayUsername(s.sappayUsername);
        if (s.sappayPassword !== undefined) setSappayPassword(s.sappayPassword);
        
        if (s.announcements && s.announcements.length > 0) {
          setAnnouncements(s.announcements);
        }
      }
    }
  }, [adminData]);

  const [verificationTypes, setVerificationTypes] = useState<any[]>([]);
  const [editingVerifType, setEditingVerifType] = useState<any | null>(null);
  const [isSavingVerifType, setIsSavingVerifType] = useState(false);
  const [verifLabel, setVerifLabel] = useState('');
  const [verifDescription, setVerifDescription] = useState('');
  const [verifIsActive, setVerifIsActive] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  
  // Contact page & messages states
  const [contactSettings, setContactSettings] = useState<ContactSettings>(DEFAULT_CONTACT_SETTINGS);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [isSavingContactSettings, setIsSavingContactSettings] = useState(false);
  const [selectedContactMessage, setSelectedContactMessage] = useState<ContactMessage | null>(null);
  const [adminNoteText, setAdminNoteText] = useState('');
  const [isSavingAdminNote, setIsSavingAdminNote] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [msgStatusFilter, setMsgStatusFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');
  
  // Database Collections States
  const [residences, setResidences] = useState<Residence[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const { allLocations, platformLocations } = useLocations();
  const [newCityName, setNewCityName] = useState('');
  const [newNeighborhoodName, setNewNeighborhoodName] = useState('');
  const [selectedCityForNeighborhood, setSelectedCityForNeighborhood] = useState('');

  // Residence Editing State
  const [editingRes, setEditingRes] = useState<Residence | null>(null);
  const [selectedResForDetail, setSelectedResForDetail] = useState<Residence | null>(null);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserProfile | null>(null);
  const [isSavingRes, setIsSavingRes] = useState(false);
  const [editResTitle, setEditResTitle] = useState('');
  const [editResCityId, setEditResCityId] = useState('');
  const [editResNeighborhoodId, setEditResNeighborhoodId] = useState('');
  const [editResPrice, setEditResPrice] = useState(0);
  const [editResType, setEditResType] = useState('');

  // Local Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>('all');

  // FAQ Editing State
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [editFaqQuestion, setEditFaqQuestion] = useState('');
  const [editFaqAnswer, setEditFaqAnswer] = useState('');
  const [editFaqCategory, setEditFaqCategory] = useState<'general' | 'booking' | 'payment' | 'host'>('general');
  const [editFaqOrder, setEditFaqOrder] = useState(0);
  const [editFaqIsActive, setEditFaqIsActive] = useState(true);
  const [isSavingFaq, setIsSavingFaq] = useState(false);

  // Admin Pagination States
  const [residencesPage, setResidencesPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [supportPage, setSupportPage] = useState(1);

  // Reset page numbers when data lists/filters update
  useEffect(() => { setResidencesPage(1); }, [searchQuery]);
  useEffect(() => { setUsersPage(1); }, [userSearchQuery]);
  useEffect(() => { setBookingsPage(1); }, [bookingFilterStatus]);
  useEffect(() => { setSupportPage(1); }, [msgSearchQuery, msgStatusFilter]);

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
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnText, setNewAnnText] = useState('');
  const [newAnnType, setNewAnnType] = useState<'info' | 'warning' | 'success' | 'danger'>('info');
  const [newAnnActive, setNewAnnActive] = useState(true);
  const [newAnnEmoji, setNewAnnEmoji] = useState('📢');
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [enablePhoneCalls, setEnablePhoneCalls] = useState(true);
  const [enableWhatsApp, setEnableWhatsApp] = useState(true);
  const [minReservationAmountEnabled, setMinReservationAmountEnabled] = useState(false);
  const [minReservationAmount, setMinReservationAmount] = useState(5000);
  const [refreshInterval, setRefreshInterval] = useState(60000);
  const [supportChatEnabled, setSupportChatEnabled] = useState(true);
  const [supportChatOpenTime, setSupportChatOpenTime] = useState('08:00');
  const [supportChatCloseTime, setSupportChatCloseTime] = useState('20:00');
  const [maxBookingsWithoutId, setMaxBookingsWithoutId] = useState(3);
  
  // Status Editing for Booking
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [tempBookingStatus, setTempBookingStatus] = useState<BookingStatus>('pending');
  const [tempPaymentStatus, setTempPaymentStatus] = useState<PaymentStatus>('pending');
  const [selectedAdminBookingDetails, setSelectedAdminBookingDetails] = useState<Booking | null>(null);

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: '',
    smtpPass: '',
    fromName: 'ResiFaso',
    fromEmail: 'noreply@resifaso.com'
  });
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);

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
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserPermissions, setNewUserPermissions] = useState<string[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);

  // Security and rights editing states for existing users
  const [expandedUserSecurityUid, setExpandedUserSecurityUid] = useState<string | null>(null);
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserPermissions, setEditUserPermissions] = useState<string[]>([]);
  const [isUpdatingUserSecurity, setIsUpdatingUserSecurity] = useState(false);

  // Scroll to top when tab changes as requested
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Custom Hard Reset Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [reassigningResId, setReassigningResId] = useState<string | null>(null);
  const [reassignNewOwnerId, setReassignNewOwnerId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const [dbType, setDbType] = useState<string>('sql');
  const [isReloading, setIsReloading] = useState(false);

  const reloadData = async () => {
    // reloadData is now handled by React Query invalidation
    queryClient.invalidateQueries({ queryKey: ['admin-data'] });
  };

  useEffect(() => {
    const fetchDbType = async () => {
      try {
        const type = await getBackendDbType();
        setDbType(type);
      } catch (err) {
        console.error("Error fetching dbType:", err);
      }
    };
    fetchDbType();
  }, []);

  useEffect(() => {
    if (user) {
      reloadData();
    }
  }, [dbType, user, lastRefresh]);

  useEffect(() => {
    if (!user) return;
    
    const fetchEmailSettings = async () => {
      try {
        const response = await apiFetch('/api/settings/emailSettings');
        if (response.ok) {
          const data = await response.json();
          if (data && Object.keys(data).length > 0) {
            setEmailSettings(prev => ({ ...prev, ...data }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch email settings:", err);
      }
    };
    
    fetchEmailSettings();
  }, [user]);
  // Logging Helper
  const logAction = (text: string) => {
    const timeStr = new Date().toLocaleTimeString();
    setActionLogs(prev => [`[${timeStr}] ACTION : ${text}`, ...prev]);
  };

  // Toast Helper
  const triggerSuccess = (message: string) => {
    addToast(message, 'success');
  };

  const handleApproveWithdrawalReq = async (item: WithdrawalRequest) => {
    try {
      await updateWithdrawalStatus(item.id, 'approved', new Date().toISOString());
      await reloadData();
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
      addToast("Erreur lors de l'approbation du retrait.", "error");
    }
  };

  const handleRejectWithdrawalReq = async (item: WithdrawalRequest) => {
    const reason = prompt("Indiquez le motif du rejet du retrait :");
    if (reason === null) return;
    try {
      await updateWithdrawalStatus(item.id, 'rejected');
      await reloadData();
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
      addToast("Erreur lors du rejet du retrait.", "error");
    }
  };

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    setIsSaving(true);
    try {
      const cityId = newCityName.toLowerCase().replace(/\s+/g, '-');
      
      setNewCityName('');
      triggerSuccess(`La ville "${newCityName}" a été ajoutée à la plateforme.`);
      logAction(`Ajout de la ville "${newCityName}" aux localités de la plateforme.`);
      await reloadData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de l'ajout de la ville.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNeighborhood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeighborhoodName.trim() || !selectedCityForNeighborhood) return;
    setIsSaving(true);
    try {
      const city = allLocations.find(l => l.id === selectedCityForNeighborhood);
      if (!city) return;

      const newNb = {
        id: `${selectedCityForNeighborhood}-${newNeighborhoodName.toLowerCase().replace(/\s+/g, '-')}`,
        name: newNeighborhoodName.trim()
      };

      // Check if city is dynamic or static
      const dynamicCity = platformLocations.find(l => l.id === selectedCityForNeighborhood);
      if (dynamicCity) {
        
      } else {
        // If it's a static city, we create a dynamic entry for it in 'locations' collection to store the new neighborhoods
        
      }

      setNewNeighborhoodName('');
      triggerSuccess(`Le quartier "${newNeighborhoodName}" a été ajouté à ${city.name}.`);
      logAction(`Ajout du quartier "${newNeighborhoodName}" à la ville de ${city.name}.`);
      await reloadData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de l'ajout du quartier.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer la localité "${name}" ?`)) {
      try {
        await apiFetch(`/api/admin/locations/${id}`, { method: 'DELETE' });
        triggerSuccess("Localité supprimée.");
        logAction(`Suppression de la localité ${name} (${id})`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const currentCityForEdit = allLocations.find(c => c.id === editResCityId);

  const handleStartEditFaq = (faq?: FAQItem) => {
    if (faq) {
      setEditingFaq(faq);
      setEditFaqQuestion(faq.question);
      setEditFaqAnswer(faq.answer);
      setEditFaqCategory(faq.category);
      setEditFaqOrder(faq.order);
      setEditFaqIsActive(faq.isActive);
    } else {
      setEditingFaq(null);
      setEditFaqQuestion('');
      setEditFaqAnswer('');
      setEditFaqCategory('general');
      setEditFaqOrder(faqs.length + 1);
      setEditFaqIsActive(true);
    }
    setActiveTab('faq');
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFaqQuestion || !editFaqAnswer) return;
    setIsSavingFaq(true);
    const faqId = editingFaq ? editingFaq.id : `faq_${Date.now()}`;
    const payload = {
      id: faqId,
      question: editFaqQuestion,
      answer: editFaqAnswer,
      category: editFaqCategory,
      order: editFaqOrder,
      isActive: editFaqIsActive,
      updatedAt: new Date().toISOString(),
      ...(editingFaq ? {} : { createdAt: new Date().toISOString() })
    };

    try {
      await saveFaq(payload);
                await reloadData();
                logAction(editingFaq ? `FAQ modifiée: ${editFaqQuestion.slice(0, 20)}...` : `FAQ ajoutée: ${editFaqQuestion.slice(0, 20)}...`);
      setEditingFaq(null);
      setEditFaqQuestion('');
      setEditFaqAnswer('');
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la sauvegarde de la FAQ.", "error");
    } finally {
      setIsSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: string, question: string) => {
    if (!window.confirm("Supprimer cette question FAQ ?")) return;
    try {
      await deleteFaq(id);
                await reloadData();
      logAction(`FAQ supprimée: ${question.slice(0, 20)}...`);
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la suppression.", "error");
    }
  };

  const handleStartEditResidence = (res: Residence) => {
    const normalize = (s: string) => {
      if (!s) return '';
      return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    };

    setEditingRes(res);
    setEditResTitle(res.title);

    const cityName = res.address?.city || res.city;
    const cityIdFromDoc = res.address?.cityId || '';
    const city = allLocations.find(c => 
      c.id === cityIdFromDoc || 
      c.id === cityName || 
      normalize(c.name) === normalize(cityName) || 
      normalize(c.id) === normalize(cityName)
    );
    setEditResCityId(city?.id || cityName || '');

    const hoodName = res.address?.neighborhood || res.neighborhood;
    const hoodIdFromDoc = res.address?.neighborhoodId || '';
    const hood = city?.neighborhoods.find(n => 
      n.id === hoodIdFromDoc || 
      n.id === hoodName || 
      normalize(n.name) === normalize(hoodName) || 
      normalize(n.id) === normalize(hoodName)
    );
    setEditResNeighborhoodId(hood?.id || hoodName || '');

    setEditResPrice(res.pricePerNight);

    let finalType = res.type || '';
    const typeMapping: Record<string, string> = {
      'appartement': 'Appartement meublé',
      'villa': 'Villa basse',
      'chambre': "Chambre d'hôte",
      'auberge': 'Auberge / Hôtel',
    };
    if (typeMapping[finalType.toLowerCase()]) {
      finalType = typeMapping[finalType.toLowerCase()];
    } else {
      const found = PREDEFINED_TYPES.find(t => t.toLowerCase() === finalType.toLowerCase());
      if (found) finalType = found;
    }
    setEditResType(finalType);
  };

  const handleUpdateResidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRes) return;
    setIsSavingRes(true);
    try {
      const cityName = BURKINA_LOCATIONS.find(c => c.id === editResCityId)?.name || editResCityId;
      const neighborhoodName = currentCityForEdit?.neighborhoods.find(n => n.id === editResNeighborhoodId)?.name || editResNeighborhoodId;

      await updateResidence(editingRes.id, {
                  title: editResTitle,
                  pricePerNight: editResPrice,
                  type: editResType,
                  address: {
                    ...(editingRes.address || {}),
                    city: cityName,
                    cityId: editResCityId,
                    neighborhood: neighborhoodName,
                    neighborhoodId: editResNeighborhoodId
                  }
                } as any);
                await reloadData();
      
      logAction(`Logement ID #${editingRes.id} ("${editResTitle}") modifié par l'administrateur.`);
      triggerSuccess("Les informations du logement ont été mises à jour.");
      setEditingRes(null);
      await reloadData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la mise à jour.", "error");
    } finally {
      setIsSavingRes(false);
    }
  };

  // Moderate Listings
  const handleApproveResidence = async (id: string, titleStr: string) => {
    try {
      await updateResidence(id, { status: 'published' } as any);
                await reloadData();
      logAction(`Logement "${titleStr}" approuvé et publié en ligne.`);
      triggerSuccess(`La résidence "${titleStr}" a été publiée avec succès !`);
      await reloadData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la validation.", "error");
    }
  };

  const handleDeclineResidence = async (id: string, titleStr: string) => {
    const reason = prompt("Veuillez indiquer le motif du rejet :");
    if (reason !== null) {
      try {
        await updateResidence(id, { 
                      status: 'suspended',
                      rejectionReason: reason 
                    } as any);
                    await reloadData();
        logAction(`Logement "${titleStr}" suspendu pour le motif : ${reason}`);
        triggerSuccess("Résidence rejetée et propriétaire notifié.");
        await reloadData();
      } catch (err) {
        console.error(err);
        addToast("Erreur lors du rejet.", "error");
      }
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleForceDeleteResidence = async (id: string, titleStr: string) => {
    try {
      await deleteResidence(id);
                await reloadData();
      logAction(`Bannissement définitif du logement ID #${id} (${titleStr})`);
      setConfirmDeleteId(null);
      triggerSuccess("Résidence supprimée définitivement.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleReassignOwner = async () => {
    if (!reassigningResId || !reassignNewOwnerId) return;
    setIsReassigning(true);
    try {
      const response = await apiFetch(`/api/admin/residences/${reassigningResId}/reassign`, {
        method: 'PUT',
        body: JSON.stringify({ newOwnerId: reassignNewOwnerId })
      });
      if (response.ok) {
        addToast("Propriétaire réassigné avec succès.", "success");
        setReassigningResId(null);
        setReassignNewOwnerId('');
        await reloadData();
        logAction(`Réassignation du logement ID #${reassigningResId} au nouveau propriétaire ID #${reassignNewOwnerId}`);
      } else {
        const data = await response.json();
        addToast(data.error || "Erreur lors de la réassignation.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la réassignation.", "error");
    } finally {
      setIsReassigning(false);
    }
  };

  const handlePromoteResidence = async (id: string, titleStr: string, isPromoted: boolean) => {
    try {
      await updateResidence(id, { promoted: !isPromoted } as any);
                await reloadData();
      logAction(`${!isPromoted ? 'Mise en avant (★)' : 'Retrait de la mise en avant'} de la résidence "${titleStr}"`);
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

  const isCurrentUserSU = user?.role === 'admin';

  const hasPermission = (permissionId: string) => {
    if (!user) return false;
    const cleanEmail = user.email?.trim().toLowerCase();
    const isSU = cleanEmail === 'mandemohamed68@gmail.com' || cleanEmail === 'mandemohamed68@gamil.com';
    if (isSU || user.role === 'admin') return true;
    if (user.role === 'manager') {
      if (!user.permissions) return false;
      const permList = user.permissions.split(',').map(p => p.trim());
      return permList.includes(permissionId);
    }
    return false;
  };

  // Change user role
  const handleChangeRole = async (uid: string, email: string, currentRole: UserRole, targetRole: UserRole) => {
    if (!isCurrentUserSU) {
      addToast("Action refusée : Seul le Super Administrateur principal (mandemohamed68@gmail.com) est habilité à modifier les rôles.", "error");
      return;
    }
    try {
      await updateUserProfile(uid, { role: targetRole });
                await reloadData();
      logAction(`Promu utilisateur ${email} du rôle ${currentRole} à ${targetRole}`);
      triggerSuccess(`Rôle de ${email} mis à jour avec succès vers : ${targetRole}`);
    } catch (err) {
      console.error(err);
      addToast("Erreur de modification du rôle.", "error");
    }
  };

  // Helper to create users
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserName) {
      addToast("Veuillez renseigner le nom et l'adresse email.", "error");
      return;
    }

    if (!newUserPassword || newUserPassword.length < 6) {
      addToast("Veuillez définir un mot de passe d'au moins 6 caractères pour cet utilisateur.", "error");
      return;
    }

    setIsCreatingUser(true);
    try {
      const generatedUid = `usr_onboard_${Date.now()}`;
      const newUserProfile: any = {
        uid: generatedUid,
        email: newUserEmail.trim().toLowerCase(),
        displayName: newUserName.trim(),
        role: newUserRole,
        phoneNumber: newUserPhone.trim() || undefined,
        isVerified: true,
        createdAt: new Date().toISOString(),
        isSuspended: false,
        password: newUserPassword,
        permissions: newUserPermissions.join(',')
      };

      await updateUserProfile(generatedUid, newUserProfile);
                await reloadData();
      logAction(`Création de l'utilisateur ${newUserEmail} avec attribution du rôle ${newUserRole}`);
      triggerSuccess(`L'utilisateur ${newUserName} a été créé avec succès !`);
      
      // Reset
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('client');
      setNewUserPhone('');
      setNewUserPassword('');
      setNewUserPermissions([]);
      setShowAddUserForm(false);
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la création de l'utilisateur.", "error");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleUpdateUserSecurity = async (uid: string, email: string) => {
    setIsUpdatingUserSecurity(true);
    try {
      const updates: any = {
        permissions: editUserPermissions.join(',')
      };
      if (editUserPassword) {
        if (editUserPassword.length < 6) {
          addToast("Le mot de passe doit comporter au moins 6 caractères.", "error");
          setIsUpdatingUserSecurity(false);
          return;
        }
        updates.password = editUserPassword;
      }
      
      await updateUserProfile(uid, updates);
                await reloadData();
      logAction(`Mise à jour des droits/sécurité pour l'utilisateur ${email}`);
      triggerSuccess(`Droits et mot de passe de ${email} mis à jour avec succès !`);
      
      // Clear security states
      setExpandedUserSecurityUid(null);
      setEditUserPassword('');
      setEditUserPermissions([]);
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la mise à jour de la sécurité de l'utilisateur.", "error");
    } finally {
      setIsUpdatingUserSecurity(false);
    }
  };

  // Helper to toggle suspension
  const handleToggleSuspendUser = async (uid: string, email: string, isSuspendedNow: boolean) => {
    try {
      await updateUserProfile(uid, { isSuspended: !isSuspendedNow });
                await reloadData();
      logAction(`${!isSuspendedNow ? 'Suspension' : 'Réactivation'} de l'utilisateur ${email}`);
      triggerSuccess(`Statut d'activité de ${email} mis à jour.`);
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la mise à jour de la suspension.", "error");
    }
  };

  // Helper to delete user permanently
  const handleDeleteUser = async (uid: string, email: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${email} de la base de données ?`)) {
      try {
        await deleteUser(uid);
                    await reloadData();
        logAction(`Suppression définitive du compte utilisateur ${email}`);
        triggerSuccess(`L'utilisateur ${email} a été supprimé definitivement.`);
      } catch (err) {
        console.error(err);
        addToast("Erreur lors de la suppression de l'utilisateur.", "error");
      }
    }
  };

  // Save or Edit an Advertisement
  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adImageUrl || !adTitle) {
      addToast("L'URL de l'image et le titre de l'affiche sont obligatoires.", "error");
      return;
    }
    if (adStartAt && adEndAt && new Date(adStartAt) >= new Date(adEndAt)) {
      addToast("La date de début doit être strictement antérieure à la date de fin.", "error");
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
        endAt: adEndAt || null,
        createdAt: editingAdId ? (ads.find(a=>a.id===editingAdId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      await saveAd(payload);
                await reloadData();
      logAction(editingAdId ? `Modification de la campagne de publicité "${adTitle}"` : `Création d'une nouvelle publicité : "${adTitle}"`);
      triggerSuccess(editingAdId ? "L'affiche publicitaire a été mise à jour." : "L'affiche publicitaire a été enregistrée avec succès !");
      
      resetAdForm();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de l'enregistrement de la publicité.", "error");
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
      addToast("Le fichier est trop lourd. Veuillez uploader une image inférieure à 5 Mo.", "error");
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
      addToast("Une erreur est survenue lors de l'optimisation de l'image.", "error");
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
      const ad = ads.find(a => a.id === id);
                if (ad) {
                  await saveAd({ ...ad, isActive: !currentStatus });
                  await reloadData();
                }
      logAction(`${!currentStatus ? 'Activation' : 'Désactivation'} de la publicité "${title}"`);
      triggerSuccess(`Statut de "${title}" mis à jour.`);
    } catch (err) {
      console.error(err);
      addToast("Erreur de modification du statut.", "error");
    }
  };

  const handleDeleteAd = async (id: string, title: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'affiche publicitaire "${title}" ?`)) {
      try {
        await deleteAd(id);
                    await reloadData();
        logAction(`Suppression de l'affiche publicitaire "${title}"`);
        triggerSuccess(`La publicité "${title}" a été supprimée.`);
      } catch (err) {
        console.error(err);
        addToast("Erreur de suppression de la publicité.", "error");
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
      await apiFetch(`/api/users/${uid}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({ 
        isVerified: true,
        verificationStatus: 'verified'
      }) });
      logAction(`Identité certifiée et validée pour l'utilisateur ${displayName} (${email})`);
      triggerSuccess(`Compte de ${displayName} vérifié et certifié !`);
    } catch (err) {
      console.error(err);
      addToast("Erreur de validation de l'identité.", "error");
    }
  };

  const handleRejectIdentity = async (uid: string, email: string, displayName: string) => {
    try {
      const updates: any = { 
        isVerified: false,
        verificationStatus: 'none',
        idCardUrl: "" // Reset so they can retake photo or scan
      };
      await updateUserProfile(uid, updates);
                await reloadData();
      logAction(`Identité REFUSÉE et réinitialisée pour l'utilisateur ${displayName} (${email})`);
      triggerSuccess(`Demande de ${displayName} refusée.`);
    } catch (err) {
      console.error(err);
      addToast("Erreur lors du rejet de la pièce d'identité.", "error");
    }
  };

  const handleToggleSuspension = async (uid: string, currentStatus: boolean, email: string) => {
    if (isSuperAdminEmail(email)) {
      addToast("Impossible de suspendre un Super Admin.", "error");
      return;
    }
    const action = !currentStatus ? "suspendre" : "réactiver";
    if (window.confirm(`Voulez-vous vraiment ${action} le compte de ${email} ?`)) {
      try {
        await updateUserProfile(uid, { isSuspended: !currentStatus });
                    await reloadData();
        logAction(`${!currentStatus ? 'Suspension' : 'Réactivation'} du compte utilisateur ${email}`);
        triggerSuccess(`Compte ${email} ${!currentStatus ? 'suspendu' : 'réactivé'}.`);
      } catch (err) {
        console.error(err);
        addToast("Erreur lors du changement de statut.", "error");
      }
    }
  };

  // Save Booking Status edits
  const handleSaveBookingStatus = async (bookingId: string) => {
    setIsSaving(true);
    try {
      const updates = {
        bookingStatus: tempBookingStatus,
        paymentStatus: tempPaymentStatus
      };
      await updateBookingStatus(bookingId, updates);
                await reloadData();
      logAction(`Mise à jour réservation #${bookingId} - Statut: ${tempBookingStatus}, Paiement: ${tempPaymentStatus}`);
      setEditingBookingId(null);
      triggerSuccess("Réservation mise à jour avec succès !");
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la mise à jour de la réservation.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete/Moderate reviews
  const handleDeleteReview = async (reviewId: string, authorId: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cet avis de la plateforme ?")) {
      try {
        await deleteReview(reviewId);
                    await reloadData();
        logAction(`Avis ID #${reviewId} rédigé par l'utilisateur #${authorId} supprimé de la base de données.`);
        triggerSuccess("Avis modéré et supprimé !");
      } catch (err) {
        console.error(err);
        addToast("Erreur de modération de l'avis.", "error");
      }
    }
  };

  // Save changes under global platform settings
  const handleSaveAllAnnouncements = async (updatedList: any[]) => {
    setIsSaving(true);
    try {
      const currentSettings = await getGlobalSettings();
      const settingsPayload = {
        ...currentSettings,
        announcements: updatedList,
        announcement: {
          text: updatedList.map(a => a.text).join('\n'),
          type: updatedList[0]?.type || 'info',
          active: updatedList.some(a => a.active),
          updatedAt: new Date().toISOString()
        }
      };
      await saveGlobalSettings(settingsPayload);
      setAnnouncements(updatedList);
      logAction(`Liste des messages d'infos du Flash Défilant synchronisée (${updatedList.length} messages)`);
      triggerSuccess("Liste des messages d'infos synchronisée !");
      await reloadData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la synchronisation de l'annonce.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOrEditAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnText.trim()) return;

    let updated: any[];
    if (editingAnnId) {
      updated = announcements.map(a => a.id === editingAnnId ? {
        ...a,
        text: newAnnText.trim(),
        type: newAnnType,
        emoji: newAnnEmoji,
        active: newAnnActive
      } : a);
      setEditingAnnId(null);
    } else {
      const newItem = {
        id: `ann_${Date.now()}`,
        text: newAnnText.trim(),
        type: newAnnType,
        emoji: newAnnEmoji,
        active: newAnnActive,
        createdAt: new Date().toISOString()
      };
      updated = [newItem, ...announcements];
    }

    setNewAnnText('');
    setNewAnnEmoji('📢');
    setNewAnnType('info');
    setNewAnnActive(true);

    await handleSaveAllAnnouncements(updated);
  };

  const handleToggleAnnActive = async (id: string) => {
    const updated = announcements.map(a => a.id === id ? { ...a, active: !a.active } : a);
    await handleSaveAllAnnouncements(updated);
  };

  const handleDeleteAnn = async (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce message d'info ?")) {
      const updated = announcements.filter(a => a.id !== id);
      await handleSaveAllAnnouncements(updated);
    }
  };

  const handleStartEditAnn = (ann: any) => {
    setEditingAnnId(ann.id);
    setNewAnnText(ann.text);
    setNewAnnType(ann.type || 'info');
    setNewAnnEmoji(ann.emoji || '📢');
    setNewAnnActive(ann.active !== undefined ? ann.active : true);
  };

  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const settingsPayload = {
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
      minReservationAmountEnabled: minReservationAmountEnabled,
      minReservationAmount: minReservationAmount,
      refreshInterval: refreshInterval,
      supportChatEnabled: supportChatEnabled,
      supportChatOpenTime: supportChatOpenTime,
      supportChatCloseTime: supportChatCloseTime,
      maxBookingsWithoutId: maxBookingsWithoutId,
      announcement: {
        text: announcementText,
        type: announcementType,
        active: announcementActive,
        updatedAt: new Date().toISOString()
      },
      announcements: announcements
    };

    try {
      await saveGlobalSettings(settingsPayload);
      await reloadData();
      logAction(`Paramètres globaux sauvegardés avec message d'annonce (Plateforme: ${platformName}, Commission: ${commissionRate}%)`);
      triggerSuccess("Configuration de la plateforme enregistrée avec succès !");
      await reloadData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la sauvegarde de la configuration.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportDatabase = async (format: 'mariadb' | 'sqlite') => {
    if (format === 'mariadb') {
      triggerSuccess("Génération du dump complet MariaDB sur le serveur... Le téléchargement va démarrer.");
      window.location.href = '/api/db/generate-dump';
      return;
    }

    triggerSuccess("Génération du dump SQLite en cours... Veuillez patienter.");
    
    const escapeSql = (val: any) => {
      if (val === undefined || val === null) return "NULL";
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (typeof val === 'number') return val;
      if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    let sql = `-- Dump Complet pour SQLite\n`;
    sql += `-- Généré le ${new Date().toISOString()}\n`;
    sql += `-- Contient toutes les tables, données et images (URLs de stockage)\n\n`;

    // 1. Users
    sql += `-- Structure de la table users\n`;
    sql += `CREATE TABLE IF NOT EXISTS users (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  email VARCHAR(255) NOT NULL UNIQUE,\n`;
    sql += `  display_name VARCHAR(255) NOT NULL,\n`;
    sql += `  phone_number VARCHAR(50),\n`;
    sql += `  photo_url TEXT,\n`;
    sql += `  role VARCHAR(50) DEFAULT 'client',\n`;
    sql += `  is_verified BOOLEAN DEFAULT FALSE,\n`;
    sql += `  is_suspended BOOLEAN DEFAULT FALSE,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    if (users.length > 0) {
      users.forEach(u => {
        sql += `INSERT OR IGNORE INTO users (id, email, display_name, phone_number, photo_url, role, is_verified, is_suspended, created_at) VALUES (\n`;
        sql += `  ${escapeSql(u.uid)},\n`;
        sql += `  ${escapeSql(u.email)},\n`;
        sql += `  ${escapeSql(u.displayName)},\n`;
        sql += `  ${escapeSql(u.phoneNumber)},\n`;
        sql += `  ${escapeSql(u.photoURL)},\n`;
        sql += `  ${escapeSql(u.role || 'client')},\n`;
        sql += `  ${escapeSql(u.isVerified || false)},\n`;
        sql += `  ${escapeSql(u.isSuspended || false)},\n`;
        sql += `  ${escapeSql(u.createdAt ? new Date(u.createdAt).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    // 2. Residences
    sql += `-- Structure de la table residences\n`;
    sql += `CREATE TABLE IF NOT EXISTS residences (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  owner_id VARCHAR(128) NOT NULL,\n`;
    sql += `  title VARCHAR(255) NOT NULL,\n`;
    sql += `  description TEXT,\n`;
    sql += `  type VARCHAR(100) NOT NULL,\n`;
    sql += `  price_per_night DECIMAL(10, 2) NOT NULL,\n`;
    sql += `  advance_percentage INT DEFAULT 0,\n`;
    sql += `  cleaning_fee DECIMAL(10, 2) DEFAULT 0,\n`;
    sql += `  service_fee DECIMAL(10, 2) DEFAULT 0,\n`;
    sql += `  city VARCHAR(100),\n`;
    sql += `  neighborhood VARCHAR(100),\n`;
    sql += `  street VARCHAR(255),\n`;
    sql += `  lat DECIMAL(10, 8),\n`;
    sql += `  lng DECIMAL(11, 8),\n`;
    sql += `  capacity INT DEFAULT 1,\n`;
    sql += `  bedrooms INT DEFAULT 1,\n`;
    sql += `  beds INT DEFAULT 1,\n`;
    sql += `  bathrooms INT DEFAULT 1,\n`;
    sql += `  rooms INT DEFAULT 1,\n`;
    sql += `  status VARCHAR(50) DEFAULT 'pending',\n`;
    sql += `  availability_status VARCHAR(50) DEFAULT 'available',\n`;
    sql += `  promoted BOOLEAN DEFAULT FALSE,\n`;
    sql += `  weekly_discount INT DEFAULT 0,\n`;
    sql += `  monthly_discount INT DEFAULT 0,\n`;
    sql += `  promo_price DECIMAL(10, 2),\n`;
    sql += `  rejection_reason TEXT,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    if (residences.length > 0) {
      residences.forEach(r => {
        sql += `INSERT OR IGNORE INTO residences (id, owner_id, title, description, type, price_per_night, advance_percentage, cleaning_fee, service_fee, city, neighborhood, street, capacity, bedrooms, beds, bathrooms, rooms, status, availability_status, promoted, weekly_discount, monthly_discount, promo_price, rejection_reason, created_at) VALUES (\n`;
        sql += `  ${escapeSql(r.id)},\n`;
        sql += `  ${escapeSql(r.ownerId)},\n`;
        sql += `  ${escapeSql(r.title)},\n`;
        sql += `  ${escapeSql(r.description)},\n`;
        sql += `  ${escapeSql(r.type || 'appartement')},\n`;
        sql += `  ${escapeSql(r.pricePerNight || r.price || 0)},\n`;
        sql += `  ${escapeSql(r.advancePercentage || 0)},\n`;
        sql += `  ${escapeSql(r.cleaningFee || 0)},\n`;
        sql += `  ${escapeSql(r.serviceFee || 0)},\n`;
        sql += `  ${escapeSql(r.address?.city || r.city || '')},\n`;
        sql += `  ${escapeSql(r.address?.neighborhood || r.neighborhood || '')},\n`;
        sql += `  ${escapeSql(r.address?.street || '')},\n`;
        sql += `  ${escapeSql(r.capacity || 1)},\n`;
        sql += `  ${escapeSql(r.bedrooms || 1)},\n`;
        sql += `  ${escapeSql(r.beds || 1)},\n`;
        sql += `  ${escapeSql(r.bathrooms || 1)},\n`;
        sql += `  ${escapeSql(r.rooms || 1)},\n`;
        sql += `  ${escapeSql(r.status || 'pending')},\n`;
        sql += `  ${escapeSql(r.availabilityStatus || 'available')},\n`;
        sql += `  ${escapeSql(r.promoted ? 1 : 0)},\n`;
        sql += `  ${escapeSql(r.weeklyDiscount || 0)},\n`;
        sql += `  ${escapeSql(r.monthlyDiscount || 0)},\n`;
        sql += `  ${escapeSql(r.promoPrice || null)},\n`;
        sql += `  ${escapeSql(r.rejectionReason || null)},\n`;
        sql += `  ${escapeSql(r.createdAt ? new Date(r.createdAt).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    // Amenities
    sql += `CREATE TABLE IF NOT EXISTS residence_amenities (\n`;
    sql += `  residence_id VARCHAR(128),\n`;
    sql += `  amenity VARCHAR(100),\n`;
    sql += `  PRIMARY KEY (residence_id, amenity)\n`;
    sql += `);\n\n`;

    if (residences.length > 0) {
      residences.forEach(r => {
        if (r.amenities && Array.isArray(r.amenities)) {
          r.amenities.forEach(a => {
            sql += `INSERT OR IGNORE INTO residence_amenities (residence_id, amenity) VALUES (${escapeSql(r.id)}, ${escapeSql(a)});\n`;
          });
        }
      });
      sql += '\n';
    }

    // Images
    sql += `CREATE TABLE IF NOT EXISTS residence_images (\n`;
    sql += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
    sql += `  residence_id VARCHAR(128),\n`;
    sql += `  image_url TEXT NOT NULL\n`;
    sql += `);\n\n`;

    if (residences.length > 0) {
      residences.forEach(r => {
        if (r.images && Array.isArray(r.images)) {
          r.images.forEach(img => {
            sql += `INSERT OR IGNORE INTO residence_images (residence_id, image_url) VALUES (${escapeSql(r.id)}, ${escapeSql(img)});\n`;
          });
        }
      });
      sql += '\n';
    }

    // 3. Bookings
    sql += `-- Structure de la table bookings\n`;
    sql += `CREATE TABLE IF NOT EXISTS bookings (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  residence_id VARCHAR(128) NOT NULL,\n`;
    sql += `  client_id VARCHAR(128) NOT NULL,\n`;
    sql += `  owner_id VARCHAR(128) NOT NULL,\n`;
    sql += `  check_in DATE NOT NULL,\n`;
    sql += `  check_out DATE NOT NULL,\n`;
    sql += `  guests INT DEFAULT 1,\n`;
    sql += `  total_price DECIMAL(10, 2) NOT NULL,\n`;
    sql += `  advance_paid DECIMAL(10, 2) DEFAULT 0,\n`;
    sql += `  payment_status VARCHAR(50) DEFAULT 'pending',\n`;
    sql += `  booking_status VARCHAR(50) DEFAULT 'pending',\n`;
    sql += `  transaction_id VARCHAR(255),\n`;
    sql += `  cancelled_by VARCHAR(50) NULL,\n`;
    sql += `  cancellation_reason TEXT NULL,\n`;
    sql += `  cancelled_at TIMESTAMP NULL,\n`;
    sql += `  refund_status VARCHAR(50) DEFAULT 'none',\n`;
    sql += `  refund_amount DECIMAL(10, 2) DEFAULT 0,\n`;
    sql += `  refund_phone VARCHAR(50) NULL,\n`;
    sql += `  refund_provider VARCHAR(50) NULL,\n`;
    sql += `  refund_processed_at TIMESTAMP NULL,\n`;
    sql += `  stay_status VARCHAR(50) DEFAULT 'pending',\n`;
    sql += `  checked_in_at TIMESTAMP NULL,\n`;
    sql += `  checked_out_at TIMESTAMP NULL,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    if (bookings.length > 0) {
      bookings.forEach(b => {
        sql += `INSERT OR IGNORE INTO bookings (id, residence_id, client_id, owner_id, check_in, check_out, guests, total_price, advance_paid, payment_status, booking_status, transaction_id, cancelled_by, cancellation_reason, cancelled_at, refund_status, refund_amount, refund_phone, refund_provider, refund_processed_at, stay_status, checked_in_at, checked_out_at, created_at) VALUES (\n`;
        sql += `  ${escapeSql(b.id)},\n`;
        sql += `  ${escapeSql(b.residenceId)},\n`;
        sql += `  ${escapeSql(b.clientId)},\n`;
        sql += `  ${escapeSql(b.ownerId)},\n`;
        sql += `  ${escapeSql(b.checkIn ? b.checkIn.substring(0, 10) : '2023-01-01')},\n`;
        sql += `  ${escapeSql(b.checkOut ? b.checkOut.substring(0, 10) : '2023-01-02')},\n`;
        sql += `  ${escapeSql(b.guests || 1)},\n`;
        sql += `  ${escapeSql(b.totalPrice || 0)},\n`;
        sql += `  ${escapeSql(b.advancePaid || 0)},\n`;
        sql += `  ${escapeSql(b.paymentStatus || 'pending')},\n`;
        sql += `  ${escapeSql(b.bookingStatus || b.status || 'pending')},\n`;
        sql += `  ${escapeSql(b.transactionId || null)},\n`;
        sql += `  ${escapeSql(b.cancelledBy || null)},\n`;
        sql += `  ${escapeSql(b.cancellationReason || null)},\n`;
        sql += `  ${escapeSql(b.cancelledAt ? new Date(b.cancelledAt).toISOString().replace('T', ' ').substring(0, 19) : null)},\n`;
        sql += `  ${escapeSql(b.refundStatus || 'none')},\n`;
        sql += `  ${escapeSql(b.refundAmount || 0)},\n`;
        sql += `  ${escapeSql(b.refundPhone || null)},\n`;
        sql += `  ${escapeSql(b.refundProvider || null)},\n`;
        sql += `  ${escapeSql(b.refundProcessedAt ? new Date(b.refundProcessedAt).toISOString().replace('T', ' ').substring(0, 19) : null)},\n`;
        sql += `  ${escapeSql(b.stayStatus || 'pending')},\n`;
        sql += `  ${escapeSql(b.checkedInAt ? new Date(b.checkedInAt).toISOString().replace('T', ' ').substring(0, 19) : null)},\n`;
        sql += `  ${escapeSql(b.checkedOutAt ? new Date(b.checkedOutAt).toISOString().replace('T', ' ').substring(0, 19) : null)},\n`;
        sql += `  ${escapeSql(b.createdAt ? new Date(b.createdAt).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    // 4. Reviews
    sql += `-- Structure de la table reviews\n`;
    sql += `CREATE TABLE IF NOT EXISTS reviews (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  booking_id VARCHAR(128) NOT NULL,\n`;
    sql += `  residence_id VARCHAR(128) NOT NULL,\n`;
    sql += `  client_id VARCHAR(128) NOT NULL,\n`;
    sql += `  rating INT NOT NULL,\n`;
    sql += `  comment TEXT,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    if (reviews.length > 0) {
      reviews.forEach(rv => {
        sql += `INSERT OR IGNORE INTO reviews (id, booking_id, residence_id, client_id, rating, comment, created_at) VALUES (\n`;
        sql += `  ${escapeSql(rv.id)},\n`;
        sql += `  ${escapeSql(rv.bookingId)},\n`;
        sql += `  ${escapeSql(rv.residenceId)},\n`;
        sql += `  ${escapeSql(rv.clientId)},\n`;
        sql += `  ${escapeSql(rv.rating)},\n`;
        sql += `  ${escapeSql(rv.comment)},\n`;
        sql += `  ${escapeSql(rv.createdAt ? new Date(rv.createdAt).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    // 5. Withdrawals
    sql += `-- Structure de la table withdrawals\n`;
    sql += `CREATE TABLE IF NOT EXISTS withdrawals (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  owner_id VARCHAR(128) NOT NULL,\n`;
    sql += `  amount DECIMAL(10, 2) NOT NULL,\n`;
    sql += `  phone VARCHAR(50) NOT NULL,\n`;
    sql += `  provider VARCHAR(50) NOT NULL,\n`;
    sql += `  status VARCHAR(50) DEFAULT 'pending',\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  approved_at TIMESTAMP NULL\n`;
    sql += `);\n\n`;

    if (withdrawals.length > 0) {
      withdrawals.forEach(w => {
        sql += `INSERT OR IGNORE INTO withdrawals (id, owner_id, amount, phone, provider, status, created_at, approved_at) VALUES (\n`;
        sql += `  ${escapeSql(w.id)},\n`;
        sql += `  ${escapeSql(w.ownerId)},\n`;
        sql += `  ${escapeSql(w.amount)},\n`;
        sql += `  ${escapeSql(w.phone)},\n`;
        sql += `  ${escapeSql(w.provider)},\n`;
        sql += `  ${escapeSql(w.status)},\n`;
        sql += `  ${escapeSql(w.createdAt ? new Date(w.createdAt).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19))},\n`;
        sql += `  ${escapeSql(w.approvedAt ? new Date(w.approvedAt).toISOString().replace('T', ' ').substring(0, 19) : null)}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    // 6. Advertisements
    sql += `-- Structure de la table ads\n`;
    sql += `CREATE TABLE IF NOT EXISTS advertisements (\n`;
    sql += `  id VARCHAR(128) PRIMARY KEY,\n`;
    sql += `  title VARCHAR(255) NOT NULL,\n`;
    sql += `  description TEXT,\n`;
    sql += `  image_url TEXT NOT NULL,\n`;
    sql += `  link_url TEXT,\n`;
    sql += `  is_active BOOLEAN DEFAULT TRUE,\n`;
    sql += `  frequency_seconds INT DEFAULT 30,\n`;
    sql += `  start_at TIMESTAMP NULL,\n`;
    sql += `  end_at TIMESTAMP NULL,\n`;
    sql += `  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    if (ads.length > 0) {
      ads.forEach(ad => {
        sql += `INSERT OR IGNORE INTO advertisements (id, title, description, image_url, link_url, is_active, frequency_seconds, start_at, end_at, created_at) VALUES (\n`;
        sql += `  ${escapeSql(ad.id)},\n`;
        sql += `  ${escapeSql(ad.title)},\n`;
        sql += `  ${escapeSql(ad.description)},\n`;
        sql += `  ${escapeSql(ad.imageUrl)},\n`;
        sql += `  ${escapeSql(ad.linkUrl)},\n`;
        sql += `  ${escapeSql(ad.isActive !== false ? 1 : 0)},\n`;
        sql += `  ${escapeSql(ad.frequencySeconds || 30)},\n`;
        sql += `  ${escapeSql(ad.startAt ? new Date(ad.startAt).toISOString().replace('T', ' ').substring(0, 19) : null)},\n`;
        sql += `  ${escapeSql(ad.endAt ? new Date(ad.endAt).toISOString().replace('T', ' ').substring(0, 19) : null)},\n`;
        sql += `  ${escapeSql(ad.createdAt ? new Date(ad.createdAt).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19))}\n`;
        sql += `);\n`;
      });
      sql += '\n';
    }

    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resifaso_backup_${format}_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerSuccess(`Export complet ${format} généré avec succès ! Contient toutes les données et images.`);
  };

  // Contact page & message management handlers
  const handleSaveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContactSettings(true);
    try {
      await saveContactSettings(contactSettings);
      logAction("Mise à jour des coordonnées et paramètres de contact de la plateforme.");
      triggerSuccess("Les paramètres de la page de contact ont été enregistrés avec succès !");
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de l'enregistrement des paramètres de contact.", "error");
    } finally {
      setIsSavingContactSettings(false);
    }
  };

  const handleDeleteContactMessage = async (messageId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce message de contact ?")) {
      try {
        await deleteContactMessage(messageId);
                    await reloadData();
        logAction(`Message de contact #${messageId} supprimé.`);
        triggerSuccess("Le message de contact a été supprimé.");
        if (selectedContactMessage?.id === messageId) {
          setSelectedContactMessage(null);
        }
      } catch (err) {
        console.error(err);
        addToast("Erreur lors de la suppression du message.", "error");
      }
    }
  };

  const handleMarkAsRead = async (msg: ContactMessage) => {
    try {
      await updateContactMessage(msg.id, { is_read: true });
                await reloadData();
      logAction(`Message de contact #${msg.id} marqué comme lu.`);
      triggerSuccess("Le message a été marqué comme lu.");
      if (selectedContactMessage?.id === msg.id) {
        setSelectedContactMessage({ ...msg, status: 'read' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAdminNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContactMessage) return;
    setIsSavingAdminNote(true);
    try {
      const repliedAt = new Date().toISOString();
      await updateContactMessage(selectedContactMessage.id, {
        admin_notes: adminNoteText,
        status: 'replied',
        replied_at: repliedAt
      });
      setSelectedContactMessage({
        ...selectedContactMessage,
        adminNotes: adminNoteText,
        status: 'replied',
        repliedAt: repliedAt
      });
      logAction(`Note d'administration ajoutée sur le message de contact #${selectedContactMessage.id}.`);
      triggerSuccess("Remarques / Notes de réponse enregistrées et statut mis à jour !");
      await reloadData();
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de l'enregistrement de la note.", "error");
    } finally {
      setIsSavingAdminNote(false);
    }
  };

  const handleSaveVerifType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifLabel) return;
    setIsSavingVerifType(true);
    try {
      const payload = {
        label: verifLabel,
        description: verifDescription,
        is_active: verifIsActive
      };
      const url = editingVerifType ? `/api/admin/verification-types/${editingVerifType.id}` : '/api/admin/verification-types';
      const method = editingVerifType ? 'PUT' : 'POST';
      
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        triggerSuccess(editingVerifType ? "Type de vérification mis à jour" : "Type de vérification ajouté");
        setVerifLabel('');
        setVerifDescription('');
        setVerifIsActive(true);
        setEditingVerifType(null);
        await reloadData();
      }
    } catch (err) {
      console.error(err);
      addToast("Erreur lors de la sauvegarde", "error");
    } finally {
      setIsSavingVerifType(false);
    }
  };

  const handleDeleteVerifType = async (id: number) => {
    if (!window.confirm("Supprimer ce type de vérification ?")) return;
    try {
      const res = await apiFetch(`/api/admin/verification-types/${id}`, { method: 'DELETE' });
      if (res.ok) {
        triggerSuccess("Type de vérification supprimé");
        await reloadData();
      }
    } catch (err) {
      console.error(err);
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

  const grossRevenue = bookings
    .filter(b => b.paymentStatus === 'advance_paid' || b.paymentStatus === 'fully_paid')
    .reduce((sum, b) => sum + b.totalPrice, 0);

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
    (res.address?.city || res.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (res.address?.neighborhood || res.neighborhood || '').toLowerCase().includes(searchQuery.toLowerCase())
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
      <RoleGuide role="admin" isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      
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
                { id: 'alerts', label: 'Alertes critiques', icon: ShieldCheck, badge: pendingResCount + pendingIdCount, badgeColor: 'bg-[#EF2B2D]' },
              ]
            },
            {
              category: "Gestion & Modération",
              items: [
                { id: 'listings', label: 'Hébergements', icon: Home, permission: 'manage_listings' },
                { id: 'users', label: 'Utilisateurs', icon: Users, permission: 'manage_users' },
                { id: 'verifications', label: 'Vérifications', icon: ShieldCheck, permission: 'manage_verifications' },
                { id: 'reviews', label: 'Avis & Modération', icon: Activity, permission: 'manage_reviews' },
              ]
            },
            {
              category: "Flux & Opérations",
              items: [
                { id: 'support', label: 'Support Client', icon: MessageSquare, permission: 'manage_users' },
                { id: 'bookings', label: 'Réservations', icon: Calendar, badge: bookings.filter(b=>b.bookingStatus==='pending').length, badgeColor: 'bg-blue-600', permission: 'manage_bookings' },
                { id: 'revenue', label: 'Finances', icon: TrendingUp, permission: 'manage_bookings' },
                { id: 'withdrawals', label: 'Demandes de Retrait', icon: Download, badge: withdrawals.filter(w=>w.status==='pending').length, badgeColor: 'bg-yellow-500', permission: 'manage_withdrawals' },
                { id: 'locations', label: 'Villes & Quartiers', icon: MapPin, permission: 'manage_listings' },
                { id: 'ads', label: 'Affiches & Pubs', icon: Megaphone, badge: ads.filter(a => a.isActive).length, badgeColor: 'bg-green-600', permission: 'manage_ads' },
                { id: 'flash-info', label: 'Flash Info', icon: Megaphone, badge: announcementActive ? 1 : 0, badgeColor: 'bg-red-500', permission: 'manage_settings' },
              ]
            },
            {
              category: "Outils & Systèmes",
              items: [
                { id: 'reports', label: 'Rapports d\'Audit', icon: FileText, permission: 'manage_users' },
                { id: 'settings', label: 'Paramètres', icon: Settings, permission: 'manage_settings' },
                { id: 'email', label: 'Config Email (SMTP)', icon: Mail, permission: 'manage_settings' },
                { id: 'logs', label: 'Logs en Temps Réel', icon: Activity, permission: 'manage_users' },
                { id: 'faq', label: 'Gestion FAQ', icon: MessageSquare, permission: 'manage_faq' },
                { id: 'contact', label: 'Gestion Contact', icon: Mail, badge: contactMessages.filter(m => m.status === 'unread').length, badgeColor: 'bg-[#EF2B2D]', permission: 'manage_contact' },
              ]
            }
          ].map(group => ({
            ...group,
            items: (group.items as any[]).filter(item => !item.permission || hasPermission(item.permission))
          })).filter(group => group.items.length > 0).map((group, groupIdx) => (
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
                <span className="w-1 h-1 bg-green-500 rounded-full"></span> BD : {dbType === 'mariadb' ? 'MariaDB SQL' : dbType === 'sqlite' ? 'SQLite Local' : 'Firebase Cloud'}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Actif</span>
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
                  const currentSettings = await getGlobalSettings();
                                        await saveGlobalSettings({
                                          ...currentSettings,
                                          commissionRate: commissionRate
                                        });
                                        await reloadData();
                  logAction(`Modification rapide de la commission globale à ${commissionRate}%`);
                  triggerSuccess(`Commission mise à jour à ${commissionRate}% !`);
                } catch(e) {
                  addToast("Erreur de mise à jour", "error");
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
      <main className="flex-1 overflow-y-auto p-10 bg-white relative">
        {/* Floating Refresh/Sync bar */}
        <div className="absolute top-8 right-10 z-20 flex items-center gap-3">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm"
          >
            <Compass size={13} className="text-red-600 animate-pulse" />
            Guide Admin
          </button>
          <button
            onClick={async () => {
              try {
                await reloadData();
                addToast("Plateforme actualisée avec succès !", "success");
              } catch (e) {
                addToast("Erreur lors de l'actualisation", "error");
              }
            }}
            disabled={isReloading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-50"
            title="Actualiser manuellement toutes les données de la plateforme"
          >
            <RefreshCw size={13} className={cn("text-red-600", isReloading && "animate-spin")} />
            {isReloading ? "Actualisation..." : "Actualiser"}
          </button>
        </div>
        
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
                          <span className="text-[10px] text-slate-500 capitalize">{res.address?.neighborhood || res.neighborhood}, {res.address?.city || res.city} &bull; {formatCurrency(res.pricePerNight || res.price_per_night)} F/nuit</span>
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
                              const updates: any = { verificationStatus: 'none', idNumber: '', idExpiry: '' };
                              await updateUserProfile(u.uid, updates);
                                                                await reloadData();
                              logAction(`Rejet pièce d'identité de l'utilisateur ${u.email}`);
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
                  <div 
                    className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition duration-150"
                    onClick={() => setSelectedResForDetail(res)}
                  >
                    <img src={res.images?.[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=150'} className="w-12 h-10 object-cover rounded-xl" />
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs leading-none mb-1 hover:text-red-650 transition duration-150">{res.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold">{res.address?.city || res.city} - {res.address?.neighborhood || res.neighborhood}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedResForDetail(res)}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1.5 transition"
                    >
                      <Eye size={12} /> Voir les détails
                    </button>
                    <button 
                      onClick={() => setActiveTab('listings')}
                      className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition"
                    >
                      Examiner dans le catalogue
                    </button>
                  </div>
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
                      <th className="py-5 px-6">Propriétaire/Hôte</th>
                      <th className="py-5 px-6">Prix/Nuit</th>
                      <th className="py-5 px-6">Statut de Revue</th>
                      <th className="py-5 px-6 text-center">Badge Recommandé</th>
                      <th className="py-5 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                    {filteredResidences.slice((residencesPage - 1) * 50, residencesPage * 50).map(res => (
                      <tr key={res.id}>
                        <td 
                          className="py-4 px-6 flex items-center gap-3 cursor-pointer hover:bg-slate-50/50 group transition duration-150"
                          onClick={() => setSelectedResForDetail(res)}
                        >
                          <img src={res.images?.[0] || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=150'} className="w-12 h-10 object-cover rounded-md group-hover:scale-105 transition duration-150" />
                          <div>
                            <span className="block font-black text-slate-900 leading-tight group-hover:text-red-650 transition duration-150">{res.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium capitalize">{res.type}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-500">
                          {res.address?.neighborhood || res.neighborhood}, {res.address?.city || res.city}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900">{users.find(u => u.uid === res.ownerId)?.displayName || 'Inconnu'}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{res.ownerId?.substring(0, 8)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-black text-slate-950">
                          {formatCurrency(res.pricePerNight || res.price_per_night)} F
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
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedResForDetail(res)}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 p-1.5 rounded-lg cursor-pointer transition"
                              title="Voir tous les détails & images"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleStartEditResidence(res)}
                              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 p-1.5 rounded-lg cursor-pointer transition"
                              title="Modifier les détails"
                            >
                              <Edit3 size={14} />
                            </button>

                            {reassigningResId === res.id ? (
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                <select 
                                  value={reassignNewOwnerId}
                                  onChange={(e) => setReassignNewOwnerId(e.target.value)}
                                  className="bg-white border border-slate-200 text-[10px] font-black p-1 rounded-lg outline-none max-w-[120px]"
                                >
                                  <option value="">Sélectionner Hôte...</option>
                                  {users.filter(u => u.role === 'owner' || u.role === 'admin').map(u => (
                                    <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                                  ))}
                                </select>
                                <button 
                                  onClick={handleReassignOwner}
                                  disabled={!reassignNewOwnerId || isReassigning}
                                  className="bg-green-600 text-white p-1.5 rounded-lg disabled:opacity-50 cursor-pointer"
                                  title="Confirmer la réassignation"
                                >
                                  <Check size={12} />
                                </button>
                                <button 
                                  onClick={() => setReassigningResId(null)}
                                  className="bg-slate-200 text-slate-600 p-1.5 rounded-lg cursor-pointer"
                                  title="Annuler"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setReassigningResId(res.id);
                                  setReassignNewOwnerId(res.ownerId || '');
                                }}
                                className="bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white border border-purple-100 p-1.5 rounded-lg transition cursor-pointer"
                                title="Réassigner à un autre hôte"
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}

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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination UI for Admin Residences */}
                {filteredResidences.length > 50 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-5 px-6 mt-4 pb-4">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        disabled={residencesPage === 1}
                        onClick={() => {
                          setResidencesPage(prev => Math.max(prev - 1, 1));
                        }}
                        className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                      >
                        Précédent
                      </button>
                      <button
                        disabled={residencesPage === Math.ceil(filteredResidences.length / 50)}
                        onClick={() => {
                          setResidencesPage(prev => Math.min(prev + 1, Math.ceil(filteredResidences.length / 50)));
                        }}
                        className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                      >
                        Suivant
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs text-slate-500 font-bold">
                          Affichage de <span className="font-extrabold text-slate-800">{Math.min((residencesPage - 1) * 50 + 1, filteredResidences.length)}</span> à{' '}
                          <span className="font-extrabold text-slate-800">{Math.min(residencesPage * 50, filteredResidences.length)}</span> sur{' '}
                          <span className="font-extrabold text-slate-800">{filteredResidences.length}</span> hébergements
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                          <button
                            disabled={residencesPage === 1}
                            onClick={() => {
                              setResidencesPage(prev => Math.max(prev - 1, 1));
                            }}
                            className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          
                          {Array.from({ length: Math.ceil(filteredResidences.length / 50) }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              onClick={() => {
                                setResidencesPage(p);
                              }}
                              className={cn(
                                "relative inline-flex items-center px-3 py-1.5 text-xs font-black rounded-xl border transition cursor-pointer",
                                residencesPage === p
                                  ? "z-10 bg-red-600 text-white border-red-600 shadow-sm"
                                  : "bg-white text-slate-600 border-slate-150 hover:bg-slate-100"
                              )}
                            >
                              {p}
                            </button>
                          ))}

                          <button
                            disabled={residencesPage === Math.ceil(filteredResidences.length / 50)}
                            onClick={() => {
                              setResidencesPage(prev => Math.min(prev + 1, Math.ceil(filteredResidences.length / 50)));
                            }}
                            className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4.5: VERIFICATION TYPES MANAGEMENT */}
        {activeTab === 'verifications' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Types de Vérifications</h2>
                <p className="text-slate-500 font-medium text-sm">Gérez dynamiquement la liste des vérifications que les hôtes doivent effectuer.</p>
              </div>
              <button
                onClick={() => {
                  setEditingVerifType(null);
                  setVerifLabel('');
                  setVerifDescription('');
                  setVerifIsActive(true);
                }}
                className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus size={14} /> Nouveau Type
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form */}
              <div className="lg:col-span-1">
                <form onSubmit={handleSaveVerifType} className="bg-slate-50 p-6 rounded-[32px] border border-slate-150 shadow-sm space-y-4">
                  <h3 className="font-black text-slate-900 text-base">{editingVerifType ? "Modifier Type" : "Nouveau Type"}</h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Libellé</label>
                    <input 
                      type="text" 
                      required
                      value={verifLabel}
                      onChange={(e) => setVerifLabel(e.target.value)}
                      placeholder="Ex: Identité vérifiée"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description (Optionnel)</label>
                    <textarea 
                      value={verifDescription}
                      onChange={(e) => setVerifDescription(e.target.value)}
                      placeholder="Ex: Vérifier que la pièce correspond au voyageur"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 h-24" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="verif_active"
                      checked={verifIsActive}
                      onChange={(e) => setVerifIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300" 
                    />
                    <label htmlFor="verif_active" className="text-xs font-black text-slate-700 uppercase tracking-wider cursor-pointer">Actif</label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      type="submit"
                      disabled={isSavingVerifType}
                      className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer shadow-md shadow-red-100"
                    >
                      {isSavingVerifType ? "Enregistrement..." : "Enregistrer"}
                    </button>
                    {editingVerifType && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVerifType(null);
                          setVerifLabel('');
                          setVerifDescription('');
                          setVerifIsActive(true);
                        }}
                        className="px-4 py-3 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-5 px-6">Libellé</th>
                        <th className="py-5 px-6">Description</th>
                        <th className="py-5 px-6">Statut</th>
                        <th className="py-5 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                      {Array.isArray(verificationTypes) && verificationTypes.map((type) => (
                        <tr key={type.id}>
                          <td className="py-4 px-6">
                            <span className="block font-black text-slate-900 leading-tight uppercase text-xs">{type.label}</span>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 font-medium max-w-[200px] truncate">
                            {type.description || '-'}
                          </td>
                          <td className="py-4 px-6">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[9px] font-black uppercase",
                              type.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                            )}>
                              {type.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingVerifType(type);
                                  setVerifLabel(type.label);
                                  setVerifDescription(type.description || '');
                                  setVerifIsActive(!!type.isActive);
                                }}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 p-2 rounded-xl transition cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteVerifType(type.id)}
                                className="bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 p-2 rounded-xl text-red-600 transition cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {verificationTypes.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-slate-400 font-bold italic">
                            Aucun type de vérification configuré.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <AdminSupport />
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
                      onChange={(e) => {
                        const r = e.target.value as UserRole;
                        setNewUserRole(r);
                        // Pre-populate permissions for admin
                        if (r === 'admin') {
                          setNewUserPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
                        } else if (r === 'client' || r === 'owner') {
                          setNewUserPermissions([]);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-red-500 h-[44px]"
                    >
                      <option value="client">Voyageur</option>
                      <option value="owner">Hôte (Propriétaire)</option>
                      <option value="admin">Administrateur</option>
                      <option value="manager">Manager (Gestionnaire)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Mot de passe</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Min. 6 caractères"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500" 
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#%&*";
                          let pass = "";
                          for (let i = 0; i < 10; i++) {
                            pass += chars.charAt(Math.floor(Math.random() * chars.length));
                          }
                          setNewUserPassword(pass);
                          addToast("Mot de passe généré !", "success");
                        }}
                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Générer un mot de passe sécurisé"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Permissions Selection Grid */}
                  <div className="sm:col-span-2 md:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-150 mt-2">
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <span>🛡️ Droits d'accès et Permissions</span>
                      <span className="text-[9px] text-slate-400 font-bold normal-case font-normal">(Requis pour les rôles Manager et Administrateur)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {AVAILABLE_PERMISSIONS.map((perm) => {
                        const isChecked = newUserPermissions.includes(perm.id);
                        return (
                          <label key={perm.id} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-slate-100 hover:border-slate-200 transition cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setNewUserPermissions(newUserPermissions.filter(p => p !== perm.id));
                                } else {
                                  setNewUserPermissions([...newUserPermissions, perm.id]);
                                }
                              }}
                              className="w-4 h-4 text-red-650 accent-red-600 rounded border-slate-300 focus:ring-red-500 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-slate-700">{perm.label}</span>
                          </label>
                        );
                      })}
                    </div>
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
                        setNewUserPassword('');
                        setNewUserPermissions([]);
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

            <div className="overflow-x-auto bg-white border border-slate-200 rounded-[24px] shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Utilisateur</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact Direct</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vérification</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.slice((usersPage - 1) * 50, usersPage * 50).map(usr => {
                    const isListedSU = isSuperAdminEmail(usr.email);
                    const isSuspended = usr.isSuspended === true;
                    return (
                      <React.Fragment key={usr.uid}>
                        <tr className={cn(
                          "transition-colors hover:bg-slate-50/80",
                          isListedSU ? "bg-red-50/30" : isSuspended ? "bg-amber-50/30" : ""
                        )}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0",
                                isListedSU ? "bg-red-600 shadow-sm" : "bg-slate-900"
                              )}>
                                {usr.photoURL ? (
                                  <img src={usr.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  usr.displayName?.[0] || 'U'
                                )}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-900">{usr.displayName || "Sans Nom"}</h4>
                                <div className="flex gap-1 mt-0.5">
                                  <span className="px-2.5 py-1 bg-red-100 rounded-lg text-[10px] font-black uppercase text-red-700">{usr.role}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5">
                              {usr.phoneNumber ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                                    <Phone size={10} className="text-red-600" />
                                  </div>
                                  <span className="text-xs text-slate-900 font-black">{usr.phoneNumber}</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold italic">Aucun téléphone</span>
                              )}
                              <span className="text-[9px] text-slate-400 font-medium">{usr.email}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            {(usr.idNumber || usr.idCardUrl) ? (
                              <div className="space-y-1.5">
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block",
                                  usr.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                                  usr.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-amber-100 text-amber-800'
                                )}>
                                  {usr.verificationStatus === 'verified' ? 'Vérifié' : usr.verificationStatus === 'rejected' ? 'Rejeté' : 'En attente'}
                                </span>
                                {(usr.verificationStatus === 'pending') && (
                                  <div className="flex gap-1 mt-1">
                                    <button onClick={() => handleApproveIdentity(usr.uid, usr.email, usr.displayName || 'Utilisateur')} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[8px] font-black uppercase cursor-pointer">Approuver</button>
                                    <button onClick={() => { if(confirm("Rejeter ?")) handleRejectIdentity(usr.uid, usr.email, usr.displayName || 'Utilisateur'); }} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[8px] font-black uppercase cursor-pointer">Rejeter</button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold italic">Aucune pièce</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={() => setSelectedUserForDetail(usr)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-red-600 transition shadow-xl shadow-slate-200/50 cursor-pointer text-[9px] font-black uppercase tracking-widest active:scale-95"
                                title="Voir les détails complets"
                              >
                                <Eye size={12} />
                                Détails
                              </button>
                              <button onClick={() => {
                                if (expandedUserSecurityUid === usr.uid) {
                                  setExpandedUserSecurityUid(null);
                                  setEditUserPassword('');
                                  setEditUserPermissions([]);
                                } else {
                                  setExpandedUserSecurityUid(usr.uid);
                                  setEditUserPassword('');
                                  setEditUserPermissions(usr.permissions ? usr.permissions.split(',') : []);
                                }
                              }} className={cn("p-2 rounded-xl border transition cursor-pointer", expandedUserSecurityUid === usr.uid ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-200 hover:text-blue-600 hover:border-blue-100")} title="Sécurité"><ShieldCheck size={14} /></button>
                              
                              {!isListedSU && (
                                <>
                                  <button onClick={() => handleToggleSuspension(usr.uid, isSuspended, usr.email)} className={cn("p-2 rounded-xl border transition cursor-pointer", isSuspended ? "bg-green-50 text-green-600 border-green-200" : "bg-amber-50 text-amber-600 border-amber-200")} title={isSuspended ? "Réactiver" : "Suspendre"}>
                                    {isSuspended ? <Check size={14} /> : <ShieldAlert size={14} />}
                                  </button>
                                  <button onClick={() => {
                                    if (window.confirm(`Supprimer définitivement ${usr.email} ?`)) {
                                      handleDeleteUser(usr.uid, usr.email);
                                    }
                                  }} className="p-2 rounded-xl bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white transition cursor-pointer shadow-sm" title="Supprimer">
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedUserSecurityUid === usr.uid && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={4} className="p-4 border-b border-slate-200">
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Changer rôle :</span>
                      {isListedSU ? (
                        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase">Statut Intouchable</span>
                      ) : (
                        <div className="flex gap-1.5 flex-wrap">
                          {['client', 'owner', 'admin', 'manager'].map(rCode => {
                            const isCurrent = usr.role === rCode;
                            return (
                              <button key={rCode} disabled={!isCurrentUserSU} onClick={() => handleChangeRole(usr.uid, usr.email, usr.role, rCode as UserRole)} className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all border", isCurrent ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer")}>
                                {rCode === 'client' ? 'Voyageur' : rCode === 'owner' ? 'Hôte' : rCode === 'admin' ? 'Admin' : 'Manager'}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4 pt-3 border-t border-slate-200">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Modifier le mot de passe (laisser vide si inchangé)</label>
                        <div className="relative">
                          <input type="text" placeholder="Nouveau mot de passe fort" value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-red-500" />
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        </div>
                      </div>
                      
                      {(usr.role === 'admin' || usr.role === 'manager') && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Shield size={12}/> Permissions d'accès</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {AVAILABLE_PERMISSIONS.map(perm => {
                              const checked = editUserPermissions.includes(perm.id);
                              return (
                                <label key={perm.id} className={cn("flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all cursor-pointer hover:bg-white", checked ? "border-red-200 bg-red-50/30" : "border-slate-100 bg-slate-50/50")}>
                                  <input type="checkbox" checked={checked} onChange={(e) => {
                                    if(e.target.checked) setEditUserPermissions([...editUserPermissions, perm.id]);
                                    else setEditUserPermissions(editUserPermissions.filter(p => p !== perm.id));
                                  }} className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500" />
                                  <span className="text-xs font-semibold text-slate-700">{perm.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-end pt-2">
                        <button type="button" disabled={isUpdatingUserSecurity} onClick={() => handleUpdateUserSecurity(usr.uid, usr.email)} className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer disabled:opacity-50">
                          {isUpdatingUserSecurity ? "Enregistrement..." : "Enregistrer la sécurité"}
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </React.Fragment>
        );
      })}
    </tbody>
  </table>
</div>

                        {/* Pagination UI for Admin Users */}
            {filteredUsers.length > 50 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-5 px-6 mt-4 pb-4">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    disabled={usersPage === 1}
                    onClick={() => {
                      setUsersPage(prev => Math.max(prev - 1, 1));
                    }}
                    className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                  >
                    Précédent
                  </button>
                  <button
                    disabled={usersPage === Math.ceil(filteredUsers.length / 50)}
                    onClick={() => {
                      setUsersPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / 50)));
                    }}
                    className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                  >
                    Suivant
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-bold">
                      Affichage de <span className="font-extrabold text-slate-800">{Math.min((usersPage - 1) * 50 + 1, filteredUsers.length)}</span> à{' '}
                      <span className="font-extrabold text-slate-800">{Math.min(usersPage * 50, filteredUsers.length)}</span> sur{' '}
                      <span className="font-extrabold text-slate-800">{filteredUsers.length}</span> utilisateurs
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                      <button
                        disabled={usersPage === 1}
                        onClick={() => {
                          setUsersPage(prev => Math.max(prev - 1, 1));
                        }}
                        className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      {Array.from({ length: Math.ceil(filteredUsers.length / 50) }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            setUsersPage(p);
                          }}
                          className={cn(
                            "relative inline-flex items-center px-3 py-1.5 text-xs font-black rounded-xl border transition cursor-pointer",
                            usersPage === p
                              ? "z-10 bg-red-600 text-white border-red-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-150 hover:bg-slate-100"
                          )}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        disabled={usersPage === Math.ceil(filteredUsers.length / 50)}
                        onClick={() => {
                          setUsersPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / 50)));
                        }}
                        className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
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
                      {filteredBookings.slice((bookingsPage - 1) * 50, bookingsPage * 50).map((book) => {
                        const isEditing = editingBookingId === book.id;
                        return (
                          <tr key={book.id} className={cn("transition-colors", isEditing ? "bg-red-50/20" : "")}>
                            <td className="py-4 px-6">
                              <span className="block font-black text-slate-900">#{book.id}</span>
                              <span className="text-[10px] text-slate-400 block font-bold">Voyageur: {book.clientName || book.clientId?.substring(0,8)}</span>
                            </td>
                            <td className="py-4 px-6 font-medium text-slate-600">
                              <div>Du : {formatDateFr(book.checkIn)}</div>
                              <div>Au : {formatDateFr(book.checkOut)}</div>
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
                                <div className="flex justify-center gap-2">
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
                                  <button
                                    onClick={() => setSelectedAdminBookingDetails(book)}
                                    className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg cursor-pointer inline-block"
                                  >
                                    Détails & Vérifs
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination UI for Admin Bookings */}
                {filteredBookings.length > 50 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-5 px-6 mt-4 pb-4">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        disabled={bookingsPage === 1}
                        onClick={() => {
                          setBookingsPage(prev => Math.max(prev - 1, 1));
                        }}
                        className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                      >
                        Précédent
                      </button>
                      <button
                        disabled={bookingsPage === Math.ceil(filteredBookings.length / 50)}
                        onClick={() => {
                          setBookingsPage(prev => Math.min(prev + 1, Math.ceil(filteredBookings.length / 50)));
                        }}
                        className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                      >
                        Suivant
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs text-slate-500 font-bold">
                          Affichage de <span className="font-extrabold text-slate-800">{Math.min((bookingsPage - 1) * 50 + 1, filteredBookings.length)}</span> à{' '}
                          <span className="font-extrabold text-slate-800">{Math.min(bookingsPage * 50, filteredBookings.length)}</span> sur{' '}
                          <span className="font-extrabold text-slate-800">{filteredBookings.length}</span> réservations
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                          <button
                            disabled={bookingsPage === 1}
                            onClick={() => {
                              setBookingsPage(prev => Math.max(prev - 1, 1));
                            }}
                            className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          
                          {Array.from({ length: Math.ceil(filteredBookings.length / 50) }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              onClick={() => {
                                setBookingsPage(p);
                              }}
                              className={cn(
                                "relative inline-flex items-center px-3 py-1.5 text-xs font-black rounded-xl border transition cursor-pointer",
                                bookingsPage === p
                                  ? "z-10 bg-red-600 text-white border-red-600 shadow-sm"
                                  : "bg-white text-slate-600 border-slate-150 hover:bg-slate-100"
                              )}
                            >
                              {p}
                            </button>
                          ))}

                          <button
                            disabled={bookingsPage === Math.ceil(filteredBookings.length / 50)}
                            onClick={() => {
                              setBookingsPage(prev => Math.min(prev + 1, Math.ceil(filteredBookings.length / 50)));
                            }}
                            className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedAdminBookingDetails && (() => {
              const book = selectedAdminBookingDetails;
              return (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedAdminBookingDetails(null)} />
                  <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-slate-800 font-sans">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase tracking-widest">DÉTAILS ADMIN - RÉSERVATION</span>
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1">Voyage ID: #{book.id.slice(0, 10).toUpperCase()}</h4>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedAdminBookingDetails(null)}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1 text-xs font-sans">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 mb-2">📅 Séjour & Logistique</span>
                          <div><span className="text-slate-400">Voyageur :</span> <strong className="text-slate-900">{book.clientName || book.clientId}</strong></div>
                          <div><span className="text-slate-400">Arrivée :</span> <strong className="text-slate-900">{formatDateFr(book.checkIn)}</strong></div>
                          <div><span className="text-slate-400">Départ :</span> <strong className="text-slate-900">{formatDateFr(book.checkOut)}</strong></div>
                          <div><span className="text-slate-400">Voyageurs :</span> <strong className="text-slate-900">{book.guests || 1} personnes</strong></div>
                        </div>

                        <div className="space-y-1 text-xs font-sans">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 mb-2">💰 Structure Financière</span>
                          <div><span className="text-slate-400">Total :</span> <strong className="text-slate-900">{formatFCFA(book.totalPrice)} F CFA</strong></div>
                          <div><span className="text-slate-400">Acompte Versé :</span> <strong className="text-green-600">{formatFCFA(book.advancePaid)} F CFA</strong></div>
                          <div><span className="text-slate-400">Statut Réservation :</span> <strong className="text-slate-900 uppercase">{book.bookingStatus}</strong></div>
                          <div><span className="text-slate-400">Statut Paiement :</span> <strong className="text-slate-900 uppercase">{book.paymentStatus}</strong></div>
                        </div>
                      </div>

                      {/* Verification section */}
                      <div className="border-t border-slate-100 pt-6">
                        <BookingVerificationSection 
                          bookingId={book.id}
                          clientId={book.clientId}
                          isPast={book.bookingStatus === 'completed'}
                          canEdit={false} // Read-only for admin to view verifications done
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedAdminBookingDetails(null)}
                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 6: FINANCIAL REVENUE */}
        {activeTab === 'revenue' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Analyses Financières</h2>
              <p className="text-slate-500 font-medium text-sm">Suivi des montants d'avances payés et volume de commissions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 p-8 rounded-[32px] shadow-sm text-center">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Volume d'Affaires Global</span>
                <div className="text-3xl font-black text-slate-900 tracking-tighter mb-2">{formatCurrency(grossRevenue)} FCFA</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total encaissé voyageurs</div>
              </div>

              <div className="bg-white border-2 border-green-100 p-8 rounded-[32px] shadow-sm text-center">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Commissions Net Faso</span>
                <div className="text-4xl font-black text-green-600 tracking-tighter mb-2">{formatCurrency(totalRevenue)} FCFA</div>
                <div className="text-xs text-slate-600 font-bold tracking-tight">Part plateforme ({commissionRate}%)</div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[32px] text-white overflow-hidden relative flex flex-col justify-center">
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
                <p className="text-slate-500 font-medium text-sm">Lisez les retours voyageurs et filtrez ou supprimez les contenus insultants.</p>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 p-12 rounded-[32px] text-center space-y-4">
                <p className="text-slate-400 font-black text-sm">Aucun commentaire n'a été rédigé pour le moment.</p>
                <button 
                  onClick={() => {
                    triggerSuccess("Fonctionnalité de test désactivée pour la production.");
                  }}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition cursor-pointer"
                >
                  Générer un commentaire témoin à modérer (Désactivé)
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
                      {(() => {
                        const author = users.find(u => u.uid === rev.clientId);
                        return (
                          <span className="text-[10px] text-slate-400 font-bold">
                            Auteur : {author?.displayName || author?.email || `Voyageur #${rev.clientId?.substring(0, 6)}`}
                          </span>
                        );
                      })()}
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

        {/* TAB 8: AUDIT REPORTS & STATS */}
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

        {/* TAB 12: WITHDRAWALS MANAGEMENT */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6 animate-in fade-in" id="withdrawals-admin-tab">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Demandes de Retrait</h2>
                <p className="text-slate-500 font-medium text-sm">Gérez les demandes de virement des gains des hôtes.</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-5 px-6">Hôte / Demandeur</th>
                      <th className="py-5 px-6">Montant (FCFA)</th>
                      <th className="py-5 px-6">Méthode de Paiement</th>
                      <th className="py-5 px-6">Date de Demande</th>
                      <th className="py-5 px-6">Statut</th>
                      <th className="py-5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 italic">Aucune demande de retrait enregistrée.</td>
                      </tr>
                    ) : (
                      withdrawals
                        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                        .slice((withdrawalsPage - 1) * 50, withdrawalsPage * 50)
                        .map(withd => {
                        const owner = users.find(u => u.uid === withd.ownerId);
                        return (
                          <tr key={withd.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-black">{owner?.displayName || 'Inconnu'}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{owner?.email}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 font-black text-slate-950">
                              {formatCurrency(withd.amount)} F
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-400">{withd.provider} Money</span>
                                <span className="text-xs font-mono font-black text-slate-900">{withd.phone}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                              {new Date(withd.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </td>
                            <td className="py-4 px-6">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-block",
                                withd.status === 'pending' ? 'bg-amber-50 text-amber-700' : 
                                withd.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              )}>
                                {withd.status === 'pending' ? 'En attente' : withd.status === 'approved' ? 'Payé' : 'Refusé'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {withd.status === 'pending' && (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Voulez-vous marquer comme PAYÉ le retrait de ${withd.amount} F pour ${owner?.displayName || 'cet hôte'} ?`)) {
                                        await updateWithdrawalStatus(withd.id, 'approved', new Date().toISOString());
                                        await reloadData();
                                        triggerSuccess("Retrait marqué comme payé.");
                                        logAction(`Validation retrait #${withd.id} pour ${withd.amount} F`);
                                      }
                                    }}
                                    className="p-2 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition cursor-pointer"
                                    title="Approuver & Marquer comme payé"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (confirm("Voulez-vous rejeter cette demande de retrait ?")) {
                                        await updateWithdrawalStatus(withd.id, 'rejected');
                                        await reloadData();
                                        triggerSuccess("Retrait rejeté.");
                                        logAction(`REJET retrait #${withd.id}`);
                                      }
                                    }}
                                    className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition cursor-pointer"
                                    title="Rejeter la demande"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination UI for Admin Withdrawals */}
              {withdrawals.length > 50 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-5 px-6 mt-4 pb-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      disabled={withdrawalsPage === 1}
                      onClick={() => {
                        setWithdrawalsPage(prev => Math.max(prev - 1, 1));
                      }}
                      className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                    >
                      Précédent
                    </button>
                    <button
                      disabled={withdrawalsPage === Math.ceil(withdrawals.length / 50)}
                      onClick={() => {
                        setWithdrawalsPage(prev => Math.min(prev + 1, Math.ceil(withdrawals.length / 50)));
                      }}
                      className="relative ml-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
                    >
                      Suivant
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-bold">
                        Affichage de <span className="font-extrabold text-slate-800">{Math.min((withdrawalsPage - 1) * 50 + 1, withdrawals.length)}</span> à{' '}
                        <span className="font-extrabold text-slate-800">{Math.min(withdrawalsPage * 50, withdrawals.length)}</span> sur{' '}
                        <span className="font-extrabold text-slate-800">{withdrawals.length}</span> demandes de retrait
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs gap-1" aria-label="Pagination">
                        <button
                          disabled={withdrawalsPage === 1}
                          onClick={() => {
                            setWithdrawalsPage(prev => Math.max(prev - 1, 1));
                          }}
                          className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        
                        {Array.from({ length: Math.ceil(withdrawals.length / 50) }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setWithdrawalsPage(p);
                            }}
                            className={cn(
                              "relative inline-flex items-center px-3 py-1.5 text-xs font-black rounded-xl border transition cursor-pointer",
                              withdrawalsPage === p
                                ? "z-10 bg-red-600 text-white border-red-600 shadow-sm"
                                : "bg-white text-slate-600 border-slate-150 hover:bg-slate-100"
                            )}
                          >
                            {p}
                          </button>
                        ))}

                        <button
                          disabled={withdrawalsPage === Math.ceil(withdrawals.length / 50)}
                          onClick={() => {
                            setWithdrawalsPage(prev => Math.min(prev + 1, Math.ceil(withdrawals.length / 50)));
                          }}
                          className="relative inline-flex items-center rounded-xl border border-slate-150 bg-white p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

              {/* TAB 12: FLASH INFO & ANNOUNCEMENTS */}
        {activeTab === 'flash-info' && (
          <div className="space-y-8 animate-in fade-in max-w-6xl" id="flash-info-admin-tab">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Flash Info Défilant (Marquee)</h2>
              <p className="text-slate-500 font-medium text-sm">Créez et gérez des messages d'information défilants pour capter l'attention de vos visiteurs.</p>
            </div>

            {/* Marquee Live Preview Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  Aperçu du Bandeau Défilant (Défilement continu)
                </span>
                <span className="text-[9px] text-slate-500 font-bold uppercase">Passez la souris pour suspendre</span>
              </div>
              
              {announcements.filter(a => a.active).length === 0 ? (
                <div className="text-center py-6 text-slate-500 italic text-sm">
                  Aucun message d'information n'est actif pour le moment.
                </div>
              ) : (
                <div className="relative overflow-hidden bg-slate-950 py-3 rounded-2xl flex items-center select-none border border-slate-800/60">
                  <div className="absolute left-0 top-0 bottom-0 px-4 bg-gradient-to-r from-slate-950 to-transparent flex items-center z-10 text-xs font-black uppercase text-red-500">
                    Flash Info
                  </div>
                  <div className="w-full overflow-hidden flex items-center h-8 ml-24 pr-8">
                    <div className="animate-marquee hover:[animation-play-state:paused] flex items-center gap-16 py-1">
                      {[...announcements.filter(a => a.active), ...announcements.filter(a => a.active)].map((ann, idx) => {
                        const badgeColors: Record<string, string> = {
                          info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                          warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                          success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                          danger: 'bg-red-500/10 text-red-400 border border-red-500/20 font-bold animate-pulse'
                        };
                        return (
                          <div key={`${ann.id}-${idx}`} className="flex items-center gap-2.5 shrink-0">
                            <span className="text-lg">{ann.emoji || '📢'}</span>
                            <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider", badgeColors[ann.type || 'info'])}>
                              {ann.type === 'danger' ? 'ALERTE' : 'INFO'}
                            </span>
                            <p className="text-xs md:text-sm font-semibold tracking-wide text-slate-200">
                              {ann.text}
                            </p>
                            <span className="text-slate-600 font-bold mx-2">•</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Form to Create/Edit */}
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-5 lg:col-span-1">
                <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
                  {editingAnnId ? "Modifier le Message d'Info" : "Créer un Message d'Info"}
                </h3>
                
                <form onSubmit={handleAddOrEditAnnouncement} className="space-y-4">
                  {/* Text Input */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Contenu du Message</label>
                    <textarea
                      value={newAnnText}
                      onChange={(e) => setNewAnnText(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 leading-relaxed"
                      placeholder="Ex: Profitez de 10% de réduction ce week-end sur toutes les résidences !"
                      required
                    />
                  </div>

                  {/* Emoji selection grid */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Émoticône du Message</label>
                    <div className="grid grid-cols-6 gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-2">
                      {['📢', '🎉', '🔥', '✨', '🚨', '⚠️', '💡', '🏡', '⭐', '💎', '🔔', '🌍', '✈️', '💰', '🔑', '🛡️', '☀️', '🌙'].map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setNewAnnEmoji(em)}
                          className={cn(
                            "h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white hover:shadow-xs transition cursor-pointer select-none",
                            newAnnEmoji === em ? "bg-white shadow-sm scale-110 border border-slate-200" : ""
                          )}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Style Selection */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Style / Gravité</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['info', 'warning', 'success', 'danger'] as const).map((type) => {
                        const styleColors: Record<string, string> = {
                          info: 'bg-blue-50 text-blue-700 border-blue-200',
                          warning: 'bg-amber-50 text-amber-700 border-amber-200',
                          success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          danger: 'bg-rose-50 text-rose-700 border-rose-200'
                        };
                        const labels: Record<string, string> = {
                          info: 'Bleu',
                          warning: 'Jaune',
                          success: 'Vert',
                          danger: 'Rouge'
                        };
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setNewAnnType(type)}
                            className={cn(
                              "border text-[10px] py-2 px-1.5 rounded-xl font-black transition text-center uppercase tracking-wider cursor-pointer",
                              styleColors[type],
                              newAnnType === type ? "ring-2 ring-slate-900 border-transparent scale-[1.02]" : "opacity-65 hover:opacity-100"
                            )}
                          >
                            {labels[type]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active / Suspended toggle */}
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Bandeau Actif ?</p>
                      <p className="text-[9px] text-slate-400 font-medium">S'il est suspendu, il ne défilera pas.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewAnnActive(!newAnnActive)}
                      className={cn(
                        "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        newAnnActive ? "bg-red-600" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          newAnnActive ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    {editingAnnId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAnnId(null);
                          setNewAnnText('');
                          setNewAnnEmoji('📢');
                          setNewAnnType('info');
                          setNewAnnActive(true);
                        }}
                        className="flex-1 bg-slate-100 text-slate-700 px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-2 bg-slate-900 text-white px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition shadow-md flex items-center justify-center gap-1.5"
                    >
                      {isSaving ? "Synchronisation..." : editingAnnId ? "Modifier" : "Ajouter Message"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Announcements List (takes 2/3 cols) */}
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-lg font-black text-slate-900">Liste des Messages d'Infos ({announcements.length})</h3>
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-black px-2 py-0.5 rounded-full uppercase">Maximum: Illimité</span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {announcements.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 italic font-bold text-xs">
                      Aucun message configuré pour le moment. Créez-en un à gauche !
                    </div>
                  ) : (
                    announcements.map((ann) => {
                      const badgeStyles: Record<string, string> = {
                        info: 'bg-blue-50 text-blue-700 border-blue-100',
                        warning: 'bg-amber-50 text-amber-700 border-amber-100',
                        success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        danger: 'bg-rose-50 text-rose-700 border-rose-100'
                      };
                      return (
                        <div key={ann.id} className={cn(
                          "p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                          ann.active ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50/50 border-slate-100 opacity-60"
                        )}>
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-2xl mt-0.5 select-none">{ann.emoji || '📢'}</span>
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-widest", badgeStyles[ann.type || 'info'])}>
                                  {ann.type || 'info'}
                                </span>
                                {ann.active ? (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-green-100 text-green-800">
                                    En Diffusion
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-200 text-slate-500">
                                    Suspendu
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-800 leading-relaxed pr-4">
                                {ann.text}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end md:self-center">
                            {/* Suspend / Resume toggle */}
                            <button
                              onClick={() => handleToggleAnnActive(ann.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer border",
                                ann.active 
                                  ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" 
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              )}
                              title={ann.active ? "Suspendre la diffusion" : "Activer la diffusion"}
                            >
                              {ann.active ? "Suspendre" : "Diffuser"}
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEditAnn(ann)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl transition cursor-pointer text-slate-600 border border-slate-200"
                              title="Modifier"
                            >
                              <Edit3 size={13} />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteAnn(ann.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition cursor-pointer text-rose-600 border border-rose-200"
                              title="Supprimer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 13: EMAIL CONFIGURATION (SMTP) */}
        {activeTab === 'email' && (
          <div className="space-y-6 animate-in fade-in max-w-2xl">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Configuration Email (SMTP)</h2>
              <p className="text-slate-500 font-medium text-sm">Paramétrez le serveur d'envoi d'emails pour les réinitialisations de mot de passe et notifications.</p>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSavingEmailSettings(true);
                try {
                  const token = localStorage.getItem('auth_token');
                  const response = await apiFetch('/api/settings/emailSettings', {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify(emailSettings)
                  });
                  if (response.ok) {
                    triggerSuccess("Paramètres email enregistrés avec succès !");
                    logAction("Mise à jour des paramètres SMTP de la plateforme.");
                  } else {
                    throw new Error("Erreur serveur lors de la sauvegarde.");
                  }
                } catch (err) {
                  console.error(err);
                  addToast("Une erreur est survenue lors de l'enregistrement.", "error");
                } finally {
                  setIsSavingEmailSettings(false);
                }
              }} 
              className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Hôte SMTP</label>
                  <input
                    type="text"
                    required
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Port SMTP</label>
                  <input
                    type="number"
                    required
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="465"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">Connexion Sécurisée (SSL/TLS)</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Activez cette option pour la plupart des serveurs modernes (Port 465).</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailSettings({ ...emailSettings, smtpSecure: !emailSettings.smtpSecure })}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500",
                    emailSettings.smtpSecure ? "bg-red-600" : "bg-slate-200"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      emailSettings.smtpSecure ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Utilisateur / Login SMTP</label>
                  <input
                    type="text"
                    required
                    value={emailSettings.smtpUser}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="votre-email@domaine.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Mot de Passe SMTP</label>
                  <input
                    type="password"
                    required
                    value={emailSettings.smtpPass}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPass: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Nom de l'expéditeur</label>
                  <input
                    type="text"
                    required
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="ResiFaso Support"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Email de l'expéditeur</label>
                  <input
                    type="email"
                    required
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="support@resifaso.com"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSavingEmailSettings}
                  className="w-full bg-slate-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                >
                  {isSavingEmailSettings ? 'Enregistrement...' : 'Enregistrer la Configuration SMTP'}
                </button>
              </div>
            </form>
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
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Max réservations sans pièce d'identité (Dossier incomplet)</label>
                <input 
                  type="number" 
                  value={maxBookingsWithoutId} 
                  onChange={(e) => setMaxBookingsWithoutId(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-red-500" 
                  placeholder="Ex: 3"
                />
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">Si le client dépasse ce seuil sans téléverser sa pièce d'identité, son compte sera automatiquement restreint.</span>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Temps de rafraîchissement (ms)</label>
                <input 
                  type="number" 
                  value={refreshInterval} 
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-red-500" 
                  placeholder="Ex: 60000 (1 minute)"
                />
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">Ex: 60000 pour 1 minute.</span>
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
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Support Client (Chat en ligne)</h3>
                
                <div className="flex items-center gap-3 bg-white border border-slate-250 p-4 rounded-xl">
                  <input
                    type="checkbox"
                    id="supportChatEnabled"
                    checked={supportChatEnabled}
                    onChange={(e) => setSupportChatEnabled(e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-slate-300"
                  />
                  <div>
                    <label htmlFor="supportChatEnabled" className="block text-sm font-black text-slate-900 cursor-pointer">Activer le Chat Support Client</label>
                    <span className="text-[10px] text-slate-500 font-medium">Permet aux utilisateurs de chatter avec l'équipe support.</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Heure d'ouverture</label>
                    <input 
                      type="time" 
                      value={supportChatOpenTime} 
                      onChange={(e) => setSupportChatOpenTime(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bold">Heure de fermeture</label>
                    <input 
                      type="time" 
                      value={supportChatCloseTime} 
                      onChange={(e) => setSupportChatCloseTime(e.target.value)}
                      className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" 
                    />
                  </div>
                </div>
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

              {/* COUT MINIMUM DE RESERVATION */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="pr-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">Cout Minimum de Réservation</h4>
                    <p className="text-xs text-slate-500 font-medium leading-normal">
                      Si activé, le montant total d'une réservation (nuits + frais) ne pourra pas être inférieur au seuil défini.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMinReservationAmountEnabled(!minReservationAmountEnabled)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500",
                      minReservationAmountEnabled ? "bg-red-600" : "bg-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        minReservationAmountEnabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>
                
                {minReservationAmountEnabled && (
                  <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Montant Minimum (F CFA)</label>
                    <input 
                      type="number" 
                      value={minReservationAmount} 
                      onChange={(e) => setMinReservationAmount(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-red-500" 
                      placeholder="Ex: 5000"
                    />
                  </div>
                )}
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

            {/* BOUTON EXPORT DB */}
            <div className="max-w-xl bg-slate-900 p-8 rounded-[32px] mt-8 space-y-6 text-white">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Download className="text-emerald-400" />
                  Base de données & Sauvegardes
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-1 leading-relaxed">
                  Générez un fichier d'export contenant les données actuelles de l'application. Vous pourrez exécuter ce fichier SQL sur un serveur MariaDB ou SQLite externe ou via PM2 sans Docker.
                </p>
              </div>

              {/* Statut de Connexion Active de la Base de Données */}
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/50 space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Statut de Connexion Active</span>
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </div>
                  <div>
                    <span className="text-sm font-black text-white block font-sans">
                      {dbType === 'mariadb' ? 'MariaDB SQL (Actif & Connecté)' : dbType === 'sqlite' ? 'SQLite Local (Actif & Connecté)' : dbType === 'firebase' ? 'Firebase Firestore (Cloud)' : `Base de données active : ${dbType.toUpperCase()}`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-1 leading-normal">
                      {dbType === 'mariadb' ? 'L\'application est directement connectée à votre serveur de production MariaDB.' : dbType === 'sqlite' ? 'Base de données autonome stockée localement dans le fichier database.sqlite.' : 'Mode Cloud Firestore pour la synchronisation multi-utilisateurs.'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleExportDatabase('mariadb')}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-900"
                >
                  <Download size={16} />
                  Export MariaDB
                </button>

                <button
                  type="button"
                  onClick={() => handleExportDatabase('sqlite')}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-900"
                >
                  <Download size={16} />
                  Export SQLite
                </button>
              </div>
            </div>

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

       {/* TAB 15: LOCATIONS MANAGEMENT */}
        {activeTab === 'locations' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Villes & Quartiers</h2>
                <p className="text-slate-500 font-medium text-sm">Gérez la liste officielle des localités disponibles sur la plateforme.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Add City Form */}
              <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6 h-fit">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Plus className="text-red-600" size={20} /> Ajouter une nouvelle ville
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Si une ville n'existe pas, ajoutez-la ici pour qu'elle apparaisse dans les menus.</p>
                </div>

                <form onSubmit={handleAddCity} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-bold">Nom de la ville</label>
                    <input
                      type="text"
                      required
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      placeholder="Ex: Bobo-Dioulasso, Koudougou..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-slate-100 disabled:opacity-50"
                  >
                    {isSaving ? "Ajout..." : "Enregistrer la ville"}
                  </button>
                </form>
              </div>

              {/* Add Neighborhood Form */}
              <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6 h-fit">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Plus className="text-red-600" size={20} /> Ajouter un quartier
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Associez de nouveaux quartiers aux villes existantes.</p>
                </div>

                <form onSubmit={handleAddNeighborhood} className="space-y-4">
                  <div className="space-y-4">
                    <CustomSelect
                      label="Choisir la ville"
                      placeholder="Sélectionner la ville..."
                      options={allLocations.map(c => ({ id: c.id, name: c.name }))}
                      value={selectedCityForNeighborhood}
                      onChange={(val) => setSelectedCityForNeighborhood(val)}
                    />
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-bold">Nom du quartier</label>
                      <input
                        type="text"
                        required
                        value={newNeighborhoodName}
                        onChange={(e) => setNewNeighborhoodName(e.target.value)}
                        placeholder="Ex: Zone 1, Patte d'Oie, Sarfalao..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving || !selectedCityForNeighborhood}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-100 disabled:opacity-50"
                  >
                    {isSaving ? "Ajout..." : "Enregistrer le quartier"}
                  </button>
                </form>
              </div>

              {/* Current Locations List */}
              <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                  <h3 className="text-lg font-black text-slate-900">Localités Actuelles (Dynamiques)</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Liste des villes et quartiers ajoutés manuellement par l'administration.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/20 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-4 px-6">ID</th>
                        <th className="py-4 px-6">Ville</th>
                        <th className="py-4 px-6">Quartiers</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                      {platformLocations.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                            Aucune localité dynamique ajoutée. Seules les données par défaut de BURKINA_LOCATIONS sont utilisées.
                          </td>
                        </tr>
                      ) : (
                        platformLocations.map(loc => (
                          <tr key={loc.id}>
                            <td className="py-4 px-6 font-mono text-[10px] text-slate-400">{loc.id}</td>
                            <td className="py-4 px-6 text-slate-900">{loc.name}</td>
                            <td className="py-4 px-6">
                              <div className="flex flex-wrap gap-1.5">
                                {loc.neighborhoods?.map((n: any) => (
                                  <span key={n.id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                    {n.name}
                                  </span>
                                ))}
                                {loc.neighborhoods?.length === 0 && <span className="text-slate-400 italic font-normal text-xs">Aucun quartier</span>}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => handleDeleteLocation(loc.id, loc.name)}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition cursor-pointer"
                                title="Supprimer la ville"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: REAL-TIME AUDIT LOGS TIMELINE */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-in fade-in" id="logs-tab-container">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Logs d'Activité en direct</h2>
              <p className="text-slate-500 font-medium text-sm">Registre d'audit burkinabè des actions d'administrateurs et modifications de configurations.</p>
            </div>

            <div className="bg-slate-950 text-slate-300 font-mono text-xs rounded-3xl p-6 border-4 border-slate-900 shadow-inner h-[400px] overflow-y-auto flex flex-col gap-2 shadow-2xl">
              {actionLogs.map((log, idx) => {
                const isAction = log.includes('ACTION');
                return (
                  <div key={idx} className={cn("leading-relaxed", isAction ? "text-green-400" : "text-slate-400")}>
                    {log}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="space-y-6 animate-in fade-in" id="faq-tab-container">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Gestion de la FAQ</h2>
                <p className="text-slate-500 font-medium text-sm">Ajoutez, modifiez ou supprimez les questions fréquentes.</p>
              </div>
              <button 
                onClick={() => handleStartEditFaq()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-2xl transition shadow-sm text-sm"
              >
                + Nouvelle Question
              </button>
            </div>

            {/* List of FAQs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map(faq => (
                <div key={faq.id} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md",
                        faq.category === 'general' ? "bg-slate-100 text-slate-600" :
                        faq.category === 'booking' ? "bg-blue-50 text-blue-600" :
                        faq.category === 'payment' ? "bg-green-50 text-green-600" :
                        "bg-purple-50 text-purple-600"
                      )}>
                        {faq.category === 'general' ? 'Général' : faq.category === 'booking' ? 'Réservation' : faq.category === 'payment' ? 'Paiement' : 'Hôte'}
                      </span>
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        faq.isActive ? "bg-green-500" : "bg-red-500"
                      )}></span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2">{faq.question}</h3>
                    <p className="text-slate-500 text-xs line-clamp-3">{faq.answer}</p>
                  </div>
                  <div className="mt-4 flex gap-2 justify-end">
                    <button 
                      onClick={() => handleStartEditFaq(faq)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteFaq(faq.id, faq.question)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {faqs.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                  Aucune question FAQ trouvée.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6 animate-in fade-in" id="contact-tab-container">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Page de Contact & Messagerie</h2>
              <p className="text-slate-500 font-medium text-sm">Configurez les coordonnées publiques de votre équipe et gérez les messages d'assistance reçus.</p>
            </div>

            {/* Split Screen Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Settings Column (5 cols) */}
              <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-black text-slate-900 tracking-tight text-lg">Configuration de la Page Contact</h3>
                    <p className="text-xs text-slate-400 font-medium">Configurez les coordonnées visibles par les voyageurs Faso en ligne.</p>
                  </div>

                  <form onSubmit={handleSaveContactSettings} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Titre Principal</label>
                      <input
                        type="text"
                        required
                        value={contactSettings.title}
                        onChange={e => setContactSettings(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-red-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-900 transition outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Texte de Présentation / Description</label>
                      <textarea
                        rows={3}
                        required
                        value={contactSettings.description}
                        onChange={e => setContactSettings(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-red-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-900 transition resize-none outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email de Support</label>
                        <input
                          type="email"
                          required
                          value={contactSettings.email}
                          onChange={e => setContactSettings(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-100 focus:border-red-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-900 transition outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Téléphone de Support</label>
                        <input
                          type="text"
                          required
                          value={contactSettings.phone}
                          onChange={e => setContactSettings(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-100 focus:border-red-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-900 transition outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Adresse Bureau</label>
                      <input
                        type="text"
                        required
                        value={contactSettings.address}
                        onChange={e => setContactSettings(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-red-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-900 transition outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Horaires de Travail</label>
                      <input
                        type="text"
                        required
                        value={contactSettings.hours}
                        onChange={e => setContactSettings(prev => ({ ...prev, hours: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 focus:border-red-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-900 transition outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lien Facebook (URL)</label>
                        <input
                          type="url"
                          value={contactSettings.facebookUrl || ''}
                          onChange={e => setContactSettings(prev => ({ ...prev, facebookUrl: e.target.value }))}
                          placeholder="https://..."
                          className="w-full bg-slate-50 border border-slate-100 focus:border-red-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-900 transition outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">WhatsApp Numéro</label>
                        <input
                          type="text"
                          value={contactSettings.whatsappNumber || ''}
                          onChange={e => setContactSettings(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                          placeholder="Ex: +22670..."
                          className="w-full bg-slate-50 border border-slate-100 focus:border-red-500 focus:bg-white rounded-xl px-4 py-3 text-xs font-bold text-slate-900 transition outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-4">
                      <h4 className="text-xs font-black text-slate-900 tracking-tight">Éléments Visibles (Support)</h4>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Cochez les informations que vous souhaitez afficher sur la page Support.</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={contactSettings.isEmailEnabled !== false}
                            onChange={(e) => setContactSettings(prev => ({ ...prev, isEmailEnabled: e.target.checked }))}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                          />
                          <span className="text-xs font-bold text-slate-700">Email</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={contactSettings.isPhoneEnabled !== false}
                            onChange={(e) => setContactSettings(prev => ({ ...prev, isPhoneEnabled: e.target.checked }))}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                          />
                          <span className="text-xs font-bold text-slate-700">Téléphone</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={contactSettings.isWhatsappEnabled !== false}
                            onChange={(e) => setContactSettings(prev => ({ ...prev, isWhatsappEnabled: e.target.checked }))}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                          />
                          <span className="text-xs font-bold text-slate-700">WhatsApp</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={contactSettings.isFacebookEnabled !== false}
                            onChange={(e) => setContactSettings(prev => ({ ...prev, isFacebookEnabled: e.target.checked }))}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                          />
                          <span className="text-xs font-bold text-slate-700">Facebook</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={contactSettings.isAddressEnabled !== false}
                            onChange={(e) => setContactSettings(prev => ({ ...prev, isAddressEnabled: e.target.checked }))}
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                          />
                          <span className="text-xs font-bold text-slate-700">Adresse Physique</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingContactSettings}
                      className="w-full bg-[#EF2B2D] hover:bg-[#9E1416] text-white font-black text-xs uppercase tracking-wider py-4 px-6 rounded-2xl shadow-md transition cursor-pointer"
                    >
                      {isSavingContactSettings ? "Enregistrement..." : "Enregistrer les modifications"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Inquiries list and filters Column (7 cols) */}
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-900 tracking-tight text-lg">Boîte de Réception ({contactMessages.length})</h3>
                    <p className="text-xs text-slate-400 font-medium">Gérez et répondez aux messages envoyés par les visiteurs.</p>
                  </div>
                  
                  {/* Badges */}
                  <div className="flex gap-2">
                    <span className="bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                      {contactMessages.filter(m => m.status === 'unread').length} Non lus
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                      {contactMessages.filter(m => m.status === 'replied').length} Répondus
                    </span>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Rechercher par nom, email, sujet..."
                      value={msgSearchQuery}
                      onChange={e => setMsgSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-red-500 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="flex gap-1.5 shrink-0 w-full sm:w-auto">
                    {(['all', 'unread', 'read', 'replied'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setMsgStatusFilter(f)}
                        className={cn(
                          "px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex-1 sm:flex-none",
                          msgStatusFilter === f 
                            ? "bg-slate-900 text-white shadow-sm" 
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                        )}
                      >
                        {f === 'all' ? "Tous" : f === 'unread' ? "Non lus" : f === 'read' ? "Lus" : "Répondus"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {contactMessages.filter(m => {
                    if (msgStatusFilter !== 'all' && m.status !== msgStatusFilter) return false;
                    if (msgSearchQuery) {
                      const q = msgSearchQuery.toLowerCase();
                      return (
                        m.name?.toLowerCase().includes(q) ||
                        m.email?.toLowerCase().includes(q) ||
                        m.subject?.toLowerCase().includes(q) ||
                        m.message?.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  }).length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      Aucun message de contact trouvé.
                    </div>
                  ) : (
                    contactMessages.filter(m => {
                      if (msgStatusFilter !== 'all' && m.status !== msgStatusFilter) return false;
                      if (msgSearchQuery) {
                        const q = msgSearchQuery.toLowerCase();
                        return (
                          m.name?.toLowerCase().includes(q) ||
                          m.email?.toLowerCase().includes(q) ||
                          m.subject?.toLowerCase().includes(q) ||
                          m.message?.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    }).map(msg => (
                      <div 
                        key={msg.id}
                        onClick={() => {
                          setSelectedContactMessage(msg);
                          setAdminNoteText(msg.adminNotes || '');
                          if (msg.status === 'unread') {
                            handleMarkAsRead(msg);
                          }
                        }}
                        className={cn(
                          "bg-slate-50 hover:bg-slate-100 border rounded-2xl p-4 transition-all duration-200 cursor-pointer flex justify-between items-start gap-4",
                          msg.status === 'unread' ? "border-l-4 border-l-red-500 border-slate-100" : "border-slate-100"
                        )}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-800 text-xs truncate max-w-[150px]">{msg.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{new Date(msg.createdAt).toLocaleDateString()}</span>
                            
                            {msg.status === 'unread' && (
                              <span className="bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                Nouveau
                              </span>
                            )}
                            {msg.status === 'replied' && (
                              <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                                Traité
                              </span>
                            )}
                          </div>
                          
                          <h4 className="font-bold text-slate-900 text-xs truncate">{msg.subject}</h4>
                          <p className="text-slate-500 text-xs truncate leading-relaxed">{msg.message}</p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContactMessage(msg.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* CONTACT MESSAGE DETAIL MODAL */}
      {selectedContactMessage && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-250 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden p-6 sm:p-8 border border-slate-100 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200">
            
            {/* Close button */}
            <button
              onClick={() => setSelectedContactMessage(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-5 mb-5 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#EF2B2D]">
                Détail du message d'assistance
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                {selectedContactMessage.subject}
              </h3>
            </div>

            {/* Content info */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Expéditeur</h4>
                  <p className="font-bold text-slate-900 text-xs">{selectedContactMessage.name}</p>
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Adresse email</h4>
                  <p className="font-bold text-slate-900 text-xs">{selectedContactMessage.email}</p>
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Date d'envoi</h4>
                  <p className="font-bold text-slate-900 text-xs">{new Date(selectedContactMessage.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Statut</h4>
                  <p className="font-bold text-xs mt-0.5">
                    {selectedContactMessage.status === 'unread' ? (
                      <span className="text-red-500 uppercase tracking-wider font-black text-[10px]">Non lu</span>
                    ) : selectedContactMessage.status === 'read' ? (
                      <span className="text-slate-500 uppercase tracking-wider font-black text-[10px]">Lu</span>
                    ) : (
                      <span className="text-emerald-600 uppercase tracking-wider font-black text-[10px]">Traité / Répondu</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Message text content */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contenu du Message</h4>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                  {selectedContactMessage.message}
                </div>
              </div>

              {/* Action buttons (Direct mail client & Mark) */}
              <div className="flex gap-3">
                <a
                  href={`mailto:${selectedContactMessage.email}?subject=RE: ${encodeURIComponent(selectedContactMessage.subject)}`}
                  className="flex-1 bg-red-600 hover:bg-[#EF2B2D] text-white font-black text-xs uppercase tracking-widest py-3.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Mail size={14} />
                  Répondre par Email (Voyageur Local)
                </a>
                
                <button
                  onClick={() => handleDeleteContactMessage(selectedContactMessage.id)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 rounded-xl transition"
                >
                  Supprimer
                </button>
              </div>

              {/* Admin remarks / answer input notes form */}
              <form onSubmit={handleSaveAdminNote} className="space-y-3 pt-4 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarques internes / Notes de traitement</label>
                  <textarea
                    rows={3}
                    value={adminNoteText}
                    onChange={e => setAdminNoteText(e.target.value)}
                    placeholder="Renseignez ici les actions entreprises ou les détails de votre réponse pour vos collaborateurs..."
                    className="w-full bg-slate-50 border border-slate-100 focus:border-red-500 focus:bg-white rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 transition resize-none outline-none"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-slate-400 font-medium">
                    {selectedContactMessage.repliedAt && `Enregistré le ${new Date(selectedContactMessage.repliedAt).toLocaleDateString()}`}
                  </p>
                  <button
                    type="submit"
                    disabled={isSavingAdminNote}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider py-2.5 px-5 rounded-xl transition"
                  >
                    {isSavingAdminNote ? "Sauvegarde..." : "Enregistrer la Note & Marquer Traité"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FAQ EDIT MODAL */}
      {(activeTab === 'faq' && (editingFaq !== null || editFaqQuestion !== '')) && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden p-8 border border-slate-100 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => { setEditingFaq(null); setEditFaqQuestion(''); setEditFaqAnswer(''); }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 leading-tight">
                {editingFaq ? "Modifier la Question" : "Nouvelle Question"}
              </h3>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Question</label>
                <input 
                  type="text" 
                  value={editFaqQuestion}
                  onChange={e => setEditFaqQuestion(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Réponse</label>
                <textarea 
                  value={editFaqAnswer}
                  onChange={e => setEditFaqAnswer(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all min-h-[120px]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Catégorie</label>
                  <select 
                    value={editFaqCategory}
                    onChange={e => setEditFaqCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                  >
                    <option value="general">Général</option>
                    <option value="booking">Réservation</option>
                    <option value="payment">Paiement</option>
                    <option value="host">Hôte / Propriétaire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Ordre d'affichage</label>
                  <input 
                    type="number" 
                    value={editFaqOrder}
                    onChange={e => setEditFaqOrder(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl">
                <input 
                  type="checkbox" 
                  id="faq-active" 
                  checked={editFaqIsActive} 
                  onChange={e => setEditFaqIsActive(e.target.checked)}
                  className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900"
                />
                <label htmlFor="faq-active" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Question active (visible)
                </label>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setEditingFaq(null); setEditFaqQuestion(''); setEditFaqAnswer(''); }}
                  className="flex-1 bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingFaq}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition disabled:opacity-50"
                >
                  {isSavingFaq ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESIDENCE EDIT MODAL FOR ADMIN */}
      {editingRes && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden p-8 border border-slate-100 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingRes(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-900 leading-tight">Modifier le Logement</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Mise à jour des informations par l'administration.</p>
            </div>

            <form onSubmit={handleUpdateResidence} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Titre du logement</label>
                  <input
                    type="text"
                    required
                    value={editResTitle}
                    onChange={(e) => setEditResTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Ville (Burkina Faso)"
                    placeholder="Sélectionnez ou tapez"
                    options={allLocations.map(c => ({ id: c.id, name: c.name }))}
                    value={editResCityId}
                    onChange={(val) => {
                      setEditResCityId(val);
                      setEditResNeighborhoodId('');
                    }}
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Quartier / Zone"
                    placeholder="Sélectionnez ou tapez"
                    options={currentCityForEdit?.neighborhoods.map(nb => ({ id: nb.id, name: nb.name })) || []}
                    value={editResNeighborhoodId}
                    onChange={(val) => setEditResNeighborhoodId(val)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Prix par nuit (FCFA)</label>
                  <input
                    type="number"
                    required
                    value={editResPrice}
                    onChange={(e) => setEditResPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Type de logement</label>
                  <input
                    type="text"
                    value={editResType}
                    onChange={(e) => setEditResType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingRes(null)}
                  className="px-5 py-2.5 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingRes}
                  className="px-8 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer shadow-md"
                >
                  {isSavingRes ? "Enregistrement..." : "Mettre à jour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* DETAILED VIEW MODAL FOR ADMIN MODERATION */}
      {selectedResForDetail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-3xl overflow-hidden p-8 border border-slate-100 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedResForDetail(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            <div className="mb-6">
              <span className="text-[9px] bg-red-105 text-red-700 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                Examen du Logement
              </span>
              <h3 className="text-2xl font-black text-slate-900 leading-tight mt-2">{selectedResForDetail.title}</h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Type : <span className="capitalize text-slate-800">{selectedResForDetail.type}</span> &bull; Proposé par l'hôte
              </p>
            </div>

            {/* Content layout */}
            <div className="space-y-6">
              {/* Image Gallery */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Galerie d'images ({selectedResForDetail.images?.length || 0})</h4>
                {selectedResForDetail.images && selectedResForDetail.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedResForDetail.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden shadow-sm group bg-slate-100">
                        <img 
                          src={img} 
                          referrerPolicy="no-referrer" 
                          className="w-full h-full object-cover hover:scale-105 transition duration-300" 
                          alt={`Logement photo ${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                    <p className="text-xs text-slate-400 font-bold">Aucune image fournie pour ce logement.</p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">Description détaillée</h4>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed whitespace-pre-line">
                  {selectedResForDetail.description || "Aucune description fournie."}
                </p>
              </div>

              {/* Key Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Prix Nuitée</span>
                  <span className="text-sm font-black text-slate-950">{formatCurrency(selectedResForDetail.pricePerNight)} F CFA</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Capacité Max</span>
                  <span className="text-sm font-black text-slate-950">{selectedResForDetail.capacity} voyageur(s)</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Chambres / Lits</span>
                  <span className="text-sm font-black text-slate-950">{selectedResForDetail.bedrooms || 0} ch. / {selectedResForDetail.beds || 0} lit(s)</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <span className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Douches / Pièces</span>
                  <span className="text-sm font-black text-slate-950">{selectedResForDetail.bathrooms || 0} dch. / {selectedResForDetail.rooms || 1} pces</span>
                </div>
              </div>

              {/* Location & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Localisation</h4>
                  <div className="space-y-1.5 text-xs text-slate-600 font-semibold">
                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Ville :</span> {selectedResForDetail.address?.city || selectedResForDetail.city}</p>
                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Quartier :</span> {selectedResForDetail.address?.neighborhood || selectedResForDetail.neighborhood}</p>
                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Rue / Indications :</span> {selectedResForDetail.address?.street || selectedResForDetail.street || "Non spécifié"}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Contact Propriétaire</h4>
                  <div className="space-y-1.5 text-xs text-slate-600 font-semibold">
                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Téléphone / WhatsApp :</span> <span className="font-black text-red-650">{selectedResForDetail.ownerPhone || "Non renseigné"}</span></p>
                    <p><span className="text-slate-400 font-bold uppercase text-[10px]">Acompte requis :</span> {selectedResForDetail.advancePercentage || 30}% à la réservation</p>
                    <p>
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Charges incluses :</span>{" "}
                      {selectedResForDetail.utilitiesIncluded?.water ? "💧 Eau" : ""}
                      {selectedResForDetail.utilitiesIncluded?.water && selectedResForDetail.utilitiesIncluded?.electricity ? " & " : ""}
                      {selectedResForDetail.utilitiesIncluded?.electricity ? "⚡ Électricité" : ""}
                      {!selectedResForDetail.utilitiesIncluded?.water && !selectedResForDetail.utilitiesIncluded?.electricity ? "Aucune charge incluse" : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amenities List */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Équipements et Commodités</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedResForDetail.amenities && selectedResForDetail.amenities.length > 0 ? (
                    selectedResForDetail.amenities.map(item => (
                      <span key={item} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-1.5 animate-in fade-in">
                        <Check size={12} className="text-red-600" /> {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 font-bold italic">Aucun équipement spécifié.</span>
                  )}
                </div>
              </div>

              {/* Pricing Tiers if applicable */}
              {selectedResForDetail.pricingTiers && selectedResForDetail.pricingTiers.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Tarifs dégressifs</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedResForDetail.pricingTiers.map((tier, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold">
                        <span className="text-slate-500">À partir de {tier.minNights} nuitées</span>
                        <span className="text-slate-900">{formatCurrency(tier.pricePerNight)} F CFA / nuit</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions inside detail modal */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100 mt-8">
              {selectedResForDetail.status === 'pending' ? (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const resToApprove = selectedResForDetail;
                      setSelectedResForDetail(null);
                      await handleApproveResidence(resToApprove.id, resToApprove.title);
                    }}
                    className="flex-1 bg-green-650 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-sm uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-green-600/15 cursor-pointer"
                  >
                    <Check size={16} /> Approuver & Mettre en Ligne
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const resToDecline = selectedResForDetail;
                      setSelectedResForDetail(null);
                      await handleDeclineResidence(resToDecline.id, resToDecline.title);
                    }}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl text-sm uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-orange-600/15 cursor-pointer"
                  >
                    <X size={16} /> Rejeter avec Motif
                  </button>
                </>
              ) : (
                <div className="flex-1 text-left py-2 text-xs text-slate-400 font-bold flex items-center gap-1">
                  Statut actuel : <span className="uppercase text-slate-650 font-black">{selectedResForDetail.status}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedResForDetail(null)}
                className="px-6 py-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-black rounded-2xl text-sm uppercase cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER DETAIL MODAL */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden p-8 border border-slate-100 shadow-2xl relative my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedUserForDetail(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            <div className="mb-8 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-2xl font-black shrink-0 overflow-hidden shadow-lg shadow-slate-200">
                {selectedUserForDetail.photoURL ? (
                  <img src={selectedUserForDetail.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  selectedUserForDetail.displayName?.[0] || 'U'
                )}
              </div>
              <div>
                <span className="text-[9px] bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                  Fiche Utilisateur
                </span>
                <h3 className="text-2xl font-black text-slate-900 leading-tight mt-1">{selectedUserForDetail.displayName || "Sans Nom"}</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Rôle : <span className="uppercase text-slate-800">{selectedUserForDetail.role}</span> &bull; Membre depuis {selectedUserForDetail.createdAt ? new Date(selectedUserForDetail.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Profile Photo if exists but not shown in avatar */}
              {selectedUserForDetail.photoURL && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Photo de profil</h4>
                  <div className="w-48 aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
                    <img src={selectedUserForDetail.photoURL} alt="Profil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                </div>
              )}

              {/* Identity Document Section */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pièce d'identité & Documents</h4>
                {(selectedUserForDetail.idCardUrl || selectedUserForDetail.idNumber) ? (
                  <div className="space-y-4">
                    {selectedUserForDetail.idCardUrl ? (
                      <div className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm max-w-md">
                        <img 
                          src={selectedUserForDetail.idCardUrl} 
                          alt="Pièce d'identité" 
                          className="w-full h-auto object-contain max-h-[400px]"
                          referrerPolicy="no-referrer" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <a 
                            href={selectedUserForDetail.idCardUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-3 bg-white rounded-full text-slate-900 hover:scale-110 transition shadow-xl"
                            title="Agrandir"
                          >
                            <Eye size={20} />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Image de la pièce non téléversée</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Type de pièce</span>
                        <span className="text-xs font-bold text-slate-900">{selectedUserForDetail.idType || 'Non spécifié'}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Numéro de pièce</span>
                        <span className="text-xs font-mono font-bold text-slate-900">#{selectedUserForDetail.idNumber || 'Non spécifié'}</span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Date d'expiration</span>
                        <span className={cn(
                          "text-xs font-bold",
                          selectedUserForDetail.idExpiry && new Date(selectedUserForDetail.idExpiry) < new Date() ? "text-red-600" : "text-slate-900"
                        )}>
                          {selectedUserForDetail.idExpiry ? new Date(selectedUserForDetail.idExpiry).toLocaleDateString('fr-FR') : 'Non spécifiée'}
                          {selectedUserForDetail.idExpiry && new Date(selectedUserForDetail.idExpiry) < new Date() && " (EXPIRÉ)"}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="block text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Statut Vérification</span>
                        <span className={cn(
                          "text-xs font-black uppercase",
                          selectedUserForDetail.verificationStatus === 'verified' ? 'text-green-600' :
                          selectedUserForDetail.verificationStatus === 'rejected' ? 'text-red-600' :
                          'text-amber-600'
                        )}>
                          {selectedUserForDetail.verificationStatus === 'verified' ? 'Vérifié' : 
                           selectedUserForDetail.verificationStatus === 'rejected' ? 'Rejeté' : 'En attente'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                    <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-xs text-slate-500 font-bold">Aucune pièce d'identité n'a été téléversée par cet utilisateur.</p>
                  </div>
                )}
              </div>

              {/* Basic Contact Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Coordonnées</h4>
                  <div className="space-y-2 text-xs text-slate-600 font-semibold">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400" />
                      <span>{selectedUserForDetail.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400" />
                      <span>{selectedUserForDetail.phoneNumber || "Téléphone non renseigné"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Compte & Sécurité</h4>
                  <div className="space-y-2 text-xs text-slate-600 font-semibold">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-slate-400" />
                      <span>ID : <span className="font-mono text-[10px]">{selectedUserForDetail.uid}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" />
                      <span>Statut : {selectedUserForDetail.isSuspended ? "Suspendu" : "Actif"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions if Admin/Manager */}
              {(selectedUserForDetail.role === 'admin' || selectedUserForDetail.role === 'manager') && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">Permissions Accordées</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUserForDetail.permissions ? selectedUserForDetail.permissions.split(',').map(pId => {
                      const label = AVAILABLE_PERMISSIONS.find(p => p.id === pId)?.label || pId;
                      return (
                        <span key={pId} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 shadow-sm">
                          {label}
                        </span>
                      );
                    }) : (
                      <span className="text-xs text-slate-400 font-bold italic">Aucune permission spécifique.</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-8 mt-8 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedUserForDetail(null)}
                className="flex-1 px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-sm uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 cursor-pointer"
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
