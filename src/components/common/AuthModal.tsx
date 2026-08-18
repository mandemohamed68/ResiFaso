import React, { useState } from 'react';
import { apiFetch } from "../../lib/api";
import { useAuth } from '../../contexts/AuthContext';
import { useBrandingSettings } from '../../hooks/useQueries';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Mail, Lock, User, Phone, CheckCircle2, AlertCircle, 
  ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles, Building2, 
  Compass, UploadCloud, RefreshCw, Check
} from 'lucide-react';
import { UserRole } from '../../types';
import { cn } from '../../lib/utils';
import { DocumentPhotoUploader } from './DocumentPhotoUploader';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const { login, register } = useAuth();
  const { data: branding } = useBrandingSettings();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [identityDocumentFront, setIdentityDocumentFront] = useState<string | null>(null);
  const [identityDocumentBack, setIdentityDocumentBack] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // States for password reset testability
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'reset'>('request');
  const [testCodeMessage, setTestCodeMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const bName1 = branding?.brandNamePart1 || 'Resi';
  const bName2 = branding?.brandNamePart2 || 'Faso';
  const bSlogan = branding?.brandSlogan || 'Résidences du Burkina';
  const activeTheme = branding?.activeTheme || 'default';

  const isChristmas = activeTheme === 'christmas';
  const isNewYear = activeTheme === 'newyear';
  const isValentines = activeTheme === 'valentines';
  const isRamadan = activeTheme === 'ramadan';
  const isBurkina = activeTheme === 'burkina';
  const isRainy = activeTheme === 'rainy';
  const isHarmattan = activeTheme === 'harmattan';
  const isSpring = activeTheme === 'spring';

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    setTestCodeMessage(null);
    try {
      const response = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'envoi de l'email.");
      }

      setSuccess(`Un e-mail contenant le code de sécurité a été transmis à ${email}.`);
      setResetCode('');
      if (data.code) {
        setTestCodeMessage(`Code : #${data.code}`);
      }
      setResetStep('reset');
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Une erreur est survenue lors de l'envoi de l'email de réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !resetCode || !newPassword) {
      setError("Veuillez remplir tous les champs (Email, Code, Nouveau mot de passe).");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Le code est incorrect ou a expiré.");
      }

      setSuccess("Votre mot de passe a été réinitialisé avec succès ! Connexion en cours...");
      setTestCodeMessage(null);
      setTimeout(() => {
        setIsForgotPassword(false);
        setResetStep('request');
        setError(null);
        setSuccess(null);
      }, 2500);
    } catch (err: any) {
      console.error("Password reset finish error:", err);
      setError(err.message || "Une erreur est survenue lors de la réinitialisation du mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        if (!acceptTerms) {
          throw new Error("Vous devez accepter les conditions d'utilisation et la politique de confidentialité pour continuer.");
        }
        if (!displayName.trim()) {
          throw new Error("Veuillez renseigner votre nom complet.");
        }
        await register(email, password, displayName, selectedRole, identityDocumentFront || undefined, identityDocumentBack || undefined);
        setSuccess("Compte créé avec succès ! Bienvenue sur ResiFaso.");
      } else {
        await login(email, password);
        setSuccess("Connexion réussie ! Heureux de vous revoir.");
      }

      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);

    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Identifiants invalides ou erreur d'authentification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop with modern blur */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[460px] bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-950/20 overflow-hidden z-10 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer z-20"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        {/* Scrollable Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto hide-scrollbar space-y-6">
          
          {/* Brand Header */}
          <div className="text-center select-none pt-1">
            <div className="inline-flex items-center gap-3.5 justify-center mb-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-2xl bg-white border border-slate-200/80 dark:border-slate-700 shadow-sm p-1">
                <img 
                  src="/logoresifaso_new.jpg" 
                  alt="ResiFaso logo" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/logoresifasoORG.png";
                  }}
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                  <span className="text-brand-primary">{bName1}</span><span className="text-brand-secondary">{bName2}</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  {bSlogan}
                </span>
              </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isForgotPassword 
                ? "Mot de passe oublié" 
                : isSignUp 
                  ? "Créer votre compte" 
                  : "Connexion"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              {isForgotPassword 
                ? "Recevez un code sécurisé pour réinitialiser votre accès" 
                : isSignUp 
                  ? "Rejoignez la première plateforme de résidences au Burkina" 
                  : "Accédez à votre espace sécurisé ResiFaso"}
            </p>
          </div>

          {/* Segmented Tab Switcher (Connexion / Inscription) */}
          {!isForgotPassword && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                  setSuccess(null);
                }}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer relative",
                  !isSignUp 
                    ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                  setSuccess(null);
                }}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer relative",
                  isSignUp 
                    ? "bg-white dark:bg-slate-900 text-brand-primary shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                S'inscrire
              </button>
            </div>
          )}

          {/* Error & Success Feedback Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl text-red-700 dark:text-red-300 text-xs font-semibold"
              >
                <AlertCircle size={17} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
              >
                <CheckCircle2 size={17} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1 leading-relaxed">{success}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forgot Password Flow */}
          {isForgotPassword ? (
            <div className="space-y-4">
              {resetStep === 'request' ? (
                <form onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Votre Adresse Email
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-4 text-slate-400 dark:text-slate-500" size={18} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemple@email.com"
                        className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none text-sm font-semibold text-slate-900 dark:text-white transition-all placeholder:text-slate-400 shadow-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white rounded-2xl py-3.5 text-xs font-black uppercase tracking-[0.15em] shadow-lg shadow-brand-primary/20 hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Envoi en cours...</span>
                      </>
                    ) : (
                      <>
                        <span>Envoyer le code de réinitialisation</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Adresse Email
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-4 text-slate-400" size={18} />
                      <input
                        type="email"
                        disabled
                        value={email}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-500 opacity-80"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Code à 6 chiffres
                      </label>
                      {testCodeMessage && (
                        <span className="text-[10px] font-mono font-bold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md">
                          {testCodeMessage}
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 text-slate-400" size={18} />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white transition-all placeholder:text-slate-400 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Nouveau Mot de Passe
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-4 text-slate-400" size={18} />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Au moins 6 caractères"
                        className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-2xl py-3.5 pl-11 pr-11 outline-none text-sm font-semibold text-slate-900 dark:text-white transition-all placeholder:text-slate-400 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white rounded-2xl py-3.5 text-xs font-black uppercase tracking-[0.15em] shadow-lg shadow-brand-primary/20 hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Mise à jour...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirmer le nouveau mot de passe</span>
                        <Check size={16} />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep('request');
                        setError(null);
                        setSuccess(null);
                        setTestCodeMessage(null);
                      }}
                      className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      Renvoyer un nouveau code
                    </button>
                  </div>
                </form>
              )}

              <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetStep('request');
                    setError(null);
                    setSuccess(null);
                    setTestCodeMessage(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-brand-primary dark:text-slate-400 transition-colors cursor-pointer"
                >
                  ← Retour à la connexion
                </button>
              </div>
            </div>
          ) : (
            /* Main Connexion & Inscription Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Registration Extra Fields */}
              {isSignUp && (
                <>
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Nom complet
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-4 text-slate-400" size={18} />
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Ex: Abdoulaye Sawadogo"
                        className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none text-sm font-semibold text-slate-900 dark:text-white transition-all placeholder:text-slate-400 shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Numéro Téléphone / WhatsApp
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="absolute left-4 text-slate-400" size={18} />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+226 70 00 00 00"
                        className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none text-sm font-semibold text-slate-900 dark:text-white transition-all placeholder:text-slate-400 shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Role Type Selection Cards */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Type de compte
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('client')}
                        className={cn(
                          "p-3 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col gap-1",
                          selectedRole === 'client'
                            ? "border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">🧳</span>
                          {selectedRole === 'client' && (
                            <div className="w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center text-white">
                              <Check size={11} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className="font-black text-xs text-slate-900 dark:text-white mt-1">Voyageur</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Pour réserver des séjours</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole('owner')}
                        className={cn(
                          "p-3 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col gap-1",
                          selectedRole === 'owner'
                            ? "border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">🏠</span>
                          {selectedRole === 'owner' && (
                            <div className="w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center text-white">
                              <Check size={11} strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <div className="font-black text-xs text-slate-900 dark:text-white mt-1">Propriétaire</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Publier et louer des biens</div>
                      </button>
                    </div>
                  </div>

                  {/* ID Document Upload Dropzone (Optional) */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Pièce d'Identité (Optionnel)
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">CNIB ou Passeport</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <DocumentPhotoUploader
                        label="Recto"
                        compact={true}
                        value={identityDocumentFront}
                        onChange={(val) => setIdentityDocumentFront(val)}
                        placeholderText="CNIB / Passeport Recto"
                      />
                      <DocumentPhotoUploader
                        label="Verso"
                        compact={true}
                        value={identityDocumentBack}
                        onChange={(val) => setIdentityDocumentBack(val)}
                        placeholderText="CNIB / Passeport Verso"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Adresse Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none text-sm font-semibold text-slate-900 dark:text-white transition-all placeholder:text-slate-400 shadow-xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Mot de Passe
                  </label>
                  {!isSignUp && (
                    <button 
                      type="button"
                      className="text-xs text-brand-primary hover:underline font-bold cursor-pointer"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError(null);
                        setSuccess(null);
                      }}
                    >
                      Oublié ?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-slate-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:bg-white dark:focus:bg-slate-800 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 rounded-2xl py-3.5 pl-11 pr-11 outline-none text-sm font-semibold text-slate-900 dark:text-white transition-all placeholder:text-slate-400 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-1"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Legal Terms Checkbox on Registration */}
              {isSignUp && (
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-brand-primary focus:ring-brand-primary border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    J'accepte les <button type="button" onClick={() => { onClose(); onNavigate?.('tos'); }} className="text-brand-primary font-bold hover:underline">conditions générales</button> et la <button type="button" onClick={() => { onClose(); onNavigate?.('privacy'); }} className="text-brand-primary font-bold hover:underline">politique de confidentialité</button>.
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-primary hover:bg-brand-primary-dark text-white rounded-2xl py-4 text-xs font-black uppercase tracking-[0.18em] shadow-lg shadow-brand-primary/25 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
              >
                {loading ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    <span>Traitement en cours...</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUp ? "Créer mon Compte" : "Se Connecter"}</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Footer Toggle */}
          {!isForgotPassword && (
            <div className="pt-2 text-center select-none border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                {isSignUp ? (
                  <span>Vous avez déjà un compte ? <strong className="text-brand-primary font-extrabold ml-1">Se connecter</strong></span>
                ) : (
                  <span>Nouveau sur ResiFaso ? <strong className="text-brand-primary font-extrabold uppercase tracking-wider ml-1">S'inscrire</strong></span>
                )}
              </button>
            </div>
          )}

          {/* Security Assurance footer pill */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
            <ShieldCheck size={13} className="text-brand-primary" />
            <span>Connexion sécurisée SSL 256-bit • Données protégées</span>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
