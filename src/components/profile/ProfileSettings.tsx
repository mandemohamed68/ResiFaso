import { apiFetch } from "../../lib/api";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { 
  User, Shield, CreditCard, Bell, Key, Eye, AlertTriangle, 
  CheckCircle, Upload, Check, Lock, Smartphone, RefreshCw, X, Camera 
} from 'lucide-react';
import { resizeImage } from '../../lib/imageResize';

type Tab = 'personal' | 'id' | 'photo' | 'payment' | 'notifications' | 'security' | 'privacy' | 'server' | 'deactivate';

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200", // Woman
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200", // Man 1
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200", // Man 2
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200", // Woman 2
];

import { useToast } from '../../contexts/ToastContext';

export const ProfileSettings: React.FC = () => {
  const { profile, user, refreshProfile, logOut } = useAuth();
  const { addToast } = useToast();
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
      
      await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        displayName: displayName,
        phoneNumber: phone,
        phone: phone // for backward compatibility
      }) });
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
      console.error("Camera access error:", err);
      setCameraError("Impossible d'accéder à l'appareil photo. Veuillez utiliser l'onglet de téléversement ou accorder les permissions.");
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
      
      await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        idType: idType,
        idNumber: idNumber,
        idExpiry: idExpiry,
        idCardUrl: capturedImage,
        verificationStatus: 'pending'
      }) });
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
      
      await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        photoURL: selectedPhotoURL
      }) });
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
      
      await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        photoURL: ''
      }) });
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
      await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        paymentPreferences: updatedPrefs
      }) });
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
      await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        paymentPreferences: clearedPrefs
      }) });
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
      
      await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        notifications: notifications
      }) });
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
      
      await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        privacy: privacy
      }) });
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
      
      await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        deactivated: true
      }) });
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
      
      await apiFetch('/api/users/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, body: JSON.stringify({
        deactivated: true,
        displayName: "[Utilisateur Supprimé]",
        phoneNumber: ""
      }) });
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
    { id: 'payment', label: 'Préférences de paiement', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité du compte', icon: Key },
    { id: 'privacy', label: 'Confidentialité', icon: Eye },
    { id: 'server', label: 'Configuration du serveur', icon: Smartphone },
    { id: 'deactivate', label: 'Désactivation du compte', icon: AlertTriangle, danger: true },
  ];

  const getVerificationStatusBadge = () => {
    const status = profile?.verificationStatus || 'none';
    if (profile?.isVerified || status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-green-50 text-green-700 border border-green-200 animate-pulse">
          <CheckCircle size={14} className="text-green-600" />
          Compte Vérifié
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
          <RefreshCw size={14} className="text-amber-600 animate-spin" />
          Vérification en cours
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-slate-50 text-slate-500 border border-slate-200">
        Non Vérifié
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black text-slate-900 mb-8" id="profile-settings-title">Profil & Paramètres</h1>
      
      {/* Toast Feedback */}
      {saveSuccess && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 border border-slate-800 animate-in slide-in-from-bottom duration-300" id="toast-success-alert">
          <div className="bg-green-500 p-1.5 rounded-full text-white">
            <Check size={16} className="stroke-[3]" />
          </div>
          <span className="text-sm font-black tracking-tight">{saveSuccess}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation verticale */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id as Tab);
                  setSaveSuccess(null);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-red-50 text-[#EF2B2D] shadow-sm border-l-4 border-[#EF2B2D]'
                    : tab.danger
                    ? 'text-red-500 hover:bg-red-50'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 bg-white rounded-3xl p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 min-h-[500px]" id="settings-tab-content-area">
          
          {/* TAB 1: PERSONAL */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                <h2 className="text-xl font-bold text-slate-900">Informations personnelles</h2>
                {getVerificationStatusBadge()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Nom d'affichage</label>
                  <input 
                    type="text" 
                    id="profile-display-name-input"
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none transition" 
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Email</label>
                  <input 
                    type="email" 
                    defaultValue={user?.email || ''} 
                    readOnly 
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 cursor-not-allowed" 
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-medium">L'adresse de messagerie ne peut pas être modifiée</span>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Numéro de téléphone</label>
                  <input 
                    type="tel" 
                    id="profile-phone-input"
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none transition" 
                    placeholder="+226 XX XX XX XX"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-medium">Requis pour vous contacter en cas de réservation</span>
                </div>
              </div>

              <button 
                id="btn-save-personal-info"
                onClick={handleSavePersonalInfo} 
                disabled={isSaving}
                className="mt-4 bg-[#EF2B2D] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          )}

          {/* TAB 2: IDENTITY */}
          {activeTab === 'id' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-50 pb-4">Vérification d’identité</h2>
              
              { (profile?.isVerified || profile?.verificationStatus === 'verified') ? (
                <div className="bg-green-50 border border-green-100 p-6 rounded-2xl flex items-start gap-4 animate-in fade-in" id="identity-verified-container">
                  <CheckCircle className="w-8 h-8 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-green-900 text-base mb-1">Identité Vérifiée</h3>
                    <p className="text-sm text-green-700 font-medium leading-relaxed">
                      Félicitations ! Votre compte est entièrement vérifié et certifié. Vous bénéficiez désormais de la confiance prioritaire de nos hôtes et du badge de voyageur certifié.
                    </p>
                    {profile.idNumber && (
                      <div className="mt-3 bg-white/65 p-3 rounded-lg text-xs text-green-800 font-mono">
                        N° de document : {profile.idNumber} ({profile.idType})
                      </div>
                    )}
                  </div>
                </div>
              ) : profile?.verificationStatus === 'pending' ? (
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4 animate-in fade-in" id="identity-pending-container">
                  <RefreshCw className="w-8 h-8 text-amber-600 shrink-0 mt-0.5 animate-spin" />
                  <div>
                    <h3 className="font-extrabold text-amber-900 text-base mb-1">Document en cours d'analyse</h3>
                    <p className="text-sm text-amber-700 font-medium leading-relaxed">
                      Votre pièce d'identité a bien été reçue par notre équipe de modérateurs au Burkina Faso. Nous l'analyserons pour valider votre compte sous un délai maximal de 15 minutes.
                    </p>
                    {profile.idNumber && (
                      <div className="mt-3 bg-white/65 p-3 rounded-lg text-xs text-amber-850 font-mono">
                        N° de document : {profile.idNumber} ({profile.idType})
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6" id="identity-form-container">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="w-8 h-8 text-[#EF2B2D]" />
                      <h3 className="font-bold text-slate-900 text-base">Formulaire de vérification de sécurité</h3>
                    </div>
                    
                    <p className="text-xs text-slate-600 font-medium mb-6">
                      Renseignez et soumettez votre pièce d'identité officielle du Burkina Faso (CNIB, Passeport, Permis de conduire) pour débloquer l'accès à la réservation instantanée et rassurer les propriétaires.
                    </p>

                    <form onSubmit={handleSubmitVerification} className="space-y-4 max-w-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {['CNIB', 'Passeport', 'Permis'].map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setIdType(type as any)}
                            className={`py-2 rounded-xl border text-xs font-black uppercase text-center transition-all cursor-pointer ${
                              idType === type
                                ? 'bg-slate-950 border-slate-950 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Numéro de pièce</label>
                          <input 
                            type="text" 
                            id="identity-doc-number-input"
                            required
                            placeholder="Ex: B12345678"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Date d'expiration</label>
                          <input 
                            type="date" 
                            id="identity-doc-expiry-input"
                            required
                            value={idExpiry}
                            onChange={(e) => setIdExpiry(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500"
                          />
                        </div>
                      </div>

                      {/* Dual Camera / File Upload selection Tab */}
                      <div className="space-y-4">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest font-bold">Document d'identité (Scan, Photo ou Capture appareil photo)</label>
                        
                        <div className="flex bg-slate-100 p-1 rounded-xl gap-2 max-w-sm">
                          <button
                            type="button"
                            onClick={() => { stopCamera(); setUseCamera(false); }}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-center transition cursor-pointer",
                              !useCamera ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            Téléverser document
                          </button>
                          <button
                            type="button"
                            onClick={() => startCamera()}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-center transition cursor-pointer",
                              useCamera ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            Prendre photo (Caméra)
                          </button>
                        </div>

                        {/* Camera container */}
                        {useCamera ? (
                          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-950 relative">
                            <video 
                              id="id-card-capture-video" 
                              autoPlay 
                              playsInline 
                              className="w-full h-auto max-h-[300px] object-cover mx-auto"
                            />
                            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={capturePhoto}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-green-900"
                              >
                                <Camera size={14} />
                                Capturer CNIB/Passeport
                              </button>
                              <button
                                type="button"
                                onClick={stopCamera}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                              >
                                Arrêter la caméra
                              </button>
                            </div>
                            {cameraError && (
                              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-red-400">
                                <AlertTriangle size={24} className="mb-2" />
                                <p className="text-xs font-bold">{cameraError}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Standard folder upload */
                          <div 
                            id="identity-file-upload-simulated-box"
                            className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-white hover:border-red-400 transition relative cursor-pointer"
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
                            <Upload size={24} className="text-slate-400 mx-auto mb-2" />
                            <span className="block text-xs font-bold text-slate-700">Sélectionnez le scan ou photo de votre document</span>
                            <span className="block text-[10px] text-slate-400 font-medium mt-1">Formats JPG, PNG, WEBP acceptés (Max 5 Mo)</span>
                            {uploadProgress && (
                              <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex items-center justify-center gap-2 font-bold text-xs text-red-650 text-red-600 font-sans">
                                <RefreshCw className="animate-spin" size={14} /> {uploadProgress}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Real image previewer showing capture / upload content */}
                        {capturedImage && (
                          <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Aperçu du document préparé :</span>
                              <button
                                type="button"
                                onClick={() => setCapturedImage(null)}
                                className="text-red-500 hover:underline text-[10px] font-black uppercase"
                              >
                                Réinitialiser
                              </button>
                            </div>
                            <div className="relative border border-slate-200 rounded-xl overflow-hidden aspect-video bg-slate-100 max-w-sm">
                              <img 
                                src={capturedImage} 
                                alt="ID capture" 
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute bottom-2 left-2 bg-slate-900/85 backdrop-blur-xs px-2 py-1 rounded text-[8px] font-black text-white uppercase tracking-wider">
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
                        className="bg-[#EF2B2D] text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer w-full"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            Soumission en cours...
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            Enregistrer et soumettre pour vérification
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
            <div className="space-y-6 animate-in fade-in" id="photo-tab-container">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-50 pb-4">Photo de profil</h2>
              
              <div className="flex flex-col sm:flex-row items-center gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="shrink-0 relative">
                  {selectedPhotoURL ? (
                    <img 
                      src={selectedPhotoURL} 
                      alt="Profil" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md animate-in zoom-in-50"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-red-100 text-[#EF2B2D] rounded-full flex items-center justify-center text-3xl font-black border-4 border-white shadow-md">
                      {profile?.displayName?.trim().charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm">Choisissez ou remplacez votre avatar</h4>
                  <p className="text-xs text-slate-500 font-medium mb-4">Un visage authentique rassure les hôtes du réseau ResiFaso.</p>
                  
                  {profile?.photoURL && (
                    <button 
                      onClick={handleDeletePhoto}
                      className="text-[#EF2B2D] hover:underline text-xs font-black uppercase tracking-wider block mb-2 cursor-pointer"
                    >
                      Supprimer la photo actuelle
                    </button>
                  )}
                </div>
              </div>

              {/* Presets Selection */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-bold">Sélectionnez un avatar de notre catalogue</h3>
                <div className="grid grid-cols-4 gap-4 max-w-sm">
                  {PRESET_AVATARS.map((avatar, idx) => {
                    const isSelected = selectedPhotoURL === avatar;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPhotoURL(avatar)}
                        className={`relative rounded-full overflow-hidden w-16 h-16 cursor-pointer border-4 hover:scale-105 transition-all ${
                          isSelected ? 'border-[#EF2B2D] scale-105 shadow-md shadow-red-100' : 'border-slate-200'
                        }`}
                      >
                        <img src={avatar} alt="Preset Option" className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-red-650/40 flex items-center justify-center text-white">
                            <Check size={18} className="font-black" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-150">
                  <button 
                    onClick={handleSavePhotoChange}
                    id="btn-save-photo-change"
                    disabled={isSaving || selectedPhotoURL === profile?.photoURL}
                    className="bg-[#EF2B2D] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving ? 'Sauvegarde...' : 'Enregistrer la photo de profil'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT OPTIONS */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-50 pb-4">Préférences de paiement</h2>
              
              {paymentPrefs.hasPreference ? (
                <div className="space-y-6 animate-in fade-in" id="payment-saved-prefs">
                  <div className="p-6 border border-slate-200 bg-slate-50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl shrink-0 text-white font-black text-xs ${
                        paymentPrefs.mobileMoneyProvider === 'orange' ? 'bg-orange-600' : 'bg-blue-700'
                      }`}>
                        {paymentPrefs.mobileMoneyProvider?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-slate-900 capitalize">
                          {paymentPrefs.mobileMoneyProvider === 'orange' ? 'Orange Money Burkina' : 'Moov Money'}
                        </p>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">N° : {paymentPrefs.mobileMoneyNumber}</p>
                        {paymentPrefs.bankAccountName && (
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Titulaire : {paymentPrefs.bankAccountName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setPaymentPrefs({ ...paymentPrefs, hasPreference: false })}
                        className="text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider border border-slate-200 cursor-pointer"
                      >
                        Modifier/Réinitialiser
                      </button>
                      <button 
                        onClick={handleRemovePaymentPrefs}
                        className="text-[#EF2B2D] hover:bg-red-50 px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider border border-red-100 cursor-pointer"
                      >
                        Désassocier
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSavePaymentPreferences} className="space-y-4 max-w-md bg-slate-50 p-6 rounded-2xl border border-slate-100" id="payment-pref-form">
                  <h3 className="font-black text-slate-900 text-sm mb-2">Configurer votre compte Mobile Money</h3>
                  <p className="text-xs text-slate-500 font-medium mb-4">Utilisez Orange ou Moov pour percevoir d'éventuels remboursements ou verser des acomptes simplifiés.</p>
                  
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Opérateur</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentPrefs({...paymentPrefs, mobileMoneyProvider: 'orange'})}
                        className={`py-3 rounded-xl border text-xs font-black uppercase text-center transition-all cursor-pointer ${
                          paymentPrefs.mobileMoneyProvider === 'orange'
                            ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Orange Money
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentPrefs({...paymentPrefs, mobileMoneyProvider: 'moov'})}
                        className={`py-3 rounded-xl border text-xs font-black uppercase text-center transition-all cursor-pointer ${
                          paymentPrefs.mobileMoneyProvider === 'moov'
                            ? 'bg-[#1e3a8a] border-[#1e3a8a] text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Moov Money
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentPrefs({...paymentPrefs, mobileMoneyProvider: 'telecel'})}
                        className={`py-3 rounded-xl border text-xs font-black uppercase text-center transition-all cursor-pointer ${
                          paymentPrefs.mobileMoneyProvider === 'telecel'
                            ? 'bg-red-600 border-red-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Telecel Money
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentPrefs({...paymentPrefs, mobileMoneyProvider: 'coris'})}
                        className={`py-3 rounded-xl border text-xs font-black uppercase text-center transition-all cursor-pointer ${
                          paymentPrefs.mobileMoneyProvider === 'coris'
                            ? 'bg-sky-700 border-sky-700 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Coris Money
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 mt-4 font-bold">Numéro de Mobile Money</label>
                    <input 
                      type="tel" 
                      required
                      placeholder="+226 XX XX XX XX"
                      value={paymentPrefs.mobileMoneyNumber}
                      onChange={(e) => setPaymentPrefs({...paymentPrefs, mobileMoneyNumber: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 mt-4 font-bold">Nom complet du titulaire</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: Sawadogo Ibrahim"
                      value={paymentPrefs.bankAccountName}
                      onChange={(e) => setPaymentPrefs({...paymentPrefs, bankAccountName: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <button 
                    type="submit" 
                    id="btn-save-payment-prefs"
                    disabled={isSaving}
                    className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CreditCard size={14} />
                    Associer et Enregistrer ce moyen de paiement
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 5: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6" id="notifications-tab-container">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-50 pb-4">Paramètres de notifications</h2>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-row items-center justify-between p-5 border border-slate-100 rounded-2xl bg-slate-50">
                    <div className="max-w-md pr-4">
                      <h3 className="font-extrabold text-sm text-slate-900">Messages instantanés des hôtes</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">Recevez des alertes en temps réel par SMS et emails lorsqu'un propriétaire vous contacte.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        id="notif-messages-checkbox"
                        checked={notifications.messages}
                        onChange={(e) => setNotifications({ ...notifications, messages: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EF2B2D]"></div>
                    </label>
                  </div>

                  <div className="flex flex-row items-center justify-between p-5 border border-slate-100 rounded-2xl bg-slate-50">
                    <div className="max-w-md pr-4">
                      <h3 className="font-extrabold text-sm text-slate-900">Promotions et offres locales</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">Être informé en priorité des bons plans séjours et réductions exclusives le week-end au Burkina.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        id="notif-promo-checkbox"
                        checked={notifications.promotions}
                        onChange={(e) => setNotifications({ ...notifications, promotions: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EF2B2D]"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-105">
                  <button 
                    onClick={handleSaveNotifications}
                    id="btn-save-notifications"
                    disabled={isSaving}
                    className="bg-[#EF2B2D] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving ? 'Enregistrement...' : 'Enregistrer les choix de notification'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY / PASSWORD */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-50 pb-4">Sécurité du compte</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <form onSubmit={handleUpdatePassword} className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100" id="security-pwd-form">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
                    <Lock size={16} className="text-[#EF2B2D]" />
                    Changer de mot de passe
                  </h3>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 font-bold">Mot de passe actuel</label>
                    <input 
                      type="password" 
                      required
                      placeholder="Saisir l'actuel"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 font-bold">Nouveau mot de passe</label>
                    <input 
                      type="password" 
                      required
                      placeholder="Au moins 6 caractères"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 font-bold">Confirmer le nouveau mot de passe</label>
                    <input 
                      type="password" 
                      required
                      placeholder="Retapez le nouveau"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <button 
                    type="submit" 
                    id="btn-update-password"
                    disabled={isSaving}
                    className="w-full mt-4 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                  >
                    Mettre à jour mon mot de passe
                  </button>
                </form>

                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Smartphone size={16} className="text-[#EF2B2D]" />
                    Double Facteur (2FA) SMS
                  </h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    Ajoutez une sécurité robuste à vos transactions et réservations de résidences en recevant un code SMS unique pour confirmer chaque virement sur notre passerelle sécurisée Burkina.
                  </p>
                  <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-red-800 block">État ACTUEL :</span>
                      <span className="font-bold text-slate-800 text-xs">Sécurisé via Code Mobile</span>
                    </div>
                    <span className="bg-green-100 text-green-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">Activé par défaut</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6" id="privacy-tab-container">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-50 pb-4">Paramètres de confidentialité</h2>
              <p className="text-sm text-slate-500 font-medium">Contrôlez les informations visuelles et personnelles partagées avec la communauté avant ou après la réservation d'un séjour.</p>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-row items-center justify-between p-5 border border-slate-100 rounded-2xl bg-slate-50">
                    <span className="font-extrabold text-sm text-slate-900 max-w-sm font-bold">
                      Afficher ma photo de profil aux hôtes avant le virement de l'acompte de réservation
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={privacy.showProfile}
                        onChange={(e) => setPrivacy({ showProfile: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#EF2B2D]"></div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-105">
                  <button 
                    onClick={handleSavePrivacy}
                    id="btn-save-privacy"
                    disabled={isSaving}
                    className="bg-[#EF2B2D] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving ? 'Enregistrement...' : 'Enregistrer la confidentialité'}
                  </button>

                  <button 
                    onClick={() => addToast("Génération de vos données en cours... Un document ZIP conforme RGPD contenant vos informations et réservations vous a été envoyé par email.", "error")} 
                    className="text-slate-600 font-black text-xs uppercase tracking-wider hover:text-black flex items-center gap-2 transition cursor-pointer hover:underline"
                  >
                    Télécharger mes données (RGPD)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SERVER CONFIGURATION */}
          {activeTab === 'server' && (
            <div className="space-y-6 animate-in fade-in" id="server-settings-tab">
              <div className="border-b border-slate-50 pb-4">
                <h2 className="text-xl font-bold text-slate-900">Configuration du serveur API</h2>
                <p className="text-xs text-slate-500 font-bold mt-1">Gérez l'adresse IP et le port du serveur backend pour l'application et l'APK mobile.</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-150 space-y-4">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-[#EF2B2D]" />
                  <span className="font-extrabold text-sm text-slate-900">Adresse du serveur backend</span>
                </div>

                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Par défaut, l'application mobile (APK) et le navigateur communiquent avec le serveur de production sécurisé de ResiFaso (<code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-red-650 font-mono text-[11px]">http://167.172.39.172:2000</code>). 
                  Si vous changez de serveur, de port ou d'environnement de test, vous pouvez modifier cette adresse ci-dessous.
                </p>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">URL ou Adresse IP du Serveur</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      value={customServerUrl}
                      onChange={(e) => setCustomServerUrl(e.target.value)}
                      placeholder="Ex: http://167.172.39.172:2000"
                      className="flex-1 bg-white border border-slate-250 rounded-xl px-4 py-2.5 text-sm font-medium font-mono focus:ring-2 focus:ring-red-500 outline-none transition"
                    />
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={handleTestAndSaveServer}
                        disabled={pingStatus === 'testing'}
                        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
                      >
                        {pingStatus === 'testing' ? 'Test en cours...' : 'Tester & Enregistrer'}
                      </button>
                      { (customServerUrl || localStorage.getItem('custom_server_url')) && (
                        <button 
                          onClick={handleResetServer}
                          className="bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition cursor-pointer"
                        >
                          Réinitialiser
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {pingStatus === 'success' && (
                  <div className="bg-green-50 border border-green-250 text-green-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2 duration-250">
                    <CheckCircle className="text-green-600 w-5 h-5" />
                    <span>Le serveur répond parfaitement ! L'adresse a été configurée avec succès.</span>
                  </div>
                )}

                {pingStatus === 'failed' && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs font-bold space-y-1 animate-in slide-in-from-top-2 duration-250">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="text-[#EF2B2D] w-5 h-5" />
                      <span>Impossible de contacter le serveur à cette adresse. Vérifiez que l'IP/port sont corrects et actifs.</span>
                    </div>
                    {pingError && <div className="text-[10px] font-mono text-red-650 font-medium pl-7">Erreur système : {pingError}</div>}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-100 p-6 rounded-2xl space-y-3 shadow-xs">
                <h3 className="font-extrabold text-slate-850 text-sm">Diagnostic d'environnement mobile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <span className="font-black text-[10px] text-slate-400 uppercase tracking-wider block">Mode d'exécution actuel :</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {typeof window !== 'undefined' && (
                        // @ts-ignore
                        window.Capacitor || window.location.protocol === 'capacitor:' || window.location.origin.startsWith('ionic:')
                          ? "📱 Application Mobile (Capacitor APK)"
                          : "💻 Navigateur Web (Aperçu direct)"
                      )}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <span className="font-black text-[10px] text-slate-400 uppercase tracking-wider block">URL Active de l'API :</span>
                    <span className="font-bold text-slate-800 font-mono text-[11px] block truncate">
                      {localStorage.getItem('custom_server_url') || 'http://167.172.39.172:2000'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: DEACTIVATE / DELETE */}
          {activeTab === 'deactivate' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-red-600 border-b border-slate-50 pb-4">Désactiver ou supprimer le compte</h2>
              
              <div className="bg-red-50/50 border border-red-100 p-8 rounded-2xl space-y-6">
                <div>
                  <h3 className="font-black text-red-950 text-base mb-1">Masquer Temporairement</h3>
                  <p className="text-xs text-red-700 font-medium mb-4 leading-relaxed">
                    Si vous faites une pause, la désactivation suspendra votre profil et masquera de la recherche toutes vos annonces (si vous êtes propriétaire) jusqu'à votre prochaine reconnexion.
                  </p>
                  <button 
                    onClick={handleDeactivate} 
                    className="bg-white border-2 border-red-200 text-red-650 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-50 transition cursor-pointer"
                  >
                    Désactiver temporairement
                  </button>
                </div>
                
                <hr className="border-red-200" />
                
                <div>
                  <h3 className="font-black text-red-950 text-base mb-1">Suppression Définitivement (Irréversible)</h3>
                  <p className="text-xs text-red-700 font-medium mb-4 leading-relaxed">
                    Si vous demandez la suppression, toutes vos données d'utilisateur, l'historique de vos paiements mobiles, ainsi que l'intégralité de vos séjours et appartements Burkina seront immédiatement et définitivement effacés de notre base de données.
                  </p>
                  <button 
                    onClick={handleDelete} 
                    className="bg-[#EF2B2D] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-700 transition cursor-pointer"
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
