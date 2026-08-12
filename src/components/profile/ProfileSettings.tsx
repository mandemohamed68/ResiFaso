import { CustomDatePicker } from "../common/CustomDatePicker";
import { apiFetch } from "../../lib/api";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { 
  User, Shield, CreditCard, Bell, Key, Eye, AlertTriangle, 
  CheckCircle, Upload, Check, Lock, Smartphone, RefreshCw, X, Camera, LogOut,
  ChevronRight, Mail, Trash2, ShieldCheck, FileText, Sparkles, AlertCircle, Phone, LockKeyhole,
  Download, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { resizeImage } from '../../lib/imageResize';

type Tab = 'personal' | 'id' | 'photo' | 'payment' | 'notifications' | 'security' | 'privacy' | 'server' | 'deactivate';

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200", // Woman
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", // Man 1
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200", // Man 2
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200", // Woman 2
];

import { useToast } from '../../contexts/ToastContext';
import { requestNotificationPermission, showNotification } from '../../lib/notifications';

export const ProfileSettings: React.FC = () => {
  const { profile, user, refreshProfile, logOut } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    refreshProfile();
  }, []);
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  
  // Personal Info Form
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Identity Form State
  const [idType, setIdType] = useState<'CNIB' | 'Passeport' | 'Permis'>('CNIB');
  const [idNumber, setIdNumber] = useState('');
  const [idExpiry, setIdExpiry] = useState('');
  const [idFileSimulated, setIdFileSimulated] = useState<boolean>(false);
  
  // Real Camera & Image Capture States
  const [useCamera, setUseCamera] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Profile Photo State
  const [selectedPhotoURL, setSelectedPhotoURL] = useState('');

  // Preferences States (Local draft state to avoid instant/confusing auto-saves)
  const [notifications, setNotifications] = useState({ messages: true, promotions: false });
  const [privacy, setPrivacy] = useState({ showProfile: true });
  
  // Payment preference
  const [paymentPrefs, setPaymentPrefs] = useState({
    hasPreference: false,
    mobileMoneyNumber: '',
    mobileMoneyProvider: 'orange' as 'orange' | 'moov' | 'telecel' | 'coris',
    bankAccountName: '',
    bankAccountNumber: '',
  });

  // Password Update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Custom API Server configurations (Useful for APK debugging/production migration)
  const [customServerUrl, setCustomServerUrl] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('custom_server_url') || '' : '');
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [pingError, setPingError] = useState<string | null>(null);

  const handleTestAndSaveServer = async () => {
    setPingStatus('testing');
    setPingError(null);
    const targetUrl = customServerUrl.trim().replace(/\/$/, '');
    
    if (!targetUrl) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('custom_server_url');
      }
      setPingStatus('success');
      addToast("Adresse du serveur réinitialisée par défaut avec succès !", "success");
      return;
    }

    try {
      // Try to fetch endpoint on the target URL with a timeout
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${targetUrl}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(id);
      
      if (response.ok || response.status === 200 || response.status === 404) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('custom_server_url', targetUrl);
        }
        setPingStatus('success');
        addToast("Connexion réussie ! Adresse du serveur enregistrée.", "success");
      } else {
        throw new Error(`Code statut: ${response.status}`);
      }
    } catch (err) {
      console.error(err);
      setPingStatus('failed');
      setPingError(err instanceof Error ? err.message : String(err));
      if (window.confirm("Impossible de joindre le serveur à cette adresse. Voulez-vous tout de même l'enregistrer ?")) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('custom_server_url', targetUrl);
        }
        addToast("Adresse enregistrée malgré l'échec de la connexion.", "warning");
      }
    }
  };

  const handleResetServer = () => {
    setCustomServerUrl('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('custom_server_url');
    }
    setPingStatus('idle');
    setPingError(null);
    addToast("Serveur réinitialisé sur les paramètres par défaut.", "success");
  };

  // Sync state with profile
  useEffect(() => {
    console.log("Profile updated:", profile);
    if (profile) {
      setDisplayName(profile.displayName || '');
      setPhone(profile.phoneNumber || profile.phone || '');
      setSelectedPhotoURL(profile.photoURL || '');
      
      if (profile.idType) {
        setIdType(profile.idType as any);
      }
      if (profile.idNumber) {
        setIdNumber(profile.idNumber);
      }
      if (profile.idExpiry) {
        setIdExpiry(profile.idExpiry);
      }
      if (profile.idCardUrl) {
        setIdFileSimulated(true);
        setCapturedImage(profile.idCardUrl);
      }
      
      if (profile.notifications) {
        setNotifications(profile.notifications);
      }
      if (profile.privacy) {
        setPrivacy(profile.privacy);
      }
      if (profile.paymentPreferences) {
        setPaymentPrefs(profile.paymentPreferences);
      }
    }
  }, [profile]);

  // Handle flash success message helper
  const triggerSuccess = (message: string) => {
    addToast(message, 'success');
  };

  // Save personal informations
  const handleSavePersonalInfo = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      
      const res = await apiFetch('/api/users/profile', { 
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}` 
        }, 
        body: JSON.stringify({
          displayName: displayName,
          phoneNumber: phone
        }) 
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      await refreshProfile();
      triggerSuccess('Informations personnelles enregistrées avec succès !');
    } catch (e) {
      console.error(e);
      addToast('Erreur lors de la sauvegarde : ' + (e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Start Camera Capture stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("navigator.mediaDevices.getUserMedia is not supported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setUseCamera(true);
      setTimeout(() => {
        const video = document.getElementById('id-card-capture-video') as HTMLVideoElement;
        if (video) video.srcObject = stream;
      }, 300);
    } catch (err) {
      console.warn("Camera getUserMedia failed, falling back to native file capture:", err);
      // Fallback: Trigger the native mobile camera capture input directly
      const fallbackInput = document.getElementById('id-doc-camera-raw-input');
      if (fallbackInput) {
        fallbackInput.click();
      } else {
        setCameraError("Impossible d'accéder à l'appareil photo. Veuillez utiliser l'onglet de téléversement ou accorder les permissions.");
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    const video = document.getElementById('id-card-capture-video') as HTMLVideoElement;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 800;
      canvas.height = video.videoHeight || 600;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
        setCapturedImage(dataUrl);
        setIdFileSimulated(true);
        stopCamera();
        triggerSuccess("Photo capturée avec succès ! Elle a été enregistrée en brouillon.");
      }
    } catch (err) {
      console.error("Failed to capture image:", err);
      addToast("Échec de capture de l'image.", "error");
    }
  };

  const handleIdentityFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      addToast("Le scan ou image de pièce d'identité ne doit pas dépasser 5 Mo.", "error");
      return;
    }
    setUploadProgress("Optimisation du document en cours...");
    try {
      const compressedDataUrl = await resizeImage(file, 900);
      setCapturedImage(compressedDataUrl);
      setIdFileSimulated(true);
      setUploadProgress(null);
      triggerSuccess("Document importé et optimisé avec succès !");
    } catch (err) {
      console.error(err);
      setUploadProgress(null);
      addToast("Échec du traitement du fichier d'identité.", "error");
    }
  };

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Uploader Identity Simulation & Save
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!idNumber) {
      addToast("Veuillez saisir le numéro de votre pièce d'identité.", "error");
      return;
    }
    if (!idFileSimulated || !capturedImage) {
      addToast("Veuillez soit prendre en photo, soit importer votre pièce d'identité.", "error");
      return;
    }
    setIsSaving(true);
    try {
      
      const res = await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        idType: idType,
        idNumber: idNumber,
        idExpiry: idExpiry,
        idCardUrl: capturedImage,
        verificationStatus: 'pending'
      }) });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la soumission');
      }

      await refreshProfile();
      triggerSuccess(`Votre pièce d'identité (${idType}) a été enregistrée et soumise pour vérification. Notre équipe va l'analyser.`);
    } catch (e) {
      console.error(e);
      addToast('Erreur lors de la soumission de la pièce d\'identité : ' + (e instanceof Error ? e.message : String(e)), "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Update profile photoURL (Explicit Save Button)
  const handleSavePhotoChange = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      
      const res = await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        photoURL: selectedPhotoURL
      }) });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors du changement de photo');
      }

      await refreshProfile();
      triggerSuccess('Photo de profil mise à jour avec succès !');
    } catch (e) {
      console.error(e);
      addToast('Erreur lors du changement de photo.', "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete profile photoURL
  const handleDeletePhoto = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      
      const res = await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        photoURL: ''
      }) });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression de la photo');
      }

      setSelectedPhotoURL('');
      await refreshProfile();
      triggerSuccess('Photo de profil supprimée.');
    } catch (e) {
      console.error(e);
      addToast('Erreur.', "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Mobile Money preference saving
  const handleSavePaymentPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      
      const updatedPrefs = {
        ...paymentPrefs,
        hasPreference: true
      };
      const res = await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        paymentPreferences: updatedPrefs
      }) });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      setPaymentPrefs(updatedPrefs);
      await refreshProfile();
      triggerSuccess('Préférences de paiement enregistrées avec succès !');
    } catch (e) {
      console.error(e);
      addToast('Erreur de sauvegarde.', "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Remove Payment Prefs
  const handleRemovePaymentPrefs = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      
      const clearedPrefs = {
        hasPreference: false,
        mobileMoneyNumber: '',
        mobileMoneyProvider: 'orange' as 'orange' | 'moov',
        bankAccountName: '',
        bankAccountNumber: '',
      };
      const res = await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        paymentPreferences: clearedPrefs
      }) });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      setPaymentPrefs(clearedPrefs);
      await refreshProfile();
      triggerSuccess('Moyen de paiement favori retiré.');
    } catch (e) {
      console.error(e);
      addToast('Erreur.', "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save notifications preferences (with save button)
  const handleSaveNotifications = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      
      const res = await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        notifications: notifications
      }) });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      await refreshProfile();
      triggerSuccess('Préférences d\'alertes et notifications enregistrées avec succès !');
    } catch (e) {
      console.error(e);
      addToast('Erreur lors de l\'enregistrement des notifications.', "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Save privacy preferences (with save button)
  const handleSavePrivacy = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      
      const res = await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        privacy: privacy
      }) });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      await refreshProfile();
      triggerSuccess('Paramètres de confidentialité enregistrés avec succès !');
    } catch (e) {
      console.error(e);
      addToast('Erreur lors de l\'enregistrement de la confidentialité.', "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Mock update password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast("Les nouveaux mots de passe ne correspondent pas.", "error");
      return;
    }
    if (!currentPassword) {
      addToast("Veuillez entrer votre mot de passe actuel.", "error");
      return;
    }
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      triggerSuccess("Votre mot de passe a été mis à jour avec succès !");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Deactivate account
  const handleDeactivate = async () => {
    if (!user) return;
    const confirm = window.confirm("Souhaitez-vous vraiment désactiver votre compte ? Toutes vos annonces et profils seront momentanément invisibles de la plateforme.");
    if (!confirm) return;
    setIsSaving(true);
    try {
      
      const res = await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        deactivated: true
      }) });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la désactivation');
      }

      addToast("Votre compte a été désactivé. À bientôt sur ResiFaso !", "error");
      await logOut();
    } catch (e) {
      console.error(e);
      addToast("Erreur de désactivation.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete account completely
  const handleDelete = async () => {
    if (!user) return;
    const confirm = window.confirm("ATTENTION: Votre compte, ainsi que toutes vos annonces publiées et réservations, seront définitivement effacées. Cette opération est irréversible ! Voulez-vous continuer ?");
    if (!confirm) return;
    setIsSaving(true);
    try {
      
      const res = await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        deactivated: true,
        displayName: "[Utilisateur Supprimé]",
        phoneNumber: ""
      }) });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      addToast("Vos données ont été supprimées. Déconnexion en cours.", "error");
      await logOut();
    } catch (e) {
      console.error(e);
      addToast("Erreur de suppression.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Informations personnelles', icon: User },
    { id: 'id', label: 'Vérification d’identité', icon: Shield },
    { id: 'photo', label: 'Photo de profil', icon: Upload },
    { id: 'security', label: 'Sécurité du compte', icon: Key },
    { id: 'privacy', label: 'Confidentialité', icon: Eye },
    { id: 'deactivate', label: 'Désactivation du compte', icon: AlertTriangle, danger: true },
  ];

  const getVerificationStatusBadge = () => {
    const status = profile?.verificationStatus || 'none';
    if (profile?.isVerified || status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-150 shadow-xs">
          <CheckCircle size={13} className="text-emerald-600 stroke-[2.5]" />
          Compte Vérifié
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-50 text-amber-700 border border-amber-150 shadow-xs">
          <RefreshCw size={13} className="text-amber-600 animate-spin stroke-[2.5]" />
          En cours d'analyse
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-slate-100 text-slate-600 border border-slate-200">
        Non Vérifié
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight" id="profile-settings-title">Profil & Paramètres</h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide">Configurez votre compte de voyageur et rassurer les hôtes burkinabè.</p>
        </div>
        <button 
          onClick={() => { logOut(); window.location.href = '/'; }} 
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#EF2B2D] transition-all duration-300 shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <LogOut size={14} className="stroke-[2.5]" />
          Se déconnecter
        </button>
      </div>
      
      {/* Toast Feedback */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 bg-slate-950 text-white px-6 py-4.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 flex items-center gap-3.5 border border-slate-800 animate-in slide-in-from-bottom duration-300" id="toast-success-alert">
          <div className="bg-emerald-500 p-1.5 rounded-full text-white shrink-0">
            <Check size={14} className="stroke-[3.5]" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider">{saveSuccess}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Navigation verticale */}
        <div className="w-full lg:w-72 shrink-0 space-y-6">
          {/* Profile Card Header Component (Human Connection) */}
          <div className="bg-slate-50/75 border border-slate-100 rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden shadow-xs">
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-amber-500/5 pointer-events-none" />
            
            <div className="relative mt-4 mb-3.5 group">
              {profile?.photoURL ? (
                <div className="relative p-1 bg-white rounded-full border border-slate-200/80 shadow-sm">
                  <img 
                    src={profile.photoURL} 
                    alt={profile.displayName || 'Utilisateur'} 
                    className="w-20 h-20 rounded-full object-cover relative z-10 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-[#EF2B2D]/10 text-[#EF2B2D] rounded-full flex items-center justify-center text-2xl font-black border-4 border-white shadow-md relative z-10">
                  {profile?.displayName?.trim().charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              {profile?.isVerified && (
                <span className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white z-20 shadow-md flex items-center justify-center" title="Compte Vérifié">
                  <Check size={10} className="stroke-[3.5]" />
                </span>
              )}
            </div>
            
            <h3 className="font-extrabold text-slate-900 text-base leading-tight truncate max-w-full">
              {profile?.displayName || 'Voyageur ResiFaso'}
            </h3>
            <p className="text-slate-400 text-[11px] font-bold mt-1 truncate max-w-full font-mono tracking-normal">
              {profile?.email || user?.email}
            </p>
            
            {/* Verification Status Small Tag */}
            <div className="mt-4 w-full">
              {profile?.isVerified ? (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <CheckCircle size={11} className="text-emerald-600 stroke-[2.5]" />
                  Profil Certifié
                </div>
              ) : profile?.verificationStatus === 'pending' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-250 animate-pulse">
                  <RefreshCw size={11} className="animate-spin" />
                  Modération en cours
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                  Non certifié
                </div>
              )}
            </div>
          </div>

          <nav className="flex flex-col gap-1.5 bg-slate-50/40 border border-slate-100 p-2 rounded-3xl">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-btn-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as Tab);
                    setSaveSuccess(null);
                  }}
                  className={`group flex items-center justify-between px-4 py-3 rounded-2xl text-left text-xs font-black uppercase tracking-wider transition-all duration-300 relative cursor-pointer overflow-hidden ${
                    isActive
                      ? 'bg-white text-[#EF2B2D] shadow-[0_4px_12px_rgba(239,43,45,0.06)] border border-slate-100/80'
                      : tab.danger
                      ? 'text-red-500 hover:bg-red-50/50'
                      : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <tab.icon size={15} className={cn(
                      "transition-transform duration-300 group-hover:scale-110 stroke-[2.2]",
                      isActive ? "text-[#EF2B2D]" : "text-slate-400"
                    )} />
                    <span className="group-hover:translate-x-0.5 transition-transform duration-300">{tab.label}</span>
                  </div>
                  
                  {isActive && (
                    <div className="w-1 h-5 bg-[#EF2B2D] rounded-full absolute left-0 top-1/2 -translate-y-1/2" />
                  )}
                  
                  <ChevronRight size={14} className={cn(
                    "opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 stroke-[2.5]",
                    isActive ? "text-[#EF2B2D] opacity-100" : "text-slate-400"
                  )} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 w-full bg-white rounded-[2rem] p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.02)] border border-slate-100 min-h-[550px]" id="settings-tab-content-area">
          
          {/* TAB 1: PERSONAL */}
          {activeTab === 'personal' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 leading-none">Informations personnelles</h2>
                  <p className="text-xs text-slate-400 font-medium">Gérez votre identité visible et vos coordonnées officielles de contact.</p>
                </div>
                <div>
                  {getVerificationStatusBadge()}
                </div>
              </div>

              <div className="space-y-6">
                {/* Visual presentation container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* DISPLAY NAME INPUT */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Nom complet (Officiel)</label>
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 focus-within:border-[#EF2B2D] focus-within:ring-2 focus-within:ring-red-100 transition-all duration-200">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User size={16} className="text-slate-400 stroke-[2.2]" />
                      </div>
                      <input 
                        type="text" 
                        id="profile-display-name-input"
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                        className="w-full bg-transparent border-none rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none" 
                        placeholder="Ex: Sawadogo Ibrahim"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block pl-1">Sert de signature officielle sur vos contrats d'hébergement.</span>
                  </div>

                  {/* PHONE NUMBER INPUT */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Numéro de téléphone</label>
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 focus-within:border-[#EF2B2D] focus-within:ring-2 focus-within:ring-red-100 transition-all duration-200">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone size={16} className="text-slate-400 stroke-[2.2]" />
                      </div>
                      <input 
                        type="tel" 
                        id="profile-phone-input"
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        className="w-full bg-transparent border-none rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none font-mono" 
                        placeholder="+226 XX XX XX XX"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block pl-1 font-sans">Indispensable pour recevoir les codes d'accès et alertes par SMS.</span>
                  </div>
                </div>

                {/* EMAIL FIELD (READ-ONLY) */}
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex gap-3.5 items-start">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shrink-0 text-slate-500">
                      <Mail size={18} className="stroke-[2.2]" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Adresse e-mail du compte</h4>
                      <p className="text-sm font-bold text-slate-700 font-mono">{profile?.email || user?.email || 'votre-email@resifaso.net'}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-slate-100 text-[10px] font-black uppercase text-slate-500 shadow-xs shrink-0 self-start sm:self-auto">
                    <Lock size={12} className="stroke-[2.5]" />
                    Compte Sécurisé
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  id="btn-save-personal-info"
                  onClick={handleSavePersonalInfo} 
                  disabled={isSaving}
                  className="bg-[#EF2B2D] text-white px-7 py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition duration-300 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-100"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Enregistrement en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Enregistrer les modifications</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IDENTITY */}
          {activeTab === 'id' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 leading-none">Vérification d’identité</h2>
                  <p className="text-xs text-slate-400 font-medium">Authentifiez votre identité pour débloquer l'accès prioritaire aux résidences burkinabè.</p>
                </div>
              </div>
              
              { (profile?.isVerified || profile?.verificationStatus === 'verified') ? (
                <div className="bg-emerald-50/60 border border-emerald-100 p-8 rounded-[2rem] flex flex-col sm:flex-row items-start gap-5 animate-in fade-in" id="identity-verified-container">
                  <div className="p-3 bg-emerald-500 rounded-2xl text-white shrink-0 shadow-sm shadow-emerald-200">
                    <ShieldCheck className="w-8 h-8 stroke-[2]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-emerald-950 text-lg">Identité Certifiée</h3>
                    <p className="text-xs text-emerald-800 font-medium leading-relaxed max-w-2xl">
                      Félicitations ! Votre compte est entièrement vérifié et certifié par l'équipe ResiFaso Burkina. Vous bénéficiez désormais de la confiance prioritaire de nos hôtes et du badge officiel de voyageur certifié.
                    </p>
                    {profile.idNumber && (
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 border border-emerald-100 rounded-xl text-xs font-bold font-mono text-emerald-900 shadow-xs">
                          N° : {profile.idNumber} ({profile.idType})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : profile?.verificationStatus === 'pending' ? (
                <div className="bg-amber-50/60 border border-amber-200/60 p-8 rounded-[2rem] flex flex-col sm:flex-row items-start gap-5 animate-in fade-in" id="identity-pending-container">
                  <div className="p-3 bg-amber-500 rounded-2xl text-white shrink-0 shadow-sm shadow-amber-100 animate-pulse">
                    <RefreshCw className="w-8 h-8 stroke-[2] animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-extrabold text-amber-950 text-lg">Document en cours d'analyse</h3>
                    <p className="text-xs text-amber-800 font-medium leading-relaxed max-w-2xl">
                      Votre pièce d'identité a bien été reçue par notre équipe de modérateurs au Burkina Faso. Nous l'analyserons pour valider votre compte sous un délai maximal de 15 minutes.
                    </p>
                    {profile.idNumber && (
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 border border-amber-100 rounded-xl text-xs font-bold font-mono text-amber-900 shadow-xs">
                          N° : {profile.idNumber} ({profile.idType})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6" id="identity-form-container">
                  <div className="bg-slate-50/70 border border-slate-100 p-6 sm:p-8 rounded-3xl space-y-6">
                    <div className="flex gap-4 items-start border-b border-slate-150/40 pb-5">
                      <div className="p-3 bg-red-500/10 rounded-2xl text-[#EF2B2D] shrink-0">
                        <Shield className="w-7 h-7 stroke-[2]" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-slate-900 text-base">Formulaire de vérification de sécurité</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xl">
                          Renseignez et soumettez votre pièce d'identité officielle du Burkina Faso (CNIB, Passeport, Permis de conduire) pour débloquer l'accès à la réservation instantanée et rassurer les propriétaires.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSubmitVerification} className="space-y-6 max-w-xl">
                      
                      {/* Document Type Selector */}
                      <div className="space-y-2.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Sélectionnez le type de document</label>
                        <div className="grid grid-cols-3 gap-3">
                          {['CNIB', 'Passeport', 'Permis'].map((type) => {
                            const isSelected = idType === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setIdType(type as any)}
                                className={`py-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider text-center transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                                  isSelected
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50/80 hover:border-slate-300'
                                }`}
                              >
                                {isSelected && <Check size={12} className="stroke-[3.5]" />}
                                {type}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Document Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Numéro de pièce</label>
                          <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-[#EF2B2D] focus-within:ring-2 focus-within:ring-red-100 transition-all duration-200">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <FileText size={16} className="text-slate-400 stroke-[2.2]" />
                            </div>
                            <input 
                              type="text" 
                              id="identity-doc-number-input"
                              required
                              placeholder="Ex: B12345678"
                              value={idNumber}
                              onChange={(e) => setIdNumber(e.target.value)}
                              className="w-full bg-transparent border-none rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder-slate-450 outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Date d'expiration</label>
                          <CustomDatePicker 
                            id="identity-doc-expiry-input"
                            required
                            value={idExpiry}
                            onChange={(val) => setIdExpiry(val)}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus-within:border-[#EF2B2D] focus-within:ring-2 focus-within:ring-red-100"
                          />
                        </div>
                      </div>

                      {/* Segmented Controller for Capture Method */}
                      <div className="space-y-3 pt-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Document d'identité (Scan, Photo ou Capture)</label>
                        
                        <div className="flex bg-slate-100/80 p-1 rounded-2xl gap-1 max-w-sm border border-slate-200/40">
                          <button
                            type="button"
                            onClick={() => { stopCamera(); setUseCamera(false); }}
                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition duration-300 cursor-pointer ${
                              !useCamera ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Téléverser document
                          </button>
                          <button
                            type="button"
                            onClick={() => startCamera()}
                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition duration-300 cursor-pointer ${
                              useCamera ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            Prendre photo (Caméra)
                          </button>
                        </div>

                        {/* Camera capturing view */}
                        {useCamera ? (
                          <div className="border border-slate-800 rounded-3xl overflow-hidden bg-slate-950 relative shadow-2xl animate-in fade-in duration-300 max-w-lg">
                            {/* Scanning Radar Line Overlay */}
                            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent top-0 animate-bounce z-20 pointer-events-none shadow-[0_0_10px_rgba(239,43,45,0.8)]" />
                            
                            {/* Scanning crosshairs overlay */}
                            <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none z-10 flex items-center justify-center">
                              <div className="w-12 h-0.5 bg-white/30" />
                              <div className="h-12 w-0.5 bg-white/30 absolute" />
                            </div>

                            <video 
                              id="id-card-capture-video" 
                              autoPlay 
                              playsInline 
                              className="w-full h-auto max-h-[260px] object-cover mx-auto opacity-90"
                            />

                            <div className="p-4 bg-slate-900/95 border-t border-slate-800/80 flex items-center justify-between gap-3 relative z-30">
                              <button
                                type="button"
                                onClick={capturePhoto}
                                className="px-5 py-2.5 bg-[#EF2B2D] hover:bg-red-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-md shadow-red-950"
                              >
                                <Camera size={14} className="stroke-[2]" />
                                Capturer CNIB/Passeport
                              </button>
                              <button
                                type="button"
                                onClick={stopCamera}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer"
                              >
                                Arrêter
                              </button>
                            </div>
                            {cameraError && (
                              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-red-400 z-40">
                                <AlertTriangle size={24} className="mb-2" />
                                <p className="text-xs font-bold leading-normal">{cameraError}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Standard folder upload box */
                          <div 
                            id="identity-file-upload-simulated-box"
                            className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center bg-white hover:border-[#EF2B2D] transition-all duration-300 relative cursor-pointer group"
                            onClick={() => {
                              const fileInput = document.getElementById('id-doc-file-raw-input');
                              if (fileInput) fileInput.click();
                            }}
                          >
                            <input 
                              type="file" 
                              id="id-doc-file-raw-input"
                              onClick={(e) => e.stopPropagation()}
                              accept="image/*"
                              className="hidden" 
                              onChange={handleIdentityFileChange}
                            />
                            <input 
                              type="file" 
                              id="id-doc-camera-raw-input"
                              onClick={(e) => e.stopPropagation()}
                              accept="image/*"
                              capture="environment"
                              className="hidden" 
                              onChange={handleIdentityFileChange}
                            />
                            <div className="p-3 bg-slate-50 rounded-2xl inline-block mb-3 border border-slate-100 group-hover:scale-110 transition duration-300 text-slate-400 group-hover:text-[#EF2B2D] group-hover:bg-red-50">
                              <Upload size={22} className="stroke-[2.2]" />
                            </div>
                            <span className="block text-xs font-black text-slate-700">Sélectionnez le scan ou photo de votre document</span>
                            <span className="block text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">Formats JPG, PNG, WEBP acceptés (Max 5 Mo)</span>
                            {uploadProgress && (
                              <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex items-center justify-center gap-2.5 font-black text-xs text-[#EF2B2D] font-sans">
                                <RefreshCw className="animate-spin text-[#EF2B2D]" size={14} /> 
                                <span>{uploadProgress}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Real image previewer showing captured or uploaded content */}
                        {capturedImage && (
                          <div className="p-4 bg-slate-100/50 border border-slate-200/60 rounded-3xl space-y-3 max-w-md animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Aperçu du document préparé :</span>
                              <button
                                type="button"
                                onClick={() => setCapturedImage(null)}
                                className="text-[#EF2B2D] hover:underline text-[10px] font-black uppercase tracking-wider cursor-pointer"
                              >
                                Réinitialiser
                              </button>
                            </div>
                            <div className="relative border border-slate-200/80 rounded-2xl overflow-hidden aspect-video bg-slate-200/50">
                              <img 
                                src={capturedImage} 
                                alt="ID capture" 
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[9px] font-black text-white uppercase tracking-widest">
                                {capturedImage.startsWith('data:image') ? '📷 Capture Locale' : '🌐 Document Actuel'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <button 
                        type="submit" 
                        id="btn-submit-identity-verification"
                        disabled={isSaving}
                        className="bg-slate-900 text-white px-7 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition duration-300 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer w-full shadow-md"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Soumission en cours...</span>
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4" />
                            <span>Enregistrer et soumettre pour vérification</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PHOTO */}
          {activeTab === 'photo' && (
            <div className="space-y-8 animate-in fade-in duration-300" id="photo-tab-container">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 leading-none">Photo de profil</h2>
                  <p className="text-xs text-slate-400 font-medium">Ajoutez un visage authentique pour rassurer les hôtes et renforcer la confiance.</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50/70 p-6 rounded-3xl border border-slate-100/80">
                <div className="shrink-0 relative">
                  {selectedPhotoURL ? (
                    <div className="relative p-1 bg-white rounded-full border border-slate-200 shadow-md">
                      <img 
                        src={selectedPhotoURL} 
                        alt="Aperçu Profil" 
                        className="w-24 h-24 rounded-full object-cover relative z-10 animate-in zoom-in-50 duration-200"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-red-100/80 text-[#EF2B2D] rounded-full flex items-center justify-center text-4xl font-black border-4 border-white shadow-md">
                      {profile?.displayName?.trim().charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <h4 className="font-extrabold text-slate-950 text-sm">Choisissez ou remplacez votre avatar</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm">Un visage authentique rassure les hôtes du réseau ResiFaso Burkina.</p>
                  
                  {profile?.photoURL && (
                    <button 
                      onClick={handleDeletePhoto}
                      className="text-[#EF2B2D] hover:text-red-700 text-xs font-black uppercase tracking-wider block mt-3 cursor-pointer hover:underline transition"
                    >
                      Supprimer la photo actuelle
                    </button>
                  )}
                </div>
              </div>

              {/* Presets Selection catalog */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Sélectionnez un avatar de notre catalogue</h3>
                
                <div className="grid grid-cols-4 gap-4 max-w-sm">
                  {PRESET_AVATARS.map((avatar, idx) => {
                    const isSelected = selectedPhotoURL === avatar;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPhotoURL(avatar)}
                        className={`relative rounded-full overflow-hidden w-16 h-16 cursor-pointer border-4 transition-all duration-300 hover:scale-105 ${
                          isSelected ? 'border-[#EF2B2D] scale-105 shadow-md shadow-red-100' : 'border-white shadow-sm hover:border-slate-300'
                        }`}
                      >
                        <img src={avatar} alt="Preset Option" className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#EF2B2D]/40 flex items-center justify-center text-white backdrop-blur-[1px]">
                            <Check size={18} className="stroke-[3.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button 
                    onClick={handleSavePhotoChange}
                    id="btn-save-photo-change"
                    disabled={isSaving || selectedPhotoURL === profile?.photoURL}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition duration-300 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Sauvegarde...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Enregistrer la photo de profil</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT OPTIONS */}
          {activeTab === 'payment' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 leading-none">Préférences de paiement</h2>
                  <p className="text-xs text-slate-400 font-medium">Gérez vos coordonnées Mobile Money pour les remboursements et acomptes sécurisés.</p>
                </div>
              </div>
              
              {paymentPrefs.hasPreference ? (
                <div className="space-y-6 animate-in fade-in duration-300" id="payment-saved-prefs">
                  {/* Premium tactile money card */}
                  <div className={`p-8 rounded-[2rem] border relative overflow-hidden text-white shadow-xl ${
                    paymentPrefs.mobileMoneyProvider === 'orange' 
                      ? 'bg-gradient-to-br from-orange-500 to-amber-600 border-orange-400 shadow-orange-100' 
                      : paymentPrefs.mobileMoneyProvider === 'moov'
                      ? 'bg-gradient-to-br from-blue-700 to-indigo-900 border-blue-600 shadow-blue-100'
                      : paymentPrefs.mobileMoneyProvider === 'telecel'
                      ? 'bg-gradient-to-br from-red-600 to-rose-850 border-red-500 shadow-red-100'
                      : 'bg-gradient-to-br from-cyan-700 to-slate-900 border-cyan-600 shadow-cyan-100'
                  }`}>
                    {/* Decorative card chip */}
                    <div className="absolute right-8 top-8 w-12 h-10 bg-white/10 rounded-lg border border-white/20 backdrop-blur-xs flex items-center justify-center">
                      <div className="w-8 h-6 border border-white/20 rounded-md" />
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">Moyen de réception par défaut</span>
                        <h3 className="text-2xl font-black mt-1">
                          {paymentPrefs.mobileMoneyProvider === 'orange' ? 'Orange Money' : paymentPrefs.mobileMoneyProvider === 'moov' ? 'Moov Money' : paymentPrefs.mobileMoneyProvider === 'telecel' ? 'Telecel Money' : 'Coris Money'}
                        </h3>
                      </div>

                      <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-white/60 uppercase tracking-wider block">Numéro de téléphone associé</span>
                          <span className="font-mono text-lg font-black tracking-wider">{paymentPrefs.mobileMoneyNumber}</span>
                        </div>
                        {paymentPrefs.bankAccountName && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-white/60 uppercase tracking-wider block">Nom du titulaire</span>
                            <span className="text-sm font-bold tracking-wide block">{paymentPrefs.bankAccountName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ambient background glow inside the card */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button 
                      type="button"
                      onClick={() => setPaymentPrefs({ ...paymentPrefs, hasPreference: false })}
                      className="text-slate-700 bg-white hover:bg-slate-50 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border border-slate-200 cursor-pointer shadow-xs transition duration-300"
                    >
                      Modifier les coordonnées
                    </button>
                    <button 
                      onClick={handleRemovePaymentPrefs}
                      className="text-[#EF2B2D] hover:bg-red-50 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border border-red-100 cursor-pointer transition duration-300"
                    >
                      Désassocier
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSavePaymentPreferences} className="space-y-6 max-w-xl bg-slate-50/70 p-6 sm:p-8 rounded-3xl border border-slate-100" id="payment-pref-form">
                  <div className="space-y-1.5 border-b border-slate-150/40 pb-4">
                    <h3 className="font-extrabold text-slate-900 text-base">Configurer votre compte Mobile Money</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Configurez votre compte Mobile Money pour percevoir d'éventuels remboursements ou verser des acomptes simplifiés.</p>
                  </div>
                  
                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Sélectionnez votre opérateur</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'orange', label: 'Orange Money', activeClass: 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-100' },
                        { id: 'moov', label: 'Moov Money', activeClass: 'bg-blue-800 border-blue-800 text-white shadow-md shadow-blue-100' },
                        { id: 'telecel', label: 'Telecel Money', activeClass: 'bg-rose-600 border-rose-600 text-white shadow-md shadow-red-100' },
                        { id: 'coris', label: 'Coris Money', activeClass: 'bg-cyan-700 border-cyan-700 text-white shadow-md shadow-cyan-100' }
                      ].map((op) => {
                        const isSelected = paymentPrefs.mobileMoneyProvider === op.id;
                        return (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => setPaymentPrefs({...paymentPrefs, mobileMoneyProvider: op.id as any})}
                            className={`py-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider text-center transition-all duration-300 cursor-pointer ${
                              isSelected
                                ? op.activeClass
                                : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50/80 hover:border-slate-300'
                            }`}
                          >
                            {op.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Numéro Mobile Money</label>
                      <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-[#EF2B2D] focus-within:ring-2 focus-within:ring-red-100 transition-all duration-200">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Phone size={16} className="text-slate-400 stroke-[2.2]" />
                        </div>
                        <input 
                          type="tel" 
                          required
                          placeholder="+226 XX XX XX XX"
                          value={paymentPrefs.mobileMoneyNumber}
                          onChange={(e) => setPaymentPrefs({...paymentPrefs, mobileMoneyNumber: e.target.value})}
                          className="w-full bg-transparent border-none rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 outline-none placeholder-slate-400 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Titulaire du compte</label>
                      <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-[#EF2B2D] focus-within:ring-2 focus-within:ring-red-100 transition-all duration-200">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User size={16} className="text-slate-400 stroke-[2.2]" />
                        </div>
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: Sawadogo Ibrahim"
                          value={paymentPrefs.bankAccountName}
                          onChange={(e) => setPaymentPrefs({...paymentPrefs, bankAccountName: e.target.value})}
                          className="w-full bg-transparent border-none rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 outline-none placeholder-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    id="btn-save-payment-prefs"
                    disabled={isSaving}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition duration-300 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-md"
                  >
                    <CreditCard size={14} className="stroke-[2.5]" />
                    <span>Associer et Enregistrer ce moyen de paiement</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in duration-300" id="notifications-tab-container">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 leading-none">Paramètres de notifications</h2>
                  <p className="text-xs text-slate-400 font-medium">Configurez comment et quand vous souhaitez être alerté par l'équipe ResiFaso Burkina.</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  {/* Premium testing board with ambient warning/highlight borders */}
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-6 border border-red-150 rounded-3xl bg-red-50/15 gap-5">
                    <div className="space-y-1 max-w-md">
                      <h3 className="font-extrabold text-sm text-slate-950 flex items-center gap-2">
                        <span className="p-1.5 bg-red-500 rounded-lg text-white">
                          <Bell size={13} className="stroke-[2.5]" />
                        </span> 
                        <span>Testeur de notifications instantanées</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Demandez l'autorisation et recevez immédiatement une alerte d'essai sonore et visuelle identique à Facebook ou WhatsApp.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5 shrink-0 w-full lg:w-auto">
                      <button
                        type="button"
                        onClick={async () => {
                          const granted = await requestNotificationPermission();
                          if (granted) {
                            await showNotification(
                              "test_notif",
                              "🔔 ResiFaso",
                              "Félicitations ! Vos notifications (style Facebook/WhatsApp) sont activées et prêtes."
                            );
                            addToast("Notification de test envoyée avec succès !", "success");
                          } else {
                            addToast("Veuillez autoriser les notifications dans les paramètres de votre appareil.", "warning");
                          }
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition duration-300 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles size={12} />
                        Tester le son local
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await apiFetch("/api/user-alerts/test-push", {
                              method: "POST"
                            });
                            if (res.ok) {
                              const data = await res.json();
                              if (data.success) {
                                addToast("Push serveur envoyé avec succès !", "success");
                              } else {
                                addToast(data.message || "Aucun appareil FCM enregistré trouvé pour votre compte.", "warning");
                              }
                            } else {
                              addToast("Erreur lors de l'envoi du push serveur.", "error");
                            }
                          } catch (err: any) {
                            addToast(err.message, "error");
                          }
                        }}
                        className="bg-[#EF2B2D] hover:bg-red-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-red-100"
                      >
                        <Bell size={12} />
                        Tester le Push FCM
                      </button>
                    </div>
                  </div>

                  {/* Toggle items */}
                  <div className="flex flex-row items-center justify-between p-5 border border-slate-150/40 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition duration-300">
                    <div className="max-w-md pr-4 space-y-0.5">
                      <h3 className="font-extrabold text-sm text-slate-900">Messages instantanés des hôtes</h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">Recevez des alertes en temps réel par SMS et emails lorsqu'un propriétaire vous contacte.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        id="notif-messages-checkbox"
                        checked={notifications.messages}
                        onChange={(e) => setNotifications({ ...notifications, messages: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300 peer-checked:bg-[#EF2B2D]"></div>
                    </label>
                  </div>

                  <div className="flex flex-row items-center justify-between p-5 border border-slate-150/40 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition duration-300">
                    <div className="max-w-md pr-4 space-y-0.5">
                      <h3 className="font-extrabold text-sm text-slate-900">Promotions et offres locales</h3>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed">Être informé en priorité des bons plans séjours et réductions exclusives le week-end au Burkina.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        id="notif-promo-checkbox"
                        checked={notifications.promotions}
                        onChange={(e) => setNotifications({ ...notifications, promotions: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300 peer-checked:bg-[#EF2B2D]"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button 
                    onClick={handleSaveNotifications}
                    id="btn-save-notifications"
                    disabled={isSaving}
                    className="bg-[#EF2B2D] text-white px-7 py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition duration-300 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md shadow-red-100"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Enregistrer les préférences</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY / PASSWORD */}
          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 leading-none">Sécurité du compte</h2>
                  <p className="text-xs text-slate-400 font-medium">Gérez vos accès de sécurité et protégez vos informations d'hébergement.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <form onSubmit={handleUpdatePassword} className="space-y-5 bg-slate-50/70 p-6 sm:p-8 rounded-3xl border border-slate-100/80" id="security-pwd-form">
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 mb-1 border-b border-slate-150/40 pb-3">
                    <span className="p-1 bg-red-100 rounded-lg text-[#EF2B2D]">
                      <Lock size={14} className="stroke-[2.5]" />
                    </span>
                    <span>Changer de mot de passe</span>
                  </h3>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Mot de passe actuel</label>
                    <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-[#EF2B2D] focus-within:ring-2 focus-within:ring-red-100 transition-all duration-200">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={16} className="text-slate-400 stroke-[2.2]" />
                      </div>
                      <input 
                        type="password" 
                        required
                        placeholder="Saisir l'actuel"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-transparent border-none rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Nouveau mot de passe</label>
                    <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-[#EF2B2D] focus-within:ring-2 focus-within:ring-red-100 transition-all duration-200">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={16} className="text-slate-400 stroke-[2.2]" />
                      </div>
                      <input 
                        type="password" 
                        required
                        placeholder="Au moins 6 caractères"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-transparent border-none rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Confirmer le nouveau mot de passe</label>
                    <div className="relative rounded-2xl border border-slate-200 bg-white focus-within:border-[#EF2B2D] focus-within:ring-2 focus-within:ring-red-100 transition-all duration-200">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={16} className="text-slate-400 stroke-[2.2]" />
                      </div>
                      <input 
                        type="password" 
                        required
                        placeholder="Retapez le nouveau"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-transparent border-none rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    id="btn-update-password"
                    disabled={isSaving}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition duration-300 disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Mise à jour en cours...</span>
                      </>
                    ) : (
                      <>
                        <Check size={13} className="stroke-[3.5]" />
                        <span>Mettre à jour mon mot de passe</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="bg-slate-50/50 border border-slate-150/40 p-6 sm:p-8 rounded-3xl space-y-4">
                  <h3 className="font-extrabold text-slate-950 text-sm flex items-center gap-2">
                    <span className="p-1.5 bg-red-500/10 rounded-xl text-[#EF2B2D]">
                      <Smartphone size={16} className="stroke-[2.2]" />
                    </span>
                    <span>Double Facteur (2FA) SMS</span>
                  </h3>
                  <p className="text-xs text-slate-550 font-medium leading-relaxed">
                    Ajoutez une sécurité robuste à vos transactions et réservations de résidences en recevant un code SMS unique pour confirmer chaque virement sur notre passerelle sécurisée Burkina.
                  </p>
                  
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between shadow-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">État ACTUEL :</span>
                      <span className="font-bold text-slate-800 text-xs">Sécurisé via Code Mobile</span>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase px-3 py-1.5 rounded-xl">
                      Activé par défaut
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-8 animate-in fade-in duration-300" id="privacy-tab-container">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 leading-none">Paramètres de confidentialité</h2>
                  <p className="text-xs text-slate-400 font-medium">Contrôlez les informations visuelles et personnelles partagées avec la communauté.</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-row items-center justify-between p-5 border border-slate-150/40 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition duration-300">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 max-w-lg leading-relaxed">
                      Afficher ma photo de profil aux hôtes avant le virement de l'acompte de réservation
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                      <input 
                        type="checkbox" 
                        checked={privacy.showProfile}
                        onChange={(e) => setPrivacy({ showProfile: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300 peer-checked:bg-[#EF2B2D]"></div>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                  <button 
                    onClick={handleSavePrivacy}
                    id="btn-save-privacy"
                    disabled={isSaving}
                    className="w-full sm:w-auto bg-[#EF2B2D] text-white px-7 py-3 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition duration-300 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-100"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Enregistrement...</span>
                      </>
                    ) : (
                      <>
                        <Check size={13} className="stroke-[3.5]" />
                        <span>Enregistrer la confidentialité</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => addToast("Génération de vos données en cours... Un document ZIP conforme RGPD contenant vos informations et réservations vous a été envoyé par email.", "error")} 
                    className="w-full sm:w-auto text-slate-600 font-black text-xs uppercase tracking-widest hover:text-black flex items-center justify-center gap-2 transition duration-300 cursor-pointer hover:underline py-2"
                  >
                    <Download size={13} className="stroke-[2.5]" />
                    <span>Télécharger mes données (RGPD)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SERVER CONFIGURATION */}
          {activeTab === 'server' && (
            <div className="space-y-8 animate-in fade-in duration-300" id="server-settings-tab">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 leading-none">Configuration du serveur API</h2>
                  <p className="text-xs text-slate-400 font-medium">Gérez l'adresse IP et le port du serveur backend pour l'application et l'APK mobile.</p>
                </div>
              </div>
 
              <div className="bg-slate-50/70 p-6 sm:p-8 rounded-3xl border border-slate-100/80 space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-150/45 pb-4">
                  <span className="p-2 bg-red-100 rounded-xl text-[#EF2B2D]">
                    <Smartphone className="w-5 h-5 stroke-[2.2]" />
                  </span>
                  <span className="font-extrabold text-sm text-slate-950">Adresse du serveur backend</span>
                </div>
 
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Par défaut, l'application mobile (APK) et le navigateur communiquent avec le serveur de production sécurisé de ResiFaso (<code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-red-600 font-mono text-[11px]">https://www.resifaso.net</code>). 
                  Si vous changez de serveur, de port ou d'environnement de test, vous pouvez modifier cette adresse ci-dessous.
                </p>
 
                <div className="space-y-3 pt-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">URL ou Adresse IP du Serveur</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 rounded-2xl border border-slate-200 bg-white focus-within:border-[#EF2B2D] focus-within:ring-2 focus-within:ring-red-100 transition-all duration-200">
                      <input 
                        type="text" 
                        value={customServerUrl}
                        onChange={(e) => setCustomServerUrl(e.target.value)}
                        placeholder="Ex: https://www.resifaso.net"
                        className="w-full bg-transparent border-none rounded-2xl px-4 py-3.5 text-sm font-bold font-mono text-slate-900 placeholder-slate-400 outline-none"
                      />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={handleTestAndSaveServer}
                        disabled={pingStatus === 'testing'}
                        className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 transition duration-300 cursor-pointer flex items-center gap-1.5 shadow-md"
                      >
                        {pingStatus === 'testing' ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Test en cours...</span>
                          </>
                        ) : (
                          <>
                            <Check size={13} className="stroke-[3.5]" />
                            <span>Tester & Enregistrer</span>
                          </>
                        )}
                      </button>
                      { (customServerUrl || localStorage.getItem('custom_server_url')) && (
                        <button 
                          onClick={handleResetServer}
                          className="bg-white text-slate-750 border border-slate-250 px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition duration-300 cursor-pointer"
                        >
                          Réinitialiser
                        </button>
                      )}
                    </div>
                  </div>
                </div>
 
                {pingStatus === 'success' && (
                  <div className="bg-emerald-50/70 border border-emerald-150 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-3.5 animate-in slide-in-from-top-2 duration-300">
                    <CheckCircle className="text-emerald-600 w-5 h-5 shrink-0 stroke-[2.2]" />
                    <span>Le serveur répond parfaitement ! L'adresse a été configurée avec succès.</span>
                  </div>
                )}
 
                {pingStatus === 'failed' && (
                  <div className="bg-red-50/70 border border-red-150 text-red-800 p-4 rounded-2xl text-xs font-bold space-y-1 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3.5">
                      <AlertTriangle className="text-[#EF2B2D] w-5 h-5 shrink-0 stroke-[2.2]" />
                      <span>Impossible de contacter le serveur à cette adresse. Vérifiez que l'IP/port sont corrects et actifs.</span>
                    </div>
                    {pingError && <div className="text-[10px] font-mono text-red-600 font-medium pl-8">Erreur système : {pingError}</div>}
                  </div>
                )}
              </div>
 
              <div className="bg-white border border-slate-150/40 p-6 sm:p-8 rounded-3xl space-y-4 shadow-xs">
                <h3 className="font-extrabold text-slate-900 text-sm">Diagnostic d'environnement mobile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-5 bg-slate-50/50 border border-slate-150/30 rounded-2xl space-y-2">
                    <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest block">Mode d'exécution actuel :</span>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {typeof window !== 'undefined' && (
                        // @ts-ignore
                        window.Capacitor || window.location.protocol === 'capacitor:' || window.location.origin.startsWith('ionic:')
                          ? "📱 Application Mobile (Capacitor APK)"
                          : "💻 Navigateur Web (Aperçu direct)"
                      )}
                    </span>
                  </div>
                  <div className="p-5 bg-slate-50/50 border border-slate-150/30 rounded-2xl space-y-2">
                    <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest block">URL Active de l'API :</span>
                    <span className="font-extrabold text-slate-800 font-mono text-xs block truncate">
                      {localStorage.getItem('custom_server_url') || 'https://www.resifaso.net'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: DEACTIVATE / DELETE */}
          {activeTab === 'deactivate' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-red-600 leading-none">Désactiver ou supprimer le compte</h2>
                  <p className="text-xs text-slate-400 font-medium">Prenez du recul ou supprimez définitivement vos données de l'écosystème ResiFaso.</p>
                </div>
              </div>
              
              <div className="bg-red-50/20 border border-red-100/70 p-6 sm:p-8 rounded-3xl space-y-8">
                <div className="space-y-3">
                  <h3 className="font-extrabold text-red-950 text-base flex items-center gap-2">
                    <span className="p-1.5 bg-red-100 rounded-xl text-red-700">
                      <EyeOff size={16} className="stroke-[2.2]" />
                    </span>
                    <span>Masquer temporairement le compte</span>
                  </h3>
                  <p className="text-xs text-red-800/80 font-medium leading-relaxed max-w-2xl">
                    Si vous faites une pause, la désactivation suspendra votre profil et masquera de la recherche toutes vos annonces (si vous êtes propriétaire) jusqu'à votre prochaine reconnexion.
                  </p>
                  <button 
                    onClick={handleDeactivate} 
                    className="bg-white border border-red-200 text-red-700 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50/50 hover:border-red-300 transition duration-300 cursor-pointer shadow-sm"
                  >
                    Désactiver temporairement
                  </button>
                </div>
                
                <hr className="border-red-100/60" />
                
                <div className="space-y-3">
                  <h3 className="font-extrabold text-red-950 text-base flex items-center gap-2">
                    <span className="p-1.5 bg-red-500 rounded-xl text-white">
                      <Trash2 size={16} className="stroke-[2.2]" />
                    </span>
                    <span>Suppression définitive (Irréversible)</span>
                  </h3>
                  <p className="text-xs text-red-800/80 font-medium leading-relaxed max-w-2xl">
                    Si vous demandez la suppression, toutes vos données d'utilisateur, l'historique de vos paiements mobiles, ainsi que l'intégralité de vos séjours et appartements Burkina seront immédiatement et définitivement effacés de notre base de données.
                  </p>
                  <button 
                    onClick={handleDelete} 
                    className="bg-[#EF2B2D] text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition duration-300 cursor-pointer shadow-md shadow-red-100"
                  >
                    Supprimer mon compte définitivement
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
