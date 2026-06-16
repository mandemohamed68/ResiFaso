import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { refreshProfile } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        if (!displayName) {
          throw new Error("Veuillez saisir votre nom complet.");
        }
        
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName, role: selectedRole })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Erreur de création de compte");

        localStorage.setItem('resifaso_token', data.token);
        await refreshProfile();
        setSuccess("Votre compte a été créé avec succès !");
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Email ou mot de passe incorrect");

        localStorage.setItem('resifaso_token', data.token);
        await refreshProfile();
        setSuccess("Connexion réussie !");
      }
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || (isSignUp ? "Échec de la création de compte." : "Échec de la connexion."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 overflow-y-auto z-10 max-h-[90vh]"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-6 text-center">
          <div className="inline-flex w-32 h-32 items-center justify-center mb-2 overflow-visible relative">
            <img src="/logo.png" alt="ResiFaso" className="w-[180%] h-[180%] max-w-[180%] object-contain mix-blend-multiply absolute scale-125" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {isSignUp ? "Créer un compte" : "Connexion"}
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            {isSignUp ? "Rejoignez ResiFaso dès aujourd'hui" : "Accédez à votre espace ResiFaso"}
          </p>
        </div>

        {/* Notifications */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-semibold mb-6"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-800 text-xs font-semibold mb-6"
            >
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <div>{success}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nom Complet</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-slate-300" size={18} />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Abdoulaye Sawadogo"
                    className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-sm font-bold transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Téléphone (Burkina Faso)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 text-slate-300" size={18} />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+226 70 12 34 56"
                    className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-sm font-bold transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">S'inscrire comme</label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('client')}
                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all ${
                      selectedRole === 'client'
                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Voyageur
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('owner')}
                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all ${
                      selectedRole === 'owner'
                        ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Propriétaire
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Adresse Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-sm font-bold transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">Mot de Passe</label>
              {!isSignUp && (
                <button 
                  type="button"
                  className="text-xs text-red-600 hover:underline font-bold"
                  onClick={() => alert("Pour réinitialiser votre mot de passe, veuillez contacter le support.")}
                >
                  Oublié ?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-300" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white focus:border-red-500 rounded-2xl py-3.5 pl-12 pr-4 outline-none text-sm font-bold transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-red-100 hover:bg-red-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? "Chargement..." : isSignUp ? "Créer mon Compte" : "Se Connecter"}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-slate-100"></div>
          <span className="flex-shrink mx-4 text-slate-300 text-[10px] uppercase font-black tracking-widest">AIDE</span>
          <div className="flex-grow border-t border-slate-100"></div>
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs font-bold text-slate-500 hover:text-red-600 transition-colors"
          >
            {isSignUp ? (
              <span>Déjà un compte ? <strong className="text-red-600">Connectez-vous</strong></span>
            ) : (
              <span>Nouveau sur la plateforme ? <strong className="text-red-600 font-extrabold text-sm uppercase tracking-wider ml-1">S'inscrire</strong></span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
